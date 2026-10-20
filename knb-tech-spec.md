# Kitchen 3D Design Platform (KNB) – Full Technical Specification

**Requirements (listed and considered at every step of this document):**

1. Absolute best tech for each plugin module.
2. Best hosting solution to serve subscribers, including a self-hosted option to start.
3. Create each plugin one at a time, researching state-of-the-art features.
4. All plugins communicate via an agent system with built-in skills and logic for each concern.
5. Group each plugin’s files in that plugin’s folder domain.
6. File system for multi-plugin using central logic (not each having its unique logic).
7. Keep it simple but state-of-the-art with all known ability.
8. No one logic can break any other logic (isolation, contracts, fault isolation).
9. 3D canvas with all known architecture-related features, surpassing 20-20 Design and Cabinet Vision.
10. All features are plugin modules behind API paywall.
11. Compute performed on server for subscribers.
12. Only user credentials, profile, project files, heavy image textures, catalogs, PDF templates, PDF brochures and user passwords + the foundation 3D canvas HTML is client-side on their machine.

---

## Global Conventions Used in Every Step

### Message Schema Style (Zod + Pydantic dual source)
All bus messages are defined once in JSON Schema, then code-generated into Zod (TypeScript) and Pydantic (Python).

### Skill Manifest Shape (every plugin)
```json
{
  "id": "plugin.skill-name",
  "version": "1.0.0",
  "plugin": "plugin-folder-name",
  "title": "Human Readable Name",
  "description": "...",
  "paywallTier": ["free", "designer", "pro", "manufacturing"],
  "computeClass": "cpu" | "gpu" | "light",
  "timeoutMs": 30000,
  "resourceLimits": { "cpu": "500m", "memory": "512Mi", "gpu": 0 },
  "inputSchema": { "$ref": "#/definitions/..." },
  "outputSchema": { "$ref": "#/definitions/..." },
  "sideEffects": ["none" | "mutates-project" | "writes-file" | "calls-external"],
  "mcp": true,

  "model": {
    "preferred": "flagship" | "default" | "fast" | "vision" | "long-context",
    "fallback": ["default", "fast"],
    "minCapability": "tool-calling" | "structured-output" | "vision" | "reasoning",
    "temperature": 0.1,
    "maxTokens": 4096,
    "structuredOutput": true
  }
}
```

**Model field explanation**:
- `preferred`: Routing tier (see Model Routing Table below).
- `fallback`: Ordered list of tiers the router may use if the preferred model is unavailable or overloaded.
- `minCapability`: Hard requirement; router will never select a model that lacks this capability.
- `structuredOutput`: Forces JSON mode / constrained decoding against the skill’s outputSchema.

### Folder Skeleton Convention (every plugin)
```
/plugins/<plugin-name>/
├── manifest.json                 # Capability + skills list
├── skills/
│   ├── <skill-name>.skill.md     # Human + agent readable skill description
│   └── <skill-name>.ts           # or .py – thin skill implementation
├── logic/                        # Pure domain logic (no I/O)
├── api/                          # Thin FastAPI / Nest handlers (only talk to bus)
├── client/                       # Optional React components that register into central UI slots
├── schemas/                      # Local extensions to central models (if any)
├── tests/
└── README.md
```

### Central Models (defined once in /core/models)
Key entities that every plugin must use:
- Project, Room, Wall, Opening, Cabinet, Assembly, Part, Material, Finish, Hardware, ConstraintViolation, BOMItem, QuoteLine, RenderJob, NestJob, ScanAsset, User, Entitlement.

---

## Open-Source Model System (Self-Hosted / Private)

**No proprietary closed models (OpenAI, Anthropic, Google closed APIs).**  
All inference runs on open-weight models under vLLM / Ollama / TensorRT-LLM.

### Model Routing Table (exact)

