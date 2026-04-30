import type {
  PhotoRow,
  PhotoUpload,
  RankingRow,
  RegionRow,
  TripRow,
  UserRow,
  VisitRow,
} from './types.js';

/**
 * Data-access interface — the only contract route handlers depend on.
 *
 * The Postgres-backed implementation lives in `infra/pgDao.ts` and uses
 * Drizzle + PostGIS. Tests can plug in an in-memory implementation
 * (`tests/inMemoryDao.ts`) so route handlers run end-to-end via Fastify
 * inject() without needing a real database.
 */
export interface Dao {
  // ─── Auth / Users ────────────────────────────────────────────────
  findUserById(id: string): Promise<UserRow | null>;
  findUserByEmail(email: string): Promise<UserRow | null>;
  upsertUser(input: { email: string; nickname: string }): Promise<UserRow>;

  // ─── Regions ─────────────────────────────────────────────────────
  /** All regions for a country at a given level. */
  listRegions(countryCode: string, level: 1 | 2 | 3): Promise<RegionRow[]>;
  /** PostGIS ST_Contains lookup. */
  matchRegionByPoint(
    lat: number,
    lng: number,
    countryCode: string
  ): Promise<{ regionId: string } | null>;

  // ─── Photos ──────────────────────────────────────────────────────
  upsertPhotos(userId: string, batch: PhotoUpload[]): Promise<{
    inserted: number;
    matched: number;
    photos: PhotoRow[];
  }>;

  // ─── Visits / Trips ──────────────────────────────────────────────
  listVisits(userId: string): Promise<VisitRow[]>;
  listTrips(userId: string, limit: number): Promise<TripRow[]>;

  // ─── Ranking ─────────────────────────────────────────────────────
  rankFriendsByVisitCount(userId: string): Promise<RankingRow[]>;
}
