"""MODIS service for vegetation indices, land surface temperature, and land cover."""

from datetime import datetime
from typing import Dict, List, Optional, Tuple

import numpy as np
import xarray as xr

from app.core.config import get_settings
from app.services.nasa_earthdata import (
    BoundingBox,
    NASADataResult,
    NASAEarthdataService,
    TimeRange,
    DATASET_VARIABLES,
)


class MODISService(NASAEarthdataBase):
    """Service for accessing MODIS data products.

    Key Products:
    - MOD13Q1/MYD13Q1: Vegetation Indices (NDVI, EVI) - 250m, 16-day
    - MOD11A2/MYD11A2: Land Surface Temperature - 1km, 8-day
    - MCD12Q1: Land Cover Type - 500m, yearly
    - MOD15A2H: LAI/FPAR - 500m, 8-day
    - MOD09A1: Surface Reflectance - 500m, 8-day
    """

    PRODUCTS = {
        "MOD13Q1": "Terra Vegetation Indices 16-Day L3 Global 250m",
        "MYD13Q1": "Aqua Vegetation Indices 16-Day L3 Global 250m",
        "MOD11A2": "Terra Land Surface Temperature 8-Day L3 Global 1km",
        "MYD11A2": "Aqua Land Surface Temperature 8-Day L3 Global 1km",
        "MCD12Q1": "Combined Land Cover Type Yearly L3 Global 500m",
        "MOD15A2H": "Terra LAI/FPAR 8-Day L4 Global 500m",
        "MOD09A1": "Terra Surface Reflectance 8-Day L3 Global 500m",
        "MYD09A1": "Aqua Surface Reflectance 8-Day L3 Global 500m",
    }

    def __init__(self, product: str = "MOD13Q1", version: str = "061"):
        super().__init__(product, version)
        self.product = product
        self.variables = DATASET_VARIABLES.get(product, {})

    async def get_ndvi(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
        quality_filter: bool = True,
    ) -> NASADataResult:
        """Get NDVI (Normalized Difference Vegetation Index) data."""
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        result = await self.get_variable(
            bbox, time_range, "ndvi", quality_filter=quality_filter
        )
        return result

    async def get_evi(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
        quality_filter: bool = True,
    ) -> NASADataResult:
        """Get EVI (Enhanced Vegetation Index) data."""
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        result = await self.get_variable(
            bbox, time_range, "evi", quality_filter=quality_filter
        )
        return result

    async def get_vegetation_indices(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
        include_quality: bool = True,
    ) -> Dict[str, NASADataResult]:
        """Get both NDVI and EVI with optional quality bands."""
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        results = {}
        for var_name in ["ndvi", "evi"]:
            if var_name in self.variables:
                result = await self.get_variable(
                    bbox, time_range, var_name, quality_filter=include_quality
                )
                results[var_name] = result

        if include_quality and "quality" in self.variables:
            result = await self.get_variable(
                bbox, time_range, "quality", quality_filter=False
            )
            results["quality"] = result

        return results

    async def get_lst(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
        day_night: str = "day",
    ) -> NASADataResult:
        """Get Land Surface Temperature.

        Args:
            day_night: "day" for daytime LST, "night" for nighttime LST
        """
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        var = "lst_day" if day_night == "day" else "lst_night"
        return await self.get_variable(bbox, time_range, var)

    async def get_land_cover(
        self,
        bbox: BoundingBox,
        year: int = 2023,
    ) -> NASADataResult:
        """Get Land Cover Type (MCD12Q1)."""
        # MCD12Q1 is yearly, so we query for the specific year
        time_range = TimeRange(
            start=datetime(year, 1, 1),
            end=datetime(year, 12, 31),
        )

        # Switch to MCD12Q1 if not already
        original = self.product
        if self.product != "MCD12Q1":
            self.product = "MCD12Q1"
            self.short_name = "MCD12Q1"
            self.variables = DATASET_VARIABLES.get("MCD12Q1", {})

        try:
            result = await self.get_variable(
                bbox, time_range, "land_cover"
            )
        finally:
            self.product = original
            self.short_name = original
            self.variables = DATASET_VARIABLES.get(original, {})

        return result

    async def get_variable(
        self,
        bbox: BoundingBox,
        time_range: TimeRange,
        variable: str,
        quality_filter: bool = True,
        **kwargs,
    ) -> NASADataResult:
        """Get specific MODIS variable with optional quality filtering."""
        granules = await self.search_granules(bbox, time_range, count=100)
        if not granules:
            raise ValueError(f"No {self.product} granules found")

        datasets = []
        quality_datasets = []

        for granule in granules:
            try:
                ds = await self.open_granule(granule)

                # Map variable name to actual dataset variable
                var_key = self.variables.get(variable, variable)
                if var_key not in ds.data_vars:
                    continue

                var_data = ds[var_key]
                ds_subset = self._subset_to_bbox(ds, bbox)
                datasets.append(ds_subset[var_key])

                # Get quality band if available and requested
                if quality_filter and "quality" in self.variables:
                    qual_key = self.variables["quality"]
                    if qual_key in ds.data_vars:
                        quality_datasets.append(
                            ds_subset[qual_key]
                        )
            except Exception as e:
                print(f"Warning: Failed to process granule: {e}")
                continue

        if not datasets:
            raise ValueError(f"No valid data for variable '{variable}'")

        # Combine along time
        combined = xr.concat(datasets, dim="time").sortby("time")

        metadata = {
            "product": self.product,
            "granules_used": len(datasets),
            "variable_attrs": dict(datasets[0].attrs) if datasets else {},
        }

        result_data = combined.to_dataset(name=variable)

        # Add quality band if available
        if quality_datasets:
            qual_combined = xr.concat(quality_datasets, dim="time").sortby("time")
            result_data["quality"] = qual_combined
            metadata["has_quality"] = True

        return NASADataResult(
            dataset=self.product,
            variable=variable,
            bbox=bbox,
            time_range=time_range,
            data=result_data,
            metadata=metadata,
        )

    def _subset_to_bbox(self, ds: xr.Dataset, bbox: BoundingBox) -> xr.Dataset:
        """Subset dataset to bounding box."""
        # MODIS Sinusoidal projection - use x/y coordinates
        try:
            if "x" in ds.dims and "y" in ds.dims:
                # Convert bbox to sinusoidal if needed
                # For now, return as-is since coords are in sinu
                return ds
        except Exception:
            pass
        return ds

    def apply_scale_factor(self, data: xr.DataArray, variable: str) -> xr.DataArray:
        """Apply MODIS scale factors to convert to physical units."""
        scale_factors = {
            "ndvi": 0.0001,
            "evi": 0.0001,
            "lst_day": 0.02,  # Kelvin
            "lst_night": 0.02,
        }

        factor = scale_factors.get(variable, 1.0)
        if factor != 1.0:
            return data * factor
        return data

    async def get_time_series(
        self,
        lat: float,
        lon: float,
        start_date: str,
        end_date: str,
        variable: str = "ndvi",
    ) -> xr.DataArray:
        """Get time series for a single point."""
        bbox = BoundingBox(
            min_lon=lon - 0.01, min_lat=lat - 0.01,
            max_lon=lon + 0.01, max_lat=lat + 0.01,
        )
        result = await self.get_variable(
            bbox,
            TimeRange(
                start=datetime.strptime(start_date, "%Y-%m-%d"),
                end=datetime.strptime(end_date, "%Y-%m-%d"),
            ),
            variable,
        )
        # Apply scale factor
        data = self.apply_scale_factor(result.data[variable], variable)
        # Extract nearest point
        return data.sel(lat=lat, lon=lon, method="nearest")


