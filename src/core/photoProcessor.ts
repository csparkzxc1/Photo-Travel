import { Photo, Region, Trip, Visit } from './types';
import { matchRegion } from './regionMatcher';
import { clusterTrips } from './tripClusterer';

/**
 * Minimal shape of a media-library asset that we care about. Mirrors what
 * expo-media-library's getAssetInfoAsync returns, but is decoupled so the
 * processor can run in plain Node tests.
 */
export interface RawAsset {
  id: string;
  uri: string;
  creationTime: number;
  location?: { latitude: number; longitude: number };
  // Optional EXIF accuracy (meters) if available
  accuracy?: number;
}

export interface ProcessResult {
  photos: Photo[];
  trips: Trip[];
  visits: Visit[];
  stats: {
    total: number;
    withGps: number;
    matched: number;
    unmatched: number;
  };
}

interface ProcessOptions {
  userId: string;
  regions: Region[];
  /** GPS fallback radius for nearest-region match, in km */
  fallbackKm?: number;
}

/**
 * Pure transform: raw media assets → fully classified photos, trips, visits.
 *
 * Side-effect free so it can be tested without a device. The RN sync layer
 * handles permission + asset loading and then hands the assets to this fn.
 */
export function processAssets(
  assets: RawAsset[],
  opts: ProcessOptions
): ProcessResult {
  const { userId, regions, fallbackKm = 5 } = opts;

  const photos: Photo[] = [];
  let withGps = 0;
  let matched = 0;

  for (const asset of assets) {
    if (!asset.location) continue;
    withGps += 1;

    const match = matchRegion(
      { lng: asset.location.longitude, lat: asset.location.latitude },
      regions,
      { maxDistanceKm: fallbackKm }
    );
    if (match) matched += 1;

    photos.push({
      id: asset.id,
      userId,
      localUri: asset.uri,
      takenAt: new Date(asset.creationTime).toISOString(),
      lat: asset.location.latitude,
      lng: asset.location.longitude,
      accuracy: asset.accuracy ?? 50,
      regionId: match?.regionId,
    });
  }

  const trips = clusterTrips(photos, userId);
  const visits = computeVisits(photos, userId);

  return {
    photos,
    trips,
    visits,
    stats: {
      total: assets.length,
      withGps,
      matched,
      unmatched: withGps - matched,
    },
  };
}

/**
 * Incremental merge: takes the existing photos plus a batch of new RawAssets
 * (e.g. from a background fetch) and returns the same shape as `processAssets`,
 * with everything re-clustered. New assets that share an id with an existing
 * photo overwrite the old entry (so corrected GPS / metadata propagates).
 *
 * This function is idempotent: feeding it the same batch twice produces the
 * same result — important for at-least-once background task semantics.
 */
export function mergeAssets(
  existing: Photo[],
  newAssets: RawAsset[],
  opts: ProcessOptions
): ProcessResult {
  const fresh = processAssets(newAssets, opts);
  if (existing.length === 0) return fresh;

  const byId = new Map<string, Photo>();
  for (const p of existing) byId.set(p.id, p);
  for (const p of fresh.photos) byId.set(p.id, p); // new wins on conflict

  const merged = Array.from(byId.values()).sort((a, b) =>
    a.takenAt.localeCompare(b.takenAt)
  );

  const trips = clusterTrips(merged, opts.userId);
  const visits = computeVisits(merged, opts.userId);

  const newCount = fresh.stats.total - countOverlap(existing, newAssets);

  return {
    photos: merged,
    trips,
    visits,
    stats: {
      total: newCount > 0 ? newCount : 0,
      withGps: fresh.stats.withGps,
      matched: fresh.stats.matched,
      unmatched: fresh.stats.unmatched,
    },
  };
}

function countOverlap(existing: Photo[], newAssets: RawAsset[]): number {
  if (existing.length === 0 || newAssets.length === 0) return 0;
  const ids = new Set(existing.map((p) => p.id));
  let overlap = 0;
  for (const a of newAssets) if (ids.has(a.id)) overlap += 1;
  return overlap;
}

export function computeVisits(photos: Photo[], userId: string): Visit[] {
  const map = new Map<string, Visit>();
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
        totalTrips: 1,
      });
    } else {
      existing.totalPhotos += 1;
      if (p.takenAt < existing.firstVisitedAt) existing.firstVisitedAt = p.takenAt;
      if (p.takenAt > existing.lastVisitedAt) existing.lastVisitedAt = p.takenAt;
    }
  }
  return Array.from(map.values());
}
