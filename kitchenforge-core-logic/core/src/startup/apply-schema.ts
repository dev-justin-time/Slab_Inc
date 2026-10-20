/**
 * One-shot schema application
 * Usage: npm run schema
 */

import { createPgPool, applySchema, loadPersistenceEnv } from "../persistence/clients";

async function main() {
  const env = loadPersistenceEnv();
  console.log(`[schema] connecting to ${env.PG_HOST}:${env.PG_PORT}/${env.PG_DATABASE}`);
  const pool = createPgPool(env);
  await applySchema(pool);
  await pool.end();
  console.log("[schema] done");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
