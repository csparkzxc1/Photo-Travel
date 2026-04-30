import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { Dao } from '../domain/dao.js';

const PhotoUpload = z.object({
  id: z.string().min(1).max(256),
  takenAt: z.string().datetime(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracyM: z.number().nonnegative().optional(),
  cloudUri: z.string().url().optional(),
});

const SyncBody = z.object({
  countryCode: z.string().length(2),
  photos: z.array(PhotoUpload).max(500),
});

export interface PhotosRouteDeps {
  dao: Dao;
}

export const photosRoutes: FastifyPluginAsync<PhotosRouteDeps> = async (app, { dao }) => {
  app.post(
    '/sync/photos',
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const parsed = SyncBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: 'invalid_body', issues: parsed.error.issues });
      }
      const { photos } = parsed.data;
      const userId = req.user.sub;

      const result = await dao.upsertPhotos(userId, photos);
      return {
        inserted: result.inserted,
        matched: result.matched,
        unmatched: result.photos.length - result.matched,
      };
    }
  );
};
