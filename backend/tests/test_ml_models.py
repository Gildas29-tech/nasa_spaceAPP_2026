"""Tests for ML Models."""

import pytest
import numpy as np
from datetime import date
from unittest.mock import patch, MagicMock

from app.ml import (
    SoilHealthModel,
    SoilHealthResult,
    RotationOptimizer,
    RotationSequence,
    FarmerPriorities,
    YieldPredictor,
    YieldPrediction,
    WaterStressDetector,
    WaterStressAlert,
    CROP_DATABASE,
    ROTATION_TEMPLATES,
    get_regional_model,
    get_template,
    Crop,
)


class TestSoilHealthModel:
    """Tests for Soil Health Model."""

    def test_compute_soil_health_physics_fallback(self):
        """Test soil health computation with physics-based fallback."""
        model = get_regional_model("temperate")

        # Create mock data arrays that mimic xarray behavior
        import numpy as np

        def create_mock_dataarray(values):
            """Create a MagicMock that mimics xr.DataArray with .values attribute."""
            mock = MagicMock()
            mock.values = np.array(values)
            return mock

        def create_mock_dataset(data_vars):
            """Create a MagicMock that mimics xr.Dataset with .data_vars and indexing."""
            mock = MagicMock()
            mock.data_vars = list(data_vars.keys())
            def getitem(self, key):
                return data_vars[key]
            mock.__getitem__ = getitem
            return mock

        smap_data = create_mock_dataarray([0.25, 0.26, 0.24, 0.27, 0.23])
        smap_data.mean.return_value = 0.25
        smap_data.std.return_value = 0.05

        modis_ndvi = create_mock_dataarray([0.65, 0.66, 0.64, 0.67, 0.63])
        modis_ndvi.mean.return_value = 0.65
        modis_ndvi.std.return_value = 0.1

        modis_lst = create_mock_dataarray([298.0, 299.0, 297.0, 300.0, 296.0])
        modis_lst.mean.return_value = 298.0
        modis_lst.std.return_value = 2.0

        landsat_ndvi = create_mock_dataarray([0.68, 0.69, 0.67, 0.70, 0.66])
        landsat_savi = create_mock_dataarray([0.55, 0.56, 0.54, 0.57, 0.53])
        landsat_evi = create_mock_dataarray([0.52, 0.53, 0.51, 0.54, 0.50])
        landsat_indices = create_mock_dataset({
            "ndvi": landsat_ndvi,
            "savi": landsat_savi,
            "evi": landsat_evi,
        })

        gpm_precip = create_mock_dataarray([3.5, 3.6, 3.4, 3.7, 3.3])
        gpm_precip.mean.return_value = 3.5
        gpm_precip.std.return_value = 1.2

        result = model.compute_soil_health(
            smap_data=smap_data,
            modis_ndvi=modis_ndvi,
            modis_lst=modis_lst,
            landsat_indices=landsat_indices,
            gpm_precip=gpm_precip,
            soil_texture="loam",
            soil_ph=6.5,
            organic_matter=2.5,
            location=(38.0, -120.0),
            assessment_date="2024-06-15",
        )

        assert isinstance(result, SoilHealthResult)
        assert 0 <= result.overall_score <= 100
        assert result.grade in ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"]
        assert hasattr(result.factors, 'moisture_score')
        assert hasattr(result.factors, 'vegetation_score')
        assert hasattr(result.factors, 'temperature_score')
        assert hasattr(result.factors, 'organic_matter_score')
        assert isinstance(result.recommendations, list)

    def test_compute_soil_health_minimal_data(self):
        """Test soil health with minimal data (all None)."""
        model = get_regional_model("temperate")

        result = model.compute_soil_health(
            smap_data=None,
            modis_ndvi=None,
            modis_lst=None,
            landsat_indices=None,
            gpm_precip=None,
            soil_texture="loam",
            soil_ph=6.5,
            organic_matter=2.5,
            location=(38.0, -120.0),
            assessment_date="2024-06-15",
        )

        assert isinstance(result, SoilHealthResult)
        assert 0 <= result.overall_score <= 100
        # Should still produce a result based on soil properties only

    def test_regional_models_different(self):
        """Test that different climate zones produce different models with different weights."""
        temperate = get_regional_model("temperate")
        tropical = get_regional_model("tropical")
        arid = get_regional_model("arid")

        # They should be different instances with different weights
        assert temperate.weights != tropical.weights
        assert tropical.weights != arid.weights
        assert temperate.weights != arid.weights

        # Each zone should have its own weight configuration
        assert temperate.weights["moisture"] == 0.20  # temperate default
        assert tropical.weights["moisture"] == 0.15   # tropical has less moisture weight
        assert arid.weights["moisture"] == 0.35       # arid has more moisture weight


