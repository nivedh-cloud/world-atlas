# MapProvider System Architecture

## Overview

This is a **production-grade modular map system** using the **Adapter Pattern** that allows seamless switching between:
- **MapLibre GL JS** (free, open-source)
- **Google Maps JavaScript API** (for future paid users)

All adapters implement a consistent interface, making it trivial to switch providers or add new ones.

## Architecture Diagram

```
┌─────────────────────────────────────────────┐
│           MapView Component                 │
│  (40% Map + 60% Details Layout)             │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│    MapContainer (Adapter Pattern)           │
│  (Reads config & selects implementation)    │
└────────────┬────────────────────────────────┘
             │
     ┌───────┴────────┐
     ▼                ▼
┌────────────┐  ┌────────────────┐
│  MapLibre  │  │  Google Maps   │
│ Adapter    │  │  Adapter       │
└────────────┘  └────────────────┘
     │                │
     └────────┬───────┘
              ▼
       ┌─────────────┐
       │ IMapAdapter │
       │  Interface  │
       └─────────────┘
```

## Directory Structure

```
src/
├── components/
│   └── map/
│       ├── MapContainer.tsx          # Adapter orchestrator
│       ├── MapLibreAdapter.tsx       # MapLibre implementation
│       ├── GoogleMapsAdapter.tsx     # Google Maps implementation
│       ├── MapView.tsx               # 40/60 layout wrapper
│       ├── SafeAreaWrapper.tsx       # Mobile safe area handling
│       ├── MapViewExample.tsx        # Usage example
│       └── index.ts                  # Module exports
├── config/
│   └── mapConfig.ts                  # Map configuration & hooks
├── types/
│   └── mapAdapter.ts                 # TypeScript interfaces
└── index.css                         # Safe area CSS variables
```

## Key Components

### 1. **IMapAdapter Interface** (`src/types/mapAdapter.ts`)

All map implementations must conform to this interface:

```typescript
interface IMapAdapter {
  initialize(container: HTMLElement): Promise<void>;
  setView(center: MapCoordinates, zoom: number, animate?: boolean): Promise<void>;
  setGeoJson(geoJson: GeoJSON | null): Promise<void>;
  setTheme(theme: 'light' | 'dark'): Promise<void>;
  destroy(): void;
}
```

### 2. **MapContainer Component** (`src/components/map/MapContainer.tsx`)

Automatically selects the correct adapter based on configuration:

```typescript
<MapContainer
  center={{ lat: 51.5074, lng: -0.1278 }}
  zoom={12}
  geoJson={countryData}
  theme="light"
  onMapReady={() => console.log('Ready')}
  onError={(error) => console.error(error)}
/>
```

### 3. **MapView Component** (`src/components/map/MapView.tsx`)

Complete layout with 40% map and 60% scrollable details:

```typescript
<MapView
  geoJson={geoJson}
  center={coordinates}
  zoom={6}
  detailsContent={<CountryDetails />}
  theme="light"
  mapClassName="shadow-lg"
  detailsClassName="bg-gradient-to-b from-white to-gray-50"
/>
```

### 4. **SafeAreaWrapper** (`src/components/map/SafeAreaWrapper.tsx`)

Handles iOS/Android notches and system UI:

```typescript
<SafeAreaWrapper applyPadding={true}>
  {children}
</SafeAreaWrapper>
```

## Configuration

### Set Map Provider

**Option 1: Environment Variable**
```bash
REACT_APP_MAP_PROVIDER=maplibre  # or 'google'
npm run dev
```

**Option 2: Direct Config**
```typescript
// src/config/mapConfig.ts
export const mapConfig: MapConfig = {
  provider: 'google',  // Switch to Google Maps
  theme: 'light',
  enableDebug: true,
};
```

## Usage Example

```typescript
import { MapView } from './components/map';
import { MapCoordinates, GeoJSON } from './types/mapAdapter';

function App() {
  const [country, setCountry] = useState('Australia');
  const [geoJson, setGeoJson] = useState<GeoJSON | null>(null);

  useEffect(() => {
    // Load country GeoJSON
    fetch(`/geojson/${country.toLowerCase()}.geojson`)
      .then(r => r.json())
      .then(setGeoJson);
  }, [country]);

  const center: MapCoordinates = { lat: -25.2744, lng: 133.7751 };

  return (
    <MapView
      geoJson={geoJson}
      center={center}
      zoom={4}
      detailsContent={
        <div>
          <h2>{country}</h2>
          <p>Capital: Canberra</p>
          <p>Population: 26M+</p>
        </div>
      }
    />
  );
}
```

## Mobile Optimization

### Safe Area Insets

The system uses native CSS environment variables to respect safe areas:

```css
/* index.css */
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0);
  --safe-area-inset-left: env(safe-area-inset-left, 0);
  --safe-area-inset-right: env(safe-area-inset-right, 0);
}
```

### Memory Leak Prevention

Both adapters use `useRef` to prevent re-initialization:

```typescript
const adapterRef = useRef<MapLibreAdapter | null>(null);

useEffect(() => {
  const adapter = new MapLibreAdapter();
  await adapter.initialize(containerRef.current);
  adapterRef.current = adapter;

  return () => {
    adapter.destroy(); // Cleanup on unmount
  };
}, []);
```

## Performance Characteristics

| Feature | MapLibre | Google Maps |
|---------|----------|------------|
| Bundle Size | ~100 KB | Required API |
| Cost | Free | Pay per usage |
| Offline Support | ✅ Yes | ❌ No |
| Custom Styling | ✅ Full | ✅ Limited |
| Mobile Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Data Layers | ✅ GeoJSON | ✅ GeoJSON |

## Adding a New Map Provider

To add a new map provider (e.g., Mapbox, Leaflet):

1. Create adapter class implementing `IMapAdapter`:
```typescript
// src/components/map/LeafletAdapter.tsx
class LeafletAdapter implements IMapAdapter {
  async initialize(container: HTMLElement): Promise<void> { ... }
  async setView(...): Promise<void> { ... }
  // ... implement all interface methods
}
```

2. Create React wrapper:
```typescript
export const LeafletComponent: React.FC<MapAdapterProps> = ({ ... }) => {
  // Component logic
}
```

3. Register in MapContainer:
```typescript
const MapComponent = useMemo(() => {
  switch(config.provider) {
    case 'leaflet':
      return LeafletComponent;
    case 'google':
      return GoogleMapsComponent;
    default:
      return MapLibreComponent;
  }
}, [config.provider]);
```

## Troubleshooting

### Map Not Rendering
- Check browser console for errors
- Verify container has non-zero dimensions
- Ensure API keys are configured (for Google Maps)

### Memory Issues in WebView
- Component uses `useRef` to prevent re-initialization
- Memory leaks are cleaned up on unmount
- Check browser DevTools for detached DOM nodes

### GeoJSON Not Displaying
- Verify GeoJSON is valid (use geojson.io)
- Check browser console for parsing errors
- Ensure feature coordinates are [lng, lat] order

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS Safari, Chrome Android)

## Dependencies

```json
{
  "maplibre-gl": "^3.0.0",
  "react": "^19.0.0",
  "tailwindcss": "^3.0.0"
}
```

## License

This system is part of your application. Adapt as needed for your use case.
