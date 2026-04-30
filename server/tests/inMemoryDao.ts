import { randomUUID } from 'node:crypto';
import type { Dao } from '../src/domain/dao.js';
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
} from '../src/domain/types.js';
import { aggregateVisits } from '../src/domain/visits.js';

interface RegionFixture extends RegionRow {
  /** [minLng, minLat, maxLng, maxLat] — used for in-memory bbox match */
  bbox: [number, number, number, number];
}

export interface InMemoryFixtures {
  regions?: RegionFixture[];
  trips?: TripRow[];
  friendships?: Array<{ userId: string; friendId: string }>;
}

/**
 * Test double that satisfies the Dao contract without Postgres. Region matching
 * is bbox-based instead of ST_Contains, which is fine because tests pre-populate
 * non-overlapping bboxes around known points.
 */
export class InMemoryDao implements Dao {
  private users = new Map<string, UserRow>();
  private usersByEmail = new Map<string, UserRow>();
  private regionsList: RegionFixture[];
  private photosByUser = new Map<string, PhotoRow[]>();
  private visitsByUser = new Map<string, VisitRow[]>();
  private tripsByUser: Map<string, TripRow[]>;
  private friendships: Array<{ userId: string; friendId: string }>;

  constructor(fixtures: InMemoryFixtures = {}) {
    this.regionsList = fixtures.regions ?? [];
    this.tripsByUser = new Map();
    if (fixtures.trips) {
      for (const t of fixtures.trips) {
        const list = this.tripsByUser.get(t.userId) ?? [];
        list.push(t);
        this.tripsByUser.set(t.userId, list);
      }
    }
    this.friendships = fixtures.friendships ?? [];
  }

  async findUserById(id: string) {
    return this.users.get(id) ?? null;
  }

  async findUserByEmail(email: string) {
    return this.usersByEmail.get(email) ?? null;
  }

  async upsertUser(input: { email: string; nickname: string }) {
    const existing = this.usersByEmail.get(input.email);
    if (existing) {
      const updated = { ...existing, nickname: input.nickname };
      this.users.set(updated.id, updated);
      this.usersByEmail.set(updated.email, updated);
      return updated;
    }
    const user: UserRow = {
      id: randomUUID(),
      email: input.email,
      nickname: input.nickname,
      plan: 'free',
    };
    this.users.set(user.id, user);
    this.usersByEmail.set(user.email, user);
    return user;
  }

  async listRegions(countryCode: string, level: 1 | 2 | 3) {
    return this.regionsList
      .filter((r) => r.countryCode === countryCode && r.level === level)
      .map<RegionRow>(({ bbox: _bbox, ...rest }) => rest);
  }

  async matchRegionByPoint(lat: number, lng: number, countryCode: string) {
    const candidates = this.regionsList.filter((r) => r.countryCode === countryCode);
    candidates.sort((a, b) => b.level - a.level); // prefer most specific
    for (const r of candidates) {
      const [minLng, minLat, maxLng, maxLat] = r.bbox;
      if (lng >= minLng && lng <= maxLng && lat >= minLat && lat <= maxLat) {
        return { regionId: r.id };
      }
    }
    return null;
  }

  async upsertPhotos(userId: string, batch: PhotoUpload[]) {
    const existing = this.photosByUser.get(userId) ?? [];
    const byId = new Map(existing.map((p) => [p.id, p] as const));

    let matched = 0;
    for (const p of batch) {
      const region = await this.matchRegionByPoint(p.lat, p.lng, 'KR');
      const row: PhotoRow = {
        id: p.id,
        userId,
        takenAt: p.takenAt,
        lat: p.lat,
        lng: p.lng,
        accuracyM: p.accuracyM ?? null,
        regionId: region?.regionId ?? null,
        cloudUri: p.cloudUri ?? null,
      };
      if (region) matched += 1;
      byId.set(p.id, row);
    }
    const merged = Array.from(byId.values());
    this.photosByUser.set(userId, merged);
    this.visitsByUser.set(userId, aggregateVisits(userId, merged));

    return {
      inserted: batch.length,
      matched,
      photos: batch.map((b) => byId.get(b.id)!),
    };
  }

