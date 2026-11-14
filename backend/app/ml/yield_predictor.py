"""Yield Predictor model for estimating crop yields from NASA Earth observations."""

import warnings
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
import xarray as xr
from pydantic import BaseModel, Field
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")


@dataclass
class YieldFeatures:
    """Features extracted from NASA data for yield prediction."""
    # Soil moisture features
    smap_mean_growing: float = 0.0
    smap_min_growing: float = 0.0
    smap_cv_growing: float = 0.0
    smap_rootzone_mean: float = 0.0

    # Vegetation features
    ndvi_peak: float = 0.0
    ndvi_mean_growing: float = 0.0
    ndvi_integral: float = 0.0
    evi_peak: float = 0.0
    savi_mean: float = 0.0

    # Temperature features
    lst_mean_growing: float = 0.0
    lst_max_growing: float = 0.0
    heat_stress_days: float = 0.0
    frost_days: float = 0.0

    # Precipitation features
    precip_total_growing: float = 0.0
    precip_events: float = 0.0
    precip_intensity: float = 0.0
    dry_spell_max: float = 0.0

    # Evapotranspiration features
    et_total_growing: float = 0.0
    et_reference_total: float = 0.0
    water_stress_index: float = 0.0

    # Static features
    soil_texture: float = 0.5      # Encoded
    soil_ph: float = 6.5
    organic_matter: float = 2.5
    planting_date_doy: float = 120
    variety_maturity: float = 100


class YieldPrediction(BaseModel):
    """Yield prediction result with uncertainty quantification."""
    crop: str
    predicted_yield: float          # kg/ha or bu/ac
    yield_unit: str = "kg/ha"
    confidence_interval: Tuple[float, float]  # 95% CI
    prediction_std: float
    feature_importance: Dict[str, float]
    risk_factors: List[str]
    model_confidence: float
    scenario: str = "current"


