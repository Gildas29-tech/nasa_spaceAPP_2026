"""NASA POWER API Connector.

Fetches climate data (temperature, precipitation, humidity, solar radiation)
for agricultural applications.

No API key required for standard usage.
Documentation: https://power.larc.nasa.gov/docs/
"""

import httpx
import logging
from typing import Dict, List, Optional, Any
from datetime import date, datetime
from app.core.config import get_settings
from app.core.cache import cache, cache_key

logger = logging.getLogger(__name__)

POWER_BASE_URL = "https://power.larc.nasa.gov/api/temporal/daily/point"

# AG community parameters relevant for agriculture
AG_PARAMETERS = [
    "T2M",        # Temperature at 2 meters (C)
    "T2M_MAX",    # Maximum temperature at 2 meters (C)
    "T2M_MIN",    # Minimum temperature at 2 meters (C)
    "PRECTOTCORR", # Precipitation corrected (mm/day)
    "RH2M",       # Relative humidity at 2 meters (%)
    "WS2M",       # Wind speed at 2 meters (m/s)
    "ALLSKY_SFC_SW_DWN", # All sky surface shortwave downward irradiance (kWh/m2/day)
    "T2MDEW",     # Dew point temperature at 2 meters (C)
]


class NASAError(Exception):
    """Custom exception for NASA API errors."""
    pass


async def get_nasa_power_data(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
    parameters: Optional[List[str]] = None,
    use_cache: bool = True,
) -> Dict[str, Any]:
    """
    Fetch NASA POWER climate data for a point location.

    Args:
        latitude: Latitude in decimal degrees (-90 to 90)
        longitude: Longitude in decimal degrees (-180 to 180)
        start_date: Start date (inclusive)
        end_date: End date (inclusive)
        parameters: List of parameter codes (default: AG_PARAMETERS)
        use_cache: Whether to use cached response

    Returns:
        Dictionary with parameter data arrays and metadata

    Raises:
        NASAError: If API request fails
    """
    if parameters is None:
        parameters = AG_PARAMETERS

    # Validate coordinates
    if not -90 <= latitude <= 90:
        raise ValueError(f"Invalid latitude: {latitude}")
    if not -180 <= longitude <= 180:
        raise ValueError(f"Invalid longitude: {longitude}")

    # Check cache
    cache_k = cache_key("nasa_power", latitude, longitude, start_date.isoformat(), end_date.isoformat(), tuple(parameters))
    if use_cache:
        cached = cache.get(cache_k)
        if cached:
            logger.debug(f"Cache hit for NASA POWER: {cache_k}")
            return cached

    params = {
        "parameters": ",".join(parameters),
        "community": "AG",
        "longitude": longitude,
        "latitude": latitude,
        "start": start_date.strftime("%Y%m%d"),
        "end": end_date.strftime("%Y%m%d"),
        "format": "JSON",
        "header": "true",
    }

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.get(POWER_BASE_URL, params=params)
            response.raise_for_status()
            data = response.json()

            # Check for API errors in response
            if "messages" in data:
                for msg in data["messages"]:
                    if "error" in msg.lower():
                        raise NASAError(f"NASA POWER API error: {msg}")

            # Cache the response
            if use_cache:
                cache.set(cache_k, data, ttl=3600)  # 1 hour TTL

            return data

    except httpx.HTTPStatusError as e:
        logger.error(f"NASA POWER HTTP error: {e.response.status_code} - {e.response.text}")
        raise NASAError(f"NASA POWER API returned {e.response.status_code}: {e.response.text}")
    except httpx.RequestError as e:
        logger.error(f"NASA POWER request error: {e}")
        raise NASAError(f"Failed to connect to NASA POWER API: {e}")
    except Exception as e:
        logger.error(f"NASA POWER unexpected error: {e}")
        raise NASAError(f"Unexpected error: {e}")


