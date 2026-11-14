#!/bin/bash
# NASA Space Apps 2026 - Crop Rotation Decision Tool
# Script d'initialisation rapide du projet
# Usage: bash init-project.sh

set -e

echo "🚀 Initialisation NASA Space Apps 2026 - Crop Rotation Tool"
echo "============================================================"

# 1. Créer la structure
echo "📁 Création de la structure des dossiers..."
mkdir -p nasa-crop-rotation
cd nasa-crop-rotation

mkdir -p public/data
mkdir -p src/{app,features,shared,workers,styles}
mkdir -p src/features/{parcel,soil,climate,crops,scenarios,report,offline}
mkdir -p src/features/climate/nasa
mkdir -p src/features/crops/rotation-engine
mkdir -p src/shared/components/{ui,map,charts}
mkdir -p src/shared/{hooks,utils,constants,types}
mkdir -p src/workers
mkdir -p scripts
mkdir -p tests/{unit,integration,e2e,fixtures}
mkdir -p .github/workflows

# 2. package.json minimal pour démarrage
echo "📦 Création package.json..."
cat > package.json << 'EOF'
{
  "name": "nasa-crop-rotation",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:e2e": "playwright test",
    "format": "prettier --write ."
  },
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
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.6.0",
    "vite": "^7.0.0",
    "tailwindcss": "^4.1.0",
    "daisyui": "^5.0.0",
    "vitest": "^2.1.0",
    "@playwright/test": "^1.48.0",
    "eslint": "^9.13.0",
    "@typescript-eslint/eslint-plugin": "^8.10.0",
    "@typescript-eslint/parser": "^8.10.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.0",
    "prettier": "^3.3.0",
    "prettier-plugin-tailwindcss": "^0.6.0"
  }
}
EOF

# 3. tsconfig.json
echo "⚙️  Configuration TypeScript..."
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@features/*": ["src/features/*"],
      "@shared/*": ["src/shared/*"],
      "@app/*": ["src/app/*"]
    }
  },
  "include": ["src", "vite.config.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
EOF

cat > tsconfig.node.json << 'EOF'
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts"]
}
EOF

# 4. vite.config.ts
echo "⚡ Configuration Vite..."
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@features': path.resolve(__dirname, './src/features'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@app': path.resolve(__dirname, './src/app'),
    },
  },
  worker: {
    format: 'es',
  },
  build: {
    target: 'es2022',
    minify: 'esbuild',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-map': ['maplibre-gl'],
          'vendor-charts': ['uplot', 'recharts'],
          'vendor-gis': ['@turf/turf', 'geotiff', 'ol'],
          'vendor-pdf': ['@react-pdf/renderer'],
        },
      },
    },
  },
  server: {
    port: 3000,
    host: true,
  },
})
EOF

# 5. tailwind.config.js
echo "🎨 Configuration Tailwind + DaisyUI..."
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  daisyui: {
    themes: [
      {
        light: {
          "primary": "#C96A2B",
          "primary-content": "#FAFAF8",
          "secondary": "#3E2723",
          "secondary-content": "#FAFAF8",
          "accent": "#2E7D32",
          "accent-content": "#FAFAF8",
          "neutral": "#1B1B1B",
          "neutral-content": "#FAFAF8",
          "base-100": "#FAFAF8",
          "base-200": "#F0EEE8",
          "base-300": "#E4E1D8",
          "base-content": "#1B1B1B",
          "info": "#0288D1",
          "success": "#2E7D32",
          "warning": "#F57F17",
          "error": "#B71C1C",
        },
        dark: {
          "primary": "#D47A3A",
          "primary-content": "#1A1A18",
          "secondary": "#4A352A",
          "secondary-content": "#F5F5F0",
          "accent": "#4CAF50",
          "accent-content": "#1A1A18",
          "neutral": "#F5F5F0",
          "neutral-content": "#1A1A18",
          "base-100": "#1A1A18",
          "base-200": "#232320",
          "base-300": "#2A2A26",
          "base-content": "#F5F5F0",
          "info": "#29B6F6",
          "success": "#66BB6A",
          "warning": "#FFD54F",
          "error": "#EF5350",
        },
      },
    ],
    darkTheme: "dark",
    base: true,
    styled: true,
    utils: true,
    prefix: "",
    logs: false,
    themeRoot: ":root",
  },
  plugins: [require("daisyui")],
}
EOF

# 6. postcss.config.js
cat > postcss.config.js << 'EOF'
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

# 7. index.html
echo "🌐 Création index.html..."
cat > index.html << 'EOF'
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="description" content="Outil d'aide à la décision pour la rotation des cultures - NASA Space Apps Challenge 2026" />
    <meta name="theme-color" content="#C96A2B" />
    <title>CropRotation NASA — Adapter l'agriculture aux données spatiales</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOF

# 8. favicon.svg
cat > public/favicon.svg << 'EOF'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <circle cx="50" cy="50" r="48" fill="#C96A2B"/>
  <path d="M30 55 Q50 30 70 55 Q50 70 30 55" fill="#FAFAF8" opacity="0.9"/>
  <circle cx="50" cy="50" r="12" fill="#C96A2B"/>
  <path d="M50 38 V62 M38 50 H62" stroke="#FAFAF8" stroke-width="4" stroke-linecap="round"/>
</svg>
EOF

# 9. Styles globaux avec tokens
echo "🎨 Création des tokens de design..."
cat > src/styles/tokens.css << 'EOF'
/* NASA Crop Rotation - Design Tokens */
/* Palette validée CVD (dataviz skill) - Ordre catégoriel immuable */

