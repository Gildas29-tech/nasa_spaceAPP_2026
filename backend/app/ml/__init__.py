"""ML Models package for Field Shift."""

from app.ml.soil_health import (
    SoilHealthModel,
    SoilHealthResult,
    SoilHealthFactors,
    get_regional_model,
    REGIONAL_WEIGHTS,
)

from app.ml.rotation_optimizer import (
    RotationOptimizer,
    Crop,
    RotationSequence,
    FarmerPriorities,
    CROP_DATABASE,
    ROTATION_TEMPLATES,
    get_template,
)

from app.ml.yield_predictor import (
    YieldPredictor,
    YieldPrediction,
    YieldFeatures,
    REGIONAL_BENCHMARKS,
)

from app.ml.water_stress import (
    WaterStressDetector,
    WaterStressAlert,
    StressIndicators,
    IrrigationScheduler,
)

__all__ = [
    # Soil Health
    "SoilHealthModel",
    "SoilHealthResult",
    "SoilHealthFactors",
    "get_regional_model",
    "REGIONAL_WEIGHTS",

    # Rotation Optimizer
    "RotationOptimizer",
    "Crop",
    "RotationSequence",
    "FarmerPriorities",
    "CROP_DATABASE",
    "ROTATION_TEMPLATES",
    "get_template",

    # Yield Predictor
    "YieldPredictor",
    "YieldPrediction",
    "YieldFeatures",
    "REGIONAL_BENCHMARKS",

    # Water Stress
    "WaterStressDetector",
    "WaterStressAlert",
    "StressIndicators",
    "IrrigationScheduler",
]