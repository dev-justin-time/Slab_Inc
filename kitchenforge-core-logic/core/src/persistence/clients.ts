/**
 * Real Postgres + MinIO client wiring
 * Uses environment variables so the same code works in Docker and local dev.
 */

import pg from "pg";
import * as Minio from "minio";
import { PostgresStore, POSTGRES_SCHEMA } from "./postgres";
import { MinioStore } from "./minio";

const { Pool } = pg;

// ── Environment ─────────────────────────────────────────────

export interface PersistenceEnv {
  // Postgres
  PG_HOST: string;
  PG_PORT: number;
  PG_DATABASE: string;
  PG_USER: string;
  PG_PASSWORD: string;
  PG_SSL?: boolean;

  // MinIO
  MINIO_ENDPOINT: string;
  MINIO_PORT: number;
  MINIO_USE_SSL: boolean;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  MINIO_BUCKET: string;
}

export function loadPersistenceEnv(): PersistenceEnv {
  return {
    PG_HOST: process.env.PG_HOST ?? "localhost",
    PG_PORT: Number(process.env.PG_PORT ?? 5432),
    PG_DATABASE: process.env.PG_DATABASE ?? "knb",
    PG_USER: process.env.PG_USER ?? "knb",
    PG_PASSWORD: process.env.PG_PASSWORD ?? "knb_dev_password",
    PG_SSL: process.env.PG_SSL === "true",

    MINIO_ENDPOINT: process.env.MINIO_ENDPOINT ?? "localhost",
    MINIO_PORT: Number(process.env.MINIO_PORT ?? 9000),
    MINIO_USE_SSL: process.env.MINIO_USE_SSL === "true",
    MINIO_ACCESS_KEY: process.env.MINIO_ACCESS_KEY ?? "knbminio",
    MINIO_SECRET_KEY: process.env.MINIO_SECRET_KEY ?? "knbminio_secret",
    MINIO_BUCKET: process.env.MINIO_BUCKET ?? "knb",
  };
}

// ── Postgres ────────────────────────────────────────────────

export function createPgPool(env: PersistenceEnv = loadPersistenceEnv()) {
  const pool = new Pool({
    host: env.PG_HOST,
    port: env.PG_PORT,
    database: env.PG_DATABASE,
    user: env.PG_USER,
    password: env.PG_PASSWORD,
    ssl: env.PG_SSL ? { rejectUnauthorized: false } : undefined,
    max: 20,
    idleTimeoutMillis: 30_000,
  });
  return pool;
}

export async function applySchema(pool: pg.Pool): Promise<void> {
  await pool.query(POSTGRES_SCHEMA);
  console.log("[postgres] schema applied");
}

export function createPostgresStore(pool: pg.Pool) {
  return new PostgresStore({
    query: (text, params) => pool.query(text, params),
  });
}

// ── MinIO ───────────────────────────────────────────────────

export function createMinioClient(env: PersistenceEnv = loadPersistenceEnv()) {
  return new Minio.Client({
    endPoint: env.MINIO_ENDPOINT,
    port: env.MINIO_PORT,
    useSSL: env.MINIO_USE_SSL,
    accessKey: env.MINIO_ACCESS_KEY,
    secretKey: env.MINIO_SECRET_KEY,
  });
}

export async function ensureBucket(
  client: Minio.Client,
  bucket: string
): Promise<void> {
  const exists = await client.bucketExists(bucket);
  if (!exists) {
    await client.makeBucket(bucket, "us-east-1");
    console.log(`[minio] created bucket: ${bucket}`);
  } else {
    console.log(`[minio] bucket ready: ${bucket}`);
  }
}

export function createMinioStore(
  client: Minio.Client,
  bucket: string
): MinioStore {
  return new MinioStore(client as any, bucket);
}

// ── Bootstrap helper ────────────────────────────────────────

export async function bootstrapPersistence() {
  const env = loadPersistenceEnv();

  const pool = createPgPool(env);
  await applySchema(pool);
  const postgres = createPostgresStore(pool);

  const minioClient = createMinioClient(env);
  await ensureBucket(minioClient, env.MINIO_BUCKET);
  const minio = createMinioStore(minioClient, env.MINIO_BUCKET);

  return { pool, postgres, minioClient, minio, env };
}