| Tier            | Preferred Model(s)                          | Use Case                                      | Min VRAM (quantized) | License      |
|-----------------|---------------------------------------------|-----------------------------------------------|----------------------|--------------|
| **flagship**    | GLM-5.1  or  Qwen3.7-Max / Qwen3.6-Plus     | Complex multi-step agents, design judgment, high-stakes quoting, long-horizon planning | 40–80 GB+ (MoE)     | MIT / Apache |
| **default**     | Qwen3 / Qwen3.6 32B–80B class (or MoE)      | Majority of production skills (layout, config, BOM reasoning, constraints) | 24–48 GB            | Apache 2.0   |
| **fast**        | Qwen3 8B–14B  or  Gemma 4 27B               | High-volume / simple skills (catalog ranking, status, quick validation) | 8–16 GB             | Apache 2.0   |
| **vision**      | Qwen3-VL series  or  Llama 4 Maverick       | Render inspection, scan analysis, screenshot geometry checks, photoreal restyle prompts | 24–48 GB            | Apache / Meta |
| **long-context**| Llama 4 Scout / Maverick  or high-context Qwen/GLM | Full project + large manufacturer catalogs in one context | 40 GB+              | Meta / Apache |

**Router logic (inside `/core/agent/orchestrator.ts`)**:
1. Read skill.manifest.model.preferred
2. Check current load & health of that tier
3. If unavailable → walk skill.manifest.model.fallback
4. Enforce skill.manifest.model.minCapability
5. Force structured output against the skill’s outputSchema
6. Log model choice + latency + token usage to OpenTelemetry / Langfuse

### Recommended Serving Commands (Self-Hosted Bootstrap)

```bash
# 1. Flagship / Default tier (example with vLLM)
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen3-32B-Instruct \
  --quantization awq \
  --max-model-len 32768 \
  --gpu-memory-utilization 0.92 \
  --port 8001 \
  --served-model-name default

# 2. Fast tier
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen3-8B-Instruct \
  --quantization awq \
  --max-model-len 16384 \
  --port 8002 \
  --served-model-name fast

# 3. Vision tier
python -m vllm.entrypoints.openai.api_server \
  --model Qwen/Qwen3-VL-30B \
  --quantization awq \
  --max-model-len 16384 \
  --port 8003 \
  --served-model-name vision

# 4. Optional Ollama fallback for very small skills / offline
ollama serve
ollama pull qwen3:8b
```

**LiteLLM or custom gateway** sits in front so the rest of the platform always talks to a single OpenAI-compatible endpoint:

```yaml
# litellm_config.yaml (example)
model_list:
  - model_name: flagship
    litellm_params:
      model: openai/default          # points to local vLLM
      api_base: http://vllm-flagship:8001/v1
  - model_name: default
    litellm_params:
      model: openai/default
      api_base: http://vllm-default:8001/v1
  - model_name: fast
    litellm_params:
      model: openai/fast
      api_base: http://vllm-fast:8002/v1
  - model_name: vision
    litellm_params:
      model: openai/vision
      api_base: http://vllm-vision:8003/v1
```

### Skill Manifest – Model Selection Example

```json
{
  "id": "ai-design-assistant.suggest-layout",
  "model": {
    "preferred": "flagship",
    "fallback": ["default"],
    "minCapability": "tool-calling",
    "temperature": 0.3,
    "maxTokens": 8192,
    "structuredOutput": true
  }
}
```

```json
{
  "id": "catalog-intelligence.search",
  "model": {
    "preferred": "fast",
    "fallback": ["default"],
    "minCapability": "structured-output",
    "temperature": 0.0,
    "maxTokens": 1024,
    "structuredOutput": true
  }
}
```

```json
{
  "id": "rendering.ai-restyle-preserve-geometry",
  "model": {
    "preferred": "vision",
    "fallback": ["flagship"],
    "minCapability": "vision",
    "temperature": 0.4,
    "maxTokens": 4096,
    "structuredOutput": true
  }
}
```

### Integration Points in Core

- `/core/agent/model-router.ts` – implements the routing table and health checks
- `/core/agent/orchestrator.ts` – calls the router before every skill execution
- Entitlement gate still runs first (paywall is independent of which open-weight model is chosen)
- All token usage, latency, and model ID are recorded in the observability stack

This keeps the entire platform fully self-hostable, open-weight only, and consistent with the isolation and central-logic requirements.

---

# STEP 0 – Core Scaffolding

## Goal
Unbreakable shared foundation. No plugin may exist without it.

