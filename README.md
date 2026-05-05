# World Atlas & Country Info

A fully-featured Android & web application for exploring world geography, country boundaries, statistics, and detailed country information — built with React, Vite, TypeScript, and Capacitor.

---

## Features

### 🗺️ Interactive Map
- Dual map engine support: **MapLibre GL** (default, free) and **Google Maps**
- Tap any country on the map to highlight its geofence and open its info panel
- Supports **Countries**, **Continents**, and **Oceans** as selectable layers
- Auto-centers and zooms to fit the selected region
- Smooth geofence rendering with TopoJSON for all 200+ countries

### 🌍 Countries
- 200+ sovereign states including Palestine, Andorra, Antigua & Barbuda, Kiribati, Eswatini, Taiwan, and more
- Full geofence (boundary) display for every country
- Country flag displayed alongside the geofence
- Country info drawer with:
  - Flag & Coat of Arms (emblem)
  - Capital, Population, Area
  - Continent, Languages, Currencies, Timezones
  - Landlocked status
  - CIA World Factbook data (Economy, Military, Government, Geography, People & Society, and more)

### 🌊 Oceans
- All **5 major oceans** with accurate bounding geofences:
  - Pacific Ocean (spans both sides of the International Date Line)
  - Atlantic Ocean
  - Indian Ocean
  - Arctic Ocean
  - Southern Ocean

### 🌐 Continents
- All **7 continents** with geofence boundaries
- Continent-level info panel

### 📊 Rankings (Statistics Screens)
All statistics screens support **search by country name** and **swipe gestures** to switch between sub-categories.

| Screen | Sub-categories |
|---|---|
| **Military Power** | Global Power Index, Global Militarization Index, Military Expenditure, Military Personnel, Heavy Weapons |
| **GDP** | PPP Total, PPP Per Capita, Nominal Total, Nominal Per Capita |
| **Social Index** | Human Development Index (HDI), Life Expectancy, Happiness Score |
| **Economy** | GDP Growth, Inflation, Trade Balance, FDI Inflow |
| **Demographics** | Population, Population Density, Urban Population, Median Age |
| **Education & Technology** | Literacy Rate, Education Index, Internet Usage, R&D Spending |
| **Governance & Freedom** | Democracy Index, Press Freedom, Corruption Perception, Rule of Law |
| **Energy & Infrastructure** | Energy Production, Renewable Share, Electricity Access, CO₂ Emissions |
| **Geography & Environment** | Land Area, Forest Cover, Freshwater, Biodiversity Index |

### ⚖️ Compare Countries
- Side-by-side country comparison
- Select any two countries using the searchable country picker
- Scrollable category chips to switch between: Military, Social, Economy, Demographics, Education, Governance, Energy, Geography
- Live comparison table with visual indicators

### ⚙️ Settings
- Switch map provider (MapLibre / Google Maps)
- View all data sources and attributions

---

## Data Sources

| Data | Source |
|---|---|
| Country boundaries (TopoJSON) | Custom curated dataset |
| Country metadata | REST Countries / custom |
| Factbook data | CIA World Factbook (via factbook.json) |
| Military Power Index | Global Firepower Index 2024–2025 |
| Global Militarization Index | BICC GMI 2023 |
| GDP data | IMF World Economic Outlook 2024 |
| Human Development Index | UNDP HDR 2023–2024 |
| Happiness Score | World Happiness Report 2024 |
| Population / Demographics | UN Population Division 2024 |
| Education & Literacy | UNESCO Institute for Statistics |
| Democracy / Governance | EIU Democracy Index / Transparency International |
| Energy data | IEA / World Bank |
| Agriculture / Environment | FAO |
| Country flags | SVG flag icons |
| Coat of Arms (emblems) | Mainfacts.com / Wikipedia |

---

## Project Structure

```
├── public/
│   ├── topojson/               # TopoJSON boundary files
│   │   ├── *.json              # Country boundaries (200+)
│   │   ├── continents/         # Continent boundaries
│   │   └── oceans/
│   │       └── Oceans/         # 5 major ocean geofences (.geojson)
│   ├── flags/                  # Country flag SVGs (ISO2 named)
│   └── factbook.json-master/   # CIA World Factbook JSON data
├── src/
│   ├── components/
│   │   ├── MapComponent.tsx        # Map rendering (MapLibre / Google Maps)
│   │   ├── CountryInfoCard.tsx     # Country detail drawer
│   │   ├── StatisticsScreen.tsx    # All ranking/statistics screens
│   │   ├── CompareScreen.tsx       # Country comparison screen
│   │   ├── SettingsDrawer.tsx      # App settings
│   │   ├── AboutScreen.tsx         # Data sources info
│   │   └── map/                    # Map adapter layer
│   ├── data/
│   │   ├── countries-info.json     # Country metadata (200+ countries)
│   │   ├── countries_meta.json     # Coat of arms URLs
│   │   ├── military-powers.json    # Military power rankings
│   │   ├── gmi-stats.json          # Global Militarization Index
│   │   ├── gdp-stats.json          # GDP data (PPP & Nominal)
│   │   ├── social-index.json       # HDI, Life Expectancy, Happiness
│   │   ├── economy-stats.json      # Economic indicators
│   │   ├── demographics-stats.json # Population & demographics
│   │   ├── education-stats.json    # Education & technology
│   │   ├── governance-stats.json   # Democracy & freedom indices
│   │   ├── energy-stats.json       # Energy & environment
│   │   └── geography-stats.json    # Geography & environment
│   ├── utils/
│   │   ├── geojsonLoader.ts        # TopoJSON/GeoJSON loading & country list
│   │   ├── factbookLoader.ts       # CIA Factbook data loader
│   │   └── gecMapping.ts           # GEC ↔ ISO2 country code mapping
│   ├── App.tsx
│   └── main.tsx
├── android/                        # Capacitor Android project
├── capacitor.config.ts
├── index.html
├── package.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- npm 9+
- Android Studio (for Android builds)

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
```
App runs at `http://localhost:5173`

### Production Web Build
```bash
npm run build
```

### Android Build

Sync web assets to Android and build:
```bash
npm run build
npx cap sync android
cd android
./gradlew assembleRelease    # APK
./gradlew bundleRelease      # AAB (Play Store)
```

Output files:
- `android/app/build/outputs/apk/release/app-release.apk`
- `android/app/build/outputs/bundle/release/app-release.aab`

### Lint
```bash
npm run lint
```

---

## Technologies Used

| Technology | Purpose |
|---|---|
| React 19 | UI library |
| TypeScript | Type safety |
| Vite 8 | Build tool & dev server |
| MapLibre GL JS | Default open-source map engine |
| Google Maps API | Alternative map engine |
| TopoJSON / GeoJSON | Country & ocean boundary data |
| Capacitor 8 | Android native wrapper |

---

## App Info

- **App Name:** World Atlas & Country Info
- **Package ID:** com.nivedh.WorldAtlasCountryInfo.app
- **Platform:** Android (APK / AAB) + Web
- **Min SDK:** Android 5.0+
