"""Reports API Routes.

Endpoints for analysis history and farm diagnostic reports.
"""

from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field

from app.api.routes.data import farm_store, collection_store

router = APIRouter(prefix="/reports", tags=["Reports"])


def _polygon_area_label(geometry: Optional[Dict[str, Any]]) -> str:
    """Approximate polygon area in hectares from lon/lat rings."""
    import math
    ring = ((geometry or {}).get("coordinates") or [[]])[0]
    if len(ring) < 4:
        return "N/A"
    lat = ring[0][1]
    meters_lat = 111_320
    meters_lon = 111_320 * math.cos(math.radians(lat))
    area = 0.0
    for (x1, y1), (x2, y2) in zip(ring, ring[1:]):
        area += (x1 * meters_lon) * (y2 * meters_lat) - (x2 * meters_lon) * (y1 * meters_lat)
    hectares = abs(area) / 2 / 10_000
    return f"{hectares:.1f} ha"


def _farm_identity(farm: Dict[str, Any]) -> Dict[str, str]:
    centroid = farm.get("centroid") or {}
    lat = centroid.get("latitude", centroid.get("lat", 0)) or 0
    lon = centroid.get("longitude", centroid.get("lon", 0)) or 0
    crops = farm.get("crops_of_interest") or []
    return {
        "location": farm.get("description") or f"{lat:.2f}°, {lon:.2f}°",
        "area": _polygon_area_label(farm.get("geometry")),
        "crop": str(crops[0]).capitalize() if crops else "Non défini",
    }


def _top_crop_names(suitability: Dict[str, Any]) -> str:
    names = []
    for row in (suitability or {}).get("ranked_crops") or []:
        names.append(row.get("crop") if isinstance(row, dict) else str(row))
    label = ", ".join(name for name in names[:3] if name)
    return label or "N/A"


class AnalysisRecord(BaseModel):
    """Response model for analysis history records."""
    id: str
    farm_id: str
    farm_name: str
    type: str
    type_label: str
    type_icon: str
    type_color: str
    date: str
    period: str
    status: str
    score: Optional[int] = None
    summary: str
    data_sources: List[str] = []


