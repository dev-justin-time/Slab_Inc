/**
 * Postgres Persistence Adapter
 * Stores projects, users, entitlements, job metadata.
 * Uses parameterized queries only – no string concatenation.
 */

import type {
  Project,
  Room,
  Cabinet,
  BOMItem,
  QuoteLine,
  RenderJob,
  NestJob,
  ScanAsset,
  UUID,
} from "../models";

export interface PostgresConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

/**
 * Minimal interface so we can swap the real pg client later.
 * In production inject a pooled `pg.Pool`.
 */
export interface Queryable {
  query<T = unknown>(text: string, params?: unknown[]): Promise<{ rows: T[]; rowCount: number }>;
}

export class PostgresStore {
  constructor(private db: Queryable) {}

  // ── Projects ──────────────────────────────────────────────

  async getProject(id: UUID): Promise<Project | null> {
    const { rows } = await this.db.query<Project>(
      `SELECT id, name, owner_id as "ownerId", created_at as "createdAt",
              updated_at as "updatedAt", version, metadata
       FROM projects WHERE id = $1`,
      [id]
    );
    if (!rows[0]) return null;

    const project = rows[0];
    project.rooms = await this.getRoomsForProject(id);
    return project;
  }

  async saveProject(project: Project): Promise<void> {
    await this.db.query(
      `INSERT INTO projects (id, name, owner_id, created_at, updated_at, version, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         updated_at = EXCLUDED.updated_at,
         version = EXCLUDED.version,
         metadata = EXCLUDED.metadata`,
      [
        project.id,
        project.name,
        project.ownerId,
        project.createdAt,
        project.updatedAt,
        project.version,
        JSON.stringify(project.metadata ?? {}),
      ]
    );
  }

  // ── Rooms ─────────────────────────────────────────────────

  async getRoomsForProject(projectId: UUID): Promise<Room[]> {
    const { rows } = await this.db.query<Room>(
      `SELECT id, project_id as "projectId", name, ceiling_height as "ceilingHeight",
              origin, floor_material_id as "floorMaterialId"
       FROM rooms WHERE project_id = $1`,
      [projectId]
    );
    // Walls, openings, cabinets are loaded on demand or via separate queries
    // to keep the initial payload light. Full hydration happens in the service layer.
    return rows.map((r) => ({
      ...r,
      walls: [],
      openings: [],
      cabinets: [],
    }));
  }

  async saveRoom(room: Room): Promise<void> {
    await this.db.query(
      `INSERT INTO rooms (id, project_id, name, ceiling_height, origin, floor_material_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         ceiling_height = EXCLUDED.ceiling_height,
         origin = EXCLUDED.origin,
         floor_material_id = EXCLUDED.floor_material_id`,
      [
        room.id,
        room.projectId,
        room.name,
        room.ceilingHeight,
        JSON.stringify(room.origin),
        room.floorMaterialId ?? null,
      ]
    );
  }

  // ── Cabinets ──────────────────────────────────────────────

  async saveCabinet(cabinet: Cabinet): Promise<void> {
    await this.db.query(
      `INSERT INTO cabinets (
         id, room_id, type, position, rotation_y, width, height, depth,
         construction_method_id, material_schedule, hardware, parts,
         catalog_sku, vendor_id, open_state
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
       ON CONFLICT (id) DO UPDATE SET
         position = EXCLUDED.position,
         rotation_y = EXCLUDED.rotation_y,
         width = EXCLUDED.width,
         height = EXCLUDED.height,
         depth = EXCLUDED.depth,
         construction_method_id = EXCLUDED.construction_method_id,
         material_schedule = EXCLUDED.material_schedule,
         hardware = EXCLUDED.hardware,
         parts = EXCLUDED.parts,
         open_state = EXCLUDED.open_state`,
      [
        cabinet.id,
        cabinet.roomId,
        cabinet.type,
        JSON.stringify(cabinet.position),
        cabinet.rotationY,
        cabinet.width,
        cabinet.height,
        cabinet.depth,
        cabinet.constructionMethodId,
        JSON.stringify(cabinet.materialSchedule),
        JSON.stringify(cabinet.hardware),
        JSON.stringify(cabinet.parts),
        cabinet.catalogSku ?? null,
        cabinet.vendorId ?? null,
        JSON.stringify(cabinet.openState ?? {}),
      ]
    );
  }

