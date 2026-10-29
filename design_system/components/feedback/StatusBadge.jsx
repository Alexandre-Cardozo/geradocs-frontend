import React from "react";

const config = {
  rascunho: { label: "Rascunho", bg: "#F1F5F9", color: "#475569", dot: "#94A3B8" },
  em_revisao: { label: "Em Revisão", bg: "#EAF2FF", color: "#0E3A94", dot: "#4C93FF" },
  aguardando: { label: "Aguardando", bg: "#FFF8E1", color: "#5C4300", dot: "#F0A500" },
  aprovado: { label: "Aprovado", bg: "#EAF7EF", color: "#0B6B33", dot: "#0B7A38" },
  rejeitado: { label: "Rejeitado", bg: "#FEF2F2", color: "#991B1B", dot: "#EF4444" },
  concluido: { label: "Concluído", bg: "#EAF7EF", color: "#0B6B33", dot: "#14A04B" },
};

/** Process status pill with colored dot. Verbatim recreation of src/components/StatusBadge.tsx. */
export function StatusBadge({ status, size = "md" }) {
  const c = config[status] || config.rascunho;
  const pad = size === "sm" ? "2px 8px" : "3px 10px";
  const fs = size === "sm" ? 11 : 12;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      background: c.bg, color: c.color, borderRadius: 999,
      padding: pad, fontSize: fs, fontWeight: 600, letterSpacing: "0.1px", whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: 999, background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  );
}
