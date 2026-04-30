import { buildApp } from './app.js';
import { loadConfig } from './config.js';
import { createDb } from './db/client.js';
import { createPgDao } from './infra/pgDao.js';

async function main() {
  const cfg = loadConfig();
  const { db, sql } = createDb(cfg.DATABASE_URL);
  const dao = createPgDao(db);

  const app = await buildApp({
    dao,
    jwtSecret: cfg.JWT_SECRET,
    logLevel: cfg.LOG_LEVEL,
  });

  const shutdown = async () => {
    await app.close();
    await sql.end({ timeout: 5 });
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  await app.listen({ host: cfg.HOST, port: cfg.PORT });
  app.log.info(`Photo Travel API listening on ${cfg.HOST}:${cfg.PORT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