:root {
  /* Surfaces */
  --surface: #FAFAF8;
  --surface-elevated: #FFFFFF;
  --surface-sunken: #F0EEE8;

  /* Catégoriel - Ordre FIXE (jamais cyclé) */
  --crop-legume: #2E7D32;       /* 1. Légumineuses */
  --crop-cereal: #F9A825;       /* 2. Céréales */
  --crop-cover: #558B2F;        /* 3. Couvertures */
  --crop-forage: #689F38;       /* 4. Fourragères */
  --crop-root: #8D6E63;         /* 5. Racines */
  --crop-brassica: #C0CA33;     /* 6. Brassacées */
  --crop-other: #78909C;        /* 7. Autre → "Other" si >7 séries */

  /* Séquentielle - Eau (magnitude) */
  --seq-water-100: #E1F5FE;
  --seq-water-300: #4FC3F7;
  --seq-water-500: #0288D1;
  --seq-water-700: #01579B;
  --seq-water-900: #002B5C;

  /* Séquentielle - Stress (magnitude) */
  --seq-stress-100: #FBE9E7;
  --seq-stress-300: #FF9E80;
  --seq-stress-500: #FF5722;
  --seq-stress-700: #BF360C;
  --seq-stress-900: #7F1A08;

  /* Séquentielle - Matière organique */
  --seq-organic-100: #EFEBE9;
  --seq-organic-300: #A1887F;
  --seq-organic-500: #6D4C41;
  --seq-organic-700: #3E2723;
  --seq-organic-900: #1B0F0A;

  /* Divergente - Polarité */
  --div-neg: #BF360C;           /* Négatif = stress/risque */
  --div-mid: #F5F5F0;           /* Neutre = référence */
  --div-pos: #1B5E20;           /* Positif = résilience/santé */

  /* Statut - RÉSERVÉS (jamais pour séries de données) */
  --status-good: #2E7D32;
  --status-warning: #F57F17;
  --status-serious: #E65100;
  --status-critical: #B71C1C;

  /* Texte */
  --text-primary: #1B1B1B;
  --text-secondary: #4A4A4A;
  --text-muted: #757575;
  --text-inverse: #FAFAF8;

  /* Accent unique - Terracotta */
  --accent: #C96A2B;
  --accent-hover: #B05A1F;
  --accent-light: #FBE9E7;

  /* Focus */
  --focus-ring: #C96A2B;
  --focus-ring-offset: #FAFAF8;

  /* Ombres */
  --shadow-1: 0 1px 2px rgba(27,27,27,0.06);
  --shadow-2: 0 4px 8px rgba(27,27,27,0.08);
  --shadow-3: 0 8px 24px rgba(27,27,27,0.10);

  /* Rayons */
  --radius-data: 4px;
  --radius-action: 8px;
  --radius-card: 12px;

  /* Espacement - Système 4px */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px;
  --space-7: 48px; --space-8: 64px;

  /* Typographie */
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-display: 'Space Grotesk', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', monospace;

  /* Échelle type */
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.5rem;
  --text-3xl: 2rem;
  --text-4xl: 2.5rem;
}

/* Dark mode */
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
EOF

# 10. globals.css
cat > src/styles/globals.css << 'EOF'
@import "tailwindcss";
@import "./tokens.css";

@theme {
  --font-sans: var(--font-sans);
  --font-display: var(--font-display);
  --font-mono: var(--font-mono);

  --color-surface: var(--surface);
  --color-surface-elevated: var(--surface-elevated);
  --color-surface-sunken: var(--surface-sunken);

  --color-crop-legume: var(--crop-legume);
  --color-crop-cereal: var(--crop-cereal);
  --color-crop-cover: var(--crop-cover);
  --color-crop-forage: var(--crop-forage);
  --color-crop-root: var(--crop-root);
  --color-crop-brassica: var(--crop-brassica);
  --color-crop-other: var(--crop-other);

  --color-seq-water-100: var(--seq-water-100);
  --color-seq-water-300: var(--seq-water-300);
  --color-seq-water-500: var(--seq-water-500);
  --color-seq-water-700: var(--seq-water-700);
  --color-seq-water-900: var(--seq-water-900);

  --color-seq-stress-100: var(--seq-stress-100);
  --color-seq-stress-300: var(--seq-stress-300);
  --color-seq-stress-500: var(--seq-stress-500);
  --color-seq-stress-700: var(--seq-stress-700);
  --color-seq-stress-900: var(--seq-stress-900);

  --color-seq-organic-100: var(--seq-organic-100);
  --color-seq-organic-300: var(--seq-organic-300);
  --color-seq-organic-500: var(--seq-organic-500);
  --color-seq-organic-700: var(--seq-organic-700);
  --color-seq-organic-900: var(--seq-organic-900);

  --color-div-neg: var(--div-neg);
  --color-div-mid: var(--div-mid);
  --color-div-pos: var(--div-pos);

  --color-status-good: var(--status-good);
  --color-status-warning: var(--status-warning);
  --color-status-serious: var(--status-serious);
  --color-status-critical: var(--status-critical);

  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);
  --color-text-inverse: var(--text-inverse);

  --color-accent: var(--accent);
  --color-accent-hover: var(--accent-hover);
  --color-accent-light: var(--accent-light);

  --radius-data: var(--radius-data);
  --radius-action: var(--radius-action);
  --radius-card: var(--radius-card);

  --shadow-1: var(--shadow-1);
  --shadow-2: var(--shadow-2);
  --shadow-3: var(--shadow-3);
}

