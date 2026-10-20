# Kitchen 3D Design Platform (KNB) – Detailed Plan of Action

**Requirements (listed and considered at every step of this plan):**

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

## 1. Guiding Principles (Applied to Every Build Step)

- **Central Logic Only**: All shared models, event bus, agent orchestration, auth, and persistence live in `/core`. Plugins never import each other.
- **Agent-Mediated Communication**: Plugins expose skills (MCP / Agent Plugins standard + SKILL.md). The central Agent Orchestrator is the only decision-maker.
- **Fault Isolation**: Each skill runs in its own process/container with resource limits, timeouts, and circuit breakers. Failure returns a typed error on the bus; other plugins continue.
- **Paywall at Skill Level**: Entitlement service issues short-lived tokens scoped to subscribed plugins/skills.
- **Client vs Server Split**: Foundation canvas HTML/JS + user data stay client-side. All heavy geometry processing, rendering, nesting, AI, and CNC run server-side.
- **Simplicity First**: Prefer boring, proven tech that is currently state-of-the-art rather than experimental stacks that increase risk.

---

## 2. High-Level File System & Architecture

```
/platform
├── /core                          # Central logic only – never duplicated
│   ├── /agent                     # Mastra (TS) + LangGraph (Python) orchestrator
│   ├── /bus                       # NATS or Redis Streams + typed contracts (Zod/Pydantic)
│   ├── /models                    # Shared domain models (Room, Wall, Cabinet, BOM, etc.)
│   ├── /registry                  # Plugin capability manifests
│   ├── /auth                      # Keycloak / Clerk + entitlement service
│   ├── /persistence               # Postgres + MinIO/S3 for projects & assets
│   └── /observability             # OpenTelemetry + Langfuse
├── /plugins
│   ├── /canvas-3d                 # Foundation (client + thin server)
│   ├── /room-capture              # LiDAR / photogrammetry
│   ├── /space-planning
│   ├── /cabinetry-parametric
│   ├── /catalog-intelligence
│   ├── /vendor-hub
│   ├── /constraint-rules
│   ├── /rendering-photoreal
│   ├── /bom-cutlist-nesting
│   ├── /cnc-manufacturing
│   ├── /quoting-pricing
│   ├── /ai-design-assistant
│   ├── /collaboration
│   ├── /client-portal
│   ├── /pdf-brochure
│   └── /...                       # Future domain plugins
├── /infra                         # Docker Compose, K8s manifests, self-host scripts
└── /docs
```

**Why this structure is best**: Domain isolation prevents cascade failures. Central models guarantee consistency. Agent bus is the single source of truth for inter-plugin communication (satisfies requirements 4, 5, 6, 8).

---

## 3. Hosting Strategy

### Phase 0 – Self-Hosted Start (Recommended Bootstrap)
- **Tech**: Docker Compose on Hetzner / DigitalOcean / own hardware.
- **Components**: Postgres, Redis, MinIO, NATS, Keycloak, GPU node (RTX 4090/5090 or A6000 via RunPod/Vast.ai if needed).
- **Why best**: Zero ongoing cloud cost while validating product-market fit. Full data residency. Easy one-command deploy for early subscribers who want on-prem.

### Phase 1 – Production Multi-Tenant
- **Edge / API**: Cloudflare Workers or Vercel.
- **Core Services**: Kubernetes (AKS/EKS) or Railway/Render for non-GPU.
- **GPU Compute**: Modal or RunPod serverless + always-on nodes for rendering/AI/CNC.
- **Storage**: S3 + Cloudflare R2.
- **Auth & Paywall**: Clerk or Keycloak + Stripe + entitlement service.
- **Why best**: Pay-per-use GPU keeps costs aligned with revenue. Self-hosted path remains available for enterprise. Scales horizontally without rewriting central logic.

---

## 4. Detailed Build Plan – Ordered Steps

### Step 0: Core Scaffolding (Week 1–2)
**Goal**: Unbreakable foundation that every plugin will use.

**Tech & Logic**:
- Language: TypeScript (Node 22+) for core + Mastra agents; Python 3.12 for heavy compute graphs (LangGraph).
- Event Bus: NATS JetStream (or Redis Streams) with Zod/Pydantic schemas for every message.
- Models: Shared TypeScript interfaces + Pydantic models generated from a single source of truth (JSON Schema).
- Registry: Simple JSON manifests that declare skills, inputs, outputs, compute class, paywall tier.
- Auth: Keycloak (self-hostable) or Clerk.
- Persistence: Postgres (projects, users, entitlements) + MinIO (blobs).
- Observability: OpenTelemetry + Langfuse.

**Manner of Use**:
1. Define central domain models (Room, Wall, Opening, Cabinet, Material, Constraint, BOMItem, QuoteLine…).
2. Implement typed bus publish/subscribe.
3. Build Agent Orchestrator that loads plugin manifests and routes intents.
4. Add circuit breakers and resource quotas per skill.

