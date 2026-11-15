"""ATL24 (ATLAS/ICESat-2 L3A Coastal Bathymetry) service."""

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


class ATL24Service(NASAEarthdataBase):
    """Service for accessing ATLAS/ICESat-2 ATL24 coastal bathymetry data.

    ATL24 provides along-track coastal and nearshore bathymetry:
    - Refraction-corrected seafloor heights
    - Sea surface heights
    - Associated uncertainties
    - Photon classifications (bathymetry, sea surface, etc.)

    Products:
    - ATL24: Version 003 (latest, ITRF2020)
    - Derived from ATL03 (L2A Geolocated Photon Data)

    Variables (per beam: gt1l, gt1r, gt2l, gt2r, gt3l, gt3r):
    - ortho_h: Orthometric height (EGM08)
    - surface_h: Sea surface height
    - ellipse_h: Ellipsoidal height
    - class_ph: Photon classification (40=bathymetry, 41=sea_surface)
    - confidence: Bathymetry confidence (0-1)
    - sigma_thu, sigma_tvu: Horizontal/vertical uncertainty
    - kd: Light attenuation coefficient (v003+)
    - surface_roughness: Wind speed/surface roughness (v003+)
    - segment_id: Segment identifier (v003+)
    """

    PRODUCTS = {
        "ATL24": "ATLAS/ICESat-2 L3A Along-Track Coastal Bathymetry",
    }

    BEAMS = ["gt1l", "gt1r", "gt2l", "gt2r", "gt3l", "gt3r"]
    STRONG_BEAMS = ["gt1l", "gt2l", "gt3l"]  # Strong beams
    WEAK_BEAMS = ["gt1r", "gt2r", "gt3r"]   # Weak beams

    # Classification codes
    CLASS_CODES = {
        0: "unclassified",
        40: "bathymetry",
        41: "sea_surface",
        42: "sea_ice",
        43: "land",
        44: "vegetation",
    }

    def __init__(self, version: str = "003"):
        super().__init__("ATL24", version)
        self.variables = DATASET_VARIABLES.get("ATL24", {
            "bathymetry": "bathymetry",
            "sea_surface_height": "sea_surface_height",
            "ortho_h": "ortho_h",
            "surface_h": "surface_h",
            "class_ph": "class_ph",
            "confidence": "confidence",
            "ellipse_h": "ellipse_h",
            "sigma_thu": "sigma_thu",
            "sigma_tvu": "sigma_tvu",
            "kd": "kd",
            "surface_roughness": "surface_roughness",
            "segment_id": "segment_id",
        })

    async def get_bathymetry(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
        beams: Optional[List[str]] = None,
        confidence_threshold: float = 0.0,
        class_filter: Optional[List[int]] = None,
    ) -> NASADataResult:
        """Get bathymetry data for coastal region.

        Args:
            bbox: Geographic bounding box (coastal area)
            start_date: Start date (YYYY-MM-DD)
            end_date: End date (YYYY-MM-DD)
            beams: List of beams to include (default: strong beams only)
            confidence_threshold: Minimum confidence (0-1)
            class_filter: Photon classes to include (default: [40, 41])
        """
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        if beams is None:
            beams = self.STRONG_BEAMS

        if class_filter is None:
            class_filter = [40, 41]  # bathymetry + sea surface

        return await self._get_beam_data(
            bbox, time_range, beams, confidence_threshold, class_filter
        )

    async def get_sea_surface_height(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
        beams: Optional[List[str]] = None,
    ) -> NASADataResult:
        """Get sea surface height (SSH) along tracks."""
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        if beams is None:
            beams = self.STRONG_BEAMS

        result = await self._get_beam_data(
            bbox, time_range, beams, 0.0, [41]  # sea surface only
        )
        result.variable = "sea_surface_height"
        return result

    async def get_kd_attenuation(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
        beams: Optional[List[str]] = None,
    ) -> NASADataResult:
        """Get light attenuation coefficient (Kd) - v003+."""
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        if beams is None:
            beams = self.STRONG_BEAMS

        result = await self._get_beam_data(
            bbox, time_range, beams, 0.0, [40, 41]
        )
        # Filter to just Kd variable
        if "kd" in result.data.data_vars:
            result.data = result.data[["kd"]]
            result.variable = "kd"
        return result

    async def get_surface_roughness(
        self,
        bbox: BoundingBox,
        start_date: str,
        end_date: str,
        beams: Optional[List[str]] = None,
    ) -> NASADataResult:
        """Get surface roughness/wind speed - v003+."""
        time_range = TimeRange(
            start=datetime.strptime(start_date, "%Y-%m-%d"),
            end=datetime.strptime(end_date, "%Y-%m-%d"),
        )

        if beams is None:
            beams = self.STRONG_BEAMS

        result = await self._get_beam_data(
            bbox, time_range, beams, 0.0, [40, 41]
        )
        if "surface_roughness" in result.data.data_vars:
            result.data = result.data[["surface_roughness"]]
            result.variable = "surface_roughness"
        return result

    async def _get_beam_data(
        self,
        bbox: BoundingBox,
        time_range: TimeRange,
        beams: List[str],
        confidence_threshold: float,
        class_filter: List[int],
    ) -> NASADataResult:
        """Get data for specific beams with filtering."""
        granules = await self.search_granules(bbox, time_range, count=100)
        if not granules:
            raise ValueError("No ATL24 granules found for given criteria")

        all_beam_data = {}

        for beam in beams:
            beam_datasets = []

            for granule in granules[:20]:  # Limit for performance
                try:
                    ds = await self.open_granule(granule)

                    # Navigate to beam group
                    if beam not in ds.groups:
                        continue

                    beam_ds = ds[beam]

                    # Apply filters
                    filtered = self._apply_filters(
                        beam_ds, confidence_threshold, class_filter
                    )

                    if filtered is not None and len(filtered) > 0:
                        beam_datasets.append(filtered)

                except Exception as e:
                    print(f"Warning: Failed to process ATL24 granule {beam}: {e}")
                    continue

            if beam_datasets:
                # Combine beam data
                combined = xr.concat(beam_datasets, dim="photon_index")
                all_beam_data[beam] = combined

        if not all_beam_data:
            raise ValueError("No valid ATL24 data found after filtering")

        # Create combined dataset with beam dimension
        beam_names = list(all_beam_data.keys())
        combined_ds = xr.concat(
            [all_beam_data[b] for b in beam_names],
            dim="beam",
        )
        combined_ds = combined_ds.assign_coords(beam=beam_names)

        return NASADataResult(
            dataset="ATL24",
            variable="bathymetry",
            bbox=bbox,
            time_range=time_range,
            data=combined_ds,
            metadata={
                "beams": beam_names,
                "confidence_threshold": confidence_threshold,
                "class_filter": class_filter,
                "granules_processed": len(granules[:20]),
                "version": self.version,
            },
        )

    def _apply_filters(
        self,
        ds: xr.Dataset,
        confidence_threshold: float,
        class_filter: List[int],
    ) -> Optional[xr.Dataset]:
        """Apply confidence and classification filters."""
        try:
            # Get classification and confidence
            if "class_ph" not in ds.data_vars or "confidence" not in ds.data_vars:
                return None

            class_ph = ds["class_ph"]
            confidence = ds["confidence"]

            # Build filter mask
            mask = (confidence >= confidence_threshold) & class_ph.isin(class_filter)

            if not mask.any():
                return None

            # Apply mask to all variables
            filtered = ds.where(mask, drop=True)
            return filtered

        except Exception:
            return None

    async def get_variable(
        self,
        bbox: BoundingBox,
        time_range: TimeRange,
        variable: str,
        **kwargs,
    ) -> NASADataResult:
        """Implement abstract method from NASAEarthdataBase."""
        # Map variable names to methods
        if variable in ["bathymetry", "bathymetry_data"]:
            return await self.get_bathymetry(
                bbox,
                time_range.start.strftime("%Y-%m-%d"),
                time_range.end.strftime("%Y-%m-%d"),
                **kwargs
            )
        elif variable in ["sea_surface_height", "ssh"]:
            return await self.get_sea_surface_height(
                bbox,
                time_range.start.strftime("%Y-%m-%d"),
                time_range.end.strftime("%Y-%m-%d"),
                **kwargs
            )
        elif variable in ["kd", "kd_attenuation"]:
            return await self.get_kd_attenuation(
                bbox,
                time_range.start.strftime("%Y-%m-%d"),
                time_range.end.strftime("%Y-%m-%d"),
                **kwargs
            )
        elif variable in ["surface_roughness", "roughness"]:
            return await self.get_surface_roughness(
                bbox,
                time_range.start.strftime("%Y-%m-%d"),
                time_range.end.strftime("%Y-%m-%d"),
                **kwargs
            )
        else:
            # Default to bathymetry
            return await self.get_bathymetry(
                bbox,
                time_range.start.strftime("%Y-%m-%d"),
                time_range.end.strftime("%Y-%m-%d"),
                **kwargs
            )

    async def get_profile(
        self,
        lat: float,
        lon: float,
        start_date: str,
        end_date: str,
        radius_km: float = 5.0,
    ) -> NASADataResult:
        """Get bathymetry profile near a point."""
        # Convert radius to degrees (approximate)
        deg = radius_km / 111.0
        bbox = BoundingBox(
            min_lon=lon - deg, min_lat=lat - deg,
            max_lon=lon + deg, max_lat=lat + deg,
        )
        return await self.get_bathymetry(bbox, start_date, end_date)

    def compute_depth_from_heights(
        self,
        ortho_h: xr.DataArray,
        surface_h: xr.DataArray,
    ) -> xr.DataArray:
        """Compute water depth from orthometric and surface heights.

        Depth = surface_h - ortho_h (for bathymetry photons)
        """
        return surface_h - ortho_h

    def get_classification_name(self, class_code: int) -> str:
        """Get human-readable name for classification code."""
        return self.CLASS_CODES.get(class_code, f"unknown_{class_code}")


async def get_atl24_bathymetry(
    bbox: BoundingBox,
    start_date: str,
    end_date: str,
    strong_beams_only: bool = True,
) -> NASADataResult:
    """Quick function to get ATL24 bathymetry."""
    service = ATL24Service()
    beams = ATL24Service.STRONG_BEAMS if strong_beams_only else ATL24Service.BEAMS
    return await service.get_bathymetry(bbox, start_date, end_date, beams=beams)