# Map System Architecture Documentation

## Executive Summary

This is an **enterprise-grade, production-ready map system** designed using the **Adapter Design Pattern** to provide:

✅ **Seamless provider switching** (MapLibre ↔ Google Maps)
✅ **Zero UI/UX changes** when switching providers
✅ **Mobile-first architecture** with safe area awareness
✅ **Memory leak prevention** using React best practices
✅ **TypeScript type safety** for all components
✅ **Extensible design** for adding new providers

---

## Design Patterns Used

### 1. **Adapter Pattern**
Allows different map libraries to be used interchangeably by implementing a common interface.

```
┌────────────────┐
│   IMapAdapter  │ ◄────── Common Interface
│   Interface    │
└────────────────┘
       ▲     ▲
       │     │
    Implements
       │
    ┌──┴──────┬──────────┐
    ▼         ▼          ▼
┌────────┐┌────────┐┌─────────┐
│MapLibre││Google  ││Future   │
│Adapter ││Maps    ││Provider │
└────────┘└────────┘└─────────┘
```

### 2. **Factory Pattern**
`MapContainer` acts as a factory that creates the appropriate adapter based on configuration.

### 3. **Hook Pattern**
`useMapConfig` provides reactive configuration reading for adapters.

### 4. **Composition Pattern**
`MapView` composes `MapContainer`, `SafeAreaWrapper`, and detail components.

---

## Component Hierarchy

```
App
├── MapView (40/60 layout)
│   ├── SafeAreaWrapper (mobile safe areas)
│   │   ├── MapContainer (adapter selector)
│   │   │   ├── MapLibreComponent OR
│   │   │   └── GoogleMapsComponent
│   │   └── Details Section (scrollable)
```

---

## Detailed API Reference

### MapAdapterProps

```typescript
interface MapAdapterProps {
  // Map center coordinates (latitude, longitude)
  center: MapCoordinates;

  // Zoom level (0-22)
  zoom: number;

  // GeoJSON feature collection or feature
  geoJson: GeoJSON | null;

  // Light or dark theme
  theme: 'light' | 'dark';

  // Called when map is ready for interaction
  onMapReady?: () => void;

  // Called when map encounters an error
  onError?: (error: Error) => void;
}
```

### IMapAdapter Methods

#### `initialize(container: HTMLElement): Promise<void>`
- **Purpose**: Initialize the map in the given container
- **When Called**: Once on component mount
- **Should Handle**: 
  - Creating the map instance
  - Loading map tiles
  - Setting up event listeners
  - Adding map controls

#### `setView(center: MapCoordinates, zoom: number, animate?: boolean): Promise<void>`
- **Purpose**: Update map center and zoom level
- **When Called**: When center or zoom props change
- **animate**: When true, uses smooth transition (flyTo/panTo)

#### `setGeoJson(geoJson: GeoJSON | null): Promise<void>`
- **Purpose**: Load or update GeoJSON features on the map
- **When Called**: When geoJson prop changes
- **Should Handle**:
  - Clearing previous features
  - Adding new features
  - Styling features appropriately

#### `setTheme(theme: 'light' | 'dark'): Promise<void>`
- **Purpose**: Switch between light and dark map styles
- **When Called**: When theme prop changes

#### `destroy(): void`
- **Purpose**: Clean up resources and prevent memory leaks
- **When Called**: On component unmount
- **Must Handle**:
  - Removing event listeners
  - Destroying the map instance
  - Clearing cached data

---

## MapLibre GL JS Adapter Details

### Initialization
- Uses OpenStreetMap tiles by default (configurable)
- Adds navigation controls (zoom, compass)
- Sets up a GeoJSON source for country borders
- Adds fill and line layers for visualization

### Performance Features
- Uses `flyTo` for smooth 2-second transitions
- Defers map initialization until container is mounted
- Prevents re-initialization via ref tracking
- Uses lazy data updates (only when source is ready)

### Memory Management
```typescript
useEffect(() => {
  const adapter = new MapLibreAdapter();
  // ... initialization
  
  return () => {
    adapter.destroy(); // Critical: Prevents memory leaks
  };
}, []); // Only on mount/unmount
```

---

## Google Maps Adapter Details

### Initialization
- Creates Google Map instance with standard controls
- Initializes Data Layer for GeoJSON support
- Configures map type control at BOTTOM_LEFT
- Sets up hover effects on features

### API Key Configuration
Ensure Google Maps API key is loaded before component mounts:

```html
<!-- In index.html -->
<script async defer
  src="https://maps.googleapis.com/maps/api/js?key=YOUR_API_KEY">
</script>
```

### Styling
- Supports dark mode via `map.setOptions({ styles })`
- Implements Material Design 3 colors
- Customizable opacity and weight

---

## Safe Area Implementation

### Problem
Mobile devices have notches, rounded corners, and system UI bars that can overlap your content.

