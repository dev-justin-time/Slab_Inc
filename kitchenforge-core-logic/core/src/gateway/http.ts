/**
 * Thin HTTP Gateway
 * Accepts Intents over REST and forwards them to the AgentOrchestrator.
 * Also exposes health + skill list for debugging.
 */

import express from "express";
import cors from "cors";
import type { AgentOrchestrator } from "../agent/orchestrator";
import { IntentSchema } from "../bus/schemas";

export function createHttpGateway(orchestrator: AgentOrchestrator) {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  // Health
  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "knb-gateway", ts: new Date().toISOString() });
  });

  // List registered skills
  app.get("/skills", (_req, res) => {
    const skills = orchestrator.listSkills().map((s) => ({
      id: s.id,
      title: s.title,
      paywallTier: s.paywallTier,
      computeClass: s.computeClass,
      model: s.model?.preferred ?? "default",
    }));
    res.json({ skills });
  });

  // Main entry – accept an Intent
  app.post("/intent", async (req, res) => {
    try {
      // Light pre-validation so we can return 400 early
      const parsed = IntentSchema.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INTENT",
            message: parsed.error.message,
            retryable: false,
          },
        });
        return;
      }

      const result = await orchestrator.handleIntent(parsed.data);
      const status = result.success ? 200 : result.error?.retryable ? 503 : 403;
      res.status(status).json(result);
    } catch (err) {
      console.error("[gateway] unhandled error:", err);
      res.status(500).json({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: err instanceof Error ? err.message : "Unknown error",
          retryable: true,
        },
      });
    }
  });

  return app;
}