## Folder Structure
```
/core
├── package.json
├── tsconfig.json
├── src/
│   ├── agent/
│   │   ├── orchestrator.ts          # Mastra-based
│   │   ├── skill-runner.ts
│   │   └── entitlement-gate.ts
│   ├── bus/
│   │   ├── nats-client.ts
│   │   ├── schemas.ts               # Zod
│   │   └── types.ts
│   ├── models/
│   │   ├── project.ts
│   │   ├── room.ts
│   │   ├── cabinet.ts
│   │   ├── material.ts
│   │   ├── bom.ts
│   │   ├── quote.ts
│   │   └── index.ts
│   ├── registry/
│   │   ├── plugin-registry.ts
│   │   └── manifest-loader.ts
│   ├── auth/
│   │   ├── keycloak.ts
│   │   └── entitlement.ts
│   ├── persistence/
│   │   ├── postgres.ts
│   │   └── minio.ts
│   └── observability/
│       ├── otel.ts
│       └── langfuse.ts
├── python/                          # LangGraph side
│   ├── agent_graphs/
│   └── requirements.txt
└── docker-compose.yml               # Self-host starter
```

## Key Message Schemas (excerpt)

```typescript
// bus/schemas.ts
export const IntentSchema = z.object({
  id: z.string().uuid(),
  type: z.string(),                  // e.g. "cabinet.place"
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  payload: z.unknown(),
  entitlementToken: z.string(),
  correlationId: z.string().uuid().optional(),
  timestamp: z.string().datetime()
});

export const ResultSchema = z.object({
  intentId: z.string().uuid(),
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    retryable: z.boolean()
  }).optional(),
  metrics: z.object({
    durationMs: z.number(),
    computeClass: z.string()
  }).optional()
});
```

## Agent Orchestrator Logic
1. Receive Intent.
2. Validate entitlement token against skill’s paywallTier.
3. Look up skill in registry.
4. Enforce resource limits & timeout.
5. Dispatch to skill runner (process isolation).
6. Publish Result on bus.
7. Emit OpenTelemetry span + Langfuse trace.

## Why Best
Mastra (TS) + LangGraph (Python) is the 2026 production-grade combination for typed multi-agent systems with MCP support. NATS JetStream gives durable, ordered messaging with exactly-once semantics when needed.

---

# STEP 1 – Canvas-3D Foundation Plugin

## Folder
```
/plugins/canvas-3d/
├── manifest.json
├── skills/
│   ├── load-project.skill.md
│   ├── update-camera.skill.md
│   └── ...
├── client/
│   ├── CanvasRoot.tsx               # Three.js + R3F entry
│   ├── Scene.tsx
│   ├── CameraControls.tsx
│   ├── SelectionManager.tsx
│   └── ui-slots.ts                  # Registers into central UI
├── logic/
│   └── geometry-helpers.ts
└── schemas/
    └── view-state.ts
```

## manifest.json (excerpt)
```json
{
  "id": "canvas-3d",
  "version": "1.0.0",
  "title": "3D Canvas Foundation",
  "paywallTier": ["free"],
  "skills": [
    {
      "id": "canvas.load-project",
      "computeClass": "light",
      "inputSchema": { "projectId": "uuid" },
      "outputSchema": { "sceneGraph": "object" }
    }
  ],
  "clientEntry": "./client/CanvasRoot.tsx"
}
```

## Client Tech Stack (Best Choice)
- Three.js r182+ with WebGPURenderer (primary) + WebGL2 fallback
- React Three Fiber v9 + Drei
- TSL (Three Shading Language) for materials
- Zustand + Immer for view state
- three-bvh-csg / manifold for client-side CSG previews only

## Key Client Responsibilities (only these stay client-side)
- Render the foundation HTML canvas
- Local camera, selection, simple transforms
- Display of central models
- Caching of heavy textures & catalogs
- User credentials / profile / project files / PDF templates

All heavy geometry, final CSG, constraint solving, rendering stay server-side.

## Why Best
Largest ecosystem, best WebGPU support, smallest bundle for a professional architectural tool in 2026. Keeps the foundation exactly client-side as required.

---

# STEP 2 – Room-Capture Plugin

