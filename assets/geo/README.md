# Geographic Assets

Drop production-grade GeoJSON files here. The app loads them at startup if
present, otherwise falls back to the bbox seed data in `src/data/koreaRegions.ts`
and `src/data/koreaSigungu.ts`.

## Expected Files

| File | Description | Expected size after mapshaper simplification |
|---|---|---|
| `kr_sido.geojson` | South Korea Level-1 (광역시도, 17 regions) | ~80 KB |
| `kr_sigungu.geojson` | South Korea Level-2 (시군구, 229 regions) | ~5 MB |
| `jp_prefecture.geojson` | Japan Level-1 (47 prefectures) | ~600 KB |
| `world_countries.geojson` | World countries (when expanding to global) | ~2 MB |

## Required GeoJSON Properties

Each Feature MUST include these properties so the loader can map them to the
`Region` type used throughout the app:

```json
{
  "type": "Feature",
  "properties": {
    "id": "KR-11-680",
    "country_code": "KR",
    "level": 2,
    "name_ko": "강남구",
    "name_local": "강남구",
    "name_en": "Gangnam-gu",
    "parent_id": "KR-11"
  },
  "geometry": { "type": "Polygon", "coordinates": [...] }
}
```

The loader (see `src/data/loadGeoAssets.ts`) computes `bbox` automatically from
the geometry, so it doesn't need to be in the file.

## Sources

- **South Korea**: [GADM](https://gadm.org/download_country_v3.html) (free for
  non-commercial) → simplify with [mapshaper](https://mapshaper.org/) using
  `-simplify 5%` and `-clean`. Or use OSM administrative boundaries via
  Overpass API.
- **Japan**: [国土数値情報](https://nlftp.mlit.go.jp/ksj/) — free.
- **World**: [Natural Earth](https://www.naturalearthdata.com/) — public
  domain, comes pre-simplified.

## License

GADM data is restricted to non-commercial use. For commercial deployment use
OSM (ODbL) or Natural Earth (public domain). Update this README and your
`Settings → 라이선스` screen accordingly.
