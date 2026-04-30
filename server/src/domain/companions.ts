/**
 * Server-side copy of the pure companion-detection algorithm.
 *
 * Mirrors `src/core/companions.ts` on the mobile client. We keep the two in
 * sync rather than sharing a package because (a) the server runs Node ESM
 * and the client runs Metro CommonJS-ish, and (b) the algorithm is small
 * and rarely changes. Both copies have parallel test suites so a divergence
 * is caught immediately.
 */

const R_EARTH_KM = 6371;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

export interface LightPhoto {
  id: string;
  takenAt: string;
  lat: number;
  lng: number;
}

export interface CompanionInput {
  id: string;
  nickname: string;
  photos: LightPhoto[];
}

export interface CompanionOptions {
  maxGapMs?: number;
  maxDistanceKm?: number;
  minOverlaps?: number;
}

export interface CompanionMatch {
  id: string;
  nickname: string;
  overlapCount: number;
  overlapDays: number;
}

export function findCompanions(
  myPhotos: LightPhoto[],
  candidates: CompanionInput[],
  opts: CompanionOptions = {}
): CompanionMatch[] {
  const {
    maxGapMs = 30 * 60 * 1000,
    maxDistanceKm = 0.5,
    minOverlaps = 3,
  } = opts;

  if (myPhotos.length === 0) return [];

  const mine = [...myPhotos].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  const myTimes = mine.map((p) => new Date(p.takenAt).getTime());
  const matches: CompanionMatch[] = [];

  for (const cand of candidates) {
    if (cand.photos.length === 0) continue;
    const theirs = [...cand.photos].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
    const theirTimes = theirs.map((p) => new Date(p.takenAt).getTime());

    let overlapCount = 0;
    const days = new Set<string>();
    let lo = 0;

    for (let i = 0; i < mine.length; i += 1) {
      const myTs = myTimes[i];
      while (lo < theirs.length && theirTimes[lo] < myTs - maxGapMs) lo += 1;
      for (let j = lo; j < theirs.length && theirTimes[j] <= myTs + maxGapMs; j += 1) {
        if (haversineKm(mine[i], theirs[j]) <= maxDistanceKm) {
          overlapCount += 1;
          days.add(mine[i].takenAt.slice(0, 10));
        }
      }
    }

    if (overlapCount >= minOverlaps) {
      matches.push({
        id: cand.id,
        nickname: cand.nickname,
        overlapCount,
        overlapDays: days.size,
      });
    }
  }

  return matches.sort(
    (a, b) =>
      b.overlapDays - a.overlapDays ||
      b.overlapCount - a.overlapCount ||
      a.nickname.localeCompare(b.nickname)
  );
}
