"""API routes for Field Shift backend."""

from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.ml import (
    SoilHealthModel,
    SoilHealthResult,
    RotationOptimizer,
    RotationSequence,
    FarmerPriorities,
    YieldPredictor,
    YieldPrediction,
    WaterStressDetector,
    WaterStressAlert,
    get_regional_model,
    CROP_DATABASE,
    ROTATION_TEMPLATES,
    get_template,
)
from app.services import (
    SMAPService,
    MODISService,
    LandsatService,
    GPMService,
    ECOSTRESSService,
    CropCASMAService,
    OpenETService,
    ATL24Service,
)
from app.services.nasa_earthdata import BoundingBox, TimeRange

# Import the new data collection routes
from app.api.routes import data as data_routes


router = APIRouter(prefix="/api/v1", tags=["Field Shift API"])

# Include the data collection routes
router.include_router(data_routes.router, prefix="/data", tags=["Data Collection"])


# ============================================================
# Request/Response Models
# ============================================================

class BBoxRequest(BaseModel):
    min_lon: float = Field(ge=-180, le=180)
    min_lat: float = Field(ge=-90, le=90)
    max_lon: float = Field(ge=-180, le=180)
    max_lat: float = Field(ge=-90, le=90)


class TimeRangeRequest(BaseModel):
    start_date: str
    end_date: str


class SoilHealthRequest(BaseModel):
    bbox: BBoxRequest
    time_range: TimeRangeRequest
    soil_texture: Optional[str] = "loam"
    soil_ph: Optional[float] = 6.5
    organic_matter: Optional[float] = None
    climate_zone: Optional[str] = "temperate"
    include_data_sources: Optional[bool] = True


class SoilHealthResponse(BaseModel):
    soil_health: SoilHealthResult
    data_sources_used: List[str] = []


class RotationRequest(BaseModel):
    current_crops: List[str] = []
    excluded_crops: List[str] = []
    required_crops: List[str] = []
    priorities: FarmerPriorities = FarmerPriorities()
    climate_zone: str = "temperate"
    soil_type: str = "loam"
    max_rotation_years: int = 5
    min_rotation_years: int = 3
    max_results: int = 10


class RotationResponse(BaseModel):
    rotations: List[dict]
    total_evaluated: int


class YieldRequest(BaseModel):
    bbox: BBoxRequest
    time_range: TimeRangeRequest
    crop: str
    soil_texture: str = "loam"
    soil_ph: float = 6.5
    organic_matter: float = 2.5
    planting_date: str = "2024-05-01"
    variety_maturity: int = 100
    scenarios: Optional[dict] = None


class YieldResponse(BaseModel):
    prediction: YieldPrediction
    scenarios: dict = {}


class WaterStressRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    time_range: TimeRangeRequest
    crop_type: str = "corn"
    soil_type: str = "loam"


class WaterStressResponse(BaseModel):
    alert: WaterStressAlert


class DataRequest(BaseModel):
    bbox: BBoxRequest
    time_range: TimeRangeRequest
    variables: List[str] = []


class DataResponse(BaseModel):
    dataset: str
    variable: str
    data_shape: List[int]
    metadata: dict


# ============================================================
# Health & Info Endpoints
# ============================================================

@router.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "0.1.0",
    }


@router.get("/crops")
async def list_crops():
    """List all available crops in database."""
    return {
        "crops": [
            {
                "name": name,
                "family": crop.family,
                "season": crop.season,
                "root_depth": crop.root_depth,
                "water_need": crop.water_need,
                "nitrogen_fixation": crop.nitrogen_fixation,
                "market_value": crop.market_value,
            }
            for name, crop in CROP_DATABASE.items()
        ]
    }


@router.get("/rotation-templates")
async def list_rotation_templates():
    """List predefined rotation templates."""
    return {
        "templates": {
            name: {
                "name": tpl["name"],
                "sequence": tpl["sequence"],
                "description": tpl["description"],
            }
            for name, tpl in ROTATION_TEMPLATES.items()
        }
    }


# ============================================================
# NASA Data Endpoints
# ============================================================