class YieldPredictor:
    """Crop yield prediction using NASA Earth observations and ML.

    Uses Random Forest / Gradient Boosting with features from:
    - SMAP: Soil moisture (surface + root zone)
    - MODIS: NDVI, EVI, LST
    - Landsat: High-res vegetation indices
    - GPM: Precipitation
    - ECOSTRESS: ET, water stress
    - OpenET: Field-scale ET
    """

    CROP_PARAMS = {
        "corn": {
            "base_yield": 10000,      # kg/ha
            "growing_days": 120,
            "optimal_temp": 25,
            "temp_range": (10, 35),
            "water_need": 500,        # mm
        },
        "soybean": {
            "base_yield": 3500,
            "growing_days": 110,
            "optimal_temp": 25,
            "temp_range": (10, 35),
            "water_need": 450,
        },
        "wheat": {
            "base_yield": 5000,
            "growing_days": 180,
            "optimal_temp": 20,
            "temp_range": (5, 30),
            "water_need": 400,
        },
        "rice": {
            "base_yield": 6000,
            "growing_days": 130,
            "optimal_temp": 28,
            "temp_range": (20, 35),
            "water_need": 1000,
        },
        "sorghum": {
            "base_yield": 4000,
            "growing_days": 100,
            "optimal_temp": 30,
            "temp_range": (15, 40),
            "water_need": 350,
        },
        "cotton": {
            "base_yield": 1000,       # lint kg/ha
            "growing_days": 160,
            "optimal_temp": 28,
            "temp_range": (15, 35),
            "water_need": 600,
        },
    }

    def __init__(self, crop: str, model_type: str = "rf"):
        self.crop = crop.lower()
        self.model_type = model_type
        self.params = self.CROP_PARAMS.get(self.crop, self.CROP_PARAMS["corn"])
        self.model = None
        self.scaler = StandardScaler()
        self.feature_names = []
        self._is_trained = False

    def extract_features(
        self,
        smap_data: Optional[xr.Dataset] = None,
        modis_ndvi: Optional[xr.DataArray] = None,
        modis_evi: Optional[xr.DataArray] = None,
        modis_lst: Optional[xr.DataArray] = None,
        landsat_indices: Optional[xr.Dataset] = None,
        gpm_precip: Optional[xr.DataArray] = None,
        ecostress_et: Optional[xr.DataArray] = None,
        ecostress_stress: Optional[xr.DataArray] = None,
        openet_et: Optional[xr.DataArray] = None,
        soil_texture: str = "loam",
        soil_ph: float = 6.5,
        organic_matter: float = 2.5,
        planting_date: str = "2024-05-01",
        variety_maturity: int = 100,
    ) -> YieldFeatures:
        """Extract yield-relevant features from NASA datasets."""
        features = YieldFeatures()

        # Static features
        texture_map = {"sand": 0.2, "loam": 0.5, "clay": 0.8, "silt": 0.4}
        features.soil_texture = texture_map.get(soil_texture, 0.5)
        features.soil_ph = soil_ph
        features.organic_matter = organic_matter

        # Planting date as day of year
        from datetime import datetime
        planting_dt = datetime.strptime(planting_date, "%Y-%m-%d")
        features.planting_date_doy = planting_dt.timetuple().tm_yday
        features.variety_maturity = variety_maturity

        # SMAP features
        if smap_data is not None:
            features = self._extract_smap_features(smap_data, features)

        # MODIS features
        if modis_ndvi is not None:
            features = self._extract_ndvi_features(modis_ndvi, features)
        if modis_evi is not None:
            features = self._extract_evi_features(modis_evi, features)
        if modis_lst is not None:
            features = self._extract_lst_features(modis_lst, features)

        # Landsat features
        if landsat_indices is not None:
            features = self._extract_landsat_features(landsat_indices, features)

        # GPM features
        if gpm_precip is not None:
            features = self._extract_precip_features(gpm_precip, features)

        # ECOSTRESS features
        if ecostress_et is not None:
            features = self._extract_et_features(ecostress_et, features)
        if ecostress_stress is not None:
            features = self._extract_stress_features(ecostress_stress, features)

        # OpenET features
        if openet_et is not None:
            features = self._extract_openet_features(openet_et, features)

        return features

    def _extract_smap_features(
        self, smap_data: xr.Dataset, features: YieldFeatures
    ) -> YieldFeatures:
        """Extract soil moisture features for growing season."""
        for var in ["soil_moisture", "soil_moisture_am", "rootzone_soil_moisture"]:
            if var in smap_data.data_vars:
                data = smap_data[var].values.flatten()
                data = data[~np.isnan(data)]
                if len(data) > 0:
                    if "rootzone" in var:
                        features.smap_rootzone_mean = np.mean(data)
                    else:
                        features.smap_mean_growing = np.mean(data)
                        features.smap_min_growing = np.min(data)
                        features.smap_cv_growing = np.std(data) / (np.mean(data) + 1e-6)
                break
        return features

    def _extract_ndvi_features(
        self, ndvi: xr.DataArray, features: YieldFeatures
    ) -> YieldFeatures:
        """Extract NDVI features."""
        vals = ndvi.values.flatten()
        vals = vals[~np.isnan(vals)]
        if len(vals) > 0:
            features.ndvi_peak = np.percentile(vals, 95)
            features.ndvi_mean_growing = np.mean(vals)
            # Integral (sum of NDVI over growing season)
            features.ndvi_integral = np.sum(vals[vals > 0.3])
        return features

    def _extract_evi_features(
        self, evi: xr.DataArray, features: YieldFeatures
    ) -> YieldFeatures:
        """Extract EVI features."""
        vals = evi.values.flatten()
        vals = vals[~np.isnan(vals)]
        if len(vals) > 0:
            features.evi_peak = np.percentile(vals, 95)
        return features

    def _extract_lst_features(
        self, lst: xr.DataArray, features: YieldFeatures
    ) -> YieldFeatures:
        """Extract LST features."""
        vals = lst.values.flatten()
        vals = vals[~np.isnan(vals)]
        if len(vals) == 0:
            return features

        # Convert from Kelvin if needed
        if np.mean(vals) > 200:
            vals = vals - 273.15

        features.lst_mean_growing = np.mean(vals)
        features.lst_max_growing = np.max(vals)

        # Heat stress days (>35°C)
        features.heat_stress_days = np.sum(vals > 35)
        # Frost days (<0°C)
        features.frost_days = np.sum(vals < 0)

        return features

    def _extract_landsat_features(
        self, landsat: xr.Dataset, features: YieldFeatures
    ) -> YieldFeatures:
        """Extract Landsat vegetation index features."""
        for idx in ["savi", "msavi", "ndvi"]:
            if idx in landsat.data_vars:
                vals = landsat[idx].values.flatten()
                vals = vals[~np.isnan(vals)]
                if len(vals) > 0:
                    if idx == "savi":
                        features.savi_mean = np.mean(vals)
        return features

    def _extract_precip_features(
        self, precip: xr.DataArray, features: YieldFeatures
    ) -> YieldFeatures:
        """Extract precipitation features."""
        vals = precip.values.flatten()
        vals = vals[~np.isnan(vals)]
        if len(vals) == 0:
            return features

        features.precip_total_growing = np.sum(vals)
        features.precip_events = np.sum(vals > 1.0)  # >1mm events
        features.precip_intensity = np.mean(vals[vals > 1.0]) if np.any(vals > 1.0) else 0

        # Maximum dry spell
        dry = vals < 1.0
        dry_spells = []
        current = 0
        for d in dry:
            if d:
                current += 1
            else:
                if current > 0:
                    dry_spells.append(current)
                current = 0
        if current > 0:
            dry_spells.append(current)
        features.dry_spell_max = max(dry_spells) if dry_spells else 0

        return features

    def _extract_et_features(
        self, et: xr.DataArray, features: YieldFeatures
    ) -> YieldFeatures:
        """Extract ET features."""
        vals = et.values.flatten()
        vals = vals[~np.isnan(vals)]
        if len(vals) > 0:
            features.et_total_growing = np.sum(vals)
        return features

    def _extract_stress_features(
        self, stress: xr.DataArray, features: YieldFeatures
    ) -> YieldFeatures:
        """Extract water stress features."""
        vals = stress.values.flatten()
        vals = vals[~np.isnan(vals)]
        if len(vals) > 0:
            features.water_stress_index = np.mean(vals)
        return features

    def _extract_openet_features(
        self, et: xr.DataArray, features: YieldFeatures
    ) -> YieldFeatures:
        """Extract OpenET features (field scale)."""
        vals = et.values.flatten()
        vals = vals[~np.isnan(vals)]
        if len(vals) > 0:
            features.et_reference_total = np.sum(vals)
        return features

    def features_to_array(self, features: YieldFeatures) -> np.ndarray:
        """Convert features to model input array."""
        if not self.feature_names:
            self.feature_names = [
                "smap_mean_growing", "smap_min_growing", "smap_cv_growing", "smap_rootzone_mean",
                "ndvi_peak", "ndvi_mean_growing", "ndvi_integral", "evi_peak", "savi_mean",
                "lst_mean_growing", "lst_max_growing", "heat_stress_days", "frost_days",
                "precip_total_growing", "precip_events", "precip_intensity", "dry_spell_max",
                "et_total_growing", "et_reference_total", "water_stress_index",
                "soil_texture", "soil_ph", "organic_matter",
                "planting_date_doy", "variety_maturity",
            ]

        return np.array([[getattr(features, name) for name in self.feature_names]])

    def train(
        self,
        X: np.ndarray,
        y: np.ndarray,
        test_size: float = 0.2,
    ) -> Dict[str, float]:
        """Train the yield prediction model."""
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=test_size, random_state=42
        )

        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)

        # Train model
        if self.model_type == "rf":
            self.model = RandomForestRegressor(
                n_estimators=200,
                max_depth=15,
                min_samples_split=5,
                min_samples_leaf=2,
                random_state=42,
                n_jobs=-1,
            )
        elif self.model_type == "gb":
            self.model = GradientBoostingRegressor(
                n_estimators=200,
                max_depth=5,
                learning_rate=0.1,
                subsample=0.8,
                random_state=42,
            )
        else:
            raise ValueError(f"Unknown model type: {self.model_type}")

        self.model.fit(X_train_scaled, y_train)

        # Evaluate
        train_score = self.model.score(X_train_scaled, y_train)
        test_score = self.model.score(X_test_scaled, y_test)

        self._is_trained = True

        return {
            "train_r2": train_score,
            "test_r2": test_score,
            "n_train": len(X_train),
            "n_test": len(X_test),
        }

    def predict(
        self,
        features: YieldFeatures,
        return_uncertainty: bool = True,
    ) -> YieldPrediction:
        """Predict yield for given features."""
        if not self._is_trained:
            # Use physics-based estimate if not trained
            return self._physics_based_prediction(features)

        X = self.features_to_array(features)
        X_scaled = self.scaler.transform(X)

        # Point prediction
        pred = self.model.predict(X_scaled)[0]

        # Uncertainty estimation
        if return_uncertainty and self.model_type == "rf":
            # Use tree variance for RF
            tree_preds = np.array([tree.predict(X_scaled)[0] for tree in self.model.estimators_])
            pred_std = np.std(tree_preds)
            ci_lower = pred - 1.96 * pred_std
            ci_upper = pred + 1.96 * pred_std
        else:
            # Rough estimate
            pred_std = pred * 0.15
            ci_lower = pred - 1.96 * pred_std
            ci_upper = pred + 1.96 * pred_std

        # Feature importance
        importance = {}
        if hasattr(self.model, "feature_importances_"):
            for name, imp in zip(self.feature_names, self.model.feature_importances_):
                if imp > 0.01:
                    importance[name] = round(float(imp), 4)

        # Identify risk factors
        risk_factors = self._identify_risk_factors(features)

        return YieldPrediction(
            crop=self.crop,
            predicted_yield=round(pred, 1),
            yield_unit="kg/ha",
            confidence_interval=(round(ci_lower, 1), round(ci_upper, 1)),
            prediction_std=round(pred_std, 1),
            feature_importance=importance,
            risk_factors=risk_factors,
            model_confidence=min(1.0, test_score if hasattr(self, 'test_score') else 0.7),
            scenario="current",
        )

    def _physics_based_prediction(self, features: YieldFeatures) -> YieldPrediction:
        """Fallback physics-based yield estimate."""
        base = self.params["base_yield"]

        # Water stress factor
        water_factor = 1.0
        if features.smap_mean_growing > 0:
            optimal = 0.25
            if features.smap_mean_growing < optimal * 0.5:
                water_factor = 0.4 + 0.6 * (features.smap_mean_growing / (optimal * 0.5))
            elif features.smap_mean_growing > optimal * 1.5:
                water_factor = 0.8

        # Vegetation factor
        veg_factor = 1.0
        if features.ndvi_peak > 0:
            veg_factor = min(1.5, features.ndvi_peak / 0.7)

        # Temperature factor
        temp_factor = 1.0
        if features.lst_mean_growing > 0:
            opt = self.params["optimal_temp"]
            dev = abs(features.lst_mean_growing - opt)
            if dev > 5:
                temp_factor = max(0.5, 1 - dev * 0.03)

        # Heat stress penalty
        heat_penalty = max(0, 1 - features.heat_stress_days * 0.02)

        # Frost penalty
        frost_penalty = max(0, 1 - features.frost_days * 0.05)

        # Water stress penalty
        stress_penalty = max(0.3, 1 - features.water_stress_index)

        predicted = base * water_factor * veg_factor * temp_factor * heat_penalty * frost_penalty * stress_penalty

        return YieldPrediction(
            crop=self.crop,
            predicted_yield=round(predicted, 1),
            yield_unit="kg/ha",
            confidence_interval=(round(predicted * 0.7), round(predicted * 1.3)),
            prediction_std=round(predicted * 0.15, 1),
            feature_importance={},
            risk_factors=self._identify_risk_factors(features),
            model_confidence=0.6,
            scenario="physics_based",
        )

    def _identify_risk_factors(self, features: YieldFeatures) -> List[str]:
        """Identify yield-limiting factors."""
        risks = []

        if features.smap_mean_growing > 0 and features.smap_mean_growing < 0.15:
            risks.append("Severe soil moisture deficit")
        elif features.smap_mean_growing > 0 and features.smap_mean_growing < 0.20:
            risks.append("Moderate soil moisture deficit")

        if features.ndvi_peak > 0 and features.ndvi_peak < 0.5:
            risks.append("Low peak vegetation vigor")

        if features.heat_stress_days > 10:
            risks.append(f"Heat stress: {features.heat_stress_days:.0f} days >35°C")
        elif features.heat_stress_days > 5:
            risks.append(f"Moderate heat stress: {features.heat_stress_days:.0f} days >35°C")

        if features.frost_days > 5:
            risks.append(f"Frost risk: {features.frost_days:.0f} days <0°C")

        if features.dry_spell_max > 20:
            risks.append(f"Long dry spell: {features.dry_spell_max:.0f} days")
        elif features.dry_spell_max > 10:
            risks.append(f"Extended dry period: {features.dry_spell_max:.0f} days")

        if features.water_stress_index > 0.7:
            risks.append("High water stress index (ECOSTRESS)")

        if features.precip_total_growing > 0 and features.precip_total_growing < 300:
            risks.append(f"Low seasonal precipitation: {features.precip_total_growing:.0f}mm")

        return risks

    def predict_scenarios(
        self,
        features: YieldFeatures,
        scenarios: Dict[str, Dict],
    ) -> Dict[str, YieldPrediction]:
        """Predict yield under different management/climate scenarios."""
        results = {}

        for name, modifications in scenarios.items():
            # Create modified features
            mod_features = YieldFeatures(**features.__dict__)
            for key, value in modifications.items():
                if hasattr(mod_features, key):
                    setattr(mod_features, key, value)

            results[name] = self.predict(mod_features)

        return results


# Regional yield benchmarks (kg/ha)
REGIONAL_BENCHMARKS = {
    "corn": {
        "us_corn_belt": 11000,
        "us_northern": 9000,
        "us_southern": 8000,
        "eu_western": 9500,
        "eu_eastern": 7000,
        "brazil": 9500,
        "argentina": 8500,
        "china": 6500,
    },
    "soybean": {
        "us_corn_belt": 3800,
        "us_southern": 3000,
        "brazil": 3500,
        "argentina": 3200,
    },
    "wheat": {
        "us_great_plains": 3500,
        "eu_western": 8000,
        "eu_eastern": 5000,
        "russia": 3000,
        "ukraine": 4500,
        "australia": 2500,
        "canada": 3500,
    },
}