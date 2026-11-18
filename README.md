# Field Shift: Adapting Farms with NASA Data

> **NASA Space Apps Challenge 2026** — *Advanced/Intermediate* — *Earth Science, Software, Arts & Multimedia*

A decision-support tool that combines NASA Earth observations with local soil data, crop characteristics, and farmer priorities to help farmers explore resilient crop rotation strategies that strengthen soil health and adapt farms to changing climate conditions.

## 🌾 The Challenge

Farmers worldwide face:
- **Shifting temperatures** and changing rainfall patterns
- **Water shortages** and increasing drought frequency
- **Extreme weather events** (floods, heatwaves, storms)
- **Declining soil health** from intensive monoculture

**Our Mission**: Build an intuitive, data-driven tool that empowers farmers to explore crop rotation strategies using NASA's Earth observation data combined with local knowledge.

##  Quick Start

### Prerequisites
- Python 3.10+
- [NASA Earthdata Login](https://urs.earthdata.nasa.gov/users/new) (free account)
- Node.js 18+ (for web frontend)

###
##  NASA Datasets Integrated

| Dataset | Source | Resolution | Variables | Access Method |
|---------|--------|------------|-----------|---------------|
| **SMAP** | NASA JPL | 9 km / 1 km | Soil moisture (surface/root zone), freeze/thaw | `earthaccess`, Harmony, Direct HTTPS |
| **NASA-USDA Soil Moisture** | GSFC/USDA | 0.25° | Global agricultural soil moisture | HTTPS/THREDDS |
| **Crop-CASMA** | USDA/NASA | 1 km | Crop condition, soil moisture anomalies | REST API |
| **MODIS (Terra/Aqua)** | NASA | 250m–1km | NDVI, EVI, LST, Land Cover, LAI, FPAR | `earthaccess`, LAADS DAAC |
| **Landsat 8/9** | USGS/NASA | 30 m | Surface reflectance, NDVI, ET, crop health | `earthaccess`, AWS PDS |
| **GPM/IMERG** | NASA/JAXA | 0.1° / 30 min | Precipitation rate, accumulation | `earthaccess`, GES DISC |
| **ECOSTRESS** | NASA JPL | 70 m | Evapotranspiration, water stress, LST | `earthaccess`, LP DAAC |
| **OpenET** | NASA/USGS/DRI | 30 m | Field-scale evapotranspiration | REST API |
| **ATLAS/ICESat-2 ATL24** | NSIDC | Along-track | Coastal bathymetry, seafloor height | `earthaccess`, `icepyx`, SlideRule |

##  Project Structure

```
nasa-space-apps-2026/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/               # API routes
│   │   ├── core/              # Config, security
│   │   ├── models/            # Pydantic models
│   │   ├── services/          # Data access services
│   │   │   ├── nasa_earthdata.py
│   │   │   ├── smap.py
│   │   │   ├── modis.py
│   │   │   ├── landsat.py
│   │   │   ├── crop_casma.py
│   │   │   ├── gpm.py
│   │   │   ├── ecostress.py
│   │   │   ├── openet.py
│   │   │   └── atl24.py
│   │   ├── ml/                # ML models for crop rotation
│   │   │   ├── soil_health.py
│   │   │   ├── rotation_optimizer.py
│   │   │   └── yield_predictor.py
│   │   └── utils/
│   ├── tests/
│   └── requirements.txt
├── frontend/                   # React + Vite + TypeScript
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/             # Page components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API clients
│   │   ├── stores/            # State management (Zustand)
│   │   ├── types/             # TypeScript types
│   │   └── utils/
│   ├── public/
│   └── package.json
├── data/                       # Data pipelines & scripts
│   ├── scripts/
│   │   ├── download_smap.py
│   │   ├── download_modis.py
│   │   ├── download_landsat.py
│   │   ├── download_gpm.py
│   │   ├── download_ecostress.py
│   │   ├── download_atl24.py
│   │   └── process_crop_casma.py
│   ├── pipelines/
│   │   ├── soil_moisture_pipeline.py
│   │   ├── vegetation_index_pipeline.py
│   │   └── precipitation_pipeline.py
│   └── cache/                 # Local data cache (gitignored)
├── notebooks/                  # Jupyter exploration notebooks
│   ├── 01_data_exploration.ipynb
│   ├── 02_soil_moisture_analysis.ipynb
│   ├── 03_crop_rotation_modeling.ipynb
│   └── 04_dashboard_prototype.ipynb
├── docs/                       # Documentation
│   ├── architecture.md
│   ├── data_sources.md
│   ├── api_reference.md
│   └── deployment.md
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   └── docker-compose.yml
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── .env.example
├── .gitignore
├── requirements.txt
├── pyproject.toml
└── README.md
```

##  Data Access Layer

All NASA data access is abstracted behind clean service interfaces:

```python
# Example: Accessing SMAP soil moisture
from backend.app.services.smap import SMAPService

smap = SMAPService()
data = smap.get_soil_moisture(
    bbox=[-122.5, 37.5, -121.5, 38.5],  # San Francisco Bay Area
    start_date="2024-01-01",
    end_date="2024-12-31",
    variable="soil_moisture_am"  # Morning pass
)

# Example: Crop rotation optimization
from backend.app.ml.rotation_optimizer import CropRotationOptimizer

optimizer = CropRotationOptimizer()
recommendations = optimizer.optimize(
    location=(37.7749, -122.4194),
    current_crops=["corn", "soybean"],
    soil_type="clay_loam",
    climate_zone="mediterranean",
    farmer_priorities={"water_conservation": 0.4, "profit": 0.3, "soil_health": 0.3}
)
```

## 🌐 Web Application

Modern, responsive farmer-facing dashboard built with:
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** for clean, accessible UI
- **MapLibre GL** for interactive maps
- **Recharts** / **Chart.js** for data visualization
- **Zustand** for lightweight state management
- **React Query** for server state

### Key Features
-  **Interactive Farm Mapping** — Draw field boundaries, view NASA data layers
- 📈 **Soil Health Dashboard** — Real-time moisture, vegetation, stress indicators
- 🔄 **Crop Rotation Explorer** — Compare rotation scenarios with projected outcomes
- 💧 **Water Management** — Irrigation scheduling based on SMAP + GPM + OpenET
- 📱 **Mobile-First** — Works in the field on phone/tablet
- 🌍 **Multi-language** — English, Spanish, French (extensible)

##  Machine Learning Models

| Model | Purpose | Input Features | Output |
|-------|---------|----------------|--------|
| **Soil Health Index** | Composite soil health score | SMAP, MODIS, soil texture, OM, pH | 0–100 score + factors |
| **Rotation Optimizer** | Recommend optimal crop sequences | Climate, soil, market, farmer prefs | Ranked rotations + metrics |
| **Yield Predictor** | Estimate yields per crop/rotation | Historical yields, weather, soil, mgmt | Yield distribution + risk |
| **Water Stress Detector** | Early warning for drought stress | ECOSTRESS, SMAP, GPM, NDVI | Stress level + lead time |

##  Documentation

- [Architecture Overview](docs/architecture.md)
- [Data Sources & Access](docs/data_sources.md)
- [API Reference](docs/api_reference.md)
- [Deployment Guide](docs/deployment.md)

##  Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

##  License

This project is licensed under the MIT License — see [LICENSE](LICENSE) for details.

##  Acknowledgments

- **NASA Earth Science Division** for open data access
- **NSIDC DAAC** for ICESat-2 ATL24 data
- **USDA NASS** for Crop-CASMA collaboration
- **Space Apps Challenge** organizers and community
- All open-source contributors



**Built for NASA Space Apps Challenge 2026** — *Field Shift: Adapting Farms with NASA Data*

*Empowering farmers with Earth observation data for a more resilient agricultural future.*
