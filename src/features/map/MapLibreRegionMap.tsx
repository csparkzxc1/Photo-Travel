import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapLibreGL, {
  Camera,
  CircleLayer,
  FillLayer,
  HeatmapLayer,
  LineLayer,
  MapView,
  ShapeSource,
} from '@maplibre/maplibre-react-native';
import { Region } from '@core/types';
import { useTheme } from '@design/ThemeProvider';
import { regionsToFeatureCollection } from '@data/loadGeoAssets';
import { palette, pickPastel } from '@design/tokens';

// MapLibre RN requires no token for public OSM tile servers, but some builds
// still want this set explicitly to be safe.
MapLibreGL.setAccessToken?.(null);

/**
 * Production-grade map view backed by MapLibre Native (GL ES on Android,
 * Metal on iOS). Renders region polygons as a vector layer, supports the
 * same three modes as the SVG fallback (region / heatmap / marker), and
 * uses a free demo tiles style for the basemap.
 *
 * Requires `expo prebuild` + a development build — does NOT work in Expo Go.
 * Falls back to `RegionMap` (SVG) for development convenience. See
 * `src/features/map/MapView.tsx` for the runtime selector.
 */
interface MapLibreRegionMapProps {
  regions: Region[];
  visitedRegionIds: Set<string>;
  photos?: Array<{ lat: number; lng: number; id: string }>;
  mode: 'region' | 'heatmap' | 'marker';
  lens?: 'visited' | 'unvisited';
}

const STYLE_URL_LIGHT = 'https://demotiles.maplibre.org/style.json';
const STYLE_URL_DARK = 'https://api.maptiler.com/maps/streets-dark/style.json';

export function MapLibreRegionMap({
  regions,
  visitedRegionIds,
  photos = [],
  mode,
  lens = 'visited',
}: MapLibreRegionMapProps) {
  const { theme, name } = useTheme();

  const regionFC = useMemo(() => {
    const fc = regionsToFeatureCollection(regions);
    // Inject visit state + per-feature paint color so MapLibre data-driven
    // styling can colour each region in a single GPU pass.
    fc.features = fc.features.map((f) => {
      const id = String(f.properties?.id ?? '');
      const visited = visitedRegionIds.has(id);
      const highlight = lens === 'unvisited' ? !visited : visited;
      return {
        ...f,
        properties: {
          ...f.properties,
          visited,
          highlight,
          color: highlight ? pickPastel(id) : theme.mapUnvisited,
        },
      };
    });
    return fc;
  }, [regions, visitedRegionIds, lens, theme.mapUnvisited]);

  const photoFC = useMemo<GeoJSON.FeatureCollection>(
    () => ({
      type: 'FeatureCollection',
      features: photos.map((p) => ({
        type: 'Feature' as const,
        id: p.id,
        properties: { id: p.id },
        geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      })),
    }),
    [photos]
  );

  const center = useMemo(() => boundsCenter(regions), [regions]);
  const zoom = useMemo(() => boundsZoom(regions), [regions]);

  return (
    <View style={[styles.container, { backgroundColor: theme.mapWater }]}>
      <MapView
        style={StyleSheet.absoluteFillObject}
        mapStyle={name === 'dark' ? STYLE_URL_DARK : STYLE_URL_LIGHT}
        logoEnabled={false}
        attributionEnabled
      >
        <Camera centerCoordinate={center} zoomLevel={zoom} animationMode="moveTo" />

        <ShapeSource id="regions" shape={regionFC}>
          <FillLayer
            id="region-fill"
            style={{
              fillColor: ['get', 'color'],
              fillOpacity: mode === 'heatmap' ? 0.25 : lens === 'unvisited' ? 0.85 : 0.7,
            }}
          />
          <LineLayer
            id="region-line"
            style={{
              lineColor: theme.bg,
              lineWidth: 1,
              lineOpacity: 0.6,
            }}
          />
        </ShapeSource>

        {(mode === 'marker' || mode === 'heatmap') && (
          <ShapeSource id="photos" shape={photoFC}>
            {mode === 'heatmap' && (
              <HeatmapLayer
                id="photo-heatmap"
                style={{
                  heatmapRadius: 22,
                  heatmapIntensity: 1,
                  heatmapOpacity: 0.85,
                  heatmapColor: [
                    'interpolate',
                    ['linear'],
                    ['heatmap-density'],
                    0,
                    'rgba(0,0,0,0)',
                    0.2,
                    palette.brand400,
                    0.6,
                    palette.accent500,
                    1,
                    palette.danger500,
                  ],
                }}
              />
            )}
            {mode === 'marker' && (
              <CircleLayer
                id="photo-pins"
                style={{
                  circleRadius: 4,
                  circleColor: palette.accent500,
                  circleStrokeColor: '#fff',
                  circleStrokeWidth: 1,
                }}
              />
            )}
          </ShapeSource>
        )}
      </MapView>
    </View>
  );
}

function boundsCenter(regions: Region[]): [number, number] {
  if (!regions.length) return [127.5, 36.5];
  const minLng = Math.min(...regions.map((r) => r.bbox[0]));
  const minLat = Math.min(...regions.map((r) => r.bbox[1]));
  const maxLng = Math.max(...regions.map((r) => r.bbox[2]));
  const maxLat = Math.max(...regions.map((r) => r.bbox[3]));
  return [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
}

function boundsZoom(regions: Region[]): number {
  if (!regions.length) return 6;
  const minLng = Math.min(...regions.map((r) => r.bbox[0]));
  const minLat = Math.min(...regions.map((r) => r.bbox[1]));
  const maxLng = Math.max(...regions.map((r) => r.bbox[2]));
  const maxLat = Math.max(...regions.map((r) => r.bbox[3]));
  const span = Math.max(maxLng - minLng, maxLat - minLat);
  if (span > 8) return 5;
  if (span > 3) return 6;
  if (span > 1) return 8;
  if (span > 0.4) return 10;
  return 11;
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
});
