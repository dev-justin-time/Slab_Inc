/**
 * Central Bus Message Schemas
 * All inter-plugin communication goes through these typed messages.
 * Source of truth → also generates Pydantic models for Python side.
 */

import { z } from "zod";

// ─────────────────────────────────────────────
// Base
// ─────────────────────────────────────────────

export const UUIDSchema = z.string().uuid();
export const ISODateTimeSchema = z.string().datetime();

export const IntentSchema = z.object({
  id: UUIDSchema,
  type: z.string().min(1),                    // e.g. "cabinet.place"
  projectId: UUIDSchema,
  userId: UUIDSchema,
  payload: z.unknown(),
  entitlementToken: z.string().min(1),
  correlationId: UUIDSchema.optional(),
  timestamp: ISODateTimeSchema,
  modelHint: z.enum(["flagship", "default", "fast", "vision", "long-context"]).optional(),
});

export type Intent = z.infer<typeof IntentSchema>;

export const ResultSchema = z.object({
  intentId: UUIDSchema,
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      retryable: z.boolean().default(false),
    })
    .optional(),
  metrics: z
    .object({
      durationMs: z.number(),
      computeClass: z.string(),
      modelUsed: z.string().optional(),
      tokensIn: z.number().optional(),
      tokensOut: z.number().optional(),
    })
    .optional(),
});

export type Result = z.infer<typeof ResultSchema>;

// ─────────────────────────────────────────────
// Skill Manifest Schema (used by registry)
// ─────────────────────────────────────────────

export const SkillModelConfigSchema = z.object({
  preferred: z.enum(["flagship", "default", "fast", "vision", "long-context"]),
  fallback: z.array(z.enum(["flagship", "default", "fast", "vision", "long-context"])).default([]),
  minCapability: z.enum(["tool-calling", "structured-output", "vision", "reasoning"]).optional(),
  temperature: z.number().min(0).max(2).default(0.1),
  maxTokens: z.number().int().positive().default(4096),
  structuredOutput: z.boolean().default(true),
});

export const SkillManifestSchema = z.object({
  id: z.string().min(1),
  version: z.string().default("1.0.0"),
  plugin: z.string().min(1),
  title: z.string(),
  description: z.string().optional(),
  paywallTier: z.array(z.enum(["free", "designer", "pro", "manufacturing"])),
  computeClass: z.enum(["cpu", "gpu", "light"]),
  timeoutMs: z.number().int().positive().default(30000),
  resourceLimits: z
    .object({
      cpu: z.string().optional(),
      memory: z.string().optional(),
      gpu: z.number().int().min(0).optional(),
    })
    .optional(),
  inputSchema: z.record(z.unknown()).optional(),   // JSON Schema fragment
  outputSchema: z.record(z.unknown()).optional(),
  sideEffects: z
    .array(z.enum(["none", "mutates-project", "writes-file", "calls-external"]))
    .default(["none"]),
  mcp: z.boolean().default(true),
  model: SkillModelConfigSchema.optional(),
});

export type SkillManifest = z.infer<typeof SkillManifestSchema>;
export type SkillModelConfig = z.infer<typeof SkillModelConfigSchema>;

// ─────────────────────────────────────────────
// Common Domain Payloads (examples)
// ─────────────────────────────────────────────

export const PlaceCabinetPayloadSchema = z.object({
  roomId: UUIDSchema,
  type: z.enum(["base", "wall", "tall", "island", "specialty"]),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  rotationY: z.number().default(0),
  width: z.number().positive(),
  height: z.number().positive(),
  depth: z.number().positive(),
  constructionMethodId: z.enum(["32mm", "face-frame", "frameless", "custom"]).default("frameless"),
  catalogSku: z.string().optional(),
});

export const RenderFinalPayloadSchema = z.object({
  cameraId: UUIDSchema.optional(),
  quality: z.enum(["draft", "medium", "high", "final"]).default("high"),
  lightingScenario: z.enum(["day", "dusk", "night", "custom"]).default("day"),
  aiRestyle: z.boolean().default(false),
  includeGaussianContext: z.boolean().default(false),
});
