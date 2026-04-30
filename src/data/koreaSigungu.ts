import { Region } from '@core/types';

/**
 * Korea Level-2 (시군구) seed data — a representative subset for development.
 *
 * Production should replace this file with `assets/geo/kr_sigungu.geojson`
 * (the full 229-region dataset, simplified via mapshaper to ~5MB) and load
 * via the loader in `koreaRegions.ts`.
 *
 * The bboxes are rough rectangles around each district's actual centroid —
 * accurate enough for unit testing point-in-polygon matching but visually
 * blocky on the map. MapLibre with real GeoJSON renders smoothly.
 */
export const KR_LEVEL2_REGIONS: Region[] = [
  // Seoul (서울특별시) gus
  level2('KR-11-110', 'KR-11', '종로구', 'Jongno', 126.978, 37.572, 0.04, 0.03),
  level2('KR-11-140', 'KR-11', '중구', 'Jung', 126.997, 37.563, 0.03, 0.02),
  level2('KR-11-170', 'KR-11', '용산구', 'Yongsan', 126.99, 37.532, 0.04, 0.025),
  level2('KR-11-200', 'KR-11', '성동구', 'Seongdong', 127.036, 37.563, 0.04, 0.025),
  level2('KR-11-215', 'KR-11', '광진구', 'Gwangjin', 127.083, 37.538, 0.04, 0.025),
  level2('KR-11-230', 'KR-11', '동대문구', 'Dongdaemun', 127.04, 37.575, 0.04, 0.025),
  level2('KR-11-260', 'KR-11', '중랑구', 'Jungnang', 127.092, 37.606, 0.04, 0.03),
  level2('KR-11-290', 'KR-11', '성북구', 'Seongbuk', 127.017, 37.61, 0.05, 0.03),
  level2('KR-11-305', 'KR-11', '강북구', 'Gangbuk', 127.025, 37.638, 0.04, 0.03),
  level2('KR-11-320', 'KR-11', '도봉구', 'Dobong', 127.046, 37.667, 0.05, 0.035),
  level2('KR-11-350', 'KR-11', '노원구', 'Nowon', 127.077, 37.654, 0.05, 0.04),
  level2('KR-11-380', 'KR-11', '은평구', 'Eunpyeong', 126.929, 37.602, 0.05, 0.035),
  level2('KR-11-410', 'KR-11', '서대문구', 'Seodaemun', 126.937, 37.579, 0.04, 0.025),
  level2('KR-11-440', 'KR-11', '마포구', 'Mapo', 126.909, 37.566, 0.05, 0.03),
  level2('KR-11-470', 'KR-11', '양천구', 'Yangcheon', 126.866, 37.527, 0.04, 0.025),
  level2('KR-11-500', 'KR-11', '강서구', 'Gangseo', 126.823, 37.55, 0.06, 0.04),
  level2('KR-11-530', 'KR-11', '구로구', 'Guro', 126.887, 37.495, 0.05, 0.03),
  level2('KR-11-545', 'KR-11', '금천구', 'Geumcheon', 126.9, 37.457, 0.04, 0.025),
  level2('KR-11-560', 'KR-11', '영등포구', 'Yeongdeungpo', 126.896, 37.526, 0.04, 0.03),
  level2('KR-11-590', 'KR-11', '동작구', 'Dongjak', 126.94, 37.512, 0.04, 0.025),
  level2('KR-11-620', 'KR-11', '관악구', 'Gwanak', 126.951, 37.478, 0.05, 0.03),
  level2('KR-11-650', 'KR-11', '서초구', 'Seocho', 127.032, 37.484, 0.06, 0.04),
  level2('KR-11-680', 'KR-11', '강남구', 'Gangnam', 127.062, 37.517, 0.06, 0.035),
  level2('KR-11-710', 'KR-11', '송파구', 'Songpa', 127.106, 37.514, 0.06, 0.035),
  level2('KR-11-740', 'KR-11', '강동구', 'Gangdong', 127.146, 37.55, 0.05, 0.035),

  // Busan (부산광역시) gus
  level2('KR-26-110', 'KR-26', '중구', 'Jung-gu', 129.034, 35.105, 0.025, 0.02),
  level2('KR-26-140', 'KR-26', '서구', 'Seo-gu', 129.024, 35.094, 0.03, 0.025),
  level2('KR-26-170', 'KR-26', '동구', 'Dong-gu', 129.045, 35.13, 0.025, 0.02),
  level2('KR-26-200', 'KR-26', '영도구', 'Yeongdo', 129.067, 35.091, 0.04, 0.025),
  level2('KR-26-230', 'KR-26', '부산진구', 'Busanjin', 129.053, 35.16, 0.05, 0.03),
  level2('KR-26-260', 'KR-26', '동래구', 'Dongnae', 129.085, 35.205, 0.04, 0.03),
  level2('KR-26-290', 'KR-26', '남구', 'Nam-gu', 129.087, 35.135, 0.04, 0.03),
  level2('KR-26-320', 'KR-26', '북구', 'Buk-gu', 128.99, 35.197, 0.05, 0.04),
  level2('KR-26-350', 'KR-26', '해운대구', 'Haeundae', 129.163, 35.163, 0.06, 0.04),
  level2('KR-26-380', 'KR-26', '사하구', 'Saha', 128.974, 35.108, 0.05, 0.04),
  level2('KR-26-410', 'KR-26', '금정구', 'Geumjeong', 129.092, 35.243, 0.05, 0.04),
  level2('KR-26-440', 'KR-26', '강서구', 'Gangseo', 128.894, 35.157, 0.08, 0.05),
  level2('KR-26-470', 'KR-26', '연제구', 'Yeonje', 129.084, 35.176, 0.03, 0.025),
  level2('KR-26-500', 'KR-26', '수영구', 'Suyeong', 129.115, 35.146, 0.04, 0.025),
  level2('KR-26-530', 'KR-26', '사상구', 'Sasang', 128.987, 35.151, 0.04, 0.03),
  level2('KR-26-710', 'KR-26', '기장군', 'Gijang', 129.222, 35.244, 0.08, 0.06),

  // Jeju Island
  level2('KR-49-110', 'KR-49', '제주시', 'Jeju City', 126.522, 33.51, 0.4, 0.15),
  level2('KR-49-130', 'KR-49', '서귀포시', 'Seogwipo', 126.56, 33.255, 0.5, 0.13),
];

function level2(
  id: string,
  parentId: string,
  name_ko: string,
  name_en: string,
  cLng: number,
  cLat: number,
  width: number,
  height: number
): Region {
  const bbox: [number, number, number, number] = [
    cLng - width / 2,
    cLat - height / 2,
    cLng + width / 2,
    cLat + height / 2,
  ];
  return {
    id,
    countryCode: 'KR',
    level: 2,
    name_ko,
    name_local: name_ko,
    name_en,
    parentId,
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