/* Reset & Base */
*, *::before, *::after {
  box-sizing: border-box;
}

html {
  font-size: 16px;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
  min-height: 100vh;
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: 1.6;
  color: var(--text-primary);
  background-color: var(--surface);
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
}

#root {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  font-weight: 600;
  line-height: 1.3;
  color: var(--text-primary);
  text-wrap: balance;
}

h1 { font-size: var(--text-4xl); }
h2 { font-size: var(--text-3xl); }
h3 { font-size: var(--text-2xl); }
h4 { font-size: var(--text-xl); }
h5 { font-size: var(--text-lg); }
h6 { font-size: var(--text-base); }

p { margin: 0 0 var(--space-4); }

a {
  color: var(--accent);
  text-decoration: none;
  transition: color 0.15s ease;
}
a:hover { color: var(--accent-hover); }
a:focus-visible {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
  border-radius: var(--radius-action);
}

/* Forms */
input, select, textarea, button {
  font-family: inherit;
  font-size: inherit;
}

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--surface-sunken);
  outline: none;
}
input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.15);
  box-shadow: var(--shadow-2);
}
input[type="range"]:focus-visible::-webkit-slider-thumb {
  outline: 2px solid var(--focus-ring);
  outline-offset: 2px;
}

/* Map container */
.map-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  border-radius: var(--radius-card);
  overflow: hidden;
  box-shadow: var(--shadow-2);
}

/* Chart containers */
.chart-container {
  width: 100%;
  min-height: 300px;
}

/* Utility classes */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.skip-link {
  position: absolute;
  top: -100%;
  left: var(--space-4);
  padding: var(--space-2) var(--space-4);
  background: var(--accent);
  color: var(--text-inverse);
  border-radius: var(--radius-action);
  z-index: 10000;
  transition: top 0.15s ease;
}
.skip-link:focus {
  top: var(--space-4);
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}

/* Print styles */
@media print {
  .no-print { display: none !important; }
  .map-container { height: 300px !important; }
  body { padding: 0; }
}
EOF

# 11. main.tsx
echo "⚛️  Création point d'entrée React..."
cat > src/main.tsx << 'EOF'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { BrowserRouter } from 'react-router-dom'
import App from './app/App'
import './styles/globals.css'

// TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 min
      gcTime: 1000 * 60 * 30,   // 30 min
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  </React.StrictMode>,
)
EOF

# 12. App.tsx minimal
cat > src/app/App.tsx << 'EOF'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import Layout from './Layout'

// Lazy load features
const ParcelStep = lazy(() => import('../features/parcel/ParcelStep').then(m => ({ default: m.ParcelStep })))
const ContextStep = lazy(() => import('../features/soil/ContextStep').then(m => ({ default: m.ContextStep })))
const DiagnosticStep = lazy(() => import('../features/climate/DiagnosticStep').then(m => ({ default: m.DiagnosticStep })))
const ScenariosStep = lazy(() => import('../features/scenarios/ScenariosStep').then(m => ({ default: m.ScenariosStep })))
const ReportStep = lazy(() => import('../features/report/ReportStep').then(m => ({ default: m.ReportStep })))

// Shared UI
const Loading = () => (
  <div className="flex items-center justify-center h-64">
    <div className="loading loading-spinner loading-lg text-primary"></div>
  </div>
)

function App() {
  return (
    <Suspense fallback={<Loading />}>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/parcelle" replace />} />
          <Route path="/parcelle" element={<ParcelStep />} />
          <Route path="/contexte" element={<ContextStep />} />
          <Route path="/diagnostic" element={<DiagnosticStep />} />
          <Route path="/scenarios" element={<ScenariosStep />} />
          <Route path="/rapport" element={<ReportStep />} />
          <Route path="*" element={<Navigate to="/parcelle" replace />} />
        </Routes>
      </Layout>
    </Suspense>
  )
}

export default App
EOF

# 13. Layout.tsx
cat > src/app/Layout.tsx << 'EOF'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'

const steps = [
  { path: '/parcelle', label: '1. Ma parcelle', icon: '📍' },
  { path: '/contexte', label: '2. Mon contexte', icon: '🌱' },
  { path: '/diagnostic', label: '3. Diagnostic NASA', icon: '🛰️' },
  { path: '/scenarios', label: '4. Scénarios', icon: '📊' },
  { path: '/rapport', label: '5. Mon plan', icon: '📄' },
]