@router.post("/data/smap", response_model=DataResponse)
async def get_smap_data(request: DataRequest):
    """Get SMAP soil moisture data."""
    try:
        service = SMAPService()
        bbox = BoundingBox(
            min_lon=request.bbox.min_lon,
            min_lat=request.bbox.min_lat,
            max_lon=request.bbox.max_lon,
            max_lat=request.bbox.max_lat,
        )
        time_range = TimeRange(
            start=datetime.strptime(request.time_range.start_date, "%Y-%m-%d"),
            end=datetime.strptime(request.time_range.end_date, "%Y-%m-%d"),
        )

        variable = request.variables[0] if request.variables else "soil_moisture_am"
        result = await service.get_variable(bbox, time_range, variable)

        return DataResponse(
            dataset=result.dataset,
            variable=result.variable,
            data_shape=list(result.data.dims.values()),
            metadata=result.metadata,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/data/modis", response_model=DataResponse)
async def get_modis_data(request: DataRequest):
    """Get MODIS vegetation indices or LST data."""
    try:
        # Determine product from variable
        variable = request.variables[0] if request.variables else "ndvi"
        if variable in ["lst_day", "lst_night"]:
            product = "MOD11A2"
        elif variable == "land_cover":
            product = "MCD12Q1"
        else:
            product = "MOD13Q1"

        service = MODISService(product=product)
        bbox = BoundingBox(
            min_lon=request.bbox.min_lon,
            min_lat=request.bbox.min_lat,
            max_lon=request.bbox.max_lon,
            max_lat=request.bbox.max_lat,
        )
        time_range = TimeRange(
            start=datetime.strptime(request.time_range.start_date, "%Y-%m-%d"),
            end=datetime.strptime(request.time_range.end_date, "%Y-%m-%d"),
        )

        result = await service.get_variable(bbox, time_range, variable)

        return DataResponse(
            dataset=result.dataset,
            variable=result.variable,
            data_shape=list(result.data.dims.values()),
            metadata=result.metadata,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/data/landsat", response_model=DataResponse)
async def get_landsat_data(request: DataRequest):
    """Get Landsat surface reflectance or vegetation indices."""
    try:
        service = LandsatService()
        bbox = BoundingBox(
            min_lon=request.bbox.min_lon,
            min_lat=request.bbox.min_lat,
            max_lon=request.bbox.max_lon,
            max_lat=request.bbox.max_lat,
        )
        time_range = TimeRange(
            start=datetime.strptime(request.time_range.start_date, "%Y-%m-%d"),
            end=datetime.strptime(request.time_range.end_date, "%Y-%m-%d"),
        )

        if "ndvi" in request.variables or "evi" in request.variables:
            result = await service.get_vegetation_indices(
                bbox, request.time_range.start_date, request.time_range.end_date,
                indices=request.variables or ["ndvi"]
            )
        else:
            result = await service.get_surface_reflectance(
                bbox, request.time_range.start_date, request.time_range.end_date,
                bands=request.variables
            )

        return DataResponse(
            dataset=result.dataset,
            variable=result.variable,
            data_shape=list(result.data.dims.values()),
            metadata=result.metadata,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/data/gpm", response_model=DataResponse)
async def get_gpm_data(request: DataRequest):
    """Get GPM precipitation data."""
    try:
        service = GPMService()
        bbox = BoundingBox(
            min_lon=request.bbox.min_lon,
            min_lat=request.bbox.min_lat,
            max_lon=request.bbox.max_lon,
            max_lat=request.bbox.max_lat,
        )
        time_range = TimeRange(
            start=datetime.strptime(request.time_range.start_date, "%Y-%m-%d"),
            end=datetime.strptime(request.time_range.end_date, "%Y-%m-%d"),
        )

        variable = request.variables[0] if request.variables else "precipitation"
        result = await service.get_variable(bbox, time_range, variable)

        return DataResponse(
            dataset=result.dataset,
            variable=result.variable,
            data_shape=list(result.data.dims.values()),
            metadata=result.metadata,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/data/ecostress", response_model=DataResponse)
async def get_ecostress_data(request: DataRequest):
    """Get ECOSTRESS ET and water stress data."""
    try:
        service = ECOSTRESSService()
        bbox = BoundingBox(
            min_lon=request.bbox.min_lon,
            min_lat=request.bbox.min_lat,
            max_lon=request.bbox.max_lon,
            max_lat=request.bbox.max_lat,
        )
        time_range = TimeRange(
            start=datetime.strptime(request.time_range.start_date, "%Y-%m-%d"),
            end=datetime.strptime(request.time_range.end_date, "%Y-%m-%d"),
        )

        variable = request.variables[0] if request.variables else "et"
        if variable in ["water_stress", "stress"]:
            result = await service.get_water_stress(
                bbox, request.time_range.start_date, request.time_range.end_date
            )
        elif variable == "esi":
            result = await service.get_evaporative_stress_index(
                bbox, request.time_range.start_date, request.time_range.end_date
            )
        else:
            result = await service.get_variable(bbox, time_range, variable)

        return DataResponse(
            dataset=result.dataset,
            variable=result.variable,
            data_shape=list(result.data.dims.values()),
            metadata=result.metadata,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/data/atl24", response_model=DataResponse)
async def get_atl24_data(request: DataRequest):
    """Get ATL24 ICESat-2 bathymetry data."""
    try:
        service = ATL24Service()
        bbox = BoundingBox(
            min_lon=request.bbox.min_lon,
            min_lat=request.bbox.min_lat,
            max_lon=request.bbox.max_lon,
            max_lat=request.bbox.max_lat,
        )
        time_range = TimeRange(
            start=datetime.strptime(request.time_range.start_date, "%Y-%m-%d"),
            end=datetime.strptime(request.time_range.end_date, "%Y-%m-%d"),
        )

        result = await service.get_bathymetry(
            bbox, request.time_range.start_date, request.time_range.end_date
        )

        return DataResponse(
            dataset=result.dataset,
            variable=result.variable,
            data_shape=list(result.data.dims.values()),
            metadata=result.metadata,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# ML Analysis Endpoints
# ============================================================

@router.post("/analysis/soil-health", response_model=SoilHealthResponse)
async def analyze_soil_health(request: SoilHealthRequest):
    """Comprehensive soil health analysis."""
    try:
        # Fetch required data
        data_sources = []
        bbox = BoundingBox(
            min_lon=request.bbox.min_lon,
            min_lat=request.bbox.min_lat,
            max_lon=request.bbox.max_lon,
            max_lat=request.bbox.max_lat,
        )
        time_range = TimeRange(
            start=datetime.strptime(request.time_range.start_date, "%Y-%m-%d"),
            end=datetime.strptime(request.time_range.end_date, "%Y-%m-%d"),
        )

        smap_data = None
        modis_ndvi = None
        modis_lst = None
        landsat_indices = None
        gpm_precip = None

        # Fetch SMAP
        try:
            smap_service = SMAPService()
            smap_result = await smap_service.get_soil_moisture(
                bbox, request.time_range.start_date, request.time_range.end_date
            )
            smap_data = smap_result.data
            data_sources.append("SMAP")
        except Exception:
            pass

        # Fetch MODIS NDVI
        try:
            modis_service = MODISService("MOD13Q1")
            ndvi_result = await modis_service.get_ndvi(
                bbox, request.time_range.start_date, request.time_range.end_date
            )
            modis_ndvi = ndvi_result.data["ndvi"]
            data_sources.append("MODIS NDVI")
        except Exception:
            pass

        # Fetch MODIS LST
        try:
            modis_lst_service = MODISService("MOD11A2")
            lst_result = await modis_lst_service.get_lst(
                bbox, request.time_range.start_date, request.time_range.end_date, "day"
            )
            modis_lst = lst_result.data["lst_day"]
            data_sources.append("MODIS LST")
        except Exception:
            pass

        # Fetch Landsat
        try:
            landsat_service = LandsatService()
            ls_result = await landsat_service.get_vegetation_indices(
                bbox, request.time_range.start_date, request.time_range.end_date,
                indices=["ndvi", "savi", "evi"]
            )
            landsat_indices = ls_result.data
            data_sources.append("Landsat")
        except Exception:
            pass

        # Fetch GPM
        try:
            gpm_service = GPMService()
            gpm_result = await gpm_service.get_daily_accumulation(
                bbox, request.time_range.start_date, request.time_range.end_date
            )
            gpm_precip = gpm_result.data["precipitation_daily"]
            data_sources.append("GPM")
        except Exception:
            pass

        # Run soil health model
        model = get_regional_model(request.climate_zone)
        result = model.compute_soil_health(
            smap_data=smap_data,
            modis_ndvi=modis_ndvi,
            modis_lst=modis_lst,
            landsat_indices=landsat_indices,
            gpm_precip=gpm_precip,
            soil_texture=request.soil_texture,
            soil_ph=request.soil_ph,
            organic_matter=request.organic_matter,
            location=(
                (request.bbox.min_lat + request.bbox.max_lat) / 2,
                (request.bbox.min_lon + request.bbox.max_lon) / 2,
            ),
            assessment_date=request.time_range.end_date,
        )

        return SoilHealthResponse(
            soil_health=result,
            data_sources_used=data_sources if request.include_data_sources else [],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analysis/rotation", response_model=RotationResponse)
async def optimize_rotation(request: RotationRequest):
    """Optimize crop rotation sequence."""
    try:
        optimizer = RotationOptimizer(
            priorities=request.priorities,
            climate_zone=request.climate_zone,
            soil_type=request.soil_type,
            min_rotation_years=request.min_rotation_years,
            max_rotation_years=request.max_rotation_years,
        )

        rotations = optimizer.optimize(
            current_crops=request.current_crops,
            excluded_crops=request.excluded_crops,
            required_crops=request.required_crops,
            max_rotations=request.max_results,
        )

        details = [optimizer.get_rotation_details(r) for r in rotations]

        return RotationResponse(
            rotations=details,
            total_evaluated=len(rotations),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analysis/yield", response_model=YieldResponse)
async def predict_yield(request: YieldRequest):
    """Predict crop yield."""
    try:
        # Fetch data (simplified - in production would fetch all)
        bbox = BoundingBox(
            min_lon=request.bbox.min_lon,
            min_lat=request.bbox.min_lat,
            max_lon=request.bbox.max_lon,
            max_lat=request.bbox.max_lat,
        )
        time_range = TimeRange(
            start=datetime.strptime(request.time_range.start_date, "%Y-%m-%d"),
            end=datetime.strptime(request.time_range.end_date, "%Y-%m-%d"),
        )

        # Initialize predictor
        predictor = YieldPredictor(request.crop)

        # Extract features from available data
        # For now, use physics-based fallback
        features = predictor.extract_features(
            soil_texture=request.soil_texture,
            soil_ph=request.soil_ph,
            organic_matter=request.organic_matter,
            planting_date=request.planting_date,
            variety_maturity=request.variety_maturity,
        )

        # Main prediction
        prediction = predictor.predict(features)

        # Scenario predictions
        scenarios = {}
        if request.scenarios:
            scenarios = predictor.predict_scenarios(features, request.scenarios)
            scenarios = {k: v.model_dump() for k, v in scenarios.items()}

        return YieldResponse(
            prediction=prediction,
            scenarios=scenarios,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analysis/water-stress", response_model=WaterStressResponse)
async def analyze_water_stress(request: WaterStressRequest):
    """Analyze water stress and generate alerts."""
    try:
        # Fetch data
        bbox = BoundingBox(
            min_lon=request.lon - 0.1,
            min_lat=request.lat - 0.1,
            max_lon=request.lon + 0.1,
            max_lat=request.lat + 0.1,
        )
        time_range = TimeRange(
            start=datetime.strptime(request.time_range.start_date, "%Y-%m-%d"),
            end=datetime.strptime(request.time_range.end_date, "%Y-%m-%d"),
        )

        detector = WaterStressDetector(
            location=(request.lat, request.lon),
            crop_type=request.crop_type,
            soil_type=request.soil_type,
        )

        # Fetch all data sources
        smap_data = None
        modis_ndvi = None
        modis_lst = None
        ecostress_et = None
        ecostress_esi = None
        ecostress_stress = None
        gpm_precip = None
        openet_et = None

        # Try to fetch each (gracefully handle failures)
        try:
            smap_service = SMAPService()
            r = await smap_service.get_soil_moisture(bbox, request.time_range.start_date, request.time_range.end_date)
            smap_data = r.data
        except: pass

        try:
            modis_service = MODISService("MOD13Q1")
            r = await modis_service.get_ndvi(bbox, request.time_range.start_date, request.time_range.end_date)
            modis_ndvi = r.data["ndvi"]
        except: pass

        try:
            modis_lst_service = MODISService("MOD11A2")
            r = await modis_lst_service.get_lst(bbox, request.time_range.start_date, request.time_range.end_date)
            modis_lst = r.data["lst_day"]
        except: pass

        try:
            eco_service = ECOSTRESSService()
            r = await eco_service.get_evapotranspiration(bbox, request.time_range.start_date, request.time_range.end_date)
            ecostress_et = r.data["et"]
        except: pass

        try:
            gpm_service = GPMService()
            r = await gpm_service.get_precipitation(bbox, request.time_range.start_date, request.time_range.end_date)
            gpm_precip = r.data["precipitation"]
        except: pass

        alert = detector.analyze_stress(
            smap_data=smap_data,
            modis_ndvi=modis_ndvi,
            modis_lst=modis_lst,
            ecostress_et=ecostress_et,
            ecostress_esi=ecostress_esi,
            ecostress_stress=ecostress_stress,
            gpm_precip=gpm_precip,
            openet_et=openet_et,
        )

        return WaterStressResponse(alert=alert)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Batch Processing Endpoints
# ============================================================

@router.post("/batch/analyze-field")
async def batch_analyze_field(
    background_tasks: BackgroundTasks,
    fields: List[dict],  # List of field geometries + params
):
    """Batch analyze multiple fields (async)."""
    # This would queue background jobs
    # For now, return job IDs
    job_ids = [f"job_{i}" for i in range(len(fields))]
    return {"job_ids": job_ids, "status": "queued"}


@router.get("/batch/status/{job_id}")
async def batch_status(job_id: str):
    """Check batch job status."""
    return {"job_id": job_id, "status": "completed", "progress": 100}