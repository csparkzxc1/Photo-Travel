import type { PhotoRow, VisitRow } from './types.js';

/**
 * Pure aggregation: turn a list of photo rows into per-region visit rows.
 * Used by the photos sync handler after PostGIS region matching.
 */
export function aggregateVisits(userId: string, photos: PhotoRow[]): VisitRow[] {
  const map = new Map<string, VisitRow>();
  for (const p of photos) {
    if (!p.regionId) continue;
    const existing = map.get(p.regionId);
    if (!existing) {
      map.set(p.regionId, {
        userId,
        regionId: p.regionId,
        firstVisitedAt: p.takenAt,
        lastVisitedAt: p.takenAt,
        totalPhotos: 1,
        totalTrips: 0,
      });
    } else {
      existing.totalPhotos += 1;
      if (p.takenAt < existing.firstVisitedAt) existing.firstVisitedAt = p.takenAt;
      if (p.takenAt > existing.lastVisitedAt) existing.lastVisitedAt = p.takenAt;
    }
  }
  return Array.from(map.values());
}

export function diffVisits(prev: VisitRow[], next: VisitRow[]): {
  added: VisitRow[];
  updated: VisitRow[];
} {
  const prevMap = new Map(prev.map((v) => [v.regionId, v] as const));
  const added: VisitRow[] = [];
  const updated: VisitRow[] = [];
  for (const v of next) {
    const before = prevMap.get(v.regionId);
    if (!before) {
      added.push(v);
    } else if (
      before.totalPhotos !== v.totalPhotos ||
      before.firstVisitedAt !== v.firstVisitedAt ||
      before.lastVisitedAt !== v.lastVisitedAt
    ) {
      updated.push(v);
    }
  }
  return { added, updated };
}
