"""Landsat STAC API Connector.

Searches and accesses Landsat Collection 2 Level-2 imagery via USGS STAC API.

Documentation:
- https://landsatlook.usgs.gov/stac-server/
- https://landsat.usgs.gov/landsat-collection-2
"""

import httpx
import logging
from typing import Dict, List, Optional, Any
from datetime import date, datetime
from app.core.config import get_settings
from app.core.cache import cache, cache_key

logger = logging.getLogger(__name__)

# USGS Landsat STAC API
LANDSAT_STAC_URL = "https://landsatlook.usgs.gov/stac-server"
LANDSAT_COLLECTION = "landsat-c2l2"  # Collection 2 Level-2


class LandsatError(Exception):
    """Custom exception for Landsat API errors."""
    pass


async def search_landsat(
    geometry: Dict[str, Any],
    start_date: date,
    end_date: date,
    max_cloud_cover: int = 30,
    limit: int = 10,
    use_cache: bool = True,
) -> List[Dict[str, Any]]:
    """
    Search Landsat Collection 2 Level-2 images via STAC API.

    Args:
        geometry: GeoJSON geometry (Polygon/MultiPolygon)
        start_date: Start date for search
        end_date: End date for search
        max_cloud_cover: Maximum cloud cover percentage
        limit: Maximum number of results
        use_cache: Whether to use cached response

    Returns:
        List of STAC items matching the search criteria
    """
    if geometry.get("type") not in ["Polygon", "MultiPolygon"]:
        raise ValueError("Geometry must be Polygon or MultiPolygon")

    cache_k = cache_key("landsat_search", str(geometry), start_date.isoformat(), end_date.isoformat(), max_cloud_cover, limit)
    if use_cache:
        cached = cache.get(cache_k)
        if cached:
            logger.debug(f"Cache hit for Landsat search: {cache_k}")
            return cached

    search_body = {
        "collections": [LANDSAT_COLLECTION],
        "datetime": f"{start_date.isoformat()}/{end_date.isoformat()}",
        "intersects": geometry,
        "query": {
            "eo:cloud_cover": {"lt": max_cloud_cover},
        },
        "limit": limit,
        "sortby": [{"field": "eo:cloud_cover", "direction": "asc"}],
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{LANDSAT_STAC_URL}/search",
                json=search_body,
            )
            response.raise_for_status()
            data = response.json()

            items = data.get("features", [])

            if use_cache:
                cache.set(cache_k, items, ttl=1800)  # 30 min TTL

            return items

    except httpx.HTTPStatusError as e:
        logger.error(f"Landsat STAC search error: {e.response.status_code} - {e.response.text}")
        raise LandsatError(f"Landsat STAC search failed: {e.response.status_code}")
    except httpx.RequestError as e:
        logger.error(f"Landsat STAC request error: {e}")
        raise LandsatError(f"Failed to connect to Landsat STAC API: {e}")
    except Exception as e:
        logger.error(f"Landsat unexpected error: {e}")
        raise LandsatError(f"Unexpected error: {e}")


def get_landsat_assets(item: Dict[str, Any]) -> Dict[str, str]:
    """
    Extract Landsat asset URLs from a STAC item.

    Landsat C2L2 bands:
    - SR_B1 to SR_B7: Surface Reflectance bands
    - ST_B10: Surface Temperature (Band 10)
    - QA_PIXEL: Pixel Quality Assessment
    - QA_RADSAT: Radiometric Saturation QA
    """
    assets = item.get("assets", {})
    urls = {}

    # Surface Reflectance bands
    for i in range(1, 8):
        key = f"SR_B{i}"
        if key in assets and "href" in assets[key]:
            urls[key] = assets[key]["href"]

    # Thermal band
    if "ST_B10" in assets and "href" in assets["ST_B10"]:
        urls["ST_B10"] = assets["ST_B10"]["href"]

    # QA bands
    if "QA_PIXEL" in assets and "href" in assets["QA_PIXEL"]:
        urls["QA_PIXEL"] = assets["QA_PIXEL"]["href"]

    if "QA_RADSAT" in assets and "href" in assets["QA_RADSAT"]:
        urls["QA_RADSAT"] = assets["QA_RADSAT"]["href"]

    # Thumbnail
    if "thumbnail" in assets and "href" in assets["thumbnail"]:
        urls["thumbnail"] = assets["thumbnail"]["href"]

    return urls


