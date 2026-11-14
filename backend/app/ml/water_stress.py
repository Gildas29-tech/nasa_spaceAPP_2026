"""Water Stress Detector for early drought warning and irrigation scheduling."""

import warnings
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import numpy as np
import xarray as xr
from pydantic import BaseModel, Field

warnings.filterwarnings("ignore")


@dataclass
class StressIndicators:
    """Multi-source water stress indicators."""
    # SMAP-based
    smap_surface_anomaly: float = 0.0      # Standardized anomaly
    smap_rootzone_anomaly: float = 0.0
    smap_percentile: float = 50.0          # Historical percentile

    # MODIS-based
    ndvi_anomaly: float = 0.0
    lst_anomaly: float = 0.0
    vhi: float = 50.0                      # Vegetation Health Index

    # ECOSTRESS-based
    et_fraction: float = 1.0               # ET/ET_ref
    water_stress_index: float = 0.0        # 0-1 (1 = high stress)
    evaporative_stress_index: float = 50.0 # ESI

    # GPM-based
    precip_deficit: float = 0.0            # mm below normal
    spi: float = 0.0                       # Standardized Precipitation Index

    # OpenET-based
    et_anomaly: float = 0.0
    et_cumulative_deficit: float = 0.0

    # Composite
    composite_stress: float = 0.0          # 0-100 (100 = extreme stress)
    stress_level: str = "none"             # none, mild, moderate, severe, extreme


class WaterStressAlert(BaseModel):
    """Water stress alert with actionable recommendations."""
    location: Tuple[float, float]
    timestamp: str
    stress_indicators: StressIndicators
    alert_level: str  # green, yellow, orange, red
    lead_time_days: int
    recommended_actions: List[str]
    irrigation_recommendation: Optional[Dict] = None
    confidence: float = Field(ge=0, le=1)


