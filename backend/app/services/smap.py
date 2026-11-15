"""SMAP (Soil Moisture Active Passive) service for soil moisture data."""

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


class SMAPService(NASAEarthdataBase):
    """Service for accessing SMAP soil moisture data.

    Datasets:
    - SPL3SMP: Level 3 Soil Moisture (9km, daily)
    - SPL2SMP: Level 2 Soil Moisture (36km, half-orbit)
    - SPL4SMAU: Level 4 Surface/Root Zone Soil Moisture (9km, 3-hourly)
    """

    # Available SMAP products
    PRODUCTS = {
        "SPL3SMP": "Level 3 Surface Soil Moisture (9km, daily)",
        "SPL3SMP_E": "Level 3 Enhanced Surface Soil Moisture (9km, daily)",
        "SPL2SMP": "Level 2 Surface Soil Moisture (36km, half-orbit)",
        "SPL4SMAU": "Level 4 Surface/Root Zone Soil Moisture (9km, 3-hourly)",
    }

    DEFAULT_PRODUCT = "SPL3SMP"

    def __init__(self, product: str = DEFAULT_PRODUCT):
        super().__init__(product, version="008")
        self.product = product
        self.variables = DATASET_VARIABLES.get(product, {})

    async def get_soil_moisture(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
        variable: str = "soil_moisture_am",
        pass_type: str = "am",
    ) -> NASADataResult:
        """Get soil moisture data for a region and time range.

        Args:
            bbox: Geographic bounding box
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            variable: Variable name (soil_moisture_am, soil_moisture_pm, freeze_thaw)
            pass_type: 'am' (morning/descending) or 'pm' (evening/ascending)

        Returns:
            NASADataResult with soil moisture data
        """
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        # Adjust variable based on pass type
        if pass_type == "pm" and "soil_moisture_pm" in self.variables:
            variable = "soil_moisture_pm"
        elif pass_type == "am" and "soil_moisture_am" in self.variables:
            variable = "soil_moisture_am"

        return await self.get_variable(bbox, time_range, variable)

    async def get_variable(
        self,
        bbox: BoundingBox,
        time_range: TimeRange,
        variable: str,
        **kwargs,
    ) -> NASADataResult:
        """Get specific SMAP variable."""
        # Search for granules
        granules = await self.search_granules(bbox, time_range, count=50)
        if not granules:
            raise ValueError(f"No {self.product} granules found for given criteria")

        # Open and combine granules
        datasets = []
        for granule in granules[:10]:  # Limit to first 10 for performance
            try:
                ds = await self.open_granule(granule)
                if variable in ds.data_vars:
                    # Subset to bbox if needed
                    ds_subset = self._subset_to_bbox(ds, bbox)
                    datasets.append(ds_subset[variable])
            except Exception as e:
                print(f"Warning: Failed to open granule {granule.get('GranuleUR')}: {e}")
                continue

        if not datasets:
            raise ValueError(f"No valid data found for variable '{variable}'")

        # Combine along time dimension
        combined = xr.concat(datasets, dim="time")
        combined = combined.sortby("time")

        return NASADataResult(
            dataset=self.product,
            variable=variable,
            bbox=bbox,
            time_range=time_range,
            data=combined.to_dataset(name=variable),
            metadata={
                "product": self.product,
                "pass_type": kwargs.get("pass_type", "am"),
                "granules_used": len(datasets),
                "variable_attrs": dict(datasets[0].attrs) if datasets else {},
            },
        )

    def _subset_to_bbox(self, ds: xr.Dataset, bbox: BoundingBox) -> xr.Dataset:
        """Subset dataset to bounding box."""
        try:
            # Try standard lat/lon coordinates
            if "lat" in ds.dims and "lon" in ds.dims:
                return ds.sel(
                    lat=slice(bbox.min_lat, bbox.max_lat),
                    lon=slice(bbox.min_lon, bbox.max_lon),
                )
            elif "latitude" in ds.dims and "longitude" in ds.dims:
                return ds.sel(
                    latitude=slice(bbox.min_lat, bbox.max_lat),
                    longitude=slice(bbox.min_lon, bbox.max_lon),
                )
            elif "y" in ds.dims and "x" in ds.dims:
                # For projected coordinates, skip spatial subsetting
                return ds
        except Exception:
            pass
        return ds

    async def get_time_series(
        self,
        lat: float,
        lon: float,
        start_date: str,
        end_date: str,
        variable: str = "soil_moisture_am",
    ) -> xr.DataArray:
        """Get soil moisture time series for a single point."""
        bbox = BoundingBox(
            min_lon=lon - 0.05, min_lat=lat - 0.05,
            max_lon=lon + 0.05, max_lat=lat + 0.05,
        )
        result = await self.get_soil_moisture(
            bbox, start_date, end_date, variable
        )
        # Extract nearest point
        return result.data[variable].sel(lat=lat, lon=lon, method="nearest")

    async def get_root_zone_moisture(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
    ) -> NASADataResult:
        """Get root zone soil moisture from SPL4SMAU product."""
        # Switch to Level 4 product for root zone
        original_product = self.product
        self.product = "SPL4SMAU"
        self.short_name = "SPL4SMAU"
        self.variables = DATASET_VARIABLES.get("SPL4SMAU", {})

        try:
            result = await self.get_soil_moisture(
                bbox, start_date, end_date,
                variable="root_zone_soil_moisture",
            )
        finally:
            # Restore original product
            self.product = original_product
            self.short_name = original_product
            self.variables = DATASET_VARIABLES.get(original_product, {})

        return result


# Convenience functions
async def get_smap_soil_moisture(
    bbox: BoundingBox,
    start_date: str,
    end_date: str,
    variable: str = "soil_moisture_am",
) -> NASADataResult:
    """Quick function to get SMAP soil moisture."""
    service = SMAPService()
    return await service.get_soil_moisture(bbox, start_date, end_date, variable)


async def get_smap_time_series(
    lat: float,
    lon: float,
    start_date: str,
    end_date: str,
) -> xr.DataArray:
    """Quick function to get SMAP time series at a point."""
    service = SMAPService()
    return await service.get_time_series(lat, lon, start_date, end_date)