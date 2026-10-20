/**
 * KNB Client Shell
 * All plugin concerns appear as sections / tabs / placeholders.
 * Business logic never lives here – only Intent calls to the central agent.
 */

import React, { useEffect } from "react";
import { TopBar } from "./components/layout/TopBar";
import { LeftSidebar } from "./components/sidebar/LeftSidebar";
import { RightInspector } from "./components/inspector/RightInspector";
import { AgentPanel } from "./components/agent/AgentPanel";
import { CanvasHost } from "./components/canvas/CanvasHost";
import { useAppStore } from "./hooks/useAppStore";
import { mintBootstrapToken } from "./lib/intent-client";

export default function App() {
  const { userId, projectId, setEntitlement } = useAppStore();

  useEffect(() => {
    // Bootstrap entitlement for local/dev
    const token = mintBootstrapToken({
      userId,
      tier: "designer",
      creditsRemaining: 1000,
      projectId,
    });
    setEntitlement(token, "designer");
  }, [userId, projectId, setEntitlement]);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
        background: "#0c0c0e",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      <TopBar />
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        <LeftSidebar />
        <CanvasHost />
        <RightInspector />
      </div>
      <AgentPanel />
    </div>
  );
}
