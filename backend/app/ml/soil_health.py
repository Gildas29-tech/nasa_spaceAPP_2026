"""Soil Health Index model for computing composite soil health scores."""

import warnings
from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple

import numpy as np
import xarray as xr
from pydantic import BaseModel, Field
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import MinMaxScaler

warnings.filterwarnings("ignore")


@dataclass
class SoilHealthFactors:
    """Individual factors contributing to soil health score."""
    moisture_score: float = 0.0          # 0-100
    organic_matter_score: float = 0.0    # 0-100
    vegetation_score: float = 0.0        # 0-100
    temperature_score: float = 0.0       # 0-100
    erosion_risk_score: float = 0.0      # 0-100 (inverted)
    compaction_score: float = 0.0        # 0-100
    ph_score: float = 0.0                # 0-100
    nutrient_score: float = 0.0          # 0-100


class SoilHealthResult(BaseModel):
    """Complete soil health assessment result."""
    overall_score: float = Field(ge=0, le=100)
    grade: str  # A+, A, B+, B, C+, C, D, F
    factors: SoilHealthFactors
    percentiles: Dict[str, float] = Field(default_factory=dict)
    recommendations: List[str] = Field(default_factory=list)
    confidence: float = Field(ge=0, le=1)
    location: Tuple[float, float]
    assessment_date: str


