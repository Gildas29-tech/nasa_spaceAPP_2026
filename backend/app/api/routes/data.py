"""Data Collection API Routes.

Endpoints for collecting and accessing agricultural data from NASA and other sources.
"""

from fastapi import APIRouter, HTTPException, Query, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Any
from datetime import date, datetime
from uuid import uuid4

from app.services.data_collection import (
    collect_farm_data,
    FarmDataCollection,
    DataSourceStatus,
)
from app.core.config import get_settings

router = APIRouter(prefix="/data", tags=["Data Collection"])

# In-memory store for farm data (replace with database in production)
farm_store: Dict[str, Dict[str, Any]] = {}
collection_store: Dict[str, FarmDataCollection] = {}


class FarmGeometry(BaseModel):
    """GeoJSON geometry for farm boundary."""
    type: str = Field(..., description="Geometry type (Polygon or MultiPolygon)")
    coordinates: List[List[List[float]]]


class FarmCreate(BaseModel):
    """Request model for creating a farm."""
    name: str = Field(..., min_length=1, max_length=200, description="Farm name")
    geometry: FarmGeometry = Field(..., description="Farm boundary as GeoJSON")
    centroid: Dict[str, float] = Field(..., description="Farm centroid {latitude, longitude}")
    description: Optional[str] = Field(None, max_length=1000, description="Optional farm description")
    crops_of_interest: Optional[List[str]] = Field(None, description="Crops for suitability analysis")


class FarmResponse(BaseModel):
    """Response model for farm data."""
    id: str
    name: str
    geometry: Dict[str, Any]
    centroid: Dict[str, float]
    description: Optional[str]
    crops_of_interest: Optional[List[str]]
    created_at: datetime
    updated_at: datetime


class DataCollectionRequest(BaseModel):
    """Request model for triggering data collection."""
    farm_id: str = Field(..., description="Farm ID to collect data for")
    start_date: date = Field(..., description="Analysis period start date")
    end_date: date = Field(..., description="Analysis period end date")
    crops_of_interest: Optional[List[str]] = Field(None, description="Override crops for GAEZ analysis")


class DataCollectionResponse(BaseModel):
    """Response model for data collection."""
    collection_id: str
    farm_id: str
    farm_name: str
    period_start: date
    period_end: date
    status: str
    message: str


@router.post("/farms", response_model=FarmResponse, status_code=201)
async def create_farm(farm: FarmCreate) -> FarmResponse:
    """Create a new farm with boundary geometry."""
    farm_id = str(uuid4())
    now = datetime.utcnow()

    farm_data = {
        "id": farm_id,
        "name": farm.name,
        "geometry": farm.geometry.dict(),
        "centroid": farm.centroid,
        "description": farm.description,
        "crops_of_interest": farm.crops_of_interest,
        "created_at": now,
        "updated_at": now,
    }

    farm_store[farm_id] = farm_data

    return FarmResponse(**farm_data)


@router.get("/farms", response_model=List[FarmResponse])
async def list_farms() -> List[FarmResponse]:
    """List all farms."""
    return [FarmResponse(**farm) for farm in farm_store.values()]


@router.get("/farms/{farm_id}", response_model=FarmResponse)
async def get_farm(farm_id: str) -> FarmResponse:
    """Get a specific farm by ID."""
    if farm_id not in farm_store:
        raise HTTPException(status_code=404, detail="Farm not found")
    return FarmResponse(**farm_store[farm_id])


@router.delete("/farms/{farm_id}", status_code=204)
async def delete_farm(farm_id: str):
    """Delete a farm."""
    if farm_id not in farm_store:
        raise HTTPException(status_code=404, detail="Farm not found")
    del farm_store[farm_id]
    # Also delete any associated collections
    to_delete = [cid for cid, coll in collection_store.items() if coll.farm_id == farm_id]
    for cid in to_delete:
        del collection_store[cid]


