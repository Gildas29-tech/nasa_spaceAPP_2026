"""FAO GAEZ Connector.

Accesses FAO Global Agro-Ecological Zones (GAEZ) data for:
- Crop suitability and potential yields
- Agro-climatic resources
- Land use constraints
- Water availability

Documentation: https://gaez.fao.org/
Data portal: https://data.apps.fao.org/gaez/
"""

import httpx
import logging
from typing import Dict, List, Optional, Any
from app.core.config import get_settings
from app.core.cache import cache, cache_key

logger = logging.getLogger(__name__)

# FAO GAEZ data is primarily accessed via:
# 1. Direct download of GeoTIFF rasters from FAO data portal
# 2. WMS/WMTS services for visualization
# 3. REST API for some datasets
#
# For programmatic access, we typically:
# 1. Download required raster layers (crop suitability, yield potential, etc.)
# 2. Store locally or in cloud storage
# 3. Query using rasterio/rioxarray for point/area extraction

GAEZ_BASE_URL = "https://gaez.fao.org/api"
GAEZ_DATA_PORTAL = "https://data.apps.fao.org/gaez"


class GAEZError(Exception):
    """Custom exception for GAEZ API errors."""
    pass


# Major crop categories in GAEZ
GAEZ_CROPS = {
    "wheat": "Wheat",
    "maize": "Maize (Corn)",
    "rice": "Rice",
    "soybean": "Soybean",
    "sorghum": "Sorghum",
    "millet": "Millet",
    "barley": "Barley",
    "cotton": "Cotton",
    "sunflower": "Sunflower",
    "rapeseed": "Rapeseed",
    "sugarcane": "Sugarcane",
    "potato": "Potato",
    "cassava": "Cassava",
    "bean": "Bean",
    "pea": "Pea",
    "chickpea": "Chickpea",
    "cowpea": "Cowpea",
    "groundnut": "Groundnut",
    "banana": "Banana/Plantain",
    "oilpalm": "Oil Palm",
    "coffee": "Coffee",
    "cocoa": "Cocoa",
    "tea": "Tea",
    "alfalfa": "Alfalfa",
    "clover": "Clover",
    "ryegrass": "Ryegrass",
    "pasture": "Pasture",
}

# GAEZ data layers
GAEZ_LAYERS = {
    "suitability": "Crop suitability index (0-100%)",
    "yield_potential": "Potential yield (ton/ha)",
    "yield_actual": "Actual attainable yield (ton/ha)",
    "yield_gap": "Yield gap (ton/ha)",
    "water_limited_yield": "Water-limited potential yield (ton/ha)",
    "agroclimatic_constraints": "Agro-climatic constraints index",
    "soil_constraints": "Soil constraints index",
    "terrain_constraints": "Terrain constraints index",
    "growing_period": "Length of growing period (days)",
    "temperature_profile": "Temperature profile suitability",
    "water_availability": "Water availability index",
}


async def get_crop_suitability(
    latitude: float,
    longitude: float,
    crop: str,
    water_supply: str = "rainfed",  # "rainfed" or "irrigated"
    use_cache: bool = True,
) -> Dict[str, Any]:
    """
    Get crop suitability for a location.

    Args:
        latitude: Latitude in decimal degrees
        longitude: Longitude in decimal degrees
        crop: Crop name (from GAEZ_CROPS keys)
        water_supply: "rainfed" or "irrigated"
        use_cache: Whether to use cached response

    Returns:
        Dictionary with suitability index and metadata
    """
    cache_k = cache_key("gaez_suitability", latitude, longitude, crop, water_supply)
    if use_cache:
        cached = cache.get(cache_k)
        if cached:
            return cached

    # Real implementation would:
    # 1. Download the appropriate GAEZ raster (e.g., suit_mai_rainfed.tif)
    # 2. Use rasterio/rioxarray to extract value at point
    # 3. Return suitability class and index

    logger.warning("GAEZ crop suitability extraction not fully implemented - returning placeholder")

    result = {
        "source": "FAO GAEZ v4",
        "crop": crop,
        "crop_name": GAEZ_CROPS.get(crop, crop),
        "water_supply": water_supply,
        "location": {"latitude": latitude, "longitude": longitude},
        "suitability": {
            "index": None,  # 0-100%
            "class": None,  # "Very high", "High", "Moderate", "Marginal", "Not suitable"
        },
        "potential_yield": {
            "value": None,  # ton/ha
            "unit": "t/ha",
        },
        "constraints": {
            "climate": None,
            "soil": None,
            "terrain": None,
        },
        "note": "Real implementation requires downloading GAEZ rasters and extracting values with rasterio",
    }

    if use_cache:
        cache.set(cache_k, result, ttl=86400)  # 24 hour TTL

    return result


