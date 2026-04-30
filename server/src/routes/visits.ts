import type { FastifyPluginAsync } from 'fastify';
import type { Dao } from '../domain/dao.js';

export interface VisitsRouteDeps {
  dao: Dao;
}

export const visitsRoutes: FastifyPluginAsync<VisitsRouteDeps> = async (app, { dao }) => {
  app.get(
    '/me/visits',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const visits = await dao.listVisits(userId);
      return { visits };
    }
  );
};
