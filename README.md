# Field Shift: Adapting Farms with NASA Data

> **NASA Space Apps Challenge 2026** — Decision-support tool combining NASA Earth observations with local soil data, crop characteristics, and farmer priorities to explore resilient crop rotation strategies.

[![Build Status](https://github.com/your-org/field-shift/workflows/CI/CD%20Pipeline/badge.svg)](https://github.com/your-org/field-shift/actions)
[![Security Scan](https://github.com/your-org/field-shift/workflows/Security%20Scan/badge.svg)](https://github.com/your-org/field-shift/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Field Shift helps farmers and agronomists make data-driven decisions about crop rotations by integrating multi-source NASA satellite data with local farm conditions. The platform provides:

- **Soil Health Analysis** — Composite index (0-100) from SMAP, MODIS, Landsat, and GPM data
- **Crop Rotation Optimizer** — Multi-objective optimization balancing profit, soil health, water conservation, and risk
- **Yield Prediction** — Physics-based and ML models with uncertainty quantification
- **Water Stress Monitoring** — Early warning system using ECOSTRESS, SMAP, and GPM data
- **Interactive Field Mapping** — MapLibre GL visualization with NASA data layers

## Data Sources

| Source | Data Type | Resolution | Access |
|--------|-----------|------------|--------|
| **NASA POWER** | Climate (temp, precip, humidity, radiation, wind) | 0.5° daily | Open |
| **Sentinel-2 (MSI)** | Surface reflectance, NDVI, EVI, SAVI | 10-60m, 5-day | Copernicus (OAuth2) |
| **Landsat 8/9** | Surface reflectance, LST, spectral indices | 30m, 16-day | USGS STAC |
| **GPM IMERG** | Precipitation (half-hourly/daily) | 0.1° | GES DISC |
| **SMAP** | Surface & root-zone soil moisture | 9km, 2-3 day | NSIDC/AppEEARS |
| **ECOSTRESS** | ET, water stress, ESI | 70m, irregular | LP DAAC |
| **FAO GAEZ v4** | Crop suitability, yield potential | 5 arc-min | Open |

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend      │────▶│   Backend API    │────▶│  Data Connectors │
│   (React/TS)    │     │   (FastAPI)      │     │  (NASA/FAO)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                              │
                    ┌─────────┼─────────┐
                    ▼         ▼         ▼
               ┌────────┐ ┌────────┐ ┌────────┐
               │Postgres│ │ Redis  │ │ ML     │
               │(Farms) │ │(Cache) │ │Models  │
               └────────┘ └────────┘ └────────┘
```

### Backend (FastAPI)
- **Modular connector architecture** — Independent modules per data source
- **Async data collection** — Concurrent fetching with graceful degradation
- **In-memory TTL cache** — Reduces API calls to NASA services
- **Pydantic models** — Type-safe request/response validation
- **ML models** — Physics-based fallbacks when training data unavailable

### Frontend (React + Vite + TypeScript)
- **Zustand** — Client state (auth, farms, UI)
- **TanStack Query** — Server state with caching & polling
- **MapLibre GL** — Interactive field mapping
- **Tailwind CSS** — Responsive, accessible UI components
- **Chart.js / Recharts** — Data visualization

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for frontend development)
- Python 3.11+ (for backend development)
- NASA Earthdata credentials (for authenticated data sources)

### Using Docker (Recommended)

```bash
# Clone the repository
git clone https://github.com/your-org/field-shift.git
cd field-shift

# Copy environment template and configure credentials
cp backend/.env.example .env
# Edit .env with your NASA Earthdata, Copernicus, USGS credentials

# Start all services
docker-compose up -d

# Access the application
# Frontend: http://localhost
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Development Mode

```bash
# Backend
cd backend
cp .env.example .env
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend (in separate terminal)
cd frontend
npm install
npm run dev

# With hot reload via Docker
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up
```

## Configuration

### Environment Variables

Create `.env` from `backend/.env.example`:

```env
# NASA Earthdata (required for SMAP, GPM, ECOSTRESS, Landsat)
EARTHDATA_USERNAME=your_username
EARTHDATA_PASSWORD=your_password

# Copernicus Data Space (required for Sentinel-2)
COPERNICUS_USERNAME=your_username
COPERNICUS_PASSWORD=your_password

# USGS (required for Landsat)
USGS_USERNAME=your_username
USGS_PASSWORD=your_password

# Database & Cache
DATABASE_URL=postgresql://postgres:postgres@db:5432/fieldshift
REDIS_URL=redis://redis:6379/0

# App
APP_ENV=production
DEBUG=false
CACHE_TTL=3600
```

### Getting Credentials

1. **NASA Earthdata** — Register at [urs.earthdata.nasa.gov](https://urs.earthdata.nasa.gov)
2. **Copernicus Data Space** — Register at [dataspace.copernicus.eu](https://dataspace.copernicus.eu)
3. **USGS EarthExplorer** — Register at [earthexplorer.usgs.gov](https://earthexplorer.usgs.gov)

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`
- **OpenAPI JSON**: `http://localhost:8000/openapi.json`

### Key Endpoints

```
POST   /api/v1/data/farms              # Create farm
GET    /api/v1/data/farms              # List farms
GET    /api/v1/data/farms/{id}         # Get farm
DELETE /api/v1/data/farms/{id}         # Delete farm

POST   /api/v1/data/collect            # Trigger data collection
GET    /api/v1/data/collect/{id}/status # Poll collection status
GET    /api/v1/data/collect/{id}/summary # Dashboard summary

GET    /api/v1/data/sources            # List available data sources

POST   /api/v1/analysis/soil-health    # Soil health analysis
POST   /api/v1/analysis/rotation       # Crop rotation optimization
POST   /api/v1/analysis/yield          # Yield prediction
POST   /api/v1/analysis/water-stress   # Water stress analysis
```

## Project Structure

```
field-shift/
├── backend/
│   ├── app/
│   │   ├── api/routes/           # FastAPI route handlers
│   │   ├── connectors/           # NASA/FAO data connectors
│   │   ├── core/                 # Config, cache, auth
│   │   ├── ml/                   # ML models (soil health, rotation, yield, water stress)
│   │   ├── services/             # Business logic, data collection orchestrator
│   │   └── main.py               # FastAPI app factory
│   ├── tests/                    # Unit & integration tests
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/ui/        # Reusable UI components
│   │   ├── hooks/                # Custom React hooks (TanStack Query)
│   │   ├── pages/                # Page components
│   │   ├── store/                # Zustand stores
│   │   ├── lib/                  # API client, utilities
│   │   └── App.tsx               # Main app with routing
│   ├── tests/                    # Component tests
│   ├── Dockerfile
│   └── nginx.conf
├── docker-compose.yml
├── docker-compose.dev.yml
└── .github/workflows/            # CI/CD pipelines
```

## Testing

```bash
# Backend tests
cd backend
pytest tests/ -v --cov=app

# Frontend tests
cd frontend
npm run test
npm run test:e2e
```

## Deployment

### Production Build

```bash
# Build Docker images
docker-compose build

# Push to registry
docker-compose push

# Deploy to Kubernetes (example)
kubectl apply -f k8s/
```

### CI/CD Pipeline

The repository includes GitHub Actions workflows:
- **CI Pipeline** — Lint, type-check, test, build
- **Security Scan** — Dependency audit, SAST (CodeQL), container scan (Trivy), secret scan
- **Dependabot** — Automated dependency updates

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- **NASA** for providing open Earth observation data
- **ESA/Copernicus** for Sentinel-2 data access
- **USGS** for Landsat data
- **FAO** for GAEZ crop suitability data
- **NASA Space Apps Challenge 2026** organizers and partners

## Partners & Resources

- [NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/)
- [NASA Earthdata](https://earthdata.nasa.gov/)
- [Copernicus Data Space Ecosystem](https://dataspace.copernicus.eu/)
- [Microsoft Azure Space Apps Offer](https://azure.microsoft.com/)
- [Google Cloud Space Apps Offer](https://cloud.google.com/)
- [Planetary Computer](https://planetarycomputer.microsoft.com/)
- [Meteomatics Weather API](https://www.meteomatics.com/)

---

**Built for NASA Space Apps Challenge 2026** — "Field Shift: Adapting Farms with NASA Data"