def parse_power_response(data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Parse NASA POWER API response into structured format.

    Returns:
        Dictionary with:
        - parameters: dict of parameter_code -> list of {date, value}
        - metadata: location, elevation, etc.
    """
    result = {
        "parameters": {},
        "metadata": {},
    }

    # Extract metadata from header
    if "header" in data:
        header = data["header"]
        result["metadata"] = {
            "latitude": header.get("latitude"),
            "longitude": header.get("longitude"),
            "elevation": header.get("elevation"),
            "site_elevation": header.get("site_elevation"),
            "timezone": header.get("timezone"),
        }

    # Extract parameter data
    if "properties" in data and "parameter" in data["properties"]:
        params = data["properties"]["parameter"]
        for param_code, values in params.items():
            # Convert from {YYYYMMDD: value} to list of {date, value}
            parsed_values = []
            for date_str, value in values.items():
                # NASA POWER uses -999 for missing data
                if value != -999:
                    try:
                        parsed_values.append({
                            "date": date_str,
                            "value": value,
                        })
                    except (ValueError, TypeError):
                        continue
            result["parameters"][param_code] = parsed_values

    return result


async def get_climate_summary(
    latitude: float,
    longitude: float,
    start_date: date,
    end_date: date,
) -> Dict[str, Any]:
    """
    Get a climate summary for agricultural analysis.

    Calculates:
    - Average, min, max temperature
    - Total precipitation
    - Growing degree days (base 10C)
    - Frost days
    - Heat stress days (>35C)
    """
    data = await get_nasa_power_data(latitude, longitude, start_date, end_date)
    parsed = parse_power_response(data)

    params = parsed["parameters"]

    # Calculate summaries
    summary = {
        "location": parsed["metadata"],
        "period": {
            "start": start_date.isoformat(),
            "end": end_date.isoformat(),
        },
        "temperature": {},
        "precipitation": {},
        "humidity": {},
        "radiation": {},
        "indices": {},
    }

    # Temperature stats
    if "T2M" in params:
        temps = [v["value"] for v in params["T2M"]]
        summary["temperature"]["mean"] = round(sum(temps) / len(temps), 1)
        summary["temperature"]["min"] = round(min(temps), 1)
        summary["temperature"]["max"] = round(max(temps), 1)

    if "T2M_MAX" in params:
        tmax_vals = [v["value"] for v in params["T2M_MAX"]]
        summary["temperature"]["max_absolute"] = round(max(tmax_vals), 1)
        # Heat stress days (>35C)
        summary["indices"]["heat_stress_days"] = sum(1 for v in tmax_vals if v > 35)

    if "T2M_MIN" in params:
        tmin_vals = [v["value"] for v in params["T2M_MIN"]]
        summary["temperature"]["min_absolute"] = round(min(tmin_vals), 1)
        # Frost days (<0C)
        summary["indices"]["frost_days"] = sum(1 for v in tmin_vals if v < 0)

    # Growing degree days (base 10C)
    if "T2M" in params:
        gdd = sum(max(0, v["value"] - 10) for v in params["T2M"])
        summary["indices"]["growing_degree_days_base10"] = round(gdd, 1)

    # Precipitation
    if "PRECTOTCORR" in params:
        precip = [v["value"] for v in params["PRECTOTCORR"]]
        summary["precipitation"]["total_mm"] = round(sum(precip), 1)
        summary["precipitation"]["mean_daily_mm"] = round(sum(precip) / len(precip), 2)
        summary["precipitation"]["max_daily_mm"] = round(max(precip), 1)
        summary["precipitation"]["dry_days"] = sum(1 for v in precip if v < 1.0)

    # Humidity
    if "RH2M" in params:
        rh = [v["value"] for v in params["RH2M"]]
        summary["humidity"]["mean"] = round(sum(rh) / len(rh), 1)
        summary["humidity"]["min"] = round(min(rh), 1)

    # Solar radiation
    if "ALLSKY_SFC_SW_DWN" in params:
        rad = [v["value"] for v in params["ALLSKY_SFC_SW_DWN"]]
        summary["radiation"]["mean_kwh_m2_day"] = round(sum(rad) / len(rad), 2)
        summary["radiation"]["total_kwh_m2"] = round(sum(rad), 1)

    return summary