export default function Layout() {
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <div className="min-h-screen flex flex-col">
      {/* Skip link */}
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>

      {/* Header */}
      <header className="bg-base-100 border-b border-base-300 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/parcelle" className="flex items-center gap-2 font-display font-bold text-xl text-primary no-underline">
              <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="48" fill="var(--accent)"/>
                <path d="M30 55 Q50 30 70 55 Q50 70 30 55" fill="var(--surface)" opacity="0.9"/>
                <circle cx="50" cy="50" r="12" fill="var(--accent)"/>
                <path d="M50 38 V62 M38 50 H62" stroke="var(--surface)" stroke-width="4" stroke-linecap="round"/>
              </svg>
              <span className="hidden sm:block">CropRotation</span>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1" aria-label="Étapes du processus">
              {steps.map((step, i) => {
                const isActive = location.pathname === step.path
                const isCompleted = steps.findIndex(s => s.path === location.pathname) > i
                return (
                  <Link
                    key={step.path}
                    to={step.path}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-accent text-accent-content shadow-md'
                        : isCompleted
                        ? 'bg-success/10 text-success hover:bg-success/20'
                        : 'text-base-content/60 hover:bg-base-200 hover:text-base-content'
                    }`}
                    aria-current={isActive ? 'step' : undefined}
                  >
                    <span aria-hidden="true">{step.icon}</span>
                    <span className="hidden lg:inline">{step.label}</span>
                  </Link>
                )
              })}
            </nav>

            {/* Mobile menu button */}
            <button
              className="md:hidden btn btn-ghost btn-sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
              aria-label="Menu étapes"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M3 12h18M3 6h18M3 18h18" />
                )}
              </svg>
            </button>
          </div>

          {/* Mobile menu */}
          {mobileMenuOpen && (
            <nav id="mobile-menu" className="md:hidden py-4 border-t border-base-300" aria-label="Étapes mobile">
              <div className="flex flex-col gap-2">
                {steps.map((step, i) => {
                  const isActive = location.pathname === step.path
                  const isCompleted = steps.findIndex(s => s.path === location.pathname) > i
                  return (
                    <Link
                      key={step.path}
                      to={step.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-base font-medium ${
                        isActive
                          ? 'bg-accent text-accent-content'
                          : isCompleted
                          ? 'bg-success/10 text-success'
                          : 'text-base-content/70'
                      }`}
                    >
                      <span className="text-xl">{step.icon}</span>
                      <span>{step.label}</span>
                    </Link>
                  )
                })}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main content */}
      <main id="main-content" className="flex-1 container mx-auto px-4 py-6 w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-base-200 border-t border-base-300 py-6 mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-base-content/60">
          <p>NASA Space Apps Challenge 2026 — Données : NASA, USDA, ESA | Open Source | Pas de données personnelles collectées</p>
        </div>
      </footer>
    </div>
  )
}
EOF

# 14. Providers
cat > src/app/providers.tsx << 'EOF'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { ThemeProvider } from '@shared/context/ThemeContext'
import { MapProvider } from '@shared/context/MapContext'

// Providers composition
export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 30,
        retry: 2,
        refetchOnWindowFocus: false,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <MapProvider>
          {children}
        </MapProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
EOF

# 15. Types de base
cat > src/shared/types/index.ts << 'EOF'
// Types partagés - Base

export interface BoundingBox {
  minX: number
  minY: number
  maxX: number
  maxY: number
}

export interface GeoPoint {
  lat: number
  lon: number
}

export interface ParcelGeometry {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: number[][][] // GeoJSON format
  bbox?: BoundingBox
  area_ha: number
  centroid: GeoPoint
}

export interface TimeRange {
  start: Date
  end: Date
}

export type DataQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'missing'

export interface DataGap {
  variable: string
  period: TimeRange
  coverage: number // 0-1
  impact: 'low' | 'medium' | 'high'
  mitigation: string
}

export interface UncertaintyQuantification {
  mean: number
  std: number
  cv: number // coefficient of variation %
  percentile_5: number
  percentile_95: number
  method: 'monte_carlo' | 'analytical' | 'bootstrap'
  samples: number
}

// Priorités agriculteur (poids = 1.0 total)
export interface FarmerPriorities {
  water: number        // Efficacité eau
  nitrogen: number     // Bilan azote
  organicMatter: number // Matière organique
  erosion: number      // Érosion
  pestBreak: number    // Rupture ravageurs
  income: number       // Revenu
  workload: number     // Charge travail
  risk: number         // Risque climatique
}

export const DEFAULT_PRIORITIES: FarmerPriorities = {
  water: 0.20,
  nitrogen: 0.15,
  organicMatter: 0.15,
  erosion: 0.15,
  pestBreak: 0.10,
  income: 0.15,
  workload: 0.05,
  risk: 0.05,
}

export interface FarmerConstraints {
  irrigation: boolean
  equipment: string[]      // ex: ['no-till-drill', 'combine']
  organic: boolean
  marketAccess: string[]   // cultures vendables localement
  maxWaterMm?: number
  minProfitPerHa?: number
}

// Scores par critère (0-100)
export interface CriteriaScores {
  water: number
  nitrogen: number
  organicMatter: number
  erosion: number
  pestBreak: number
  income: number
  workload: number
  risk: number
}

export interface RotationScenario {
  id: string
  name: string
  description: string
  crops: CropSequence[]
  scores: CriteriaScores
  totalScore: number
  uncertainty: UncertaintyQuantification
  gaps: DataGap[]
  expertValidationNeeded: string[]
  assumptions: string[]
  isCurrent: boolean
}

export interface CropSequence {
  year: number
  cropId: string
  plantingDate: Date
  harvestDate: Date
  coverCrop?: string
  notes?: string
}

export interface CropProfile {
  id: string
  name: string
  family: 'legume' | 'cereal' | 'brassica' | 'cover' | 'forage' | 'root' | 'other'
  waterNeed: 'low' | 'medium' | 'high'
  waterNeedMm: number
  nFixation: number // kg N/ha/an
  rootDepth: 'shallow' | 'medium' | 'deep'
  rootDepthM: number
  residueCN: number
  allelopathy: string[] // crop IDs incompatibles
  marketValueUsdPerHa: number
  plantingWindow: [number, number] // [startMonth, endMonth] 1-12
  harvestWindow: [number, number]
  frostToleranceC: number
  heatToleranceC: number
  droughtTolerance: 1 | 2 | 3 | 4 | 5
  equipmentNeeds: string[]
  tags: string[]
}

