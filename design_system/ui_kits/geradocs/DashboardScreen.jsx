// GeraDocs UI kit — Dashboard (recreation of src/views/Dashboard.tsx)
const DS = window.GovProGeraDocsDesignSystem_11bcef;

function GDIcon({ d, poly, extra, size = 20, sw = 2 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      {d && <path d={d} />}
      {poly && poly.map((p, i) => <polyline key={i} points={p} />)}
      {extra}
    </svg>
  );
}

const gdStats = [
  { label: "Processos Ativos", value: "24", sub: "+3 este mês", trend: "up", color: "#2563EB", bg: "#EFF6FF", icon: <GDIcon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" poly={["14 2 14 8 20 8"]} /> },
  { label: "Aguardando Aprovação", value: "7", sub: "3 com urgência", trend: "warn", color: "#D97706", bg: "#FFFBEB", icon: <GDIcon extra={<React.Fragment><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></React.Fragment>} /> },
  { label: "Documentos Gerados", value: "138", sub: "12 esta semana", trend: "up", color: "#0D9488", bg: "#F0FDFA", icon: <GDIcon d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" poly={["7 10 12 15 17 10"]} extra={<line x1="12" y1="15" x2="12" y2="3" />} /> },
  { label: "ETPs Concluídos", value: "61", sub: "Taxa de conclusão: 89%", trend: "up", color: "#16A34A", bg: "#F0FDF4", icon: <GDIcon d="M22 11.08V12a10 10 0 1 1-5.93-9.14" poly={["22 4 12 14.01 9 11.01"]} /> },
];

const gdRecent = [
  { id: "PROC-2024-089", title: "Aquisição de Equipamentos de TI", secretaria: "Secretaria de Educação", status: "em_revisao", valor: "R$ 485.000,00", date: "05/07/2024" },
  { id: "PROC-2024-088", title: "Contratação de Serviços de Limpeza", secretaria: "Secretaria de Obras", status: "aguardando", valor: "R$ 120.000,00", date: "04/07/2024" },
  { id: "PROC-2024-087", title: "Fornecimento de Material de Escritório", secretaria: "Administração Central", status: "aprovado", valor: "R$ 38.500,00", date: "03/07/2024" },
  { id: "PROC-2024-086", title: "Serviços de Manutenção Predial", secretaria: "Secretaria de Saúde", status: "rascunho", valor: "R$ 210.000,00", date: "02/07/2024" },
  { id: "PROC-2024-085", title: "Aquisição de Veículos Oficiais", secretaria: "Frota Municipal", status: "concluido", valor: "R$ 920.000,00", date: "01/07/2024" },
];

const gdPending = [
  { id: "PROC-2024-088", label: "Contratação de Serviços de Limpeza", type: "ETP", urgente: true },
  { id: "PROC-2024-083", label: "Sistema de Gestão de RH", type: "TR", urgente: true },
  { id: "PROC-2024-081", label: "Reforma Escola Municipal Centro", type: "ETP", urgente: false },
];

function GDRow({ p, onClick }) {
  const [h, setH] = React.useState(false);
  return (
    <tr onClick={onClick} onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ cursor: "pointer", borderBottom: "1px solid #F8FAFC", background: h ? "#F8FAFC" : "transparent", transition: "background 0.1s" }}>
      <td style={{ padding: "13px 16px" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "#071A3D" }}>{p.title}</div>
        <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "var(--font-mono)", marginTop: 2 }}>{p.id}</div>
      </td>
      <td style={{ padding: "13px 16px", fontSize: 12, color: "#64748B" }}>{p.secretaria}</td>
      <td style={{ padding: "13px 16px", fontSize: 13, fontWeight: 600, color: "#0D3B66", fontFamily: "var(--font-mono)" }}>{p.valor}</td>
      <td style={{ padding: "13px 16px" }}><DS.StatusBadge status={p.status} size="sm" /></td>
      <td style={{ padding: "13px 16px", fontSize: 12, color: "#94A3B8" }}>{p.date}</td>
    </tr>
  );
}

