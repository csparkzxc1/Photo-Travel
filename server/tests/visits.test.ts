import { describe, it, expect } from 'vitest';
import { aggregateVisits, diffVisits } from '../src/domain/visits.js';
import type { PhotoRow, VisitRow } from '../src/domain/types.js';

function photo(id: string, regionId: string | null, takenAt: string): PhotoRow {
  return {
    id,
    userId: 'u',
    takenAt,
    lat: 0,
    lng: 0,
    accuracyM: null,
    regionId,
    cloudUri: null,
  };
}

describe('aggregateVisits', () => {
  it('groups photos per region with correct first/last timestamps', () => {
    const visits = aggregateVisits('u', [
      photo('a', 'KR-11', '2025-05-01T09:00:00Z'),
      photo('b', 'KR-11', '2025-05-02T09:00:00Z'),
      photo('c', 'KR-26', '2025-06-01T09:00:00Z'),
    ]);
    const seoul = visits.find((v) => v.regionId === 'KR-11')!;
    expect(seoul.totalPhotos).toBe(2);
    expect(seoul.firstVisitedAt).toBe('2025-05-01T09:00:00Z');
    expect(seoul.lastVisitedAt).toBe('2025-05-02T09:00:00Z');
  });

  it('skips photos without regionId', () => {
    expect(aggregateVisits('u', [photo('a', null, '2025-05-01T09:00:00Z')])).toEqual([]);
  });
});

describe('diffVisits', () => {
  const base: VisitRow = {
    userId: 'u',
    regionId: 'A',
    firstVisitedAt: '2025-05-01T09:00:00Z',
    lastVisitedAt: '2025-05-01T09:00:00Z',
    totalPhotos: 1,
    totalTrips: 0,
  };

  it('detects added rows', () => {
    const { added, updated } = diffVisits([base], [
      base,
      { ...base, regionId: 'B' },
    ]);
    expect(added).toHaveLength(1);
    expect(updated).toHaveLength(0);
    expect(added[0].regionId).toBe('B');
  });

  it('detects updated rows when totalPhotos changes', () => {
    const { added, updated } = diffVisits([base], [{ ...base, totalPhotos: 5 }]);
    expect(added).toHaveLength(0);
    expect(updated).toHaveLength(1);
  });

  it('treats unchanged rows as neither added nor updated', () => {
    const { added, updated } = diffVisits([base], [base]);
    expect(added).toEqual([]);
    expect(updated).toEqual([]);
  });
});