async def get_multiple_crop_suitability(
    latitude: float,
    longitude: float,
    crops: List[str],
    water_supply: str = "rainfed",
) -> Dict[str, Any]:
    """Get suitability for multiple crops."""
    results = {}
    for crop in crops:
        results[crop] = await get_crop_suitability(latitude, longitude, crop, water_supply)

    # Rank crops by suitability
    ranked = sorted(
        [(c, r["suitability"]["index"]) for c, r in results.items() if r["suitability"]["index"] is not None],
        key=lambda x: x[1],
        reverse=True,
    )

    return {
        "location": {"latitude": latitude, "longitude": longitude},
        "water_supply": water_supply,
        "results": results,
        "ranked_crops": [c for c, _ in ranked],
    }


async def get_agroclimatic_data(
    latitude: float,
    longitude: float,
) -> Dict[str, Any]:
    """
    Get agro-climatic data from GAEZ.

    Includes:
    - Growing period length
    - Temperature regime
    - Water availability
    - Frost risk
    """
    logger.warning("GAEZ agroclimatic data extraction not implemented")

    return {
        "location": {"latitude": latitude, "longitude": longitude},
        "growing_period_days": None,
        "temperature_regime": None,
        "water_availability_index": None,
        "frost_risk": None,
        "note": "Requires GAEZ raster extraction",
    }


def get_gaez_layer_info(layer: str) -> Dict[str, Any]:
    """Get information about a GAEZ data layer."""
    return {
        "layer": layer,
        "description": GAEZ_LAYERS.get(layer, "Unknown layer"),
        "format": "GeoTIFF",
        "crs": "EPSG:4326",
        "resolution": "5 arc-minutes (~9km at equator)",
        "source": "FAO GAEZ v4",
    }


def get_crop_calendar(crop: str, latitude: float) -> Dict[str, Any]:
    """
    Get typical crop calendar for a location.

    Based on GAEZ thermal zones and growing periods.
    """
    # Simplified - real implementation would use GAEZ thermal zone data
    hemisphere = "north" if latitude >= 0 else "south"

    # Typical planting/harvest months by crop and hemisphere
    calendars = {
        "maize": {"north": {"plant": [4, 5], "harvest": [9, 10]}, "south": {"plant": [10, 11], "harvest": [3, 4]}},
        "wheat": {"north": {"plant": [9, 10], "harvest": [6, 7]}, "south": {"plant": [4, 5], "harvest": [11, 12]}},
        "soybean": {"north": {"plant": [5, 6], "harvest": [9, 10]}, "south": {"plant": [11, 12], "harvest": [4, 5]}},
        "rice": {"north": {"plant": [5, 6], "harvest": [9, 10]}, "south": {"plant": [11, 12], "harvest": [4, 5]}},
    }

    cal = calendars.get(crop, {}).get(hemisphere, {"plant": [], "harvest": []})

    return {
        "crop": crop,
        "hemisphere": hemisphere,
        "planting_months": cal["plant"],
        "harvest_months": cal["harvest"],
        "note": "Based on typical GAEZ thermal zones. Local conditions may vary.",
    }


# GAEZ suitability class definitions
GAEZ_SUITABILITY_CLASSES = {
    "very_high": {"range": "80-100%", "description": "Very high suitability - optimal conditions"},
    "high": {"range": "60-80%", "description": "High suitability - minor limitations"},
    "moderate": {"range": "40-60%", "description": "Moderate suitability - moderate limitations"},
    "marginal": {"range": "20-40%", "description": "Marginal suitability - severe limitations"},
    "not_suitable": {"range": "0-20%", "description": "Not suitable - very severe limitations"},
    "water": {"range": "N/A", "description": "Water body"},
}

def get_suitability_class(index: Optional[float]) -> Optional[str]:
    """Convert suitability index to class."""
    if index is None:
        return None
    if index >= 80:
        return "very_high"
    elif index >= 60:
        return "high"
    elif index >= 40:
        return "moderate"
    elif index >= 20:
        return "marginal"
    else:
        return "not_suitable"