class SoilHealthModel:
    """Composite Soil Health Index model.

    Combines multiple NASA Earth observation datasets to compute
    a holistic soil health score (0-100) with letter grade.

    Factors (weighted):
    - Soil Moisture (25%): SMAP surface + root zone
    - Organic Matter Proxy (20%): NDVI trends, vegetation productivity
    - Vegetation Health (20%): MODIS NDVI/EVI, Landsat indices
    - Temperature Regime (10%): MODIS LST, thermal stress
    - Erosion Risk (10%): Slope, vegetation cover, rainfall intensity
    - Compaction Proxy (5%): Soil moisture dynamics, bulk density estimates
    - pH Proxy (5%): Vegetation types, moisture patterns
    - Nutrient Cycling (5%): Vegetation productivity, residue cover
    """

    # Default weights (can be customized per region/crop)
    DEFAULT_WEIGHTS = {
        "moisture": 0.25,
        "organic_matter": 0.20,
        "vegetation": 0.20,
        "temperature": 0.10,
        "erosion_risk": 0.10,
        "compaction": 0.05,
        "ph": 0.05,
        "nutrient": 0.05,
    }

    GRADE_THRESHOLDS = [
        (97, "A+"), (93, "A"), (90, "A-"),
        (87, "B+"), (83, "B"), (80, "B-"),
        (77, "C+"), (73, "C"), (70, "C-"),
        (67, "D+"), (63, "D"), (60, "D-"),
        (0, "F"),
    ]

    def __init__(self, weights: Optional[Dict[str, float]] = None):
        self.weights = weights or self.DEFAULT_WEIGHTS
        self.scaler = MinMaxScaler(feature_range=(0, 100))
        self._rf_model = None  # Optional ML model for calibration

    def compute_soil_health(
        self,
        smap_data: Optional[xr.Dataset] = None,
        modis_ndvi: Optional[xr.DataArray] = None,
        modis_lst: Optional[xr.DataArray] = None,
        landsat_indices: Optional[xr.Dataset] = None,
        gpm_precip: Optional[xr.DataArray] = None,
        soil_texture: Optional[str] = None,  # "sand", "loam", "clay", "silt"
        soil_ph: Optional[float] = None,
        organic_matter: Optional[float] = None,  # % if known
        location: Tuple[float, float] = (0, 0),
        assessment_date: Optional[str] = None,
    ) -> SoilHealthResult:
        """Compute comprehensive soil health index.

        Args:
            smap_data: SMAP soil moisture dataset (surface + rootzone)
            modis_ndvi: MODIS NDVI time series
            modis_lst: MODIS Land Surface Temperature
            landsat_indices: Landsat vegetation indices (NDVI, SAVI, etc.)
            gpm_precip: GPM precipitation data
            soil_texture: Soil texture class
            soil_ph: Measured soil pH (if available)
            organic_matter: Measured organic matter % (if available)
            location: (lat, lon) for regional calibration
            assessment_date: Date of assessment

        Returns:
            SoilHealthResult with score, grade, factors, and recommendations
        """
        factors = SoilHealthFactors()

        # 1. Moisture Score (25%)
        factors.moisture_score = self._compute_moisture_score(smap_data, gpm_precip)

        # 2. Organic Matter Proxy (20%)
        factors.organic_matter_score = self._compute_organic_matter_score(
            modis_ndvi, landsat_indices, organic_matter
        )

        # 3. Vegetation Health (20%)
        factors.vegetation_score = self._compute_vegetation_score(
            modis_ndvi, landsat_indices
        )

        # 4. Temperature Regime (10%)
        factors.temperature_score = self._compute_temperature_score(modis_lst)

        # 5. Erosion Risk (10%) - inverted (low risk = high score)
        factors.erosion_risk_score = self._compute_erosion_risk_score(
            modis_ndvi, gpm_precip, landsat_indices
        )

        # 6. Compaction Proxy (5%)
        factors.compaction_score = self._compute_compaction_score(
            smap_data, soil_texture
        )

        # 7. pH Proxy (5%)
        factors.ph_score = self._compute_ph_score(soil_ph, modis_ndvi)

        # 8. Nutrient Cycling (5%)
        factors.nutrient_score = self._compute_nutrient_score(
            modis_ndvi, landsat_indices, organic_matter
        )

        # Compute weighted overall score
        overall = (
            factors.moisture_score * self.weights["moisture"] +
            factors.organic_matter_score * self.weights["organic_matter"] +
            factors.vegetation_score * self.weights["vegetation"] +
            factors.temperature_score * self.weights["temperature"] +
            factors.erosion_risk_score * self.weights["erosion_risk"] +
            factors.compaction_score * self.weights["compaction"] +
            factors.ph_score * self.weights["ph"] +
            factors.nutrient_score * self.weights["nutrient"]
        )

        # Determine grade
        grade = self._score_to_grade(overall)

        # Compute percentiles (regional benchmarks)
        percentiles = self._compute_percentiles(factors, location)

        # Generate recommendations
        recommendations = self._generate_recommendations(factors, overall)

        # Confidence based on data availability
        confidence = self._compute_confidence(
            smap_data, modis_ndvi, modis_lst, landsat_indices, gpm_precip
        )

        return SoilHealthResult(
            overall_score=round(overall, 1),
            grade=grade,
            factors=factors,
            percentiles=percentiles,
            recommendations=recommendations,
            confidence=round(confidence, 2),
            location=location,
            assessment_date=assessment_date or "2024-01-01",
        )

    def _compute_moisture_score(
        self, smap_data: Optional[xr.Dataset], gpm_precip: Optional[xr.DataArray]
    ) -> float:
        """Compute soil moisture adequacy score."""
        scores = []

        if smap_data is not None:
            # Use both surface and root zone if available
            for var in ["soil_moisture", "soil_moisture_am", "rootzone_soil_moisture"]:
                if var in smap_data.data_vars:
                    data = smap_data[var].values.flatten()
                    data = data[~np.isnan(data)]
                    if len(data) > 0:
                        # Optimal range: 0.2-0.35 m3/m3 for most crops
                        mean_moisture = np.mean(data)
                        if 0.20 <= mean_moisture <= 0.35:
                            score = 100
                        elif 0.15 <= mean_moisture < 0.20:
                            score = 70 + (mean_moisture - 0.15) / 0.05 * 30
                        elif 0.35 < mean_moisture <= 0.45:
                            score = 80 - (mean_moisture - 0.35) / 0.10 * 20
                        elif mean_moisture < 0.10:
                            score = max(0, mean_moisture / 0.10 * 50)
                        else:
                            score = 50
                        scores.append(score)

        if gpm_precip is not None:
            # Precipitation adequacy
            precip_data = gpm_precip.values.flatten()
            precip_data = precip_data[~np.isnan(precip_data)]
            if len(precip_data) > 0:
                total_precip = np.sum(precip_data)  # mm over period
                # Optimal: 500-1000mm growing season
                if 500 <= total_precip <= 1000:
                    score = 100
                elif total_precip < 300:
                    score = total_precip / 300 * 50
                else:
                    score = 80
                scores.append(score)

        return np.mean(scores) if scores else 50.0

    def _compute_organic_matter_score(
        self,
        modis_ndvi: Optional[xr.DataArray],
        landsat_indices: Optional[xr.Dataset],
        measured_om: Optional[float],
    ) -> float:
        """Estimate organic matter from vegetation productivity."""
        if measured_om is not None:
            # Direct measurement: typical range 1-6%
            return min(100, measured_om / 5.0 * 100)

        scores = []

        if modis_ndvi is not None:
            ndvi_vals = modis_ndvi.values.flatten()
            ndvi_vals = ndvi_vals[~np.isnan(ndvi_vals)]
            if len(ndvi_vals) > 0:
                # Higher mean NDVI + lower variability = more OM
                mean_ndvi = np.mean(ndvi_vals)
                cv_ndvi = np.std(ndvi_vals) / (mean_ndvi + 1e-6)
                # Score based on mean NDVI (0.3-0.8 typical for crops)
                ndvi_score = np.clip((mean_ndvi - 0.2) / 0.6 * 100, 0, 100)
                # Penalize high variability
                stability_score = np.clip(100 - cv_ndvi * 100, 0, 100)
                scores.append((ndvi_score + stability_score) / 2)

        if landsat_indices is not None:
            for idx in ["ndvi", "savi", "msavi"]:
                if idx in landsat_indices.data_vars:
                    vals = landsat_indices[idx].values.flatten()
                    vals = vals[~np.isnan(vals)]
                    if len(vals) > 0:
                        mean_val = np.mean(vals)
                        scores.append(np.clip((mean_val - 0.1) / 0.7 * 100, 0, 100))

        return np.mean(scores) if scores else 40.0

    def _compute_vegetation_score(
        self,
        modis_ndvi: Optional[xr.DataArray],
        landsat_indices: Optional[xr.Dataset],
    ) -> float:
        """Compute vegetation health score."""
        scores = []

        if modis_ndvi is not None:
            vals = modis_ndvi.values.flatten()
            vals = vals[~np.isnan(vals)]
            if len(vals) > 0:
                # Peak NDVI during growing season
                peak_ndvi = np.percentile(vals, 90)
                scores.append(np.clip((peak_ndvi - 0.3) / 0.5 * 100, 0, 100))

        if landsat_indices is not None:
            for idx in ["ndvi", "evi", "savi"]:
                if idx in landsat_indices.data_vars:
                    vals = landsat_indices[idx].values.flatten()
                    vals = vals[~np.isnan(vals)]
                    if len(vals) > 0:
                        peak = np.percentile(vals, 90)
                        scores.append(np.clip((peak - 0.2) / 0.6 * 100, 0, 100))

        return np.mean(scores) if scores else 50.0

    def _compute_temperature_score(
        self, modis_lst: Optional[xr.DataArray]
    ) -> float:
        """Compute temperature stress score."""
        if modis_lst is None:
            return 70.0  # Neutral if no data

        # Convert from Kelvin if needed
        vals = modis_lst.values.flatten()
        vals = vals[~np.isnan(vals)]

        if len(vals) == 0:
            return 70.0

        # Check if in Kelvin (typical MODIS LST > 200)
        if np.mean(vals) > 200:
            vals_c = vals - 273.15
        else:
            vals_c = vals

        # Optimal soil temp for most crops: 15-25°C
        mean_temp = np.mean(vals_c)
        if 15 <= mean_temp <= 25:
            return 100.0
        elif 10 <= mean_temp < 15:
            return 80 + (mean_temp - 10) / 5 * 20
        elif 25 < mean_temp <= 35:
            return 100 - (mean_temp - 25) / 10 * 40
        elif mean_temp > 35:
            return max(20, 60 - (mean_temp - 35) * 5)
        else:  # < 10°C
            return max(30, mean_temp / 10 * 60)

    def _compute_erosion_risk_score(
        self,
        modis_ndvi: Optional[xr.DataArray],
        gpm_precip: Optional[xr.DataArray],
        landsat_indices: Optional[xr.Dataset],
    ) -> float:
        """Compute erosion risk (inverted: low risk = high score)."""
        risk_factors = []

        # Vegetation cover factor (high NDVI = low erosion risk)
        if modis_ndvi is not None:
            vals = modis_ndvi.values.flatten()
            vals = vals[~np.isnan(vals)]
            if len(vals) > 0:
                mean_cover = np.mean(vals)
                # Risk decreases with cover
                risk_factors.append(1 - mean_cover)  # 0-1 risk

        # Rainfall intensity factor
        if gpm_precip is not None:
            vals = gpm_precip.values.flatten()
            vals = vals[~np.isnan(vals)]
            if len(vals) > 0:
                # High intensity events increase erosion
                p95 = np.percentile(vals, 95)
                # Normalize: >50mm/half-hour = high risk
                risk_factors.append(min(1.0, p95 / 50.0))

        # Bare soil exposure (from Landsat)
        if landsat_indices is not None and "ndvi" in landsat_indices.data_vars:
            vals = landsat_indices["ndvi"].values.flatten()
            vals = vals[~np.isnan(vals)]
            if len(vals) > 0:
                bare_fraction = np.mean(vals < 0.2)
                risk_factors.append(bare_fraction)

        if not risk_factors:
            return 60.0  # Moderate risk by default

        avg_risk = np.mean(risk_factors)
        # Convert risk to score (inverted)
        return np.clip((1 - avg_risk) * 100, 0, 100)

    def _compute_compaction_score(
        self,
        smap_data: Optional[xr.Dataset],
        soil_texture: Optional[str],
    ) -> float:
        """Estimate compaction from moisture dynamics and texture."""
        if smap_data is None:
            return 60.0

        # Texture-based baseline
        texture_scores = {
            "sand": 80, "loamy_sand": 75, "sandy_loam": 70,
            "loam": 65, "silt_loam": 60, "silt": 55,
            "sandy_clay_loam": 50, "clay_loam": 45,
            "silty_clay_loam": 40, "sandy_clay": 35,
            "silty_clay": 30, "clay": 25,
        }
        base_score = texture_scores.get(soil_texture, 55) if soil_texture else 55

        # Moisture variability as compaction indicator
        # High variability in wet/dry cycles can indicate compaction
        for var in ["soil_moisture", "soil_moisture_am"]:
            if var in smap_data.data_vars:
                vals = smap_data[var].values.flatten()
                vals = vals[~np.isnan(vals)]
                if len(vals) > 10:
                    cv = np.std(vals) / (np.mean(vals) + 1e-6)
                    # High CV might indicate preferential flow (compaction)
                    compaction_penalty = min(20, cv * 50)
                    base_score = max(0, base_score - compaction_penalty)
                break

        return base_score

    def _compute_ph_score(
        self,
        measured_ph: Optional[float],
        modis_ndvi: Optional[xr.DataArray],
    ) -> float:
        """Estimate pH suitability score."""
        if measured_ph is not None:
            # Optimal range for most crops: 6.0-7.0
            if 6.0 <= measured_ph <= 7.0:
                return 100.0
            elif 5.5 <= measured_ph < 6.0:
                return 80 + (measured_ph - 5.5) / 0.5 * 20
            elif 7.0 < measured_ph <= 7.5:
                return 90 - (measured_ph - 7.0) / 0.5 * 20
            elif 5.0 <= measured_ph < 5.5:
                return 60 + (measured_ph - 5.0) / 0.5 * 20
            elif 7.5 < measured_ph <= 8.0:
                return 70 - (measured_ph - 7.5) / 0.5 * 20
            else:
                return 40.0

        # Proxy from vegetation (limited reliability)
        return 65.0

    def _compute_nutrient_score(
        self,
        modis_ndvi: Optional[xr.DataArray],
        landsat_indices: Optional[xr.Dataset],
        organic_matter: Optional[float],
    ) -> float:
        """Estimate nutrient cycling capacity."""
        scores = []

        # Organic matter contribution
        if organic_matter is not None:
            scores.append(min(100, organic_matter / 4.0 * 100))

        # Vegetation productivity as proxy
        if modis_ndvi is not None:
            vals = modis_ndvi.values.flatten()
            vals = vals[~np.isnan(vals)]
            if len(vals) > 0:
                # Growing season integral
                gsi = np.sum(vals[vals > 0.3])
                scores.append(min(100, gsi / 100 * 100))

        return np.mean(scores) if scores else 55.0

    def _score_to_grade(self, score: float) -> str:
        """Convert numeric score to letter grade."""
        for threshold, grade in self.GRADE_THRESHOLDS:
            if score >= threshold:
                return grade
        return "F"

    def _compute_percentiles(
        self, factors: SoilHealthFactors, location: Tuple[float, float]
    ) -> Dict[str, float]:
        """Compute regional percentiles (placeholder - would use historical data)."""
        # In production, compare against regional database
        return {
            "overall": 50.0,  # Median by default
            "moisture": 50.0,
            "organic_matter": 50.0,
            "vegetation": 50.0,
            "temperature": 50.0,
            "erosion_risk": 50.0,
        }

    def _generate_recommendations(
        self, factors: SoilHealthFactors, overall: float
    ) -> List[str]:
        """Generate actionable recommendations based on factor scores."""
        recs = []

        if factors.moisture_score < 60:
            recs.append(
                "💧 Soil moisture is suboptimal. Consider irrigation scheduling "
                "based on SMAP data, or explore drought-tolerant crop varieties."
            )

        if factors.organic_matter_score < 50:
            recs.append(
                "🌱 Low organic matter detected. Recommend cover cropping, "
                "reduced tillage, and compost/manure application to build soil carbon."
            )

        if factors.vegetation_score < 60:
            recs.append(
                "🌿 Vegetation health below optimal. Check for nutrient deficiencies, "
                "pest pressure, or water stress using ECOSTRESS data."
            )

        if factors.temperature_score < 60:
            recs.append(
                "🌡️ Temperature stress detected. Consider mulching, shade crops, "
                "or adjusting planting dates to avoid heat/cold stress periods."
            )

        if factors.erosion_risk_score < 50:
            recs.append(
                "⚠️ High erosion risk. Implement contour farming, buffer strips, "
                "cover crops, and reduce bare soil exposure during rainy periods."
            )

        if factors.compaction_score < 50:
            recs.append(
                "🚜 Potential compaction issues. Consider deep ripping, "
                "controlled traffic farming, and avoiding field operations when wet."
            )

        if factors.ph_score < 60:
            recs.append(
                "⚗️ pH may be suboptimal. Soil test recommended for lime "
                "(if acidic) or sulfur/gypsum (if alkaline) amendments."
            )

        if factors.nutrient_score < 50:
            recs.append(
                "🧪 Nutrient cycling capacity limited. Consider soil testing, "
                "precision fertilization, and legume cover crops for N fixation."
            )

        # Overall recommendations
        if overall >= 80:
            recs.insert(0, "✅ Excellent soil health! Maintain current practices.")
        elif overall >= 60:
            recs.insert(0, "👍 Good soil health with room for improvement.")
        else:
            recs.insert(0, "⚠️ Soil health needs attention. Priority actions above.")

        return recs

    def _compute_confidence(
        self,
        smap_data: Optional[xr.Dataset],
        modis_ndvi: Optional[xr.DataArray],
        modis_lst: Optional[xr.DataArray],
        landsat_indices: Optional[xr.Dataset],
        gpm_precip: Optional[xr.DataArray],
    ) -> float:
        """Compute confidence based on data availability and quality."""
        available = sum([
            smap_data is not None,
            modis_ndvi is not None,
            modis_lst is not None,
            landsat_indices is not None,
            gpm_precip is not None,
        ])
        # Base confidence from data coverage (5 datasets max)
        base = available / 5.0 * 0.8

        # Quality bonuses
        quality_bonus = 0.0
        if smap_data is not None:
            quality_bonus += 0.05
        if landsat_indices is not None:
            quality_bonus += 0.10  # Higher resolution
        if modis_ndvi is not None and modis_lst is not None:
            quality_bonus += 0.05

        return min(1.0, base + quality_bonus)


