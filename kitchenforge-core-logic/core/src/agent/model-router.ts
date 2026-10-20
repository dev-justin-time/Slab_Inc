/**
 * Open-Weight Model Router
 * Selects the correct self-hosted model tier for each skill.
 * Never calls proprietary closed APIs.
 */

import type { SkillManifest, SkillModelConfig } from "../bus/schemas";

export type ModelTier = "flagship" | "default" | "fast" | "vision" | "long-context";

export interface ModelEndpoint {
  tier: ModelTier;
  baseUrl: string;          // e.g. http://vllm-default:8001/v1
  modelName: string;        // served-model-name
  capabilities: Array<"tool-calling" | "structured-output" | "vision" | "reasoning">;
  healthy: boolean;
  currentLoad: number;      // 0–1
}

/** Static routing table – can be overridden by env / config */
export const MODEL_ROUTING_TABLE: Record<ModelTier, { preferredModels: string[]; capabilities: ModelEndpoint["capabilities"] }> = {
  flagship: {
    preferredModels: ["GLM-5.1", "Qwen3.7-Max", "Qwen3.6-Plus"],
    capabilities: ["tool-calling", "structured-output", "reasoning", "vision"],
  },
  default: {
    preferredModels: ["Qwen3-32B", "Qwen3.6-32B", "Qwen3-80B-A3B"],
    capabilities: ["tool-calling", "structured-output", "reasoning"],
  },
  fast: {
    preferredModels: ["Qwen3-8B", "Qwen3-14B", "Gemma-4-27B"],
    capabilities: ["tool-calling", "structured-output"],
  },
  vision: {
    preferredModels: ["Qwen3-VL-30B", "Llama-4-Maverick"],
    capabilities: ["vision", "tool-calling", "structured-output"],
  },
  "long-context": {
    preferredModels: ["Llama-4-Scout", "Llama-4-Maverick", "Qwen3-long"],
    capabilities: ["tool-calling", "structured-output", "reasoning"],
  },
};

export class ModelRouter {
  private endpoints: Map<ModelTier, ModelEndpoint[]> = new Map();

  constructor(initialEndpoints: ModelEndpoint[] = []) {
    for (const ep of initialEndpoints) {
      const list = this.endpoints.get(ep.tier) ?? [];
      list.push(ep);
      this.endpoints.set(ep.tier, list);
    }
  }

  /** Register or update an endpoint (called by health checker) */
  registerEndpoint(ep: ModelEndpoint) {
    const list = this.endpoints.get(ep.tier) ?? [];
    const idx = list.findIndex((e) => e.baseUrl === ep.baseUrl);
    if (idx >= 0) list[idx] = ep;
    else list.push(ep);
    this.endpoints.set(ep.tier, list);
  }

  /**
   * Select the best available endpoint for a skill.
   * Throws if no suitable healthy endpoint exists.
   */
  select(skill: SkillManifest): ModelEndpoint {
    const config: SkillModelConfig = skill.model ?? {
      preferred: "default",
      fallback: ["fast"],
      structuredOutput: true,
      temperature: 0.1,
      maxTokens: 4096,
    };

    const candidates = [config.preferred, ...(config.fallback ?? [])];

    for (const tier of candidates) {
      const endpoints = this.endpoints.get(tier) ?? [];
      const healthy = endpoints
        .filter((e) => e.healthy && e.currentLoad < 0.9)
        .sort((a, b) => a.currentLoad - b.currentLoad);

      for (const ep of healthy) {
        if (config.minCapability && !ep.capabilities.includes(config.minCapability)) {
          continue;
        }
        return ep;
      }
    }

    throw new Error(
      `No healthy model endpoint available for skill ${skill.id} (tried: ${candidates.join(", ")})`
    );
  }

  /** Simple health snapshot for observability */
  getStatus() {
    const status: Record<string, { healthy: number; total: number; avgLoad: number }> = {};
    for (const [tier, list] of this.endpoints) {
      const healthy = list.filter((e) => e.healthy);
      status[tier] = {
        healthy: healthy.length,
        total: list.length,
        avgLoad: list.length ? list.reduce((s, e) => s + e.currentLoad, 0) / list.length : 0,
      };
    }
    return status;
  }
}