// Indicateurs climatiques calculés
export interface ClimateIndicators {
  smAnomaly: number[]           // Anomalie humidité sol (par période 8j)
  etActual: number[]            // Évapotranspiration réelle (mm)
  ndvi: number[]                // NDVI
  evi: number[]                 // EVI
  lstDay: number[]              // Température surface jour (°C)
  lstNight: number[]            // Température surface nuit (°C)
  pptAccum: number[]            // Précipitations accumulées (mm)
  frostDays: number[]           // Jours gel risque
  bareSoilDays: number          // Jours sol nu / an
  rootZoneSM: number[]          // Humidité zone racinaire
  erosionRisk: number           // Score érosion 0-100
  waterBalance: number[]        // Bilan hydrique (mm)
  timestamps: Date[]            // Dates correspondantes
}

// Profil pédologique
export interface SoilProfile {
  texture: 'sand' | 'loam' | 'clay' | 'silt' | 'peat'
  organicMatter: number        // %
  ph: number
  drainageClass: 'excessive' | 'well' | 'moderate' | 'poor' | 'very_poor'
  hydrologicGroup: 'A' | 'B' | 'C' | 'D'
  availableWaterCapacity: number // mm/m
  erosionRiskFactor: number    // K factor
  slopePercent: number
  restrictiveLayerDepth?: number // cm
  nutrientLevels: {
    n: number
    p: number
    k: number
  }
}
EOF

# 16. Hooks partagés
cat > src/shared/hooks/index.ts << 'EOF'
// Hooks partagés

import { useState, useEffect, useCallback } from 'react'

// Debounce
export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}

// LocalStorage avec synchronisation
export function useLocalStorage<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(key)
      return stored ? JSON.parse(stored) : initial
    } catch {
      return initial
    }
  })

  const set = useCallback((v: T | ((prev: T) => T)) => {
    setValue(prev => {
      const next = v instanceof Function ? v(prev) : v
      try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }, [key])

  return [value, set]
}

// Media query
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia(query)
    setMatches(mql.matches)
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [query])
  return matches
}

// Thème
export function useTheme(): 'light' | 'dark' | 'system' {
  const [theme, setTheme] = useLocalStorage<'light' | 'dark' | 'system'>('theme', 'system')
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)')

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'system') {
      root.removeAttribute('data-theme')
    } else {
      root.setAttribute('data-theme', theme)
    }
  }, [theme, prefersDark])

  return theme
}

// IndexedDB wrapper simple
export async function idbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await import('idb').then(m => m.openDB('nasa-crop-rotation', 1, {
    upgrade(db) { db.createObjectStore(store) }
  }))
  return db.get(store, key)
}

export async function idbSet(store: string, key: IDBValidKey, value: unknown): Promise<void> {
  const db = await import('idb').then(m => m.openDB('nasa-crop-rotation', 1, {
    upgrade(db) { db.createObjectStore(store) }
  }))
  await db.put(store, value, key)
}

export async function idbGetAll<T>(store: string): Promise<T[]> {
  const db = await import('idb').then(m => m.openDB('nasa-crop-rotation', 1, {
    upgrade(db) { db.createObjectStore(store) }
  }))
  return db.getAll(store)
}
EOF

# 17. Utils
cat > src/shared/utils/index.ts << 'EOF'
// Utilitaires partagés

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Formatage nombres
export function formatNumber(n: number, decimals = 1): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
}

export function formatPercent(n: number, decimals = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n / 100)
}

export function formatCurrency(n: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(d)
}

// Couleurs pour catégories cultures (ordre fixe)
export const CROP_COLORS: Record<string, string> = {
  legume: '#2E7D32',
  cereal: '#F9A825',
  cover: '#558B2F',
  forage: '#689F38',
  root: '#8D6E63',
  brassica: '#C0CA33',
  other: '#78909C',
}

export function getCropColor(family: string): string {
  return CROP_COLORS[family] || CROP_COLORS.other
}

// Géométrie
export function calculateAreaHa(coordinates: number[][][]): number {
  // Simplifié - utiliser @turf/turf en production
  return 0
}

export function getCentroid(coordinates: number[][][]): { lat: number; lon: number } {
  // Simplifié
  return { lat: 0, lon: 0 }
}

// Validation
export function validatePriorities(p: Record<string, number>): boolean {
  const sum = Object.values(p).reduce((a, b) => a + b, 0)
  return Math.abs(sum - 1.0) < 0.001
}

