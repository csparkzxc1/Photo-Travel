import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Dao } from '../domain/dao.js';

const Query = z.object({
  maxGapMinutes: z.coerce.number().positive().max(180).optional(),
  maxDistanceKm: z.coerce.number().positive().max(50).optional(),
  minOverlaps: z.coerce.number().int().positive().max(50).optional(),
});

export interface CompanionsRouteDeps {
  dao: Dao;
}

export const companionsRoutes: FastifyPluginAsync<CompanionsRouteDeps> = async (
  app,
  { dao }
) => {
  app.get(
    '/me/companions/suggest',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const parsed = Query.safeParse(req.query);
      if (!parsed.success) return reply.code(400).send({ error: 'invalid_query' });
      const userId = req.user.sub;
      const matches = await dao.suggestCompanions(userId, parsed.data);
      return { matches };
    }
  );
};
