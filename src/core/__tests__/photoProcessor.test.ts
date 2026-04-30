import { processAssets, computeVisits, RawAsset } from '../photoProcessor';
import { Photo, Region } from '../types';

function bboxRegion(id: string, bbox: [number, number, number, number]): Region {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return {
    id,
    countryCode: 'KR',
    level: 1,
    name_ko: id,
    name_local: id,
    name_en: id,
    bbox,
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [minLng, minLat],
          [maxLng, minLat],
          [maxLng, maxLat],
          [minLng, maxLat],
          [minLng, minLat],
        ],
      ],
    },
  };
}

const SEOUL = bboxRegion('KR-11', [126.7, 37.4, 127.2, 37.7]);
const BUSAN = bboxRegion('KR-26', [128.7, 35.0, 129.3, 35.4]);
const REGIONS = [SEOUL, BUSAN];

function asset(id: string, ts: number, lat?: number, lng?: number): RawAsset {
  return {
    id,
    uri: `mock://${id}`,
    creationTime: ts,
    location: lat !== undefined && lng !== undefined ? { latitude: lat, longitude: lng } : undefined,
  };
}

describe('processAssets', () => {
  it('returns empty result for empty input', () => {
    const result = processAssets([], { userId: 'u', regions: REGIONS });
    expect(result.photos).toEqual([]);
    expect(result.trips).toEqual([]);
    expect(result.visits).toEqual([]);
    expect(result.stats).toEqual({ total: 0, withGps: 0, matched: 0, unmatched: 0 });
  });

  it('drops assets without GPS', () => {
    const assets: RawAsset[] = [
      asset('a', Date.UTC(2025, 4, 1, 9), 37.5665, 126.978),
      asset('b', Date.UTC(2025, 4, 1, 10)),
      asset('c', Date.UTC(2025, 4, 1, 11), 37.5665, 126.978),
    ];
    const result = processAssets(assets, { userId: 'u', regions: REGIONS });
    expect(result.photos).toHaveLength(2);
    expect(result.stats.total).toBe(3);
    expect(result.stats.withGps).toBe(2);
  });

  it('matches GPS-bearing assets to regions', () => {
    const assets: RawAsset[] = [
      asset('seoul1', Date.UTC(2025, 4, 1, 9), 37.5665, 126.978),
      asset('busan1', Date.UTC(2025, 4, 5, 9), 35.1796, 129.075),
    ];
    const result = processAssets(assets, { userId: 'u', regions: REGIONS });
    expect(result.stats.matched).toBe(2);
    expect(result.photos[0].regionId).toBe('KR-11');
    expect(result.photos[1].regionId).toBe('KR-26');
  });

  it('counts unmatched out-of-range assets but still keeps them', () => {
    const assets: RawAsset[] = [
      asset('paris', Date.UTC(2025, 4, 1, 9), 48.8566, 2.3522),
    ];
    const result = processAssets(assets, { userId: 'u', regions: REGIONS, fallbackKm: 5 });
    expect(result.photos).toHaveLength(1);
    expect(result.photos[0].regionId).toBeUndefined();
    expect(result.stats.matched).toBe(0);
    expect(result.stats.unmatched).toBe(1);
  });

  it('produces clustered trips and visits from realistic timeline', () => {
    const day = 24 * 3600 * 1000;
    const assets: RawAsset[] = [
      asset('s1', Date.UTC(2025, 4, 1, 9), 37.5665, 126.978),
      asset('s2', Date.UTC(2025, 4, 1, 12), 37.57, 126.98),
      asset('s3', Date.UTC(2025, 4, 1, 18), 37.58, 126.99),
      asset('b1', Date.UTC(2025, 4, 5, 9), 35.1796, 129.075),
      asset('b2', Date.UTC(2025, 4, 5, 13), 35.18, 129.08),
      asset('b3', Date.UTC(2025, 4, 6, 9), 35.19, 129.09),
    ];
    void day;
    const result = processAssets(assets, { userId: 'u', regions: REGIONS });
    expect(result.trips).toHaveLength(2);
    expect(result.visits).toHaveLength(2);
    const seoulVisit = result.visits.find((v) => v.regionId === 'KR-11')!;
    expect(seoulVisit.totalPhotos).toBe(3);
  });
});

describe('computeVisits', () => {
  it('aggregates photo counts per region with first/last visit times', () => {
    const photos: Photo[] = [
      photo('a', 'KR-11', '2025-05-01T09:00:00Z'),
      photo('b', 'KR-11', '2025-05-01T18:00:00Z'),
      photo('c', 'KR-11', '2025-06-15T10:00:00Z'),
      photo('d', 'KR-26', '2025-07-01T10:00:00Z'),
    ];
    const visits = computeVisits(photos, 'u');
    const seoul = visits.find((v) => v.regionId === 'KR-11')!;
    expect(seoul.totalPhotos).toBe(3);
    expect(seoul.firstVisitedAt).toBe('2025-05-01T09:00:00Z');
    expect(seoul.lastVisitedAt).toBe('2025-06-15T10:00:00Z');
    expect(visits.find((v) => v.regionId === 'KR-26')?.totalPhotos).toBe(1);
  });

  it('skips photos without regionId', () => {
    const photos: Photo[] = [photo('a', undefined, '2025-05-01T09:00:00Z')];
    expect(computeVisits(photos, 'u')).toEqual([]);
  });
});

function photo(id: string, regionId: string | undefined, takenAt: string): Photo {
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
