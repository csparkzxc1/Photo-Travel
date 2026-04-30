import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Dao } from '../domain/dao.js';

const Query = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export interface TripsRouteDeps {
  dao: Dao;
}

export const tripsRoutes: FastifyPluginAsync<TripsRouteDeps> = async (app, { dao }) => {
  app.get(
    '/me/trips',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const parsed = Query.safeParse(req.query);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_query' });
      }
      const userId = req.user.sub;
      const trips = await dao.listTrips(userId, parsed.data.limit);
      return { trips };
    }
  );
};