## Folder
```
/plugins/room-capture/
├── manifest.json
├── skills/
│   ├── ingest-lidar-scan.skill.md
│   ├── convert-to-parametric-room.skill.md
│   ├── align-laser-points.skill.md
│   └── detect-existing-fixtures.skill.md
├── logic/
│   ├── mesh-cleaner.py
│   ├── wall-detector.py
│   └── parametric-converter.py
├── api/
│   └── upload.ts
└── client/
    └── ScanUploader.tsx
```

## Key Skill: ingest-lidar-scan
```json
{
  "id": "room-capture.ingest-lidar-scan",
  "paywallTier": ["designer", "pro", "manufacturing"],
  "computeClass": "gpu",
  "timeoutMs": 120000,
  "inputSchema": {
    "type": "object",
    "properties": {
      "projectId": { "type": "string", "format": "uuid" },
      "scanAssetId": { "type": "string", "format": "uuid" },
      "source": { "enum": ["roomplan", "polycam", "video", "laser"] },
      "laserGroundTruth": {
        "type": "array",
        "items": { "type": "object", "properties": { "point": "vec3", "label": "string" } }
      }
    }
  },
  "outputSchema": {
    "type": "object",
    "properties": {
      "roomId": { "type": "string", "format": "uuid" },
      "walls": { "type": "array" },
      "openings": { "type": "array" },
      "confidence": { "type": "number" }
    }
  }
}
```

## Processing Pipeline (Server)
1. Receive scan package (USDZ / PLY / video).
2. Clean mesh / point cloud.
3. Semantic segmentation (walls, floor, ceiling, openings).
4. Fit parametric walls (straight + curved).
5. Align with optional laser points (±1–2 mm critical dimensions).
6. Publish parametric Room model on the bus.
7. Optional Gaussian Splat generation for context overlay.

## Why Best
Apple RoomPlan + LiDAR currently delivers the highest practical indoor accuracy with automatic semantics. Server-side conversion keeps heavy work behind the paywall and produces a clean central Room model.

---

# STEP 3 – Space-Planning & Walls Plugin

## Folder
```
/plugins/space-planning/
├── manifest.json
├── skills/
│   ├── draw-wall.skill.md
│   ├── add-opening.skill.md
│   ├── auto-fill-cabinets.skill.md
│   └── validate-clearances.skill.md
├── logic/
│   └── wall-geometry.ts
└── client/
    └── WallTools.tsx
```

## Core Skill Example
```json
{
  "id": "space-planning.draw-wall",
  "paywallTier": ["free", "designer", "pro", "manufacturing"],
  "computeClass": "light",
  "inputSchema": {
    "projectId": "uuid",
    "roomId": "uuid",
    "points": [{ "x": "number", "y": "number", "z": "number" }],
    "height": "number",
    "thickness": "number",
    "type": { "enum": ["straight", "angled", "curved", "cathedral", "vaulted", "peninsula"] }
  },
  "outputSchema": {
    "wallId": "uuid",
    "updatedRoom": "Room"
  }
}
```

## Why Best
Builds directly on the parametric Room from Room-Capture. All geometry lives in central models so later plugins (cabinetry, constraints, CNC) see the same truth.

---

# STEP 4 – Cabinetry Parametric Engine

## Folder
```
/plugins/cabinetry-parametric/
├── manifest.json
├── skills/
│   ├── place-base-cabinet.skill.md
│   ├── apply-construction-method.skill.md
│   ├── modify-joinery.skill.md
│   └── validate-cabinet-rules.skill.md
├── logic/
│   ├── assembly-builder.ts
│   ├── construction-methods.ts
│   └── part-generator.ts
└── client/
    └── CabinetLibrary.tsx
```

## Construction Method Model (Central)
```typescript
interface ConstructionMethod {
  id: string;
  name: "32mm" | "face-frame" | "frameless" | "custom";
  joineryRules: JoineryRule[];      // per edge
  materialSchedule: MaterialSchedule;
  hardwareRules: HardwareRule[];
}
```

## Key Skill
```json
{
  "id": "cabinetry.apply-construction-method",
  "paywallTier": ["pro", "manufacturing"],
  "computeClass": "cpu",
  "inputSchema": {
    "cabinetId": "uuid",
    "methodId": "string",
    "overrides": { "type": "object" }
  },
  "outputSchema": {
    "cabinet": "Cabinet",
    "parts": "Part[]",
    "violations": "ConstraintViolation[]"
  }
}
```

