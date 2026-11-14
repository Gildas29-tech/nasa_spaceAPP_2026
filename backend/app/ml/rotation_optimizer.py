"""Crop Rotation Optimizer for recommending resilient rotation strategies."""

import itertools
import warnings
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from pydantic import BaseModel, Field

warnings.filterwarnings("ignore")


@dataclass
class Crop:
    """Crop definition with agronomic properties."""
    name: str
    family: str                    # Botanical family (e.g., "Poaceae", "Fabaceae")
    season: str                    # "cool", "warm", "perennial"
    root_depth: str               # "shallow", "medium", "deep"
    water_need: str               # "low", "medium", "high"
    nitrogen_fixation: bool       # Legume?
    residue_cover: str            # "low", "medium", "high"
    pest_host: List[str] = field(default_factory=list)  # Pest/disease hosts
    market_value: float = 1.0     # Relative economic value
    drought_tolerance: int = 5    # 1-10
    heat_tolerance: int = 5       # 1-10
    cold_tolerance: int = 5       # 1-10
    salinity_tolerance: int = 5   # 1-10


@dataclass
class RotationSequence:
    """A crop rotation sequence with evaluated metrics."""
    crops: List[Crop]
    years: int
    scores: Dict[str, float] = field(default_factory=dict)
    total_score: float = 0.0
    rank: int = 0


class FarmerPriorities(BaseModel):
    """Farmer's weighted priorities for rotation optimization."""
    water_conservation: float = Field(default=0.25, ge=0, le=1)
    soil_health: float = Field(default=0.25, ge=0, le=1)
    profitability: float = Field(default=0.25, ge=0, le=1)
    pest_management: float = Field(default=0.15, ge=0, le=1)
    climate_resilience: float = Field(default=0.10, ge=0, le=1)

    def normalize(self):
        """Ensure weights sum to 1."""
        total = sum(self.model_dump().values())
        if total > 0:
            for k in self.model_dump():
                setattr(self, k, getattr(self, k) / total)


