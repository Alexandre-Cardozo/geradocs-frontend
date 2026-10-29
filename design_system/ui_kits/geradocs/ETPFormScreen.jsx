// GeraDocs UI kit — ETP editor (recreation of src/views/ETPForm.tsx, abbreviated)
const DSE = window.GovProGeraDocsDesignSystem_11bcef;

const etpSections = [
  { id: "1", title: "Descrição da Necessidade", status: "completo", required: true },
  { id: "2", title: "Área Requisitante", status: "completo", required: true },
  { id: "3", title: "Descrição dos Requisitos", status: "completo", required: true },
  { id: "4", title: "Estimativa das Quantidades", status: "em_andamento", required: true },
  { id: "5", title: "Estimativa do Valor", status: "em_andamento", required: true },
  { id: "6", title: "Soluções Disponíveis no Mercado", status: "pendente", required: true },
  { id: "7", title: "Justificativa para Contratação", status: "pendente", required: true },
  { id: "8", title: "Análise da Viabilidade", status: "pendente", required: true },
  { id: "9", title: "Declaração de Viabilidade", status: "pendente", required: true },
  { id: "10", title: "Responsável Técnico", status: "pendente", required: true },
  { id: "11", title: "Sustentabilidade", status: "pendente", required: false },
  { id: "12", title: "Posicionamento Conclusivo", status: "pendente", required: false },
];
const etpStatusMap = {
  completo: { dot: "#0B7A38", bg: "#EAF7EF", color: "#0B6B33" },
  em_andamento: { dot: "#1F5FD6", bg: "#EDF3FD", color: "#1650C4" },
  pendente: { dot: "#94A3B8", bg: "#F1F5F9", color: "#475569" },
};
const etpDone = etpSections.filter((s) => s.status === "completo").length;
const etpProgress = Math.round((etpDone / etpSections.length) * 100);