class WaterStressDetector:
    """Multi-source water stress detection and early warning system.

    Integrates:
    - SMAP: Soil moisture anomalies (surface + root zone)
    - MODIS: NDVI anomalies, LST, VHI
    - ECOSTRESS: ET fraction, ESI, water stress index
    - GPM: SPI, precipitation deficits
    - OpenET: Field-scale ET anomalies
    """

    STRESS_THRESHOLDS = {
        "none": (0, 20),
        "mild": (20, 40),
        "moderate": (40, 60),
        "severe": (60, 80),
        "extreme": (80, 100),
    }

    ALERT_COLORS = {
        "none": "green",
        "mild": "green",
        "moderate": "yellow",
        "severe": "orange",
        "extreme": "red",
    }

    def __init__(
        self,
        location: Tuple[float, float],
        crop_type: str = "corn",
        soil_type: str = "loam",
        historical_years: int = 10,
    ):
        self.location = location
        self.crop_type = crop_type
        self.soil_type = soil_type
        self.historical_years = historical_years
        self._historical_data = {}

    def analyze_stress(
        self,
        smap_data: Optional[xr.Dataset] = None,
        modis_ndvi: Optional[xr.DataArray] = None,
        modis_lst: Optional[xr.DataArray] = None,
        ecostress_et: Optional[xr.DataArray] = None,
        ecostress_esi: Optional[xr.DataArray] = None,
        ecostress_stress: Optional[xr.DataArray] = None,
        gpm_precip: Optional[xr.DataArray] = None,
        openet_et: Optional[xr.DataArray] = None,
        current_date: Optional[str] = None,
    ) -> WaterStressAlert:
        """Comprehensive water stress analysis."""
        current_date = current_date or datetime.now().strftime("%Y-%m-%d")

        indicators = StressIndicators()

        # Compute indicators from each source
        if smap_data is not None:
            indicators = self._analyze_smap(smap_data, indicators)

        if modis_ndvi is not None or modis_lst is not None:
            indicators = self._analyze_modis(modis_ndvi, modis_lst, indicators)

        if ecostress_et is not None or ecostress_esi is not None or ecostress_stress is not None:
            indicators = self._analyze_ecostress(ecostress_et, ecostress_esi, ecostress_stress, indicators)

        if gpm_precip is not None:
            indicators = self._analyze_gpm(gpm_precip, indicators)

        if openet_et is not None:
            indicators = self._analyze_openet(openet_et, indicators)

        # Compute composite stress
        indicators = self._compute_composite(indicators)

        # Determine alert level
        alert_level = self.ALERT_COLORS[indicators.stress_level]

        # Estimate lead time (days until critical stress)
        lead_time = self._estimate_lead_time(indicators)

        # Generate recommendations
        actions = self._generate_recommendations(indicators, lead_time)

        # Irrigation recommendation
        irrigation = self._recommend_irrigation(indicators)

        # Confidence based on data sources
        confidence = self._compute_confidence(
            smap_data, modis_ndvi, modis_lst, ecostress_et, gpm_precip, openet_et
        )

        return WaterStressAlert(
            location=self.location,
            timestamp=current_date,
            stress_indicators=indicators,
            alert_level=alert_level,
            lead_time_days=lead_time,
            recommended_actions=actions,
            irrigation_recommendation=irrigation,
            confidence=round(confidence, 2),
        )

    def _analyze_smap(
        self, smap_data: xr.Dataset, indicators: StressIndicators
    ) -> StressIndicators:
        """Analyze SMAP soil moisture for anomalies."""
        for var in ["soil_moisture", "soil_moisture_am", "rootzone_soil_moisture"]:
            if var in smap_data.data_vars:
                data = smap_data[var].values.flatten()
                data = data[~np.isnan(data)]
                if len(data) == 0:
                    continue

                current = np.mean(data)

                # Historical climatology (simplified - would use actual historical data)
                # Typical ranges by soil type
                clim = self._get_soil_moisture_climatology(var)

                # Standardized anomaly
                anomaly = (current - clim["mean"]) / (clim["std"] + 1e-6)

                # Percentile (assuming normal distribution)
                from scipy import stats
                percentile = stats.norm.cdf(anomaly) * 100

                if "rootzone" in var:
                    indicators.smap_rootzone_anomaly = anomaly
                    indicators.smap_percentile = percentile
                else:
                    indicators.smap_surface_anomaly = anomaly
                    indicators.smap_percentile = percentile
                break

        return indicators

    def _analyze_modis(
        self,
        ndvi: Optional[xr.DataArray],
        lst: Optional[xr.DataArray],
        indicators: StressIndicators,
    ) -> StressIndicators:
        """Analyze MODIS NDVI and LST for vegetation stress."""
        if ndvi is not None:
            vals = ndvi.values.flatten()
            vals = vals[~np.isnan(vals)]
            if len(vals) > 0:
                current_ndvi = np.mean(vals)
                # Historical NDVI climatology for location/date
                clim_ndvi = self._get_ndvi_climatology()
                indicators.ndvi_anomaly = (current_ndvi - clim_ndvi["mean"]) / (clim_ndvi["std"] + 1e-6)

        if lst is not None:
            vals = lst.values.flatten()
            vals = vals[~np.isnan(vals)]
            if len(vals) > 0:
                # Convert from Kelvin if needed
                if np.mean(vals) > 200:
                    vals = vals - 273.15

                current_lst = np.mean(vals)
                clim_lst = self._get_lst_climatology()
                indicators.lst_anomaly = (current_lst - clim_lst["mean"]) / (clim_lst["std"] + 1e-6)

        # Vegetation Health Index (VHI) = 0.5*VCI + 0.5*TCI
        # VCI = NDVI anomaly, TCI = LST anomaly (inverted)
        if indicators.ndvi_anomaly != 0 or indicators.lst_anomaly != 0:
            vci = 50 + indicators.ndvi_anomaly * 15  # Scale
            tci = 50 - indicators.lst_anomaly * 15   # Inverted (high LST = stress)
            indicators.vhi = np.clip((vci + tci) / 2, 0, 100)

        return indicators

    def _analyze_ecostress(
        self,
        et: Optional[xr.DataArray],
        esi: Optional[xr.DataArray],
        stress: Optional[xr.DataArray],
        indicators: StressIndicators,
    ) -> StressIndicators:
        """Analyze ECOSTRESS ET and stress products."""
        if et is not None:
            vals = et.values.flatten()
            vals = vals[~np.isnan(vals)]
            if len(vals) > 0:
                # ET fraction = ET / ET_reference
                # Would need ET_reference from same product
                indicators.et_fraction = np.mean(vals) / 5.0  # Simplified

        if esi is not None:
            vals = esi.values.flatten()
            vals = vals[~np.isnan(vals)]
            if len(vals) > 0:
                # ESI is typically standardized (-2 to +2)
                # Convert to 0-100 scale
                indicators.evaporative_stress_index = np.clip(
                    50 + np.mean(vals) * 25, 0, 100
                )

        if stress is not None:
            vals = stress.values.flatten()
            vals = vals[~np.isnan(vals)]
            if len(vals) > 0:
                # Water stress index (0-1)
                indicators.water_stress_index = np.mean(vals)

        return indicators

    def _analyze_gpm(
        self, precip: xr.DataArray, indicators: StressIndicators
    ) -> StressIndicators:
        """Analyze GPM precipitation for deficits and SPI."""
        vals = precip.values.flatten()
        vals = vals[~np.isnan(vals)]
        if len(vals) == 0:
            return indicators

        # Accumulated precipitation over period
        current_precip = np.sum(vals)

        # Historical normal for this period/location
        clim_precip = self._get_precip_climatology(len(vals))
        indicators.precip_deficit = clim_precip["mean"] - current_precip

        # SPI (simplified - would use gamma distribution fitting)
        # SPI = (current - mean) / std
        indicators.spi = (current_precip - clim_precip["mean"]) / (clim_precip["std"] + 1e-6)

        return indicators

    def _analyze_openet(
        self, et: xr.DataArray, indicators: StressIndicators
    ) -> StressIndicators:
        """Analyze OpenET field-scale ET."""
        vals = et.values.flatten()
        vals = vals[~np.isnan(vals)]
        if len(vals) == 0:
            return indicators

        current_et = np.mean(vals)
        clim_et = self._get_et_climatology()
        indicators.et_anomaly = (current_et - clim_et["mean"]) / (clim_et["std"] + 1e-6)

        # Cumulative deficit over growing season
        if indicators.et_anomaly < 0:
            indicators.et_cumulative_deficit = abs(indicators.et_anomaly) * clim_et["mean"] * 30  # mm/month

        return indicators

    def _compute_composite(self, indicators: StressIndicators) -> StressIndicators:
        """Compute composite stress score from all indicators."""
        weights = {
            "smap_surface": 0.20,
            "smap_rootzone": 0.25,
            "vhi": 0.15,
            "esi": 0.15,
            "water_stress_index": 0.15,
            "spi": 0.10,
        }

        # Normalize each indicator to 0-100 stress scale (higher = more stress)
        normalized = {}

        # SMAP: percentile inverted (low percentile = high stress)
        normalized["smap_surface"] = 100 - indicators.smap_percentile
        normalized["smap_rootzone"] = 100 - indicators.smap_percentile

        # VHI: inverted (low VHI = high stress)
        normalized["vhi"] = 100 - indicators.vhi

        # ESI: inverted (low ESI = high stress)
        normalized["esi"] = 100 - indicators.evaporative_stress_index

        # Water stress index: already 0-1, scale to 0-100
        normalized["water_stress_index"] = indicators.water_stress_index * 100

        # SPI: inverted (negative SPI = drought)
        normalized["spi"] = 50 - indicators.spi * 20  # Scale
        normalized["spi"] = np.clip(normalized["spi"], 0, 100)

        # Weighted composite
        composite = sum(
            normalized[k] * weights[k] for k in weights if k in normalized
        )

        indicators.composite_stress = np.clip(composite, 0, 100)

        # Determine stress level
        for level, (low, high) in self.STRESS_THRESHOLDS.items():
            if low <= indicators.composite_stress < high:
                indicators.stress_level = level
                break

        return indicators

    def _estimate_lead_time(self, indicators: StressIndicators) -> int:
        """Estimate days until critical stress level."""
        # Simple heuristic based on current trend
        # In production, would use time series forecasting

        stress = indicators.composite_stress

        if stress < 30:
            return 30  # No immediate concern
        elif stress < 50:
            return 14  # Mild - 2 weeks
        elif stress < 70:
            return 7   # Moderate - 1 week
        elif stress < 85:
            return 3   # Severe - 3 days
        else:
            return 1   # Extreme - immediate

    def _generate_recommendations(
        self, indicators: StressIndicators, lead_time: int
    ) -> List[str]:
        """Generate actionable recommendations."""
        actions = []
        stress = indicators.composite_stress

        if stress < 20:
            actions.append("✅ No water stress detected. Continue monitoring.")
            return actions

        # General recommendations
        if indicators.smap_percentile < 20:
            actions.append(
                f"💧 Surface soil moisture critically low ({indicators.smap_percentile:.0f}th percentile). "
                "Consider immediate irrigation if available."
            )
        elif indicators.smap_percentile < 40:
            actions.append(
                f"💧 Surface soil moisture below normal ({indicators.smap_percentile:.0f}th percentile). "
                "Schedule irrigation within 2-3 days."
            )

        if indicators.smap_rootzone_anomaly < -1.5:
            actions.append(
                "🌱 Root zone moisture severely depleted. Deep irrigation recommended "
                "to recharge root zone profile."
            )

        if indicators.vhi < 30:
            actions.append(
                f"🌿 Vegetation Health Index low ({indicators.vhi:.0f}). "
                "Crop showing visible stress - prioritize water application."
            )

        if indicators.water_stress_index > 0.7:
            actions.append(
                f"🌡️ ECOSTRESS water stress index high ({indicators.water_stress_index:.2f}). "
                "Immediate irrigation needed to prevent yield loss."
            )

        if indicators.spi < -1.5:
            actions.append(
                f"🌧️ Severe precipitation deficit (SPI: {indicators.spi:.1f}). "
                "Supplement with irrigation; consider drought-tolerant practices."
            )

        if indicators.et_cumulative_deficit > 50:
            actions.append(
                f"📉 Cumulative ET deficit: {indicators.et_cumulative_deficit:.0f}mm. "
                "Increase irrigation frequency/amount."
            )

        # Lead-time specific
        if lead_time <= 3:
            actions.insert(0, f"⚠️ URGENT: Critical stress expected within {lead_time} days!")
        elif lead_time <= 7:
            actions.insert(0, f"⚡ WARNING: Stress likely within {lead_time} days. Prepare irrigation.")

        # Crop-specific
        if self.crop_type in ["corn", "sorghum"]:
            if stress > 50 and indicators.stress_level in ["moderate", "severe"]:
                actions.append(
                    "🌽 Corn/sorghum: Critical growth stages (tasseling, silking) "
                    "are highly sensitive to water stress. Prioritize irrigation."
                )

        return actions

    def _recommend_irrigation(self, indicators: StressIndicators) -> Optional[Dict]:
        """Recommend irrigation amount and timing."""
        stress = indicators.composite_stress

        if stress < 30:
            return None

        # Estimate soil moisture deficit (mm)
        # Simplified: root zone depth ~1m, available water capacity by soil
        awc = {"sand": 80, "loam": 180, "clay": 200, "silt": 190}  # mm/m
        root_depth = 1.0  # m
        total_awc = awc.get(self.soil_type, 180) * root_depth

        # Current depletion from anomalies
        depletion_fraction = max(0, -indicators.smap_rootzone_anomaly / 2.0)
        depletion_fraction = min(1.0, depletion_fraction)

        current_depletion = total_awc * depletion_fraction

        # Refill to 80% of field capacity
        target_depletion = total_awc * 0.2
        irrigation_needed = max(0, current_depletion - target_depletion)

        return {
            "amount_mm": round(irrigation_needed, 1),
            "amount_inches": round(irrigation_needed / 25.4, 2),
            "timing": "within 24 hours" if stress > 70 else "within 3 days",
            "method": "deep irrigation" if indicators.smap_rootzone_anomaly < -1 else "normal",
            "soil_moisture_target": "80% field capacity",
        }

    def _compute_confidence(
        self,
        smap_data: Optional[xr.Dataset],
        modis_ndvi: Optional[xr.DataArray],
        modis_lst: Optional[xr.DataArray],
        ecostress_et: Optional[xr.DataArray],
        gpm_precip: Optional[xr.DataArray],
        openet_et: Optional[xr.DataArray],
    ) -> float:
        """Compute confidence based on available data sources."""
        sources = [
            smap_data is not None,
            modis_ndvi is not None,
            modis_lst is not None,
            ecostress_et is not None,
            gpm_precip is not None,
            openet_et is not None,
        ]

        available = sum(sources)
        base_confidence = available / 6.0 * 0.8

        # Bonus for key sources
        if smap_data is not None:
            base_confidence += 0.10
        if ecostress_et is not None:
            base_confidence += 0.10
        if openet_et is not None:
            base_confidence += 0.10

        return min(1.0, base_confidence)

    # Climatology getters (simplified - would use actual historical data in production)
    def _get_soil_moisture_climatology(self, variable: str) -> Dict[str, float]:
        """Get soil moisture climatology for location/date."""
        # Simplified typical values by soil type
        soil_clim = {
            "sand": {"mean": 0.12, "std": 0.04},
            "loam": {"mean": 0.25, "std": 0.06},
            "clay": {"mean": 0.32, "std": 0.05},
            "silt": {"mean": 0.28, "std": 0.05},
        }
        base = soil_clim.get(self.soil_type, soil_clim["loam"])

        if "rootzone" in variable:
            return {"mean": base["mean"] * 1.2, "std": base["std"] * 1.1}
        return base

    def _get_ndvi_climatology(self) -> Dict[str, float]:
        """Get NDVI climatology for location/date."""
        # Simplified - would use actual MODIS climatology
        return {"mean": 0.55, "std": 0.15}

    def _get_lst_climatology(self) -> Dict[str, float]:
        """Get LST climatology for location/date."""
        return {"mean": 25.0, "std": 5.0}  # °C

    def _get_precip_climatology(self, n_periods: int) -> Dict[str, float]:
        """Get precipitation climatology."""
        # Monthly normals (simplified)
        monthly_normals = [80, 70, 80, 90, 100, 110, 100, 90, 80, 70, 70, 80]
        # Scale by number of periods
        return {"mean": sum(monthly_normals) / 12 * n_periods / 30, "std": 30}

    def _get_et_climatology(self) -> Dict[str, float]:
        """Get ET climatology."""
        return {"mean": 4.0, "std": 1.5}  # mm/day


