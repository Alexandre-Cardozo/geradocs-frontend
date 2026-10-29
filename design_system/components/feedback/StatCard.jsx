import React from "react";

/** Dashboard KPI card: icon chip, trend chip, 30px number. */
export function StatCard({ label, value, sub, trend = "up", icon, color = "#1F5FD6", bg = "#EDF3FD" }) {
  const warn = trend === "warn";
  return (
    <div style={{ background: "var(--surface-card)", border: "var(--border-default)", borderRadius: "var(--radius-card)", padding: "20px 20px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ width: 40, height: 40, background: bg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", color: color }}>
          {icon}
        </div>
        {sub && (
          <span style={{ fontSize: 11, color: warn ? "#D97706" : "#16A34A", background: warn ? "#FFFBEB" : "#EAF7EF", borderRadius: 6, padding: "2px 7px", fontWeight: 600 }}>
            {warn ? "!" : "↑"} {sub}
          </span>
        )}
      </div>
      <div style={{ fontSize: 30, fontWeight: 800, color: "var(--text-body)", fontFamily: "var(--font-display)", letterSpacing: "-1px", lineHeight: 1 }}>
        {value}
      </div>
      <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

/** ETP completion progress bar with gradient fill. */
export function ProgressBar({ percent, label, sub }) {
  return (
    <div>
      {(label || percent != null) && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-label)" }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--color-royal)" }}>{percent}%</span>
        </div>
      )}
      <div style={{ height: 6, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${percent}%`, height: "100%", background: "var(--gradient-progress)", borderRadius: 999, transition: "width 0.5s" }} />
      </div>
      {sub && <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 5 }}>{sub}</div>}
    </div>
  );
}
