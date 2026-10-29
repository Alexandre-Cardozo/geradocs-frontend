import React from "react";

/** Selectable card row (modalidade / ATA mode pickers): royal 2px border + tint when selected. */
export function ChoiceCard({ selected, onClick, icon, title, desc, size = "normal" }) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: size === "small" ? "12px 16px" : "16px 20px",
        borderRadius: 12, border: selected ? "2px solid var(--color-royal)" : "1px solid var(--color-border)",
        background: selected ? "#EDF3FD" : "#FFFFFF", cursor: "pointer",
        textAlign: "left", transition: "var(--transition-fast)", width: "100%",
      }}
    >
      {icon && <span style={{ display: "flex", alignItems: "center", flexShrink: 0, color: "var(--color-royal)" }}>{icon}</span>}
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: size === "small" ? 13 : 14, fontWeight: 700, color: "var(--text-body)", fontFamily: "var(--font-display)" }}>{title}</div>
        {desc && <div style={{ fontSize: size === "small" ? 12 : 13, color: "var(--text-secondary)", marginTop: 2 }}>{desc}</div>}
      </div>
      {selected && <CheckMark small={size === "small"} />}
    </button>
  );
}

/** Filled royal circle with white check. */
export function CheckMark({ small }) {
  const s = small ? 16 : 20;
  return (
    <div style={{ width: s, height: s, borderRadius: 999, background: "var(--color-royal)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
      <svg width={small ? 9 : 11} height={small ? 9 : 11} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  );
}
