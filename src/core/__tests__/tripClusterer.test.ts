import { Photo } from '../types';
import { clusterTrips } from '../tripClusterer';

function photo(id: string, regionId: string, takenAt: string): Photo {
  return {
    id,
    userId: 'u',
    localUri: `mock://${id}`,
    takenAt,
    lat: 0,
    lng: 0,
    accuracy: 10,
    regionId,
  };
}

describe('clusterTrips', () => {
  it('returns empty for empty input', () => {
    expect(clusterTrips([], 'u')).toEqual([]);
  });

  it('groups same-region same-day photos into one trip', () => {
    const photos = [
      photo('1', 'A', '2025-05-01T09:00:00Z'),
      photo('2', 'A', '2025-05-01T12:00:00Z'),
      photo('3', 'A', '2025-05-01T18:00:00Z'),
    ];
    const trips = clusterTrips(photos, 'u');
    expect(trips).toHaveLength(1);
    expect(trips[0].photoCount).toBe(3);
    expect(trips[0].regionIds).toEqual(['A']);
  });

  it('starts a new trip when region changes after >12h gap', () => {
    const photos = [
      photo('1', 'A', '2025-05-01T09:00:00Z'),
      photo('2', 'A', '2025-05-01T18:00:00Z'),
      photo('3', 'B', '2025-05-03T10:00:00Z'),
      photo('4', 'B', '2025-05-03T16:00:00Z'),
    ];
    const trips = clusterTrips(photos, 'u');
    expect(trips).toHaveLength(2);
    expect(trips[0].regionIds).toEqual(['A']);
    expect(trips[1].regionIds).toEqual(['B']);
  });

  it('marks 5+ photo or multi-day trips as significant', () => {
    const photos = [
      photo('1', 'A', '2025-05-01T09:00:00Z'),
      photo('2', 'A', '2025-05-01T12:00:00Z'),
      photo('3', 'A', '2025-05-01T15:00:00Z'),
      photo('4', 'A', '2025-05-01T18:00:00Z'),
      photo('5', 'A', '2025-05-01T21:00:00Z'),
    ];
    const trips = clusterTrips(photos, 'u');
    expect(trips[0].isSignificant).toBe(true);
  });

  it('keeps single-photo single-day visits as non-significant', () => {
    const trips = clusterTrips([photo('1', 'A', '2025-05-01T09:00:00Z')], 'u');
    expect(trips).toHaveLength(1);
    expect(trips[0].isSignificant).toBe(false);
  });

  it('produces a representative photo id', () => {
    const photos = [
      photo('a', 'A', '2025-05-01T09:00:00Z'),
      photo('b', 'A', '2025-05-01T12:00:00Z'),
      photo('c', 'A', '2025-05-01T18:00:00Z'),
    ];
    const [trip] = clusterTrips(photos, 'u');
    expect(trip.representativePhotoId).toBeDefined();
    expect(['a', 'b', 'c']).toContain(trip.representativePhotoId);
  });
});