# Irrigation scheduling helper
class IrrigationScheduler:
    """Simple irrigation scheduling based on water balance."""

    def __init__(
        self,
        field_capacity: float,      # mm
        wilting_point: float,       # mm
        root_depth: float = 1.0,    # m
        allowable_depletion: float = 0.5,  # Fraction of TAW
    ):
        self.field_capacity = field_capacity
        self.wilting_point = wilting_point
        self.root_depth = root_depth
        self.allowable_depletion = allowable_depletion
        self.taw = field_capacity - wilting_point  # Total Available Water
        self.readily_available = self.taw * allowable_depletion

    def schedule_irrigation(
        self,
        current_smap: float,        # Current soil moisture (m3/m3)
        et_crop: float,             # Daily crop ET (mm/day)
        precip_forecast: List[float],  # Next 7 days precip (mm)
        min_interval: int = 2,      # Min days between irrigation
    ) -> Dict:
        """Generate irrigation schedule."""
        # Current available water (mm)
        current_aw = current_smap * self.root_depth * 1000  # Convert to mm
        current_aw = max(self.wilting_point, min(self.field_capacity, current_aw))

        # Depletion
        depletion = self.field_capacity - current_aw

        # Days until irrigation needed (without rain)
        days_dry = self.readily_available / et_crop if et_crop > 0 else 999

        # Account for forecast
        schedule = []
        soil_moisture = current_aw
        last_irrigation_day = -min_interval

        for day in range(7):
            # Add precipitation
            soil_moisture = min(self.field_capacity, soil_moisture + precip_forecast[day])

            # Subtract ET
            soil_moisture -= et_crop

            # Check if irrigation needed
            depletion = self.field_capacity - soil_moisture
            if (depletion >= self.readily_available and
                day - last_irrigation_day >= min_interval):

                # Irrigate to field capacity
                irrigation_amt = self.field_capacity - soil_moisture
                soil_moisture = self.field_capacity

                schedule.append({
                    "day": day,
                    "date": (datetime.now() + timedelta(days=day)).strftime("%Y-%m-%d"),
                    "irrigation_mm": round(irrigation_amt, 1),
                    "pre_irrigation_sw": round(soil_moisture + irrigation_amt - et_crop, 1),
                })
                last_irrigation_day = day

        return {
            "current_depletion_mm": round(depletion, 1),
            "days_until_irrigation": round(days_dry, 1),
            "schedule": schedule,
            "total_irrigation_mm": sum(s["irrigation_mm"] for s in schedule),
        }