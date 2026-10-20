/**
 * Central client state (Zustand).
 * Holds only view state + references to central domain models.
 * No business logic – that lives in server skills.
 */

import { create } from "zustand";

export type ViewMode =
  | "perspective"
  | "orthographic"
  | "elevation"
  | "section"
  | "plan"
  | "360"
  | "vr";

export interface AppState {
  // Session
  userId: string;
  projectId: string;
  tier: "free" | "designer" | "pro" | "manufacturing";
  entitlementToken: string;
  creditsRemaining: number;

  // Selection & view
  selectedId: string | null;
  viewMode: ViewMode;
  leftSidebarOpen: boolean;
  rightInspectorOpen: boolean;
  bottomPanelMode: "timeline" | "agent" | "shop" | "hidden";

  // Domain data (hydrated from server)
  walls: any[];
  cabinets: any[];
  openings: any[];
  constraintViolations: any[];

  // Agent
  agentMessages: { role: "user" | "agent" | "system"; text: string; ts: string }[];
  agentBusy: boolean;
  lastResult: any;

  // Actions
  setSelectedId: (id: string | null) => void;
  setViewMode: (m: ViewMode) => void;
  setBottomPanelMode: (m: AppState["bottomPanelMode"]) => void;
  toggleLeftSidebar: () => void;
  toggleRightInspector: () => void;
  addAgentMessage: (role: "user" | "agent" | "system", text: string) => void;
  setAgentBusy: (b: boolean) => void;
  setLastResult: (r: any) => void;
  setCabinets: (c: any[]) => void;
  setWalls: (w: any[]) => void;
  setCredits: (n: number) => void;
  setEntitlement: (token: string, tier: AppState["tier"]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  userId: "00000000-0000-4000-8000-000000000001",
  projectId: "00000000-0000-4000-8000-000000000010",
  tier: "designer",
  entitlementToken: "",
  creditsRemaining: 1000,

  selectedId: null,
  viewMode: "perspective",
  leftSidebarOpen: true,
  rightInspectorOpen: true,
  bottomPanelMode: "agent",

  walls: [],
  cabinets: [],
  openings: [],
  constraintViolations: [],

  agentMessages: [
    {
      role: "system",
      text: "KNB agent ready. All skills go through the central orchestrator.",
      ts: new Date().toISOString(),
    },
  ],
  agentBusy: false,
  lastResult: null,

  setSelectedId: (id) => set({ selectedId: id }),
  setViewMode: (m) => set({ viewMode: m }),
  setBottomPanelMode: (m) => set({ bottomPanelMode: m }),
  toggleLeftSidebar: () => set((s) => ({ leftSidebarOpen: !s.leftSidebarOpen })),
  toggleRightInspector: () => set((s) => ({ rightInspectorOpen: !s.rightInspectorOpen })),
  addAgentMessage: (role, text) =>
    set((s) => ({
      agentMessages: [...s.agentMessages, { role, text, ts: new Date().toISOString() }],
    })),
  setAgentBusy: (b) => set({ agentBusy: b }),
  setLastResult: (r) => set({ lastResult: r }),
  setCabinets: (c) => set({ cabinets: c }),
  setWalls: (w) => set({ walls: w }),
  setCredits: (n) => set({ creditsRemaining: n }),
  setEntitlement: (token, tier) => set({ entitlementToken: token, tier }),
}));
