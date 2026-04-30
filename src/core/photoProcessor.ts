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
