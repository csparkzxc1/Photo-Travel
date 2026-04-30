import React, { useMemo } from 'react';
import { LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { Region } from '@core/types';
import { useTheme } from '@design/ThemeProvider';
import { palette, pickPastel } from '@design/tokens';

interface RegionMapProps {
  regions: Region[];
  visitedRegionIds: Set<string>;
  photos?: Array<{ lat: number; lng: number; id: string }>;
  mode: 'region' | 'heatmap' | 'marker';
}

/**
 * Lightweight SVG renderer for region polygons. The MVP uses simplified bbox geometry
 * so this looks like a stylised tile map; production swaps in MapLibre with full
 * GeoJSON polygons and clustered markers.
 */
export function RegionMap({ regions, visitedRegionIds, photos = [], mode }: RegionMapProps) {
  const { theme } = useTheme();
  const [size, setSize] = React.useState({ w: 0, h: 0 });

  const onLayout = (e: LayoutChangeEvent) => {
    setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height });
  };

  const projected = useMemo(() => {
    if (!regions.length || !size.w) return null;

    const minLng = Math.min(...regions.map((r) => r.bbox[0]));
    const minLat = Math.min(...regions.map((r) => r.bbox[1]));
    const maxLng = Math.max(...regions.map((r) => r.bbox[2]));
    const maxLat = Math.max(...regions.map((r) => r.bbox[3]));

    const padding = 24;
    const w = size.w - padding * 2;
    const h = size.h - padding * 2;
    const rangeLng = maxLng - minLng || 1;
    const rangeLat = maxLat - minLat || 1;
    const scale = Math.min(w / rangeLng, h / rangeLat);

    const offsetX = padding + (w - rangeLng * scale) / 2;
    const offsetY = padding + (h - rangeLat * scale) / 2;

    const project = (lng: number, lat: number) => ({
      x: offsetX + (lng - minLng) * scale,
      y: offsetY + (maxLat - lat) * scale,
    });

    return { project };
  }, [regions, size.w, size.h]);

  return (
    <View
      style={[styles.container, { backgroundColor: theme.mapWater }]}
      onLayout={onLayout}
    >
      {projected && size.w > 0 && (
        <Svg width={size.w} height={size.h}>
          <G>
            {regions.map((region) => {
              const visited = visitedRegionIds.has(region.id);
              const ring = (region.geometry.type === 'Polygon'
                ? region.geometry.coordinates[0]
                : region.geometry.coordinates[0][0]) as number[][];
              const d = ring
                .map((coord, i) => {
                  const { x, y } = projected.project(coord[0], coord[1]);
                  return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                })
                .join(' ') + ' Z';

              const fill = mode === 'heatmap'
                ? theme.mapLand
                : visited
                ? pickPastel(region.id)
                : theme.mapUnvisited;

              return (
                <Path
                  key={region.id}
                  d={d}
                  fill={fill}
                  stroke={theme.bg}
                  strokeWidth={1.5}
                  opacity={mode === 'heatmap' && !visited ? 0.4 : 1}
                />
              );
            })}

            {(mode === 'marker' || mode === 'heatmap') &&
              photos.map((p) => {
                const { x, y } = projected.project(p.lng, p.lat);
                return (
                  <Circle
                    key={p.id}
                    cx={x}
                    cy={y}
                    r={mode === 'heatmap' ? 14 : 4}
                    fill={mode === 'heatmap' ? palette.brand400 : palette.accent500}
                    opacity={mode === 'heatmap' ? 0.18 : 1}
                  />
                );
              })}
          </G>
        </Svg>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
