"""GPM/IMERG service for precipitation data."""

from datetime import datetime
from typing import List, Optional

import numpy as np
import xarray as xr

from app.core.config import get_settings
from app.services.nasa_earthdata import (
    BoundingBox,
    NASADataResult,
    NASAEarthdataBase,
    NASAEarthdataService,
    TimeRange,
    DATASET_VARIABLES,
)


class GPMService(NASAEarthdataBase):
    """Service for accessing GPM/IMERG precipitation data.

    Products:
    - GPM_3IMERGHH: Half-hourly precipitation (0.1°)
    - GPM_3IMERGHHH: Hourly precipitation (0.1°)
    - GPM_3IMERGM: Monthly precipitation (0.1°)
    - GPM_3IMERGDE: Daily precipitation (0.1°) - Early Run
    - GPM_3IMERGLR: Late Run precipitation
    """

    PRODUCTS = {
        "GPM_3IMERGHH": "IMERG Half-Hourly 0.1° (Near Real-Time)",
        "GPM_3IMERGHHH": "IMERG Hourly 0.1° (Near Real-Time)",
        "GPM_3IMERGM": "IMERG Monthly 0.1°",
        "GPM_3IMERGDE": "IMERG Daily Early Run 0.1°",
        "GPM_3IMERGLR": "IMERG Late Run 0.1°",
    }

    DEFAULT_PRODUCT = "GPM_3IMERGHH"

    def __init__(self, product: str = DEFAULT_PRODUCT, version: str = "07"):
        super().__init__(product, version)
        self.product = product
        self.variables = DATASET_VARIABLES.get(product, {
            "precipitation": "precipitationCal",
            "precipitation_uncal": "precipitationUncal",
            "probability_liquid": "probabilityLiquidPrecipitation",
        })

    async def get_precipitation(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
        variable: str = "precipitation",
        accumulate: bool = False,
    ) -> NASADataResult:
        """Get precipitation data.

        Args:
            bbox: Geographic bounding box
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            variable: 'precipitation' (calibrated), 'precipitation_uncal', or 'probability_liquid'
            accumulate: If True, return accumulated precipitation over time range
        """
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        result = await self.get_variable(bbox, time_range, variable)

        if accumulate and "time" in result.data.dims:
            # Sum over time dimension
            accumulated = result.data[variable].sum(dim="time")
            result.data = accumulated.to_dataset(name=f"{variable}_accumulated")
            result.variable = f"{variable}_accumulated"
            result.metadata["accumulated"] = True

        return result

    async def get_daily_accumulation(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
    ) -> NASADataResult:
        """Get daily accumulated precipitation."""
        result = await self.get_precipitation(
            bbox, start_date, end_date, "precipitation", accumulate=False
        )

        # Resample to daily and sum
        if "time" in result.data.dims:
            daily = result.data["precipitation"].resample(time="1D").sum()
            result.data = daily.to_dataset(name="precipitation_daily")
            result.variable = "precipitation_daily"
            result.metadata["temporal_resolution"] = "daily"

        return result

    async def get_variable(
        self,
        bbox: BoundingBox,
        time_range: TimeRange,
        variable: str,
        **kwargs,
    ) -> NASADataResult:
        """Get specific GPM variable."""
        granules = await self.search_granules(bbox, time_range, count=200)
        if not granules:
            raise ValueError(f"No {self.product} granules found")

        datasets = []
        for granule in granules[:50]:  # Limit for performance
            try:
                ds = await self.open_granule(granule)

                var_key = self.variables.get(variable, variable)
                if var_key not in ds.data_vars:
                    continue

                var_data = ds[var_key]
                ds_subset = self._subset_to_bbox(ds, bbox)
                datasets.append(ds_subset[var_key])
            except Exception as e:
                print(f"Warning: Failed to process GPM granule: {e}")
                continue

        if not datasets:
            raise ValueError(f"No valid data for variable '{variable}'")

        combined = xr.concat(datasets, dim="time").sortby("time")

        return NASADataResult(
            dataset=self.product,
            variable=variable,
            bbox=bbox,
            time_range=time_range,
            data=combined.to_dataset(name=variable),
            metadata={
                "product": self.product,
                "granules_used": len(datasets),
                "temporal_resolution": "30min" if "HH" in self.product else "monthly",
                "variable_attrs": dict(datasets[0].attrs) if datasets else {},
            },
        )

    def _subset_to_bbox(self, ds: xr.Dataset, bbox: BoundingBox) -> xr.Dataset:
        """Subset GPM data to bounding box (0.1° lat/lon grid)."""
        try:
            if "lat" in ds.dims and "lon" in ds.dims:
                return ds.sel(
                    lat=slice(bbox.max_lat, bbox.min_lat),  # GPM lat is descending
                    lon=slice(bbox.min_lon, bbox.max_lon),
                )
        except Exception:
            pass
        return ds

    async def get_time_series(
        self,
        lat: float,
        lon: float,
        start_date: str,
        end_date: str,
        variable: str = "precipitation",
    ) -> xr.DataArray:
        """Get precipitation time series for a single point."""
        bbox = BoundingBox(
            min_lon=lon - 0.05, min_lat=lat - 0.05,
            max_lon=lon + 0.05, max_lat=lat + 0.05,
        )
        result = await self.get_precipitation(
            bbox, start_date, end_date, variable
        )
        return result.data[variable].sel(lat=lat, lon=lon, method="nearest")

    async def get_seasonal_climatology(
        self,
        bbox: BoundingBox,
        years: List[int] = None,
    ) -> NASADataResult:
        """Get seasonal precipitation climatology."""
        if years is None:
            years = list(range(2010, 2024))

        # This would require fetching multiple years of monthly data
        # Implementation would aggregate monthly data across years
        raise NotImplementedError("Use monthly product for climatology")


async def get_gpm_precipitation(
    bbox: BoundingBox,
    start_date: str,
    end_date: str,
    accumulate_daily: bool = True,
) -> NASADataResult:
    """Quick function to get GPM precipitation.

    Uses GPM_3IMERGDE (Daily Early Run) for better coverage and daily accumulation.
    """
    service = GPMService(product="GPM_3IMERGDE")  # Daily Early Run product
    if accumulate_daily:
        return await service.get_daily_accumulation(bbox, start_date, end_date)
    return await service.get_precipitation(bbox, start_date, end_date)