/**
 * Central Domain Models – Single Source of Truth
 * Every plugin MUST use these types. No local duplicates.
 * Generated / kept in sync with JSON Schema + Pydantic equivalents.
 */

export type UUID = string;
export type ISODateTime = string;

// ─────────────────────────────────────────────
// Core Project & Room
// ─────────────────────────────────────────────

export interface Project {
  id: UUID;
  name: string;
  ownerId: UUID;
  createdAt: ISODateTime;
  updatedAt: ISODateTime;
  version: number;
  rooms: Room[];
  metadata?: Record<string, unknown>;
}

export interface Room {
  id: UUID;
  projectId: UUID;
  name: string;
  walls: Wall[];
  openings: Opening[];
  cabinets: Cabinet[];
  floorMaterialId?: UUID;
  ceilingHeight: number; // mm
  origin: Vec3;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface Wall {
  id: UUID;
  roomId: UUID;
  type: "straight" | "angled" | "curved" | "cathedral" | "vaulted" | "peninsula";
  points: Vec3[];          // centerline or control points
  height: number;          // mm
  thickness: number;       // mm
  materialId?: UUID;
  openings: UUID[];        // Opening ids
}

export interface Opening {
  id: UUID;
  wallId: UUID;
  type: "door" | "window" | "pass-through" | "arch";
  position: number;        // distance along wall in mm
  width: number;
  height: number;
  sillHeight?: number;
}

// ─────────────────────────────────────────────
// Cabinetry
// ─────────────────────────────────────────────

export type ConstructionMethodId = "32mm" | "face-frame" | "frameless" | "custom";

export interface Cabinet {
  id: UUID;
  roomId: UUID;
  type: "base" | "wall" | "tall" | "island" | "specialty";
  position: Vec3;
  rotationY: number;       // degrees
  width: number;           // mm
  height: number;
  depth: number;
  constructionMethodId: ConstructionMethodId;
  materialSchedule: MaterialSchedule;
  hardware: HardwareInstance[];
  parts: Part[];
  catalogSku?: string;
  vendorId?: UUID;
  openState?: Record<string, boolean>; // door/drawer ids → open
}

export interface MaterialSchedule {
  carcass?: UUID;
  doors?: UUID;
  drawers?: UUID;
  edgeBanding?: UUID;
  back?: UUID;
  custom?: Record<string, UUID>;
}

export interface Part {
  id: UUID;
  cabinetId: UUID;
  name: string;
  materialId: UUID;
  width: number;
  height: number;
  thickness: number;
  grainDirection?: "length" | "width" | "none";
  operations: MachiningOperation[];
}

export interface MachiningOperation {
  type: "cut" | "drill" | "route" | "edge-band";
  params: Record<string, number | string>;
}

export interface HardwareInstance {
  id: UUID;
  hardwareId: UUID;        // catalog reference
  quantity: number;
  location?: string;
}

// ─────────────────────────────────────────────
// Materials & Catalog
// ─────────────────────────────────────────────

export interface Material {
  id: UUID;
  name: string;
  type: "panel" | "solid" | "laminate" | "veneer" | "edge" | "hardware";
  thickness?: number;
  textureUrl?: string;     // client-side heavy texture
  pbr?: {
    albedo?: string;
    normal?: string;
    roughness?: string;
    metalness?: string;
  };
  vendorId?: UUID;
  sku?: string;
}

// ─────────────────────────────────────────────
// Constraints, BOM, Quote
// ─────────────────────────────────────────────

export interface ConstraintViolation {
  id: UUID;
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  objectIds: UUID[];
  suggestedFixes?: SuggestedFix[];
}

export interface SuggestedFix {
  label: string;
  skillId: string;
  payload?: Record<string, unknown>;
}

export interface BOMItem {
  id: UUID;
  projectId: UUID;
  partId?: UUID;
  materialId: UUID;
  description: string;
  quantity: number;
  unit: "pcs" | "m2" | "lm" | "kg";
  wasteFactor?: number;
}

export interface QuoteLine {
  id: UUID;
  projectId: UUID;
  objectId: UUID;
  description: string;
  quantity: number;
  unitCost: number;
  unitRetail: number;
  marginPercent: number;
  vendorId?: UUID;
  leadTimeDays?: number;
}

// ─────────────────────────────────────────────
// Jobs & Assets
// ─────────────────────────────────────────────

export interface RenderJob {
  id: UUID;
  projectId: UUID;
  status: "queued" | "running" | "completed" | "failed";
  cameraId?: UUID;
  quality: "draft" | "medium" | "high" | "final";
  resultUrl?: string;
  creditsUsed?: number;
  createdAt: ISODateTime;
}

export interface NestJob {
  id: UUID;
  projectId: UUID;
  status: "queued" | "running" | "completed" | "failed";
  sheets: NestSheet[];
  totalWastePercent?: number;
}

export interface NestSheet {
  materialId: UUID;
  width: number;
  height: number;
  parts: { partId: UUID; x: number; y: number; rotation: number }[];
  yieldPercent: number;
}

export interface ScanAsset {
  id: UUID;
  projectId: UUID;
  source: "roomplan" | "polycam" | "video" | "laser";
  url: string;
  processedRoomId?: UUID;
  confidence?: number;
}
