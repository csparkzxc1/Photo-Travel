import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import { authPlugin } from './auth/plugin.js';
import { photosRoutes } from './routes/photos.js';
import { visitsRoutes } from './routes/visits.js';
import { tripsRoutes } from './routes/trips.js';
import { regionsRoutes } from './routes/regions.js';
import { rankingRoutes } from './routes/ranking.js';
import { friendsRoutes } from './routes/friends.js';
import { companionsRoutes } from './routes/companions.js';
import type { Dao } from './domain/dao.js';

export interface BuildAppOptions {
  dao: Dao;
  jwtSecret: string;
  logLevel?: string;
}

export async function buildApp({
  dao,
  jwtSecret,
  logLevel = 'info',
}: BuildAppOptions): Promise<FastifyInstance> {
  const app = Fastify({
    logger: { level: logLevel },
    disableRequestLogging: false,
  });

  await app.register(helmet, { contentSecurityPolicy: false });
  await app.register(cors, { origin: true, credentials: true });
  await app.register(sensible);
  await app.register(authPlugin, { secret: jwtSecret });

  app.get('/healthz', async () => ({ ok: true, ts: new Date().toISOString() }));

  app.post<{ Body: { email: string; nickname: string } }>(
    '/auth/dev-login',
    {
      schema: {
        body: {
          type: 'object',
          required: ['email', 'nickname'],
          properties: {
            email: { type: 'string', format: 'email' },
            nickname: { type: 'string', minLength: 1, maxLength: 32 },
          },
        },
      },
    },
    async (req) => {
      // NOTE: Dev-only — production replaces this with Apple/Google/Kakao OIDC.
      const user = await dao.upsertUser({
        email: req.body.email,
        nickname: req.body.nickname,
      });
      const token = app.jwt.sign({ sub: user.id, email: user.email });
      return { token, user };
    }
  );

  await app.register(async (scoped) => {
    await photosRoutes(scoped, { dao });
    await visitsRoutes(scoped, { dao });
    await tripsRoutes(scoped, { dao });
    await regionsRoutes(scoped, { dao });
    await rankingRoutes(scoped, { dao });
    await friendsRoutes(scoped, { dao });
    await companionsRoutes(scoped, { dao });
  });

  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'unhandled');
    if (reply.statusCode < 400) reply.code(500);
    return reply.send({ error: 'internal_error' });
  });

  return app;
}
