import React from "react";

const map = {
  "Completo": { bg: "#EAF7EF", color: "#0B6B33" },
  "Em andamento": { bg: "#EDF3FD", color: "#1650C4" },
  "Em revisão": { bg: "#FFF8E1", color: "#5C4300" },
  "Rejeitado": { bg: "#FEF2F2", color: "#991B1B" },
  "Não iniciado": { bg: "#F1F5F9", color: "#475569" },
};

/** Small square-ish pill for per-document states (ETP/TR columns) and generic tags. */
export function DocPill({ status, bg, color }) {
  const c = map[status] || (bg ? { bg, color } : map["Não iniciado"]);
  return (
    <span style={{
      fontSize: 11, background: c.bg, color: c.color, borderRadius: 6,
      padding: "2px 8px", fontWeight: 600, whiteSpace: "nowrap", display: "inline-block",
    }}>
      {status}
    </span>
  );
}

/** Micro tag: Obrigatório / Opcional / Recomendado / Urgente etc. */
export function Tag({ children, tone = "info" }) {
  const tones = {
    info: { bg: "#EDF3FD", color: "#1650C4" },
    success: { bg: "#EAF7EF", color: "#0B6B33" },
    warning: { bg: "#FFF8E1", color: "#5C4300" },
    danger: { bg: "#FEF2F2", color: "#991B1B" },
    violet: { bg: "#F5F3FF", color: "#6D28D9" },
    neutral: { bg: "#F1F5F9", color: "#475569" },
  };
  const c = tones[tone] || tones.info;
  return (
    <span style={{ fontSize: 10, background: c.bg, color: c.color, borderRadius: 6, padding: "2px 7px", fontWeight: 700, whiteSpace: "nowrap", display: "inline-block" }}>
      {children}
    </span>
  );
}