# Crop database (extensible)
CROP_DATABASE = {
    # Cereals
    "corn": Crop("Corn", "Poaceae", "warm", "deep", "high", False, "high",
                 ["corn_borer", "rootworm"], 1.0, 5, 6, 3, 4),
    "wheat": Crop("Wheat", "Poaceae", "cool", "medium", "medium", False, "medium",
                  ["rust", "aphid"], 0.8, 6, 5, 7, 5),
    "sorghum": Crop("Sorghum", "Poaceae", "warm", "deep", "low", False, "high",
                    ["aphid", "midge"], 0.7, 8, 8, 4, 6),
    "barley": Crop("Barley", "Poaceae", "cool", "medium", "medium", False, "medium",
                   ["rust", "blight"], 0.7, 6, 5, 7, 6),
    "rice": Crop("Rice", "Poaceae", "warm", "shallow", "high", False, "low",
                 ["blast", "stem_borer"], 1.0, 3, 6, 4, 3),
    "millet": Crop("Millet", "Poaceae", "warm", "medium", "low", False, "medium",
                   ["downy_mildew"], 0.6, 9, 8, 3, 7),
    "oats": Crop("Oats", "Poaceae", "cool", "medium", "medium", False, "high",
                 ["crown_rust"], 0.5, 5, 4, 7, 4),

    # Legumes (N-fixers)
    "soybean": Crop("Soybean", "Fabaceae", "warm", "medium", "medium", True, "medium",
                    ["aphid", "cyst_nematode"], 1.2, 5, 6, 4, 4),
    "pea": Crop("Pea", "Fabaceae", "cool", "shallow", "medium", True, "low",
                ["pea_aphid", "root_rot"], 0.8, 4, 4, 7, 3),
    "lentil": Crop("Lentil", "Fabaceae", "cool", "shallow", "low", True, "low",
                   ["aphid", "wilt"], 0.9, 6, 5, 6, 4),
    "chickpea": Crop("Chickpea", "Fabaceae", "cool", "deep", "low", True, "low",
                     ["pod_borer", "wilt"], 1.0, 7, 6, 5, 5),
    "bean": Crop("Common Bean", "Fabaceae", "warm", "shallow", "medium", True, "low",
                 ["bean_beetle", "rust"], 0.8, 4, 6, 4, 3),
    "alfalfa": Crop("Alfalfa", "Fabaceae", "perennial", "very_deep", "high", True, "high",
                    ["weevil", "leafhopper"], 0.9, 7, 7, 6, 5),
    "clover": Crop("Clover", "Fabaceae", "cool", "shallow", "medium", True, "medium",
                   ["clover_rot"], 0.4, 5, 4, 7, 3),
    "vetch": Crop("Vetch", "Fabaceae", "cool", "medium", "medium", True, "high",
                  [], 0.3, 6, 5, 7, 4),

    # Oilseeds
    "canola": Crop("Canola", "Brassicaceae", "cool", "medium", "medium", False, "low",
                   ["flea_beetle", "sclerotinia"], 1.1, 5, 5, 6, 4),
    "sunflower": Crop("Sunflower", "Asteraceae", "warm", "deep", "medium", False, "low",
                      ["sunflower_moth"], 0.9, 7, 7, 4, 5),
    "flax": Crop("Flax", "Linaceae", "cool", "shallow", "medium", False, "low",
                 ["flax_bollworm"], 0.7, 5, 5, 6, 3),

    # Root/Tuber
    "potato": Crop("Potato", "Solanaceae", "cool", "shallow", "high", False, "low",
                   ["beetle", "blight"], 1.3, 4, 4, 5, 2),
    "sweet_potato": Crop("Sweet Potato", "Convolvulaceae", "warm", "medium", "medium", False, "medium",
                         ["weevil"], 1.0, 6, 8, 3, 4),
    "carrot": Crop("Carrot", "Apiaceae", "cool", "deep", "medium", False, "low",
                   ["carrot_fly"], 0.8, 5, 5, 6, 3),

    # Vegetables
    "tomato": Crop("Tomato", "Solanaceae", "warm", "medium", "high", False, "low",
                   ["hornworm", "blight"], 1.5, 4, 6, 3, 3),
    "pepper": Crop("Pepper", "Solanaceae", "warm", "shallow", "medium", False, "low",
                   ["aphid", "wilt"], 1.2, 4, 6, 3, 3),
    "lettuce": Crop("Lettuce", "Asteraceae", "cool", "shallow", "high", False, "low",
                    ["aphid", "downy_mildew"], 0.9, 3, 4, 6, 2),
    "spinach": Crop("Spinach", "Amaranthaceae", "cool", "shallow", "medium", False, "low",
                    ["leafminer"], 0.8, 4, 4, 7, 3),
    "broccoli": Crop("Broccoli", "Brassicaceae", "cool", "shallow", "medium", False, "medium",
                     ["cabbage_worm"], 1.0, 5, 4, 7, 3),
    "cabbage": Crop("Cabbage", "Brassicaceae", "cool", "shallow", "medium", False, "medium",
                    ["cabbage_worm", "clubroot"], 0.8, 5, 4, 7, 3),
    "onion": Crop("Onion", "Amaryllidaceae", "cool", "shallow", "medium", False, "low",
                  ["thrips", "downy_mildew"], 0.9, 5, 6, 5, 3),
    "garlic": Crop("Garlic", "Amaryllidaceae", "cool", "shallow", "low", False, "low",
                   ["thrips", "rust"], 1.5, 5, 5, 6, 3),

    # Cover Crops
    "rye": Crop("Cereal Rye", "Poaceae", "cool", "deep", "low", False, "high",
                [], 0.3, 8, 5, 9, 7),
    "radish": Crop("Tillage Radish", "Brassicaceae", "cool", "very_deep", "low", False, "medium",
                   [], 0.2, 6, 5, 6, 4),
    "mustard": Crop("Mustard", "Brassicaceae", "cool", "medium", "low", False, "medium",
                    [], 0.3, 5, 5, 6, 4),
    "buckwheat": Crop("Buckwheat", "Polygonaceae", "warm", "medium", "medium", False, "high",
                      [], 0.4, 4, 6, 3, 3),
}


