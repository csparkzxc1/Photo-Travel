import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

export type Sql = ReturnType<typeof postgres>;
export type Db = ReturnType<typeof drizzle<typeof schema>>;

export function createDb(databaseUrl: string): { db: Db; sql: Sql } {
  const sql = postgres(databaseUrl, {
    max: 10,
    idle_timeout: 30,
    transform: postgres.camel,
  });
  const db = drizzle(sql, { schema });
  return { db, sql };
}

export { schema };
