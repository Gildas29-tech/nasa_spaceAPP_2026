"""Sentinel-2 STAC API Connector.

Searches and accesses Sentinel-2 L2A imagery via Copernicus Data Space STAC API.

Documentation: https://stac.dataspace.copernicus.eu/v1/
"""

import httpx
import logging
from typing import Dict, List, Optional, Any
from datetime import date, datetime
from app.core.config import get_settings
from app.core.cache import cache, cache_key

logger = logging.getLogger(__name__)

STAC_API_URL = "https://stac.dataspace.copernicus.eu/v1"
COLLECTION = "sentinel-2-l2a"


class Sentinel2Error(Exception):
    """Custom exception for Sentinel-2 API errors."""
    pass


async def get_stac_token() -> Optional[str]:
    """Get OAuth2 token for Copernicus Data Space if credentials are configured."""
    settings = get_settings()
    if not settings.COPERNICUS_CLIENT_ID or not settings.COPERNICUS_CLIENT_SECRET:
        return None

    token_url = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    data = {
        "grant_type": "client_credentials",
        "client_id": settings.COPERNICUS_CLIENT_ID,
        "client_secret": settings.COPERNICUS_CLIENT_SECRET,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(token_url, data=data)
            response.raise_for_status()
            return response.json().get("access_token")
    except Exception as e:
        logger.warning(f"Failed to get Copernicus token: {e}")
        return None


async def search_sentinel2(
    geometry: Dict[str, Any],
    start_date: date,
    end_date: date,
    max_cloud_cover: int = 30,
    limit: int = 10,
    use_cache: bool = True,
) -> List[Dict[str, Any]]:
    """
    Search Sentinel-2 L2A images via STAC API.

    Args:
        geometry: GeoJSON geometry (Polygon/MultiPolygon) for the area of interest
        start_date: Start date for search
        end_date: End date for search
        max_cloud_cover: Maximum cloud cover percentage (0-100)
        limit: Maximum number of results
        use_cache: Whether to use cached response

    Returns:
        List of STAC items matching the search criteria
    """
    # Validate geometry
    if geometry.get("type") not in ["Polygon", "MultiPolygon"]:
        raise ValueError("Geometry must be Polygon or MultiPolygon")

    cache_k = cache_key("sentinel2_search", str(geometry), start_date.isoformat(), end_date.isoformat(), max_cloud_cover, limit)
    if use_cache:
        cached = cache.get(cache_k)
        if cached:
            logger.debug(f"Cache hit for Sentinel-2 search: {cache_k}")
            return cached

    # Get auth token if available
    token = await get_stac_token()
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    # Build STAC search request
    search_body = {
        "collections": [COLLECTION],
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
                f"{STAC_API_URL}/search",
                json=search_body,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()

            items = data.get("features", [])

            if use_cache:
                cache.set(cache_k, items, ttl=1800)  # 30 min TTL

            return items

    except httpx.HTTPStatusError as e:
        logger.error(f"Sentinel-2 STAC search error: {e.response.status_code} - {e.response.text}")
        raise Sentinel2Error(f"STAC search failed: {e.response.status_code}")
    except httpx.RequestError as e:
        logger.error(f"Sentinel-2 STAC request error: {e}")
        raise Sentinel2Error(f"Failed to connect to STAC API: {e}")
    except Exception as e:
        logger.error(f"Sentinel-2 unexpected error: {e}")
        raise Sentinel2Error(f"Unexpected error: {e}")


def get_asset_urls(item: Dict[str, Any], bands: Optional[List[str]] = None) -> Dict[str, str]:
    """
    Extract asset URLs from a STAC item.

    Args:
        item: STAC item from search results
        bands: List of band names to extract (e.g., ["B04", "B08", "B02"])

    Returns:
        Dictionary mapping band names to asset URLs
    """
    if bands is None:
        bands = ["B02", "B03", "B04", "B08", "B11", "B12", "SCL"]  # Blue, Green, Red, NIR, SWIR1, SWIR2, Scene Classification

    assets = item.get("assets", {})
    urls = {}

    for band in bands:
        # Sentinel-2 L2A asset keys typically follow pattern: "B02_10m", "B08_10m", etc.
        asset_key = None
        for key in assets.keys():
            if key.startswith(band + "_") or key == band:
                asset_key = key
                break

        if asset_key and "href" in assets[asset_key]:
            urls[band] = assets[asset_key]["href"]

    return urls


def get_item_metadata(item: Dict[str, Any]) -> Dict[str, Any]:
    """Extract relevant metadata from a STAC item."""
    props = item.get("properties", {})
    return {
        "id": item.get("id"),
        "datetime": props.get("datetime"),
        "cloud_cover": props.get("eo:cloud_cover"),
        "sun_azimuth": props.get("sun:azimuth"),
        "sun_elevation": props.get("sun:elevation"),
        "view_azimuth_mean": props.get("view:azimuth_mean"),
        "view_incidence_mean": props.get("view:incidence_mean"),
        "gsd": props.get("gsd"),
        "epsg": props.get("proj:epsg"),
        "bbox": item.get("bbox"),
    }


async def get_latest_image(
    geometry: Dict[str, Any],
    max_days_back: int = 30,
    max_cloud_cover: int = 20,
) -> Optional[Dict[str, Any]]:
    """
    Get the most recent suitable Sentinel-2 image for a geometry.

    Returns the item with lowest cloud cover within the time window.
    """
    end_date = date.today()
    start_date = date.fromordinal(end_date.toordinal() - max_days_back)

    items = await search_sentinel2(
        geometry=geometry,
        start_date=start_date,
        end_date=end_date,
        max_cloud_cover=max_cloud_cover,
        limit=5,
    )

    if not items:
        return None

    # Sort by cloud cover (already sorted by API but double-check)
    items.sort(key=lambda x: x.get("properties", {}).get("eo:cloud_cover", 100))

    best_item = items[0]
    return {
        "metadata": get_item_metadata(best_item),
        "assets": get_asset_urls(best_item),
        "stac_item": best_item,
    }


async def get_time_series(
    geometry: Dict[str, Any],
    start_date: date,
    end_date: date,
    max_cloud_cover: int = 30,
    max_images: int = 50,
) -> List[Dict[str, Any]]:
    """
    Get a time series of Sentinel-2 images for NDVI/EVI calculation.

    Returns list of items with metadata and asset URLs.
    """
    items = await search_sentinel2(
        geometry=geometry,
        start_date=start_date,
        end_date=end_date,
        max_cloud_cover=max_cloud_cover,
        limit=max_images,
    )

    results = []
    for item in items:
        results.append({
            "metadata": get_item_metadata(item),
            "assets": get_asset_urls(item),
            "stac_item": item,
        })

    return results