@router.post("/collect", response_model=DataCollectionResponse)
async def trigger_data_collection(
    request: DataCollectionRequest,
    background_tasks: BackgroundTasks,
) -> DataCollectionResponse:
    """
    Trigger data collection for a farm.

    This runs asynchronously in the background. Use the status endpoint
    to check progress and retrieve results.
    """
    # Verify farm exists
    if request.farm_id not in farm_store:
        raise HTTPException(status_code=404, detail="Farm not found")

    farm = farm_store[request.farm_id]

    # Validate dates
    if request.end_date < request.start_date:
        raise HTTPException(status_code=400, detail="End date must be after start date")

    if request.end_date > date.today():
        raise HTTPException(status_code=400, detail="End date cannot be in the future")

    # Create collection ID
    collection_id = str(uuid4())

    # Start background collection
    background_tasks.add_task(
        run_data_collection,
        collection_id,
        request.farm_id,
        farm["name"],
        farm["geometry"],
        request.start_date,
        request.end_date,
        farm["centroid"],
        request.crops_of_interest or farm.get("crops_of_interest"),
    )

    return DataCollectionResponse(
        collection_id=collection_id,
        farm_id=request.farm_id,
        farm_name=farm["name"],
        period_start=request.start_date,
        period_end=request.end_date,
        status="started",
        message="Data collection started in background. Check status endpoint for progress.",
    )


async def run_data_collection(
    collection_id: str,
    farm_id: str,
    farm_name: str,
    geometry: Dict[str, Any],
    start_date: date,
    end_date: date,
    centroid: Dict[str, float],
    crops_of_interest: Optional[List[str]],
):
    """Background task to run data collection."""
    try:
        collection = await collect_farm_data(
            collection_id=collection_id,
            farm_id=farm_id,
            farm_name=farm_name,
            geometry=geometry,
            start_date=start_date,
            end_date=end_date,
            centroid=centroid,
            crops_of_interest=crops_of_interest,
        )
        collection_store[collection_id] = collection
    except Exception as e:
        # Store error result
        from app.services.data_collection import FarmDataCollection, DataSourceResult, DataSourceStatus
        error_collection = FarmDataCollection(
            collection_id=collection_id,
            farm_id=farm_id,
            farm_name=farm_name,
            geometry=geometry,
            period_start=start_date,
            period_end=end_date,
        )
        error_collection.sources["error"] = DataSourceResult(
            source="System",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )
        collection_store[collection_id] = error_collection


@router.get("/collect/{collection_id}/status")
async def get_collection_status(collection_id: str) -> Dict[str, Any]:
    """Get status of a data collection job."""
    if collection_id not in collection_store:
        raise HTTPException(status_code=404, detail="Collection not found")

    collection = collection_store[collection_id]

    # Calculate overall status
    statuses = [r.status for r in collection.sources.values()]
    if all(s == DataSourceStatus.SUCCESS for s in statuses):
        overall_status = "completed"
    elif any(s == DataSourceStatus.FAILED for s in statuses):
        overall_status = "partial_failure"
    elif any(s == DataSourceStatus.UNAVAILABLE for s in statuses):
        overall_status = "completed_with_gaps"
    else:
        overall_status = "completed"

    return {
        "collection_id": collection_id,
        "farm_id": collection.farm_id,
        "farm_name": collection.farm_name,
        "period": {
            "start": collection.period_start.isoformat(),
            "end": collection.period_end.isoformat(),
        },
        "overall_status": overall_status,
        "sources": {
            name: {
                "source": result.source,
                "status": result.status.value,
                "has_data": result.data is not None,
                "error": result.error,
            }
            for name, result in collection.sources.items()
        },
        "summary": {
            "total_sources": len(collection.sources),
            "successful": len(collection.get_available_sources()),
            "failed": len(collection.get_failed_sources()),
            "unavailable": len(collection.get_unavailable_sources()),
        },
        "collected_at": collection.collected_at.isoformat(),
    }


@router.get("/collect/{collection_id}")
async def get_collection_result(collection_id: str) -> Dict[str, Any]:
    """Get full data collection result."""
    if collection_id not in collection_store:
        raise HTTPException(status_code=404, detail="Collection not found")

    return collection_store[collection_id].to_dict()


