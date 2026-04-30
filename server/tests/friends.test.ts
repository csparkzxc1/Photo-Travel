import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';
import { InMemoryDao } from './inMemoryDao.js';

const FIXTURES = {
  regions: [
    {
      id: 'KR-11',
      countryCode: 'KR',
      level: 1 as const,
      parentId: null,
      nameKo: '서울특별시',
      nameEn: 'Seoul',
      bbox: [126.7, 37.4, 127.2, 37.7] as [number, number, number, number],
    },
  ],
};

describe('friends + companions routes', () => {
  let app: FastifyInstance;
  let dao: InMemoryDao;
  let aliceToken: string;
  let bobUserId: string;

  beforeEach(async () => {
    dao = new InMemoryDao(FIXTURES);
    app = await buildApp({
      dao,
      jwtSecret: 'test-secret-thirty-two-bytes-long-xxxxx',
      logLevel: 'silent',
    });

    const alice = await app.inject({
      method: 'POST',
      url: '/auth/dev-login',
      payload: { email: 'alice@example.com', nickname: 'Alice' },
    });
    aliceToken = alice.json<{ token: string }>().token;

    const bob = await app.inject({
      method: 'POST',
      url: '/auth/dev-login',
      payload: { email: 'bob@example.com', nickname: 'Bob' },
    });
    bobUserId = bob.json<{ user: { id: string } }>().user.id;
  });

  afterEach(async () => {
    await app.close();
  });

  it('starts with no friends', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/me/friends',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ friends: [] });
  });

  it('adds a friend by email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/me/friends',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { email: 'bob@example.com' },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json<{ friend: { userId: string; nickname: string } }>();
    expect(body.friend.nickname).toBe('Bob');
    expect(body.friend.userId).toBe(bobUserId);

    const list = await app.inject({
      method: 'GET',
      url: '/me/friends',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(list.json<{ friends: unknown[] }>().friends).toHaveLength(1);
  });

  it('returns 404 when adding an unknown email', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/me/friends',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { email: 'ghost@example.com' },
    });
    expect(res.statusCode).toBe(404);
  });

  it('removes a friend', async () => {
    await app.inject({
      method: 'POST',
      url: '/me/friends',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { email: 'bob@example.com' },
    });
    const res = await app.inject({
      method: 'DELETE',
      url: `/me/friends/${bobUserId}`,
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(res.statusCode).toBe(204);

    const list = await app.inject({
      method: 'GET',
      url: '/me/friends',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(list.json<{ friends: unknown[] }>().friends).toEqual([]);
  });

  it('rejects /me/companions/suggest without auth', async () => {
    const res = await app.inject({ method: 'GET', url: '/me/companions/suggest' });
    expect(res.statusCode).toBe(401);
  });

  it('returns empty companion list when no friends are linked', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/me/companions/suggest',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ matches: [] });
  });

  it('detects companions when shared photos overlap in time and place', async () => {
    // Both Alice and Bob upload photos at City Hall around the same time.
    const photosFor = (idPrefix: string) =>
      Array.from({ length: 6 }, (_, i) => ({
        id: `${idPrefix}${i}`,
        takenAt: new Date(Date.UTC(2025, 4, 1, 9, i * 5)).toISOString(),
        lat: 37.5665 + i * 0.0001,
        lng: 126.978,
      }));

    await app.inject({
      method: 'POST',
      url: '/sync/photos',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { countryCode: 'KR', photos: photosFor('a') },
    });

    // Login as Bob to upload his photos through the same orchestrator.
    const bobLogin = await app.inject({
      method: 'POST',
      url: '/auth/dev-login',
      payload: { email: 'bob@example.com', nickname: 'Bob' },
    });
    const bobToken = bobLogin.json<{ token: string }>().token;
    await app.inject({
      method: 'POST',
      url: '/sync/photos',
      headers: { authorization: `Bearer ${bobToken}` },
      payload: { countryCode: 'KR', photos: photosFor('b') },
    });

    // Alice befriends Bob.
    await app.inject({
      method: 'POST',
      url: '/me/friends',
      headers: { authorization: `Bearer ${aliceToken}` },
      payload: { email: 'bob@example.com' },
    });

    const res = await app.inject({
      method: 'GET',
      url: '/me/companions/suggest?minOverlaps=2&maxDistanceKm=1',
      headers: { authorization: `Bearer ${aliceToken}` },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json<{ matches: Array<{ userId: string; overlapCount: number }> }>();
    expect(body.matches).toHaveLength(1);
    expect(body.matches[0].userId).toBe(bobUserId);
    expect(body.matches[0].overlapCount).toBeGreaterThan(0);
  });
});
