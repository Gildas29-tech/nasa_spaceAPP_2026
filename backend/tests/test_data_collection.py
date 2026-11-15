"""Tests for Data Collection Service."""

import pytest
from datetime import date, datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock

from app.services.nasa_earthdata import BoundingBox, TimeRange

from app.services.data_collection import (
    collect_farm_data,
    collect_nasa_power,
    collect_sentinel2,
    collect_gpm,
    collect_smap,
    collect_landsat,
    collect_gaez,
    collect_modis,
    collect_ecostress,
    collect_openet,
    collect_icesat2,
    collect_crop_casma,
    FarmDataCollection,
    DataSourceResult,
    DataSourceStatus,
)


@pytest.fixture
def sample_farm_data():
    """Sample farm data for testing."""
    return {
        "collection_id": "test-collection-123",
        "farm_id": "test-farm-123",
        "farm_name": "Test Farm",
        "geometry": {
            "type": "Polygon",
            "coordinates": [[
                [-120.0, 38.0],
                [-119.9, 38.0],
                [-119.9, 38.1],
                [-120.0, 38.1],
                [-120.0, 38.0],
            ]]
        },
        "centroid": {"latitude": 38.05, "longitude": -119.95},
        "start_date": date(2024, 1, 1),
        "end_date": date(2024, 12, 31),
        "crops_of_interest": ["maize", "wheat", "soybean"],
    }


@pytest.fixture
def mock_power_response():
    """Mock NASA POWER API response."""
    return {
        "properties": {
            "parameter": {
                "T2M": {"20240101": 15.5, "20240102": 16.0},
                "PRECTOTCORR": {"20240101": 2.5, "20240102": 0.0},
                "RH2M": {"20240101": 65, "20240102": 70},
                "ALLSKY_SFC_SW_DWN": {"20240101": 12.5, "20240102": 15.0},
                "WS2M": {"20240101": 3.2, "20240102": 2.8},
            }
        }
    }


