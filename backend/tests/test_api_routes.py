"""Tests for API Routes."""

import pytest
from datetime import date, datetime
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from app.main import create_app


@pytest.fixture
def app():
    """Create test app."""
    return create_app()


@pytest.fixture
def client(app):
    """Create test client."""
    return TestClient(app)


@pytest.fixture
def sample_farm():
    """Sample farm data for testing."""
    return {
        "name": "Test Farm",
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
        "description": "A test farm",
        "crops_of_interest": ["maize", "wheat"],
    }


class TestHealthEndpoint:
    """Tests for health check endpoint."""

    def test_health_check(self, client):
        """Test health check returns healthy status."""
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "timestamp" in data
        assert data["version"] == "0.1.0"


class TestFarmEndpoints:
    """Tests for farm CRUD endpoints."""

    def test_create_farm(self, client, sample_farm):
        """Test creating a new farm."""
        response = client.post("/api/v1/data/farms", json=sample_farm)
        assert response.status_code == 201
        data = response.json()
        assert data["name"] == sample_farm["name"]
        assert data["geometry"] == sample_farm["geometry"]
        assert data["centroid"] == sample_farm["centroid"]
        assert "id" in data
        assert "created_at" in data
        assert "updated_at" in data

    def test_list_farms(self, client, sample_farm):
        """Test listing farms."""
        # Create a farm first
        client.post("/api/v1/data/farms", json=sample_farm)

        response = client.get("/api/v1/data/farms")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        assert data[0]["name"] == sample_farm["name"]

    def test_get_farm(self, client, sample_farm):
        """Test getting a specific farm."""
        create_response = client.post("/api/v1/data/farms", json=sample_farm)
        farm_id = create_response.json()["id"]

        response = client.get(f"/api/v1/data/farms/{farm_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["id"] == farm_id
        assert data["name"] == sample_farm["name"]

    def test_get_farm_not_found(self, client):
        """Test getting non-existent farm returns 404."""
        response = client.get("/api/v1/data/farms/non-existent-id")
        assert response.status_code == 404

    def test_delete_farm(self, client, sample_farm):
        """Test deleting a farm."""
        create_response = client.post("/api/v1/data/farms", json=sample_farm)
        farm_id = create_response.json()["id"]

        response = client.delete(f"/api/v1/data/farms/{farm_id}")
        assert response.status_code == 204

        # Verify deleted
        get_response = client.get(f"/api/v1/data/farms/{farm_id}")
        assert get_response.status_code == 404


class TestDataCollectionEndpoints:
    """Tests for data collection endpoints."""

    @pytest.fixture
    def created_farm(self, client, sample_farm):
        """Create a farm and return its ID."""
        response = client.post("/api/v1/data/farms", json=sample_farm)
        return response.json()

    def test_trigger_data_collection(self, client, created_farm):
        """Test triggering data collection."""
        request_data = {
            "farm_id": created_farm["id"],
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
        }

        response = client.post("/api/v1/data/collect", json=request_data)
        assert response.status_code == 200
        data = response.json()
        assert "collection_id" in data
        assert data["farm_id"] == created_farm["id"]
        assert data["status"] == "started"

    def test_trigger_data_collection_invalid_farm(self, client):
        """Test triggering collection for non-existent farm."""
        request_data = {
            "farm_id": "non-existent-id",
            "start_date": "2024-01-01",
            "end_date": "2024-12-31",
        }

        response = client.post("/api/v1/data/collect", json=request_data)
        assert response.status_code == 404

    def test_trigger_data_collection_invalid_dates(self, client, created_farm):
        """Test triggering collection with invalid dates."""
        # End date before start date
        request_data = {
            "farm_id": created_farm["id"],
            "start_date": "2024-12-31",
            "end_date": "2024-01-01",
        }

        response = client.post("/api/v1/data/collect", json=request_data)
        assert response.status_code == 400

    def test_trigger_data_collection_future_date(self, client, created_farm):
        """Test triggering collection with future end date."""
        from datetime import date, timedelta
        future_date = (date.today() + timedelta(days=1)).isoformat()

        request_data = {
            "farm_id": created_farm["id"],
            "start_date": "2024-01-01",
            "end_date": future_date,
        }

        response = client.post("/api/v1/data/collect", json=request_data)
        assert response.status_code == 400

    def test_get_collection_status(self, client, created_farm):
        """Test getting collection status."""
        # First trigger collection
        collect_response = client.post("/api/v1/data/collect", json={
            "farm_id": created_farm["id"],
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        })
        collection_id = collect_response.json()["collection_id"]

        # Get status (may still be processing)
        response = client.get(f"/api/v1/data/collect/{collection_id}/status")
        assert response.status_code == 200
        data = response.json()
        assert data["collection_id"] == collection_id
        assert "overall_status" in data
        assert "sources" in data
        assert "summary" in data

    def test_get_collection_status_not_found(self, client):
        """Test getting status for non-existent collection."""
        response = client.get("/api/v1/data/collect/non-existent-id/status")
        assert response.status_code == 404

    def test_get_collection_result(self, client, created_farm):
        """Test getting full collection result."""
        collect_response = client.post("/api/v1/data/collect", json={
            "farm_id": created_farm["id"],
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        })
        collection_id = collect_response.json()["collection_id"]

        response = client.get(f"/api/v1/data/collect/{collection_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["collection_id"] == collection_id
        assert "sources" in data

    def test_get_collection_summary(self, client, created_farm):
        """Test getting collection summary for dashboard."""
        collect_response = client.post("/api/v1/data/collect", json={
            "farm_id": created_farm["id"],
            "start_date": "2024-01-01",
            "end_date": "2024-01-31",
        })
        collection_id = collect_response.json()["collection_id"]

        response = client.get(f"/api/v1/data/collect/{collection_id}/summary")
        assert response.status_code == 200
        data = response.json()
        assert data["collection_id"] == collection_id
        assert "data_availability" in data
        assert "key_metrics" in data

    def test_list_data_sources(self, client):
        """Test listing available data sources."""
        response = client.get("/api/v1/data/sources")
        assert response.status_code == 200
        data = response.json()
        assert "sources" in data
        sources = data["sources"]
        assert isinstance(sources, list)
        assert len(sources) >= 6  # At least the 6 main sources

        # Check each source has required fields
        for source in sources:
            assert "id" in source
            assert "name" in source
            assert "description" in source
            assert "status" in source


class TestCropEndpoints:
    """Tests for crop-related endpoints."""

    def test_list_crops(self, client):
        """Test listing available crops."""
        response = client.get("/api/v1/crops")
        assert response.status_code == 200
        data = response.json()
        assert "crops" in data
        crops = data["crops"]
        assert isinstance(crops, list)
        assert len(crops) > 0

        # Check crop structure
        for crop in crops:
            assert "name" in crop
            assert "family" in crop
            assert "season" in crop

    def test_list_rotation_templates(self, client):
        """Test listing rotation templates."""
        response = client.get("/api/v1/rotation-templates")
        assert response.status_code == 200
        data = response.json()
        assert "templates" in data
        templates = data["templates"]
        assert isinstance(templates, dict)
        assert len(templates) > 0


class TestMLAnalysisEndpoints:
    """Tests for ML analysis endpoints (basic structure tests)."""

    def test_soil_health_endpoint_exists(self, client):
        """Test soil health endpoint exists and validates input."""
        request_data = {
            "bbox": {"min_lon": -120, "min_lat": 38, "max_lon": -119, "max_lat": 39},
            "time_range": {"start_date": "2024-01-01", "end_date": "2024-12-31"},
        }

        # This will fail due to missing NASA credentials, but should not 404
        response = client.post("/api/v1/analysis/soil-health", json=request_data)
        # Should not be 404 (endpoint exists)
        assert response.status_code != 404

    def test_rotation_endpoint_exists(self, client):
        """Test rotation optimization endpoint exists."""
        request_data = {
            "current_crops": ["corn"],
            "priorities": {
                "profit": 0.4,
                "soil_health": 0.3,
                "water_conservation": 0.2,
                "risk_reduction": 0.1,
            },
        }

        response = client.post("/api/v1/analysis/rotation", json=request_data)
        assert response.status_code != 404

    def test_yield_endpoint_exists(self, client):
        """Test yield prediction endpoint exists."""
        request_data = {
            "bbox": {"min_lon": -120, "min_lat": 38, "max_lon": -119, "max_lat": 39},
            "time_range": {"start_date": "2024-01-01", "end_date": "2024-12-31"},
            "crop": "corn",
        }

        response = client.post("/api/v1/analysis/yield", json=request_data)
        assert response.status_code != 404

    def test_water_stress_endpoint_exists(self, client):
        """Test water stress analysis endpoint exists."""
        request_data = {
            "lat": 38.05,
            "lon": -119.95,
            "time_range": {"start_date": "2024-01-01", "end_date": "2024-12-31"},
            "crop_type": "corn",
        }

        response = client.post("/api/v1/analysis/water-stress", json=request_data)
        assert response.status_code != 404


class TestDataEndpoints:
    """Tests for NASA data endpoints."""

    @pytest.mark.parametrize("endpoint", [
        "/api/v1/data/smap",
        "/api/v1/data/modis",
        "/api/v1/data/landsat",
        "/api/v1/data/gpm",
        "/api/v1/data/ecostress",
        "/api/v1/data/atl24",
    ])
    def test_data_endpoints_exist(self, client, endpoint):
        """Test all NASA data endpoints exist."""
        request_data = {
            "bbox": {"min_lon": -120, "min_lat": 38, "max_lon": -119, "max_lat": 39},
            "time_range": {"start_date": "2024-01-01", "end_date": "2024-01-31"},
            "variables": ["ndvi"],
        }

        response = client.post(endpoint, json=request_data)
        # Should not be 404 (endpoints exist)
        assert response.status_code != 404