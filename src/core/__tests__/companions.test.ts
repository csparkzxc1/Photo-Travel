import { findCompanions } from '../companions';
import { Photo } from '../types';

type LightPhoto = Pick<Photo, 'id' | 'takenAt' | 'lat' | 'lng'>;

function p(id: string, takenAt: string, lat: number, lng: number): LightPhoto {
  return { id, takenAt, lat, lng };
}

const SEOUL_HALL = { lat: 37.5665, lng: 126.978 };

describe('findCompanions', () => {
  it('returns empty when user has no photos', () => {
    expect(
      findCompanions([], [
        {
          id: 'f1',
          nickname: 'Alice',
          photos: [p('a', '2025-05-01T09:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng)],
        },
      ])
    ).toEqual([]);
  });

  it('drops candidates below the minimum overlap threshold', () => {
    const mine = [
      p('m1', '2025-05-01T09:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
      p('m2', '2025-05-01T10:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
    ];
    const friend = [p('f1', '2025-05-01T09:05:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng)];

    const matches = findCompanions(
      mine,
      [{ id: 'f', nickname: 'Friend', photos: friend }],
      { minOverlaps: 3 }
    );
    expect(matches).toEqual([]);
  });

  it('matches when several photos co-occur in time and space', () => {
    const mine = [
      p('m1', '2025-05-01T09:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
      p('m2', '2025-05-01T10:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
      p('m3', '2025-05-01T12:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
      p('m4', '2025-05-02T09:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
    ];
    const friend = [
      p('f1', '2025-05-01T09:05:00Z', SEOUL_HALL.lat + 0.001, SEOUL_HALL.lng),
      p('f2', '2025-05-01T10:10:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng + 0.001),
      p('f3', '2025-05-01T12:02:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
      p('f4', '2025-05-02T09:30:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
    ];

    const matches = findCompanions(
      mine,
      [{ id: 'friend', nickname: 'Buddy', photos: friend }],
      { minOverlaps: 3 }
    );
    expect(matches).toHaveLength(1);
    expect(matches[0].id).toBe('friend');
    expect(matches[0].overlapCount).toBeGreaterThanOrEqual(4);
    expect(matches[0].overlapDays).toBe(2);
    expect(matches[0].exemplar).toBeDefined();
  });

  it('rejects friends who were nearby at different times', () => {
    const mine = [
      p('m1', '2025-05-01T09:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
      p('m2', '2025-05-01T10:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
      p('m3', '2025-05-01T11:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
    ];
    const friend = [
      p('f1', '2025-06-01T09:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
      p('f2', '2025-06-01T10:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
      p('f3', '2025-06-01T11:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
    ];
    expect(
      findCompanions(mine, [{ id: 'tourist', nickname: 'Tourist', photos: friend }])
    ).toEqual([]);
  });

  it('rejects friends who were at the same time but far away', () => {
    const mine = [
      p('m1', '2025-05-01T09:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
      p('m2', '2025-05-01T10:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
      p('m3', '2025-05-01T11:00:00Z', SEOUL_HALL.lat, SEOUL_HALL.lng),
    ];
    const friend = [
      p('f1', '2025-05-01T09:05:00Z', 35.1796, 129.075), // Busan
      p('f2', '2025-05-01T10:05:00Z', 35.1796, 129.075),
      p('f3', '2025-05-01T11:05:00Z', 35.1796, 129.075),
    ];
    expect(
      findCompanions(mine, [{ id: 'busan', nickname: 'BusanBuddy', photos: friend }])
    ).toEqual([]);
  });

  it('ranks by overlap days first, then count', () => {
    const mine = Array.from({ length: 10 }, (_, i) =>
      p(`m${i}`, `2025-05-${String(1 + (i % 5)).padStart(2, '0')}T${String(9 + Math.floor(i / 5)).padStart(2, '0')}:00:00Z`, SEOUL_HALL.lat, SEOUL_HALL.lng)
    );
    const fewDaysManyShots = Array.from({ length: 8 }, (_, i) =>
      p(`a${i}`, `2025-05-01T${String(9 + i * 0).padStart(2, '0')}:${String(i * 5).padStart(2, '0')}:00Z`, SEOUL_HALL.lat, SEOUL_HALL.lng)
    );
    const manyDaysFewShots = Array.from({ length: 5 }, (_, i) =>
      p(`b${i}`, `2025-05-${String(1 + i).padStart(2, '0')}T09:05:00Z`, SEOUL_HALL.lat, SEOUL_HALL.lng)
    );

    const matches = findCompanions(
      mine,
      [
        { id: 'concentrated', nickname: 'BurstFriend', photos: fewDaysManyShots },
        { id: 'spread', nickname: 'SteadyFriend', photos: manyDaysFewShots },
      ],
      { minOverlaps: 1 }
    );
    expect(matches.length).toBeGreaterThan(0);
    expect(matches[0].id).toBe('spread');
  });
});
