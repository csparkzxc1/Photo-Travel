import { haversineKm, pointInPolygon, pointInRing, withinBbox } from '../geo';

describe('pointInRing', () => {
  const square = [
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ];

  it('returns true for an interior point', () => {
    expect(pointInRing({ lng: 5, lat: 5 }, square)).toBe(true);
  });

  it('returns false for an exterior point', () => {
    expect(pointInRing({ lng: 15, lat: 5 }, square)).toBe(false);
  });

  it('handles points on a corner deterministically', () => {
    expect(typeof pointInRing({ lng: 0, lat: 0 }, square)).toBe('boolean');
  });
});

describe('pointInPolygon', () => {
  it('respects polygon holes', () => {
    const polygon: GeoJSON.Polygon = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
        [
          [3, 3],
          [7, 3],
          [7, 7],
          [3, 7],
          [3, 3],
        ],
      ],
    };
    expect(pointInPolygon({ lng: 1, lat: 1 }, polygon)).toBe(true);
    expect(pointInPolygon({ lng: 5, lat: 5 }, polygon)).toBe(false);
  });
});

describe('withinBbox', () => {
  it('checks bbox inclusion', () => {
    const bbox: [number, number, number, number] = [0, 0, 10, 10];
    expect(withinBbox({ lng: 5, lat: 5 }, bbox)).toBe(true);
    expect(withinBbox({ lng: 11, lat: 5 }, bbox)).toBe(false);
  });
});

describe('haversineKm', () => {
  it('computes Seoul to Busan within ~325 km', () => {
    const seoul = { lng: 126.978, lat: 37.5665 };
    const busan = { lng: 129.075, lat: 35.1796 };
    const km = haversineKm(seoul, busan);
    expect(km).toBeGreaterThan(310);
    expect(km).toBeLessThan(340);
  });

  it('returns 0 for identical points', () => {
    expect(haversineKm({ lng: 0, lat: 0 }, { lng: 0, lat: 0 })).toBe(0);
  });
});
