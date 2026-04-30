import { computeBbox, regionsFromFeatureCollection, regionsToFeatureCollection } from '../../data/loadGeoAssets';

describe('computeBbox', () => {
  it('computes bbox of a simple polygon', () => {
    const bbox = computeBbox({
      type: 'Polygon',
      coordinates: [
        [
          [126.7, 37.4],
          [127.2, 37.4],
          [127.2, 37.7],
          [126.7, 37.7],
          [126.7, 37.4],
        ],
      ],
    });
    expect(bbox).toEqual([126.7, 37.4, 127.2, 37.7]);
  });

  it('handles MultiPolygon by enclosing all parts', () => {
    const bbox = computeBbox({
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [0, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
        [
          [
            [10, 10],
            [11, 10],
            [11, 11],
            [10, 11],
            [10, 10],
          ],
        ],
      ],
    });
    expect(bbox).toEqual([0, 0, 11, 11]);
  });
});

describe('regionsFromFeatureCollection', () => {
  it('maps standard Feature properties to Region fields', () => {
    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            id: 'KR-11-680',
            country_code: 'KR',
            level: 2,
            name_ko: '강남구',
            name_en: 'Gangnam-gu',
            parent_id: 'KR-11',
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              [
                [127.0, 37.5],
                [127.1, 37.5],
                [127.1, 37.55],
                [127.0, 37.55],
                [127.0, 37.5],
              ],
            ],
          },
        },
      ],
    };
    const [r] = regionsFromFeatureCollection(fc);
    expect(r.id).toBe('KR-11-680');
    expect(r.level).toBe(2);
    expect(r.parentId).toBe('KR-11');
    expect(r.name_ko).toBe('강남구');
    expect(r.bbox).toEqual([127.0, 37.5, 127.1, 37.55]);
  });

  it('round-trips through regionsToFeatureCollection', () => {
    const fc = regionsToFeatureCollection([
      {
        id: 'A',
        countryCode: 'KR',
        level: 1,
        name_ko: 'A',
        name_local: 'A',
        name_en: 'A',
        bbox: [0, 0, 1, 1],
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [1, 0],
              [1, 1],
              [0, 1],
              [0, 0],
            ],
          ],
        },
      },
    ]);
    const back = regionsFromFeatureCollection(fc);
    expect(back).toHaveLength(1);
    expect(back[0].id).toBe('A');
    expect(back[0].countryCode).toBe('KR');
  });

  it('skips features with non-polygon geometry', () => {
    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { id: 'P' },
          geometry: { type: 'Point', coordinates: [0, 0] },
        },
      ],
    };
    expect(regionsFromFeatureCollection(fc)).toEqual([]);
  });
});