@router.get("/collect/{collection_id}/summary")
async def get_collection_summary(collection_id: str) -> Dict[str, Any]:
    """Get a summary of collected data for dashboard display."""
    if collection_id not in collection_store:
        raise HTTPException(status_code=404, detail="Collection not found")

    collection = collection_store[collection_id]
    result = collection.to_dict()

    # Extract key metrics for dashboard
    summary = {
        "collection_id": collection_id,
        "farm_name": collection.farm_name,
        "period": result["period"],
        "data_availability": {},
        "key_metrics": {},
    }

    # Check each source for key data
    for name, source in result["sources"].items():
        summary["data_availability"][name] = source["status"]

        if source["status"] == "success" and source["data"]:
            data = source["data"]

            # NASA POWER - climate summary
            if name == "nasa_power" and "summary" in data:
                s = data["summary"]
                summary["key_metrics"]["climate"] = {
                    "avg_temp_c": s.get("temperature", {}).get("mean_c"),
                    "total_precip_mm": s.get("precipitation", {}).get("total_mm"),
                    "avg_humidity": s.get("humidity", {}).get("mean_percent"),
                    "avg_radiation_mj_m2": s.get("radiation", {}).get("mean_mj_m2_day"),
                }

            # Sentinel-2 - latest NDVI
            elif name == "sentinel2" and "latest_image" in data:
                latest = data["latest_image"]
                if latest and "metadata" in latest:
                    summary["key_metrics"]["vegetation"] = {
                        "latest_acquisition": latest["metadata"].get("datetime"),
                        "cloud_cover": latest["metadata"].get("cloud_cover"),
                    }

            # GPM - precipitation (REAL)
            elif name == "gpm" and "data" in data:
                summary["key_metrics"]["precipitation"] = {
                    "source": "GPM IMERG (REAL)",
                    "daily_precipitation": data["data"].get("daily_precipitation", {}),
                }

            # SMAP - soil moisture (REAL)
            elif name == "smap" and "surface" in data:
                summary["key_metrics"]["soil_moisture"] = {
                    "source": "SMAP (REAL)",
                    "surface_ts": data["data"]["surface"].get("time_series", {}),
                }

            # Landsat - latest acquisition
            elif name == "landsat" and "latest_image" in data:
                latest = data["latest_image"]
                if latest and "metadata" in latest:
                    summary["key_metrics"]["landsat"] = {
                        "latest_acquisition": latest["metadata"].get("datetime"),
                        "cloud_cover": latest["metadata"].get("cloud_cover"),
                    }

            # GAEZ - top crops
            elif name == "gaez" and "suitability" in data:
                suit = data["suitability"]
                summary["key_metrics"]["crop_suitability"] = {
                    "top_crops": suit.get("ranked_crops", [])[:5],
                    "note": "GAEZ requires raster extraction (not yet implemented)",
                }

    return summary


