/**
 * Left Sidebar – all plugin tool sections.
 * Each section is a plugin concern. Future logic plugs into the same slots.
 */

import React, { useState } from "react";
import { useAppStore } from "../../hooks/useAppStore";
import { submitIntent } from "../../lib/intent-client";
import { PlaceholderSection } from "../placeholders/PlaceholderSection";

function Section({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: "1px solid #2a2a2e" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "10px 14px",
          background: open ? "#1f1f23" : "transparent",
          border: "none",
          color: "#e4e4e7",
          fontSize: 12,
          fontWeight: 600,
          cursor: "pointer",
          letterSpacing: 0.3,
        }}
      >
        {open ? "▾" : "▸"} {title}
      </button>
      {open && <div style={{ padding: "4px 12px 12px" }}>{children}</div>}
    </div>
  );
}

function ToolBtn({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "6px 10px",
        marginBottom: 4,
        background: disabled ? "#1a1a1e" : "#27272a",
        border: "1px solid #3f3f46",
        borderRadius: 4,
        color: disabled ? "#52525b" : "#e4e4e7",
        fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {label}
    </button>
  );
}

export function LeftSidebar() {
  const store = useAppStore();
  const ctx = {
    projectId: store.projectId,
    userId: store.userId,
    entitlementToken: store.entitlementToken,
  };

  const runSkill = async (type: string, payload: unknown) => {
    store.setAgentBusy(true);
    store.addAgentMessage("user", `Run ${type}`);
    try {
      const result = await submitIntent(type, payload, ctx);
      store.setLastResult(result);
      if (result.success) {
        store.addAgentMessage("agent", JSON.stringify(result.data, null, 2).slice(0, 400));
        // Hydrate canvas if cabinet was placed
        if (type === "cabinetry.place-base-cabinet" && (result.data as any)?.cabinet) {
          store.setCabinets([...store.cabinets, (result.data as any).cabinet]);
        }
        if (type === "room-capture.ingest-lidar-scan" && (result.data as any)?.room) {
          const room = (result.data as any).room;
          store.setWalls(room.walls ?? []);
        }
      } else {
        store.addAgentMessage("system", `Error: ${result.error?.message}`);
      }
    } catch (err) {
      store.addAgentMessage("system", `Network error: ${err}`);
    } finally {
      store.setAgentBusy(false);
    }
  };

  if (!store.leftSidebarOpen) return null;

  return (
    <aside
      style={{
        width: 280,
        background: "#18181b",
        borderRight: "1px solid #2a2a2e",
        overflowY: "auto",
        flexShrink: 0,
        color: "#e4e4e7",
        fontSize: 12,
      }}
    >
      {/* Canvas / View – foundation */}
      <Section title="View Modes" defaultOpen>
        {(
          [
            "perspective",
            "orthographic",
            "elevation",
            "section",
            "plan",
            "360",
            "vr",
          ] as const
        ).map((m) => (
          <ToolBtn
            key={m}
            label={m.charAt(0).toUpperCase() + m.slice(1)}
            onClick={() => store.setViewMode(m)}
          />
        ))}
      </Section>

      {/* Room Capture */}
      <Section title="Room Capture" defaultOpen>
        <ToolBtn
          label="Ingest LiDAR / Scan"
          onClick={() =>
            runSkill("room-capture.ingest-lidar-scan", {
              projectId: store.projectId,
              scanAssetId: "00000000-0000-4000-8000-000000000099",
              source: "roomplan",
              expectedWidthMm: 4000,
              expectedDepthMm: 3000,
            })
          }
        />
        <PlaceholderSection
          label="Upload scan package"
          note="Future: file picker → MinIO presigned upload"
        />
        <PlaceholderSection
          label="Align laser points"
          note="Future: room-capture.align-laser-points"
        />
      </Section>

      {/* Space Planning */}
      <Section title="Space Planning">
        <PlaceholderSection label="Draw wall (straight)" note="space-planning.draw-wall" />
        <PlaceholderSection label="Draw curved / cathedral" note="Future wall types" />
        <PlaceholderSection label="Add door / window" note="space-planning.add-opening" />
        <PlaceholderSection label="Auto-fill cabinets" note="space-planning.auto-fill" />
      </Section>

      {/* Cabinetry */}
      <Section title="Cabinetry" defaultOpen>
        <ToolBtn
          label="Place base cabinet (600×720×560)"
          onClick={() =>
            runSkill("cabinetry.place-base-cabinet", {
              roomId: "00000000-0000-4000-8000-000000000020",
              type: "base",
              position: { x: store.cabinets.length * 0.65, y: 0.36, z: 0 },
              width: 600,
              height: 720,
              depth: 560,
              constructionMethodId: "frameless",
            })
          }
        />
        <PlaceholderSection label="Place wall cabinet" note="cabinetry.place-wall-cabinet" />
        <PlaceholderSection label="Place tall / island" note="Future cabinet types" />
        <PlaceholderSection
          label="Construction method"
          note="32mm / face-frame / frameless / custom"
        />
      </Section>

      {/* Catalog + Vendor */}
      <Section title="Catalog & Vendor">
        <PlaceholderSection label="Search manufacturer catalog" note="catalog.search" />
        <PlaceholderSection label="Live price & availability" note="vendor.fetch-live-price" />
        <PlaceholderSection label="Create PO / RFQ" note="vendor.create-purchase-order" />
      </Section>

      {/* Constraints */}
      <Section title="Constraints">
        <PlaceholderSection label="Validate all" note="constraint-rules.validate-all" />
        <PlaceholderSection label="Clearance / door-swing" note="Live overlays on canvas" />
        {store.constraintViolations.length === 0 && (
          <div style={{ color: "#22c55e", padding: "4px 8px" }}>No violations</div>
        )}
      </Section>

      {/* Rendering */}
      <Section title="Rendering">
        <PlaceholderSection label="Preview (WebGPU)" note="Client-side real-time" />
        <PlaceholderSection
          label="Final path-traced render"
          note="rendering.render-final-pathtraced (GPU credits)"
        />
        <PlaceholderSection label="360° panorama" note="rendering.generate-360" />
        <PlaceholderSection label="AI restyle" note="rendering.ai-restyle-preserve-geometry" />
      </Section>

      {/* BOM / CNC */}
      <Section title="BOM / Nesting / CNC">
        <PlaceholderSection label="Generate BOM" note="bom.generate" />
        <PlaceholderSection label="Nest panels" note="bom.nest-panels" />
        <PlaceholderSection label="Export G-code" note="cnc.export-gcode (manufacturing tier)" />
        <PlaceholderSection label="Shop-floor status" note="cnc.report-shop-floor-status" />
      </Section>

      {/* Quoting */}
      <Section title="Quoting & Procurement">
        <PlaceholderSection label="Generate quote" note="quoting.generate-quote" />
        <PlaceholderSection label="Collect deposit" note="quoting.collect-deposit" />
      </Section>

      {/* AI Assistant */}
      <Section title="AI Design Assistant">
        <PlaceholderSection
          label="Suggest layout"
          note="ai-design-assistant.suggest-layout"
        />
        <PlaceholderSection label="Restyle kitchen" note="ai-design-assistant.restyle" />
        <PlaceholderSection
          label="Explain constraint"
          note="ai-design-assistant.explain-constraint"
        />
      </Section>

      {/* Collaboration / Client Portal */}
      <Section title="Collaboration">
        <PlaceholderSection label="Presence / cursors" note="collaboration.presence" />
        <PlaceholderSection label="Share client link" note="client-portal.create-share" />
        <PlaceholderSection label="PDF brochure" note="pdf-brochure.generate" />
      </Section>
    </aside>
  );
}
