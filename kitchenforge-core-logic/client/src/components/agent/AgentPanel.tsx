/**
 * Bottom Agent / Timeline / Shop panel.
 * Conversational interface to the central agent system.
 */

import React, { useState, useRef, useEffect } from "react";
import { useAppStore } from "../../hooks/useAppStore";
import { submitIntent } from "../../lib/intent-client";

export function AgentPanel() {
  const store = useAppStore();
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [store.agentMessages]);

  if (store.bottomPanelMode === "hidden") return null;

  const send = async () => {
    if (!input.trim() || store.agentBusy) return;
    const text = input.trim();
    setInput("");
    store.addAgentMessage("user", text);

    // Placeholder: route natural language to a skill later (ai-design-assistant)
    // For now, echo + hint
    store.addAgentMessage(
      "agent",
      `Received: "${text}". Natural-language routing will use ai-design-assistant skills. Use the left sidebar to run concrete skills today.`
    );
  };

  return (
    <div
      style={{
        height: 220,
        background: "#141416",
        borderTop: "1px solid #2a2a2e",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        color: "#e4e4e7",
        fontSize: 12,
      }}
    >
      {/* Mode tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid #2a2a2e" }}>
        {(["agent", "timeline", "shop"] as const).map((m) => (
          <button
            key={m}
            onClick={() => store.setBottomPanelMode(m)}
            style={{
              padding: "6px 14px",
              background: store.bottomPanelMode === m ? "#27272a" : "transparent",
              border: "none",
              color: store.bottomPanelMode === m ? "#fff" : "#71717a",
              fontSize: 11,
              cursor: "pointer",
              textTransform: "capitalize",
            }}
          >
            {m}
          </button>
        ))}
        <button
          onClick={() => store.setBottomPanelMode("hidden")}
          style={{
            marginLeft: "auto",
            padding: "6px 12px",
            background: "transparent",
            border: "none",
            color: "#52525b",
            cursor: "pointer",
          }}
        >
          ✕
        </button>
      </div>

      {store.bottomPanelMode === "agent" && (
        <>
          <div style={{ flex: 1, overflowY: "auto", padding: 10 }}>
            {store.agentMessages.map((m, i) => (
              <div
                key={i}
                style={{
                  marginBottom: 6,
                  color:
                    m.role === "user" ? "#93c5fd" : m.role === "system" ? "#71717a" : "#86efac",
                }}
              >
                <strong style={{ fontSize: 10, opacity: 0.7 }}>{m.role}</strong> {m.text}
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div style={{ display: "flex", padding: 8, gap: 8, borderTop: "1px solid #2a2a2e" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask the agent… (NL → skills coming soon)"
              style={{
                flex: 1,
                background: "#27272a",
                border: "1px solid #3f3f46",
                borderRadius: 4,
                padding: "6px 10px",
                color: "#e4e4e7",
                fontSize: 12,
              }}
            />
            <button
              onClick={send}
              disabled={store.agentBusy}
              style={{
                padding: "6px 14px",
                background: "#3b82f6",
                border: "none",
                borderRadius: 4,
                color: "#fff",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Send
            </button>
          </div>
        </>
      )}

      {store.bottomPanelMode === "timeline" && (
        <div style={{ padding: 14, color: "#71717a" }}>
          Version history / undo stack placeholder. Future: collaboration.timeline skill.
        </div>
      )}

      {store.bottomPanelMode === "shop" && (
        <div style={{ padding: 14, color: "#71717a" }}>
          Shop-floor status placeholder. Future: cnc.report-shop-floor-status (manufacturing tier).
        </div>
      )}
    </div>
  );
}