class TestDataCollection:
    """Tests for the main data collection orchestrator."""

    @pytest.mark.asyncio
    async def test_collect_farm_data_structure(self, sample_farm_data):
        """Test that collect_farm_data returns correct structure."""
        with patch('app.services.data_collection.collect_nasa_power') as mock_power, \
             patch('app.services.data_collection.collect_sentinel2') as mock_s2, \
             patch('app.services.data_collection.collect_gpm') as mock_gpm, \
             patch('app.services.data_collection.collect_smap') as mock_smap, \
             patch('app.services.data_collection.collect_landsat') as mock_landsat, \
             patch('app.services.data_collection.collect_gaez') as mock_gaez, \
             patch('app.services.data_collection.collect_modis') as mock_modis, \
             patch('app.services.data_collection.collect_ecostress') as mock_ecostress, \
             patch('app.services.data_collection.collect_openet') as mock_openet, \
             patch('app.services.data_collection.collect_icesat2') as mock_icesat2, \
             patch('app.services.data_collection.collect_crop_casma') as mock_crop_casma:

            # Mock all collectors to return successful results
            mock_power.return_value = DataSourceResult(
                source="NASA POWER",
                status=DataSourceStatus.SUCCESS,
                data={"test": "data"},
            )
            mock_s2.return_value = DataSourceResult(
                source="Sentinel-2",
                status=DataSourceStatus.SUCCESS,
                data={"test": "data"},
            )
            mock_gpm.return_value = DataSourceResult(
                source="GPM IMERG",
                status=DataSourceStatus.UNAVAILABLE,
                error="Not implemented",
            )
            mock_smap.return_value = DataSourceResult(
                source="SMAP",
                status=DataSourceStatus.UNAVAILABLE,
                error="Not implemented",
            )
            mock_landsat.return_value = DataSourceResult(
                source="Landsat",
                status=DataSourceStatus.SUCCESS,
                data={"test": "data"},
            )
            mock_gaez.return_value = DataSourceResult(
                source="FAO GAEZ",
                status=DataSourceStatus.UNAVAILABLE,
                error="Not implemented",
            )
            mock_modis.return_value = DataSourceResult(
                source="MODIS",
                status=DataSourceStatus.SUCCESS,
                data={"test": "data"},
            )
            mock_ecostress.return_value = DataSourceResult(
                source="ECOSTRESS",
                status=DataSourceStatus.SUCCESS,
                data={"test": "data"},
            )
            mock_openet.return_value = DataSourceResult(
                source="OpenET",
                status=DataSourceStatus.SUCCESS,
                data={"test": "data"},
            )
            mock_icesat2.return_value = DataSourceResult(
                source="ICESat-2 ATL24",
                status=DataSourceStatus.SUCCESS,
                data={"test": "data"},
            )
            mock_crop_casma.return_value = DataSourceResult(
                source="Crop-CASMA / NASA-USDA",
                status=DataSourceStatus.SUCCESS,
                data={"test": "data"},
            )

            result = await collect_farm_data(**sample_farm_data)

            assert isinstance(result, FarmDataCollection)
            assert result.farm_id == sample_farm_data["farm_id"]
            assert result.farm_name == sample_farm_data["farm_name"]
            assert len(result.sources) == 11
            assert "nasa_power" in result.sources
            assert "sentinel2" in result.sources
            assert "gpm" in result.sources
            assert "smap" in result.sources
            assert "landsat" in result.sources
            assert "gaez" in result.sources
            assert "modis" in result.sources
            assert "ecostress" in result.sources
            assert "openet" in result.sources
            assert "icesat2" in result.sources
            assert "crop_casma" in result.sources

    @pytest.mark.asyncio
    async def test_collect_farm_data_handles_exceptions(self, sample_farm_data):
        """Test that exceptions in collectors are handled gracefully."""
        with patch('app.services.data_collection.collect_nasa_power') as mock_power:
            mock_power.side_effect = Exception("Network error")

            result = await collect_farm_data(**sample_farm_data)

            assert "nasa_power" in result.sources
            assert result.sources["nasa_power"].status == DataSourceStatus.FAILED
            assert "Network error" in result.sources["nasa_power"].error

    @pytest.mark.asyncio
    async def test_collect_farm_data_partial_success(self, sample_farm_data):
        """Test that partial failures don't block other sources."""
        with patch('app.services.data_collection.collect_nasa_power') as mock_power, \
             patch('app.services.data_collection.collect_sentinel2') as mock_s2, \
             patch('app.services.data_collection.collect_gpm') as mock_gpm, \
             patch('app.services.data_collection.collect_smap') as mock_smap, \
             patch('app.services.data_collection.collect_landsat') as mock_landsat, \
             patch('app.services.data_collection.collect_gaez') as mock_gaez, \
             patch('app.services.data_collection.collect_modis') as mock_modis, \
             patch('app.services.data_collection.collect_ecostress') as mock_ecostress, \
             patch('app.services.data_collection.collect_openet') as mock_openet, \
             patch('app.services.data_collection.collect_icesat2') as mock_icesat2, \
             patch('app.services.data_collection.collect_crop_casma') as mock_crop_casma:

            mock_power.return_value = DataSourceResult(
                source="NASA POWER", status=DataSourceStatus.SUCCESS, data={}
            )
            mock_s2.side_effect = Exception("Sentinel error")
            mock_gpm.return_value = DataSourceResult(
                source="GPM IMERG", status=DataSourceStatus.UNAVAILABLE, error="N/A"
            )
            mock_smap.return_value = DataSourceResult(
                source="SMAP", status=DataSourceStatus.SUCCESS, data={}
            )
            mock_landsat.return_value = DataSourceResult(
                source="Landsat", status=DataSourceStatus.FAILED, error="Auth error"
            )
            mock_gaez.return_value = DataSourceResult(
                source="FAO GAEZ", status=DataSourceStatus.SUCCESS, data={}
            )
            mock_modis.return_value = DataSourceResult(
                source="MODIS", status=DataSourceStatus.SUCCESS, data={}
            )
            mock_ecostress.return_value = DataSourceResult(
                source="ECOSTRESS", status=DataSourceStatus.SUCCESS, data={}
            )
            mock_openet.return_value = DataSourceResult(
                source="OpenET", status=DataSourceStatus.SUCCESS, data={}
            )
            mock_icesat2.return_value = DataSourceResult(
                source="ICESat-2 ATL24", status=DataSourceStatus.SUCCESS, data={}
            )
            mock_crop_casma.return_value = DataSourceResult(
                source="Crop-CASMA / NASA-USDA", status=DataSourceStatus.SUCCESS, data={}
            )

            result = await collect_farm_data(**sample_farm_data)

            # Should have 8 successful (power, smap, gaez, modis, ecostress, openet, icesat2, crop_casma),
            # 2 failed (sentinel2, landsat), 1 unavailable (gpm)
            # Note: gaez is mocked as SUCCESS in this test, so it counts as available
            assert len(result.get_available_sources()) == 8
            assert len(result.get_failed_sources()) == 2  # sentinel2, landsat
            assert len(result.get_unavailable_sources()) == 1  # gpm


