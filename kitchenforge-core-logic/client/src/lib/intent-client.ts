/**
 * Typed Intent client – the ONLY way the GUI talks to the backend.
 * All plugin features go through POST /intent.
 */

import { v4 as uuidv4 } from "uuid";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3100";

export type PaywallTier = "free" | "designer" | "pro" | "manufacturing";

export interface Intent {
  id: string;
  type: string;
  projectId: string;
  userId: string;
  payload: unknown;
  entitlementToken: string;
  timestamp: string;
  correlationId?: string;
}

export interface IntentResult {
  intentId: string;
  success: boolean;
  data?: unknown;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
  metrics?: {
    durationMs: number;
    computeClass: string;
    modelUsed?: string;
  };
}

/** Bootstrap token for local/dev. Replace with real auth later. */
export function mintBootstrapToken(opts: {
  userId: string;
  tier: PaywallTier;
  creditsRemaining?: number;
  projectId?: string;
}): string {
  const claims = {
    userId: opts.userId,
    tier: opts.tier,
    creditsRemaining: opts.creditsRemaining ?? 1000,
    projectId: opts.projectId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
  return btoa(JSON.stringify(claims))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function submitIntent(
  type: string,
  payload: unknown,
  ctx: {
    projectId: string;
    userId: string;
    entitlementToken: string;
  }
): Promise<IntentResult> {
  const intent: Intent = {
    id: uuidv4(),
    type,
    projectId: ctx.projectId,
    userId: ctx.userId,
    payload,
    entitlementToken: ctx.entitlementToken,
    timestamp: new Date().toISOString(),
  };

  const res = await fetch(`${API_BASE}/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(intent),
  });

  return res.json();
}

export async function listSkills(): Promise<
  { id: string; title: string; paywallTier: string[]; computeClass: string }[]
> {
  const res = await fetch(`${API_BASE}/skills`);
  const data = await res.json();
  return data.skills ?? [];
}
