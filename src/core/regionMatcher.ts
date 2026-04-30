import { bboxCenter, haversineKm, Point, pointInRegion, withinBbox } from './geo';
import { Region } from './types';

export interface MatchResult {
  regionId: string;
  fallback: boolean;
  distanceKm?: number;
}

/**
 * Matches a GPS coordinate to a region.
 *
 * Strategy:
 *  1. Filter candidates by bounding box.
 *  2. Run point-in-polygon on each candidate, return first hit.
 *  3. If no hit, find nearest region by bbox center within `maxDistanceKm` and flag as fallback.
 *
 * In production, candidates would come from an R-tree (e.g. RBush) keyed on bbox.
 * For the MVP we accept a flat list — for thousands of regions this is fast enough on
 * device, and the GeoJSON is loaded country-by-country.
 */
export function matchRegion(
  point: Point,
  regions: Region[],
  opts: { maxDistanceKm?: number } = {}
): MatchResult | null {
  const { maxDistanceKm = 5 } = opts;

  const bboxCandidates = regions.filter((r) => withinBbox(point, r.bbox));
  for (const region of bboxCandidates) {
    if (pointInRegion(point, region)) {
      return { regionId: region.id, fallback: false };
    }
  }

  let nearest: { region: Region; distanceKm: number } | null = null;
  for (const region of regions) {
    const d = haversineKm(point, bboxCenter(region.bbox));
    if (!nearest || d < nearest.distanceKm) nearest = { region, distanceKm: d };
  }
  if (nearest && nearest.distanceKm <= maxDistanceKm) {
    return { regionId: nearest.region.id, fallback: true, distanceKm: nearest.distanceKm };
  }
  return null;
}
