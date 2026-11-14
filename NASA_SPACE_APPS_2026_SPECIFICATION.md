# NASA Space Apps Challenge 2026 — Méthode Gagnante & Cahier des Charges Complet

> **Défi :** *Changement de cap : adapter les exploitations agricoles grâce aux données de la NASA*
> **Niveau :** Avancé / Intermédiaire
> **Objectif :** Créer un outil d'aide à la décision pour la rotation des cultures utilisant les observations de la Terre de la NASA

---

## 🎯 PARTIE 1 — MÉTHODOLOGIE GAGNANTE (La "Méthode RTK-NASA")

### 1.1 Philosophie de Victoire : Les 4 Piliers

| Pilier | Description | Différenciateur Clé |
|--------|-------------|---------------------|
| **🔬 Preuve Scientifique** | Chaque recommandation appuyée par données NASA + validation agronomique | Pas de "boîte noire" — explicabilité totale |
| **👨‍🌾 Centré Agriculteur** | UX adaptée aux contraintes réelles (matériel, marché, eau, main-d'œuvre) | Interface "zéro formation" — parler le langage du terrain |
| **🌍 Fusion de Données Unique** | Harmonisation multi-résolution (SMAP 9km + Landsat 30m + SRTM 30m + sol 10m) | Pipeline de résampling reproductible et documenté |
| **⚡ Actionnable Immédiat** | 3+ scénarios comparés avec gaps, risques, plan d'action local | L'outil ne s'arrête pas au diagnostic — il guide l'action |

### 1.2 Approche Technique Différenciante : "Triangulation NASA + Terrain + Marché"

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRIANGULATION GAGNANTE                       │
├─────────────────────┬─────────────────────┬─────────────────────┤
│   🛰️ DONNÉES NASA   │   🌱 DONNÉES TERRAIN │   💰 CONTEXTE ÉCO   │
│   (Observation)     │   (Vérification)    │   (Adoption)        │
├─────────────────────┼─────────────────────┼─────────────────────┤
│ SMAP Humidité sol   │ SSURGO/STATSGO2     │ USDA AMS Market News│
│ ECOSTRESS ET/LST    │ Web Soil Survey     │ NASS QuickStats     │
│ GPM/IMERG Précip.   │ CDL (Cultures act.) │ CoCoRaHS (validation)│
│ Landsat/MODIS NDVI  │ PRISM (climat local)│ FAO GAEZ (potentiel)│
│ NASA POWER AgroMet  │ NLDAS/GLDAS         │ OpenET (ET réel)    │
│ GRACE/GRACE-FO Eau  │ NAIP (imagerie 1m)  │ LANDFIRE (écosystème)│
│ SRTM Topographie    │ GEDI (biomasse)     │                     │
└─────────────────────┴─────────────────────┴─────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  MOTEUR DE SCÉNARIOS (SI/ML)  │
              │  • 3+ rotations comparées     │
              │  • Score multi-critères       │
              │  • Incertitude quantifiée     │
              │  • Explicabilité (SHAP/LIME)  │
              └───────────────────────────────┘
                              │
                              ▼
              ┌───────────────────────────────┐
              │  INTERFACE AGRICULTEUR        │
              │  • Carte interactive          │
              │  • Comparateur visuel         │
              │  • "Mode hors-ligne" PWA      │
              │  • Export PDF rapport         │
              └───────────────────────────────┘
```

### 1.3 Stratégie de Différenciation pour le Jury

| Critère Jury | Notre Réponse | Preuve dans le Code |
|-------------|---------------|---------------------|
| **Originalité** | Fusion multi-source inédite + approche "farmer-first" | Architecture modulaire `src/nasa/` + `src/agronomy/` |
| **Créativité** | Visualisations temporelles "stress calendar" + sliders climatiques | Composants `StressCalendar`, `ClimateSlider`, `RotationComparator` |
| **Meilleure utilisation données** | 12+ datasets NASA harmonisés sur grille commune 30m | Pipeline `DataHarmonizer` avec tests de régression |
| **Intelligence** | Modèle hybride physique + ML + règles expertes | `HybridRotationEngine` avec uncertainty quantification |
| **Impact maximal** | Outil déployable demain par n'importe quel agriculteur US | PWA offline-first + export NRCS-compatible |

---

## 📋 PARTIE 2 — CAHIER DES CHARGES TECHNIQUE DÉTAILLÉ

### 2.1 Exigences Fonctionnelles (MoSCoW)

#### MUST HAVE — Critères d'Éligibilité
| ID | Exigence | Description Détaillée | Critère d'Acceptation |
|----|----------|----------------------|----------------------|
| **F-01** | Sélection parcelle | Dessin/import polygone (GeoJSON, KML, CDL) + géocodage adresse | Parcelle ≤ 100 ha, précision ≤ 30m |
| **F-02** | Profil pédologique | Intégration SSURGO/STATSGO2 + WSS : texture, MO, drainage, capacité eau, groupe hydrologique | 100% couverture US, fallback GAEZ hors US |
| **F-03** | Historique cultures | CDL 5+ ans : rotation actuelle, cultures, périodes nues | Détection automatique rotation dominante |
| **F-04** | Indicateurs NASA | Calcul automatisé : NDVI/EVI (Landsat/S2), SM (SMAP), ET (ECOSTRESS/POWER), Précip (GPM), LST (ECOSTRESS), Gel (POWER) | Séries temporelles 2015-présent, résolution harmonisée 30m/8j |
| **F-05** | Moteur scénarios | Génération ≥3 rotations : (1) Actuelle, (2) Améliorée sol, (3) Résiliente eau, (4+) Personnalisée | Chaque scénario : score 0-100, détails par critère |
| **F-06** | Comparateur multi-critères | Tableau + radar chart : Eau, Azote, MO, Érosion, Revenu, Risque, Travail | Poids ajustables par l'utilisateur |
| **F-07** | Gaps & Incertitudes | Affichage explicite : données manquantes, incertitude modèle, validation locale requise | Badge "Validation expert requise" sur chaque recommandation |
| **F-08** | Export rapport | PDF/HTML : carte, graphiques, tableau comparatif, plan d'action, contacts NRCS locaux | Prêt pour impression / partage conseiller |

#### SHOULD HAVE — Différenciateurs Forts
| ID | Exigence | Description |
|----|----------|-------------|
| **F-09** | Calendrier de stress | Heatmap mensuelle : stress hydrique, thermique, gel, excès eau — identifie fenêtres vulnérabilité |
| **F-10** | Sliders climatiques | "Et si +2°C / -20% pluie ?" — recalcul scénarios en temps réel |
| **F-11** | Bibliothèque cultures | 50+ cultures : besoins eau, N-fixation, racine, marché, calendrier, allélopathie |
| **F-12** | Mode hors-ligne | PWA + IndexedDB : données parcelle + derniers scénarios accessibles sans connexion |
| **F-13** | API Conseiller | Lien direct NRCS/Extension locale pré-rempli avec données parcelle |

#### COULD HAVE — Innovation Bonus
| ID | Exigence | Description |
|----|----------|-------------|
| **F-14** | Jumeau numérique léger | Simulation journalière sol-eau-plante (modèle bucket simple) pour tester scénarios |
| **F-15** | Détection anomalies | Alertes : "NDVI anormal semaine 32" + cause probable (sécheresse, maladie, nutritif) |
| **F-16** | Communauté | Partage anonyme scénarios + notes agriculteurs (opt-in) |

#### WON'T HAVE (Cette édition)
- Récolte temps réel / IoT capteurs
- Optimisation économique complète (linéaire)
- Couverture mondiale complète (focus US d'abord)

---

### 2.2 Exigences Non-Fonctionnelles

| Catégorie | Exigence | Cible | Test |
|-----------|----------|-------|------|
| **Performance** | Temps chargement parcelle | < 3s (cache) / < 10s (premier) | Lighthouse CI |
| **Performance** | Recalcul scénario (slider) | < 500ms | Benchmark local |
| **Disponibilité** | Uptime API NASA | 99% + fallback cache 30j | Monitoring |
| **Accessibilité** | WCAG 2.1 AA | Contraste, clavier, screen reader | axe-core CI |
| **Offline** | Données critiques cached | 100% parcelle + 3 scénarios | Workbox test |
| **Sécurité** | Aucune donnée perso stockée | Local-first, pas de backend user | Audit code |
| **Interopérabilité** | Export GeoJSON/CSV/PDF | Standards ouverts | Validation schéma |

---

### 2.3 Architecture Technique

#### Stack Technologique Choisi

```yaml
Frontend:
  Framework: React 19 + TypeScript (strict)
  Build: Vite 7 (rolldown) + SWC
  Styling: Tailwind CSS 4 + DaisyUI 5 (thèmes, composants)
  State: TanStack Query v5 (server state) + Zustand (client state)
  Cartes: MapLibre GL JS (vector tiles, offline-capable)
  Charts: uPlot (micro-lib, 25kb, 60fps) + recharts (radar)
  GIS: @turf/turf + geotiff.js (COG reading) + ol/proj
  PDF: @react-pdf/renderer (zero-dependency)
  PWA: Vite PWA plugin (Workbox) + idb

Data Pipeline (Build-time + Runtime):
  NASA Access: Earthdata Search API + CMR + Harmony (subsetting)
  USDA Access: NASS QuickStats API + Geospatial Data Gateway
  Processing: Web Workers (OffscreenCanvas) + WASM (rust-wasm pour résampling)
  Cache: IndexedDB (idb) + Service Worker (stale-while-revalidate)
  Grille commune: 30m / 8 jours (aligned to Landsat/Sentinel-2 grid)

Deployment:
  Host: Vercel (Edge Functions) + Cloudflare R2 (data tiles)
  Domain: *.vercel.app + custom
  CI/CD: GitHub Actions (lint, typecheck, test, build, deploy preview)
```

#### Structure du Projet (Nouveau — à créer dans `/nasa-crop-rotation/`)

```
nasa-crop-rotation/
├── public/
│   ├── manifest.json
│   ├── sw.js (generated)
│   └── data/           # Tiles précalculées (COG, MBTiles)
├── src/
│   ├── app/                    # App shell, routing, providers
│   │   ├── App.tsx
│   │   ├── routes.tsx
│   │   └── providers.tsx       # QueryClient, Theme, Map, Auth(optional)
│   ├── features/               # Feature-based modules
│   │   ├── parcel/             # Sélection/dessin parcelle
│   │   │   ├── components/
│   │   │   ├── hooks/
│   │   │   ├── services/
│   │   │   └── types.ts
│   │   ├── soil/               # Profil pédologique (SSURGO/GAEZ)
│   │   ├── climate/            # Données NASA + PRISM/ERA5
│   │   │   ├── nasa/           # Clients API NASA
│   │   │   │   ├── smap.ts
│   │   │   │   ├── ecostress.ts
│   │   │   │   ├── gpm.ts
│   │   │   │   ├── landsat.ts
│   │   │   │   ├── modis.ts
│   │   │   │   ├── power.ts
│   │   │   │   ├── grace.ts
│   │   │   │   └── harmonizer.ts  # RESAMPLING CORE
│   │   │   ├── prism.ts
│   │   │   └── era5.ts
│   │   ├── crops/              # Bibliothèque cultures + CDL
│   │   │   ├── library.ts      # 50+ cultures: params agronomiques
│   │   │   ├── cdl.ts          # Historique cultures parcelle
│   │   │   └── rotation-engine/
│   │   │       ├── types.ts
│   │   │       ├── scorer.ts         # Multi-criteria scoring
│   │   │       ├── generator.ts      # Génération scénarios
│   │   │       ├── validator.ts      # Règles agronomiques
│   │   │       └── uncertainty.ts    # Quantification incertitude
│   │   ├── scenarios/          # Comparateur + UI
│   │   │   ├── components/
│   │   │   │   ├── RotationCard.tsx
│   │   │   │   ├── RadarChart.tsx
│   │   │   │   ├── StressCalendar.tsx
│   │   │   │   ├── ClimateSlider.tsx
│   │   │   │   └── GapBadges.tsx
│   │   │   └── hooks/
│   │   ├── report/             # Export PDF/HTML
│   │   └── offline/            # PWA + IndexDB sync
│   ├── shared/                 # Composants/UI partagés
│   │   ├── components/
│   │   │   ├── ui/             # Button, Card, Select, Slider, Tooltip...
│   │   │   ├── map/            # MapContainer, LayerControl, DrawTools
│   │   │   └── charts/         # uPlot wrappers, Radar, Heatmap
│   │   ├── hooks/
│   │   ├── utils/
│   │   ├── constants/
│   │   └── types/
│   ├── workers/                # Web Workers
│   │   ├── harmonizer.worker.ts
│   │   ├── scorer.worker.ts
│   │   └── pdf.worker.ts
│   ├── styles/
│   │   ├── globals.css
│   │   ├── tokens.css          # Design tokens (couleurs, spacing, type)
│   │   └── map.css
│   └── main.tsx
├── scripts/                    # Build-time data prep
│   ├── download-nasa.js
│   ├── download-usda.js
│   ├── build-tiles.js          # Tippecanoe / gdal2tiles
│   └── validate-harmonization.js
├── tests/
│   ├── unit/
│   ├── integration/
│   ├── e2e/                    # Playwright
│   └── fixtures/
├── .github/workflows/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

### 2.4 Pipeline de Données — Le Cœur Technique

#### 2.4.1 Harmonisation Multi-Résolution (Critique)

```typescript
// src/features/climate/nasa/harmonizer.ts

interface HarmonizationGrid {
  resolution: 30;        // mètres (Landsat/S2/CDL/SSURGO)
  temporalStep: 8;       // jours (compatible Landsat revisit)
  projection: 'EPSG:3857'; // Web Mercator pour tuiles
  bbox: [number, number, number, number]; // Étendue parcelle + buffer 1km
}

interface DataLayer {
  id: string;
  source: 'SMAP' | 'ECOSTRESS' | 'GPM' | 'LANDSAT' | 'MODIS' | 'POWER' | 'GRACE' | 'SRTM' | 'SSURGO' | 'CDL' | 'PRISM';
  nativeResolution: number; // mètres
  nativeTemporal: string;   // ex: '2-3 days', '16 days', 'daily', 'monthly'
  variables: string[];      // ex: ['soil_moisture', 'freeze_thaw']
  processingLevel: 'L2' | 'L3' | 'L4';
}

// ALGORITHME DE RÉSAMPLING (Web Worker)
async function harmonizeToGrid(
  layers: DataLayer[],
  grid: HarmonizationGrid,
  timeRange: [Date, Date]
): Promise<HarmonizedCube> {
  // 1. Télécharger données brutes (COG/NetCDF) via Harmony/STAC
  // 2. Reprojeter vers EPSG:3857 (bilinéaire continu, nearest voisin discret)
  // 3. Résample spatial : 
  //    - Continu (SM, LST, ET, Précip) → Bilinéaire / Cubique
  //    - Discret (CDL, SSURGO classe) → Majorité / Nearest
  // 4. Résample temporel : 
  //    - Agrégation 8j (moyenne, max, somme selon variable)
  //    - Interpolation gap-filling (linéaire pour gaps < 16j)
  // 5. Masque parcelle + buffer
  // 6. Calcul indicateurs dérivés (anomalies, tendances, percentiles)
  // 7. Stockage IndexedDB + tuiles MBTiles pour carte
}
```

#### 2.4.2 Indicateurs Clés Calculés (Par Parcelle, Par 8 Jours)

| Indicateur | Sources NASA | Formule / Méthode | Utilité Rotation |
|------------|--------------|-------------------|------------------|
| **SM_anomaly** | SMAP (9km→30m) | (SM - SM_clim) / SM_clim_std | Stress hydrique, fenêtre semis |
| **ET_actual** | ECOSTRESS (70m→30m) + POWER | ET_inst * upscale_factor | Besoin eau réel vs potentiel |
| **NDVI/EVI** | Landsat 30m (8j) + S2 10m | Red/NIR bands, cloud masking | Vigueur, phénologie, sol nu |
| **LST_day/night** | ECOSTRESS 70m→30m | Kelvin → °C, split-window | Stress thermique, gel |
| **PPT_accum** | GPM IMERG 0.1°→30m | Somme 8j + correction orographique | Fiabilité pluie, excès/déficit |
| **Frost_risk** | POWER Tmin + DEM | Tmin < 2°C + topographic correction | Choix variétés, dates semis |
| **Bare_soil_days** | NDVI < 0.2 + CDL | Comptage jours/an | Couvert végétal, érosion |
| **Root_zone_SM** | SMAP L4 + GRACE | Assimilation modèle | Réserve eau profonde |
| **Erosion_risk** | SRTM pente + PPT_intensité + CDL | RUSLE simplifié (K*LS*C*R) | Priorité cultures couvrantes |
| **Water_balance** | PPT - ET - Runoff | Bucket model 1D | Disponibilité eau culture |

---

### 2.5 Moteur de Scénarios — Logique Décisionnelle

#### 2.5.1 Génération de Rotations (Règles Expertes + Optimisation)

```typescript
// src/features/crops/rotation-engine/generator.ts

interface CropProfile {
  id: string;
  name: string;
  family: 'legume' | 'cereal' | 'brassica' | 'cover' | 'forage' | 'root';
  waterNeed: 'low' | 'medium' | 'high';      // mm/saison
  nFixation: number;                          // kg N/ha/an
  rootDepth: 'shallow' | 'medium' | 'deep';   // m
  residueC_N: number;                         // ratio C/N résidus
  allelopathy: string[];                      // cultures incompatibles
  marketValue: number;                        // $/ha (USDA NASS moy. 5ans)
  plantingWindow: [month, month];             // [début, fin]
  harvestWindow: [month, month];
  frostTolerance: number;                     // °C
  heatTolerance: number;                      // °C
  droughtTolerance: 1-5;                      // score
  equipmentNeeds: string[];                   // semoir, moissonneuse...
}

const CROP_LIBRARY: CropProfile[] = [
  // Légumineuses (fixation N)
  { id: 'soybean', name: 'Soja', family: 'legume', waterNeed: 'medium', nFixation: 150, ... },
  { id: 'alfalfa', name: 'Luzerne', family: 'legume', waterNeed: 'high', nFixation: 250, rootDepth: 'deep', ... },
  { id: 'pea', name: 'Pois', family: 'legume', waterNeed: 'low', nFixation: 100, ... },
  { id: 'clover_red', name: 'Trèfle rouge', family: 'cover', waterNeed: 'medium', nFixation: 120, ... },
  
  // Céréales
  { id: 'corn', name: 'Maïs', family: 'cereal', waterNeed: 'high', nFixation: 0, residueC_N: 60, ... },
  { id: 'wheat_winter', name: 'Blé d\'hiver', family: 'cereal', waterNeed: 'medium', ... },
  { id: 'sorghum', name: 'Sorgho', family: 'cereal', waterNeed: 'low', droughtTolerance: 5, ... },
  { id: 'rye', name: 'Seigle', family: 'cover', waterNeed: 'low', rootDepth: 'deep', ... },
  
  // Couvertures / Fourragères / Racines
  { id: 'radish', name: 'Radis fourrager', family: 'cover', rootDepth: 'deep', residueC_N: 20, ... },
  { id: 'turnip', name: 'Navet fourrager', family: 'forage', ... },
  { id: 'sunflower', name: 'Tournesol', family: 'root', rootDepth: 'deep', ... },
  // ... 50+ cultures
];

function generateRotations(
  currentRotation: CropSequence[],
  soilProfile: SoilProfile,
  climateIndicators: ClimateCube,
  farmerPriorities: PriorityWeights,
  constraints: FarmerConstraints
): RotationScenario[] {
  // 1. Filtrer cultures compatibles (sol, climat, fenêtre, équipement)
  const eligibleCrops = CROP_LIBRARY.filter(c => 
    isCompatible(c, soilProfile, climateIndicators, constraints)
  );
  
  // 2. Construire séquences 3-5 ans respectant:
  //    - Pas même famille 2 ans de suite (maladies)
  //    - Légumineuse ≥ 1/3 des années
  //    - Couverture hivernale ≥ 80% années
  //    - Rupture cycles ravageurs (ex: maïs → soja → blé → luzerne)
  //    - Gestion résidus (C/N équilibré)
  
  // 3. Scorer chaque séquence (voir scorer.ts)
  // 4. Retourner top-N + "Actuelle" + variantes "Eau", "Sol", "Revenu", "Équilibrée"
}
```

#### 2.5.2 Scoring Multi-Critères (Transparents, Ajustables)

```typescript
// src/features/crops/rotation-engine/scorer.ts

interface CriteriaScore {
  water: number;        // 0-100 : Efficacité eau (ETc / PPT_eff)
  nitrogen: number;     // 0-100 : Bilan N (fixation - export + résidus)
  organicMatter: number; // 0-100 : Apport MO (résidus, racines, couvertures)
  erosion: number;      // 0-100 : Réduction érosion (couvert, racines, pente)
  pestBreak: number;    // 0-100 : Rupture cycles (diversité familles, allélopathie)
  income: number;       // 0-100 : Revenu net estimé (rendement * prix - coûts)
  workload: number;     // 0-100 : Charge travail (passages, fenêtres critiques)
  risk: number;         // 0-100 : Risque climatique (variabilité, extrêmes)
}

interface PriorityWeights {
  water: number;        // défaut 0.20
  nitrogen: number;     // défaut 0.15
  organicMatter: number; // défaut 0.15
  erosion: number;      // défaut 0.15
  pestBreak: number;    // défaut 0.10
  income: number;       // défaut 0.15
  workload: number;     // défaut 0.05
  risk: number;         // défaut 0.05
  // Somme = 1.0
}

function scoreRotation(
  rotation: CropSequence[],
  context: ScoringContext
): { total: number; details: CriteriaScore; explanation: string[] } {
  // Chaque critère = fonction pure, testable, documentée
  // Explications générées automatiquement pour l'UI
  // Incertitude propagée (Monte Carlo sur rendements/prix/météo)
}
```

#### 2.5.3 Gaps & Incertitudes — Honnêteté Scientifique

```typescript
// src/features/crops/rotation-engine/uncertainty.ts

interface GapAnalysis {
  dataGaps: DataGap[];          // Données manquantes (ex: SMAP absent 2017-2018)
  modelUncertainty: number;     // CV% sur score total (Monte Carlo n=1000)
  expertValidationNeeded: string[]; // "Validation NRCS requise: drainage", "Test sol pH"
  assumptions: Assumption[];    // Hypothèses explicites
}

interface DataGap {
  variable: string;
  period: [Date, Date];
  coverage: number;             // % données valides
  impact: 'low' | 'medium' | 'high';
  mitigation: string;           // "Utilisé ERA5 en fallback", "Interlinéaire"
}
```

---

### 2.6 Interface Utilisateur — "Farmer-First" Design

#### 2.6.1 Parcours Utilisateur (5 étapes, < 10 min)

```
┌────────────────────────────────────────────────────────────────────┐
│ ÉTAPE 1 : MA PARCELLE (2 min)                                      │
│ ├─ Carte interactive (MapLibre) — Dessiner / Importer / Chercher  │
│ ├─ Adresse / GPS / Numéro parcelle (PLSS)                         │
│ └─ Validation emprise + buffer 1km                                │
├────────────────────────────────────────────────────────────────────┤
│ ÉTAPE 2 : MON CONTEXTE (3 min) — Optionnel, pré-rempli            │
│ ├─ Cultures actuelles (détectées CDL) → Confirmer/Corriger        │
│ ├─ Priorités : [💧 Eau] [🌱 Sol] [💰 Revenu] [⚠️ Risque] [🕐 Temps] │
│ ├─ Contraintes : Irrigation ? Matériel ? Marché local ? Bio ?     │
│ └─ Objectif : "Réduire irrigation 20%" / "Améliorer MO" / etc.    │
├────────────────────────────────────────────────────────────────────┤
│ ÉTAPE 3 : DIAGNOSTIC NASA (Auto, 30s)                             │
│ ├─ Carte chaleur : Stress hydrique / Thermique / Gel / Érosion    │
│ ├─ Calendrier de stress (heatmap 12 mois × 5 ans)                │
│ ├─ Périodes sol nu identifiées                                    │
│ └─ Tendances 10 ans : SM ↓, T° ↑, PPT variabilité ↑              │
├────────────────────────────────────────────────────────────────────┤
│ ÉTAPE 4 : COMPARATEUR SCÉNARIOS (3 min)                           │
│ ├─ 4 cartes côte-à-côte : Actuelle | Sol | Eau | Équilibrée      │
│ ├─ Radar chart interactif (poids ajustables)                      │
│ ├─ Détail par culture : fenêtre, eau, N, revenu, risque          │
│ ├─ Sliders "Et si..." : +2°C / -20% pluie / +10% prix maïs       │
│ └─ Badges gaps/incertitudes sur chaque scénario                   │
├────────────────────────────────────────────────────────────────────┤
│ ÉTAPE 5 : MON PLAN D'ACTION (Export)                              │
│ ├─ Rapport PDF : Carte, Diagnostic, Comparatif, Plan 3 ans       │
│ ├─ Contacts NRCS / Extension locale pré-remplis                   │
│ ├─ Checklist validation expert                                    │
│ └─ Sauvegarde locale (PWA) + Partage conseiller                   │
└────────────────────────────────────────────────────────────────────┘
```

#### 2.6.2 Composants Clés (Spécifications Visuelles)

**StressCalendar** — Heatmap 12 mois × 5 ans
```
         J  F  M  A  M  J  J  A  S  O  N  D
2020  ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
2021  ░░░░████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░
2022  ░░░░░░░░░░░░██████████░░░░░░░░░░░░░░░░░░
2023  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
2024  ░░░░░░░░████████████████░░░░░░░░░░░░░░░░
      Légende: █ Stress hydrique  █ Stress thermique  █ Gel  █ Excès eau
```
*Code couleur validé CVD (dataviz skill), tooltip détaillé au survol*

**RotationComparator** — Radar Chart + Tableau
```
Critères          Actuelle   Sol+      Eau+      Équilibrée
─────────────────────────────────────────────────────────────
Efficacité eau       45        62        78         70
Bilan azote          38        85        55         72
Matière organique    42        88        50         75
Érosion              55        70        65         80
Rupture ravageurs    30        60        45         70
Revenu net ($/ha)   420       380       450        410
Charge travail       75        60        70         65
Risque climatique    40        55        75         60
─────────────────────────────────────────────────────────────
SCORE GLOBAL        46        69        62         70
```
*Poids ajustables en temps réel → radar se met à jour*

**ClimateSlider** — Test de résilience
```
Température: [===●==========] +0°C → +3°C    Précipitations: [====●========] 0% → -30%
     ↓ Temps réel ↓                                    ↓ Temps réel ↓
Scores mis à jour → Érosion 80→65, Eau 78→52, Revenu 410→360
```

---

## 🚀 PARTIE 3 — PLAN D'IMPLÉMENTATION (Sprint 2 semaines)

### Semaine 1 : Fondations + Pipeline Données

| Jour | Livrable | Critère Done |
|------|----------|--------------|
| **Lun** | Setup repo Vite+React+TS+Tailwind+MapLibre+PWA | `npm run dev` → carte interactive charge |
| **Mar** | Module `parcel/` : Dessin, import GeoJSON/KML, geocoding | Polygone sauvegardé → IndexedDB |
| **Mer** | Clients NASA : SMAP, ECOSTRESS, GPM, POWER, Landsat (STAC/Harmony) | Requêtes API → Données brutes JSON/COG |
| **Jeu** | **Harmonizer Worker** : Résample 30m/8j + grille commune | Cube harmonisé valide (tests unitaires) |
| **Ven** | Indicateurs dérivés : SM_anomaly, NDVI, ET, LST, PPT, Frost, Bare_soil | Séries temporelles parcelle complète |
| **Sam** | Module `soil/` : SSURGO (US) + GAEZ fallback (monde) | Profil pédologique affiché sur carte |
| **Dim** | **Revue code + Tests + Documentation** | Coverage > 80%, zero TS errors |

### Semaine 2 : Moteur Scénarios + UI + Polish

| Jour | Livrable | Critère Done |
|------|----------|--------------|
| **Lun** | Bibliothèque 50 cultures + `rotation-engine/generator` | 10+ rotations valides générées |
| **Mar** | `scorer.ts` multi-critères + `uncertainty.ts` Monte Carlo | Scores reproductibles, gaps documentés |
| **Mer** | UI `scenarios/` : RotationCard, RadarChart, StressCalendar, ClimateSlider | Composants storybook + accessibilité |
| **Jeu** | Intégration bout-en-bout : Parcelle → Diagnostic → Scénarios | Parcours 5 étapes fonctionnel |
| **Ven** | Export PDF (@react-pdf) + PWA offline + Partage | Rapport généré, fonctionne hors-ligne |
| **Sam** | **Polish** : Thème agricole (couleurs terre), i18n (EN/FR/ES), a11y | Lighthouse > 90, axe-core 0 violations |
| **Dim** | **Démo vidéo 3 min + README + Déploiement Vercel** | URL live + code public GitHub |

---

## 🎨 PARTIE 4 — DESIGN SYSTEM AGRICOLE (Tokens)

### 4.1 Palette — Validée CVD (dataviz skill)

```css
/* src/styles/tokens.css */
:root {
  /* Surfaces */
  --surface: #FAFAF8;           /* Papier chaud (light) */
  --surface-elevated: #FFFFFF;
  --surface-sunken: #F0EEE8;
  
  /* Terre / Nature — Palette catégorielles fixe (ordre immuable) */
  --crop-legume: #2E7D32;       /* Vert forêt — Légumineuses */
  --crop-cereal: #F9A825;       /* Or blé — Céréales */
  --crop-cover: #558B2F;        /* Vert olive — Couvertures */
  --crop-forage: #689F38;       /* Vert prairie — Fourragères */
  --crop-root: #8D6E63;         /* Brun terre — Racines */
  --crop-brassica: #C0CA33;     /* Vert citron — Brassacées */
  --crop-other: #78909C;        /* Gris bleu — Autre */
  
  /* Séquentielle (magnitude) — Une teinte, clair→sombre */
  --seq-water: #01579B;         /* Bleu eau profond */
  --seq-water-100: #E1F5FE;
  --seq-water-300: #4FC3F7;
  --seq-water-500: #0288D1;
  --seq-water-700: #01579B;
  --seq-water-900: #002B5C;
  
  --seq-stress: #BF360C;        /* Rouge terre cuite */
  --seq-stress-100: #FBE9E7;
  --seq-stress-300: #FF9E80;
  --seq-stress-500: #FF5722;
  --seq-stress-700: #BF360C;
  --seq-stress-900: #7F1A08;
  
  --seq-organic: #3E2723;       /* Brun humus */
  --seq-organic-100: #EFEBE9;
  --seq-organic-300: #A1887F;
  --seq-organic-500: #6D4C41;
  --seq-organic-700: #3E2723;
  --seq-organic-900: #1B0F0A;
  
  /* Divergente (polarité) — Chaude / Froide + Neutre centre */
  --div-neg: #BF360C;           /* Négatif = stress/risque */
  --div-mid: #F5F5F0;           /* Neutre = référence */
  --div-pos: #1B5E20;           /* Positif = résilience/santé */
  
  /* Statut (réservés — jamais pour séries) */
  --status-good: #2E7D32;       /* ✓ Validé */
  --status-warning: #F57F17;    /* ⚠ Attention */
  --status-serious: #E65100;    /* ⚠⚠ Action requise */
  --status-critical: #B71C1C;   /* 🛑 Critique */
  
  /* Texte */
  --text-primary: #1B1B1B;
  --text-secondary: #4A4A4A;
  --text-muted: #757575;
  --text-inverse: #FAFAF8;
  
  /* Accent unique — Terracotta (terre cuite) */
  --accent: #C96A2B;
  --accent-hover: #B05A1F;
  --accent-light: #FBE9E7;
  
  /* Focus / Interaction */
  --focus-ring: #C96A2B;
  --focus-ring-offset: #FAFAF8;
  
  /* Ombres naturelles */
  --shadow-1: 0 1px 2px rgba(27,27,27,0.06);
  --shadow-2: 0 4px 8px rgba(27,27,27,0.08);
  --shadow-3: 0 8px 24px rgba(27,27,27,0.10);
  
  /* Rayons — Carrés pour données, ronds pour actions */
  --radius-data: 4px;
  --radius-action: 8px;
  --radius-card: 12px;
  
  /* Espacement — Système 4px */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px;
  --space-7: 48px; --space-8: 64px;
  
  /* Typographie */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
  
  /* Échelle type — Base 16px */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 2rem;      /* 32px */
  --text-4xl: 2.5rem;    /* 40px */
}

/* Dark mode — Même structure, valeurs adaptées */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --surface: #1A1A18;
    --surface-elevated: #232320;
    --surface-sunken: #141412;
    --text-primary: #F5F5F0;
    --text-secondary: #D4D4C8;
    --text-muted: #A3A394;
    --text-inverse: #1A1A18;
    --seq-water-100: #002B5C;
    --seq-water-900: #E1F5FE;
    --seq-stress-100: #7F1A08;
    --seq-stress-900: #FBE9E7;
    --div-mid: #2A2A26;
    --focus-ring-offset: #1A1A18;
    --shadow-1: 0 1px 2px rgba(0,0,0,0.3);
    --shadow-2: 0 4px 8px rgba(0,0,0,0.4);
    --shadow-3: 0 8px 24px rgba(0,0,0,0.5);
    color-scheme: dark;
  }
}
:root[data-theme="dark"] { /* same as above */ }
```

### 4.2 Composants de Base (Shared/UI)

```tsx
// src/shared/components/ui/Card.tsx
interface CardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'soil'; // soil = fond texturé
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  className?: string;
}

// src/shared/components/ui/StatTile.tsx — Pour KPIs dashboard
interface StatTileProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: { value: number; label: string } | null;
  status?: 'good' | 'warning' | 'serious' | 'critical' | 'neutral';
  icon?: React.ReactNode;
}

// src/shared/components/ui/Badge.tsx — Gaps, incertitudes, validation
interface BadgeProps {
  variant: 'gap' | 'uncertainty' | 'validation' | 'info' | 'success';
  size: 'sm' | 'md';
  children: React.ReactNode;
  tooltip?: string;
}
```

---

## 📊 PARTIE 5 — MÉTRIQUES DE SUCCÈS & ÉVALUATION

### 5.1 Critères Jury NASA (Alignement Explicite)

| Critère Official | Notre Preuve Mesurable | Poids Estimé |
|-----------------|------------------------|--------------|
| **Originalité** | Fusion 12+ datasets NASA harmonisés 30m/8j — inédit | 25% |
| **Créativité** | StressCalendar + ClimateSlider + Radar comparatif interactif | 20% |
| **Meilleure utilisation données** | Pipeline reproductible, gaps documentés, fallback multi-source | 25% |
| **Intelligence** | Moteur hybride règles-expertes + ML + uncertainty quantification | 15% |
| **Impact maximal** | PWA offline, export NRCS-ready, 0-barrière entrée agriculteur | 15% |

### 5.2 KPIs Internes (Objectifs Quantitatifs)

| Métrique | Cible | Outil Mesure |
|----------|-------|--------------|
| Temps parcelle→scénarios | < 5 min | Chrono utilisateur test |
| Taux complétion parcours | > 70% | Analytics (Plausible/GA4) |
| Score accessibilité | 100/100 | Lighthouse CI |
| Temps chargement initial | < 3s (cache) | WebPageTest |
| Taille bundle JS | < 200 KB gz | Vite bundle analyzer |
| Couverture tests | > 85% | Vitest + Playwright |
| Zero vuln. critiques | 0 | npm audit + Snyk |

---

## 🛡️ PARTIE 6 — GESTION DES RISQUES & PLANS B

| Risque | Probabilité | Impact | Mitigation | Plan B |
|--------|-------------|--------|------------|--------|
| API NASA rate-limited / down | Moyenne | Élevé | Cache 30j + fallback ERA5/PRISM + données précalculées | Mode démo avec données statiques précchées |
| Harmonisation 30m trop lente | Moyenne | Moyen | Web Worker + WASM (rust) + tuiles précalculées | Résolution 60m pour démo, 30m en background |
| SSURGO pas dispo hors US | Faible | Moyen | GAEZ global fallback + message clair | Focus US pour hackathon, extension post-event |
| Complexité UI trop élevée | Moyenne | Élevé | Tests utilisateurs agriculteurs (2-3) en semaine 1 | Mode "Simple" / "Expert" toggle |
| Temps insuffisant (2 sem) | Élevée | Critique | **Scope strict** : MUST HAVE seulement, SHOULD = stretch | Livrer core fonctionnel + vidéo démo |

---

## 📦 PARTIE 7 — LIVRABLES FINAUX (Checklist Soumission)

### 7.1 Code & Déploiement
- [ ] Repo GitHub public + licence MIT/Apache-2.0
- [ ] Déployé sur Vercel (URL stable)
- [ ] README complet : architecture, données, installation, contribution
- [ ] `CONTRIBUTING.md` + `CODE_OF_CONDUCT.md`
- [ ] Package.json avec scripts : `dev`, `build`, `test`, `lint`, `preview`

### 7.2 Documentation Technique
- [ ] `ARCHITECTURE.md` : Diagrammes Mermaid, flux données, décisions
- [ ] `DATA_SOURCES.md` : Tableau 12+ datasets NASA/USDA, licences, citations
- [ ] `HARMONIZATION.md` : Méthodologie résampling, validation, erreurs connues
- [ ] `ROTATION_ENGINE.md` : Règles, scoring, incertitude, bibliothèque cultures
- [ ] `API_REFERENCE.md` : Types TypeScript, hooks, composants exportés

### 7.3 Démonstration
- [ ] Vidéo 3 min (YouTube/Vimeo) : Parcours complet + explication technique
- [ ] Captures d'écran annotées (5+ : carte, diagnostic, comparateur, sliders, rapport)
- [ ] Parcelles démo pré-chargées (3 types : maïs-soja IA, blé-couverture KS, coton TX)
- [ ] Mode "Jury" : Données précalculées, pas d'attente API

### 7.4 Soumission Devpost
- [ ] Description claire (200 mots) + GIF animé
- [ ] Lien repo + lien démo live
- [ ] Équipe + rôles
- [ ] Technologies utilisées (badges)
- [ ] Réponses aux questions spécifiques NASA

---

## 🎓 PARTIE 8 — RESSOURCES & RÉFÉRENCES TECHNIQUES

### 8.1 APIs & Accès Données (Clés à obtenir AVANT sprint)

| Source | Accès | Format | Notes |
|--------|-------|--------|-------|
| **NASA Earthdata** | Login (gratuit) | STAC / Harmony / CMR | `earthdata.nasa.gov` — register early |
| **NASA POWER** | Direct API | JSON/CSV | `power.larc.nasa.gov/api` — no auth |
| **GPM IMERG** | GES DISC / STAC | NetCDF/COG | `disc.gsfc.nasa.gov` |
| **ECOSTRESS** | LPDAAC / AppEEARS | GeoTIFF | `lpdaac.usgs.gov` |
| **SMAP** | NSIDC / STAC | HDF5/NetCDF | `nsidc.org` |
| **Landsat/Sentinel-2** | Microsoft Planetary Computer / AWS | COG (STAC) | `planetarycomputer.microsoft.com` — gratuit, rapide |
| **USDA NASS QuickStats** | API Key (gratuit) | JSON | `quickstats.nass.usda.gov/api` |
| **SSURGO/STATSGO2** | Geospatial Data Gateway | GeoGDB/Shapefile | `datagateway.nrcs.usda.gov` — télécharger par état |
| **CDL (CropScape)** | REST API / WMS | GeoTIFF | `nassgeodata.gmu.edu/CropScape` |
| **PRISM** | Direct download | BIL/NetCDF | `prism.oregonstate.edu` — 30yr normals |
| **OpenET** | API Key (gratuit) | JSON/GeoJSON | `openetdata.org` — US West seulement |
| **ERA5 (ECMWF)** | CDS API (gratuit) | NetCDF | `cds.climate.copernicus.eu` — global gap-fill |

### 8.2 Bibliothèques Clés (Versions Pinnées)

```json
{
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.0",
    "@tanstack/react-query": "^5.60.0",
    "zustand": "^5.0.0",
    "maplibre-gl": "^5.0.0",
    "uplot": "^1.6.0",
    "recharts": "^2.15.0",
    "@react-pdf/renderer": "^4.1.0",
    "@turf/turf": "^7.1.0",
    "geotiff": "^2.1.0",
    "ol": "^10.0.0",
    "idb": "^8.0.0",
    "date-fns": "^4.1.0",
    "zod": "^3.23.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.5.0"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^7.0.0",
    "@vitejs/plugin-react": "^4.3.0",
    "tailwindcss": "^4.1.0",
    "daisyui": "^5.0.0",
    "vitest": "^2.1.0",
    "@playwright/test": "^1.48.0",
    "eslint": "^9.13.0",
    "@typescript-eslint/eslint-plugin": "^8.10.0",
    "prettier": "^3.3.0"
  }
}
```

### 8.3 Références Scientifiques (Pour crédibilité rapport)

1. **Rotation benefits** : Lehman et al. (2017) "Crop rotation diversity..." *Agronomy Journal*
2. **NASA data agriculture** : Anderson et al. (2011) "Mapping daily evapotranspiration..." *Remote Sensing of Environment*
3. **Soil health indicators** : Norris et al. (2020) "Soil health assessment..." *Soil Science Society America Journal*
4. **Climate resilience** : Bowles et al. (2020) "Long-term evidence..." *Nature Sustainability*
5. **Decision support design** : Jakku et al. (2019) "If they don't tell us..." *Agricultural Systems*

---

## 🏁 CONCLUSION — CE QUI FAIT LA DIFFÉRENCE

> **Ce n'est pas l'outil qui gagne. C'est la RIGUEUR avec laquelle il est construit.**

| Ce que font les autres | Ce que NOUS faisons |
|------------------------|---------------------|
| Une carte NDVI | Un diagnostic multi-indicateurs avec incertitudes |
| 1 scénario "optimal" | 3+ scénarios comparés, poids ajustables, gaps explicites |
| "L'IA décide" | Règles transparentes + ML + expertise agronome = explicabilité |
| Démo qui plante si API down | PWA offline-first + cache 30j + données précalculées |
| UI "data science" | UI "agriculteur" — langage terrain, mode hors-ligne, export NRCS |
| 2-3 datasets NASA | **12+ datasets harmonisés** sur grille commune documentée |
| Pas de validation | Monte Carlo uncertainty + badges "validation expert requise" |

---

**Prêt à commencer ?** 

1. `mkdir nasa-crop-rotation && cd $_`
2. `npm create vite@latest . -- --template react-ts`
3. Suivre le plan jour par jour (Partie 3)
4. **Commit souvent, push quotidien** — l'historique Git compte pour le jury

---

*Document généré pour le NASA Space Apps Challenge 2026 — Équipe [VOTRE NOM]*
*Dernière mise à jour : 2026-11-14*
*Version : 1.0 — Prête pour sprint de 2 semaines*