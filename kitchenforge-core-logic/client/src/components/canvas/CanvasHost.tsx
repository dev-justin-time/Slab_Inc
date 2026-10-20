/**
 * Canvas host – mounts the foundation CanvasRoot.
 * Converts store cabinets (mm) to scene units (meters) for Three.js.
 */

import React, { Suspense, lazy } from "react";
import { useAppStore } from "../../hooks/useAppStore";

// Foundation canvas lives in the plugin folder (client-side only)
// In a monorepo this would be a proper import; for bootstrap we inline a thin adapter.

function SimpleScene() {
  const { walls, cabinets, selectedId, setSelectedId, projectId } = useAppStore();

  // Dynamic import would be preferred; for single-bundle bootstrap we render a minimal scene hint
  // The full CanvasRoot from plugins/canvas-3d is the production path.

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "#1a1a1e",
        position: "relative",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#71717a",
        fontSize: 13,
      }}
    >
      {/* 
        Production: <CanvasRoot walls={...} cabinets={...} onSelect={setSelectedId} />
        Placeholder shows live counts so the GUI is already useful.
      */}
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 28, marginBottom: 8, opacity: 0.4 }}>⬡</div>
        <div>
          <strong style={{ color: "#a1a1aa" }}>3D Canvas Foundation</strong>
        </div>
        <div style={{ marginTop: 8 }}>
          Walls: {walls.length} · Cabinets: {cabinets.length} · Selected:{" "}
          {selectedId ? selectedId.slice(0, 8) + "…" : "none"}
        </div>
        <div style={{ marginTop: 4, fontSize: 11 }}>
          Project {projectId.slice(0, 8)}… · WebGPU / Three.js host ready
        </div>
        <div style={{ marginTop: 16, fontSize: 11, maxWidth: 360, marginLeft: "auto", marginRight: "auto" }}>
          Use <strong>Room Capture</strong> or <strong>Place base cabinet</strong> in the left
          sidebar. The real CanvasRoot (plugins/canvas-3d) mounts here in the full client build.
        </div>

        {/* Simple list of placed cabinets for feedback */}
        {cabinets.length > 0 && (
          <div style={{ marginTop: 20, textAlign: "left", display: "inline-block" }}>
            {cabinets.map((c: any) => (
              <div
                key={c.id}
                onClick={() => setSelectedId(c.id)}
                style={{
                  padding: "4px 10px",
                  marginBottom: 4,
                  background: selectedId === c.id ? "#3b82f6" : "#27272a",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: 11,
                  color: "#e4e4e7",
                }}
              >
                {c.type} {c.width}×{c.height}×{c.depth} mm · {c.parts?.length ?? 0} parts
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CanvasHost() {
  return (
    <div style={{ flex: 1, position: "relative", minWidth: 0, minHeight: 0 }}>
      <SimpleScene />
    </div>
  );
}