# MODIS Land Cover Class Names (MCD12Q1 IGBP classification)
LAND_COVER_CLASSES = {
    0: "Water",
    1: "Evergreen Needleleaf Forest",
    2: "Evergreen Broadleaf Forest",
    3: "Deciduous Needleleaf Forest",
    4: "Deciduous Broadleaf Forest",
    5: "Mixed Forests",
    6: "Closed Shrublands",
    7: "Open Shrublands",
    8: "Woody Savannas",
    9: "Savannas",
    10: "Grasslands",
    11: "Permanent Wetlands",
    12: "Croplands",
    13: "Urban and Built-Up",
    14: "Cropland/Natural Vegetation Mosaic",
    15: "Snow and Ice",
    15: "Barren or Sparsely Vegetated",
    255: "Unclassified",
}


async def get_modis_ndvi(
    bbox: BoundingBox,
    start_date: str,
    end_date: str,
) -> NASADataResult:
    """Quick function to get MODIS NDVI."""
    service = MODISService("MOD13Q1")
    return await service.get_ndvi(bbox, start_date, end_date)


async def get_modis_lst(
    bbox: BoundingBox,
    start_date: str,
    end_date: str,
    day_night: str = "day",
) -> NASADataResult:
    """Quick function to get MODIS LST."""
    service = MODISService("MOD11A2")
    return await service.get_lst(bbox, start_date, end_date, day_night)