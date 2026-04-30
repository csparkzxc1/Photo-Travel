# Photo Travel 🌍

> 사진 한 장만 있으면 자동으로 칠해지는 나만의 세계지도 — 여행 라이프로그 앱

본 리포지토리는 [PRD](./docs/PRD.md)에 기술된 여행 트래킹 앱의 **MVP 골격(scaffold)** 입니다.
React Native (Expo) + TypeScript 기반이며, 6개 메인 탭과 사진→지역 매칭 / 여행 자동 클러스터링
핵심 알고리즘이 동작하는 상태로 구현되어 있습니다.

## 현재 구현된 범위 (v0.3.0)

| 영역 | 상태 |
|---|---|
| **프로젝트 셋업** (Expo + TS + path aliases + Jest) | ✅ |
| **디자인 시스템** (tokens, ThemeProvider, 라이트/다크) | ✅ |
| **데이터 모델** (User / Photo / Region / Trip / Visit / Country) | ✅ |
| **핵심 알고리즘** (point-in-polygon, region matcher, trip clusterer, photo processor) | ✅ + 24 단위 테스트 |
| **네비게이션 셸** (6 bottom tabs) | ✅ |
| **지도 화면** (SVG 폴리곤 렌더, 모드 토글, 진행률 뱃지, 연도 필터) | ✅ |
| **국가 선택 모달** (검색 + 깃발) | ✅ |
| **"안 가본 곳" 렌즈 모드** (PRD §11 차별화) | ✅ |
| **타임라인 / 포토북 / 랭킹 / 나의 여행 / 설정** | ✅ |
| **시드 데이터** (한국 광역시도 17개 + 데모 사진/여행) | ✅ |
| **갤러리 동기화 파이프라인** (expo-media-library + EXIF + 권한 플로우) | ✅ |
| **온보딩 플로우** (권한 요청 + 진행률 + 스킵) | ✅ |
| **영구 스토어** (zustand + AsyncStorage) | ✅ |
| **MapLibre Native** (production GPU 렌더, EXPO_PUBLIC_USE_MAPLIBRE=1로 활성화) | ✅ |
| **다단계 행정구역** (시도/시군구 토글, 부모 visit propagation) | ✅ |
| **백그라운드 동기화** (expo-background-fetch + 증분 merge, 6h 주기) | ✅ |
| **백엔드 API + PostGIS** (Fastify + Drizzle, ST_Contains 매칭, JWT 인증) | ✅ |
| 콜라주 생성기 / 영상 슬라이드쇼 | ⏳ V1 |
| 인앱결제 / 광고 | ⏳ V1 |
| AI 여행 제목 생성 (CLIP / Claude) | ⏳ V2 |

## 폴더 구조

```
src/
├── core/              # 도메인 로직 (UI/RN 의존 없음, 100% 테스트 가능)
│   ├── types.ts
│   ├── geo.ts                  point-in-polygon, haversine
│   ├── regionMatcher.ts        GPS → Region (with fallback)
│   ├── tripClusterer.ts        Photo[] → Trip[]
│   ├── photoProcessor.ts       RawAsset[] → {photos, trips, visits, stats}
│   └── __tests__/
├── data/              # 시드 데이터 + Zustand 스토어
│   ├── countries.ts
│   ├── koreaRegions.ts         시드 GeoJSON (광역시도 단순화)
│   ├── mockPhotos.ts           데모용 사진 생성
│   └── store.ts
├── design/            # 디자인 토큰 + ThemeProvider
│   ├── tokens.ts
│   └── ThemeProvider.tsx
├── components/        # 재사용 UI (Card, Pill, ScreenHeader)
├── features/          # 기능별 화면 (탭 단위)
│   ├── map/                    MapScreen, RegionMap, CountryPickerModal
│   ├── timeline/
│   ├── photobook/
│   ├── ranking/
│   ├── mytravel/
│   ├── settings/
│   ├── onboarding/             권한 요청 + 첫 동기화
│   └── sync/                   mediaLibrary, photoSync (orchestrator)
└── navigation/
    └── RootNavigator.tsx
```

## 시작하기

### 요구사항

- Node.js 20+
- npm 또는 yarn
- iOS: Xcode 15+ / Android: Android Studio + JDK 17

