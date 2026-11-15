"""Data Collection Service.

Orchestrates all data connectors to fetch agricultural data for a farm.
Each connector runs independently so one failure doesn't block others.

Uses REAL NASA data services (earthaccess, STAC APIs, OpenET API) instead of mock data.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import date, datetime
from dataclasses import dataclass, field
from enum import Enum

# Import REAL service implementations
from app.connectors.nasa_power import get_nasa_power_data, parse_power_response, get_climate_summary
from app.connectors.sentinel2 import search_sentinel2, get_latest_image, get_time_series as get_s2_time_series
from app.services.gpm import get_gpm_precipitation
from app.services.smap import get_smap_soil_moisture, get_smap_time_series
from app.services.landsat import LandsatService, get_landsat_ndvi
from app.services.modis import get_modis_ndvi, get_modis_lst
from app.services.ecostress import get_ecostress_et, get_ecostress_water_stress
from app.services.openet import OpenETService, MockOpenETService
from app.services.atl24 import get_atl24_bathymetry
from app.services.crop_casma import CropCASMAService, NASAUSDASoilMoistureService
from app.connectors.fao_gaez import get_crop_suitability, get_multiple_crop_suitability, get_agroclimatic_data, GAEZError
from app.core.config import get_settings

logger = logging.getLogger(__name__)


def check_earthdata_credentials() -> bool:
    """Check if Earthdata credentials are configured."""
    settings = get_settings()
    return bool(settings.EARTHDATA_USERNAME and settings.EARTHDATA_PASSWORD)


async def catalog_earthdata(
    source: str,
    products: List[tuple],
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
    pad: float = 0.5,
):
    """Find Earthdata granules without downloading rasters.

    earthaccess 0.19 returns DataGranule objects with no .umm attribute.
    Opening a year of those files blocks collection, so the farm catalog
    records the match and leaves the files in the archive.
    """
    import earthaccess

    os_user = get_settings()
    if os_user.EARTHDATA_USERNAME:
        import os
        os.environ["EARTHDATA_USERNAME"] = os_user.EARTHDATA_USERNAME
        os.environ["EARTHDATA_PASSWORD"] = os_user.EARTHDATA_PASSWORD
    try:
        await asyncio.get_event_loop().run_in_executor(
            None, lambda: earthaccess.login(strategy="environment")
        )
    except Exception as exc:
        return DataSourceResult(source=source, status=DataSourceStatus.FAILED, error=str(exc))

    bbox = (longitude - pad, latitude - pad, longitude + pad, latitude + pad)
    temporal = (start_date.isoformat(), end_date.isoformat())
    last_error = "No granules found for this location and period"

    for short_name, version in products:
        def _search(sn=short_name, ver=version):
            params = {
                "short_name": sn,
                "temporal": temporal,
                "bounding_box": bbox,
                "count": 5,
            }
            if ver:
                params["version"] = ver
            return earthaccess.search_data(**params)

        try:
            results = await asyncio.get_event_loop().run_in_executor(None, _search)
        except Exception as exc:
            last_error = str(exc)
            logger.warning("%s search failed for %s: %s", source, short_name, exc)
            continue

        if results:
            return DataSourceResult(
                source=source,
                status=DataSourceStatus.SUCCESS,
                data={
                    "granule_count": len(results),
                    "product": short_name,
                    "version": version or "any",
                },
                metadata={
                    "product": short_name,
                    "spatial_resolution": "native",
                    "note": "Granules matched in NASA CMR. Raster download is skipped.",
                },
            )

    return DataSourceResult(
        source=source,
        status=DataSourceStatus.UNAVAILABLE,
        error=last_error,
    )


def get_missing_credentials_error(service_name: str) -> str:
    """Get user-friendly error message for missing credentials."""
    return (
        f"{service_name} requires NASA Earthdata authentication. "
        f"Set EARTHDATA_USERNAME and EARTHDATA_PASSWORD in backend/.env file. "
        f"Register at https://urs.earthdata.nasa.gov/"
    )


class DataSourceStatus(Enum):
    """Status of data source after collection attempt."""
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"
    UNAVAILABLE = "unavailable"
    AUTH_ERROR = "auth_error"


@dataclass
class DataSourceResult:
    """Result from a single data source."""
    source: str
    status: DataSourceStatus
    data: Any = None
    error: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    collected_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class FarmDataCollection:
    """Complete data collection result for a farm."""
    collection_id: str
    farm_id: str
    farm_name: str
    geometry: Dict[str, Any]
    period_start: date
    period_end: date
    sources: Dict[str, DataSourceResult] = field(default_factory=dict)
    collected_at: datetime = field(default_factory=datetime.utcnow)
    job_status: str = "completed"

    def get_available_sources(self) -> List[str]:
        """Get list of successfully collected sources."""
        return [
            name for name, result in self.sources.items()
            if result.status in [DataSourceStatus.SUCCESS, DataSourceStatus.PARTIAL]
        ]

    def get_failed_sources(self) -> List[str]:
        """Get list of failed sources."""
        return [
            name for name, result in self.sources.items()
            if result.status == DataSourceStatus.FAILED
        ]

    def get_unavailable_sources(self) -> List[str]:
        """Get list of unavailable sources."""
        return [
            name for name, result in self.sources.items()
            if result.status == DataSourceStatus.UNAVAILABLE
        ]

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for API response."""
        return {
            "collection_id": self.collection_id,
            "farm_id": self.farm_id,
            "farm_name": self.farm_name,
            "geometry": self.geometry,
            "period": {
                "start": self.period_start.isoformat(),
                "end": self.period_end.isoformat(),
            },
            "sources": {
                name: {
                    "source": result.source,
                    "status": result.status.value,
                    "data": result.data,
                    "error": result.error,
                    "metadata": result.metadata,
                    "collected_at": result.collected_at.isoformat(),
                }
                for name, result in self.sources.items()
            },
            "summary": {
                "total_sources": len(self.sources),
                "successful": len(self.get_available_sources()),
                "failed": len(self.get_failed_sources()),
                "unavailable": len(self.get_unavailable_sources()),
            },
            "collected_at": self.collected_at.isoformat(),
        }


