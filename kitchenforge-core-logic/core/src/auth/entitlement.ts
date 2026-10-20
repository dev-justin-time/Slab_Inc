/**
 * Entitlement Gate
 * Checks that the caller is allowed to run a skill based on their subscription tier.
 * Runs BEFORE model routing and skill execution.
 * Fail-closed: missing or invalid token → reject.
 */

import { z } from "zod";
import type { SkillManifest } from "../bus/schemas";

export type PaywallTier = "free" | "designer" | "pro" | "manufacturing";

const TIER_RANK: Record<PaywallTier, number> = {
  free: 0,
  designer: 1,
  pro: 2,
  manufacturing: 3,
};

/** What we expect inside a verified entitlement token (JWT claims or opaque token payload) */
export const EntitlementClaimsSchema = z.object({
  userId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  tier: z.enum(["free", "designer", "pro", "manufacturing"]),
  creditsRemaining: z.number().nonnegative().optional(),
  expiresAt: z.string().datetime().optional(),
  features: z.array(z.string()).optional(), // optional fine-grained feature flags
});

export type EntitlementClaims = z.infer<typeof EntitlementClaimsSchema>;

export interface EntitlementResult {
  allowed: boolean;
  claims?: EntitlementClaims;
  reason?: string;
  code?: "MISSING_TOKEN" | "INVALID_TOKEN" | "EXPIRED" | "INSUFFICIENT_TIER" | "NO_CREDITS" | "FEATURE_DENIED";
}

/**
 * Verify and authorize an entitlement token against a skill.
 *
 * In production this would:
 * 1. Verify JWT signature (Keycloak / internal issuer)
 * 2. Check expiry
 * 3. Compare tier rank
 * 4. Optionally debit credits for GPU skills
 *
 * For the bootstrap we accept a simple base64 JSON token so the rest of the system can be tested.
 */
export function checkEntitlement(
  token: string | undefined | null,
  skill: SkillManifest
): EntitlementResult {
  if (!token || token.trim() === "") {
    return {
      allowed: false,
      reason: "Entitlement token is required",
      code: "MISSING_TOKEN",
    };
  }

  let claims: EntitlementClaims;
  try {
    // Bootstrap decoder – replace with real JWT verification in production
    const json = Buffer.from(token, "base64url").toString("utf8");
    claims = EntitlementClaimsSchema.parse(JSON.parse(json));
  } catch {
    return {
      allowed: false,
      reason: "Entitlement token is malformed or signature invalid",
      code: "INVALID_TOKEN",
    };
  }

  // Expiry check
  if (claims.expiresAt) {
    const exp = new Date(claims.expiresAt).getTime();
    if (Date.now() > exp) {
      return {
        allowed: false,
        claims,
        reason: "Entitlement token has expired",
        code: "EXPIRED",
      };
    }
  }

  // Tier check – user must meet the minimum tier required by the skill
  const requiredTiers = skill.paywallTier;
  const userRank = TIER_RANK[claims.tier];
  const allowed = requiredTiers.some((t) => userRank >= TIER_RANK[t]);

  if (!allowed) {
    return {
      allowed: false,
      claims,
      reason: `Skill requires one of [${requiredTiers.join(", ")}], user has "${claims.tier}"`,
      code: "INSUFFICIENT_TIER",
    };
  }

  // Optional credit check for GPU / heavy skills
  if (skill.computeClass === "gpu" && claims.creditsRemaining !== undefined) {
    if (claims.creditsRemaining <= 0) {
      return {
        allowed: false,
        claims,
        reason: "Insufficient credits for GPU skill",
        code: "NO_CREDITS",
      };
    }
  }

  return {
    allowed: true,
    claims,
  };
}

/**
 * Helper to mint a bootstrap token for local testing / self-hosted.
 * NEVER use this in production – replace with real auth provider.
 */
export function mintBootstrapToken(claims: EntitlementClaims): string {
  const payload = JSON.stringify(claims);
  return Buffer.from(payload, "utf8").toString("base64url");
}