### 설치 및 실행

```bash
npm install --ignore-scripts   # native postinstall은 prebuild 시 실행
npm start                      # Metro 시작
npm run ios                    # iOS 시뮬레이터
npm run android                # Android 에뮬레이터
```

> `--ignore-scripts`는 일부 RN 라이브러리의 postinstall이 `expo prebuild`
> 단계에서만 필요한 네이티브 빌드 도구를 요구하기 때문입니다. 실기기 빌드 전에는
> `npx expo prebuild`를 한 번 실행해주세요.

### 검증

```bash
npm run typecheck    # tsc --noEmit
npm test             # Jest (17 tests, 3 suites)
```

## 핵심 알고리즘

### 1) 사진 → 지역 매칭 (`src/core/regionMatcher.ts`)

```
1. bbox로 후보 폴리곤을 1차 필터링 (R-tree 도입 시 O(log n))
2. 각 후보에 대해 ray casting point-in-polygon 검사
3. 적중 없으면 가장 가까운 지역의 bbox 중심까지의 haversine 거리 계산,
   maxDistanceKm 이내면 fallback=true로 매칭 (해상/GPS 오차 케이스)
4. 그래도 없으면 null
```

### 2) 여행 자동 클러스터링 (`src/core/tripClusterer.ts`)

PRD §6.2 알고리즘 그대로 구현:

```
1. 사진을 timestamp 정렬
2. 같은 region + 24h 이내 → 같은 trip
3. 다른 region + 12h 이상 gap → 새 trip
4. ≥5장 또는 ≥2일 → "significant" trip (당일치기와 구분)
```

테스트 커버: 빈 입력, 단일 region, region 전환, 의미있는 trip 판정, 대표 사진 선택.

## 디자인 원칙

- **다크모드 first-class** — `useColorScheme` 기반 자동 전환, 히트맵은 다크에서 빛남
- **Privacy-first** — 사진 원본은 디바이스, 클라우드엔 좌표+썸네일만 (V1)
- **Empty state도 예쁘게** — 모든 화면에 mock data 빈 상태 처리
- **파스텔 자동 컬러링** — `pickPastel(seed)`로 인접 지역 색상 회피 (production은 그래프 컬러링)

## 동기화 파이프라인 (v0.2)

```
사용자가 "동기화" 탭
       ↓
ensureMediaPermission()        ← expo-media-library 권한 흐름
       ↓
fetchGpsAssets()               ← 페이지네이션 + EXIF GPS 해상
       ↓
processAssets()                ← 순수 함수 (테스트 24개)
       ├─ matchRegion          ← bbox + point-in-polygon + fallback
       └─ clusterTrips         ← 24h/12h gap 룰 + significance 판정
       ↓
Zustand store (persist)        ← AsyncStorage에 사진/여행/통계 캐싱
       ↓
모든 화면 자동 리렌더
```

상태 머신: `idle → requesting → syncing(loaded, total) → success | error`.
온보딩과 설정 화면이 같은 `syncStatus`를 구독합니다.

## 백엔드

`server/`에 Fastify + Drizzle + PostgreSQL/PostGIS 백엔드가 있습니다.
서버측 region 매칭은 PostGIS `ST_Contains`(GIST 인덱스)로 수행됩니다.

```bash
cd server
cp .env.example .env
npm install
npm run docker:up        # postgres+postgis on :5432
npm run db:migrate
npm run dev              # :4000
npm test                 # 13 tests, no docker needed (in-memory DAO)
```

엔드포인트와 아키텍처는 [`server/README.md`](./server/README.md) 참고.

## 다음 작업 (V1 우선순위)

1. **콜라주/영상 생성기** — Skia 또는 react-native-view-shot 기반 4컷/9컷 합성
2. **인앱결제** — RevenueCat으로 광고 제거 / 프리미엄 구독
3. **친구 추가 + 동행자 자동 인식** — 같은 시간/장소 사진 매칭

자세한 로드맵은 [docs/PRD.md §9](./docs/PRD.md)를 참고하세요.

## 라이선스

행정구역 GeoJSON: OpenStreetMap (ODbL) + GADM (free for non-commercial).
프로젝트 코드 라이선스는 별도 결정 예정.