def get_landsat_metadata(item: Dict[str, Any]) -> Dict[str, Any]:
    """Extract relevant metadata from a Landsat STAC item."""
    props = item.get("properties", {})
    return {
        "id": item.get("id"),
        "datetime": props.get("datetime"),
        "cloud_cover": props.get("eo:cloud_cover"),
        "platform": props.get("platform"),
        "instrument": props.get("instruments", [None])[0] if props.get("instruments") else None,
        "gsd": props.get("gsd"),
        "sun_azimuth": props.get("sun:azimuth"),
        "sun_elevation": props.get("sun:elevation"),
        "view_azimuth_mean": props.get("view:azimuth_mean"),
        "view_incidence_mean": props.get("view:incidence_mean"),
        "epsg": props.get("proj:epsg"),
        "bbox": item.get("bbox"),
        "landsat_product_id": props.get("landsat:product_id"),
        "landsat_scene_id": props.get("landsat:scene_id"),
        "collection_category": props.get("landsat:collection_category"),
        "collection_number": props.get("landsat:collection_number"),
        "processing_level": props.get("landsat:processing_level"),
    }


async def get_time_series(
    geometry: Dict[str, Any],
    start_date: date,
    end_date: date,
    max_cloud_cover: int = 30,
    max_images: int = 50,
) -> List[Dict[str, Any]]:
    """
    Get a time series of Landsat images for historical analysis.

    Landsat has 16-day revisit cycle, good for long-term vegetation monitoring.
    """
    items = await search_landsat(
        geometry=geometry,
        start_date=start_date,
        end_date=end_date,
        max_cloud_cover=max_cloud_cover,
        limit=max_images,
    )

    results = []
    for item in items:
        results.append({
            "metadata": get_landsat_metadata(item),
            "assets": get_landsat_assets(item),
            "stac_item": item,
        })

    return results


async def get_latest_image(
    geometry: Dict[str, Any],
    max_days_back: int = 60,
    max_cloud_cover: int = 20,
) -> Optional[Dict[str, Any]]:
    """Get the most recent suitable Landsat image."""
    end_date = date.today()
    start_date = date.fromordinal(end_date.toordinal() - max_days_back)

    items = await search_landsat(
        geometry=geometry,
        start_date=start_date,
        end_date=end_date,
        max_cloud_cover=max_cloud_cover,
        limit=5,
    )

    if not items:
        return None

    items.sort(key=lambda x: x.get("properties", {}).get("eo:cloud_cover", 100))
    best_item = items[0]

    return {
        "metadata": get_landsat_metadata(best_item),
        "assets": get_landsat_assets(best_item),
        "stac_item": best_item,
    }


# Landsat band information for reference
LANDSAT_BANDS = {
    "SR_B1": {"name": "Coastal/Aerosol", "wavelength": "0.435-0.451 µm", "resolution": 30},
    "SR_B2": {"name": "Blue", "wavelength": "0.452-0.512 µm", "resolution": 30},
    "SR_B3": {"name": "Green", "wavelength": "0.533-0.590 µm", "resolution": 30},
    "SR_B4": {"name": "Red", "wavelength": "0.636-0.673 µm", "resolution": 30},
    "SR_B5": {"name": "NIR", "wavelength": "0.851-0.879 µm", "resolution": 30},
    "SR_B6": {"name": "SWIR 1", "wavelength": "1.566-1.651 µm", "resolution": 30},
    "SR_B7": {"name": "SWIR 2", "wavelength": "2.107-2.294 µm", "resolution": 30},
    "ST_B10": {"name": "Thermal", "wavelength": "10.60-11.19 µm", "resolution": 100},
}

# Spectral indices formulas for Landsat
LANDSAT_INDICES = {
    "NDVI": "(SR_B5 - SR_B4) / (SR_B5 + SR_B4)",
    "EVI": "2.5 * (SR_B5 - SR_B4) / (SR_B5 + 6*SR_B4 - 7.5*SR_B2 + 1)",
    "SAVI": "1.5 * (SR_B5 - SR_B4) / (SR_B5 + SR_B4 + 0.5)",
    "NDWI": "(SR_B3 - SR_B5) / (SR_B3 + SR_B5)",
    "NDMI": "(SR_B5 - SR_B6) / (SR_B5 + SR_B6)",
    "NBR": "(SR_B5 - SR_B7) / (SR_B5 + SR_B7)",
}