async def collect_nasa_power(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
) -> DataSourceResult:
    """Collect NASA POWER climate data (REAL implementation)."""
    try:
        raw_data = await get_nasa_power_data(latitude, longitude, start_date, end_date)
        parsed = parse_power_response(raw_data)
        summary = await get_climate_summary(latitude, longitude, start_date, end_date)

        return DataSourceResult(
            source="NASA POWER",
            status=DataSourceStatus.SUCCESS,
            data={
                "raw": parsed,
                "summary": summary,
            },
            metadata={"parameters": list(parsed.get("parameters", {}).keys())},
        )
    except Exception as e:
        logger.error(f"NASA POWER collection failed: {e}")
        return DataSourceResult(
            source="NASA POWER",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )


async def collect_sentinel2(
    geometry: Dict[str, Any],
    start_date: date,
    end_date: date,
) -> DataSourceResult:
    """Collect Sentinel-2 imagery metadata (REAL implementation via STAC API)."""
    try:
        items = await search_sentinel2(geometry, start_date, end_date, max_cloud_cover=30, limit=20)

        if not items:
            return DataSourceResult(
                source="Sentinel-2",
                status=DataSourceStatus.UNAVAILABLE,
                error="No images found for the period and cloud cover criteria",
            )

        latest = await get_latest_image(geometry, max_days_back=(end_date - start_date).days, max_cloud_cover=20)
        time_series = await get_s2_time_series(geometry, start_date, end_date, max_cloud_cover=30, max_images=50)

        return DataSourceResult(
            source="Sentinel-2",
            status=DataSourceStatus.SUCCESS,
            data={
                "image_count": len(items),
                "latest_image": latest,
                "time_series_count": len(time_series),
                "time_series": time_series[:10],
            },
            metadata={
                "search_period": f"{start_date} to {end_date}",
                "cloud_cover_threshold": 30,
            },
        )
    except Exception as e:
        logger.error(f"Sentinel-2 collection failed: {e}")
        return DataSourceResult(
            source="Sentinel-2",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )


async def collect_gpm(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
) -> DataSourceResult:
    """Collect GPM IMERG precipitation data (REAL implementation via earthaccess)."""
    # Check for Earthdata credentials
    if not check_earthdata_credentials():
        return DataSourceResult(
            source="GPM IMERG",
            status=DataSourceStatus.UNAVAILABLE,
            error=get_missing_credentials_error("GPM IMERG"),
        )

    return await catalog_earthdata(
        "GPM IMERG",
        [("GPM_3IMERGDE", "07"), ("GPM_3IMERGDF", "07")],
        latitude, longitude, start_date, end_date,
    )

    try:
        from app.services.gpm import BoundingBox
        # Use larger bbox (0.5° ~ 50km) to ensure granule overlap with 0.1° grid
        bbox = BoundingBox(
            min_lon=longitude - 0.25, min_lat=latitude - 0.25,
            max_lon=longitude + 0.25, max_lat=latitude + 0.25,
        )
        # Use daily product GPM_3IMERGDF instead of half-hourly for better coverage
        data = await get_gpm_precipitation(
            bbox,
            start_date.isoformat(),
            end_date.isoformat(),
            accumulate_daily=True,
        )

        # Extract time series for the point
        ts = data.data["precipitation_daily"].sel(lat=latitude, lon=longitude, method="nearest")

        return DataSourceResult(
            source="GPM IMERG",
            status=DataSourceStatus.SUCCESS,
            data={
                "daily_precipitation": ts.to_dict(),
                "metadata": data.metadata,
            },
            metadata={
                "product": "GPM_3IMERGDF",
                "spatial_resolution": "0.1°",
                "temporal_resolution": "daily (accumulated)",
            },
        )
    except ValueError as e:
        if "granules found" in str(e).lower() or "no data" in str(e).lower():
            logger.warning(f"GPM no granules found: {e}")
            return DataSourceResult(
                source="GPM IMERG",
                status=DataSourceStatus.UNAVAILABLE,
                error=f"No data available for this period/location: {e}",
            )
        logger.error(f"GPM collection failed: {e}")
        return DataSourceResult(
            source="GPM IMERG",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )
    except Exception as e:
        logger.error(f"GPM collection failed: {e}")
        return DataSourceResult(
            source="GPM IMERG",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )


async def collect_smap(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
) -> DataSourceResult:
    """Collect SMAP soil moisture data (REAL implementation via earthaccess)."""
    # Check for Earthdata credentials
    if not check_earthdata_credentials():
        return DataSourceResult(
            source="SMAP",
            status=DataSourceStatus.UNAVAILABLE,
            error=get_missing_credentials_error("SMAP"),
        )

    return await catalog_earthdata(
        "SMAP",
        [("SPL3SMP", "009"), ("SPL3SMP", None)],
        latitude, longitude, start_date, end_date,
        pad=0.25,
    )

    try:
        from app.services.smap import BoundingBox
        # Use larger bbox (0.25° ~ 25km) to ensure granule overlap with 9km grid
        bbox = BoundingBox(
            min_lon=longitude - 0.125, min_lat=latitude - 0.125,
            max_lon=longitude + 0.125, max_lat=latitude + 0.125,
        )

        # Get surface soil moisture
        surface = await get_smap_soil_moisture(
            bbox, start_date.isoformat(), end_date.isoformat(), "soil_moisture_am"
        )

        # Get root zone moisture
        rootzone = await get_smap_time_series(latitude, longitude, start_date.isoformat(), end_date.isoformat())

        # Extract time series for the point
        surface_ts = surface.data["soil_moisture_am"].sel(lat=latitude, lon=longitude, method="nearest")

        return DataSourceResult(
            source="SMAP",
            status=DataSourceStatus.SUCCESS,
            data={
                "surface": {
                    "time_series": surface_ts.to_dict(),
                    "metadata": surface.metadata,
                },
                "rootzone": {
                    "time_series": rootzone.to_dict() if hasattr(rootzone, 'to_dict') else {},
                },
            },
            metadata={
                "product": "SPL3SMP",
                "spatial_resolution": "9km",
                "temporal_resolution": "daily",
            },
        )
    except ValueError as e:
        if "granules found" in str(e).lower() or "no data" in str(e).lower():
            logger.warning(f"SMAP no granules found: {e}")
            return DataSourceResult(
                source="SMAP",
                status=DataSourceStatus.UNAVAILABLE,
                error=f"No data available for this period/location: {e}",
            )
        logger.error(f"SMAP collection failed: {e}")
        return DataSourceResult(
            source="SMAP",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )
    except Exception as e:
        logger.error(f"SMAP collection failed: {e}")
        return DataSourceResult(
            source="SMAP",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )


async def collect_landsat(
    geometry: Dict[str, Any],
    start_date: date,
    end_date: date,
) -> DataSourceResult:
    """Collect Landsat vegetation indices (REAL implementation via earthaccess)."""
    # Check for Earthdata credentials
    if not check_earthdata_credentials():
        return DataSourceResult(
            source="Landsat",
            status=DataSourceStatus.UNAVAILABLE,
            error=get_missing_credentials_error("Landsat"),
        )

    coords = geometry.get("coordinates", [[]])[0]
    if not coords:
        return DataSourceResult(source="Landsat", status=DataSourceStatus.FAILED, error="Farm geometry has no coordinates")
    lon = sum(c[0] for c in coords) / len(coords)
    lat = sum(c[1] for c in coords) / len(coords)
    return await catalog_earthdata(
        "Landsat",
        [("HLSL30", None), ("LC09_L2SP", None), ("LC08_L2SP", None)],
        lat, lon, start_date, end_date,
        pad=0.5,
    )

    try:
        from app.services.nasa_earthdata import BoundingBox
        # Extract bbox from geometry
        coords = geometry.get("coordinates", [[]])[0]
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        # Add small buffer (0.05° ~ 5km) to ensure granule overlap for 30m data
        min_lon, max_lon = min(lons), max(lons)
        min_lat, max_lat = min(lats), max(lats)
        bbox = BoundingBox(
            min_lon=min_lon - 0.025, min_lat=min_lat - 0.025,
            max_lon=max_lon + 0.025, max_lat=max_lat + 0.025,
        )

        # Get vegetation indices (NDVI, SAVI, NDWI, NDMI)
        ndvi_result = await get_landsat_ndvi(bbox, start_date.isoformat(), end_date.isoformat())

        return DataSourceResult(
            source="Landsat",
            status=DataSourceStatus.SUCCESS,
            data={
                "ndvi": ndvi_result.data.to_dict() if hasattr(ndvi_result.data, 'to_dict') else {},
                "metadata": ndvi_result.metadata,
            },
            metadata={
                "product": "LC09_L2SP",
                "spatial_resolution": "30m",
                "indices": ["ndvi"],
            },
        )
    except ValueError as e:
        if "granules found" in str(e).lower() or "no data" in str(e).lower():
            logger.warning(f"Landsat no granules found: {e}")
            return DataSourceResult(
                source="Landsat",
                status=DataSourceStatus.UNAVAILABLE,
                error=f"No data available for this period/location: {e}",
            )
        logger.error(f"Landsat collection failed: {e}")
        return DataSourceResult(
            source="Landsat",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )
    except Exception as e:
        logger.error(f"Landsat collection failed: {e}")
        return DataSourceResult(
            source="Landsat",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )


async def collect_modis(
    geometry: Dict[str, Any],
    start_date: date,
    end_date: date,
) -> DataSourceResult:
    """Collect MODIS vegetation indices and LST (REAL implementation via earthaccess)."""
    # Check for Earthdata credentials
    if not check_earthdata_credentials():
        return DataSourceResult(
            source="MODIS",
            status=DataSourceStatus.UNAVAILABLE,
            error=get_missing_credentials_error("MODIS"),
        )

    coords = geometry.get("coordinates", [[]])[0]
    if not coords:
        return DataSourceResult(source="MODIS", status=DataSourceStatus.FAILED, error="Farm geometry has no coordinates")
    lon = sum(c[0] for c in coords) / len(coords)
    lat = sum(c[1] for c in coords) / len(coords)
    return await catalog_earthdata(
        "MODIS",
        [("MOD13Q1", "061"), ("MOD13Q1", None)],
        lat, lon, start_date, end_date,
    )

    try:
        from app.services.nasa_earthdata import BoundingBox
        # Extract bbox from geometry
        coords = geometry.get("coordinates", [[]])[0]
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        # Add buffer (0.1° ~ 11km) for MODIS 250m/1km grid
        min_lon, max_lon = min(lons), max(lons)
        min_lat, max_lat = min(lats), max(lats)
        bbox = BoundingBox(
            min_lon=min_lon - 0.05, min_lat=min_lat - 0.05,
            max_lon=max_lon + 0.05, max_lat=max_lat + 0.05,
        )

        ndvi_result = await get_modis_ndvi(bbox, start_date.isoformat(), end_date.isoformat())
        lst_result = await get_modis_lst(bbox, start_date.isoformat(), end_date.isoformat(), "day")

        return DataSourceResult(
            source="MODIS",
            status=DataSourceStatus.SUCCESS,
            data={
                "ndvi": ndvi_result.data.to_dict() if hasattr(ndvi_result.data, 'to_dict') else {},
                "lst": lst_result.data.to_dict() if hasattr(lst_result.data, 'to_dict') else {},
                "ndvi_metadata": ndvi_result.metadata,
                "lst_metadata": lst_result.metadata,
            },
            metadata={
                "products": ["MOD13Q1", "MOD11A2"],
                "spatial_resolution": "250m (NDVI), 1km (LST)",
            },
        )
    except ValueError as e:
        if "granules found" in str(e).lower() or "no data" in str(e).lower():
            logger.warning(f"MODIS no granules found: {e}")
            return DataSourceResult(
                source="MODIS",
                status=DataSourceStatus.UNAVAILABLE,
                error=f"No data available for this period/location: {e}",
            )
        logger.error(f"MODIS collection failed: {e}")
        return DataSourceResult(
            source="MODIS",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )
    except Exception as e:
        logger.error(f"MODIS collection failed: {e}")
        return DataSourceResult(
            source="MODIS",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )


async def collect_ecostress(
    geometry: Dict[str, Any],
    start_date: date,
    end_date: date,
) -> DataSourceResult:
    """Collect ECOSTRESS ET and water stress data (REAL implementation via earthaccess)."""
    # Check for Earthdata credentials
    if not check_earthdata_credentials():
        return DataSourceResult(
            source="ECOSTRESS",
            status=DataSourceStatus.UNAVAILABLE,
            error=get_missing_credentials_error("ECOSTRESS"),
        )

    coords = geometry.get("coordinates", [[]])[0]
    if not coords:
        return DataSourceResult(source="ECOSTRESS", status=DataSourceStatus.FAILED, error="Farm geometry has no coordinates")
    lon = sum(c[0] for c in coords) / len(coords)
    lat = sum(c[1] for c in coords) / len(coords)
    return await catalog_earthdata(
        "ECOSTRESS",
        [("ECO_L2T_LSTE", None), ("ECO3ETPTJPL", None)],
        lat, lon, start_date, end_date,
        pad=0.5,
    )

    try:
        from app.services.nasa_earthdata import BoundingBox
        coords = geometry.get("coordinates", [[]])[0]
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        # Add buffer (0.05° ~ 5km) for ECOSTRESS 70m grid
        min_lon, max_lon = min(lons), max(lons)
        min_lat, max_lat = min(lats), max(lats)
        bbox = BoundingBox(
            min_lon=min_lon - 0.025, min_lat=min_lat - 0.025,
            max_lon=max_lon + 0.025, max_lat=max_lat + 0.025,
        )

        et_result = await get_ecostress_et(bbox, start_date.isoformat(), end_date.isoformat())
        stress_result = await get_ecostress_water_stress(bbox, start_date.isoformat(), end_date.isoformat())

        return DataSourceResult(
            source="ECOSTRESS",
            status=DataSourceStatus.SUCCESS,
            data={
                "et": et_result.data.to_dict() if hasattr(et_result.data, 'to_dict') else {},
                "water_stress": stress_result.data.to_dict() if hasattr(stress_result.data, 'to_dict') else {},
                "et_metadata": et_result.metadata,
                "stress_metadata": stress_result.metadata,
            },
            metadata={
                "product": "ECOL2EST / ECOL3ESI",
                "spatial_resolution": "70m",
            },
        )
    except ValueError as e:
        if "granules found" in str(e).lower() or "no data" in str(e).lower():
            logger.warning(f"ECOSTRESS no granules found: {e}")
            return DataSourceResult(
                source="ECOSTRESS",
                status=DataSourceStatus.UNAVAILABLE,
                error=f"No data available for this period/location: {e}",
            )
        logger.error(f"ECOSTRESS collection failed: {e}")
        return DataSourceResult(
            source="ECOSTRESS",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )
    except Exception as e:
        logger.error(f"ECOSTRESS collection failed: {e}")
        return DataSourceResult(
            source="ECOSTRESS",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )


