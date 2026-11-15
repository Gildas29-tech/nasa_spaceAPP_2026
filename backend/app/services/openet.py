"""OpenET service for field-scale evapotranspiration data."""

import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Union

import httpx
import numpy as np
import xarray as xr

from app.core.config import get_settings
from app.services.nasa_earthdata import BoundingBox, NASADataResult, TimeRange


class OpenETService:
    """Service for accessing OpenET (Open Evapotranspiration) data.

    OpenET provides field-scale ET data (30m, Landsat-based) for the western US.
    API: https://openetdata.org/
    Documentation: https://openet-api.readthedocs.io/

    Models: ensemble, geeSEBAL, ALEXI, DisALEXI, SSEBop, SIMS, PT-JPL
    Variables: et, et_reference, et_fraction, count
    """

    BASE_URL = "https://openet-api.org/raster/timeseries"

    def __init__(self, api_key: Optional[str] = None):
        self.settings = get_settings()
        self.api_key = api_key or self.settings.OPENET_API_KEY
        self.client = httpx.AsyncClient(timeout=60.0)

    async def get_timeseries(
        self,
        geometry: Dict,  # GeoJSON geometry (Polygon/MultiPolygon)
        start_date: str,
        end_date: str,
        model: str = "ensemble",
        variable: str = "et",
        interval: str = "daily",
        units: str = "mm",
    ) -> NASADataResult:
        """Get ET time series for a field geometry.

        Args:
            geometry: GeoJSON Polygon or MultiPolygon
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            model: ET model ('ensemble', 'geeSEBAL', 'ALEXI', 'DisALEXI', 'SSEBop', 'SIMS', 'PT-JPL')
            variable: 'et', 'et_reference', 'et_fraction', 'count'
            interval: 'daily', 'monthly', 'annual'
            units: 'mm', 'in'
        """
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        params = {
            "geojson": geometry,
            "start_date": start_date,
            "end_date": end_date,
            "model": model,
            "variable": variable,
            "interval": interval,
            "units": units,
        }

        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            response = await self.client.post(
                f"{self.BASE_URL}/point",
                json=params,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()

            # Convert to xarray
            ds = self._parse_timeseries_response(data, variable)

            return NASADataResult(
                dataset="OpenET",
                variable=variable,
                bbox=self._geometry_to_bbox(geometry),
                time_range=time_range,
                data=ds,
                metadata={
                    "model": model,
                    "interval": interval,
                    "units": units,
                    "geometry_type": geometry.get("type"),
                },
            )
        except httpx.HTTPError as e:
            raise ValueError(f"OpenET API error: {e}")

    async def get_raster(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
        model: str = "ensemble",
        variable: str = "et",
        interval: str = "monthly",
    ) -> NASADataResult:
        """Get ET raster for a bounding box (requires polygon geometry).

        Note: OpenET raster API requires a polygon, not just bbox.
        """
        # Create a polygon from bbox
        geometry = self._bbox_to_polygon(bbox)
        return await self.get_timeseries(
            geometry, start_date, end_date, model, variable, interval
        )

    async def get_field_timeseries(
        self,
        field_id: str,
        start_date: str,
        end_date: str,
        model: str = "ensemble",
    ) -> NASADataResult:
        """Get ET for a known field ID (from OpenET field boundaries)."""
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        params = {
            "field_id": field_id,
            "start_date": start_date,
            "end_date": end_date,
            "model": model,
        }

        headers = {}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            response = await self.client.post(
                f"{self.BASE_URL}/field",
                json=params,
                headers=headers,
            )
            response.raise_for_status()
            data = response.json()

            ds = self._parse_timeseries_response(data, "et")

            return NASADataResult(
                dataset="OpenET",
                variable="et",
                bbox=BoundingBox(min_lon=-180, min_lat=-90, max_lon=180, max_lat=90),  # placeholder
                time_range=time_range,
                data=ds,
                metadata={"field_id": field_id, "model": model},
            )
        except httpx.HTTPError as e:
            raise ValueError(f"OpenET API error: {e}")

    async def get_available_models(self) -> List[str]:
        """Get list of available ET models."""
        return ["ensemble", "geeSEBAL", "ALEXI", "DisALEXI", "SSEBop", "SIMS", "PT-JPL"]

    def _parse_timeseries_response(self, data: Dict, variable: str) -> xr.Dataset:
        """Parse OpenET timeseries response to xarray Dataset."""
        # Expected format: {"timeseries": [{"date": "...", "value": ..., "count": ...}, ...]}
        timeseries = data.get("timeseries", [])

        dates = []
        values = []
        counts = []

        for entry in timeseries:
            dates.append(datetime.fromisoformat(entry["date"].replace("Z", "+00:00")))
            values.append(entry.get(variable, entry.get("value", 0)))
            counts.append(entry.get("count", 1))

        ds = xr.Dataset(
            {
                variable: (["time"], np.array(values)),
                "count": (["time"], np.array(counts)),
            },
            coords={"time": dates},
        )

        ds[variable].attrs = {
            "units": "mm",
            "long_name": f"Evapotranspiration ({variable})",
        }

        return ds

    def _geometry_to_bbox(self, geometry: Dict) -> BoundingBox:
        """Convert GeoJSON geometry to bounding box."""
        coords = geometry.get("coordinates", [])
        if not coords:
            return BoundingBox(min_lon=-180, min_lat=-90, max_lon=180, max_lat=90)

        # Flatten coordinates for Polygon/MultiPolygon
        all_coords = []
        if geometry["type"] == "Polygon":
            all_coords = coords[0]
        elif geometry["type"] == "MultiPolygon":
            for poly in coords:
                all_coords.extend(poly[0])

        if not all_coords:
            return BoundingBox(min_lon=-180, min_lat=-90, max_lon=180, max_lat=90)

        lons = [c[0] for c in all_coords]
        lats = [c[1] for c in all_coords]

        return BoundingBox(
            min_lon=min(lons), min_lat=min(lats),
            max_lon=max(lons), max_lat=max(lats),
        )

    def _bbox_to_polygon(self, bbox: BoundingBox) -> Dict:
        """Convert bounding box to GeoJSON Polygon."""
        return {
            "type": "Polygon",
            "coordinates": [[
                [bbox.min_lon, bbox.min_lat],
                [bbox.max_lon, bbox.min_lat],
                [bbox.max_lon, bbox.max_lat],
                [bbox.min_lon, bbox.max_lat],
                [bbox.min_lon, bbox.min_lat],
            ]],
        }

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()


# Mock service for development without API key
class MockOpenETService(OpenETService):
    """Mock OpenET service for development/testing."""

    async def get_timeseries(
        self,
        geometry: Dict,
        start_date: str,
        end_date: str,
        model: str = "ensemble",
        variable: str = "et",
        interval: str = "daily",
        units: str = "mm",
    ) -> NASADataResult:
        """Return mock ET time series."""
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        days = (time_range.end - time_range.start).days + 1
        dates = [
            time_range.start + timedelta(days=i)
            for i in range(days)
        ]

        # Simulate realistic ET values (mm/day)
        # Higher in summer, lower in winter
        values = []
        for d in dates:
            doy = d.timetuple().tm_yday
            # Seasonal cycle: peak ~day 200 (July), min ~day 355 (Dec)
            seasonal = 5 + 3 * np.sin(2 * np.pi * (doy - 80) / 365)
            noise = np.random.normal(0, 0.5)
            values.append(max(0, seasonal + noise))

        ds = xr.Dataset(
            {
                variable: (["time"], np.array(values)),
                "count": (["time"], np.ones(days)),
            },
            coords={"time": dates},
        )

        ds[variable].attrs = {"units": "mm", "long_name": "Evapotranspiration"}

        return NASADataResult(
            dataset="OpenET (Mock)",
            variable=variable,
            bbox=self._geometry_to_bbox(geometry),
            time_range=time_range,
            data=ds,
            metadata={"model": model, "mock": True},
        )