function ETPFormScreen({ navigate }) {
  const [active, setActive] = React.useState("4");
  const [saved, setSaved] = React.useState(false);
  const [showATA, setShowATA] = React.useState(false);
  const [ataMode, setAtaMode] = React.useState("");
  const [ataFile, setAtaFile] = React.useState(null);
  const [review, setReview] = React.useState(null);
  const sec = etpSections.find((s) => s.id === active);
  const save = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  const ataOptions = [
    { key: "attach", label: "Anexar ATA para revisão pela IA", desc: "Envie a ATA que deseja utilizar. A IA verificará validade, compatibilidade e emitirá parecer." },
    { key: "delegate", label: "Delegar ao modelo a busca de ATAs válidas", desc: "A IA buscará ATAs compatíveis com o objeto. Você visualizará as origens e selecionará a desejada." },
    { key: "both", label: "Anexar ATA e buscar outras opções", desc: "A IA revisará sua ATA e também sugerirá alternativas encontradas para comparação." },
  ];

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }} data-screen-label="ETP Editor">
      <div style={{ width: 280, minWidth: 280, background: "#FFFFFF", borderRight: "1px solid #E2E8F0", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid #F1F5F9" }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "#94A3B8" }}>PROC-2024-089</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#071A3D", marginTop: 2, lineHeight: 1.3 }}>Aquisição de Equip. de TI</div>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>Secretaria de Educação</div>
          </div>
          <DSE.ProgressBar percent={etpProgress} label="Progresso do ETP" sub={`${etpDone} de ${etpSections.length} seções concluídas`} />
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
          {etpSections.map((s) => {
            const sc = etpStatusMap[s.status];
            const isActive = active === s.id;
            return (
              <button key={s.id} onClick={() => setActive(s.id)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "10px 10px", borderRadius: 8, border: isActive ? "1px solid #C3D5F6" : "1px solid transparent", background: isActive ? "#EDF3FD" : "transparent", cursor: "pointer", textAlign: "left", marginBottom: 2, fontFamily: "var(--font-body)" }}>
                <div style={{ width: 22, height: 22, borderRadius: 6, background: sc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 10, fontWeight: 700, color: sc.color, fontFamily: "var(--font-mono)" }}>
                  {s.status === "completo" ? (
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={sc.dot} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : s.id}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: isActive ? 600 : 500, color: isActive ? "#1650C4" : "#374151", lineHeight: 1.3 }}>
                    {s.title}{!s.required && <span style={{ fontSize: 10, color: "#94A3B8", marginLeft: 5 }}>Opt.</span>}
                  </div>
                </div>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: sc.dot, flexShrink: 0 }} />
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "#F8FAFC" }}>
        <div style={{ background: "#FFFFFF", borderBottom: "1px solid #E2E8F0", padding: "14px 24px", display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 2 }}>Seção {sec.id} de {etpSections.length}</div>
            <h2 style={{ margin: 0, fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "#071A3D", letterSpacing: "-0.3px" }}>{sec.title}</h2>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <DSE.Button variant="secondary" size="sm">Orientações</DSE.Button>
            <DSE.Button variant={saved ? "success" : "primary"} size="sm" onClick={save}>{saved ? "Salvo!" : "Salvar"}</DSE.Button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "24px" }}>
          {active === "4" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <DSE.SectionBlock title="Estimativa das Quantidades" hint="Informe as quantidades estimadas com base no histórico de consumo, demanda projetada ou levantamentos realizados pela área técnica.">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <DSE.FormField label="Quantidade Estimada" required><DSE.Input defaultValue="150" /></DSE.FormField>
                  <DSE.FormField label="Unidade de Medida" required><DSE.Select options={["Unidade", "Serviço", "Metro Quadrado", "Licença"]} /></DSE.FormField>
                  <DSE.FormField label="Período de Vigência" required><DSE.Select options={["12 meses", "24 meses", "36 meses"]} /></DSE.FormField>
                </div>
                <div style={{ marginTop: 16 }}>
                  <DSE.FormField label="Memória de Cálculo" hint="Descreva a metodologia utilizada para estimar as quantidades">
                    <DSE.Textarea rows={3} placeholder="Ex: Quantidade estimada com base no levantamento realizado junto às 30 unidades escolares da rede municipal..." />
                  </DSE.FormField>
                </div>
              </DSE.SectionBlock>
              <DSE.SectionBlock title="Estimativa do Valor" hint="Baseie-se em pesquisas de mercado, contratos anteriores ou painel de preços do governo federal.">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <DSE.FormField label="Valor Unitário Estimado (R$)" required><DSE.Input prefix="R$" defaultValue="3.233,33" /></DSE.FormField>
                  <DSE.FormField label="Valor Total Estimado (R$)">
                    <div style={{ padding: "10px 13px", border: "1px solid #E2E8F0", borderRadius: 8, background: "#F8FAFC", color: "#0E3A94", fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 14 }}>R$ 485.000,00</div>
                  </DSE.FormField>
                </div>
              </DSE.SectionBlock>
            </div>
          ) : (
            <DSE.SectionBlock title={sec.title} hint="Preencha as informações desta seção conforme as orientações metodológicas do ETP.">
              {sec.status === "completo" ? (
                <DSE.ValidationMsg type="ok" msg="Esta seção foi preenchida e validada. Clique para revisar o conteúdo." />
              ) : (
                <DSE.Textarea rows={6} placeholder="Preencha o conteúdo desta seção..." />
              )}
            </DSE.SectionBlock>
          )}

          {active === "6" && (
            <div style={{ marginTop: 20 }}>
              <div style={{ background: "linear-gradient(135deg, #1E3A5F 0%, #0E3A94 100%)", borderRadius: 12, padding: "18px 20px", display: "flex", alignItems: "flex-start", gap: 16 }}>
                <div style={{ width: 36, height: 36, background: "rgba(76,147,255,0.15)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4C93FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", fontFamily: "var(--font-display)", marginBottom: 4 }}>A solução proposta é Adesão de ATA?</div>
                  <p style={{ margin: 0, fontSize: 13, color: "rgba(255,255,255,0.65)" }}>Se o ETP concluir que a solução mais vantajosa é a Adesão de Ata de Registro de Preços, configure a ATA aqui para que o modelo possa validar ou encontrar opções adequadas.</p>
                </div>
                <DSE.Button variant="primary" size="sm" onClick={() => setShowATA(!showATA)}>{showATA ? "Fechar" : "Configurar ATA"}</DSE.Button>
              </div>
              {showATA && (
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "20px 22px", marginTop: 10 }}>
                  <h4 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, color: "#071A3D", margin: "0 0 4px" }}>Gestão da Ata de Registro de Preços</h4>
                  <p style={{ margin: "0 0 16px", fontSize: 13, color: "#64748B" }}>Escolha como deseja proceder com a ATA para este processo.</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                    {ataOptions.map((opt) => (
                      <DSE.ChoiceCard key={opt.key} size="small" selected={ataMode === opt.key} onClick={() => setAtaMode(opt.key)} title={opt.label} desc={opt.desc} />
                    ))}
                  </div>
                  {(ataMode === "attach" || ataMode === "both") && (
                    <div style={{ marginBottom: 16 }}>
                      <DSE.FormField label="Anexar ATA" required>
                        <DSE.FileUpload file={ataFile} onChange={(f) => { setAtaFile(f); setReview(null); }} placeholder="Clique para selecionar a ATA (PDF ou DOCX)" />
                      </DSE.FormField>
                      {ataFile && review === null && (
                        <div style={{ marginTop: 10 }}>
                          <DSE.Button variant="primary" size="sm" onClick={() => { setReview("loading"); setTimeout(() => setReview("done"), 2200); }}>Enviar para revisão pela IA</DSE.Button>
                        </div>
                      )}
                      {review === "loading" && (
                        <div style={{ marginTop: 10, background: "#EDF3FD", borderRadius: 8, padding: "12px 16px", fontSize: 13, color: "#1650C4" }}>Analisando ATA... aguarde.</div>
                      )}
                      {review === "done" && (
                        <div style={{ marginTop: 10, background: "#EAF7EF", border: "1px solid #A7F3D0", borderRadius: 10, padding: "14px 16px" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#0B6B33", marginBottom: 6 }}>Parecer da IA — ATA Válida</div>
                          <p style={{ margin: 0, fontSize: 12, color: "#047857", lineHeight: 1.6 }}>A ATA analisada está vigente, com objeto compatível ao ETP e dentro dos limites legais para adesão (Art. 86 da Lei 14.133/21). Prazo de vigência: 30/11/2025. Órgão gerenciador: Governo do Estado de São Paulo. Nenhuma irregularidade identificada.</p>
                        </div>
                      )}
                    </div>
                  )}
                  {ataMode === "delegate" && (
                    <DSE.InfoBanner tone="info">O modelo realizará a busca de ATAs compatíveis após a confirmação. Os resultados — com origem, órgão gerenciador e validade — ficarão disponíveis neste processo para sua seleção.</DSE.InfoBanner>
                  )}
                  {ataMode !== "" && <div style={{ marginTop: 14 }}><DSE.Button variant="dark" size="sm">Confirmar configuração da ATA</DSE.Button></div>}
                </div>
              )}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
            <DSE.Button variant="secondary" size="sm" disabled={active === "1"}
              onClick={() => { const i = etpSections.findIndex((s) => s.id === active); if (i > 0) setActive(etpSections[i - 1].id); }}>
              ← Seção Anterior
            </DSE.Button>
            {active === "12" ? (
              <DSE.Button variant="success" size="sm" onClick={() => navigate("processes")}>Finalizar e Gerar Documento</DSE.Button>
            ) : (
              <DSE.Button variant="primary" size="sm"
                onClick={() => { save(); const i = etpSections.findIndex((s) => s.id === active); if (i < etpSections.length - 1) setActive(etpSections[i + 1].id); }}>
                Salvar e Avançar →
              </DSE.Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { ETPFormScreen });