@router.get("/sources")
async def list_data_sources() -> Dict[str, Any]:
    """List available data sources and their capabilities."""
    return {
        "sources": [
            {
                "id": "nasa_power",
                "name": "NASA POWER",
                "description": "Climate data (temperature, precipitation, humidity, radiation, wind)",
                "temporal_resolution": "Daily",
                "spatial_resolution": "0.5° x 0.5° (~50km)",
                "parameters": ["T2M", "PRECTOTCORR", "RH2M", "ALLSKY_SFC_SW_DWN", "WS2M"],
                "auth_required": False,
                "status": "operational",
            },
            {
                "id": "sentinel2",
                "name": "Sentinel-2 (MSI)",
                "description": "High-resolution optical imagery (10-60m) for vegetation indices",
                "temporal_resolution": "5 days (2 satellites)",
                "spatial_resolution": "10m (visible/NIR), 20m (red edge/SWIR), 60m (coastal/aerosol)",
                "bands": ["B2", "B3", "B4", "B5", "B6", "B7", "B8", "B8A", "B11", "B12"],
                "indices": ["NDVI", "EVI", "SAVI", "NDWI", "NDMI"],
                "auth_required": True,
                "status": "operational",
            },
            {
                "id": "gpm",
                "name": "GPM IMERG",
                "description": "Global precipitation estimates from satellite constellation",
                "temporal_resolution": "Half-hourly (30min), Daily final run",
                "spatial_resolution": "0.1° x 0.1° (~10km)",
                "products": ["GPM_3IMERGHH", "GPM_3IMERGDF", "GPM_3IMERGLATE"],
                "auth_required": True,
                "status": "operational (earthaccess)",
            },
            {
                "id": "smap",
                "name": "SMAP",
                "description": "Soil moisture (surface and root zone) from active/passive microwave",
                "temporal_resolution": "2-3 days (Level 3), Daily (Level 4)",
                "spatial_resolution": "9km (Level 3), 9km (Level 4)",
                "products": ["SPL2SMP", "SPL3SMP", "SPL4SMAU"],
                "auth_required": True,
                "status": "operational (earthaccess)",
            },
            {
                "id": "landsat",
                "name": "Landsat 8/9",
                "description": "Long-term surface reflectance and temperature record (30m)",
                "temporal_resolution": "16 days (8 days with 2 satellites)",
                "spatial_resolution": "30m (optical), 100m (thermal)",
                "bands": ["SR_B1-7", "ST_B10"],
                "indices": ["NDVI", "EVI", "SAVI", "NDWI", "NBR"],
                "auth_required": True,
                "status": "operational",
            },
            {
                "id": "modis",
                "name": "MODIS (Terra/Aqua)",
                "description": "Vegetation indices (NDVI/EVI) and Land Surface Temperature",
                "temporal_resolution": "16-day (NDVI/EVI), 8-day (LST)",
                "spatial_resolution": "250m (NDVI/EVI), 1km (LST)",
                "products": ["MOD13Q1", "MYD13Q1", "MOD11A2", "MYD11A2"],
                "auth_required": True,
                "status": "operational (earthaccess)",
            },
            {
                "id": "ecostress",
                "name": "ECOSTRESS (ISS)",
                "description": "Evapotranspiration, water stress, land surface temperature",
                "temporal_resolution": "~4-day revisit",
                "spatial_resolution": "70m",
                "products": ["ECOL2EST", "ECOL3ESI", "ECOL3WUE", "ECOL3ETPT"],
                "auth_required": True,
                "status": "operational (earthaccess)",
            },
            {
                "id": "openet",
                "name": "OpenET",
                "description": "Field-scale evapotranspiration (Landsat-based, CONUS/Western US)",
                "temporal_resolution": "Daily, Monthly, Annual",
                "spatial_resolution": "30m",
                "models": ["ensemble", "geeSEBAL", "ALEXI", "DisALEXI", "SSEBop", "SIMS", "PT-JPL"],
                "auth_required": True,
                "status": "operational (API key required)",
            },
            {
                "id": "icesat2",
                "name": "ICESat-2 ATL24",
                "description": "Coastal bathymetry from photon-counting lidar",
                "temporal_resolution": "Continuous (along-track)",
                "spatial_resolution": "~10m along-track",
                "products": ["ATL24"],
                "auth_required": True,
                "status": "operational (earthaccess, coastal only)",
            },
            {
                "id": "crop_casma",
                "name": "Crop-CASMA / NASA-USDA",
                "description": "Soil moisture analytics (CONUS: Crop-CASMA, Global: NASA-USDA)",
                "temporal_resolution": "Daily",
                "spatial_resolution": "1km (Crop-CASMA), 0.25° (NASA-USDA)",
                "layers": ["surface_sm", "rootzone_sm", "profile_sm", "anomalies", "crop_condition"],
                "auth_required": False,
                "status": "operational (CONUS/Global)",
            },
            {
                "id": "gaez",
                "name": "FAO GAEZ v4",
                "description": "Crop suitability, yield potential, agro-climatic constraints",
                "temporal_resolution": "Historical averages (1981-2010 baseline)",
                "spatial_resolution": "5 arc-minutes (~9km at equator)",
                "crops": 68,
                "layers": ["suitability", "yield_potential", "yield_gap", "water_limited_yield", "constraints"],
                "auth_required": False,
                "status": "placeholder - needs raster download and extraction",
            },
        ]
    }