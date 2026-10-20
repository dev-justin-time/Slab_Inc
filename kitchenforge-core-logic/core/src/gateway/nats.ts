/**
 * Thin NATS Gateway
 * Subscribes to intent subjects and publishes results.
 * Subject convention: knb.intent.<skillId>  →  knb.result.<intentId>
 */

import { connect, StringCodec, type NatsConnection, type Subscription } from "nats";
import type { AgentOrchestrator } from "../agent/orchestrator";
import { IntentSchema } from "../bus/schemas";

const sc = StringCodec();

export interface NatsGatewayOptions {
  servers?: string | string[];
  intentSubject?: string; // default: knb.intent.>
}

export async function startNatsGateway(
  orchestrator: AgentOrchestrator,
  opts: NatsGatewayOptions = {}
): Promise<{ nc: NatsConnection; sub: Subscription }> {
  const servers = opts.servers ?? process.env.NATS_URL ?? "nats://localhost:4222";
  const intentSubject = opts.intentSubject ?? "knb.intent.>";

  const nc = await connect({ servers });
  console.log(`[nats] connected to ${servers}`);

  const sub = nc.subscribe(intentSubject);
  console.log(`[nats] listening on ${intentSubject}`);

  (async () => {
    for await (const msg of sub) {
      const reply = msg.reply;
      try {
        const raw = JSON.parse(sc.decode(msg.data));
        const parsed = IntentSchema.safeParse(raw);

        if (!parsed.success) {
          const errResult = {
            intentId: raw?.id ?? "unknown",
            success: false,
            error: {
              code: "INVALID_INTENT",
              message: parsed.error.message,
              retryable: false,
            },
          };
          if (reply) nc.publish(reply, sc.encode(JSON.stringify(errResult)));
          continue;
        }

        const result = await orchestrator.handleIntent(parsed.data);

        // Publish to reply subject if present, otherwise to knb.result.<intentId>
        const target = reply ?? `knb.result.${parsed.data.id}`;
        nc.publish(target, sc.encode(JSON.stringify(result)));
      } catch (err) {
        console.error("[nats] handler error:", err);
        if (reply) {
          nc.publish(
            reply,
            sc.encode(
              JSON.stringify({
                success: false,
                error: {
                  code: "INTERNAL_ERROR",
                  message: err instanceof Error ? err.message : "Unknown",
                  retryable: true,
                },
              })
            )
          );
        }
      }
    }
  })();

  return { nc, sub };
}
