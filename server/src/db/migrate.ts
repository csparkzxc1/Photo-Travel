import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadConfig } from '../config.js';
import { createDb } from './client.js';

/**
 * Minimal migration runner: executes every `migrations/*.sql` file in
 * lexicographic order, idempotently (each file uses `CREATE TABLE IF NOT
 * EXISTS` etc.). Drizzle Kit can drive this in production; for now we keep
 * SQL hand-written so PostGIS-specific constructs aren't fighting the ORM.
 */
async function main() {
  const cfg = loadConfig();
  const { sql } = createDb(cfg.DATABASE_URL);

  const here = dirname(fileURLToPath(import.meta.url));
  const migrationsDir = join(here, '..', '..', 'migrations');
  const files = (await readdir(migrationsDir))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const content = await readFile(join(migrationsDir, file), 'utf-8');
    process.stdout.write(`▸ applying ${file}… `);
    await sql.unsafe(content);
    process.stdout.write('ok\n');
  }
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
