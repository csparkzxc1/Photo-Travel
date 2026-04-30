import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Dao } from '../domain/dao.js';

const AddBody = z.object({
  email: z.string().email(),
});

const RemoveParams = z.object({
  friendId: z.string().uuid(),
});

export interface FriendsRouteDeps {
  dao: Dao;
}

export const friendsRoutes: FastifyPluginAsync<FriendsRouteDeps> = async (app, { dao }) => {
  app.get(
    '/me/friends',
    { preHandler: [app.authenticate] },
    async (req) => {
      const userId = req.user.sub;
      const friends = await dao.listFriends(userId);
      return { friends };
    }
  );

  app.post(
    '/me/friends',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const parsed = AddBody.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: 'invalid_body' });
      const userId = req.user.sub;
      const friend = await dao.addFriendByEmail(userId, parsed.data.email);
      if (!friend) return reply.code(404).send({ error: 'user_not_found' });
      return reply.code(201).send({ friend });
    }
  );

  app.delete(
    '/me/friends/:friendId',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const parsed = RemoveParams.safeParse(req.params);
      if (!parsed.success) return reply.code(400).send({ error: 'invalid_params' });
      const ok = await dao.removeFriend(req.user.sub, parsed.data.friendId);
      if (!ok) return reply.code(404).send({ error: 'not_found' });
      return reply.code(204).send();
    }
  );
};
