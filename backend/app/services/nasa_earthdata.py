"""Base NASA Earthdata service with authentication and common functionality."""

import os
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple, Union

import earthaccess
import httpx
import numpy as np
import xarray as xr
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential

from app.core.config import get_settings


class BoundingBox(BaseModel):
    """Geographic bounding box [min_lon, min_lat, max_lon, max_lat]."""
    min_lon: float = Field(ge=-180, le=180)
    min_lat: float = Field(ge=-90, le=90)
    max_lon: float = Field(ge=-180, le=180)
    max_lat: float = Field(ge=-90, le=90)

    def to_tuple(self) -> Tuple[float, float, float, float]:
        return (self.min_lon, self.min_lat, self.max_lon, self.max_lat)

    def to_earthaccess(self) -> Tuple[float, float, float, float]:
        """Earthaccess expects (west, south, east, north)."""
        return (self.min_lon, self.min_lat, self.max_lon, self.max_lat)


class TimeRange(BaseModel):
    """Time range for data queries."""
    start: datetime
    end: datetime

    def to_tuple(self) -> Tuple[str, str]:
        return (self.start.strftime("%Y-%m-%d"), self.end.strftime("%Y-%m-%d"))


class NASADataResult(BaseModel):
    """Standardized result from NASA data queries."""
    dataset: str
    variable: str
    bbox: BoundingBox
    time_range: TimeRange
    data: xr.Dataset
    metadata: Dict[str, Any] = Field(default_factory=dict)
    source: str = "earthaccess"
    crs: str = "EPSG:4326"

    model_config = {"arbitrary_types_allowed": True}


class NASAEarthdataBase(ABC):
    """Base class for all NASA Earthdata services."""

    def __init__(self, short_name: str, version: str = "latest"):
        self.short_name = short_name
        self.version = version
        self.settings = get_settings()
        self._auth = None
        self._session = None

    @property
    def auth(self):
        """Lazy authentication."""
        if self._auth is None:
            if not self.settings.EARTHDATA_USERNAME or not self.settings.EARTHDATA_PASSWORD:
                raise ValueError(
                    f"Earthdata credentials not configured. "
                    f"Set EARTHDATA_USERNAME and EARTHDATA_PASSWORD in .env file. "
                    f"Register at https://urs.earthdata.nasa.gov/"
                )
            try:
                # earthaccess 0.19+ login() accepts strategy/persist/system only.
                # Username and password are read from the environment.
                os.environ["EARTHDATA_USERNAME"] = self.settings.EARTHDATA_USERNAME
                os.environ["EARTHDATA_PASSWORD"] = self.settings.EARTHDATA_PASSWORD

                self._auth = earthaccess.login(strategy="environment")
                if not getattr(self._auth, "authenticated", False):
                    raise ValueError(
                        "Earthdata login did not authenticate. "
                        "Check EARTHDATA_USERNAME and EARTHDATA_PASSWORD."
                    )
            except Exception as e:
                raise ValueError(f"Earthdata authentication failed: {e}") from e
        return self._auth

    @property
    def session(self) -> httpx.AsyncClient:
        """Get authenticated HTTP session."""
        if self._session is None:
            self.auth  # Ensure auth is initialized
            self._session = httpx.AsyncClient(
                timeout=60.0,
                follow_redirects=True,
            )
        return self._session

    async def search_granules(
        self,
        bbox: BoundingBox,
        time_range: TimeRange,
        count: int = 100,
    ) -> List[Dict[str, Any]]:
        """Search for granules matching criteria with retry logic."""
        import asyncio
        from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

        @retry(
            wait=wait_exponential(multiplier=1, min=2, max=30),
            stop=stop_after_attempt(3),
            retry=retry_if_exception_type((ConnectionError, TimeoutError, IOError)),
        )
        async def _search():
            # Ensure auth is initialized
            _ = self.auth

            # Run synchronous earthaccess.search_data in thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            def _search():
                params = {
                    "short_name": self.short_name,
                    "bounding_box": bbox.to_earthaccess(),
                    "temporal": time_range.to_tuple(),
                    "count": count,
                }
                # CMR rejects the literal versions "latest" and "2" for these products.
                if self.version and self.version not in {"latest", "2"}:
                    params["version"] = self.version
                return earthaccess.search_data(**params)

            results = await loop.run_in_executor(None, _search)
            return list(results or [])

        return await _search()

    async def download_granules(
        self,
        granules: List[Dict[str, Any]],
        local_dir: str,
    ) -> List[str]:
        """Download granules to local directory with retry logic."""
        import asyncio
        from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

        @retry(
            wait=wait_exponential(multiplier=1, min=2, max=30),
            stop=stop_after_attempt(3),
            retry=retry_if_exception_type((ConnectionError, TimeoutError, IOError)),
        )
        async def _download():
            os.makedirs(local_dir, exist_ok=True)

            # Ensure auth is initialized
            _ = self.auth

            # Run synchronous earthaccess.download in thread pool
            loop = asyncio.get_event_loop()
            results = await loop.run_in_executor(
                None,
                lambda: earthaccess.download(granules, local_dir)
            )
            return results or []

        return await _download()

    async def open_granule(self, granule: Dict[str, Any]) -> xr.Dataset:
        """Open a single granule as xarray Dataset (lazy loading)."""
        import asyncio

        # Ensure auth is initialized
        _ = self.auth

        # Run synchronous earthaccess.open in thread pool
        loop = asyncio.get_event_loop()
        try:
            ds = await loop.run_in_executor(
                None,
                lambda: earthaccess.open(granule)
            )
            return ds
        except Exception as e:
            raise ValueError(f"Failed to open granule: {e}")

    @abstractmethod
    async def get_variable(
        self,
        bbox: BoundingBox,
        time_range: TimeRange,
        variable: str,
        **kwargs,
    ) -> NASADataResult:
        """Get a specific variable from the dataset."""
        pass

    async def close(self):
        """Close HTTP session."""
        if self._session:
            await self._session.aclose()
            self._session = None


