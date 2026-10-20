/**
 * Placeholder for future skill UI.
 * Keeps the layout stable while logic is added one plugin at a time.
 */

import React from "react";

export function PlaceholderSection({
  label,
  note,
}: {
  label: string;
  note?: string;
}) {
  return (
    <div
      style={{
        padding: "6px 10px",
        marginBottom: 4,
        background: "#1a1a1e",
        border: "1px dashed #3f3f46",
        borderRadius: 4,
        color: "#52525b",
        fontSize: 11,
      }}
      title={note}
    >
      <div>{label}</div>
      {note && (
        <div style={{ fontSize: 10, color: "#3f3f46", marginTop: 2 }}>{note}</div>
      )}
    </div>
  );
}