**Why Best Choice**:
- Mastra is currently the strongest TypeScript-native agent framework with MCP support.
- LangGraph provides durable, stateful workflows for long-running CNC/render jobs.
- NATS/Redis + schemas guarantee no plugin can send malformed data that breaks another.
- Self-hostable from day one.

---

### Step 1: Canvas-3D Foundation Plugin (Week 2–5)
**Folder**: `/plugins/canvas-3d`

**Goal**: Surpass 20-20 Design and Cabinet Vision in architectural kitchen features while remaining client-side for the foundation.

**Tech**:
- Client: Three.js (latest r182+), React Three Fiber, Drei, WebGPURenderer + TSL, Zustand + Immer.
- Geometry helpers: three-bvh-csg / manifold for solid operations.
- Export/Import: glTF, light IFC, DXF (server conversion for complex formats).

**Features (SOTA)**:
- Precise wall drawing (straight, angled, curved, cathedral, vaulted, peninsula, multi-room).
- Parametric intelligent cabinets (open doors/drawers live, change finishes/hardware).
- Real-time perspective / orthographic / elevation / section.
- Live constraint visualization (door swings, clearances).
- PBR materials, lighting (sun + fixtures), 360° panorama, WebXR.
- Gaussian Splatting support for real-room context overlays.
- Client-only: foundation HTML/JS, project files, textures, catalogs, PDFs, credentials.

**Manner of Use**:
- Client loads the canvas HTML once.
- All subsequent feature requests go through the agent bus as intents.
- Heavy operations (final solid modeling, complex CSG) are offloaded to server skills.

**Why Best Choice**:
- Three.js + R3F has the largest ecosystem and best WebGPU support for custom architectural tools in 2026.
- WebGPU + TSL gives near-native performance while staying browser-native.
- Keeps foundation client-side exactly as required; compute stays server-side.

---

### Step 2: Room-Capture Plugin (Week 5–7)
**Folder**: `/plugins/room-capture`

**Goal**: Turn a 1–2 minute scan into a fully editable parametric kitchen.

**Tech**:
- Capture: Apple RoomPlan + LiDAR (primary), photogrammetry (Polycam/KIRI style), video-based (SkyeBrowse style) as fallback.
- Server: Mesh cleaning, wall detection, parametric conversion, laser ground-truth alignment.
- Output: Central Room model + optional Gaussian Splats for context.

**Agent Skills**: `ingest-lidar-scan`, `convert-to-parametric-room`, `align-laser-points`, `detect-existing-fixtures`.

**Manner of Use**:
- Client uploads scan package (or streams via WebRTC).
- Server skill processes and publishes a ready-to-edit Room model on the bus.
- Canvas loads the new Room automatically.

**Why Best Choice**:
- LiDAR + RoomPlan currently delivers the best indoor accuracy (±1–3 cm) with automatic semantic understanding.
- Hybrid laser verification reaches millimeter critical dimensions.
- Server-side processing keeps heavy reconstruction off the client and behind the paywall.

---

### Step 3: Space-Planning & Walls (Week 7–8)
**Folder**: `/plugins/space-planning`

**Tech**: Central models + constraint solver (simple rule engine first, later OR-Tools or custom).

**Skills**: `draw-wall`, `add-opening`, `auto-fill-cabinets`, `validate-clearances`.

**Why Best**: Builds directly on the parametric Room from Step 2; keeps all logic in one place.

---

### Step 4: Cabinetry Parametric Engine (Week 8–11)
**Folder**: `/plugins/cabinetry-parametric`

**Goal**: Surpass Cabinet Vision 2025 construction flexibility.

**Tech**:
- Parametric assemblies with per-edge joinery, mixed construction methods, material schedules per part.
- Solid modeling via manifold or OpenCascade.wasm (server).
- Intelligent objects (live open/close, hardware swap).

**Skills**: `place-base-cabinet`, `apply-construction-method`, `modify-joinery`, `validate-cabinet-rules`.

**Why Best**: True parametric + manufacturing-aware model from day one eliminates the design-to-CNC translation errors common in older tools.

---

### Step 5: Catalog Intelligence + Vendor Hub (Week 11–13)
**Folders**: `/plugins/catalog-intelligence`, `/plugins/vendor-hub`

**Tech**: Manufacturer catalog parsers + live pricing APIs + agent skills for RFQ/PO.

**Skills**: `search-catalog`, `configure-product`, `fetch-live-price`, `create-purchase-order`.

**Why Best**: Real-time vendor data + preferred-vendor rules protect margins and automate procurement.

---

### Step 6: Constraint & Rules Engine (Week 13–14)
**Folder**: `/plugins/constraint-rules`