## Why Best
True per-assembly, per-edge parametric control exceeds Cabinet Vision 2025. Because parts are generated into the central model, BOM and CNC later see exact manufacturing data with zero translation loss.

---

# STEP 5 – Catalog Intelligence + Vendor Hub

## Folders
```
/plugins/catalog-intelligence/
/plugins/vendor-hub/
```

## Key Skills
- `catalog.search`
- `catalog.configure-product`
- `vendor.fetch-live-price`
- `vendor.create-purchase-order`
- `vendor.check-stock`

## Live Price Message
```typescript
const LivePriceResult = z.object({
  sku: z.string(),
  cost: z.number(),
  retail: z.number(),
  currency: z.string(),
  leadTimeDays: z.number(),
  availability: z.enum(["in-stock", "limited", "out-of-stock", "special-order"]),
  vendorId: z.string(),
  fetchedAt: z.string().datetime()
});
```

## Why Best
Real-time vendor APIs + preferred-vendor rules protect margins and turn the design into an automatic procurement system.

---

# STEP 6 – Constraint & Rules Engine

## Folder
```
/plugins/constraint-rules/
├── skills/
│   ├── validate-all.skill.md
│   ├── override-constraint.skill.md
│   └── suggest-fix.skill.md
└── logic/
    └── rule-engine.ts
```

## ConstraintViolation (Central Model)
```typescript
interface ConstraintViolation {
  id: string;
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  objectIds: string[];
  suggestedFixes: SuggestedFix[];
}
```

## Why Best
Central rules run on every change via the bus. Invalid designs never reach BOM or CNC.

---

# STEP 7 – Photoreal Rendering System

## Folder
```
/plugins/rendering-photoreal/
├── skills/
│   ├── render-preview.skill.md
│   ├── render-final-pathtraced.skill.md
│   ├── generate-360.skill.md
│   └── ai-restyle-preserve-geometry.skill.md
├── logic/
│   ├── path-tracer.py
│   ├── gaussian-context.py
│   └── ai-enhancer.py
└── client/
    └── RenderDialog.tsx
```

## Final Render Skill
```json
{
  "id": "rendering.render-final-pathtraced",
  "paywallTier": ["designer", "pro", "manufacturing"],
  "computeClass": "gpu",
  "timeoutMs": 300000,
  "inputSchema": {
    "projectId": "uuid",
    "cameraId": "uuid",
    "quality": { "enum": ["draft", "medium", "high", "final"] },
    "lightingScenario": { "enum": ["day", "dusk", "night", "custom"] },
    "aiRestyle": { "type": "boolean" },
    "includeGaussianContext": { "type": "boolean" }
  },
  "outputSchema": {
    "jobId": "uuid",
    "previewUrl": "string",
    "finalUrl": "string",
    "creditsUsed": "number"
  }
}
```

## Pipeline (Best 2026 Hybrid)
1. Real-time client WebGPU preview (free).
2. Server path-traced beauty pass (OptiX / Cycles / custom).
3. AI denoising + optional geometry-preserving restyle.
4. Optional Gaussian Splat context layer.
5. Progressive streaming of results back to client.

## Why Best
Combines control of traditional path tracing, speed of WebGPU, convenience of modern AI enhancement, and realism of Gaussian Splatting. All heavy work is credit-metered and server-side.

---

# STEP 8 – BOM / Cutlist / Nesting

## Folder
```
/plugins/bom-cutlist-nesting/
├── skills/
│   ├── generate-bom.skill.md
│   ├── nest-panels.skill.md
│   └── export-cutlist.skill.md
└── logic/
    └── nest-optimizer.py
```

## Nest Result Schema
```typescript
const NestResult = z.object({
  sheets: z.array(z.object({
    materialId: z.string(),
    width: z.number(),
    height: z.number(),
    parts: z.array(z.object({
      partId: z.string(),
      x: z.number(),
      y: z.number(),
      rotation: z.number()
    })),
    yieldPercent: z.number()
  })),
  totalWastePercent: z.number(),
  creditsUsed: z.number()
});
```