  async listVisits(userId: string) {
    return this.visitsByUser.get(userId) ?? [];
  }

  async listTrips(userId: string, limit: number) {
    const list = this.tripsByUser.get(userId) ?? [];
    return [...list]
      .sort((a, b) => b.startDate.localeCompare(a.startDate))
      .slice(0, limit);
  }

  async listFriends(userId: string): Promise<FriendRow[]> {
    return this.friendships
      .filter((f) => f.userId === userId)
      .map((f) => {
        const user = this.users.get(f.friendId);
        if (!user) return null;
        return {
          userId: user.id,
          nickname: user.nickname,
          email: user.email,
          since: new Date(0).toISOString(),
        } satisfies FriendRow;
      })
      .filter((r): r is FriendRow => r !== null);
  }

  async addFriendByEmail(userId: string, email: string): Promise<FriendRow | null> {
    const user = this.usersByEmail.get(email);
    if (!user || user.id === userId) return null;
    if (!this.friendships.some((f) => f.userId === userId && f.friendId === user.id)) {
      this.friendships.push({ userId, friendId: user.id });
    }
    return {
      userId: user.id,
      nickname: user.nickname,
      email: user.email,
      since: new Date().toISOString(),
    };
  }

  async removeFriend(userId: string, friendId: string): Promise<boolean> {
    const before = this.friendships.length;
    this.friendships = this.friendships.filter(
      (f) => !(f.userId === userId && f.friendId === friendId)
    );
    return this.friendships.length < before;
  }

  async suggestCompanions(
    userId: string,
    opts: { maxGapMinutes?: number; maxDistanceKm?: number; minOverlaps?: number } = {}
  ): Promise<CompanionMatch[]> {
    const { maxGapMinutes = 30, maxDistanceKm = 0.5, minOverlaps = 3 } = opts;
    const myPhotos = (this.photosByUser.get(userId) ?? []).map((p) => ({
      id: p.id,
      takenAt: p.takenAt,
      lat: p.lat,
      lng: p.lng,
    }));
    if (myPhotos.length === 0) return [];

    const friendIds = this.friendships
      .filter((f) => f.userId === userId)
      .map((f) => f.friendId);

    const { findCompanions } = await import('../src/domain/companions.js');
    const candidates = friendIds
      .map((id) => {
        const u = this.users.get(id);
        if (!u) return null;
        const photos = (this.photosByUser.get(id) ?? []).map((p) => ({
          id: p.id,
          takenAt: p.takenAt,
          lat: p.lat,
          lng: p.lng,
        }));
        return { id: u.id, nickname: u.nickname, photos };
      })
      .filter((c): c is { id: string; nickname: string; photos: typeof myPhotos } => c !== null);

    const matches = findCompanions(myPhotos, candidates, {
      maxGapMs: maxGapMinutes * 60_000,
      maxDistanceKm,
      minOverlaps,
    });
    return matches.map((m) => ({
      userId: m.id,
      nickname: m.nickname,
      overlapCount: m.overlapCount,
      overlapDays: m.overlapDays,
    }));
  }

  async rankFriendsByVisitCount(userId: string): Promise<RankingRow[]> {
    const friendIds = new Set(
      this.friendships.filter((f) => f.userId === userId).map((f) => f.friendId)
    );
    friendIds.add(userId);
    const rows: RankingRow[] = [];
    for (const id of friendIds) {
      const u = this.users.get(id);
      if (!u) continue;
      rows.push({
        userId: u.id,
        nickname: u.nickname,
        visitedRegionCount: (this.visitsByUser.get(u.id) ?? []).length,
      });
    }
    return rows.sort((a, b) => b.visitedRegionCount - a.visitedRegionCount);
  }
}
