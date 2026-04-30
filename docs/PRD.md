# 🌍 여행 트래킹 앱 개발 상세 프롬프트 (PRD)

> **타겟 결과물**: iOS + Android (React Native) + 백엔드 + Admin

---

## 1. 프로젝트 개요

### 한 줄 정의

> "사진 한 장만 있으면 자동으로 칠해지는 나만의 세계지도"

### 핵심 가치 제안

1. **수동 입력 0** — 갤러리 사진의 EXIF GPS만으로 자동 분류
2. **시각적 성취감** — 시·군·구 단위로 칠해지는 지도 + N/183 카운터
3. **추억 보존** — 자동 생성되는 여행별 타임라인 + 콜라주 + 네컷
4. **공유 가능한 정체성** — "나는 한국 32/183 방문자"라는 SNS 자랑거리

---

## 2. 타겟 페르소나

| 페르소나 | 특징 | 핵심 니즈 |
|---|---|---|
| 수집가형 (Collector, 25~40) | 가본 곳 카운트에 집착, MBTI J | 100% 컴플리션, 통계 |
| 추억회상형 (Nostalgic, 30~50) | 사진 정리 못하는 사람 | 자동 분류, 타임라인 |
| 인플루언서형 (Sharer, 20~35) | SNS 공유 활발 | 예쁜 콜라주, 공유 카드 |
| 계획형 (Planner, 28~45) | 다음 여행 준비 | 안 가본 곳 추천, 위시리스트 |

---

## 3. 핵심 기능 명세

### 3.1 🗺️ 지도 (Map) — 메인 탭

- 국가 선택 → 행정구역(한국=시군구 229개, 일본=도도부현 47개 등) 표시
- 방문한 지역만 컬러로 채색 (파스텔 랜덤 색상, 인접 지역 동색 회피)
- 3가지 모드 토글: 일반 / 히트맵 / 마커
- 연도 필터, 진행률 뱃지 `15 / 183`, 핀치줌/더블탭줌

### 3.2 📅 타임라인

- 사진을 시간순 + 위치 클러스터링으로 자동 그룹핑
- 1박2일 + 5장 이상 → "여행"으로 승격, 그 외는 "당일치기"

### 3.3 📸 포토북

- 4컷 / 9컷 / 폴라로이드 / 영상 슬라이드쇼 템플릿
- BGM 라이브러리, 워터마크, SNS 공유 카드

### 3.4 🏆 랭킹

- 친구 대비 방문 지역 수 비교, 뱃지 시스템
- "한국 일주", "섬 헌터", "100개국 클럽", "5대륙 정복자"

### 3.5 ✈️ 나의 여행

- 통계 대시보드 (국가/도시/거리/사진 수)
- 위시리스트, 여행 일기

### 3.6 ⚙️ 설정

- 동기화 주기, 테마, 백업, IAP, 데이터 내보내기

---

## 4. 데이터 모델

```typescript
User { id, email, nickname, plan, totalVisits, settings }
Photo { id, userId, localUri, takenAt, lat, lng, accuracy, regionId?, tripId? }
Region { id, countryCode, level, name_ko, name_en, geometry, bbox }
Trip { id, userId, title, startDate, endDate, regionIds, photoCount, isSignificant }
Visit { userId, regionId, firstVisitedAt, lastVisitedAt, totalPhotos }
Country { code, name_ko, name_en, flagEmoji, totalRegions }
```

자세한 타입은 [`src/core/types.ts`](../src/core/types.ts) 참고.

---

## 5. 기술 스택

- **Frontend**: React Native + Expo + TypeScript, Zustand, MapLibre GL Native, react-native-svg
- **Backend**: Node.js + Fastify (or Go Fiber), PostgreSQL + PostGIS, Redis, S3/CloudFront
- **Infra**: AWS/GCP, Docker, GitHub Actions, Sentry, Mixpanel
- **AI/ML (V2)**: CLIP 임베딩, Claude API (제목 생성)

---

## 6. 핵심 알고리즘

### 6.1 사진 → 지역 매칭

구현: [`src/core/regionMatcher.ts`](../src/core/regionMatcher.ts)

```
1. bbox로 후보 필터
2. point-in-polygon 검사
3. 미적중 시 nearest region within maxDistanceKm (fallback)
```

### 6.2 여행 자동 그룹핑

구현: [`src/core/tripClusterer.ts`](../src/core/tripClusterer.ts)

```
1. timestamp 정렬
2. 같은 region + 24h 이내 = 같은 trip
3. 다른 region + 12h 초과 = 새 trip
4. 5장+ 또는 2일+ = "significant"
```

---

## 7. UX 원칙

1. Zero-friction onboarding — 권한 1회 → 30초 내 첫 지도
2. Dopamine loop — 새 지역 방문 푸시 → 카운터 애니메이션 → 공유
3. Privacy-first — 원본은 디바이스에만
4. Empty state도 예쁘게
5. 다크모드 first-class

---

## 8. 수익화

| 단계 | 모델 | ARPU |
|---|---|---|
| MVP | 배너 광고 | $0.5/월 |
| V1 | 광고 제거 IAP ($2.99) | $1.5/월 |
| V2 | 프리미엄 ($4.99) | $4.99/월 |
| V3 | B2B 라이선싱 | 별도 |

---

## 9. 로드맵

- **MVP (3개월)**: 한국+일본 / 자동 동기화 / 타임라인 / 진행률
- **V1 (+3개월)**: 200개국 / 히트맵 / 콜라주 / 친구 랭킹
- **V2 (+6개월)**: AI 제목 / 위시리스트 / 영상 / Health 연동
- **V3 (+12개월)**: 일정 마켓플레이스 / 커머스 제휴 / AR 모드

---

## 10. 핵심 KPI

| 지표 | 목표 (V1) |
|---|---|
| D1 Retention | 40%+ |
| D30 Retention | 15%+ |
| 평균 세션 시간 | 4분+ |
| 사진 동기화 성공률 | 99%+ |
| 지역 매칭 정확도 | 98%+ |
| 무료→유료 전환율 | 3%+ |

---

## 11. 차별화 아이디어

1. **"안 가본 곳" 다크 모드** — 빈 곳 강조 → 다음 여행 동기부여
2. **시간 슬라이더** — 1년치 발자취가 30초 영상으로
3. **여행 DNA** — "산>바다, 도시>시골" 성향 분석
4. **추억 알림** — "3년 전 오늘, 당신은 제주에 있었어요"
5. **동행자 자동 인식** — 같은 시간/장소 사진 친구 매칭
6. **탄소 발자국** — 비행 거리 기반 환경 영향 + 오프셋 제안

---

*Last updated: 2026.04.30*
