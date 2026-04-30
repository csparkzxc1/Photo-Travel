import { Photo } from '@core/types';

interface Spot {
  regionId: string;
  lng: number;
  lat: number;
}

const SPOTS: Record<string, Spot> = {
  seoul: { regionId: 'KR-11', lng: 126.978, lat: 37.5665 },
  busan: { regionId: 'KR-26', lng: 129.075, lat: 35.1796 },
  jeju: { regionId: 'KR-49', lng: 126.502, lat: 33.4996 },
  gangwon: { regionId: 'KR-42', lng: 128.694, lat: 37.751 },
  jeonnam: { regionId: 'KR-46', lng: 126.991, lat: 34.811 },
  gyeongbuk: { regionId: 'KR-47', lng: 129.345, lat: 36.019 },
};

const USER_ID = 'demo_user';

export function generateMockPhotos(): Photo[] {
  const trips: Array<{ spot: Spot; start: string; days: number; perDay: number }> = [
    { spot: SPOTS.jeju, start: '2025-03-12', days: 3, perDay: 6 },
    { spot: SPOTS.busan, start: '2025-05-04', days: 2, perDay: 5 },
    { spot: SPOTS.gangwon, start: '2025-09-20', days: 3, perDay: 4 },
    { spot: SPOTS.gyeongbuk, start: '2025-11-08', days: 2, perDay: 4 },
    { spot: SPOTS.jeonnam, start: '2026-01-17', days: 2, perDay: 5 },
    { spot: SPOTS.seoul, start: '2026-04-22', days: 1, perDay: 8 },
  ];

  const photos: Photo[] = [];
  let counter = 0;

  for (const trip of trips) {
    const startTs = new Date(trip.start + 'T09:00:00Z').getTime();
    for (let d = 0; d < trip.days; d++) {
      for (let i = 0; i < trip.perDay; i++) {
        const ts = startTs + d * 24 * 3600 * 1000 + i * 90 * 60 * 1000;
        const jitterLng = (Math.random() - 0.5) * 0.04;
        const jitterLat = (Math.random() - 0.5) * 0.04;
        photos.push({
          id: `photo_${counter++}`,
          userId: USER_ID,
          localUri: `mock://photo_${counter}.jpg`,
          takenAt: new Date(ts).toISOString(),
          lat: trip.spot.lat + jitterLat,
          lng: trip.spot.lng + jitterLng,
          accuracy: 10,
          regionId: trip.spot.regionId,
        });
      }
    }
  }

  return photos;
}