## Why Best
Nesting already knows construction methods and grain direction from the parametric model → higher yield than post-hoc optimizers.

---

# STEP 9 – CNC Manufacturing

## Folder
```
/plugins/cnc-manufacturing/
├── skills/
│   ├── generate-nest.skill.md
│   ├── export-gcode.skill.md
│   ├── simulate-toolpath.skill.md
│   └── report-shop-floor-status.skill.md
├── logic/
│   ├── post-processors/          # 175+ machines
│   ├── toolpath-generator.py
│   └── simulator.py
└── client/
    └── ShopFloorPanel.tsx
```

## G-code Export Skill
```json
{
  "id": "cnc.export-gcode",
  "paywallTier": ["manufacturing"],
  "computeClass": "cpu",
  "inputSchema": {
    "nestJobId": "uuid",
    "machineProfileId": "string",
    "options": { "type": "object" }
  },
  "outputSchema": {
    "files": [{ "name": "string", "url": "string", "checksum": "string" }],
    "labels": [{ "partId": "string", "qrPayload": "string" }]
  }
}
```

## Why Best
Design model already contains full manufacturing intelligence. Dynamic toolpaths + paperless shop-floor loop + simulation close the loop that competitors still treat as separate systems.

---

# STEP 10 – Quoting, Pricing & Procurement

## Folder
```
/plugins/quoting-pricing/
├── skills/
│   ├── generate-quote.skill.md
│   ├── apply-pricing-tier.skill.md
│   ├── collect-deposit.skill.md
│   └── create-purchase-orders.skill.md
└── logic/
    └── pricing-engine.ts
```

## QuoteLine (Central)
```typescript
interface QuoteLine {
  id: string;
  objectId: string;          // cabinet, countertop, etc.
  description: string;
  quantity: number;
  unitCost: number;
  unitRetail: number;
  marginPercent: number;
  vendorId?: string;
  leadTimeDays?: number;
}
```

## Why Best
Live vendor data + design intelligence produces accurate, margin-protected quotes in seconds and can automatically generate POs.

---

# STEP 11 – AI Design Assistant

## Folder
```
/plugins/ai-design-assistant/
├── skills/
│   ├── suggest-layout.skill.md
│   ├── restyle-kitchen.skill.md
│   ├── recommend-products.skill.md
│   └── explain-constraint.skill.md
└── logic/
    └── agent-tools.ts               # MCP tools that operate on central models
```

## Why Best
Natural language operates on the real parametric model (not just images). All suggestions become real, editable objects in the central model.

---

# STEP 12 – Collaboration, Client Portal, PDF Brochure

## Folders
```
/plugins/collaboration/
/plugins/client-portal/
/plugins/pdf-brochure/
```

## Key Capabilities
- Real-time presence + CRDT comments (collaboration)
- Shareable link with photoreal + VR + approval workflow + deposit collection (client-portal)
- High-resolution branded PDF generation from templates (pdf-brochure) – templates stay client-side, final render is server-side

## Why Best
Turns the design tool into a complete sales and approval system while still obeying the client/server split.

---

## Cross-Cutting Technical Guarantees

1. **No Cross-Plugin Imports** – enforced by package boundaries and lint rules.
2. **Typed Contracts** – every skill has input/output schemas; invalid messages are rejected at the bus.
3. **Process Isolation** – each skill runs in its own container/process with resource limits.
4. **Entitlement Gate** – every intent is checked before execution.
5. **Observability** – every skill emits traces; failures are visible without crashing the system.
6. **Self-Host Path** – entire stack runs under Docker Compose with optional GPU nodes.

---

## Immediate Implementation Order (Recap)

1. Core scaffolding (models, bus, agent, auth, persistence)
2. Canvas-3D foundation (client)
3. Room-Capture
4. Space-Planning
5. Cabinetry-Parametric
6. Catalog + Vendor Hub
7. Constraint-Rules
8. Rendering-Photoreal
9. BOM / Nesting
10. CNC Manufacturing
11. Quoting
12. AI Assistant + Collaboration + Client Portal + PDF

This document is the single source of truth for technical implementation. Every subsequent code commit must map to one of the skills or central components defined above.
