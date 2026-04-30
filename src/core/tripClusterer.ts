import { Photo, Trip } from './types';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface ClusterOptions {
  /** Max gap in hours between photos in same region to keep them in one trip */
  sameRegionGapHours?: number;
  /** Min gap in hours after region change before a new trip starts */
  crossRegionGapHours?: number;
  /** Significance threshold: at least this many photos */
  significantPhotoCount?: number;
  /** Significance threshold: at least this many days span */
  significantDayCount?: number;
}

interface WorkingTrip {
  photos: Photo[];
  regionIds: Set<string>;
}

/**
 * Groups photos into trips by time + region clustering.
 *
 * Algorithm (from PRD §6.2):
 *  1. Sort photos by timestamp.
 *  2. Same region + within 24h → same trip.
 *  3. Different region + gap > 12h → new trip.
 *  4. ≥ 2-day span and ≥ 5 photos → "significant" (a real trip vs day-trip).
 */
export function clusterTrips(
  photos: Photo[],
  userId: string,
  opts: ClusterOptions = {}
): Trip[] {
  const {
    sameRegionGapHours = 24,
    crossRegionGapHours = 12,
    significantPhotoCount = 5,
    significantDayCount = 2,
  } = opts;

  if (photos.length === 0) return [];

  const sorted = [...photos].sort(
    (a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime()
  );

  const working: WorkingTrip[] = [];
  let current: WorkingTrip | null = null;

  for (const photo of sorted) {
    if (!current) {
      current = { photos: [photo], regionIds: new Set(photo.regionId ? [photo.regionId] : []) };
      continue;
    }

    const last = current.photos[current.photos.length - 1];
    const gapMs = new Date(photo.takenAt).getTime() - new Date(last.takenAt).getTime();
    const sameRegion = !!photo.regionId && photo.regionId === last.regionId;

    const continueSame = sameRegion && gapMs < sameRegionGapHours * HOUR_MS;
    const newTripBoundary = !sameRegion && gapMs > crossRegionGapHours * HOUR_MS;

    if (newTripBoundary) {
      working.push(current);
      current = { photos: [photo], regionIds: new Set(photo.regionId ? [photo.regionId] : []) };
    } else if (continueSame) {
      current.photos.push(photo);
    } else {
      current.photos.push(photo);
      if (photo.regionId) current.regionIds.add(photo.regionId);
    }
  }
  if (current) working.push(current);

  return working.map((w, idx) => toTrip(w, userId, idx, significantPhotoCount, significantDayCount));
}

function toTrip(
  w: WorkingTrip,
  userId: string,
  idx: number,
  minPhotos: number,
  minDays: number
): Trip {
  const start = w.photos[0].takenAt;
  const end = w.photos[w.photos.length - 1].takenAt;
  const spanDays = (new Date(end).getTime() - new Date(start).getTime()) / DAY_MS;
  const isSignificant = w.photos.length >= minPhotos || spanDays >= minDays;

  return {
    id: `trip_${idx}_${new Date(start).getTime()}`,
    userId,
    title: generateTitle(w),
    startDate: start,
    endDate: end,
    regionIds: Array.from(w.regionIds),
    representativePhotoId: pickRepresentative(w.photos)?.id,
    photoCount: w.photos.length,
    videoCount: 0,
    isSignificant,
  };
}

function pickRepresentative(photos: Photo[]): Photo | undefined {
  return photos[Math.floor(photos.length / 2)];
}

function generateTitle(w: WorkingTrip): string {
  const days = Math.max(
    1,
    Math.ceil(
      (new Date(w.photos[w.photos.length - 1].takenAt).getTime() -
        new Date(w.photos[0].takenAt).getTime()) /
        DAY_MS
    )
  );
  const regionCount = w.regionIds.size;
  if (days === 1) return '당일치기';
  if (regionCount > 1) return `${days - 1}박 ${days}일 · ${regionCount}개 지역`;
  return `${days - 1}박 ${days}일`;
}
