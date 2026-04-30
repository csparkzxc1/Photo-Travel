import { Region } from '@core/types';

/**
 * Simplified seed data for Korea Level-1 administrative regions (광역시도).
 *
 * These are heavily simplified bounding boxes / centroids — production builds will
 * load mapshaper-simplified GeoJSON from `assets/geo/kr_sigungu.geojson`. This seed
 * exists so the MVP UI and tests can run without the multi-megabyte file.
 */
export const KR_LEVEL1_REGIONS: Region[] = [
  region('KR-11', '서울특별시', 'Seoul', [126.7, 37.4, 127.2, 37.7]),
  region('KR-26', '부산광역시', 'Busan', [128.7, 35.0, 129.3, 35.4]),
  region('KR-27', '대구광역시', 'Daegu', [128.4, 35.7, 128.8, 36.0]),
  region('KR-28', '인천광역시', 'Incheon', [126.3, 37.3, 126.8, 37.7]),
  region('KR-29', '광주광역시', 'Gwangju', [126.7, 35.0, 127.0, 35.3]),
  region('KR-30', '대전광역시', 'Daejeon', [127.2, 36.2, 127.5, 36.5]),
  region('KR-31', '울산광역시', 'Ulsan', [129.1, 35.4, 129.5, 35.7]),
  region('KR-50', '세종특별자치시', 'Sejong', [127.1, 36.4, 127.4, 36.7]),
  region('KR-41', '경기도', 'Gyeonggi', [126.4, 36.9, 127.9, 38.3]),
  region('KR-42', '강원특별자치도', 'Gangwon', [127.0, 37.0, 129.4, 38.6]),
  region('KR-43', '충청북도', 'Chungbuk', [127.2, 36.0, 128.7, 37.3]),
  region('KR-44', '충청남도', 'Chungnam', [125.8, 35.9, 127.6, 37.1]),
  region('KR-45', '전라북도', 'Jeonbuk', [126.3, 35.3, 128.0, 36.4]),
  region('KR-46', '전라남도', 'Jeonnam', [125.8, 33.8, 127.8, 35.6]),
  region('KR-47', '경상북도', 'Gyeongbuk', [127.8, 35.5, 130.0, 37.5]),
  region('KR-48', '경상남도', 'Gyeongnam', [127.5, 34.6, 129.4, 35.9]),
  region('KR-49', '제주특별자치도', 'Jeju', [126.1, 33.1, 126.9, 33.6]),
];

function region(
  id: string,
  name_ko: string,
  name_en: string,
  bbox: [number, number, number, number]
): Region {
  return {
    id,
    countryCode: 'KR',
    level: 1,
    name_ko,
    name_local: name_ko,
    name_en,
    bbox,
    geometry: bboxToPolygon(bbox),
  };
}

function bboxToPolygon(bbox: [number, number, number, number]): GeoJSON.Polygon {
  const [minLng, minLat, maxLng, maxLat] = bbox;
  return {
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
  };
}