class RotationOptimizer:
    """Optimize crop rotation sequences based on multiple objectives."""

    def __init__(
        self,
        priorities: Optional[FarmerPriorities] = None,
        climate_zone: str = "temperate",
        soil_type: str = "loam",
        available_crops: Optional[List[str]] = None,
        max_crops_per_year: int = 2,
        min_rotation_years: int = 3,
        max_rotation_years: int = 5,
    ):
        self.priorities = priorities or FarmerPriorities()
        self.priorities.normalize()
        self.climate_zone = climate_zone
        self.soil_type = soil_type
        self.max_crops_per_year = max_crops_per_year
        self.min_rotation_years = min_rotation_years
        self.max_rotation_years = max_rotation_years

        # Filter available crops
        if available_crops:
            self.crops = {k: v for k, v in CROP_DATABASE.items() if k in available_crops}
        else:
            self.crops = CROP_DATABASE.copy()

        # Climate suitability matrix
        self._build_climate_suitability()

    def _build_climate_suitability(self):
        """Build crop suitability scores for climate zone."""
        self.climate_suitability = {}

        # Define climate zone characteristics
        climate_traits = {
            "arid": {"water": "low", "heat": "high", "cold": "low", "season_length": "long"},
            "semi_arid": {"water": "low", "heat": "high", "cold": "low", "season_length": "long"},
            "mediterranean": {"water": "medium", "heat": "medium", "cold": "medium", "season_length": "medium"},
            "temperate": {"water": "medium", "heat": "medium", "cold": "high", "season_length": "medium"},
            "humid_subtropical": {"water": "high", "heat": "high", "cold": "low", "season_length": "long"},
            "tropical": {"water": "high", "heat": "high", "cold": "very_low", "season_length": "year_round"},
            "cold": {"water": "medium", "heat": "low", "cold": "very_high", "season_length": "short"},
        }

        traits = climate_traits.get(self.climate_zone, climate_traits["temperate"])

        for name, crop in self.crops.items():
            score = 50  # Base

            # Water match
            water_match = {
                ("low", "low"): 30, ("low", "medium"): 10, ("low", "high"): -20,
                ("medium", "low"): 10, ("medium", "medium"): 20, ("medium", "high"): 0,
                ("high", "low"): -10, ("high", "medium"): 0, ("high", "high"): 20,
            }
            score += water_match.get((traits["water"], crop.water_need), 0)

            # Heat tolerance
            heat_match = {
                ("high", 8): 20, ("high", 7): 15, ("high", 6): 10, ("high", 5): 0, ("high", 4): -10,
                ("medium", 8): -10, ("medium", 7): 0, ("medium", 6): 10, ("medium", 5): 15, ("medium", 4): 10,
                ("low", 8): -20, ("low", 7): -15, ("low", 6): -10, ("low", 5): 0, ("low", 4): 10,
            }
            score += heat_match.get((traits["heat"], crop.heat_tolerance), 0)

            # Cold tolerance
            cold_match = {
                ("very_high", 8): 20, ("very_high", 7): 15, ("very_high", 6): 10,
                ("high", 7): 15, ("high", 6): 10, ("high", 5): 5,
                ("medium", 6): 10, ("medium", 5): 15, ("medium", 4): 10,
                ("low", 5): 10, ("low", 4): 5,
                ("very_low", 4): 5,
            }
            score += cold_match.get((traits["cold"], crop.cold_tolerance), 0)

            self.climate_suitability[name] = max(0, min(100, score))

    def optimize(
        self,
        current_crops: List[str] = None,
        excluded_crops: List[str] = None,
        required_crops: List[str] = None,
        max_rotations: int = 20,
    ) -> List[RotationSequence]:
        """Find optimal rotation sequences.

        Args:
            current_crops: Currently grown crops (to diversify from)
            excluded_crops: Crops to exclude from rotation
            required_crops: Crops that must be included
            max_rotations: Maximum number of rotations to return

        Returns:
            List of top RotationSequence objects ranked by total score
        """
        # Determine candidate crops
        candidates = set(self.crops.keys())
        if excluded_crops:
            candidates -= set(excluded_crops)

        # Must include required crops
        required = set(required_crops) if required_crops else set()
        if not required.issubset(candidates):
            raise ValueError(f"Required crops not available: {required - candidates}")

        # Generate rotations of different lengths
        all_rotations = []

        for years in range(self.min_rotation_years, self.max_rotation_years + 1):
            # Generate valid sequences for this length
            sequences = self._generate_sequences(candidates, required, years)
            all_rotations.extend(sequences)

        # Score all rotations
        scored = []
        for seq in all_rotations:
            scores = self._score_rotation(seq, current_crops)
            seq.scores = scores
            seq.total_score = self._compute_weighted_score(scores)
            scored.append(seq)

        # Sort by total score descending
        scored.sort(key=lambda x: x.total_score, reverse=True)

        # Assign ranks and return top N
        for i, seq in enumerate(scored[:max_rotations]):
            seq.rank = i + 1

        return scored[:max_rotations]

    def _generate_sequences(
        self,
        candidates: set,
        required: set,
        years: int,
    ) -> List[RotationSequence]:
        """Generate valid crop sequences for given years."""
        sequences = []

        # For each year, we can have 1-2 crops (cool + warm season)
        # Simplified: one main crop per year
        available = list(candidates)

        # Use permutations with constraints
        # Limit to reasonable combinations to avoid explosion
        max_combos = 5000

        if len(available) <= 8:
            # Exhaustive for small sets
            for combo in itertools.permutations(available, years):
                if required.issubset(combo):
                    if self._is_valid_sequence(combo):
                        crops = [self.crops[c] for c in combo]
                        sequences.append(RotationSequence(crops=crops, years=years))
        else:
            # Heuristic sampling for larger sets
            import random
            random.seed(42)
            for _ in range(max_combos):
                combo = tuple(random.sample(available, min(years, len(available))))
                if required.issubset(combo) and self._is_valid_sequence(combo):
                    crops = [self.crops[c] for c in combo]
                    sequences.append(RotationSequence(crops=crops, years=years))

        return sequences

    def _is_valid_sequence(self, sequence: Tuple[str]) -> bool:
        """Check if sequence follows basic rotation rules."""
        # No same crop in consecutive years
        for i in range(len(sequence) - 1):
            if sequence[i] == sequence[i + 1]:
                return False

        # No same family in consecutive years (disease prevention)
        for i in range(len(sequence) - 1):
            if self.crops[sequence[i]].family == self.crops[sequence[i + 1]].family:
                return False

        # At least one legume in rotation (N fixation)
        has_legume = any(
            self.crops[c].nitrogen_fixation for c in sequence
        )
        if not has_legume and len(sequence) >= 3:
            return False

        return True

    def _score_rotation(
        self,
        rotation: RotationSequence,
        current_crops: Optional[List[str]],
    ) -> Dict[str, float]:
        """Score a rotation across all objectives."""
        crops = rotation.crops
        scores = {}

        # 1. Water Conservation Score
        scores["water_conservation"] = self._score_water(crops)

        # 2. Soil Health Score
        scores["soil_health"] = self._score_soil_health(crops)

        # 3. Profitability Score
        scores["profitability"] = self._score_profitability(crops)

        # 4. Pest Management Score
        scores["pest_management"] = self._score_pest_management(crops)

        # 5. Climate Resilience Score
        scores["climate_resilience"] = self._score_climate_resilience(crops)

        # 6. Diversification Bonus (away from current crops)
        if current_crops:
            scores["diversification"] = self._score_diversification(crops, current_crops)
        else:
            scores["diversification"] = 50

        return scores

    def _score_water(self, crops: List[Crop]) -> float:
        """Score water use efficiency of rotation."""
        water_values = {"low": 3, "medium": 2, "high": 1}
        total = sum(water_values.get(c.water_need, 2) for c in crops)
        return min(100, (total / (len(crops) * 3)) * 100)

    def _score_soil_health(self, crops: List[Crop]) -> float:
        """Score soil health improvement potential."""
        score = 50

        # Legume presence
        legume_count = sum(1 for c in crops if c.nitrogen_fixation)
        score += legume_count * 15

        # Root diversity
        root_depths = set(c.root_depth for c in crops)
        score += len(root_depths) * 5

        # Residue cover
        residue_values = {"low": 1, "medium": 2, "high": 3}
        avg_residue = np.mean([residue_values.get(c.residue_cover, 2) for c in crops])
        score += (avg_residue / 3) * 20

        # Perennial inclusion
        perennial_count = sum(1 for c in crops if c.season == "perennial")
        score += perennial_count * 10

        return min(100, score)

    def _score_profitability(self, crops: List[Crop]) -> float:
        """Score economic profitability."""
        values = [c.market_value for c in crops]
        avg_value = np.mean(values)
        # Normalize: 1.0 = 100, scale to 0-100
        return min(100, avg_value * 70)

    def _score_pest_management(self, crops: List[Crop]) -> float:
        """Score pest/disease break potential."""
        # Check for shared pests across consecutive crops
        shared_pests = 0
        for i in range(len(crops) - 1):
            pests1 = set(crops[i].pest_host)
            pests2 = set(crops[i + 1].pest_host)
            shared_pests += len(pests1 & pests2)

        # Penalize shared pests
        base_score = 80
        penalty = shared_pests * 10
        return max(0, base_score - penalty)

    def _score_climate_resilience(self, crops: List[Crop]) -> float:
        """Score climate adaptation."""
        suitabilities = [self.climate_suitability.get(c.name, 50) for c in crops]
        return np.mean(suitabilities)

    def _score_diversification(
        self, crops: List[Crop], current_crops: List[str]
    ) -> float:
        """Score how different rotation is from current practice."""
        current_names = set(current_crops)
        rotation_names = set(c.name for c in crops)

        # Jaccard distance
        intersection = current_names & rotation_names
        union = current_names | rotation_names

        if not union:
            return 50

        similarity = len(intersection) / len(union)
        # High diversification = low similarity = high score
        return (1 - similarity) * 100

    def _compute_weighted_score(self, scores: Dict[str, float]) -> float:
        """Compute weighted total score from priorities."""
        weights = self.priorities.model_dump()
        total = 0
        for key, weight in weights.items():
            if key in scores:
                total += scores[key] * weight
        return total

    def get_rotation_details(self, rotation: RotationSequence) -> Dict:
        """Get detailed breakdown of a rotation."""
        crops = rotation.crops

        return {
            "sequence": [c.name for c in crops],
            "years": rotation.years,
            "total_score": round(rotation.total_score, 1),
            "rank": rotation.rank,
            "scores": {k: round(v, 1) for k, v in rotation.scores.items()},
            "crops_detail": [
                {
                    "name": c.name,
                    "family": c.family,
                    "season": c.season,
                    "root_depth": c.root_depth,
                    "water_need": c.water_need,
                    "nitrogen_fixation": c.nitrogen_fixation,
                    "market_value": c.market_value,
                    "climate_suitability": self.climate_suitability.get(c.name, 50),
                }
                for c in crops
            ],
            "summary": self._generate_summary(crops),
        }

    def _generate_summary(self, crops: List[Crop]) -> Dict:
        """Generate human-readable summary."""
        families = set(c.family for c in crops)
        seasons = set(c.season for c in crops)
        legumes = [c.name for c in crops if c.nitrogen_fixation]

        return {
            "crop_families": len(families),
            "families_list": list(families),
            "seasons_covered": list(seasons),
            "legumes_included": legumes,
            "avg_market_value": round(np.mean([c.market_value for c in crops]), 2),
            "avg_water_need": self._avg_categorical([c.water_need for c in crops]),
            "avg_root_depth": self._avg_categorical([c.root_depth for c in crops]),
        }

    def _avg_categorical(self, values: List[str]) -> str:
        """Get most common categorical value."""
        from collections import Counter
        return Counter(values).most_common(1)[0][0]