  async getCabinetsForRoom(roomId: UUID): Promise<Cabinet[]> {
    const { rows } = await this.db.query<any>(
      `SELECT * FROM cabinets WHERE room_id = $1`,
      [roomId]
    );
    return rows.map((r) => ({
      id: r.id,
      roomId: r.room_id,
      type: r.type,
      position: typeof r.position === "string" ? JSON.parse(r.position) : r.position,
      rotationY: r.rotation_y,
      width: r.width,
      height: r.height,
      depth: r.depth,
      constructionMethodId: r.construction_method_id,
      materialSchedule: typeof r.material_schedule === "string" ? JSON.parse(r.material_schedule) : r.material_schedule,
      hardware: typeof r.hardware === "string" ? JSON.parse(r.hardware) : r.hardware,
      parts: typeof r.parts === "string" ? JSON.parse(r.parts) : r.parts,
      catalogSku: r.catalog_sku,
      vendorId: r.vendor_id,
      openState: typeof r.open_state === "string" ? JSON.parse(r.open_state) : r.open_state,
    }));
  }

  // ── Jobs ──────────────────────────────────────────────────

  async saveRenderJob(job: RenderJob): Promise<void> {
    await this.db.query(
      `INSERT INTO render_jobs (id, project_id, status, camera_id, quality, result_url, credits_used, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         result_url = EXCLUDED.result_url,
         credits_used = EXCLUDED.credits_used`,
      [
        job.id,
        job.projectId,
        job.status,
        job.cameraId ?? null,
        job.quality,
        job.resultUrl ?? null,
        job.creditsUsed ?? null,
        job.createdAt,
      ]
    );
  }

  async saveScanAsset(asset: ScanAsset): Promise<void> {
    await this.db.query(
      `INSERT INTO scan_assets (id, project_id, source, url, processed_room_id, confidence)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (id) DO UPDATE SET
         processed_room_id = EXCLUDED.processed_room_id,
         confidence = EXCLUDED.confidence`,
      [
        asset.id,
        asset.projectId,
        asset.source,
        asset.url,
        asset.processedRoomId ?? null,
        asset.confidence ?? null,
      ]
    );
  }
}

/** SQL schema bootstrap – run once on first deploy */
export const POSTGRES_SCHEMA = `
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  version INT NOT NULL DEFAULT 1,
  metadata JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  ceiling_height REAL NOT NULL,
  origin JSONB NOT NULL,
  floor_material_id UUID
);

CREATE TABLE IF NOT EXISTS cabinets (
  id UUID PRIMARY KEY,
  room_id UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  position JSONB NOT NULL,
  rotation_y REAL NOT NULL DEFAULT 0,
  width REAL NOT NULL,
  height REAL NOT NULL,
  depth REAL NOT NULL,
  construction_method_id TEXT NOT NULL,
  material_schedule JSONB NOT NULL DEFAULT '{}',
  hardware JSONB NOT NULL DEFAULT '[]',
  parts JSONB NOT NULL DEFAULT '[]',
  catalog_sku TEXT,
  vendor_id UUID,
  open_state JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS render_jobs (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  camera_id UUID,
  quality TEXT NOT NULL,
  result_url TEXT,
  credits_used REAL,
  created_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_assets (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source TEXT NOT NULL,
  url TEXT NOT NULL,
  processed_room_id UUID,
  confidence REAL
);

CREATE INDEX IF NOT EXISTS idx_rooms_project ON rooms(project_id);
CREATE INDEX IF NOT EXISTS idx_cabinets_room ON cabinets(room_id);
CREATE INDEX IF NOT EXISTS idx_render_jobs_project ON render_jobs(project_id);
`;
