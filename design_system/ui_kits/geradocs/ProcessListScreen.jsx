// GeraDocs UI kit — Processos list (recreation of src/views/ProcessList.tsx)
const DSP = window.GovProGeraDocsDesignSystem_11bcef;

const gdAll = [
  { id: "PROC-2024-089", title: "Aquisição de Equipamentos de TI", secretaria: "Secretaria de Educação", modalidade: "Pregão Eletrônico", status: "em_revisao", valor: "R$ 485.000,00", etp: "Completo", tr: "Em andamento", responsavel: "Maria Costa" },
  { id: "PROC-2024-088", title: "Contratação de Serviços de Limpeza", secretaria: "Secretaria de Obras", modalidade: "Pregão Eletrônico", status: "aguardando", valor: "R$ 120.000,00", etp: "Completo", tr: "Completo", responsavel: "João Silva" },
  { id: "PROC-2024-087", title: "Fornecimento de Material de Escritório", secretaria: "Administração Central", modalidade: "Dispensa", status: "aprovado", valor: "R$ 38.500,00", etp: "Completo", tr: "Completo", responsavel: "Ana Oliveira" },
  { id: "PROC-2024-086", title: "Serviços de Manutenção Predial", secretaria: "Secretaria de Saúde", modalidade: "Concorrência", status: "rascunho", valor: "R$ 210.000,00", etp: "Em andamento", tr: "Não iniciado", responsavel: "Carlos Lima" },
  { id: "PROC-2024-085", title: "Aquisição de Veículos Oficiais", secretaria: "Frota Municipal", modalidade: "Pregão Eletrônico", status: "concluido", valor: "R$ 920.000,00", etp: "Completo", tr: "Completo", responsavel: "Maria Costa" },
  { id: "PROC-2024-084", title: "Sistema de Gestão de RH", secretaria: "Secretaria de Adm.", modalidade: "Inexigibilidade", status: "em_revisao", valor: "R$ 750.000,00", etp: "Completo", tr: "Em revisão", responsavel: "Pedro Ramos" },
  { id: "PROC-2024-083", title: "Reforma Escola Municipal Centro", secretaria: "Secretaria de Educação", modalidade: "Concorrência", status: "aguardando", valor: "R$ 1.200.000,00", etp: "Completo", tr: "Completo", responsavel: "Ana Oliveira" },
  { id: "PROC-2024-082", title: "Aquisição de Uniformes Escolares", secretaria: "Secretaria de Educação", modalidade: "Pregão Eletrônico", status: "rejeitado", valor: "R$ 95.000,00", etp: "Completo", tr: "Rejeitado", responsavel: "João Silva" },
];

const gdFilters = [
  { key: "todos", label: "Todos" }, { key: "rascunho", label: "Rascunho" }, { key: "em_revisao", label: "Em Revisão" },
  { key: "aguardando", label: "Aguardando" }, { key: "aprovado", label: "Aprovado" }, { key: "concluido", label: "Concluído" }, { key: "rejeitado", label: "Rejeitado" },
];

function ProcessListScreen({ navigate }) {
  const [filter, setFilter] = React.useState("todos");
  const [search, setSearch] = React.useState("");
  const filtered = gdAll.filter((p) =>
    (filter === "todos" || p.status === filter) &&
    (search === "" || p.title.toLowerCase().includes(search.toLowerCase()) || p.id.toLowerCase().includes(search.toLowerCase())));

  return (
    <div style={{ padding: "28px" }} data-screen-label="Processos">
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 260px", maxWidth: 320 }}>
          <DSP.SearchInput placeholder="Buscar por título ou número..." value={search} onChange={(e) => setSearch(e.target.value)} background="#FFFFFF" width="100%" />
        </div>
        <DSP.FilterTabs options={gdFilters} active={filter} onChange={setFilter} />
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <DSP.Button variant="secondary">Filtros</DSP.Button>
          <DSP.Button variant="secondary">Exportar</DSP.Button>
        </div>
      </div>

      <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
              {["Processo / Objeto", "Secretaria", "Modalidade", "Valor Est.", "ETP", "TR", "Responsável", "Status"].map((h) => (
                <th key={h} style={{ padding: "11px 16px", textAlign: "left", fontSize: 11, color: "#94A3B8", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p, i) => (
              <tr key={p.id} onClick={() => navigate("etp-form", p.id)}
                style={{ borderBottom: i < filtered.length - 1 ? "1px solid #F8FAFC" : "none", cursor: "pointer" }}>
                <td style={{ padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#071A3D", maxWidth: 260 }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: "#94A3B8", fontFamily: "var(--font-mono)", marginTop: 3 }}>{p.id}</div>
                </td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: "#64748B", maxWidth: 160 }}>{p.secretaria}</td>
                <td style={{ padding: "14px 16px" }}><DSP.DocPill status={p.modalidade} bg="#EDF3FD" color="#1650C4" /></td>
                <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 600, color: "#0E3A94", fontFamily: "var(--font-mono)", whiteSpace: "nowrap" }}>{p.valor}</td>
                <td style={{ padding: "14px 16px" }}><DSP.DocPill status={p.etp} /></td>
                <td style={{ padding: "14px 16px" }}><DSP.DocPill status={p.tr} /></td>
                <td style={{ padding: "14px 16px", fontSize: 12, color: "#64748B" }}>{p.responsavel}</td>
                <td style={{ padding: "14px 16px" }}><DSP.StatusBadge status={p.status} size="sm" /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: 60, textAlign: "center", color: "#94A3B8" }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 500 }}>Nenhum processo encontrado</p>
          </div>
        )}
        <div style={{ padding: "12px 16px", borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, color: "#94A3B8" }}>Exibindo {filtered.length} de {gdAll.length} processos</span>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3].map((p) => (
              <button key={p} style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #E2E8F0", background: p === 1 ? "#071A3D" : "#FFFFFF", color: p === 1 ? "#FFFFFF" : "#64748B", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ProcessListScreen });