class NASAEarthdataService(NASAEarthdataBase):
    """Generic NASA Earthdata service for datasets not needing custom logic."""

    def __init__(self, short_name: str, version: str = "latest"):
        super().__init__(short_name, version)

    async def get_variable(
        self,
        bbox: BoundingBox,
        time_range: TimeRange,
        variable: str,
        **kwargs,
    ) -> NASADataResult:
        """Generic variable retrieval - downloads and opens first matching granule."""
        granules = await self.search_granules(bbox, time_range, count=1)
        if not granules:
            raise ValueError(f"No granules found for {self.short_name} in given bbox/time")

        # Open first granule
        ds = await self.open_granule(granules[0])

        # Extract variable
        if variable not in ds.data_vars:
            raise ValueError(f"Variable '{variable}' not found in dataset. Available: {list(ds.data_vars)}")

        var_data = ds[variable]

        return NASADataResult(
            dataset=self.short_name,
            variable=variable,
            bbox=bbox,
            time_range=time_range,
            data=var_data.to_dataset(),
            metadata={
                "granule_ur": granules[0].get("GranuleUR"),
                "version": self.version,
                "variable_attrs": dict(var_data.attrs),
            },
        )


# Common variable mappings for major datasets
DATASET_VARIABLES = {
    "SPL3SMP": {
        "soil_moisture_am": "soil_moisture_am",
        "soil_moisture_pm": "soil_moisture_pm",
        "soil_moisture": "soil_moisture",
        "freeze_thaw": "freeze_thaw",
    },
    "SPL2SMP": {
        "soil_moisture": "soil_moisture",
    },
    "MOD13Q1": {
        "ndvi": "250m_16_days_NDVI",
        "evi": "250m_16_days_EVI",
        "quality": "250m_16_days_pixel_reliability",
    },
    "MYD13Q1": {
        "ndvi": "250m_16_days_NDVI",
        "evi": "250m_16_days_EVI",
        "quality": "250m_16_days_pixel_reliability",
    },
    "MOD11A2": {
        "lst_day": "LST_Day_1km",
        "lst_night": "LST_Night_1km",
        "qc_day": "QC_Day",
        "qc_night": "QC_Night",
    },
    "MCD12Q1": {
        "land_cover": "LC_Type1",
        "land_cover_prop": "LC_Prop1",
    },
    "GPM_3IMERGHH": {
        "precipitation": "precipitationCal",
        "precipitation_uncal": "precipitationUncal",
        "probability_liquid": "probabilityLiquidPrecipitation",
    },
    "ECOL2EST": {
        "et": "ET",
        "et_uncertainty": "ETuncertainty",
        "water_stress": "WaterStress",
        "et_reference": "ETreference",
    },
    "ATL24": {
        "bathymetry": "bathymetry",
        "sea_surface_height": "sea_surface_height",
        "ortho_h": "ortho_h",
        "surface_h": "surface_h",
        "class_ph": "class_ph",
        "confidence": "confidence",
    },
}