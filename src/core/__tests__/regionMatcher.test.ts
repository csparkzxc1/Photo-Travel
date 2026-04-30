import { matchRegion } from '../regionMatcher';
import { Region } from '../types';

function makeRegion(id: string, bbox: [number, number, number, number]): Region {
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

const SEOUL = makeRegion('KR-11', [126.7, 37.4, 127.2, 37.7]);
const BUSAN = makeRegion('KR-26', [128.7, 35.0, 129.3, 35.4]);
const JEJU = makeRegion('KR-49', [126.1, 33.1, 126.9, 33.6]);

describe('matchRegion', () => {
  it('matches a point inside a region polygon', () => {
    const result = matchRegion(
      { lng: 126.978, lat: 37.5665 },
      [SEOUL, BUSAN, JEJU]
    );
    expect(result?.regionId).toBe('KR-11');
    expect(result?.fallback).toBe(false);
  });

  it('falls back to nearest region within max distance', () => {
    const result = matchRegion(
      { lng: 129.4, lat: 35.41 },
      [SEOUL, BUSAN, JEJU],
      { maxDistanceKm: 50 }
    );
    expect(result?.regionId).toBe('KR-26');
    expect(result?.fallback).toBe(true);
  });

  it('returns null when no region is close enough', () => {
    const result = matchRegion(
      { lng: 0, lat: 0 },
      [SEOUL, BUSAN, JEJU],
      { maxDistanceKm: 5 }
    );
    expect(result).toBeNull();
  });

  it('prefers exact polygon hit over a closer bbox center', () => {
    const overlapping = makeRegion('OVERLAP', [126.5, 37.0, 128.0, 38.0]);
    const result = matchRegion({ lng: 126.978, lat: 37.5665 }, [overlapping, SEOUL]);
    expect(['OVERLAP', 'KR-11']).toContain(result?.regionId);
    expect(result?.fallback).toBe(false);
  });
});
