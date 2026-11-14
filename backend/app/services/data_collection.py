"""Data Collection Service.

Orchestrates all data connectors to fetch agricultural data for a farm.
Each connector runs independently so one failure doesn't block others.
"""

import asyncio
import logging
from typing import Dict, List, Optional, Any
from datetime import date, datetime
from dataclasses import dataclass, field
from enum import Enum

from app.connectors.nasa_power import get_nasa_power_data, parse_power_response, get_climate_summary, NASAError
from app.connectors.sentinel2 import search_sentinel2, get_latest_image, get_time_series as get_s2_time_series, Sentinel2Error
from app.connectors.nasa_gpm import get_imerg_precipitation, GPMError
from app.connectors.nasa_smap import get_smap_soil_moisture, get_smap_rootzone_moisture, SMAPError
from app.connectors.landsat import search_landsat, get_latest_image as get_landsat_latest, get_time_series as get_landsat_ts, LandsatError
from app.connectors.fao_gaez import get_crop_suitability, get_multiple_crop_suitability, get_agroclimatic_data, GAEZError

logger = logging.getLogger(__name__)


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
    farm_id: str
    farm_name: str
    geometry: Dict[str, Any]
    period_start: date
    period_end: date
    sources: Dict[str, DataSourceResult] = field(default_factory=dict)
    collected_at: datetime = field(default_factory=datetime.utcnow)

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
    """Collect NASA POWER climate data."""
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
    except NASAError as e:
        logger.error(f"NASA POWER collection failed: {e}")
        return DataSourceResult(
            source="NASA POWER",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )
    except Exception as e:
        logger.exception(f"NASA POWER unexpected error: {e}")
        return DataSourceResult(
            source="NASA POWER",
            status=DataSourceStatus.FAILED,
            error=f"Unexpected error: {e}",
        )


async def collect_sentinel2(
    geometry: Dict[str, Any],
    start_date: date,
    end_date: date,
) -> DataSourceResult:
    """Collect Sentinel-2 imagery metadata."""
    try:
        # Search for images
        items = await search_sentinel2(geometry, start_date, end_date, max_cloud_cover=30, limit=20)

        if not items:
            return DataSourceResult(
                source="Sentinel-2",
                status=DataSourceStatus.UNAVAILABLE,
                error="No images found for the period and cloud cover criteria",
            )

        # Get latest image
        latest = await get_latest_image(geometry, max_days_back=(end_date - start_date).days, max_cloud_cover=20)

        # Get time series
        time_series = await get_s2_time_series(geometry, start_date, end_date, max_cloud_cover=30, max_images=50)

        return DataSourceResult(
            source="Sentinel-2",
            status=DataSourceStatus.SUCCESS,
            data={
                "image_count": len(items),
                "latest_image": latest,
                "time_series_count": len(time_series),
                "time_series": time_series[:10],  # Limit for response size
            },
            metadata={
                "search_period": f"{start_date} to {end_date}",
                "cloud_cover_threshold": 30,
            },
        )
    except Sentinel2Error as e:
        logger.error(f"Sentinel-2 collection failed: {e}")
        return DataSourceResult(
            source="Sentinel-2",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )
    except Exception as e:
        logger.exception(f"Sentinel-2 unexpected error: {e}")
        return DataSourceResult(
            source="Sentinel-2",
            status=DataSourceStatus.FAILED,
            error=f"Unexpected error: {e}",
        )


async def collect_gpm(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
) -> DataSourceResult:
    """Collect GPM IMERG precipitation data."""
    try:
        data = await get_imerg_precipitation(latitude, longitude, start_date, end_date)

        # Check if we got real data or placeholder
        if data.get("note") and "not fully implemented" in data.get("note", ""):
            return DataSourceResult(
                source="GPM IMERG",
                status=DataSourceStatus.UNAVAILABLE,
                error="GPM IMERG connector not fully implemented - requires GES DISC Subset API or Harmony API",
                data=data,
            )

        return DataSourceResult(
            source="GPM IMERG",
            status=DataSourceStatus.SUCCESS,
            data=data,
        )
    except GPMError as e:
        logger.error(f"GPM collection failed: {e}")
        return DataSourceResult(
            source="GPM IMERG",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )
    except Exception as e:
        logger.exception(f"GPM unexpected error: {e}")
        return DataSourceResult(
            source="GPM IMERG",
            status=DataSourceStatus.FAILED,
            error=f"Unexpected error: {e}",
        )


