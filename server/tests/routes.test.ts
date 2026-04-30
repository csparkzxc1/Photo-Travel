import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { InMemoryDao } from './inMemoryDao.js';

const SEOUL_BBOX: [number, number, number, number] = [126.7, 37.4, 127.2, 37.7];
const BUSAN_BBOX: [number, number, number, number] = [128.7, 35.0, 129.3, 35.4];

const FIXTURES = {
  regions: [
    {
      id: 'KR-11',
      countryCode: 'KR',
      level: 1 as const,
      parentId: null,
      nameKo: '서울특별시',
      nameEn: 'Seoul',
      bbox: SEOUL_BBOX,
    },
    {
      id: 'KR-26',
      countryCode: 'KR',
      level: 1 as const,
      parentId: null,
      nameKo: '부산광역시',
      nameEn: 'Busan',
      bbox: BUSAN_BBOX,
    },
  ],
};

describe('API routes', () => {
  let app: FastifyInstance;
  let dao: InMemoryDao;
  let token: string;
  let userId: string;

  beforeEach(async () => {
    dao = new InMemoryDao(FIXTURES);
    app = await buildApp({
      dao,
      jwtSecret: 'test-secret-thirty-two-bytes-long-xxxxx',
      logLevel: 'silent',
    });

    const login = await app.inject({
      method: 'POST',
      url: '/auth/dev-login',
      payload: { email: 'demo@example.com', nickname: 'Demo' },
    });
    expect(login.statusCode).toBe(200);
    token = login.json<{ token: string }>().token;
    userId = login.json<{ user: { id: string } }>().user.id;
  });

  afterEach(async () => {
    await app.close();
  });

  it('rejects /me/visits without bearer token', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/visits' });
    expect(res.statusCode).toBe(401);
  });

  it('returns empty visits for a fresh user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/me/visits',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ visits: [] });
  });

  it('POST /sync/photos matches photos to regions and counts results', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/sync/photos',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        countryCode: 'KR',
        photos: [
          { id: 'p1', takenAt: '2025-05-01T09:00:00Z', lat: 37.5665, lng: 126.978 },
          { id: 'p2', takenAt: '2025-05-05T09:00:00Z', lat: 35.1796, lng: 129.075 },
          { id: 'p3', takenAt: '2025-05-06T09:00:00Z', lat: 0, lng: 0 },
        ],
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ inserted: number; matched: number; unmatched: number }>();
    expect(body).toEqual({ inserted: 3, matched: 2, unmatched: 1 });
  });

  it('GET /me/visits reflects synced photos', async () => {
    await app.inject({
      method: 'POST',
      url: '/sync/photos',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        countryCode: 'KR',
        photos: [
          { id: 'p1', takenAt: '2025-05-01T09:00:00Z', lat: 37.5665, lng: 126.978 },
          { id: 'p2', takenAt: '2025-05-02T09:00:00Z', lat: 37.5665, lng: 126.978 },
        ],
      },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/me/visits',
      headers: { authorization: `Bearer ${token}` },
    });
    const body = res.json<{ visits: Array<{ regionId: string; totalPhotos: number }> }>();
    expect(body.visits).toHaveLength(1);
    expect(body.visits[0]).toMatchObject({ regionId: 'KR-11', totalPhotos: 2 });
  });

  it('GET /regions/:countryCode is public and filters by level', async () => {
    const res = await app.inject({ method: 'GET', url: '/regions/kr?level=1' });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ regions: unknown[] }>().regions).toHaveLength(2);
  });

  it('POST /sync/photos rejects invalid latitudes', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/sync/photos',
      headers: { authorization: `Bearer ${token}` },
      payload: {
        countryCode: 'KR',
        photos: [{ id: 'bad', takenAt: '2025-05-01T09:00:00Z', lat: 200, lng: 0 }],
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('healthz returns ok', async () => {
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json<{ ok: boolean }>().ok).toBe(true);
  });

  it('GET /ranking/friends includes the caller', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/ranking/friends',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ ranking: Array<{ userId: string }> }>();
    expect(body.ranking.find((r) => r.userId === userId)).toBeDefined();
  });
});