@router.get("/history", response_model=List[AnalysisRecord])
async def get_analysis_history(
    farm_id: Optional[str] = Query(None, description="Filter by farm ID"),
    type: Optional[str] = Query(None, description="Filter by analysis type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    period: Optional[str] = Query(None, description="Filter by period (last-week, last-month, last-quarter, last-year, all)"),
) -> List[AnalysisRecord]:
    """
    Get analysis history across all farms or for a specific farm.

    This builds analysis records from:
    - Data collection jobs (collection_store)
    - ML analysis endpoints (soil-health, rotation, yield, water-stress)
    """
    records = []

    # Build filters
    date_cutoff = None
    if period and period != "all":
        now = datetime.utcnow()
        if period == "last-week":
            date_cutoff = now - timedelta(weeks=1)
        elif period == "last-month":
            date_cutoff = now - timedelta(weeks=4)
        elif period == "last-quarter":
            date_cutoff = now - timedelta(weeks=12)
        elif period == "last-year":
            date_cutoff = now - timedelta(weeks=52)

    # Type filter mapping
    type_labels = {
        "diagnostic": {"label": "Diagnostic global", "icon": "FileText", "color": "bg-blue-100 text-blue-700"},
        "vegetation": {"label": "Végétation (NDVI)", "icon": "Leaf", "color": "bg-green-100 text-green-700"},
        "water-stress": {"label": "Stress hydrique", "icon": "AlertTriangle", "color": "bg-red-100 text-red-700"},
        "rotation": {"label": "Rotation culturale", "icon": "GitBranch", "color": "bg-purple-100 text-purple-700"},
        "yield": {"label": "Prédiction rendement", "icon": "TrendingUp", "color": "bg-yellow-100 text-yellow-700"},
        "soil-health": {"label": "Santé du sol", "icon": "Leaf", "color": "bg-amber-100 text-amber-700"},
    }

    # Process each collection as an analysis record
    for collection in collection_store.values():
        # Apply farm_id filter
        if farm_id and collection.farm_id != farm_id:
            continue

        # Apply date filter
        if date_cutoff and collection.collected_at < date_cutoff:
            continue

        # Determine analysis types from sources
        source_types = []
        if "nasa_power" in collection.sources:
            source_types.append("diagnostic")
        if "sentinel2" in collection.sources or "landsat" in collection.sources or "modis" in collection.sources:
            source_types.append("vegetation")
        if "smap" in collection.sources or "crop_casma" in collection.sources:
            source_types.append("soil-health")
        if "gpm" in collection.sources or "ecostress" in collection.sources or "openet" in collection.sources:
            source_types.append("water-stress")
        if "gaez" in collection.sources:
            source_types.append("yield")

        # If no specific types, default to diagnostic
        if not source_types:
            source_types = ["diagnostic"]

        # Apply type filter
        if type and type not in source_types:
            continue

        # Determine overall status
        statuses = [r.status.value for r in collection.sources.values()]
        if all(s == "success" for s in statuses):
            overall_status = "completed"
        elif any(s == "failed" for s in statuses):
            overall_status = "failed"
        elif any(s == "unavailable" for s in statuses):
            overall_status = "completed"  # Completed with gaps
        else:
            overall_status = "completed"

        # Apply status filter
        if status and status != overall_status:
            continue

        # Collect data sources
        source_display = {
            "nasa_power": "NASA POWER",
            "sentinel2": "Sentinel-2",
            "landsat": "Landsat 8/9",
            "modis": "MODIS",
            "gpm": "GPM IMERG",
            "smap": "SMAP",
            "ecostress": "ECOSTRESS",
            "openet": "OpenET",
            "atl24": "ICESat-2",
            "icesat2": "ICESat-2",
            "crop_casma": "Crop-CASMA",
            "gaez": "FAO GAEZ",
        }
        data_sources = [
            source_display.get(name, name)
            for name, result in collection.sources.items()
            if result.data is not None
        ]

        # Calculate a score based on successful sources
        successful = len([r for r in collection.sources.values() if r.status.value == "success"])
        total = len(collection.sources)
        score = int((successful / total * 100)) if total > 0 else 0

        # Build summary
        source_names = [source_display.get(name, name) for name in collection.sources.keys() if collection.sources[name].data is not None]
        summary = f"Analyse avec {', '.join(source_names) if source_names else 'données limitées'} - {successful}/{total} sources réussies"

        # Period string
        period_str = f"{collection.period_start.strftime('%d/%m/%Y')} - {collection.period_end.strftime('%d/%m/%Y')}"

        # Create record for each type (could also just create one per collection)
        for st in source_types:
            if type and st != type:
                continue

            t = type_labels.get(st, {"label": st.capitalize(), "icon": "FileText", "color": "bg-gray-100 text-gray-700"})

            records.append(AnalysisRecord(
                id=collection.collection_id[:8].upper(),
                farm_id=collection.farm_id,
                farm_name=collection.farm_name,
                type=st,
                type_label=t["label"],
                type_icon=t["icon"],
                type_color=t["color"],
                date=collection.collected_at.isoformat(),
                period=period_str,
                status=overall_status,
                score=score,
                summary=summary,
                data_sources=data_sources,
            ))

    # Sort by date descending (most recent first)
    records.sort(key=lambda r: r.date, reverse=True)

    return records


class DiagnosticReport(BaseModel):
    """Response model for farm diagnostic report - matches frontend DiagnosticData interface."""
    farm_name: str
    location: str
    area: str
    crop: str
    soil_type: str
    overall_score: int
    sections: List[Dict[str, Any]]  # DiagnosticSection[]
    strategies: List[Dict[str, Any]]  # AdaptationStrategy[]
    assessment_date: str
    data_sources: List[str]
    spatial_resolution: str


@router.get("/diagnostic/{farm_id}", response_model=DiagnosticReport)
async def get_farm_diagnostic(
    farm_id: str,
    start_date: Optional[str] = Query(None, description="Start date for analysis (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date for analysis (YYYY-MM-DD)"),
) -> DiagnosticReport:
    """
    Get comprehensive farm diagnostic report (Global Farm Resilience).

    This aggregates data from all available sources to provide a holistic
    view of farm health and resilience.
    """
    if farm_id not in farm_store:
        raise HTTPException(status_code=404, detail="Farm not found")

    farm = farm_store[farm_id]

    # Find latest collection for this farm
    farm_collections = [
        c for c in collection_store.values()
        if c.farm_id == farm_id
    ]

    if not farm_collections:
        # Return default/empty diagnostic
        identity = _farm_identity(farm)
        return DiagnosticReport(
            farm_name=farm["name"],
            location=identity["location"],
            area=identity["area"],
            crop=identity["crop"],
            soil_type="Non défini",
            overall_score=0,
            sections=[],
            strategies=[],
            assessment_date=datetime.utcnow().isoformat(),
            data_sources=[],
            spatial_resolution="N/A",
        )

    latest_collection = max(farm_collections, key=lambda c: c.collected_at)

    # Extract data from collection sources
    climate_data = {}
    soil_data = {}
    vegetation_data = {}
    water_data = {}
    crop_suitability_data = {}
    data_sources = []

    for name, source in latest_collection.sources.items():
        if source.data is None:
            continue

        data_sources.append(name)

        if name == "nasa_power" and "summary" in source.data:
            climate_data = source.data["summary"]
        elif name == "crop_casma" and source.data:
            soil_data = source.data
        elif name in ["sentinel2", "landsat", "modis"] and "latest_image" in source.data:
            latest = source.data["latest_image"]
            if latest and "metadata" in latest:
                vegetation_data = {
                    "latest_acquisition": latest["metadata"].get("datetime"),
                    "cloud_cover": latest["metadata"].get("cloud_cover"),
                    "indices": source.data.get("indices", {}),
                }
        elif name in ["gpm", "ecostress", "openet"] and source.data:
            if name == "gpm" and "data" in source.data:
                water_data["precipitation"] = source.data["data"].get("daily_precipitation", {})
            elif name == "ecostress":
                water_data["et"] = source.data.get("data", {}).get("et", {})
                water_data["water_stress"] = source.data.get("data", {}).get("water_stress", {})
            elif name == "openet":
                water_data["et_openet"] = source.data.get("data", {})
        elif name == "gaez" and "suitability" in source.data:
            crop_suitability_data = source.data["suitability"]

    # Compute scores
    # Climate score: based on temperature stability, adequate precipitation
    climate_score = 50
    if climate_data:
        temp = climate_data.get("temperature", {}).get("mean_c", 20)
        precip = climate_data.get("precipitation", {}).get("total_mm", 500)

        if 15 <= temp <= 30:
            climate_score += 20
        if 400 <= precip <= 1000:
            climate_score += 20
        if climate_data.get("humidity", {}).get("mean_percent", 60) >= 50:
            climate_score += 10

    # Soil score: based on soil moisture availability
    soil_score = 50
    if soil_data:
        soil_score += 20  # Has soil data
        if "surface" in soil_data and "time_series" in soil_data["surface"]:
            sm_series = soil_data["surface"]["time_series"]
            if "mean" in sm_series and sm_series["mean"] > 0.2:
                soil_score += 20
            if "mean" in sm_series and sm_series["mean"] > 0.3:
                soil_score += 10

    # Vegetation score: based on NDVI availability and values
    vegetation_score = 50
    if vegetation_data:
        vegetation_score += 20
        if vegetation_data.get("indices", {}).get("ndvi", {}).get("mean", 0) > 0.3:
            vegetation_score += 20
        if vegetation_data.get("cloud_cover", 100) < 30:
            vegetation_score += 10

    # Water score: based on precipitation and ET data
    water_score = 50
    if water_data:
        water_score += 20
        if water_data.get("precipitation", {}).get("total_mm", 0) > 300:
            water_score += 20
        if "et" in water_data:
            water_score += 10

    # Crop suitability score: based on GAEZ data
    crop_suitability_score = 50
    if crop_suitability_data:
        crop_suitability_score += 20
        top_crops = crop_suitability_data.get("ranked_crops", [])
        if top_crops and len(top_crops) > 0:
            crop_suitability_score += 20
        if top_crops and len(top_crops) >= 3:
            crop_suitability_score += 10

    # Resilience score: composite of all
    resilience_score = int((
        climate_score * 0.2 +
        soil_score * 0.25 +
        vegetation_score * 0.2 +
        water_score * 0.2 +
        crop_suitability_score * 0.15
    ))

    # Overall score
    overall_score = resilience_score

    # Determine overall status
    if overall_score >= 80:
        overall_status = "excellent"
    elif overall_score >= 65:
        overall_status = "good"
    elif overall_score >= 50:
        overall_status = "fair"
    elif overall_score >= 35:
        overall_status = "poor"
    else:
        overall_status = "critical"

    # Generate recommendations
    recommendations = []
    alerts = []

    if climate_score < 50:
        recommendations.append("Surveiller les conditions climatiques - envisager des cultures plus résistantes")
        alerts.append("Conditions climatiques sous-optimales")

    if soil_score < 50:
        recommendations.append("Améliorer la santé du sol - rotation avec légumineuses, amendements organiques")
        alerts.append("Humidité du sol faible")

    if vegetation_score < 50:
        recommendations.append("Vérifier le développement végétatif - possible stress hydrique ou nutritif")
        alerts.append("Indice de végétation faible")

    if water_score < 50:
        recommendations.append("Optimiser l'irrigation - consulter les données ECOSTRESS/OpenET")
        alerts.append("Stress hydrique potentiel")

    if crop_suitability_score < 50:
        recommendations.append("Réévaluer les cultures - consulter GAEZ pour cultures adaptées")
        alerts.append("Adaptation culturale limitée")

    if not recommendations:
        recommendations.append("Exploitation en bonne santé - maintenir les pratiques actuelles")

    if not alerts:
        alerts.append("Aucune alerte majeure")

    # Build sections for frontend
    sections = [
        {
            "id": "climate",
            "title": "Climat",
            "icon": "Sun",
            "color": "bg-yellow-100",
            "status": "good" if climate_score >= 65 else "warning" if climate_score >= 40 else "info",
            "score": climate_score,
            "items": [
                {"label": "Température moyenne", "value": f"{climate_data.get('temperature', {}).get('mean_c', 'N/A')}°C" if climate_data else "N/A", "unit": "°C", "status": "good" if climate_data and 15 <= climate_data.get('temperature', {}).get('mean_c', 20) <= 30 else "warning"},
                {"label": "Précipitations totales", "value": f"{climate_data.get('precipitation', {}).get('total_mm', 'N/A')} mm" if climate_data else "N/A", "unit": "mm", "status": "good" if climate_data and climate_data.get('precipitation', {}).get('total_mm', 0) >= 400 else "warning"},
                {"label": "Humidité moyenne", "value": f"{climate_data.get('humidity', {}).get('mean_percent', 'N/A')}%" if climate_data else "N/A", "unit": "%", "status": "good" if climate_data and climate_data.get('humidity', {}).get('mean_percent', 0) >= 50 else "warning"},
                {"label": "Rayonnement solaire", "value": f"{climate_data.get('radiation', {}).get('mean_mj_m2_day', 'N/A')} MJ/m²/j" if climate_data else "N/A", "unit": "MJ/m²/j", "status": "info"},
            ],
            "risks": [{"type": "warning", "title": "Température sous-optimale", "desc": "La température moyenne sort de la plage idéale pour la culture", "value": f"{climate_data.get('temperature', {}).get('mean_c', 'N/A')}°C"}] if climate_data and (climate_data.get('temperature', {}).get('mean_c', 20) < 15 or climate_data.get('temperature', {}).get('mean_c', 20) > 30) else [],
        },
        {
            "id": "soil",
            "title": "Sol",
            "icon": "Leaf",
            "color": "bg-amber-100",
            "status": "good" if soil_score >= 65 else "warning" if soil_score >= 40 else "info",
            "score": soil_score,
            "items": [
                {"label": "Humidité surface", "value": f"{soil_data.get('surface', {}).get('time_series', {}).get('mean', 'N/A'):.3f}" if soil_data and soil_data.get('surface', {}).get('time_series', {}).get('mean') else "N/A", "unit": "m³/m³", "status": "good" if soil_data and soil_data.get('surface', {}).get('time_series', {}).get('mean', 0) > 0.25 else "warning"},
                {"label": "Humidité zone racinaire", "value": f"{soil_data.get('rootzone', {}).get('time_series', {}).get('mean', 'N/A'):.3f}" if soil_data and soil_data.get('rootzone', {}).get('time_series', {}).get('mean') else "N/A", "unit": "m³/m³", "status": "good" if soil_data and soil_data.get('rootzone', {}).get('time_series', {}).get('mean', 0) > 0.3 else "warning"},
                {"label": "Anomalie d'humidité", "value": f"{soil_data.get('anomaly', {}).get('surface', 'N/A'):.3f}" if soil_data and soil_data.get('anomaly', {}).get('surface') else "N/A", "unit": "m³/m³", "status": "info"},
            ],
            "risks": [{"type": "warning", "title": "Humidité du sol faible", "desc": "L'humidité de surface est inférieure au seuil critique", "value": f"{soil_data.get('surface', {}).get('time_series', {}).get('mean', 'N/A')}"}] if soil_data and soil_data.get('surface', {}).get('time_series', {}).get('mean', 1) < 0.2 else [],
        },
        {
            "id": "vegetation",
            "title": "Végétation",
            "icon": "Leaf",
            "color": "bg-green-100",
            "status": "good" if vegetation_score >= 65 else "warning" if vegetation_score >= 40 else "info",
            "score": vegetation_score,
            "items": [
                {"label": "NDVI moyen", "value": f"{vegetation_data.get('indices', {}).get('ndvi', {}).get('mean', 'N/A'):.3f}" if vegetation_data and vegetation_data.get('indices', {}).get('ndvi', {}).get('mean') else "N/A", "unit": "indice", "status": "good" if vegetation_data and vegetation_data.get('indices', {}).get('ndvi', {}).get('mean', 0) > 0.4 else "warning"},
                {"label": "EVI moyen", "value": f"{vegetation_data.get('indices', {}).get('evi', {}).get('mean', 'N/A'):.3f}" if vegetation_data and vegetation_data.get('indices', {}).get('evi', {}).get('mean') else "N/A", "unit": "indice", "status": "info"},
                {"label": "Dernière acquisition", "value": vegetation_data.get('latest_acquisition', 'N/A')[:10] if vegetation_data else "N/A", "unit": "date", "status": "info"},
                {"label": "Couverture nuageuse", "value": f"{vegetation_data.get('cloud_cover', 'N/A'):.1f}%" if vegetation_data and vegetation_data.get('cloud_cover') is not None else "N/A", "unit": "%", "status": "good" if vegetation_data and vegetation_data.get('cloud_cover', 100) < 30 else "warning"},
            ],
            "risks": [{"type": "warning", "title": "Faible activité végétative", "desc": "L'indice NDVI indique un développement végétatif limité", "value": f"{vegetation_data.get('indices', {}).get('ndvi', {}).get('mean', 'N/A')}"}] if vegetation_data and vegetation_data.get('indices', {}).get('ndvi', {}).get('mean', 1) < 0.3 else [],
        },
        {
            "id": "water",
            "title": "Ressources en eau",
            "icon": "Droplet",
            "color": "bg-blue-100",
            "status": "good" if water_score >= 65 else "warning" if water_score >= 40 else "info",
            "score": water_score,
            "items": [
                {"label": "Précipitations", "value": f"{water_data.get('precipitation', {}).get('total_mm', 'N/A')} mm" if water_data and water_data.get('precipitation', {}).get('total_mm') else "N/A", "unit": "mm", "status": "good" if water_data and water_data.get('precipitation', {}).get('total_mm', 0) > 300 else "warning"},
                {"label": "Évapotranspiration", "value": f"{water_data.get('et', {}).get('mean', 'N/A'):.2f} mm/j" if water_data and water_data.get('et', {}).get('mean') else "N/A", "unit": "mm/j", "status": "info"},
                {"label": "Indice de stress hydrique", "value": f"{water_data.get('water_stress', {}).get('mean', 'N/A'):.3f}" if water_data and water_data.get('water_stress', {}).get('mean') else "N/A", "unit": "indice", "status": "warning" if water_data and water_data.get('water_stress', {}).get('mean', 0) > 0.5 else "good"},
            ],
            "risks": [{"type": "warning", "title": "Stress hydrique détecté", "desc": "L'indice de stress hydrique dépasse le seuil critique", "value": f"{water_data.get('water_stress', {}).get('mean', 'N/A')}"}] if water_data and water_data.get('water_stress', {}).get('mean', 0) > 0.5 else [],
        },
        {
            "id": "crop_suitability",
            "title": "Adaptation culturale",
            "icon": "Target",
            "color": "bg-purple-100",
            "status": "good" if crop_suitability_score >= 65 else "warning" if crop_suitability_score >= 40 else "info",
            "score": crop_suitability_score,
            "items": [
                {"label": "Cultures les plus adaptées", "value": _top_crop_names(crop_suitability_data), "unit": "cultures", "status": "info"},
                {"label": "Indice d'adaptation", "value": f"{crop_suitability_data.get('suitability_index', 'N/A')}" if crop_suitability_data else "N/A", "unit": "score", "status": "info"},
                {"label": "Potentiel de rendement", "value": f"{crop_suitability_data.get('yield_potential', 'N/A')} t/ha" if crop_suitability_data and crop_suitability_data.get('yield_potential') else "N/A", "unit": "t/ha", "status": "info"},
            ],
            "risks": [{"type": "info", "title": "Données d'adaptation limitées", "desc": "L'extraction des données GAEZ n'est pas encore implémentée", "value": "Non disponible"}] if not crop_suitability_data else [],
        },
    ]

    # Build adaptation strategies
    strategies = []
    if climate_score < 65:
        strategies.append({
            "id": "strat_climate",
            "title": "Adaptation variétale au climat",
            "category": "Gestion climatique",
            "priority": "high" if climate_score < 50 else "medium",
            "description": "Sélectionner des variétés à cycle plus court ou plus tolérantes aux températures extrêmes observées.",
            "benefits": ["Réduction risque climatique", "Maintien du rendement", "Moins d'intrants"],
            "confidence": 80,
            "sources": ["NASA POWER", "Literature agronomique"],
        })
    if soil_score < 65:
        strategies.append({
            "id": "strat_soil",
            "title": "Amélioration structurelle du sol",
            "category": "Santé du sol",
            "priority": "high" if soil_score < 50 else "medium",
            "description": "Introduire des cultures de couverture à racines profondes et augmenter la matière organique par amendements.",
            "benefits": ["Meilleure rétention d'eau", "Augmentation fertilité", "Réduction érosion"],
            "confidence": 85,
            "sources": ["Crop-CASMA", "Literature agronomique"],
        })
    if vegetation_score < 65:
        strategies.append({
            "id": "strat_veg",
            "title": "Optimisation nutritionnelle",
            "category": "Nutrition",
            "priority": "medium",
            "description": "Réaliser une analyse de sol et ajuster la fertilisation selon les besoins réels de la culture.",
            "benefits": ["Meilleur développement végétatif", "Optimisation coûts intrants", "Réduction impact environnemental"],
            "confidence": 75,
            "sources": ["Sentinel-2/Landsat NDVI", "Literature agronomique"],
        })
    if water_score < 65:
        strategies.append({
            "id": "strat_water",
            "title": "Gestion de l'irrigation de précision",
            "category": "Gestion de l'eau",
            "priority": "high" if water_score < 50 else "medium",
            "description": "Utiliser les données ECOSTRESS/OpenET pour piloter l'irrigation au plus juste selon le stress réel.",
            "benefits": ["Économie d'eau 20-30%", "Réduction stress hydrique", "Optimisation rendement"],
            "confidence": 80,
            "sources": ["ECOSTRESS", "OpenET", "Literature agronomique"],
        })
    if crop_suitability_score < 65:
        strategies.append({
            "id": "strat_crop",
            "title": "Diversification culturale",
            "category": "Choix des cultures",
            "priority": "medium",
            "description": "Intégrer dans la rotation les cultures identifiées comme les plus adaptées par GAEZ pour la zone.",
            "benefits": ["Meilleure adaptation pédoclimatique", "Réduction risques", "Diversification revenus"],
            "confidence": 70,
            "sources": ["FAO GAEZ", "Literature agronomique"],
        })

    # Default strategies if all scores are good
    if not strategies:
        strategies = [
            {
                "id": "strat_maintain",
                "title": "Maintien des pratiques actuelles",
                "category": "Gestion globale",
                "priority": "low",
                "description": "L'exploitation présente une bonne résilience globale. Continuer le monitoring régulier.",
                "benefits": ["Stabilité du système", "Faible coût", "Durabilité"],
                "confidence": 90,
                "sources": ["Monitoring continu"],
            }
        ]

    # Determine farm info
    identity = _farm_identity(farm)

    return DiagnosticReport(
        farm_name=farm["name"],
        location=identity["location"],
        area=identity["area"],
        crop=identity["crop"],
        soil_type="Loam (estimé)",  # Would come from soil data
        overall_score=overall_score,
        sections=sections,
        strategies=strategies,
        assessment_date=datetime.utcnow().isoformat(),
        data_sources=data_sources,
        spatial_resolution="30m - 9km (multi-source)",
    )