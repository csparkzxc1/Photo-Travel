import { Photo } from './types';

interface PickOptions {
  count: number;
  /** Optional region tie-breaker: photos covering more distinct regions score higher. */
  diversityBonus?: number;
}

/**
 * Selects N "highlight" photos from a trip by spreading the picks evenly
 * across the trip's time range, then breaking ties by GPS accuracy and
 * region diversity.
 *
 * The naive approach (take first/middle/last) clusters too tightly when
 * a trip has bursts. Bucketing by even time quantiles gives a richer
 * narrative even on uneven shooting cadence.
 */
export function pickHighlights(photos: Photo[], opts: PickOptions): Photo[] {
  const { count, diversityBonus = 0.5 } = opts;
  if (count <= 0 || photos.length === 0) return [];
  if (photos.length <= count) {
    return [...photos].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  }

  const sorted = [...photos].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  const t0 = new Date(sorted[0].takenAt).getTime();
  const tN = new Date(sorted[sorted.length - 1].takenAt).getTime();
  const span = Math.max(1, tN - t0);

  const buckets: Photo[][] = Array.from({ length: count }, () => []);
  for (const p of sorted) {
    const t = new Date(p.takenAt).getTime();
    const idx = Math.min(count - 1, Math.floor(((t - t0) / span) * count));
    buckets[idx].push(p);
  }

  const usedRegions = new Set<string>();
  const picks: Photo[] = [];

  for (let i = 0; i < count; i += 1) {
    const bucket = buckets[i];
    if (bucket.length === 0) continue;

    // Score each candidate: lower accuracy number = better fix; new region bonus.
    let best = bucket[0];
    let bestScore = -Infinity;
    const target = t0 + span * ((i + 0.5) / count);

    for (const candidate of bucket) {
      const ageScore = -Math.abs(new Date(candidate.takenAt).getTime() - target) / span;
      const accuracyScore = candidate.accuracy > 0 ? -candidate.accuracy / 100 : 0;
      const diversity =
        candidate.regionId && !usedRegions.has(candidate.regionId) ? diversityBonus : 0;
      const score = ageScore + accuracyScore + diversity;
      if (score > bestScore) {
        bestScore = score;
        best = candidate;
      }
    }

    picks.push(best);
    if (best.regionId) usedRegions.add(best.regionId);
  }

  // If some buckets were empty, top up from the densest neighbour bucket.
  if (picks.length < count) {
    const remaining = sorted.filter((p) => !picks.includes(p));
    while (picks.length < count && remaining.length > 0) {
      picks.push(remaining.shift() as Photo);
    }
  }

  return picks.sort((a, b) => a.takenAt.localeCompare(b.takenAt));
}