class TestRotationOptimizer:
    """Tests for Rotation Optimizer."""

    def test_optimizer_creation(self):
        """Test creating rotation optimizer."""
        priorities = FarmerPriorities(
            profit=0.4,
            soil_health=0.3,
            water_conservation=0.2,
            risk_reduction=0.1,
        )

        optimizer = RotationOptimizer(
            priorities=priorities,
            climate_zone="temperate",
            soil_type="loam",
            min_rotation_years=3,
            max_rotation_years=5,
        )

        assert optimizer.priorities == priorities
        assert optimizer.climate_zone == "temperate"
        assert optimizer.soil_type == "loam"
        assert optimizer.min_rotation_years == 3
        assert optimizer.max_rotation_years == 5

    def test_optimize_basic(self):
        """Test basic rotation optimization."""
        priorities = FarmerPriorities()
        optimizer = RotationOptimizer(
            priorities=priorities,
            climate_zone="temperate",
            soil_type="loam",
        )

        rotations = optimizer.optimize(
            current_crops=["corn"],
            excluded_crops=[],
            required_crops=[],
            max_rotations=5,
        )

        assert isinstance(rotations, list)
        assert len(rotations) > 0
        assert len(rotations) <= 5

        for rotation in rotations:
            assert isinstance(rotation, RotationSequence)
            assert len(rotation.crops) >= 3
            assert len(rotation.crops) <= 5
            assert rotation.total_score >= 0
            assert rotation.total_score <= 100
            # Check that crops are Crop objects
            for crop in rotation.crops:
                assert isinstance(crop, Crop)

    def test_optimize_with_constraints(self):
        """Test optimization with required and excluded crops."""
        priorities = FarmerPriorities()
        optimizer = RotationOptimizer(
            priorities=priorities,
            climate_zone="temperate",
            soil_type="loam",
        )

        rotations = optimizer.optimize(
            current_crops=["corn"],
            excluded_crops=["soybean"],  # Exclude soybean
            required_crops=["wheat"],    # Require wheat
            max_rotations=5,
        )

        for rotation in rotations:
            crop_names = [c.name for c in rotation.crops]
            # Should not contain excluded crop (case-insensitive check)
            assert "Soybean" not in crop_names
            # Should contain required crop (names are capitalized in database)
            assert "Wheat" in crop_names

    def test_get_rotation_details(self):
        """Test getting detailed rotation information."""
        priorities = FarmerPriorities()
        optimizer = RotationOptimizer(
            priorities=priorities,
            climate_zone="temperate",
            soil_type="loam",
        )

        rotations = optimizer.optimize(max_rotations=1)
        rotation = rotations[0]

        details = optimizer.get_rotation_details(rotation)

        assert "sequence" in details
        assert "scores" in details
        assert "crops_detail" in details
        assert "summary" in details
        assert details["sequence"] == [c.name for c in rotation.crops]