// Génération ID
export function generateId(prefix = ''): string {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 9)}`
}

// Deep clone
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

// Sleep
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Retry avec backoff
export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  baseDelay = 1000
): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    if (retries === 0) throw e
    await sleep(baseDelay)
    return retry(fn, retries - 1, baseDelay * 2)
  }
}
EOF

# 18. Constants
cat > src/shared/constants/index.ts << 'EOF'
// Constantes de l'application

export const APP_NAME = 'CropRotation NASA'
export const APP_VERSION = '0.1.0'
export const CHALLENGE = 'NASA Space Apps Challenge 2026'

// Grille d'harmonisation
export const HARMONIZATION_GRID = {
  resolution: 30,        // mètres
  temporalStep: 8,       // jours
  projection: 'EPSG:3857',
  bufferKm: 1,           // buffer autour parcelle
} as const

// Sources de données NASA
export const NASA_SOURCES = {
  SMAP: { name: 'SMAP', resolution: 9000, temporal: '2-3 days', variables: ['soil_moisture', 'freeze_thaw'] },
  ECOSTRESS: { name: 'ECOSTRESS', resolution: 70, temporal: '4 days', variables: ['lst', 'et'] },
  GPM: { name: 'GPM IMERG', resolution: 10000, temporal: '30 min', variables: ['precipitation'] },
  LANDSAT: { name: 'Landsat 8/9', resolution: 30, temporal: '16 days', variables: ['ndvi', 'evi', 'surface_reflectance'] },
  MODIS: { name: 'MODIS', resolution: 500, temporal: '1-2 days', variables: ['ndvi', 'evi', 'lst'] },
  POWER: { name: 'NASA POWER', resolution: 50000, temporal: 'daily', variables: ['temp', 'humidity', 'radiation', 'wind', 'frost'] },
  GRACE: { name: 'GRACE-FO', resolution: 300000, temporal: 'monthly', variables: ['water_storage'] },
  SRTM: { name: 'SRTM', resolution: 30, temporal: 'static', variables: ['elevation', 'slope', 'aspect'] },
} as const

// USDA Sources
export const USDA_SOURCES = {
  SSURGO: { name: 'SSURGO', resolution: 10, coverage: 'US', variables: ['texture', 'om', 'drainage', 'awc', 'k_factor'] },
  CDL: { name: 'Cropland Data Layer', resolution: 30, coverage: 'US', temporal: 'annual', variables: ['crop_type'] },
  NASS: { name: 'NASS QuickStats', coverage: 'US', temporal: 'annual', variables: ['yield', 'price', 'acreage'] },
  PRISM: { name: 'PRISM Climate', resolution: 4000, coverage: 'US', temporal: 'daily/monthly/30yr', variables: ['ppt', 'tmin', 'tmax', 'tdmean'] },
} as const

// Fenêtres temporelles analyse
export const ANALYSIS_PERIOD = {
  yearsBack: 10,
  minYears: 5,
} as const

// Seuils agronomiques
export const AGRONOMIC_THRESHOLDS = {
  ndvi_bare: 0.2,
  ndvi_stress: 0.4,
  frost_temp_c: 2,
  heat_stress_c: 35,
  sm_stress_pct: 30, // % field capacity
  erosion_tolerance: 5, // t/ha/an
} as const

// Couleurs statut (dataviz skill - réservées)
export const STATUS_COLORS = {
  good: '#2E7D32',
  warning: '#F57F17',
  serious: '#E65100',
  critical: '#B71C1C',
} as const

export const STATUS_LABELS = {
  good: 'Validé',
  warning: 'Attention',
  serious: 'Action requise',
  critical: 'Critique',
} as const
EOF

# 19. Fichiers vides pour structure features (placeholders)
touch src/features/parcel/{components,hooks,services}.tsx
touch src/features/soil/{components,hooks,services}.tsx
touch src/features/climate/nasa/{smap,ecostress,gpm,landsat,modis,power,grace,harmonizer}.ts
touch src/features/crops/{library,cdl,rotation-engine}.ts
touch src/features/scenarios/{components,hooks}.tsx
touch src/features/report/{components,hooks}.tsx
touch src/features/offline/{components,hooks}.tsx

# 20. Workers
cat > src/workers/harmonizer.worker.ts << 'EOF'
// Web Worker pour harmonisation données (hors thread principal)
// TODO: Implémenter résampling bilinéaire + agrégation temporelle

interface HarmonizeMessage {
  type: 'HARMONIZE'
  payload: {
    layers: any[]
    grid: any
    timeRange: [string, string]
  }
}

interface ResultMessage {
  type: 'RESULT' | 'PROGRESS' | 'ERROR'
  payload: any
}

self.onmessage = async (e: MessageEvent<HarmonizeMessage>) => {
  if (e.data.type !== 'HARMONIZE') return

  try {
    // TODO: Implémenter
    postMessage({ type: 'RESULT', payload: {} } as ResultMessage)
  } catch (err) {
    postMessage({ type: 'ERROR', payload: String(err) } as ResultMessage)
  }
}
EOF

# 21. Tests setup
cat > tests/setup.ts << 'EOF'
import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mocks globaux
vi.mock('maplibre-gl', () => ({
  Map: vi.fn(),
  NavigationControl: vi.fn(),
  GeolocateControl: vi.fn(),
}))

vi.mock('idb', () => ({
  openDB: vi.fn().mockResolvedValue({
    get: vi.fn(),
    put: vi.fn(),
    getAll: vi.fn(),
  }),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
EOF

cat > tests/unit/utils.test.ts << 'EOF'
import { describe, it, expect } from 'vitest'
import { formatNumber, formatPercent, formatCurrency, cn, validatePriorities } from '@shared/utils'

describe('Shared Utils', () => {
  describe('formatNumber', () => {
    it('formats with default decimals', () => {
      expect(formatNumber(1234.5)).toBe('1 234,5')
    })
    it('formats with custom decimals', () => {
      expect(formatNumber(1234.567, 2)).toBe('1 234,57')
    })
  })

  describe('formatPercent', () => {
    it('formats percentage', () => {
      expect(formatPercent(50)).toBe('50 %')
      expect(formatPercent(33.3, 1)).toBe('33,3 %')
    })
  })

  describe('formatCurrency', () => {
    it('formats USD', () => {
      expect(formatCurrency(1234)).toBe('1 234 $US')
    })
  })

  describe('cn', () => {
    it('merges classes', () => {
      expect(cn('base', 'override')).toBe('base override')
    })
  })

  describe('validatePriorities', () => {
    it('validates sum = 1', () => {
      expect(validatePriorities({ a: 0.5, b: 0.5 })).toBe(true)
      expect(validatePriorities({ a: 0.3, b: 0.3, c: 0.4 })).toBe(true)
    })
    it('rejects invalid sum', () => {
      expect(validatePriorities({ a: 0.5, b: 0.3 })).toBe(false)
      expect(validatePriorities({ a: 1, b: 1 })).toBe(false)
    })
  })
})
EOF

# 22. GitHub Actions CI
cat > .github/workflows/ci.yml << 'EOF'
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npx tsc --noEmit

      - name: Unit tests
        run: npm run test -- --run --coverage

      - name: Build
        run: npm run build

      - name: Upload coverage
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          fail_ci_if_error: false

  e2e:
    runs-on: ubuntu-latest
    needs: lint-and-test
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Build
        run: npm run build

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          PLAYWRIGHT_BASE_URL: http://localhost:3000

  deploy-preview:
    runs-on: ubuntu-latest
    needs: [lint-and-test, e2e]
    if: github.event_name == 'pull_request'
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel Preview
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          scope: ${{ secrets.VERCEL_ORG_ID }}
          alias-domains: pr-${{ github.event.number }}.nasa-crop-rotation.vercel.app
EOF

# 23. README
cat > README.md << 'EOF'
# 🌾 CropRotation NASA — NASA Space Apps Challenge 2026

> **Outil d'aide à la décision pour la rotation des cultures utilisant les observations de la Terre de la NASA**

[![CI](https://github.com/USER/nasa-crop-rotation/workflows/CI/badge.svg)](https://github.com/USER/nasa-crop-rotation/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![NASA Space Apps 2026](https://img.shields.io/badge/NASA%20Space%20Apps-2026-blue)](https://www.spaceappschallenge.org/)

## 🎯 Le Défi

*Changement de cap : adapter les exploitations agricoles grâce aux données de la NASA*

Les agriculteurs font face à des décisions complexes : variations de température, irrégularité des précipitations, pénuries d'eau, dégradation des sols. Ce outil combine **12+ datasets NASA/USDA** harmonisés pour proposer **3+ stratégies de rotation** comparées, explicables et actionnables.

## ✨ Fonctionnalités Clés

| Fonctionnalité | Description |
|---------------|-------------|
| 🗺️ **Sélection parcelle** | Dessin carte, import GeoJSON/KML, géocodage adresse |
| 🌱 **Diagnostic NASA** | 10 indicateurs : stress hydrique, thermique, gel, érosion, sol nu, bilan eau |
| 📊 **Comparateur scénarios** | 4+ rotations : Actuelle / Sol+ / Eau+ / Équilibrée + Radar chart interactif |
| 🎚️ **Test de résilience** | Sliders "Et si +2°C / -20% pluie" → recalcul temps réel |
| 📄 **Export rapport** | PDF prêt NRCS : carte, diagnostic, comparatif, plan d'action, contacts locaux |
| 📱 **PWA Offline-first** | Fonctionne sans connexion, données cachées 30 jours |
| ♿ **Accessible** | WCAG 2.1 AA, contrastes validés, navigation clavier |

## 🛰️ Sources de Données

**NASA (12+ datasets harmonisés 30m/8j) :**
- SMAP (humidité sol), ECOSTRESS (ET/LST), GPM/IMERG (précip), Landsat/MODIS (NDVI/EVI), NASA POWER (agromet), GRACE-FO (stockage eau), SRTM (topo)

**USDA / Partenaires :**
- SSURGO/STATSGO2 (sols), CDL (cultures historiques), NASS (marché), PRISM (climat local), OpenET (ET terrain), FAO GAEZ (potentiel global)

## 🚀 Démarrage Rapide

```bash
# 1. Cloner
git clone https://github.com/USER/nasa-crop-rotation.git
cd nasa-crop-rotation