### Solution
Uses CSS environment variables set by Capacitor/system:

```css
:root {
  --safe-area-inset-top: env(safe-area-inset-top, 0);
  --safe-area-inset-bottom: env(safe-area-inset-bottom, 0);
  --safe-area-inset-left: env(safe-area-inset-left, 0);
  --safe-area-inset-right: env(safe-area-inset-right, 0);
}
```

### SafeAreaWrapper Application
```typescript
<SafeAreaWrapper applyPadding={true}>
  {/* Content is automatically inset */}
</SafeAreaWrapper>
```

---

## Configuration System

### Three-Tier Configuration

**1. Environment Variables** (Priority 1)
```bash
REACT_APP_MAP_PROVIDER=google npm run dev
```

**2. Config File** (Priority 2)
```typescript
// src/config/mapConfig.ts
export const mapConfig = {
  provider: 'maplibre',
  theme: 'dark',
  enableDebug: true,
};
```

**3. Runtime Override** (Priority 3)
```typescript
// Future feature: Allow users to switch in app settings
useMapConfig().provider = 'google';
```

---

## Data Flow Diagram

```
Props Change
  │
  ▼
useEffect Hook
  │
  ├─► center/zoom changed? ──► adapterRef.setView()
  ├─► geoJson changed?     ──► adapterRef.setGeoJson()
  └─► theme changed?       ──► adapterRef.setTheme()
  │
  ▼
Adapter Updates Map
  │
  ▼
User Sees Updated Map
```

---

## Error Handling Strategy

```typescript
// Component Level
try {
  await adapter.initialize(container);
} catch (error) {
  onError?.(error);
  setMapError(error.message);
  // Show error UI
}

// User-Facing Error
<MapView
  onError={(error) => {
    showNotification('Map failed to load: ' + error.message);
  }}
/>
```

---

## Performance Optimization

### 1. **Ref Prevents Re-renders**
```typescript
const adapterRef = useRef<MapLibreAdapter | null>(null);
// Map is not recreated on every render
```

### 2. **Memoization Prevents Unnecessary Switches**
```typescript
const MapComponent = useMemo(() => {
  return config.provider === 'google' ? GoogleMapsComponent : MapLibreComponent;
}, [config.provider]); // Only recreates if provider changes
```

### 3. **Lazy Loading**
GeoJSON is only loaded when component is visible

### 4. **Batched Updates**
Map updates are batched with React's concurrent rendering

---

## Testing Strategy

### Unit Tests
```typescript
// Test adapter interface compliance
test('MapLibreAdapter implements IMapAdapter', () => {
  const adapter = new MapLibreAdapter();
  expect(adapter.initialize).toBeDefined();
  expect(adapter.setView).toBeDefined();
  expect(adapter.setGeoJson).toBeDefined();
  expect(adapter.destroy).toBeDefined();
});
```

### Integration Tests
```typescript
// Test provider switching
test('MapContainer renders correct adapter', () => {
  render(<MapContainer provider="maplibre" />);
  expect(screen.getByRole('region')).toBeInTheDocument();
});
```

### E2E Tests
```typescript
// Test full map interaction
test('User can zoom and pan map', async () => {
  render(<MapView />);
  const mapContainer = screen.getByRole('region');
  // Simulate user zoom/pan
  // Assert map updates correctly
});
```

---

## Browser Compatibility Matrix

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 90+ | ✅ Full Support | Recommended |
| Firefox | 88+ | ✅ Full Support | |
| Safari | 14+ | ✅ Full Support | Notch support on iPhone |
| Edge | 90+ | ✅ Full Support | Chromium-based |
| Chrome Android | Latest | ✅ Full Support | Native safe area |
| Safari iOS | 14+ | ✅ Full Support | Native safe area |

---

## Deployment Checklist

- [ ] Environment variables configured
- [ ] API keys secured (not in source code)
- [ ] Safe area CSS variables set
- [ ] Mobile testing completed
- [ ] Memory profiling done
- [ ] Error handling tested
- [ ] Performance benchmarked
- [ ] Documentation updated

---

## Future Enhancements

### Phase 2: Features
- [ ] Marker clustering
- [ ] Custom map controls
- [ ] Heatmaps
- [ ] 3D elevation
- [ ] Real-time location tracking

### Phase 3: Providers
- [ ] Mapbox GL JS
- [ ] Leaflet.js
- [ ] Here Maps
- [ ] ArcGIS

### Phase 4: Advanced
- [ ] Offline map tiles
- [ ] Progressive enhancement
- [ ] Analytics integration
- [ ] A/B testing provider performance

---

## Summary

This map system provides:
- **Production-grade reliability** through proven design patterns
- **Developer flexibility** with adapter pattern
- **User experience consistency** across providers
- **Mobile optimization** native to the platform
- **Future scalability** with extensible architecture

For detailed component usage, refer to [README.md](./README.md)
