import type { FastifyPluginAsync } from 'fastify';
import type { Dao } from '../domain/dao.js';

export interface RankingRouteDeps {
  dao: Dao;
}

export const rankingRoutes: FastifyPluginAsync<RankingRouteDeps> = async (app, { dao }) => {
  app.get(
    '/ranking/friends',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const ranking = await dao.rankFriendsByVisitCount(userId);
      return { ranking };
    }
  );
};
