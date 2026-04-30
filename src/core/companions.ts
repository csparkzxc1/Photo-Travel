import { haversineKm } from './geo';
import { Photo } from './types';

export interface CompanionInput {
  /** Stable identifier for the friend / candidate. */
  id: string;
  nickname: string;
  /** Their photos (only fields we need — id/takenAt/lat/lng). */
  photos: Pick<Photo, 'id' | 'takenAt' | 'lat' | 'lng'>[];
}

export interface CompanionOptions {
  /** Max time difference between our and their photo to count as co-occurrence (ms). */
  maxGapMs?: number;
  /** Max spatial distance (km) for co-occurrence. */
  maxDistanceKm?: number;
  /** A candidate needs at least this many overlaps to surface as a suggestion. */
  minOverlaps?: number;
}

export interface CompanionMatch {
  id: string;
  nickname: string;
  /** Number of (mine, theirs) photo pairs that co-occurred. */
  overlapCount: number;
  /** Distinct days on which co-occurrence happened — better confidence signal. */
  overlapDays: number;
  /** Highest-confidence pairing seen (most recent + closest). */
  exemplar?: { mine: string; theirs: string; takenAt: string };
}

/**
 * Finds companion candidates by counting time+place co-occurrences between
 * the user's photos and each friend's photos.
 *
 * Algorithm:
 *   1. Sort each photo set by takenAt.
 *   2. Two-pointer sweep — for each of my photos, advance the friend pointer
 *      while their photos are too old, then check the window of "close enough
 *      in time" friends and count any within `maxDistanceKm` haversine.
 *   3. Tally distinct days for stronger ranking.
 *
 * Complexity: O(N + M) per friend after sort, instead of the naive O(N*M).
 */
export function findCompanions(
  myPhotos: Pick<Photo, 'id' | 'takenAt' | 'lat' | 'lng'>[],
  candidates: CompanionInput[],
  opts: CompanionOptions = {}
): CompanionMatch[] {
  const {
    maxGapMs = 30 * 60 * 1000, // 30 minutes
    maxDistanceKm = 0.5, // 500 m
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
    let exemplar: CompanionMatch['exemplar'];
    let exemplarDist = Infinity;

    let lo = 0;
    for (let i = 0; i < mine.length; i += 1) {
      const myTs = myTimes[i];
      while (lo < theirs.length && theirTimes[lo] < myTs - maxGapMs) lo += 1;

      for (let j = lo; j < theirs.length && theirTimes[j] <= myTs + maxGapMs; j += 1) {
        const dist = haversineKm(mine[i], theirs[j]);
        if (dist <= maxDistanceKm) {
          overlapCount += 1;
          days.add(mine[i].takenAt.slice(0, 10));
          if (dist < exemplarDist) {
            exemplarDist = dist;
            exemplar = {
              mine: mine[i].id,
              theirs: theirs[j].id,
              takenAt: mine[i].takenAt,
            };
          }
        }
      }
    }

    if (overlapCount >= minOverlaps) {
      matches.push({
        id: cand.id,
        nickname: cand.nickname,
        overlapCount,
        overlapDays: days.size,
        exemplar,
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