class TestIndividualCollectors:
    """Tests for individual data source collectors."""

    @pytest.mark.asyncio
    async def test_collect_nasa_power_success(self, mock_power_response):
        """Test successful NASA POWER collection."""
        with patch('app.services.data_collection.get_nasa_power_data', new_callable=AsyncMock) as mock_get, \
             patch('app.services.data_collection.parse_power_response') as mock_parse, \
             patch('app.services.data_collection.get_climate_summary', new_callable=AsyncMock) as mock_summary:

            mock_get.return_value = mock_power_response
            mock_parse.return_value = {
                "parameters": {
                    "T2M": {"values": [15.5, 16.0], "unit": "°C"},
                    "PRECTOTCORR": {"values": [2.5, 0.0], "unit": "mm"},
                }
            }
            mock_summary.return_value = {
                "temperature": {"mean_c": 15.75},
                "precipitation": {"total_mm": 2.5},
            }

            result = await collect_nasa_power(38.05, -119.95, date(2024, 1, 1), date(2024, 1, 2))

            assert result.status == DataSourceStatus.SUCCESS
            assert result.source == "NASA POWER"
            assert result.data is not None
            assert "raw" in result.data
            assert "summary" in result.data

    @pytest.mark.asyncio
    async def test_collect_nasa_power_failure(self):
        """Test NASA POWER collection failure handling."""
        from app.connectors.nasa_power import NASAError

        with patch('app.services.data_collection.get_nasa_power_data', new_callable=AsyncMock) as mock_get:
            mock_get.side_effect = NASAError("API rate limit exceeded")

            result = await collect_nasa_power(38.05, -119.95, date(2024, 1, 1), date(2024, 1, 2))

            assert result.status == DataSourceStatus.FAILED
            assert result.source == "NASA POWER"
            assert "rate limit" in result.error.lower()

    @pytest.mark.asyncio
    async def test_collect_sentinel2_no_images(self):
        """Test Sentinel-2 collection when no images found."""
        with patch('app.services.data_collection.search_sentinel2', new_callable=AsyncMock) as mock_search:
            mock_search.return_value = []

            result = await collect_sentinel2(
                {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
                date(2024, 1, 1),
                date(2024, 1, 31)
            )

            assert result.status == DataSourceStatus.UNAVAILABLE
            assert "No images found" in result.error

    @pytest.mark.asyncio
    async def test_collect_gpm_service(self):
        """Test GPM collection using real service (mocked)."""
        from app.services.gpm import get_gpm_precipitation
        from app.services.nasa_earthdata import NASADataResult, BoundingBox, TimeRange
        import xarray as xr
        import numpy as np

        # Create mock result
        mock_ds = xr.Dataset(
            {"precipitation_daily": (["time", "lat", "lon"], np.random.rand(10, 5, 5))},
            coords={
                "time": [datetime(2024, 1, 1) + timedelta(days=i) for i in range(10)],
                "lat": np.linspace(38, 38.1, 5),
                "lon": np.linspace(-120, -119.9, 5),
            }
        )
        mock_result = NASADataResult(
            dataset="GPM_3IMERGHH",
            variable="precipitation",
            bbox=BoundingBox(min_lon=-120, min_lat=38, max_lon=-119.9, max_lat=38.1),
            time_range=TimeRange(start=datetime(2024, 1, 1), end=datetime(2024, 1, 10)),
            data=mock_ds,
            metadata={},
        )

        with patch('app.services.data_collection.get_gpm_precipitation', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_result

            result = await collect_gpm(38.05, -119.95, date(2024, 1, 1), date(2024, 1, 10))

            assert result.status == DataSourceStatus.SUCCESS
            assert result.source == "GPM IMERG"
            assert result.data is not None

    @pytest.mark.asyncio
    async def test_collect_smap_service(self):
        """Test SMAP collection using real service (mocked)."""
        from app.services.smap import get_smap_soil_moisture, get_smap_time_series
        from app.services.nasa_earthdata import NASADataResult, BoundingBox, TimeRange
        import xarray as xr
        import numpy as np

        # Create mock surface result
        mock_surface_ds = xr.Dataset(
            {"soil_moisture_am": (["time", "lat", "lon"], np.random.rand(10, 5, 5) * 0.5)},
            coords={
                "time": [datetime(2024, 1, 1) + timedelta(days=i) for i in range(10)],
                "lat": np.linspace(38, 38.1, 5),
                "lon": np.linspace(-120, -119.9, 5),
            }
        )
        mock_surface_result = NASADataResult(
            dataset="SPL3SMP",
            variable="soil_moisture_am",
            bbox=BoundingBox(min_lon=-120, min_lat=38, max_lon=-119.9, max_lat=38.1),
            time_range=TimeRange(start=datetime(2024, 1, 1), end=datetime(2024, 1, 10)),
            data=mock_surface_ds,
            metadata={},
        )

        # Create mock time series
        mock_ts = xr.DataArray(
            np.random.rand(10) * 0.5,
            coords={"time": [datetime(2024, 1, 1) + timedelta(days=i) for i in range(10)]},
            dims=["time"],
        )

        with patch('app.services.data_collection.get_smap_soil_moisture', new_callable=AsyncMock) as mock_surface, \
             patch('app.services.data_collection.get_smap_time_series', new_callable=AsyncMock) as mock_ts_func:

            mock_surface.return_value = mock_surface_result
            mock_ts_func.return_value = mock_ts

            result = await collect_smap(38.05, -119.95, date(2024, 1, 1), date(2024, 1, 10))

            assert result.status == DataSourceStatus.SUCCESS
            assert result.source == "SMAP"
            assert result.data is not None
            assert "surface" in result.data
            assert "rootzone" in result.data

    @pytest.mark.asyncio
    async def test_collect_landsat_service(self):
        """Test Landsat collection using real service (mocked)."""
        from app.services.landsat import get_landsat_ndvi
        from app.services.nasa_earthdata import NASADataResult, BoundingBox, TimeRange
        import xarray as xr
        import numpy as np

        # Create mock result
        mock_ds = xr.Dataset(
            {"ndvi": (["time", "lat", "lon"], np.random.rand(5, 5, 5))},
            coords={
                "time": [datetime(2024, 1, 1) + timedelta(days=i*16) for i in range(5)],
                "lat": np.linspace(38, 38.1, 5),
                "lon": np.linspace(-120, -119.9, 5),
            }
        )
        mock_result = NASADataResult(
            dataset="LC09_L2SP",
            variable="vegetation_indices",
            bbox=BoundingBox(min_lon=-120, min_lat=38, max_lon=-119.9, max_lat=38.1),
            time_range=TimeRange(start=datetime(2024, 1, 1), end=datetime(2024, 1, 31)),
            data=mock_ds,
            metadata={},
        )

        with patch('app.services.data_collection.get_landsat_ndvi', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = mock_result

            result = await collect_landsat(
                {"type": "Polygon", "coordinates": [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]]},
                date(2024, 1, 1),
                date(2024, 1, 31)
            )

            assert result.status == DataSourceStatus.SUCCESS
            assert result.source == "Landsat"
            assert result.data is not None
            assert "ndvi" in result.data

    @pytest.mark.asyncio
    async def test_collect_gaez_placeholder(self):
        """Test GAEZ returns placeholder when not implemented."""
        with patch('app.services.data_collection.get_multiple_crop_suitability', new_callable=AsyncMock) as mock_suit, \
             patch('app.services.data_collection.get_agroclimatic_data', new_callable=AsyncMock) as mock_agro:

            mock_suit.return_value = {
                "results": {
                    "maize": {"suitability": {"index": None}},
                    "wheat": {"suitability": {"index": None}},
                }
            }
            mock_agro.return_value = {}

            result = await collect_gaez(38.05, -119.95, ["maize", "wheat"])

            assert result.status == DataSourceStatus.UNAVAILABLE
            assert "not yet implemented" in result.error.lower()


class TestDataModels:
    """Tests for data models."""

    def test_farm_data_collection_to_dict(self):
        """Test FarmDataCollection to_dict conversion."""
        collection = FarmDataCollection(
            collection_id="test-collection-123",
            farm_id="test-123",
            farm_name="Test Farm",
            geometry={"type": "Point", "coordinates": [0, 0]},
            period_start=date(2024, 1, 1),
            period_end=date(2024, 12, 31),
        )
        collection.sources["test"] = DataSourceResult(
            source="Test Source",
            status=DataSourceStatus.SUCCESS,
            data={"key": "value"},
            metadata={"meta": "data"},
        )

        result = collection.to_dict()

        assert result["farm_id"] == "test-123"
        assert result["farm_name"] == "Test Farm"
        assert "sources" in result
        assert "summary" in result
        assert result["summary"]["total_sources"] == 1
        assert result["summary"]["successful"] == 1

    def test_data_source_statuses(self):
        """Test DataSourceStatus enum values."""
        assert DataSourceStatus.SUCCESS.value == "success"
        assert DataSourceStatus.PARTIAL.value == "partial"
        assert DataSourceStatus.FAILED.value == "failed"
        assert DataSourceStatus.UNAVAILABLE.value == "unavailable"
        assert DataSourceStatus.AUTH_ERROR.value == "auth_error"