# Regional calibration presets
REGIONAL_WEIGHTS = {
    "arid": {"moisture": 0.35, "organic_matter": 0.15, "vegetation": 0.15, "temperature": 0.15, "erosion_risk": 0.10, "compaction": 0.03, "ph": 0.04, "nutrient": 0.03},
    "humid": {"moisture": 0.15, "organic_matter": 0.25, "vegetation": 0.20, "temperature": 0.10, "erosion_risk": 0.15, "compaction": 0.05, "ph": 0.05, "nutrient": 0.05},
    "mediterranean": {"moisture": 0.30, "organic_matter": 0.20, "vegetation": 0.20, "temperature": 0.10, "erosion_risk": 0.10, "compaction": 0.03, "ph": 0.04, "nutrient": 0.03},
    "temperate": {"moisture": 0.20, "organic_matter": 0.20, "vegetation": 0.20, "temperature": 0.10, "erosion_risk": 0.10, "compaction": 0.05, "ph": 0.05, "nutrient": 0.10},
    "tropical": {"moisture": 0.15, "organic_matter": 0.25, "vegetation": 0.20, "temperature": 0.05, "erosion_risk": 0.20, "compaction": 0.05, "ph": 0.05, "nutrient": 0.05},
}


def get_regional_model(climate_zone: str) -> SoilHealthModel:
    """Get pre-calibrated model for climate zone."""
    weights = REGIONAL_WEIGHTS.get(climate_zone.lower(), SoilHealthModel.DEFAULT_WEIGHTS)
    return SoilHealthModel(weights=weights)