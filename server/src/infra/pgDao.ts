import { and, desc, eq, sql } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { friendships, regions, trips, users, visits } from '../db/schema.js';
import { aggregateVisits, diffVisits } from '../domain/visits.js';
import { findCompanions } from '../domain/companions.js';
import type { Dao } from '../domain/dao.js';
import type {
  CompanionMatch,
  FriendRow,
  PhotoRow,
  PhotoUpload,
  RankingRow,
  RegionRow,
  TripRow,
  UserRow,
  VisitRow,
} from '../domain/types.js';

/**
 * Postgres + PostGIS implementation of the Dao contract.
 *
 * Region matching uses ST_Contains against the GIST-indexed `regions.geom`,
 * which is dramatically faster than client-side polygon checks once you
 * have hundreds of regions × millions of photos. The match runs inside the
 * same SQL statement as the photo upsert so a 200-photo batch finishes in
 * one round trip per row.
 */
export function createPgDao(db: Db): Dao {
  return {
    async findUserById(id) {
      const [row] = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return row ? mapUser(row) : null;
    },

    async findUserByEmail(email) {
      const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return row ? mapUser(row) : null;
    },

    async upsertUser({ email, nickname }) {
      const [row] = await db
        .insert(users)
        .values({ email, nickname })
        .onConflictDoUpdate({
          target: users.email,
          set: { nickname },
        })
        .returning();
      return mapUser(row);
    },

    async listRegions(countryCode, level) {
      const rows = await db
        .select({
          id: regions.id,
          countryCode: regions.countryCode,
          level: regions.level,
          parentId: regions.parentId,
          nameKo: regions.nameKo,
          nameEn: regions.nameEn,
        })
        .from(regions)
        .where(and(eq(regions.countryCode, countryCode), eq(regions.level, level)));

      return rows.map<RegionRow>((r) => ({
        id: r.id,
        countryCode: r.countryCode,
        level: r.level as 1 | 2 | 3,
        parentId: r.parentId,
        nameKo: r.nameKo,
        nameEn: r.nameEn,
      }));
    },

    async matchRegionByPoint(lat, lng, countryCode) {
      // ST_Contains over the GIST index; LIMIT 1 since regions don't overlap.
      const result = await db.execute<{ id: string } & Record<string, unknown>>(sql`
        SELECT id FROM regions
        WHERE country_code = ${countryCode}
          AND ST_Contains(geom, ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326))
        ORDER BY level DESC
        LIMIT 1
      `);
      const row = result[0];
      return row ? { regionId: row.id } : null;
    },

    async upsertPhotos(userId, batch: PhotoUpload[]) {
      if (batch.length === 0) {
        return { inserted: 0, matched: 0, photos: [] };
      }

      // Insert with PostGIS function calls for `location`, and resolve
      // region_id via a lateral subquery in the same statement so we don't
      // need a second round trip per photo.
      const values = batch.map(
        (p) => sql`(
          ${p.id},
          ${userId}::uuid,
          ${p.cloudUri ?? null},
          ${p.takenAt}::timestamptz,
          ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326)::geography,
          ${p.accuracyM ?? null},
          (SELECT id FROM regions
            WHERE ST_Contains(geom, ST_SetSRID(ST_MakePoint(${p.lng}, ${p.lat}), 4326))
            LIMIT 1)
        )`
      );

      const inserted = await db.execute<PhotoDbRow>(sql`
        INSERT INTO photos (id, user_id, cloud_uri, taken_at, location, accuracy_m, region_id)
        VALUES ${sql.join(values, sql`, `)}
        ON CONFLICT (id) DO UPDATE SET
          taken_at = EXCLUDED.taken_at,
          location = EXCLUDED.location,
          accuracy_m = EXCLUDED.accuracy_m,
          region_id = EXCLUDED.region_id,
          cloud_uri = EXCLUDED.cloud_uri,
          updated_at = now()
        RETURNING id, user_id, taken_at, ST_Y(location::geometry) AS lat,
                  ST_X(location::geometry) AS lng, accuracy_m, region_id, cloud_uri
      `);

      const photoRows: PhotoRow[] = inserted.map(mapPhoto);
      const matched = photoRows.filter((p) => p.regionId).length;

      // Refresh visits aggregation for the affected user. In production this
      // should be incremental (only touch regions in the new batch), but for
      // simplicity we recompute in-memory for now.
      const allUserPhotos = await db.execute<PhotoDbRow>(sql`
        SELECT id, user_id, taken_at, ST_Y(location::geometry) AS lat,
               ST_X(location::geometry) AS lng, accuracy_m, region_id, cloud_uri
        FROM photos WHERE user_id = ${userId}::uuid
      `);
      const nextVisits = aggregateVisits(userId, allUserPhotos.map(mapPhoto));

      const prev = await db.select().from(visits).where(eq(visits.userId, userId));
      const { added, updated } = diffVisits(
        prev.map((p) => ({
          ...p,
          firstVisitedAt: p.firstVisitedAt.toISOString(),
          lastVisitedAt: p.lastVisitedAt.toISOString(),
        })),
        nextVisits
      );

      const upserts = [...added, ...updated];
      if (upserts.length > 0) {
        await db
          .insert(visits)
          .values(
            upserts.map((v) => ({
              userId: v.userId,
              regionId: v.regionId,
              firstVisitedAt: new Date(v.firstVisitedAt),
              lastVisitedAt: new Date(v.lastVisitedAt),
              totalPhotos: v.totalPhotos,
              totalTrips: v.totalTrips,
            }))
          )
          .onConflictDoUpdate({
            target: [visits.userId, visits.regionId],
            set: {
              firstVisitedAt: sql`LEAST(${visits.firstVisitedAt}, EXCLUDED.first_visited_at)`,
              lastVisitedAt: sql`GREATEST(${visits.lastVisitedAt}, EXCLUDED.last_visited_at)`,
              totalPhotos: sql`EXCLUDED.total_photos`,
              totalTrips: sql`EXCLUDED.total_trips`,
            },
          });
      }

      return { inserted: photoRows.length, matched, photos: photoRows };
    },

    async listVisits(userId) {
      const rows = await db.select().from(visits).where(eq(visits.userId, userId));
      return rows.map<VisitRow>((v) => ({
        userId: v.userId,
        regionId: v.regionId,
        firstVisitedAt: v.firstVisitedAt.toISOString(),
        lastVisitedAt: v.lastVisitedAt.toISOString(),
        totalPhotos: v.totalPhotos,
        totalTrips: v.totalTrips,
      }));
    },

    async listTrips(userId, limit) {
      const rows = await db
        .select()
        .from(trips)
        .where(eq(trips.userId, userId))
        .orderBy(desc(trips.startDate))
        .limit(limit);
      return rows.map<TripRow>((t) => ({
        id: t.id,
        userId: t.userId,
        title: t.title,
        startDate: t.startDate.toISOString(),
        endDate: t.endDate.toISOString(),
        regionIds: t.regionIds,
        representativePhotoId: t.representativePhotoId,
        photoCount: t.photoCount,
        videoCount: t.videoCount,
        isSignificant: t.isSignificant,
      }));
    },

    async listFriends(userId): Promise<FriendRow[]> {
      const rows = await db.execute<{
        user_id: string;
        nickname: string;
        email: string;
        since: Date;
      } & Record<string, unknown>>(sql`
        SELECT u.id AS user_id, u.nickname, u.email, f.created_at AS since
        FROM friendships f
        JOIN users u ON u.id = f.friend_id
        WHERE f.user_id = ${userId}::uuid
        ORDER BY f.created_at DESC
      `);
      return rows.map((r) => ({
        userId: r.user_id,
        nickname: r.nickname,
        email: r.email,
        since: r.since.toISOString(),
      }));
    },

    async addFriendByEmail(userId, email): Promise<FriendRow | null> {
      const [target] = await db.select().from(users).where(eq(users.email, email)).limit(1);
      if (!target || target.id === userId) return null;
      await db
        .insert(friendships)
        .values({ userId, friendId: target.id })
        .onConflictDoNothing();
      return {
        userId: target.id,
        nickname: target.nickname,
        email: target.email,
        since: new Date().toISOString(),
      };
    },

    async removeFriend(userId, friendId): Promise<boolean> {
      const result = await db.execute<Record<string, unknown>>(sql`
        DELETE FROM friendships
        WHERE user_id = ${userId}::uuid AND friend_id = ${friendId}::uuid
        RETURNING user_id
      `);
      return result.length > 0;
    },

    async suggestCompanions(userId, opts = {}): Promise<CompanionMatch[]> {
      const { maxGapMinutes = 30, maxDistanceKm = 0.5, minOverlaps = 3 } = opts;

      // Pull my photos and my friends' photos in two queries — companion
      // detection is small enough to run in-process. For users with millions
      // of photos we'd push this into PostGIS via ST_DWithin + a temporal
      // self-join, but the in-memory algorithm is also covered by the same
      // unit tests, which makes this swap straightforward later.
      const myPhotos = await db.execute<{
        id: string;
        taken_at: Date;
        lat: number;
        lng: number;
      } & Record<string, unknown>>(sql`
        SELECT id, taken_at, ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng
        FROM photos WHERE user_id = ${userId}::uuid
      `);

      const friendsAndPhotos = await db.execute<{
        friend_id: string;
        nickname: string;
        photo_id: string | null;
        taken_at: Date | null;
        lat: number | null;
        lng: number | null;
      } & Record<string, unknown>>(sql`
        SELECT u.id AS friend_id, u.nickname,
               p.id AS photo_id, p.taken_at,
               ST_Y(p.location::geometry) AS lat, ST_X(p.location::geometry) AS lng
        FROM friendships f
        JOIN users u ON u.id = f.friend_id
        LEFT JOIN photos p ON p.user_id = u.id
        WHERE f.user_id = ${userId}::uuid
      `);

      const grouped = new Map<string, { id: string; nickname: string; photos: Array<{ id: string; takenAt: string; lat: number; lng: number }> }>();
      for (const row of friendsAndPhotos) {
        const entry = grouped.get(row.friend_id) ?? {
          id: row.friend_id,
          nickname: row.nickname,
          photos: [],
        };
        if (row.photo_id && row.taken_at && row.lat !== null && row.lng !== null) {
          entry.photos.push({
            id: row.photo_id,
            takenAt: row.taken_at.toISOString(),
            lat: Number(row.lat),
            lng: Number(row.lng),
          });
        }
        grouped.set(row.friend_id, entry);
      }

      const matches = findCompanions(
        myPhotos.map((p) => ({
          id: p.id,
          takenAt: p.taken_at.toISOString(),
          lat: Number(p.lat),
          lng: Number(p.lng),
        })),
        Array.from(grouped.values()),
        {
          maxGapMs: maxGapMinutes * 60_000,
          maxDistanceKm,
          minOverlaps,
        }
      );

      return matches.map((m) => ({
        userId: m.id,
        nickname: m.nickname,
        overlapCount: m.overlapCount,
        overlapDays: m.overlapDays,
      }));
    },

    async rankFriendsByVisitCount(userId): Promise<RankingRow[]> {
      const rows = await db.execute<{
        user_id: string;
        nickname: string;
        visited_region_count: number;
      } & Record<string, unknown>>(sql`
        SELECT u.id AS user_id, u.nickname, COUNT(v.region_id)::int AS visited_region_count
        FROM users u
        LEFT JOIN visits v ON v.user_id = u.id
        WHERE u.id = ${userId}::uuid
           OR u.id IN (SELECT friend_id FROM friendships WHERE user_id = ${userId}::uuid)
        GROUP BY u.id, u.nickname
        ORDER BY visited_region_count DESC
      `);
      return rows.map((r) => ({
        userId: r.user_id,
        nickname: r.nickname,
        visitedRegionCount: r.visited_region_count,
      }));
    },
  };
}

interface PhotoDbRow extends Record<string, unknown> {
  id: string;
  user_id: string;
  taken_at: Date;
  lat: number;
  lng: number;
  accuracy_m: number | null;
  region_id: string | null;
  cloud_uri: string | null;
}

function mapPhoto(r: PhotoDbRow): PhotoRow {
  return {
    id: r.id,
    userId: r.user_id,
    takenAt: r.taken_at.toISOString(),
    lat: Number(r.lat),
    lng: Number(r.lng),
    accuracyM: r.accuracy_m,
    regionId: r.region_id,
    cloudUri: r.cloud_uri,
  };
}

function mapUser(r: typeof users.$inferSelect): UserRow {
  return {
    id: r.id,
    email: r.email,
    nickname: r.nickname,
    plan: r.plan as 'free' | 'premium',
  };
}
