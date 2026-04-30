import { Region, RegionLevel } from '@core/types';

/**
 * Loader that converts a Feature Collection (the format expected in
 * `assets/geo/*.geojson`) into the app's `Region` type.
 *
 * The loader fills in `bbox` from the geometry, so source files don't need
 * to pre-compute it. See `assets/geo/README.md` for the property contract.
 */
export function regionsFromFeatureCollection(
  fc: GeoJSON.FeatureCollection
): Region[] {
  const out: Region[] = [];
  for (const feature of fc.features) {
    const props = (feature.properties ?? {}) as Record<string, unknown>;
    const geom = feature.geometry;
    if (!geom || (geom.type !== 'Polygon' && geom.type !== 'MultiPolygon')) continue;

    const id = String(props.id ?? '');
    if (!id) continue;

    out.push({
      id,
      countryCode: String(props.country_code ?? 'XX'),
      level: (Number(props.level) || 1) as RegionLevel,
      name_ko: String(props.name_ko ?? props.name ?? id),
      name_local: String(props.name_local ?? props.name ?? id),
      name_en: String(props.name_en ?? props.name ?? id),
      parentId: props.parent_id ? String(props.parent_id) : undefined,
      bbox: computeBbox(geom),
      geometry: geom,
    });
  }
  return out;
}

export function computeBbox(
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon
): [number, number, number, number] {
  let minLng = Infinity;
  let minLat = Infinity;
  let maxLng = -Infinity;
  let maxLat = -Infinity;

  const polygons =
    geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;

  for (const poly of polygons) {
    for (const ring of poly) {
      for (const coord of ring) {
        const lng = coord[0];
        const lat = coord[1];
        if (lng < minLng) minLng = lng;
        if (lat < minLat) minLat = lat;
        if (lng > maxLng) maxLng = lng;
        if (lat > maxLat) maxLat = lat;
      }
    }
  }

  return [minLng, minLat, maxLng, maxLat];
}

/**
 * Convert app Region back to a GeoJSON Feature for handing off to MapLibre.
 */
export function regionsToFeatureCollection(regions: Region[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: regions.map((r) => ({
      type: 'Feature',
      id: r.id,
      properties: {
        id: r.id,
        country_code: r.countryCode,
        level: r.level,
        name_ko: r.name_ko,
        name_en: r.name_en,
        parent_id: r.parentId ?? null,
      },
      geometry: r.geometry,
    })),
  };
}