# 2. Installer
npm install

# 3. Développer
npm run dev
# → http://localhost:3000
```

## 📦 Scripts Disponibles

```bash
npm run dev          # Serveur dev (Vite)
npm run build        # Build production
npm run preview      # Prévisualiser build
npm run lint         # ESLint
npm run test         # Tests unitaires (Vitest)
npm run test:e2e     # Tests E2E (Playwright)
npm run format       # Prettier
```

## 🏗️ Architecture

```
src/
├── app/                    # App shell, routing, providers
├── features/               # Modules métier (feature-based)
│   ├── parcel/             # Sélection parcelle
│   ├── soil/               # Profil pédologique (SSURGO/GAEZ)
│   ├── climate/            # Données NASA + harmonisation
│   │   └── nasa/           # Clients API + Harmonizer (CORE)
│   ├── crops/              # Bibliothèque cultures + moteur rotation
│   │   └── rotation-engine/# Generator, Scorer, Uncertainty
│   ├── scenarios/          # UI comparateur
│   ├── report/             # Export PDF
│   └── offline/            # PWA + IndexedDB
├── shared/                 # UI, hooks, utils, types communs
├── workers/                # Web Workers (harmonisation, scoring, PDF)
└── styles/                 # Tokens, globals, Tailwind
```

## 🔬 Pipeline de Données (Le Cœur Technique)

```
Données brutes (COG/NetCDF/GeoJSON)
       │
       ▼
