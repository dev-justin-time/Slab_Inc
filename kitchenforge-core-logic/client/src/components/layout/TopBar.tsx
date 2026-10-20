import React from "react";
import { useAppStore } from "../../hooks/useAppStore";

export function TopBar() {
  const {
    projectId,
    tier,
    creditsRemaining,
    agentBusy,
    toggleLeftSidebar,
    toggleRightInspector,
  } = useAppStore();

  const tierColor: Record<string, string> = {
    free: "#888",
    designer: "#4a9eff",
    pro: "#a78bfa",
    manufacturing: "#f59e0b",
  };

  return (
    <header
      style={{
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 16px",
        background: "#141416",
        borderBottom: "1px solid #2a2a2e",
        color: "#e4e4e7",
        fontSize: 13,
        flexShrink: 0,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={toggleLeftSidebar} style={iconBtn}>
          ☰
        </button>
        <strong style={{ letterSpacing: 0.5 }}>KNB</strong>
        <span style={{ color: "#71717a" }}>|</span>
        <span style={{ color: "#a1a1aa" }}>Project {projectId.slice(0, 8)}…</span>
        <span
          style={{
            background: tierColor[tier],
            color: "#000",
            padding: "2px 8px",
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
          }}
        >
          {tier}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <span style={{ color: agentBusy ? "#fbbf24" : "#22c55e" }}>
          {agentBusy ? "● Agent working…" : "● Idle"}
        </span>
        <span style={{ color: "#a1a1aa" }}>Credits: {creditsRemaining}</span>
        <button onClick={toggleRightInspector} style={iconBtn}>
          ⧉
        </button>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "#3f3f46",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
          }}
        >
          U
        </div>
      </div>
    </header>
  );
}

const iconBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#a1a1aa",
  cursor: "pointer",
  fontSize: 16,
  padding: 4,
};