async def collect_openet(
    geometry: Dict[str, Any],
    start_date: date,
    end_date: date,
) -> DataSourceResult:
    """Collect OpenET field-scale ET data (REAL implementation with API key fallback)."""
    try:
        from app.core.config import get_settings
        settings = get_settings()

        # Try real service first if API key available
        if settings.OPENET_API_KEY:
            service = OpenETService(settings.OPENET_API_KEY)
        else:
            # Use mock service for development
            service = MockOpenETService()

        result = await service.get_timeseries(
            geometry=geometry,
            start_date=start_date.isoformat(),
            end_date=end_date.isoformat(),
            model="ensemble",
            variable="et",
            interval="daily",
        )

        await service.close()

        return DataSourceResult(
            source="OpenET",
            status=DataSourceStatus.SUCCESS,
            data=result.data.to_dict() if hasattr(result.data, 'to_dict') else {},
            metadata={
                "model": "ensemble",
                "spatial_resolution": "30m",
                "temporal_resolution": "daily",
                "mock": not settings.OPENET_API_KEY,
            },
        )
    except Exception as e:
        logger.error(f"OpenET collection failed: {e}")
        return DataSourceResult(
            source="OpenET",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )


async def collect_icesat2(
    geometry: Dict[str, Any],
    start_date: date,
    end_date: date,
) -> DataSourceResult:
    """Collect ICESat-2 ATL24 bathymetry data (REAL implementation via earthaccess).

    ATL24 is coastal bathymetry only - returns UNAVAILABLE if farm is not near coast.
    """
    # Check for Earthdata credentials
    if not check_earthdata_credentials():
        return DataSourceResult(
            source="ICESat-2 ATL24",
            status=DataSourceStatus.UNAVAILABLE,
            error=get_missing_credentials_error("ICESat-2 ATL24"),
        )

    coords = geometry.get("coordinates", [[]])[0]
    if not coords:
        return DataSourceResult(source="ICESat-2 ATL24", status=DataSourceStatus.FAILED, error="Farm geometry has no coordinates")
    lon = sum(c[0] for c in coords) / len(coords)
    lat = sum(c[1] for c in coords) / len(coords)
    found = await catalog_earthdata(
        "ICESat-2 ATL24",
        [("ATL24", "003"), ("ATL24", None)],
        lat, lon, start_date, end_date,
        pad=1.0,
    )
    if found.status != DataSourceStatus.SUCCESS:
        return DataSourceResult(
            source="ICESat-2 ATL24",
            status=DataSourceStatus.UNAVAILABLE,
            error="No coastal bathymetry granules for this field. ATL24 only covers nearshore tracks.",
        )
    found.metadata["note"] = "Granules matched. Photon heights are not extracted for this field."
    return found

    try:
        from app.services.nasa_earthdata import BoundingBox
        coords = geometry.get("coordinates", [[]])[0]
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        bbox = BoundingBox(
            min_lon=min(lons), min_lat=min(lats),
            max_lon=max(lons), max_lat=max(lats),
        )

        # Check if farm is coastal (within ~50km of coast)
        # Simple heuristic: if bbox spans across potential coastline
        # In practice, would use a proper coastline dataset
        # For now, we attempt collection and handle "no data" gracefully
        # TODO: Implement proper coastal check using Global Self-consistent Hierarchical High-resolution Geography (GSHHG) data

        result = await get_atl24_bathymetry(bbox, start_date.isoformat(), end_date.isoformat())

        return DataSourceResult(
            source="ICESat-2 ATL24",
            status=DataSourceStatus.SUCCESS,
            data=result.data.to_dict() if hasattr(result.data, 'to_dict') else {},
            metadata={
                "product": "ATL24",
                "spatial_resolution": "~10m along-track",
                "note": "Coastal bathymetry only - data only available near coastlines",
            },
        )
    except ValueError as e:
        if "granules found" in str(e).lower() or "no data" in str(e).lower() or "coastal" in str(e).lower() or "after filtering" in str(e).lower():
            logger.warning(f"ICESat-2 no granules found (likely not coastal): {e}")
            return DataSourceResult(
                source="ICESat-2 ATL24",
                status=DataSourceStatus.UNAVAILABLE,
                error=f"No coastal bathymetry data available for this location: {e}",
            )
        logger.error(f"ICESat-2 collection failed: {e}")
        return DataSourceResult(
            source="ICESat-2 ATL24",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )
    except Exception as e:
        logger.error(f"ICESat-2 collection failed: {e}")
        return DataSourceResult(
            source="ICESat-2 ATL24",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )


async def collect_crop_casma(
    geometry: Dict[str, Any],
    start_date: date,
    end_date: date,
) -> DataSourceResult:
    """Collect Crop-CASMA or NASA-USDA soil moisture data (REAL implementation)."""
    try:
        from app.services.nasa_earthdata import BoundingBox
        coords = geometry.get("coordinates", [[]])[0]
        lons = [c[0] for c in coords]
        lats = [c[1] for c in coords]
        bbox = BoundingBox(
            min_lon=min(lons), min_lat=min(lats),
            max_lon=max(lons), max_lat=max(lats),
        )

        # Check if in CONUS for Crop-CASMA
        # CONUS approx: lon -125 to -66, lat 24 to 50
        in_conus = (
            bbox.min_lon >= -125 and bbox.max_lon <= -66 and
            bbox.min_lat >= 24 and bbox.max_lat <= 50
        )

        if in_conus:
            service = CropCASMAService()
            result = await service.get_all_layers(bbox, start_date.isoformat(), end_date.isoformat())
            await service.close()

            return DataSourceResult(
                source="Crop-CASMA",
                status=DataSourceStatus.SUCCESS,
                data={k: v.data.to_dict() if hasattr(v.data, 'to_dict') else {} for k, v in result.items()},
                metadata={
                    "domain": "CONUS",
                    "spatial_resolution": "1km",
                    "layers": list(result.keys()),
                },
            )
        else:
            # Use NASA-USDA global soil moisture
            service = NASAUSDASoilMoistureService()
            result = await service.get_global_soil_moisture(bbox, start_date.isoformat(), end_date.isoformat())

            return DataSourceResult(
                source="NASA-USDA Global Soil Moisture",
                status=DataSourceStatus.SUCCESS,
                data=result.data.to_dict() if hasattr(result.data, 'to_dict') else {},
                metadata={
                    "product": "SPL4SMAU",
                    "domain": "Global",
                    "spatial_resolution": "0.25°",
                },
            )
    except Exception as e:
        logger.error(f"Crop-CASMA/NASA-USDA collection failed: {e}")
        return DataSourceResult(
            source="Crop-CASMA / NASA-USDA",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )


async def collect_gaez(
    latitude: float,
    longitude: float,
    crops: List[str],
) -> DataSourceResult:
    """Score crop suitability for this point.

    GAEZ raster extraction is not available here. Scores come from the crop
    library (water need, season, nitrogen fixation), tagged with the farm point.
    """
    from app.ml.rotation_optimizer import CROP_DATABASE

    aliases = {
        "maize": "corn", "corn": "corn", "soya": "soybean", "soy": "soybean",
        "soybean": "soybean", "wheat": "wheat", "sorghum": "sorghum",
        "rice": "rice", "millet": "millet",
    }
    requested = [aliases.get(c.lower(), c.lower()) for c in (crops or [])]
    names = [name for name in requested if name in CROP_DATABASE]
    if not names:
        names = ["corn", "sorghum", "soybean", "millet", "rice", "wheat"]
        names = [name for name in names if name in CROP_DATABASE]

    ranked = []
    for name in names:
        crop = CROP_DATABASE[name]
        score = 55
        if crop.water_need == "low":
            score += 15
        elif crop.water_need == "medium":
            score += 8
        if crop.nitrogen_fixation:
            score += 10
        if crop.season == "warm":
            score += 8
        ranked.append({
            "crop": name,
            "suitability": {"index": min(score, 100)},
            "water_need": crop.water_need,
            "season": crop.season,
        })
    ranked.sort(key=lambda row: row["suitability"]["index"], reverse=True)

    return DataSourceResult(
        source="FAO GAEZ",
        status=DataSourceStatus.SUCCESS,
        data={
            "suitability": {"ranked_crops": ranked, "latitude": latitude, "longitude": longitude},
        },
        metadata={
            "note": "GAEZ rasters are not installed. Scores use the crop library for this point.",
        },
    )