function DashboardScreen({ navigate }) {
  return (
    <div style={{ padding: "28px", maxWidth: 1200 }} data-screen-label="Dashboard">
      <div style={{ marginBottom: 28, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
        <div>
          <p style={{ margin: 0, fontSize: 13, color: "#64748B", marginBottom: 4 }}>Quinta-feira, 09 de julho de 2026</p>
          <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "#071A3D", letterSpacing: "-0.5px" }}>Bom dia, Maria</h2>
        </div>
        <DS.Button variant="primary" size="lg" onClick={() => navigate("new-process")}
          icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>}>
          Novo Processo de Contratação
        </DS.Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
        {gdStats.map((s) => <DS.StatCard key={s.label} {...s} />)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20 }}>
        <DS.CardPanel title="Processos Recentes"
          action={<button onClick={() => navigate("processes")} style={{ fontSize: 13, color: "#2563EB", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>Ver todos →</button>}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                {["Processo", "Secretaria", "Valor Est.", "Status", "Data"].map((h) => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, color: "#94A3B8", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", borderBottom: "1px solid #F1F5F9" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gdRecent.map((p) => <GDRow key={p.id} p={p} onClick={() => navigate("etp-form", p.id)} />)}
            </tbody>
          </table>
        </DS.CardPanel>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "18px 18px", borderBottom: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <h3 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#071A3D" }}>Pendentes de Aprovação</h3>
              <span style={{ background: "#FEF2F2", color: "#EF4444", fontSize: 11, fontWeight: 700, borderRadius: 999, padding: "2px 8px" }}>{gdPending.length}</span>
            </div>
            <div style={{ padding: "8px 0" }}>
              {gdPending.map((item) => (
                <div key={item.id} onClick={() => navigate("approvals")}
                  style={{ padding: "12px 18px", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}>
                  <div style={{ width: 32, height: 32, background: "#EFF6FF", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: "#2563EB", fontFamily: "var(--font-mono)" }}>{item.type}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#071A3D", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "var(--font-mono)", marginTop: 2 }}>{item.id}</div>
                  </div>
                  {item.urgente && <DS.Tag tone="warning">Urgente</DS.Tag>}
                </div>
              ))}
            </div>
            <div style={{ padding: "12px 18px", borderTop: "1px solid #F1F5F9" }}>
              <button onClick={() => navigate("approvals")} style={{ width: "100%", padding: "9px", background: "#EFF6FF", color: "#2563EB", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "var(--font-body)" }}>
                Ver todas as aprovações
              </button>
            </div>
          </div>

          <div style={{ background: "#071A3D", borderRadius: 12, padding: "20px 18px" }}>
            <h3 style={{ margin: "0 0 14px", fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#FFFFFF" }}>Ações Rápidas</h3>
            {[
              { label: "Novo ETP", desc: "Estudo Técnico Preliminar", icon: <GDIcon size={18} d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" extra={<rect x="8" y="2" width="8" height="4" rx="1" />} /> },
              { label: "Novo TR", desc: "Termo de Referência", icon: <GDIcon size={18} d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" poly={["14 2 14 8 20 8"]} extra={<React.Fragment><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></React.Fragment>} /> },
              { label: "Consultar PNCP", desc: "Portal Nacional de Contratações", icon: <GDIcon size={18} extra={<React.Fragment><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></React.Fragment>} /> },
            ].map((a) => (
              <button key={a.label} onClick={() => navigate("new-process")}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 9, cursor: "pointer", marginBottom: 8, textAlign: "left", fontFamily: "var(--font-body)" }}>
                <span style={{ color: "#38BDF8", display: "flex", flexShrink: 0 }}>{a.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#FFFFFF" }}>{a.label}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>{a.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DashboardScreen, GDIcon });