┌─────────────────────────────────────┐
│  HARMONIZER (Web Worker)            │
│  • Reprojection EPSG:3857           │
│  • Résample spatial 30m             │
│    - Continu: bilinéaire/cubique    │
│    - Discret: majorité/nearest      │
│  • Résample temporel 8 jours        │
│    - Moyenne/max/somme selon var    │
│  • Gap-filling interpolation        │
│  • Masque parcelle + buffer 1km     │
└─────────────────────────────────────┘
       │
       ▼
Cube harmonisé (parcelle × temps × variables)
       │
       ▼
Indicateurs dérivés → Moteur scénarios → UI
```

## 🎨 Design System

- **Palette** : Tokens validés CVD (dataviz skill), ordre catégoriel immuable
- **Typographie** : Space Grotesk (display) + Inter (body) + JetBrains Mono (data)
- **Thèmes** : Light/Dark/System native, respect `prefers-color-scheme`
- **Composants** : DaisyUI + composants custom (StatTile, Badge, StressCalendar, RadarChart)

## 📋 Cahier des Charges Complet

Voir [`NASA_SPACE_APPS_2026_SPECIFICATION.md`](NASA_SPACE_APPS_2026_SPECIFICATION.md) pour :
- Méthodologie gagnante (4 piliers, triangulation NASA+Terrain+Marché)
- Exigences MoSCoW détaillées (F-01 à F-16)
- Architecture technique complète
- Pipeline harmonisation multi-résolution
- Moteur scénarios (génération, scoring, incertitude)
- Parcours utilisateur 5 étapes (< 10 min)
- Plan d'implémentation 2 semaines jour par jour
- Métriques de succès alignées critères jury NASA

## 🧪 Tests

```bash
# Unitaires
npm run test -- --run

# Avec UI
npm run test:ui

# E2E
npm run test:e2e
```

## 🚢 Déploiement

- **Vercel** (recommandé) : `vercel --prod`
- **Netlify** : Connect repo, build `npm run build`, publish `dist`
- **Docker** : `docker build -t nasa-crop-rotation .`

Variables d'environnement requises :
```env
VITE_NASA_EARTHDATA_TOKEN=your_token
VITE_USDA_NASS_KEY=your_key
VITE_OPENET_KEY=your_key
```

## 🤝 Contribution

1. Fork → branche feature → PR
2. `npm run lint && npm run test && npm run build` doivent passer
3. Respecter les conventions : commits conventionnels, types stricts, tests pour nouvelle logique

## 📄 Licence

MIT — Voir [LICENSE](LICENSE)

## 🙏 Remerciements

- NASA Science Mission Directorate
- USDA NRCS, NASS, ARS
- ESA Copernicus / ECMWF ERA5
- Communautés open source : MapLibre, uPlot, Turf.js, GeoTIFF.js

---

**Équipe :** [Votre Nom] — NASA Space Apps Challenge 2026
*Fait avec 🌱 pour les agriculteurs, par des développeurs qui respectent la terre.*
EOF

# 24. .gitignore
cat > .gitignore << 'EOF'
# Dependencies
node_modules/

# Build
dist/
build/
*.local

# Environment
.env
.env.local
.env.*.local

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Test
coverage/
.nyc_output/
playwright-report/
test-results/

# Cache
.eslintcache
.vite/
*.tsbuildinfo

# Data (large files)
public/data/*.tif
public/data/*.nc
public/data/*.hdf
*.mbtiles

# Misc
*.pem
.vercel
.netlify
EOF

# 25. .env.example
cat > .env.example << 'EOF'
# NASA Earthdata (https://urs.earthdata.nasa.gov/)
VITE_NASA_EARTHDATA_USERNAME=
VITE_NASA_EARTHDATA_PASSWORD=

# USDA NASS QuickStats (https://quickstats.nass.usda.gov/api)
VITE_USDA_NASS_KEY=

# OpenET (https://openetdata.org/)
VITE_OPENET_KEY=

# Planetary Computer (optionnel, pour STAC search)
VITE_PLANETARY_COMPUTER_KEY=

# Feature flags
VITE_ENABLE_MOCK_DATA=true
VITE_DEBUG_MODE=false
EOF

echo ""
echo "✅ Projet initialisé avec succès !"
echo ""
echo "📁 Structure créée dans : $(pwd)/nasa-crop-rotation"
echo ""
echo "🚀 Prochaines étapes :"
echo "   cd nasa-crop-rotation"
echo "   npm install"
echo "   npm run dev"
echo ""
echo "📖 Lire le cahier des charges :"
echo "   cat ../NASA_SPACE_APPS_2026_SPECIFICATION.md"
echo ""
echo "🎯 Objectif : NASA Space Apps Challenge 2026 - Vainqueur !"
EOF

chmod +x init-project.sh

echo "✅ Script d'initialisation créé dans C:\Users\royal\Documents\nasa-space-apps-2026\init-project.sh"
echo "   Exécutez : bash init-project.sh"