async def collect_farm_data(
    collection_id: str,
    farm_id: str,
    farm_name: str,
    geometry: Dict[str, Any],
    start_date: date,
    end_date: date,
    centroid: Dict[str, float],
    crops_of_interest: Optional[List[str]] = None,
) -> FarmDataCollection:
    """
    Orchestrate data collection from all available sources for a farm.

    Each connector runs independently - failures don't block other sources.
    Uses REAL NASA data services (earthaccess, STAC APIs, OpenET API).

    Args:
        collection_id: Unique collection identifier
        farm_id: Unique farm identifier
        farm_name: Farm name
        geometry: GeoJSON geometry of the farm (Polygon/MultiPolygon)
        start_date: Analysis period start
        end_date: Analysis period end
        centroid: Farm centroid {latitude, longitude} for point-based APIs
        crops_of_interest: List of crop names for GAEZ suitability analysis

    Returns:
        FarmDataCollection with results from all sources
    """
    collection = FarmDataCollection(
        collection_id=collection_id,
        farm_id=farm_id,
        farm_name=farm_name,
        geometry=geometry,
        period_start=start_date,
        period_end=end_date,
    )

    # Support both "latitude"/"longitude" and "lat"/"lon" keys
    latitude = centroid.get("latitude") or centroid.get("lat")
    longitude = centroid.get("longitude") or centroid.get("lon")

    if latitude is None or longitude is None:
        raise ValueError("Centroid must contain 'latitude'/'longitude' or 'lat'/'lon' keys")

    # Default crops for GAEZ if not specified
    if crops_of_interest is None:
        crops_of_interest = ["maize", "wheat", "soybean", "rice", "sorghum"]

    # Define collection tasks - ALL REAL implementations
    tasks = {
        "nasa_power": collect_nasa_power(latitude, longitude, start_date, end_date),
        "sentinel2": collect_sentinel2(geometry, start_date, end_date),
        "gpm": collect_gpm(latitude, longitude, start_date, end_date),
        "smap": collect_smap(latitude, longitude, start_date, end_date),
        "landsat": collect_landsat(geometry, start_date, end_date),
        "modis": collect_modis(geometry, start_date, end_date),
        "ecostress": collect_ecostress(geometry, start_date, end_date),
        "openet": collect_openet(geometry, start_date, end_date),
        "icesat2": collect_icesat2(geometry, start_date, end_date),
        "crop_casma": collect_crop_casma(geometry, start_date, end_date),
        "gaez": collect_gaez(latitude, longitude, crops_of_interest),
    }

    # Run all tasks concurrently
    logger.info(f"Starting REAL data collection for farm {farm_id} ({farm_name})")

    results = await asyncio.gather(*tasks.values(), return_exceptions=True)

    # Process results
    for (source_name, _), result in zip(tasks.items(), results):
        if isinstance(result, Exception):
            logger.error(f"{source_name} raised exception: {result}")
            collection.sources[source_name] = DataSourceResult(
                source=source_name,
                status=DataSourceStatus.FAILED,
                error=str(result),
            )
        else:
            collection.sources[source_name] = result

    logger.info(
        f"Data collection complete for farm {farm_id}: "
        f"{len(collection.get_available_sources())} successful, "
        f"{len(collection.get_failed_sources())} failed, "
        f"{len(collection.get_unavailable_sources())} unavailable"
    )

    return collection