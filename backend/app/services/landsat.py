"""Landsat 8/9 service for high-resolution surface reflectance and vegetation indices."""

from datetime import datetime
from typing import Dict, List, Optional

import numpy as np
import xarray as xr

from app.core.config import get_settings
from app.services.nasa_earthdata import (
    BoundingBox,
    NASADataResult,
    NASAEarthdataBase,
    TimeRange,
)


class LandsatService(NASAEarthdataBase):
    """Service for accessing Landsat 8/9 Collection 2 Level-2 data.

    Products:
    - LC08_L2SP: Landsat 8 Surface Reflectance + ST
    - LC09_L2SP: Landsat 9 Surface Reflectance + ST

    Bands (30m):
    - SR_B1..SR_B7: Surface Reflectance Bands 1-7
    - ST_B10: Surface Temperature (Band 10)
    - QA_PIXEL: Pixel Quality Assessment
    """

    PRODUCTS = {
        "LC08_L2SP": "Landsat 8 Collection 2 Level-2 Science Products",
        "LC09_L2SP": "Landsat 9 Collection 2 Level-2 Science Products",
    }

    # Band mappings
    BANDS = {
        "coastal": "SR_B1",      # 0.43-0.45 µm
        "blue": "SR_B2",         # 0.45-0.51 µm
        "green": "SR_B3",        # 0.53-0.59 µm
        "red": "SR_B4",          # 0.64-0.67 µm
        "nir": "SR_B5",          # 0.85-0.88 µm
        "swir1": "SR_B6",        # 1.57-1.65 µm
        "swir2": "SR_B7",        # 2.11-2.29 µm
        "thermal": "ST_B10",     # 10.6-11.19 µm
    }

    # Derived indices
    INDICES = {
        "ndvi": ("nir", "red"),
        "evi": ("nir", "red", "blue"),
        "savi": ("nir", "red"),
        "msavi": ("nir", "red"),
        "ndwi": ("green", "nir"),      # Water index
        "ndmi": ("nir", "swir1"),      # Moisture index
        "nbr": ("nir", "swir2"),       # Burn ratio
        "bai": ("red", "nir"),         # Burn area
    }

    def __init__(self, satellite: str = "LC09", version: str = "2"):
        product = f"{satellite}_L2SP"
        super().__init__(product, version)
        self.satellite = satellite
        self.product = product

    async def get_surface_reflectance(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
        bands: Optional[List[str]] = None,
        cloud_cover_max: float = 20.0,
    ) -> NASADataResult:
        """Get Landsat surface reflectance bands.

        Args:
            bbox: Geographic bounding box
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            bands: List of band names (e.g., ['red', 'nir', 'swir1'])
            cloud_cover_max: Maximum cloud cover percentage

        Returns:
            NASADataResult with surface reflectance bands
        """
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        if bands is None:
            bands = ["red", "nir", "green", "blue", "swir1", "swir2"]

        return await self.get_bands(bbox, time_range, bands, cloud_cover_max)

    async def get_bands(
        self,
        bbox: BoundingBox,
        time_range: TimeRange,
        bands: List[str],
        cloud_cover_max: float = 20.0,
    ) -> NASADataResult:
        """Get specific Landsat bands."""
        granules = await self.search_granules(bbox, time_range, count=50)
        if not granules:
            raise ValueError(f"No {self.product} granules found")

        # Filter by cloud cover if available
        filtered_granules = []
        for g in granules:
            cloud_cover = g.get("CloudCover", 100)
            if cloud_cover <= cloud_cover_max:
                filtered_granules.append(g)

        if not filtered_granules:
            raise ValueError(f"No granules with cloud cover <= {cloud_cover_max}%")

        datasets = []
        for granule in filtered_granules[:5]:  # Limit for performance
            try:
                ds = await self.open_granule(granule)
                band_data = {}
                for band_name in bands:
                    band_key = self.BANDS.get(band_name, band_name)
                    if band_key in ds.data_vars:
                        band_data[band_name] = self._subset_to_bbox(ds, bbox)[band_key]

                if band_data:
                    # Combine bands into single dataset
                    band_ds = xr.Dataset(band_data)
                    # Add time coordinate
                    band_ds = band_ds.assign_coords(time=granule.get("time_start", ""))
                    datasets.append(band_ds)
            except Exception as e:
                print(f"Warning: Failed to process Landsat granule: {e}")
                continue

        if not datasets:
            raise ValueError("No valid band data found")

        # Combine along time
        combined = xr.concat(datasets, dim="time").sortby("time")

        return NASADataResult(
            dataset=self.product,
            variable="surface_reflectance",
            bbox=bbox,
            time_range=time_range,
            data=combined,
            metadata={
                "product": self.product,
                "bands_requested": bands,
                "cloud_cover_max": cloud_cover_max,
                "scenes_used": len(datasets),
            },
        )

    async def get_vegetation_indices(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
        indices: Optional[List[str]] = None,
        cloud_cover_max: float = 20.0,
    ) -> NASADataResult:
        """Compute vegetation indices from Landsat bands."""
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        # Need red, nir at minimum; blue for EVI
        required_bands = {"red", "nir"}
        if indices and "evi" in indices:
            required_bands.add("blue")

        bands_result = await self.get_bands(
            bbox, time_range, list(required_bands), cloud_cover_max
        )

        # Compute indices
        index_data = {}
        sr = bands_result.data

        if indices is None:
            indices = ["ndvi", "savi", "ndwi", "ndmi"]

        for idx_name in indices:
            if idx_name == "ndvi":
                index_data["ndvi"] = self._compute_ndvi(sr["nir"], sr["red"])
            elif idx_name == "evi" and "blue" in sr:
                index_data["evi"] = self._compute_evi(sr["nir"], sr["red"], sr["blue"])
            elif idx_name == "savi":
                index_data["savi"] = self._compute_savi(sr["nir"], sr["red"])
            elif idx_name == "msavi":
                index_data["msavi"] = self._compute_msavi(sr["nir"], sr["red"])
            elif idx_name == "ndwi":
                index_data["ndwi"] = self._compute_ndwi(sr["green"], sr["nir"])
            elif idx_name == "ndmi":
                index_data["ndmi"] = self._compute_ndmi(sr["nir"], sr["swir1"])
            elif idx_name == "nbr":
                index_data["nbr"] = self._compute_nbr(sr["nir"], sr["swir2"])

        index_ds = xr.Dataset(index_data, coords=sr.coords)

        return NASADataResult(
            dataset=self.product,
            variable="vegetation_indices",
            bbox=bbox,
            time_range=time_range,
            data=index_ds,
            metadata={
                "product": self.product,
                "indices_computed": list(index_data.keys()),
                "scenes_used": bands_result.metadata.get("scenes_used", 0),
            },
        )

    def _compute_ndvi(self, nir: xr.DataArray, red: xr.DataArray) -> xr.DataArray:
        """NDVI = (NIR - Red) / (NIR + Red)"""
        return (nir - red) / (nir + red + 1e-10)

    def _compute_evi(
        self, nir: xr.DataArray, red: xr.DataArray, blue: xr.DataArray
    ) -> xr.DataArray:
        """EVI = 2.5 * (NIR - Red) / (NIR + 6*Red - 7.5*Blue + 1)"""
        return 2.5 * (nir - red) / (nir + 6 * red - 7.5 * blue + 1 + 1e-10)

    def _compute_savi(self, nir: xr.DataArray, red: xr.DataArray, L: float = 0.5) -> xr.DataArray:
        """SAVI = (NIR - Red) / (NIR + Red + L) * (1 + L)"""
        return ((nir - red) / (nir + red + L)) * (1 + L)

    def _compute_msavi(self, nir: xr.DataArray, red: xr.DataArray) -> xr.DataArray:
        """MSAVI = (2*NIR + 1 - sqrt((2*NIR + 1)^2 - 8*(NIR - Red))) / 2"""
        return (2 * nir + 1 - ((2 * nir + 1) ** 2 - 8 * (nir - red)) ** 0.5) / 2

    def _compute_ndwi(self, green: xr.DataArray, nir: xr.DataArray) -> xr.DataArray:
        """NDWI = (Green - NIR) / (Green + NIR)"""
        return (green - nir) / (green + nir + 1e-10)

    def _compute_ndmi(self, nir: xr.DataArray, swir1: xr.DataArray) -> xr.DataArray:
        """NDMI = (NIR - SWIR1) / (NIR + SWIR1)"""
        return (nir - swir1) / (nir + swir1 + 1e-10)

    def _compute_nbr(self, nir: xr.DataArray, swir2: xr.DataArray) -> xr.DataArray:
        """NBR = (NIR - SWIR2) / (NIR + SWIR2)"""
        return (nir - swir2) / (nir + swir2 + 1e-10)

    def _subset_to_bbox(self, ds: xr.Dataset, bbox: BoundingBox) -> xr.Dataset:
        """Subset Landsat data to bounding box."""
        try:
            if "x" in ds.dims and "y" in ds.dims:
                # Landsat uses UTM coordinates
                # For simplicity, return as-is
                return ds
        except Exception:
            pass
        return ds

    async def get_temperature(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
        cloud_cover_max: float = 20.0,
    ) -> NASADataResult:
        """Get surface temperature from thermal band."""
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        result = await self.get_bands(
            bbox, time_range, ["thermal"], cloud_cover_max
        )

        # Convert to Celsius (ST_B10 is in Kelvin * 0.00341802 + 149.0)
        if "thermal" in result.data.data_vars:
            temp_k = result.data["thermal"] * 0.00341802 + 149.0
            temp_c = temp_k - 273.15
            result.data["temperature_celsius"] = temp_c

        return result


async def get_landsat_ndvi(
    bbox: BoundingBox,
    start_date: str,
    end_date: str,
    satellite: str = "LC09",
) -> NASADataResult:
    """Quick function to get Landsat NDVI."""
    service = LandsatService(satellite)
    return await service.get_vegetation_indices(bbox, start_date, end_date, ["ndvi"])