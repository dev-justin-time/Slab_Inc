/**
 * KNB Platform Startup
 * 1. Bootstrap Postgres + MinIO
 * 2. Create ModelRouter + Orchestrator
 * 3. Register all plugin skills
 * 4. Start HTTP + NATS gateways
 */

import { ModelRouter, type ModelEndpoint } from "../agent/model-router";
import { AgentOrchestrator } from "../agent/orchestrator";
import { bootstrapPersistence } from "../persistence/clients";
import { registerAllSkills, unifiedSkillRunner } from "./register-skills";
import { createHttpGateway } from "../gateway/http";
import { startNatsGateway } from "../gateway/nats";

const HTTP_PORT = Number(process.env.HTTP_PORT ?? 3100);

async function main() {
  console.log("[knb] starting…");

  // 1. Persistence
  let postgres, minio;
  try {
    const persistence = await bootstrapPersistence();
    postgres = persistence.postgres;
    minio = persistence.minio;
    console.log("[knb] postgres + minio ready");
  } catch (err) {
    console.warn(
      "[knb] persistence bootstrap failed (continuing without DB):",
      err instanceof Error ? err.message : err
    );
  }

  // 2. Model router – register local open-weight endpoints
  //    (point these at real vLLM / Ollama instances when available)
  const modelRouter = new ModelRouter([
    {
      tier: "default",
      baseUrl: process.env.MODEL_DEFAULT_URL ?? "http://localhost:8001/v1",
      modelName: "default",
      capabilities: ["tool-calling", "structured-output", "reasoning"],
      healthy: true,
      currentLoad: 0,
    },
    {
      tier: "fast",
      baseUrl: process.env.MODEL_FAST_URL ?? "http://localhost:8002/v1",
      modelName: "fast",
      capabilities: ["tool-calling", "structured-output"],
      healthy: true,
      currentLoad: 0,
    },
    {
      tier: "vision",
      baseUrl: process.env.MODEL_VISION_URL ?? "http://localhost:8003/v1",
      modelName: "vision",
      capabilities: ["vision", "tool-calling", "structured-output"],
      healthy: true,
      currentLoad: 0,
    },
    {
      tier: "flagship",
      baseUrl: process.env.MODEL_FLAGSHIP_URL ?? "http://localhost:8001/v1",
      modelName: "flagship",
      capabilities: ["tool-calling", "structured-output", "reasoning", "vision"],
      healthy: true,
      currentLoad: 0,
    },
  ] as ModelEndpoint[]);

  // 3. Orchestrator
  const orchestrator = new AgentOrchestrator(unifiedSkillRunner, modelRouter);

  // 4. Register skills from all plugin manifests
  registerAllSkills(orchestrator);

  // 5. HTTP gateway
  const app = createHttpGateway(orchestrator);
  app.listen(HTTP_PORT, () => {
    console.log(`[knb] HTTP gateway listening on :${HTTP_PORT}`);
    console.log(`      POST /intent   – submit an Intent`);
    console.log(`      GET  /skills   – list registered skills`);
    console.log(`      GET  /health   – health check`);
  });

  // 6. NATS gateway (optional – continues even if NATS is down)
  try {
    await startNatsGateway(orchestrator);
  } catch (err) {
    console.warn(
      "[knb] NATS gateway not started:",
      err instanceof Error ? err.message : err
    );
  }

  // Expose for tests / future use
  (globalThis as any).__knb = { orchestrator, postgres, minio, modelRouter };

  console.log("[knb] ready");
}

main().catch((err) => {
  console.error("[knb] fatal:", err);
  process.exit(1);
});
