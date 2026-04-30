import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Dao } from '../domain/dao.js';

const Params = z.object({
  countryCode: z.string().length(2),
});

const Query = z.object({
  level: z.coerce.number().int().min(1).max(3).default(1),
});

export interface RegionsRouteDeps {
  dao: Dao;
}

export const regionsRoutes: FastifyPluginAsync<RegionsRouteDeps> = async (app, { dao }) => {
  // Public endpoint — no auth required for region metadata.
  app.get('/regions/:countryCode', async (req, reply) => {
    const params = Params.safeParse(req.params);
    if (!params.success) return reply.code(400).send({ error: 'invalid_params' });
    const query = Query.safeParse(req.query);
    if (!query.success) return reply.code(400).send({ error: 'invalid_query' });

    const regions = await dao.listRegions(
      params.data.countryCode.toUpperCase(),
      query.data.level as 1 | 2 | 3
    );
    return { regions };
  });
};