# Pre-defined rotation templates for common systems
ROTATION_TEMPLATES = {
    "corn_soy": {
        "name": "Classic Corn-Soybean",
        "sequence": ["corn", "soybean"],
        "description": "Standard 2-year Midwest rotation",
    },
    "corn_soy_wheat": {
        "name": "Corn-Soybean-Wheat",
        "sequence": ["corn", "soybean", "wheat"],
        "description": "3-year rotation with winter wheat",
    },
    "corn_soy_wheat_alfalfa": {
        "name": "Corn-Soybean-Wheat-Alfalfa",
        "sequence": ["corn", "soybean", "wheat", "alfalfa", "alfalfa"],
        "description": "5-year with perennial forage",
    },
    "vegetable_diverse": {
        "name": "Diverse Vegetable Rotation",
        "sequence": ["tomato", "pea", "broccoli", "bean", "lettuce", "spinach"],
        "description": "6-year intensive vegetable rotation",
    },
    "cover_crop_intensive": {
        "name": "Cover Crop Intensive",
        "sequence": ["corn", "rye", "soybean", "radish", "wheat", "clover"],
        "description": "6-year with cover crops every other year",
    },
    "dryland_resilient": {
        "name": "Dryland Resilient",
        "sequence": ["sorghum", "millet", "chickpea", "sunflower"],
        "description": "4-year low-water rotation",
    },
    "organic_grain": {
        "name": "Organic Grain Rotation",
        "sequence": ["corn", "soybean", "oats", "alfalfa", "alfalfa"],
        "description": "5-year organic transition rotation",
    },
}


def get_template(template_name: str) -> Optional[Dict]:
    """Get a predefined rotation template."""
    return ROTATION_TEMPLATES.get(template_name)