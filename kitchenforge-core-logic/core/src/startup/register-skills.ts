/**
 * Skill Registration at Startup
 * Loads every plugin manifest and registers its skills with the orchestrator.
 * Plugins never call each other – they only expose skills.
 */

import { readFileSync, readdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { AgentOrchestrator } from "../agent/orchestrator";
import type { SkillManifest } from "../bus/schemas";
import { SkillManifestSchema } from "../bus/schemas";

// Skill implementations
import { placeBaseCabinet } from "../../../plugins/cabinetry-parametric/skills/place-base-cabinet";
import { ingestLidarScan } from "../../../plugins/room-capture/skills/ingest-lidar-scan";

const __dirname = dirname(fileURLToPath(import.meta.url));

/** Map skill id → runner function */
const SKILL_RUNNERS: Record<
  string,
  (intent: any, skill: any, model: any) => Promise<unknown>
> = {
  "cabinetry.place-base-cabinet": placeBaseCabinet,
  "room-capture.ingest-lidar-scan": ingestLidarScan,
};

/**
 * Discover plugin manifests under /plugins and register every skill.
 */
export function registerAllSkills(orchestrator: AgentOrchestrator): void {
  const pluginsRoot = join(__dirname, "../../../plugins");

  if (!existsSync(pluginsRoot)) {
    console.warn("[skills] plugins directory not found:", pluginsRoot);
    return;
  }

  const pluginDirs = readdirSync(pluginsRoot, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  let count = 0;

  for (const dir of pluginDirs) {
    const manifestPath = join(pluginsRoot, dir, "manifest.json");
    if (!existsSync(manifestPath)) continue;

    try {
      const raw = JSON.parse(readFileSync(manifestPath, "utf8"));
      const skills: unknown[] = raw.skills ?? [];

      for (const s of skills) {
        const skill = SkillManifestSchema.parse(s);
        orchestrator.registerSkill(skill);
        count++;
        console.log(`[skills] registered: ${skill.id} (${skill.computeClass})`);
      }
    } catch (err) {
      console.error(`[skills] failed to load ${manifestPath}:`, err);
    }
  }

  console.log(`[skills] total registered: ${count}`);
}

/**
 * Unified skill runner used by the orchestrator.
 * Looks up the concrete implementation by skill id.
 */
export async function unifiedSkillRunner(
  intent: any,
  skill: SkillManifest,
  modelEndpoint: { baseUrl: string; modelName: string }
): Promise<unknown> {
  const runner = SKILL_RUNNERS[skill.id];
  if (!runner) {
    throw new Error(`No implementation registered for skill: ${skill.id}`);
  }
  return runner(intent, skill, modelEndpoint);
}