class TestYieldPredictor:
    """Tests for Yield Predictor."""

    def test_predictor_creation(self):
        """Test creating yield predictor for different crops."""
        corn_predictor = YieldPredictor("corn")
        wheat_predictor = YieldPredictor("wheat")
        soybean_predictor = YieldPredictor("soybean")

        assert corn_predictor.crop == "corn"
        assert wheat_predictor.crop == "wheat"
        assert soybean_predictor.crop == "soybean"

    def test_predict_physics_fallback(self):
        """Test yield prediction with physics-based fallback."""
        predictor = YieldPredictor("corn")

        features = predictor.extract_features(
            soil_texture="loam",
            soil_ph=6.5,
            organic_matter=2.5,
            planting_date="2024-05-01",
            variety_maturity=100,
        )

        prediction = predictor.predict(features)

        assert isinstance(prediction, YieldPrediction)
        assert prediction.predicted_yield > 0
        assert prediction.yield_unit == "kg/ha"
        assert prediction.confidence_interval is not None
        assert len(prediction.confidence_interval) == 2
        assert prediction.confidence_interval[0] < prediction.confidence_interval[1]
        assert isinstance(prediction.feature_importance, dict)
        assert isinstance(prediction.risk_factors, list)
        assert prediction.crop == "corn"
        assert prediction.scenario == "physics_based"

    def test_predict_scenarios(self):
        """Test scenario-based predictions."""
        predictor = YieldPredictor("corn")

        features = predictor.extract_features(
            soil_texture="loam",
            soil_ph=6.5,
            organic_matter=2.5,
        )

        scenarios = {
            "drought": {"precipitation_factor": 0.5},
            "wet": {"precipitation_factor": 1.5},
            "fertilized": {"nitrogen_factor": 1.3},
        }

        results = predictor.predict_scenarios(features, scenarios)

        assert isinstance(results, dict)
        assert len(results) == 3
        for name, pred in results.items():
            assert isinstance(pred, YieldPrediction)
            assert name in ["drought", "wet", "fertilized"]


class TestWaterStressDetector:
    """Tests for Water Stress Detector."""

    def test_detector_creation(self):
        """Test creating water stress detector."""
        detector = WaterStressDetector(
            location=(38.0, -120.0),
            crop_type="corn",
            soil_type="loam",
        )

        assert detector.location == (38.0, -120.0)
        assert detector.crop_type == "corn"
        assert detector.soil_type == "loam"

    def test_analyze_stress_minimal_data(self):
        """Test stress analysis with minimal data."""
        detector = WaterStressDetector(
            location=(38.0, -120.0),
            crop_type="corn",
            soil_type="loam",
        )

        alert = detector.analyze_stress(
            smap_data=None,
            modis_ndvi=None,
            modis_lst=None,
            ecostress_et=None,
            ecostress_esi=None,
            ecostress_stress=None,
            gpm_precip=None,
            openet_et=None,
        )

        assert isinstance(alert, WaterStressAlert)
        assert alert.stress_indicators.stress_level in ["none", "mild", "moderate", "severe", "extreme"]
        assert 0 <= alert.confidence <= 1
        assert isinstance(alert.stress_indicators, object)  # StressIndicators dataclass
        assert isinstance(alert.recommended_actions, list)
        assert alert.lead_time_days >= 0
        assert alert.alert_level in ["green", "yellow", "orange", "red"]


class TestCropDatabase:
    """Tests for crop database."""

    def test_crop_database_not_empty(self):
        """Test crop database has crops."""
        assert len(CROP_DATABASE) > 0

    def test_crop_database_structure(self):
        """Test crop database structure."""
        for name, crop in CROP_DATABASE.items():
            assert hasattr(crop, "name")
            assert hasattr(crop, "family")
            assert hasattr(crop, "season")
            assert hasattr(crop, "root_depth")
            assert hasattr(crop, "water_need")
            assert hasattr(crop, "nitrogen_fixation")
            assert hasattr(crop, "market_value")

    def test_major_crops_exist(self):
        """Test major crops exist in database."""
        major_crops = ["corn", "wheat", "soybean", "rice", "sorghum", "barley"]
        for crop in major_crops:
            assert crop in CROP_DATABASE


class TestRotationTemplates:
    """Tests for rotation templates."""

    def test_templates_not_empty(self):
        """Test rotation templates exist."""
        assert len(ROTATION_TEMPLATES) > 0

    def test_template_structure(self):
        """Test template structure."""
        for name, template in ROTATION_TEMPLATES.items():
            assert "name" in template
            assert "sequence" in template
            assert "description" in template
            assert isinstance(template["sequence"], list)
            # Most templates have >= 3 crops, but 2-year rotations exist
            assert len(template["sequence"]) >= 2

    def test_get_template(self):
        """Test getting specific template."""
        template = get_template("corn_soy_wheat")
        assert template is not None
        assert template["name"] == "Corn-Soybean-Wheat"
        assert "corn" in template["sequence"]
        assert "soybean" in template["sequence"]
        assert "wheat" in template["sequence"]

    def test_get_nonexistent_template(self):
        """Test getting non-existent template returns None."""
        template = get_template("nonexistent")
        assert template is None