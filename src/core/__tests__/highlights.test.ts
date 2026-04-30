import { pickHighlights } from '../highlights';
import { Photo } from '../types';

function photo(id: string, takenAt: string, regionId?: string, accuracy = 10): Photo {
  return {
    id,
    userId: 'u',
    localUri: `mock://${id}`,
    takenAt,
    lat: 0,
    lng: 0,
    accuracy,
    regionId,
  };
}

describe('pickHighlights', () => {
  it('returns empty for empty input', () => {
    expect(pickHighlights([], { count: 4 })).toEqual([]);
  });

  it('returns all photos when fewer exist than requested', () => {
    const photos = [photo('a', '2025-05-01T09:00:00Z'), photo('b', '2025-05-01T10:00:00Z')];
    const result = pickHighlights(photos, { count: 4 });
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.id)).toEqual(['a', 'b']);
  });

  it('spreads picks across the time range', () => {
    const photos = Array.from({ length: 24 }, (_, i) =>
      photo(`p${i}`, `2025-05-0${1 + Math.floor(i / 8)}T${String(8 + (i % 8)).padStart(2, '0')}:00:00Z`)
    );
    const result = pickHighlights(photos, { count: 4 });
    expect(result).toHaveLength(4);
    // First pick is from earliest bucket, last from latest.
    const firstTs = new Date(result[0].takenAt).getTime();
    const lastTs = new Date(result[result.length - 1].takenAt).getTime();
    expect(lastTs - firstTs).toBeGreaterThan(24 * 3600 * 1000);
  });

  it('returns picks sorted by takenAt', () => {
    const photos = [
      photo('a', '2025-05-01T09:00:00Z'),
      photo('b', '2025-05-02T09:00:00Z'),
      photo('c', '2025-05-03T09:00:00Z'),
      photo('d', '2025-05-04T09:00:00Z'),
      photo('e', '2025-05-05T09:00:00Z'),
      photo('f', '2025-05-06T09:00:00Z'),
    ];
    const result = pickHighlights(photos, { count: 4 });
    const isSorted = result.every(
      (p, i, arr) => i === 0 || p.takenAt >= arr[i - 1].takenAt
    );
    expect(isSorted).toBe(true);
  });

  it('prefers higher-accuracy photos within the same bucket', () => {
    const photos = [
      photo('low', '2025-05-01T10:00:00Z', 'A', 200),
      photo('high', '2025-05-01T10:30:00Z', 'A', 5),
      photo('mid', '2025-05-01T11:00:00Z', 'A', 50),
    ];
    const result = pickHighlights(photos, { count: 1, diversityBonus: 0 });
    expect(result[0].id).toBe('high');
  });

  it('rewards region diversity when buckets compete', () => {
    const photos = [
      photo('a1', '2025-05-01T09:00:00Z', 'A'),
      photo('a2', '2025-05-01T11:00:00Z', 'A'),
      photo('b1', '2025-05-01T13:00:00Z', 'B'),
      photo('b2', '2025-05-01T15:00:00Z', 'B'),
    ];
    const result = pickHighlights(photos, { count: 2, diversityBonus: 5 });
    const regions = new Set(result.map((p) => p.regionId));
    expect(regions.size).toBe(2);
  });
});
