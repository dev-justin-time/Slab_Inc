/**
 * Right Inspector – context-sensitive panels contributed by plugins.
 * Placeholders for tabs not yet backed by live skills.
 */

import React, { useState } from "react";
import { useAppStore } from "../../hooks/useAppStore";
import { PlaceholderSection } from "../placeholders/PlaceholderSection";

const TABS = [
  "Identity",
  "Construction",
  "Hardware",
  "Pricing",
  "Constraints",
  "Manufacturing",
  "AI Notes",
] as const;

export function RightInspector() {
  const { selectedId, cabinets, rightInspectorOpen, lastResult } = useAppStore();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Identity");

  if (!rightInspectorOpen) return null;

  const cabinet = cabinets.find((c) => c.id === selectedId);

  return (
    <aside
      style={{
        width: 340,
        background: "#18181b",
        borderLeft: "1px solid #2a2a2e",
        overflowY: "auto",
        flexShrink: 0,
        color: "#e4e4e7",
        fontSize: 12,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #2a2a2e", fontWeight: 600 }}>
        Inspector
      </div>

      {!selectedId && (
        <div style={{ padding: 14, color: "#71717a" }}>
          Select an object in the canvas.
          <div style={{ marginTop: 12 }}>
            <PlaceholderSection label="Project properties" note="Core" />
            <PlaceholderSection label="Room properties" note="space-planning" />
          </div>
        </div>
      )}

      {selectedId && (
        <>
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 4,
              padding: "8px 10px",
              borderBottom: "1px solid #2a2a2e",
            }}
          >
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: "4px 8px",
                  fontSize: 10,
                  background: tab === t ? "#3f3f46" : "transparent",
                  border: "1px solid #3f3f46",
                  borderRadius: 3,
                  color: tab === t ? "#fff" : "#a1a1aa",
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          <div style={{ padding: 14, flex: 1 }}>
            {tab === "Identity" && cabinet && (
              <div style={{ lineHeight: 1.7 }}>
                <div>
                  <strong>ID</strong> {cabinet.id?.slice(0, 8)}…
                </div>
                <div>
                  <strong>Type</strong> {cabinet.type}
                </div>
                <div>
                  <strong>Size</strong> {cabinet.width}×{cabinet.height}×{cabinet.depth} mm
                </div>
                <div>
                  <strong>Method</strong> {cabinet.constructionMethodId}
                </div>
                <div>
                  <strong>Parts</strong> {cabinet.parts?.length ?? 0}
                </div>
              </div>
            )}

            {tab === "Construction" && (
              <PlaceholderSection
                label="Per-edge joinery / material schedule"
                note="cabinetry.apply-construction-method"
              />
            )}
            {tab === "Hardware" && (
              <PlaceholderSection label="Hinges, pulls, slides" note="catalog + hardware rules" />
            )}
            {tab === "Pricing" && (
              <PlaceholderSection
                label="Live cost / retail / margin"
                note="vendor.fetch-live-price + quoting"
              />
            )}
            {tab === "Constraints" && (
              <PlaceholderSection label="Violations for this object" note="constraint-rules" />
            )}
            {tab === "Manufacturing" && (
              <PlaceholderSection
                label="Toolpath preview / machining notes"
                note="cnc (manufacturing tier)"
              />
            )}
            {tab === "AI Notes" && (
              <PlaceholderSection label="Agent suggestions for selection" note="ai-design-assistant" />
            )}
          </div>
        </>
      )}

      {lastResult && (
        <div
          style={{
            padding: 10,
            borderTop: "1px solid #2a2a2e",
            fontSize: 10,
            color: "#71717a",
            maxHeight: 120,
            overflow: "auto",
          }}
        >
          <strong>Last result</strong>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
            {JSON.stringify(lastResult, null, 2).slice(0, 500)}
          </pre>
        </div>
      )}
    </aside>
  );
}
