/**
 * Central Agent Orchestrator
 * The ONLY place that decides which skill runs and which model is used.
 * All plugins talk to the world only through this + the bus.
 *
 * Execution order:
 * 1. Validate Intent
 * 2. Lookup skill
 * 3. Entitlement gate (fail-closed)
 * 4. Model routing
 * 5. Execute skill with timeout
 */

import { v4 as uuidv4 } from "uuid";
import { IntentSchema, type Intent, type Result, type SkillManifest } from "../bus/schemas";
import { ModelRouter } from "./model-router";
import { checkEntitlement } from "../auth/entitlement";

export interface SkillRunner {
  (intent: Intent, skill: SkillManifest, modelEndpoint: { baseUrl: string; modelName: string }): Promise<unknown>;
}

export class AgentOrchestrator {
  private skills = new Map<string, SkillManifest>();
  private runner: SkillRunner;
  private modelRouter: ModelRouter;

  constructor(runner: SkillRunner, modelRouter: ModelRouter) {
    this.runner = runner;
    this.modelRouter = modelRouter;
  }

  /** Register a skill from a plugin manifest */
  registerSkill(skill: SkillManifest) {
    this.skills.set(skill.id, skill);
  }

  /** Main entry – called by the bus / API gateway */
  async handleIntent(raw: unknown): Promise<Result> {
    const start = Date.now();
    let intent: Intent;

    try {
      intent = IntentSchema.parse(raw);
    } catch (err) {
      return {
        intentId: (raw as any)?.id ?? uuidv4(),
        success: false,
        error: {
          code: "INVALID_INTENT",
          message: err instanceof Error ? err.message : "Invalid intent payload",
          retryable: false,
        },
      };
    }

    const skill = this.skills.get(intent.type);
    if (!skill) {
      return {
        intentId: intent.id,
        success: false,
        error: {
          code: "SKILL_NOT_FOUND",
          message: `No skill registered for type: ${intent.type}`,
          retryable: false,
        },
      };
    }

    // 1. Entitlement gate (fail-closed)
    const entitlement = checkEntitlement(intent.entitlementToken, skill);
    if (!entitlement.allowed) {
      return {
        intentId: intent.id,
        success: false,
        error: {
          code: entitlement.code ?? "INSUFFICIENT_TIER",
          message: entitlement.reason ?? "Not entitled to run this skill",
          retryable: false,
        },
      };
    }

    // 2. Model routing
    let modelEndpoint;
    try {
      modelEndpoint = this.modelRouter.select(skill);
    } catch (err) {
      return {
        intentId: intent.id,
        success: false,
        error: {
          code: "NO_MODEL_AVAILABLE",
          message: err instanceof Error ? err.message : "Model routing failed",
          retryable: true,
        },
      };
    }

    // 3. Execute skill with timeout
    try {
      const data = await Promise.race([
        this.runner(intent, skill, {
          baseUrl: modelEndpoint.baseUrl,
          modelName: modelEndpoint.modelName,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Skill timeout")), skill.timeoutMs)
        ),
      ]);

      return {
        intentId: intent.id,
        success: true,
        data,
        metrics: {
          durationMs: Date.now() - start,
          computeClass: skill.computeClass,
          modelUsed: modelEndpoint.modelName,
        },
      };
    } catch (err) {
      return {
        intentId: intent.id,
        success: false,
        error: {
          code: "SKILL_EXECUTION_FAILED",
          message: err instanceof Error ? err.message : "Unknown skill error",
          retryable: true,
        },
        metrics: {
          durationMs: Date.now() - start,
          computeClass: skill.computeClass,
          modelUsed: modelEndpoint.modelName,
        },
      };
    }
  }

  listSkills() {
    return Array.from(this.skills.values());
  }
}