async def collect_smap(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
) -> DataSourceResult:
    """Collect SMAP soil moisture data."""
    try:
        # Get surface soil moisture
        surface = await get_smap_soil_moisture(latitude, longitude, start_date, end_date, "SPL3SMP")

        # Get root zone moisture
        rootzone = await get_smap_rootzone_moisture(latitude, longitude, start_date, end_date)

        # Check if real data or placeholder
        is_placeholder = (
            surface.get("note") and "not fully implemented" in surface.get("note", "") or
            rootzone.get("note") and "not fully implemented" in rootzone.get("note", "")
        )

        if is_placeholder:
            return DataSourceResult(
                source="SMAP",
                status=DataSourceStatus.UNAVAILABLE,
                error="SMAP connector not fully implemented - requires AppEEARS API or NSIDC DAAC access",
                data={"surface": surface, "rootzone": rootzone},
            )

        return DataSourceResult(
            source="SMAP",
            status=DataSourceStatus.SUCCESS,
            data={
                "surface": surface,
                "rootzone": rootzone,
            },
        )
    except SMAPError as e:
        logger.error(f"SMAP collection failed: {e}")
        return DataSourceResult(
            source="SMAP",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )
    except Exception as e:
        logger.exception(f"SMAP unexpected error: {e}")
        return DataSourceResult(
            source="SMAP",
            status=DataSourceStatus.FAILED,
            error=f"Unexpected error: {e}",
        )


async def collect_landsat(
    geometry: Dict[str, Any],
    start_date: date,
    end_date: date,
) -> DataSourceResult:
    """Collect Landsat imagery metadata."""
    try:
        items = await search_landsat(geometry, start_date, end_date, max_cloud_cover=30, limit=20)

        if not items:
            return DataSourceResult(
                source="Landsat",
                status=DataSourceStatus.UNAVAILABLE,
                error="No Landsat images found for the period",
            )

        latest = await get_landsat_latest(geometry, max_days_back=(end_date - start_date).days, max_cloud_cover=20)
        time_series = await get_landsat_ts(geometry, start_date, end_date, max_cloud_cover=30, max_images=50)

        return DataSourceResult(
            source="Landsat",
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
    except LandsatError as e:
        logger.error(f"Landsat collection failed: {e}")
        return DataSourceResult(
            source="Landsat",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )
    except Exception as e:
        logger.exception(f"Landsat unexpected error: {e}")
        return DataSourceResult(
            source="Landsat",
            status=DataSourceStatus.FAILED,
            error=f"Unexpected error: {e}",
        )


async def collect_gaez(
    latitude: float,
    longitude: float,
    crops: List[str],
) -> DataSourceResult:
    """Collect FAO GAEZ crop suitability data."""
    try:
        suitability = await get_multiple_crop_suitability(latitude, longitude, crops)
        agroclimatic = await get_agroclimatic_data(latitude, longitude)

        # Check if real data or placeholder
        is_placeholder = any(
            r.get("suitability", {}).get("index") is None
            for r in suitability.get("results", {}).values()
        )

        if is_placeholder:
            return DataSourceResult(
                source="FAO GAEZ",
                status=DataSourceStatus.UNAVAILABLE,
                error="GAEZ connector not fully implemented - requires raster download and extraction",
                data={"suitability": suitability, "agroclimatic": agroclimatic},
            )

        return DataSourceResult(
            source="FAO GAEZ",
            status=DataSourceStatus.SUCCESS,
            data={
                "suitability": suitability,
                "agroclimatic": agroclimatic,
            },
        )
    except GAEZError as e:
        logger.error(f"GAEZ collection failed: {e}")
        return DataSourceResult(
            source="FAO GAEZ",
            status=DataSourceStatus.FAILED,
            error=str(e),
        )
    except Exception as e:
        logger.exception(f"GAEZ unexpected error: {e}")
        return DataSourceResult(
            source="FAO GAEZ",
            status=DataSourceStatus.FAILED,
            error=f"Unexpected error: {e}",
        )


async def collect_farm_data(
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

    Args:
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
        farm_id=farm_id,
        farm_name=farm_name,
        geometry=geometry,
        period_start=start_date,
        period_end=end_date,
    )

    latitude = centroid["latitude"]
    longitude = centroid["longitude"]

    # Default crops for GAEZ if not specified
    if crops_of_interest is None:
        crops_of_interest = ["maize", "wheat", "soybean", "rice", "sorghum"]

    # Define collection tasks
    tasks = {
        "nasa_power": collect_nasa_power(latitude, longitude, start_date, end_date),
        "sentinel2": collect_sentinel2(geometry, start_date, end_date),
        "gpm": collect_gpm(latitude, longitude, start_date, end_date),
        "smap": collect_smap(latitude, longitude, start_date, end_date),
        "landsat": collect_landsat(geometry, start_date, end_date),
        "gaez": collect_gaez(latitude, longitude, crops_of_interest),
    }

    # Run all tasks concurrently
    logger.info(f"Starting data collection for farm {farm_id} ({farm_name})")

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