import { mergeAssets, processAssets, RawAsset } from '../photoProcessor';
import { Region } from '../types';

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

function asset(id: string, ts: number, lat: number, lng: number): RawAsset {
  return {
    id,
    uri: `mock://${id}`,
    creationTime: ts,
    location: { latitude: lat, longitude: lng },
  };
}

describe('mergeAssets (incremental sync)', () => {
  it('returns the fresh result when there are no existing photos', () => {
    const newAssets = [asset('a', Date.UTC(2025, 4, 1, 9), 37.5665, 126.978)];
    const result = mergeAssets([], newAssets, { userId: 'u', regions: REGIONS });
    expect(result.photos).toHaveLength(1);
    expect(result.trips).toHaveLength(1);
  });

  it('appends new GPS-bearing assets without re-processing existing ones', () => {
    const initial = processAssets(
      [asset('a', Date.UTC(2025, 4, 1, 9), 37.5665, 126.978)],
      { userId: 'u', regions: REGIONS }
    );

    const result = mergeAssets(
      initial.photos,
      [asset('b', Date.UTC(2025, 4, 5, 9), 35.1796, 129.075)],
      { userId: 'u', regions: REGIONS }
    );

    expect(result.photos).toHaveLength(2);
    expect(result.photos.map((p) => p.id).sort()).toEqual(['a', 'b']);
    expect(result.visits.map((v) => v.regionId).sort()).toEqual(['KR-11', 'KR-26']);
  });

  it('is idempotent — feeding the same delta twice produces same state', () => {
    const initial = processAssets(
      [asset('a', Date.UTC(2025, 4, 1, 9), 37.5665, 126.978)],
      { userId: 'u', regions: REGIONS }
    );

    const newAssets = [asset('b', Date.UTC(2025, 4, 5, 9), 35.1796, 129.075)];
    const first = mergeAssets(initial.photos, newAssets, { userId: 'u', regions: REGIONS });
    const second = mergeAssets(first.photos, newAssets, { userId: 'u', regions: REGIONS });

    expect(second.photos).toHaveLength(2);
    expect(second.photos.map((p) => p.id).sort()).toEqual(['a', 'b']);
  });

  it('overwrites existing photos when an updated id arrives', () => {
    const initial = processAssets(
      [asset('a', Date.UTC(2025, 4, 1, 9), 37.5665, 126.978)],
      { userId: 'u', regions: REGIONS }
    );
    expect(initial.photos[0].regionId).toBe('KR-11');

    const result = mergeAssets(
      initial.photos,
      [asset('a', Date.UTC(2025, 4, 1, 9), 35.1796, 129.075)],
      { userId: 'u', regions: REGIONS }
    );
    expect(result.photos).toHaveLength(1);
    expect(result.photos[0].regionId).toBe('KR-26');
  });

  it('reports added=0 when delta is empty', () => {
    const initial = processAssets(
      [asset('a', Date.UTC(2025, 4, 1, 9), 37.5665, 126.978)],
      { userId: 'u', regions: REGIONS }
    );
    const result = mergeAssets(initial.photos, [], { userId: 'u', regions: REGIONS });
    expect(result.photos).toEqual(initial.photos);
    expect(result.stats.total).toBe(0);
  });

  it('keeps trips clustered correctly across the merge boundary', () => {
    const initial = processAssets(
      [
        asset('a', Date.UTC(2025, 4, 1, 9), 37.5665, 126.978),
        asset('b', Date.UTC(2025, 4, 1, 14), 37.57, 126.98),
      ],
      { userId: 'u', regions: REGIONS }
    );
    expect(initial.trips).toHaveLength(1);

    const result = mergeAssets(
      initial.photos,
      [
        asset('c', Date.UTC(2025, 4, 1, 18), 37.58, 126.99),
        asset('d', Date.UTC(2025, 4, 5, 9), 35.1796, 129.075),
      ],
      { userId: 'u', regions: REGIONS }
    );
    expect(result.photos).toHaveLength(4);
    expect(result.trips).toHaveLength(2);
    const seoulTrip = result.trips.find((t) => t.regionIds.includes('KR-11'))!;
    expect(seoulTrip.photoCount).toBe(3);
  });
});
