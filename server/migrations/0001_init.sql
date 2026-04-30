-- Photo Travel — initial schema
-- Requires the postgis/postgis Docker image, or `CREATE EXTENSION` privileges.

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Countries (small reference table) -------------------------------------------
CREATE TABLE IF NOT EXISTS countries (
    code            CHAR(2) PRIMARY KEY,
    name_ko         TEXT NOT NULL,
    name_en         TEXT NOT NULL,
    flag_emoji      TEXT NOT NULL,
    total_regions   INTEGER NOT NULL DEFAULT 0,
    supported_level SMALLINT NOT NULL DEFAULT 1
);

-- Regions (administrative geometries) -----------------------------------------
CREATE TABLE IF NOT EXISTS regions (
    id              TEXT PRIMARY KEY,
    country_code    CHAR(2) NOT NULL REFERENCES countries(code),
    level           SMALLINT NOT NULL CHECK (level BETWEEN 1 AND 3),
    parent_id       TEXT REFERENCES regions(id),
    name_ko         TEXT NOT NULL,
    name_local      TEXT NOT NULL,
    name_en         TEXT NOT NULL,
    population      INTEGER,
    area_km2        DOUBLE PRECISION,
    geom            GEOMETRY(MULTIPOLYGON, 4326) NOT NULL
);

CREATE INDEX IF NOT EXISTS regions_geom_gix ON regions USING GIST (geom);
CREATE INDEX IF NOT EXISTS regions_country_level_idx ON regions (country_code, level);
CREATE INDEX IF NOT EXISTS regions_parent_idx ON regions (parent_id);

-- Users -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email         TEXT UNIQUE NOT NULL,
    nickname      TEXT NOT NULL,
    profile_image TEXT,
    plan          TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'premium')),
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    settings      JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- Photos (metadata only — pixel data lives on the device / CDN) ---------------
CREATE TABLE IF NOT EXISTS photos (
    id           TEXT PRIMARY KEY,                 -- client-supplied (media-library asset id)
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cloud_uri    TEXT,
    taken_at     TIMESTAMPTZ NOT NULL,
    location     GEOGRAPHY(POINT, 4326) NOT NULL,
    accuracy_m   REAL,
    region_id    TEXT REFERENCES regions(id),
    trip_id      UUID,
    exif         JSONB,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS photos_user_taken_idx ON photos (user_id, taken_at DESC);
CREATE INDEX IF NOT EXISTS photos_user_region_idx ON photos (user_id, region_id);
CREATE INDEX IF NOT EXISTS photos_location_gix  ON photos USING GIST (location);

-- Trips (auto-clustered by client; canonicalised on server) -------------------
CREATE TABLE IF NOT EXISTS trips (
    id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title                    TEXT NOT NULL,
    start_date               TIMESTAMPTZ NOT NULL,
    end_date                 TIMESTAMPTZ NOT NULL,
    region_ids               TEXT[] NOT NULL DEFAULT '{}',
    representative_photo_id  TEXT REFERENCES photos(id) ON DELETE SET NULL,
    photo_count              INTEGER NOT NULL DEFAULT 0,
    video_count              INTEGER NOT NULL DEFAULT 0,
    is_significant           BOOLEAN NOT NULL DEFAULT false,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trips_user_start_idx ON trips (user_id, start_date DESC);

-- Visits (User × Region aggregate) --------------------------------------------
CREATE TABLE IF NOT EXISTS visits (
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    region_id          TEXT NOT NULL REFERENCES regions(id),
    first_visited_at   TIMESTAMPTZ NOT NULL,
    last_visited_at    TIMESTAMPTZ NOT NULL,
    total_photos       INTEGER NOT NULL DEFAULT 0,
    total_trips        INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, region_id)
);

CREATE INDEX IF NOT EXISTS visits_user_idx ON visits (user_id);

-- Friendships -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS friendships (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    friend_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, friend_id),
    CHECK (user_id <> friend_id)
);
