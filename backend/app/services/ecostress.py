"""ECOSTRESS service for evapotranspiration and plant water stress."""

from datetime import datetime
from typing import List, Optional

import numpy as np
import xarray as xr

from app.core.config import get_settings
from app.services.nasa_earthdata import (
    BoundingBox,
    NASADataResult,
    NASAEarthdataBase,
    TimeRange,
    DATASET_VARIABLES,
)


class ECOSTRESSService(NASAEarthdataBase):
    """Service for accessing ECOSTRESS data from the International Space Station.

    Products:
    - ECOL2EST: Evapotranspiration (70m, ~4 day revisit)
    - ECOL3ETPTJPL: ET JPL Algorithm (70m)
    - ECOL3ETPTALEXI: ET ALEXI Algorithm (70m)
    - ECOL3ETPTDIS: ET DisALEXI Algorithm (70m)
    - ECOL3ETPT: ET PT-JPL Ensemble (70m)
    - ECOL3WUE: Water Use Efficiency (70m)
    - ECOL3ESI: Evaporative Stress Index (70m)
    """

    PRODUCTS = {
        "ECOL2EST": "L2 Evapotranspiration (70m)",
        "ECOL3ETPTJPL": "L3 ET PT-JPL Algorithm (70m)",
        "ECOL3ETPTALEXI": "L3 ET ALEXI Algorithm (70m)",
        "ECOL3ETPTDIS": "L3 ET DisALEXI Algorithm (70m)",
        "ECOL3ETPT": "L3 ET PT-JPL Ensemble (70m)",
        "ECOL3WUE": "L3 Water Use Efficiency (70m)",
        "ECOL3ESI": "L3 Evaporative Stress Index (70m)",
    }

    DEFAULT_PRODUCT = "ECO_L2T_LSTE"

    def __init__(self, product: str = DEFAULT_PRODUCT, version: str = ""):
        super().__init__(product, version)
        self.product = product
        self.variables = DATASET_VARIABLES.get(product, {
            "et": "ET",
            "et_uncertainty": "ETuncertainty",
            "water_stress": "WaterStress",
            "et_reference": "ETreference",
            "et_fraction": "ETfraction",
        })

    async def get_evapotranspiration(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
        variable: str = "et",
    ) -> NASADataResult:
        """Get evapotranspiration data."""
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        return await self.get_variable(bbox, time_range, variable)

    async def get_water_stress(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
    ) -> NASADataResult:
        """Get plant water stress index (0-1, higher = more stress)."""
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        # Water stress might be in a different product
        original = self.product
        if "WaterStress" not in self.variables.values() and self.product != "ECOL3ESI":
            self.product = "ECOL3ESI"
            self.short_name = "ECOL3ESI"
            self.variables = {"water_stress": "ESI"}

        try:
            result = await self.get_variable(bbox, time_range, "water_stress")
        finally:
            self.product = original
            self.short_name = original
            self.variables = DATASET_VARIABLES.get(original, {})

        return result

    async def get_evaporative_stress_index(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
    ) -> NASADataResult:
        """Get Evaporative Stress Index (ESI)."""
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        original = self.product
        self.product = "ECOL3ESI"
        self.short_name = "ECOL3ESI"
        self.variables = {"esi": "ESI"}

        try:
            return await self.get_variable(bbox, time_range, "esi")
        finally:
            self.product = original
            self.short_name = original
            self.variables = DATASET_VARIABLES.get(original, {})

    async def get_water_use_efficiency(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
    ) -> NASADataResult:
        """Get Water Use Efficiency (WUE)."""
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        original = self.product
        self.product = "ECOL3WUE"
        self.short_name = "ECOL3WUE"
        self.variables = {"wue": "WUE"}

        try:
            return await self.get_variable(bbox, time_range, "wue")
        finally:
            self.product = original
            self.short_name = original
            self.variables = DATASET_VARIABLES.get(original, {})

    async def get_variable(
        self,
        bbox: BoundingBox,
        time_range: TimeRange,
        variable: str,
        **kwargs,
    ) -> NASADataResult:
        """Get specific ECOSTRESS variable."""
        granules = await self.search_granules(bbox, time_range, count=50)
        if not granules:
            raise ValueError(f"No {self.product} granules found")

        datasets = []
        for granule in granules[:20]:
            try:
                ds = await self.open_granule(granule)

                var_key = self.variables.get(variable, variable)
                if var_key not in ds.data_vars:
                    # Try common names
                    for alt in [variable, variable.upper(), variable.lower()]:
                        if alt in ds.data_vars:
                            var_key = alt
                            break
                    else:
                        continue

                var_data = ds[var_key]
                ds_subset = self._subset_to_bbox(ds, bbox)
                datasets.append(ds_subset[var_key])
            except Exception as e:
                print(f"Warning: Failed to process ECOSTRESS granule: {e}")
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
                "spatial_resolution": "70m",
                "variable_attrs": dict(datasets[0].attrs) if datasets else {},
            },
        )

    def _subset_to_bbox(self, ds: xr.Dataset, bbox: BoundingBox) -> xr.Dataset:
        """Subset ECOSTRESS data to bounding box."""
        try:
            # ECOSTRESS uses geographic lat/lon
            if "lat" in ds.dims and "lon" in ds.dims:
                return ds.sel(
                    lat=slice(bbox.max_lat, bbox.min_lat),
                    lon=slice(bbox.min_lon, bbox.max_lon),
                )
            elif "latitude" in ds.dims and "longitude" in ds.dims:
                return ds.sel(
                    latitude=slice(bbox.max_lat, bbox.min_lat),
                    longitude=slice(bbox.min_lon, bbox.max_lon),
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
        variable: str = "et",
    ) -> xr.DataArray:
        """Get ECOSTRESS time series for a single point."""
        bbox = BoundingBox(
            min_lon=lon - 0.005, min_lat=lat - 0.005,
            max_lon=lon + 0.005, max_lat=lat + 0.005,
        )
        result = await self.get_evapotranspiration(
            bbox, start_date, end_date, variable
        )
        return result.data[variable].sel(lat=lat, lon=lon, method="nearest")


async def get_ecostress_et(
    bbox: BoundingBox,
    start_date: str,
    end_date: str,
) -> NASADataResult:
    """Quick function to get ECOSTRESS ET."""
    service = ECOSTRESSService()
    return await service.get_evapotranspiration(bbox, start_date, end_date)


async def get_ecostress_water_stress(
    bbox: BoundingBox,
    start_date: str,
    end_date: str,
) -> NASADataResult:
    """Quick function to get ECOSTRESS water stress."""
    service = ECOSTRESSService()
    return await service.get_water_stress(bbox, start_date, end_date)