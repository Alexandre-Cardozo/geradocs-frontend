// GeraDocs UI kit — Novo Processo wizard (recreation of src/views/NewProcess.tsx, abbreviated)
const DSN = window.GovProGeraDocsDesignSystem_11bcef;

const npIcon = (children) => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>
);

const gdModalidades = [
  { key: "pregao", label: "Pregão Eletrônico", desc: "Para aquisição de bens e serviços comuns", icon: npIcon(<React.Fragment><circle cx="9" cy="21" r="1" /><circle cx="20" cy="21" r="1" /><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" /></React.Fragment>) },
  { key: "concorrencia", label: "Concorrência", desc: "Para obras, serviços e compras de grande vulto", icon: npIcon(<path d="M3 21h18M9 8h1M9 12h1M9 16h1M14 8h1M14 12h1M14 16h1M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16" />) },
  { key: "dispensa", label: "Dispensa de Licitação", desc: "Casos previstos no Art. 75 da Lei 14.133/21", icon: npIcon(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />) },
  { key: "inexigibilidade", label: "Inexigibilidade", desc: "Quando a competição é inviável", icon: npIcon(<React.Fragment><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></React.Fragment>) },
  { key: "credenciamento", label: "Credenciamento", desc: "Para seleção de prestadores de serviços", icon: npIcon(<React.Fragment><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /></React.Fragment>) },
];

const gdSecretarias = ["Secretaria de Educação", "Secretaria de Saúde", "Secretaria de Obras e Infraestrutura", "Secretaria de Administração", "Secretaria de Finanças", "Frota Municipal", "Administração Central"];

function NewProcessScreen({ navigate }) {
  const [step, setStep] = React.useState(1);
  const [modalidade, setModalidade] = React.useState("");
  const [adesao, setAdesao] = React.useState(false);
  const [ataMode, setAtaMode] = React.useState("");
  const [ataMotivo, setAtaMotivo] = React.useState("");
  const [ataFile, setAtaFile] = React.useState(null);
  const [secretaria, setSecretaria] = React.useState("");
  const [objeto, setObjeto] = React.useState("");
  const [dfdFile, setDfdFile] = React.useState(null);
  const [docs, setDocs] = React.useState({ etp: true, tr: true, cotacao: false, mapa: false });
  const [verifDFD, setVerifDFD] = React.useState(false);
  const [retif, setRetif] = React.useState(false);

  const dfdOrObjeto = dfdFile !== null || objeto.trim() !== "";
  const canProceed =
    (step === 1 && modalidade !== "" && (!adesao || (ataMode !== "" && ataMotivo.trim() !== ""))) ||
    (step === 2 && secretaria !== "" && dfdOrObjeto) || step === 3;

  const ataOptions = [
    { key: "attach", label: "Anexar ATA para revisão pela IA", desc: "A plataforma analisará a ATA enviada e verificará sua compatibilidade com o objeto." },
    { key: "delegate", label: "Delegar ao modelo a busca de ATAs válidas", desc: "A IA buscará ATAs compatíveis; você poderá visualizar as origens e selecionar." },
    { key: "both", label: "Anexar ATA e também buscar outras opções", desc: "A IA revisa sua ATA e ainda sugere alternativas encontradas." },
  ];

  const docOptions = [
    { key: "etp", title: "Estudo Técnico Preliminar (ETP)", desc: "Fundamenta a necessidade e os requisitos técnicos da contratação", obrig: true, sections: 12, color: "#2563EB", bg: "#EFF6FF" },
    { key: "tr", title: "Termo de Referência (TR)", desc: "Define as condições para execução do objeto da licitação", obrig: true, sections: 15, color: "#0D9488", bg: "#F0FDFA" },
    { key: "cotacao", title: "Cotação de Mercado", desc: "Pesquisa de preços com fornecedores para embasar a estimativa de valor", obrig: false, sections: 4, color: "#7C3AED", bg: "#F5F3FF" },
    { key: "mapa", title: "Mapa de Riscos", desc: "Avaliação e classificação dos riscos envolvidos na contratação", obrig: false, sections: 5, color: "#B45309", bg: "#FFFBEB" },
  ];

  const h2 = { fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "#071A3D", margin: "0 0 6px", letterSpacing: "-0.5px" };
  const sub = { margin: "0 0 24px", fontSize: 14, color: "#64748B" };

  return (
    <div style={{ padding: "28px", maxWidth: 880 }} data-screen-label="Novo Processo">
      <div style={{ marginBottom: 36 }}>
        <DSN.StepIndicator steps={["Modalidade", "Identificação", "Documentos"]} current={step} />
      </div>

      {step === 1 && (
        <div>
          <h2 style={h2}>Selecione a Modalidade</h2>
          <p style={sub}>Escolha a modalidade de licitação de acordo com o objeto e os valores estimados.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {gdModalidades.map((m) => (
              <DSN.ChoiceCard key={m.key} selected={modalidade === m.key} onClick={() => setModalidade(m.key)} icon={m.icon} title={m.label} desc={m.desc} />
            ))}
          </div>
          <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ paddingTop: 2 }}><DSN.Toggle checked={adesao} onChange={setAdesao} /></div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: "#071A3D", fontFamily: "var(--font-display)" }}>Este processo será instaurado como Adesão de Ata de Registro de Preços</div>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>Ative caso a solução já seja previamente definida como Adesão de ATA. O modelo será orientado a gerar o ETP com essa conclusão.</p>
              </div>
            </div>
            {adesao && (
              <div style={{ marginTop: 18, borderTop: "1px solid #F1F5F9", paddingTop: 18, display: "flex", flexDirection: "column", gap: 16 }}>
                <DSN.FormField label="Motivo da decisão prévia pela Adesão de ATA" required hint="Justifique por que a Adesão de ATA já foi definida antes do ETP">
                  <DSN.Textarea rows={3} value={ataMotivo} onChange={(e) => setAtaMotivo(e.target.value)} placeholder="Ex: Existe ATA vigente do PNCP com objeto compatível e condições vantajosas devidamente comprovadas..." />
                </DSN.FormField>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Gestão da ATA</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {ataOptions.map((opt) => (
                      <DSN.ChoiceCard key={opt.key} size="small" selected={ataMode === opt.key} onClick={() => setAtaMode(opt.key)} title={opt.label} desc={opt.desc} />
                    ))}
                  </div>
                </div>
                {(ataMode === "attach" || ataMode === "both") && (
                  <DSN.FormField label="Anexar ATA" hint="Formatos aceitos: PDF, DOCX">
                    <DSN.FileUpload file={ataFile} onChange={setAtaFile} placeholder="Clique para selecionar a ATA ou arraste o arquivo" accept=".pdf,.docx" />
                  </DSN.FormField>
                )}
                {ataMode === "delegate" && (
                  <DSN.InfoBanner tone="info">O modelo realizará a busca de ATAs após o processo ser criado. Os resultados ficarão disponíveis na aba de Processos para sua análise e seleção.</DSN.InfoBanner>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <h2 style={h2}>Identificação do Processo</h2>
          <p style={sub}>Informe os dados básicos. É obrigatório preencher ao menos o DFD ou o Objeto da Contratação.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <DSN.FormField label="Secretaria Requisitante" required>
              <DSN.Select value={secretaria} onChange={(e) => setSecretaria(e.target.value)} placeholder="Selecione a secretaria..." options={gdSecretarias} />
            </DSN.FormField>
            <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>
                  Documento de Formalização de Demanda (DFD)
                  <span style={{ fontSize: 11, background: "#FFFBEB", color: "#92400E", borderRadius: 6, padding: "2px 7px", fontWeight: 600, marginLeft: 8 }}>Recomendado</span>
                </label>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748B" }}>O DFD alimentará automaticamente as seções do ETP. Caso não possua, preencha o campo Objeto abaixo.</p>
              </div>
              <DSN.FileUpload file={dfdFile} onChange={setDfdFile} placeholder="Clique para selecionar o DFD ou arraste o arquivo aqui" accept=".pdf,.docx,.doc" />
              {dfdFile && (
                <div style={{ marginTop: 10 }}>
                  <DSN.ValidationMsg type="ok" msg="DFD anexado — o ETP será gerado com base neste documento." />
                </div>
              )}
            </div>
            <DSN.FormField label="Objeto da Contratação" required={!dfdFile}
              hint={dfdFile ? "Opcional quando o DFD é inserido — use como complemento ou detalhamento" : "Obrigatório quando o DFD não é inserido"}>
              <DSN.Textarea rows={3} value={objeto} onChange={(e) => setObjeto(e.target.value)} placeholder="Ex: Aquisição de equipamentos de informática para as unidades escolares da rede municipal..." />
            </DSN.FormField>
            {!dfdOrObjeto && <DSN.InfoBanner tone="danger">Preencha ao menos o DFD ou o Objeto da Contratação para continuar.</DSN.InfoBanner>}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <DSN.FormField label="Valor de Referência Estimado"><DSN.Input placeholder="R$ 0,00" /></DSN.FormField>
              <DSN.FormField label="Fundamento Legal"><DSN.Input placeholder="Ex: Art. 75, II, Lei 14.133/21" /></DSN.FormField>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <h2 style={h2}>Configurar Processo</h2>
          <p style={sub}>Selecione os documentos a gerar e configure as fases opcionais do processo.</p>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 12 }}>Documentos a Gerar</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {docOptions.map((d) => {
                const selected = docs[d.key];
                return (
                  <button key={d.key} onClick={() => { if (!d.obrig) setDocs((p) => ({ ...p, [d.key]: !p[d.key] })); }}
                    style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "16px 18px", borderRadius: 12, border: selected ? `2px solid ${d.color}` : "1px solid #E2E8F0", background: selected ? d.bg : "#FFFFFF", cursor: d.obrig ? "default" : "pointer", textAlign: "left", fontFamily: "var(--font-body)" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "#071A3D", fontFamily: "var(--font-display)" }}>{d.title}</span>
                        {d.obrig && <DSN.Tag tone="success">Obrigatório</DSN.Tag>}
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>{d.desc}</p>
                      <p style={{ margin: "5px 0 0", fontSize: 11, color: "#94A3B8" }}>{d.sections} seções</p>
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: 6, border: `2px solid ${selected ? d.color : "#E2E8F0"}`, background: selected ? d.color : "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 8 }}>
                      {selected && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 13, fontWeight: 600, color: "#374151", display: "block", marginBottom: 12 }}>Fases Opcionais do Processo</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ background: "#FFFFFF", border: `1px solid ${verifDFD ? "#2563EB" : "#E2E8F0"}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ paddingTop: 2 }}><DSN.Toggle checked={verifDFD} onChange={setVerifDFD} /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#071A3D", fontFamily: "var(--font-display)" }}>Verificação do DFD pela IA</span>
                      <DSN.Tag tone="info">Antes do ETP</DSN.Tag>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>Antes de iniciar o ETP, o DFD será analisado pela IA que fornecerá parecer sobre qualidade, completude e compatibilidade com a legislação.</p>
                  </div>
                </div>
              </div>
              <div style={{ background: "#FFFFFF", border: `1px solid ${retif ? "#7C3AED" : "#E2E8F0"}`, borderRadius: 12, padding: "16px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ paddingTop: 2 }}><DSN.Toggle checked={retif} onChange={setRetif} color="#7C3AED" /></div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "#071A3D", fontFamily: "var(--font-display)" }}>Fase de Retificação</span>
                      <DSN.Tag tone="violet">Opcional</DSN.Tag>
                    </div>
                    <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>Inclui uma fase de retificação no fluxo do processo, permitindo a correção de documentos após a geração quando identificadas inconsistências ou necessidade de ajustes.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <DSN.InfoBanner tone="warning">O processo será criado com o número <strong>PROC-2024-090</strong>. {verifDFD ? "Após a criação você será direcionado à verificação do DFD pela IA." : "Após a criação você será direcionado ao preenchimento do ETP."}</DSN.InfoBanner>
        </div>
      )}

      <div style={{ display: "flex", gap: 12, marginTop: 32 }}>
        {step > 1 && <DSN.Button variant="secondary" size="lg" onClick={() => setStep((s) => s - 1)}>Voltar</DSN.Button>}
        <DSN.Button variant="primary" size="lg" disabled={!canProceed}
          onClick={() => { if (step < 3) setStep((s) => s + 1); else navigate("etp-form", "PROC-2024-090"); }}>
          {step === 3 ? (verifDFD ? "Criar Processo e Verificar DFD →" : "Criar Processo e Iniciar ETP →") : "Continuar →"}
        </DSN.Button>
      </div>
    </div>
  );
}

Object.assign(window, { NewProcessScreen });
