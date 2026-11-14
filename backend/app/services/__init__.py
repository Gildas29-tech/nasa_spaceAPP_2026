"""NASA Data Services package."""

from app.services.nasa_earthdata import (
    NASAEarthdataBase,
    NASAEarthdataService,
    BoundingBox,
    TimeRange,
    NASADataResult,
    DATASET_VARIABLES,
)
from app.services.smap import SMAPService, get_smap_soil_moisture, get_smap_time_series
from app.services.modis import MODISService, get_modis_ndvi, get_modis_lst, LAND_COVER_CLASSES
from app.services.landsat import LandsatService, get_landsat_ndvi
from app.services.gpm import GPMService, get_gpm_precipitation
from app.services.ecostress import ECOSTRESSService, get_ecostress_et, get_ecostress_water_stress
from app.services.crop_casma import CropCASMAService, NASAUSDASoilMoistureService
from app.services.openet import OpenETService, MockOpenETService
from app.services.atl24 import ATL24Service, get_atl24_bathymetry

__all__ = [
    # Base
    "NASAEarthdataBase",
    "NASAEarthdataService",
    "BoundingBox",
    "TimeRange",
    "NASADataResult",
    "DATASET_VARIABLES",

    # Services
    "SMAPService",
    "MODISService",
    "LandsatService",
    "GPMService",
    "ECOSTRESSService",
    "CropCASMAService",
    "NASAUSDASoilMoistureService",
    "OpenETService",
    "MockOpenETService",
    "ATL24Service",

    # Quick functions
    "get_smap_soil_moisture",
    "get_smap_time_series",
    "get_modis_ndvi",
    "get_modis_lst",
    "get_landsat_ndvi",
    "get_gpm_precipitation",
    "get_ecostress_et",
    "get_ecostress_water_stress",
    "get_atl24_bathymetry",

    # Constants
    "LAND_COVER_CLASSES",
]