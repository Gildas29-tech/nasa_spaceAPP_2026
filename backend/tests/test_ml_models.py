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
)


class TestSoilHealthModel:
    """Tests for Soil Health Model."""

    def test_compute_soil_health_physics_fallback(self):
        """Test soil health computation with physics-based fallback."""
        model = get_regional_model("temperate")

        # Create mock data arrays
        smap_data = MagicMock()
        smap_data.mean.return_value = 0.25
        smap_data.std.return_value = 0.05

        modis_ndvi = MagicMock()
        modis_ndvi.mean.return_value = 0.65
        modis_ndvi.std.return_value = 0.1

        modis_lst = MagicMock()
        modis_lst.mean.return_value = 298.0
        modis_lst.std.return_value = 2.0

        landsat_indices = {
            "ndvi": MagicMock(mean=MagicMock(return_value=0.68), std=MagicMock(return_value=0.08)),
            "savi": MagicMock(mean=MagicMock(return_value=0.55), std=MagicMock(return_value=0.07)),
            "evi": MagicMock(mean=MagicMock(return_value=0.52), std=MagicMock(return_value=0.06)),
        }

        gpm_precip = MagicMock()
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
        assert 0 <= result.index <= 100
        assert result.category in ["Excellent", "Good", "Fair", "Poor", "Critical"]
        assert isinstance(result.components, dict)
        assert "moisture" in result.components
        assert "vegetation" in result.components
        assert "temperature" in result.components
        assert "soil_properties" in result.components
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
        assert 0 <= result.index <= 100
        # Should still produce a result based on soil properties only

    def test_regional_models_different(self):
        """Test that different climate zones produce different models."""
        temperate = get_regional_model("temperate")
        tropical = get_regional_model("tropical")
        arid = get_regional_model("arid")

        # They should be different instances
        assert temperate is not tropical
        assert tropical is not arid

        # But same zone should return same instance (singleton per zone)
        assert get_regional_model("temperate") is temperate


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
            assert len(rotation.sequence) >= 3
            assert len(rotation.sequence) <= 5
            assert rotation.total_score >= 0
            assert rotation.total_score <= 100

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
            # Should not contain excluded crop
            assert "soybean" not in rotation.sequence
            # Should contain required crop
            assert "wheat" in rotation.sequence

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
        assert "yearly_breakdown" in details
        assert "summary" in details
        assert details["sequence"] == rotation.sequence


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
        assert prediction.unit == "t/ha"
        assert prediction.confidence_interval is not None
        assert len(prediction.confidence_interval) == 2
        assert prediction.confidence_interval[0] < prediction.confidence_interval[1]
        assert isinstance(prediction.feature_importance, dict)
        assert isinstance(prediction.risk_factors, list)

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
        assert alert.stress_level in ["none", "low", "moderate", "high", "severe"]
        assert 0 <= alert.confidence <= 1
        assert isinstance(alert.indicators, dict)
        assert isinstance(alert.recommendations, list)
        assert alert.forecast_7d is not None


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
        major_crops = ["corn", "wheat", "soybean", "rice", "cotton"]
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
            assert len(template["sequence"]) >= 3

    def test_get_template(self):
        """Test getting specific template."""
        template = get_template("corn_soybean_wheat")
        assert template is not None
        assert template["name"] == "Corn-Soybean-Wheat"
        assert "corn" in template["sequence"]
        assert "soybean" in template["sequence"]
        assert "wheat" in template["sequence"]

    def test_get_nonexistent_template(self):
        """Test getting non-existent template returns None."""
        template = get_template("nonexistent")
        assert template is None