**Tech**: Declarative rules + live validation on the bus. Later AI-assisted rule suggestions.

**Why Best**: Central rules prevent invalid designs from ever reaching BOM or CNC.

---

### Step 7: Photoreal Rendering System (Week 14–17)
**Folder**: `/plugins/rendering-photoreal`

**Goal**: Absolute best photorealism in 2026.

**Hybrid Pipeline**:
1. **Real-time preview** – Client Three.js WebGPU + PBR + neural upscaling.
2. **Final path-traced** – Server GPU (Cycles / OptiX / custom) + AI denoising.
3. **Neural enhancement** – Geometry-preserving AI restyle (MeltFlex/Veras style).
4. **Context** – 3D Gaussian Splatting for real-room backgrounds.
5. **Delivery** – Progressive streaming, 360°, WebXR, shoppable overlays.

**Skills**: `render-preview`, `render-final-pathtraced`, `generate-360`, `ai-restyle-preserve-geometry`.

**Why Best Choice**:
- Combines the control of traditional path tracing, the speed of real-time WebGPU, the convenience of AI enhancement, and the realism of Gaussian Splats.
- All heavy work server-side and credit-metered → perfect monetization alignment.

---

### Step 8: BOM / Cutlist / Nesting (Week 17–19)
**Folder**: `/plugins/bom-cutlist-nesting`

**Tech**: Material optimization algorithms + grain-aware nesting.

**Skills**: `generate-bom`, `nest-panels`, `export-cutlist`.

**Why Best**: Nesting that already knows construction methods and material schedules produces less waste than post-hoc optimizers.

---

### Step 9: CNC Manufacturing (Week 19–22)
**Folder**: `/plugins/cnc-manufacturing`

**Goal**: Better than Cabinet Vision / Mozaik / Microvellum.

**Tech**:
- 175+ post-processors.
- Dynamic toolpath generation that reacts to last-minute changes.
- Paperless shop floor (QR labels → tablet instructions → defect reporting).
- Simulation before export.

**Skills**: `generate-nest`, `export-gcode`, `simulate-toolpath`, `report-shop-floor-status`.

**Why Best**: Design model already contains manufacturing intelligence; agent keeps design ↔ shop perfectly in sync. Paperless + real-time feedback closes the loop that competitors still treat as separate systems.

---

### Step 10: Quoting, Pricing & Procurement (Week 22–24)
**Folder**: `/plugins/quoting-pricing`

**Skills**: Multi-tier pricing, cost/retail factors, automatic PO generation, financing attach.

**Why Best**: Live vendor data + design intelligence = accurate, margin-protected quotes in seconds.

---

### Step 11: AI Design Assistant (Week 24–26)
**Folder**: `/plugins/ai-design-assistant`

**Tech**: Mastra agents + MCP tools + vision models for layout suggestions, style transfer, product recommendations.

**Why Best**: Natural-language interface that operates on the real parametric model (not just images).

---

### Step 12: Collaboration, Client Portal, PDF Brochure (Week 26–28)
**Folders**: `/plugins/collaboration`, `/plugins/client-portal`, `/plugins/pdf-brochure`

**Tech**: Presence via WebRTC/CRDT, shareable links with photoreal + VR, high-res PDF generation server-side.

**Why Best**: Turns the design into a sales and approval system, not just a drawing tool.

---

## 5. Monetization Implementation (Integrated into Every Step)

- Free tier = Canvas-3D + basic walls/cabinets + low-res preview.
- Designer / Pro / Manufacturing tiers unlock higher skills via entitlement tokens.
- Usage credits for path-traced renders, AI generations, large nests, LiDAR processing.
- Marketplace take-rate on catalog sales and preferred-vendor hardware.
- Transaction rails (deposits, financing) as optional agent skills.
- Self-hosted / Enterprise = annual license + support.

All gates are enforced at the Agent Orchestrator and API gateway – never inside individual plugins.

---

## 6. Quality & Isolation Guarantees (Applied Continuously)

- Every skill has a typed contract and resource budget.
- Circuit breakers + dead-letter queues prevent cascade failures.
- Full OpenTelemetry traces for every agent decision.
- Automated contract tests run on every plugin before registration.
- Project files are pure data; no embedded logic that can break.

---

## 7. Immediate Next Actions

1. Create the `/core` scaffolding (models, bus, agent orchestrator, auth, persistence).
2. Scaffold `/plugins/canvas-3d` with a minimal but already superior Three.js + R3F + WebGPU canvas.
3. Define the first set of central domain models and bus message schemas.
4. Write the Room-Capture plugin manifest and server processing skeleton.
5. Set up Docker Compose self-hosted environment.

This plan produces a platform that is simpler, more reliable, more capable, and more profitable than 20-20 Design or Cabinet Vision while strictly obeying every stated requirement.
