"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Button,
  ChoiceCard,
  Dropdown,
  FileUpload,
  FormField,
  InfoBanner,
  MoneyInput,
  Input,
  StepIndicator,
  Tag,
  Textarea,
  Toggle,
  ValidationMsg,
} from "@/components/ui";
import {
  IconBuilding,
  IconCart,
  IconCheck,
  IconClipboard,
  IconFile,
  IconGavel,
  IconLock,
  IconMessageCircle,
  IconTrophy,
  IconZap,
} from "@/components/ui/icons";
import {
  useConfigTenant,
  useCriarProcesso,
  usePerfil,
} from "@/lib/api/hooks";
import {
  CATALOGO,
  REGRA_MODALIDADE,
  ehObrigatorio,
  ordenar,
  totalSecoes,
} from "@/lib/documentos";
import { formatBRL, parseValorBR } from "@/lib/format";
import {
  MODALIDADE_LABEL,
  type Modalidade,
  type ModoATA,
  type TipoDocumento,
} from "@/lib/types";

const modalidades: Array<{
  key: string;
  valor: Modalidade;
  desc: string;
  icon: React.ReactNode;
}> = [
  {
    key: "pregao",
    valor: "Pregão Eletrônico",
    desc: "Para aquisição de bens e serviços comuns",
    icon: <IconCart size={22} />,
  },
  {
    key: "concorrencia",
    valor: "Concorrência",
    desc: "Para obras, serviços e compras de grande vulto",
    icon: <IconBuilding size={22} />,
  },
  {
    key: "concurso",
    valor: "Concurso",
    desc: "Para escolha de trabalho técnico, científico ou artístico",
    icon: <IconTrophy size={22} />,
  },
  {
    key: "leilao",
    valor: "Leilão",
    desc: "Para alienação de bens móveis ou imóveis",
    icon: <IconGavel size={22} />,
  },
  {
    key: "dialogo",
    valor: "Diálogo Competitivo",
    desc: "Para contratações de inovação técnica ou complexidade elevada",
    icon: <IconMessageCircle size={22} />,
  },
  {
    key: "dispensa",
    valor: "Dispensa Art. 75",
    desc: "Casos previstos no Art. 75 da Lei 14.133/21",
    icon: <IconZap size={22} />,
  },
  {
    key: "inexigibilidade",
    valor: "Inexigibilidade",
    desc: "Quando a competição é inviável",
    icon: <IconLock size={22} />,
  },
  {
    key: "credenciamento",
    valor: "Credenciamento",
    desc: "Para seleção de prestadores de serviços",
    icon: <IconClipboard size={22} />,
  },
];

const modosATA: Array<{ key: ModoATA; label: string; desc: string }> = [
  {
    key: "anexar",
    label: "Anexar ATA para revisão pela IA",
    desc: "A plataforma analisará a ATA enviada e verificará sua compatibilidade com o objeto.",
  },
  {
    key: "delegar",
    label: "Delegar ao modelo a busca de ATAs válidas",
    desc: "A IA buscará ATAs compatíveis; você poderá visualizar as origens e selecionar.",
  },
  {
    key: "combinado",
    label: "Anexar ATA e também buscar outras opções",
    desc: "A IA revisa sua ATA e ainda sugere alternativas encontradas.",
  },
];

/**
 * Classes do estado selecionado por tipo. Ficam aqui como literais porque o
 * Tailwind não enxerga classe montada em tempo de execução — o resto dos
 * metadados do documento vem do catálogo.
 */
const CLASSES_SELECAO: Record<
  TipoDocumento,
  { card: string; chip: string; check: string }
> = {
  Cotação: {
    card: "border-doc-cotacao bg-doc-cotacao-bg",
    chip: "border-doc-cotacao bg-doc-cotacao-bg text-doc-cotacao",
    check: "border-doc-cotacao bg-doc-cotacao",
  },
  ETP: {
    card: "border-doc-etp bg-doc-etp-bg",
    chip: "border-doc-etp bg-doc-etp-bg text-doc-etp",
    check: "border-doc-etp bg-doc-etp",
  },
  Mapa: {
    card: "border-doc-mapa bg-doc-mapa-bg",
    chip: "border-doc-mapa bg-doc-mapa-bg text-doc-mapa",
    check: "border-doc-mapa bg-doc-mapa",
  },
  TR: {
    card: "border-doc-tr bg-doc-tr-bg",
    chip: "border-doc-tr bg-doc-tr-bg text-doc-tr",
    check: "border-doc-tr bg-doc-tr",
  },
  Edital: {
    card: "border-doc-edital bg-doc-edital-bg",
    chip: "border-doc-edital bg-doc-edital-bg text-doc-edital",
    check: "border-doc-edital bg-doc-edital",
  },
  Contrato: {
    card: "border-doc-contrato bg-doc-contrato-bg",
    chip: "border-doc-contrato bg-doc-contrato-bg text-doc-contrato",
    check: "border-doc-contrato bg-doc-contrato",
  },
};

const headingClasses =
  "m-0 mb-1.5 font-display text-2xl font-extrabold tracking-tight text-text-1";
const subtextClasses = "m-0 mb-6 text-md text-text-3";
const labelClasses = "text-base font-semibold text-text-2";

export default function NovoProcesso() {
  const router = useRouter();
  const { data: tenant, isSuccess: tenantCarregado } = useConfigTenant();
  const criarProcesso = useCriarProcesso();
  const perfil = usePerfil();

  // Só depois da resposta: enquanto carrega, a lista vazia é ausência de dado,
  // e não ausência de secretaria.
  const semSecretariaCadastrada =
    tenantCarregado && (tenant?.secretarias.length ?? 0) === 0;

  const [step, setStep] = useState(1);

  // Passo 1 — modalidade e opções de ATA
  const [modalidade, setModalidade] = useState("");
  const [isAdesaoATA, setIsAdesaoATA] = useState(false);
  const [ataMode, setATAMode] = useState<ModoATA | "">("");
  const [ataFile, setATAFile] = useState<string | null>(null);
  const [ataMotivo, setATAMotivo] = useState("");

  // Passo 2 — identificação
  const [secretaria, setSecretaria] = useState("");
  const [objeto, setObjeto] = useState("");
  const [objetoDemanda, setObjetoDemanda] = useState("");
  const [dfdFile, setDFDFile] = useState<string | null>(null);
  const [valorRef, setValorRef] = useState("");
  const [fundamento, setFundamento] = useState("");

  // Passo 3 — documentos e fases
  const [opcionaisSelecionados, setOpcionaisSelecionados] = useState<
    TipoDocumento[]
  >([]);
  const [includeDFDVerification, setIncludeDFDVerification] = useState(false);

  // A verificação analisa o DFD anexado — é a etapa inicial de qualquer
  // processo que tenha um DFD, independente de gerar ETP. Sem DFD anexado
  // (só Objeto da Demanda), não há o que verificar.
  const temDFD = dfdFile !== null;
  const verificarDFD = includeDFDVerification && temDFD;

  // Os documentos cabíveis dependem da modalidade: a contratação direta não gera
  // edital de licitação e o ETP nela é dispensável (Art. 18, § 2º c/c Art. 72, I).
  const modalidadeSel = modalidades.find((m) => m.key === modalidade);
  const regra = modalidadeSel ? REGRA_MODALIDADE[modalidadeSel.valor] : null;
  const tiposCabiveis = regra
    ? ordenar([...regra.obrigatorios, ...regra.opcionais])
    : [];
  const documentosEscolhidos = regra
    ? ordenar([
        ...regra.obrigatorios,
        ...opcionaisSelecionados.filter((t) => regra.opcionais.includes(t)),
      ])
    : [];

  /** Trocar a modalidade muda o conjunto cabível — os opcionais voltam ao zero. */
  const escolherModalidade = (key: string) => {
    setModalidade(key);
    setOpcionaisSelecionados([]);
  };

  const toggleDoc = (tipo: TipoDocumento) => {
    if (!modalidadeSel || ehObrigatorio(modalidadeSel.valor, tipo)) return;
    setOpcionaisSelecionados((prev) =>
      prev.includes(tipo) ? prev.filter((t) => t !== tipo) : [...prev, tipo],
    );
  };

  // Ao menos um entre DFD e Objeto da Demanda alimenta o ETP — um dos dois é obrigatório.
  const dfdOuObjeto = dfdFile !== null || objetoDemanda.trim() !== "";

  const canProceed =
    (step === 1 &&
      modalidade !== "" &&
      (!isAdesaoATA || (ataMode !== "" && ataMotivo.trim() !== ""))) ||
    (step === 2 && secretaria !== "" && objeto.trim() !== "" && dfdOuObjeto) ||
    step === 3;

  // A numeração é atribuída de forma atômica pelo back-end na criação.
  // Não antecipamos um número no cliente para evitar colisões entre usuários.
  // "pelo servidor" era ambíguo justamente aqui: nesta plataforma "servidor" é
  // a pessoa que usa o sistema, não a máquina que responde.
  const numeroProcesso = "Gerado na criação";
  const secretariaNome = tenant?.secretarias.find((item) => item.id === secretaria)?.nome ?? "";

  const handleCreate = () => {
    if (!modalidadeSel) return;
    const valorNumerico = parseValorBR(valorRef);
    criarProcesso.mutate(
      {
        objeto: objeto.trim(),
        objetoDemanda: objetoDemanda.trim() || undefined,
        modalidade: modalidadeSel.valor,
        secretaria,
        valorEstimado: valorNumerico,
        fundamentoLegal: fundamento.trim() || undefined,
        dfdArquivo: dfdFile,
        ata:
          isAdesaoATA && ataMode !== ""
            ? { modo: ataMode, motivo: ataMotivo.trim(), arquivo: ataFile }
            : null,
        documentos: documentosEscolhidos,
        fases: {
          verificacaoDFD: verificarDFD,
          // Fase de retificação: implementação real fica para a Fase 2 (com
          // versionamento). O campo permanece no domínio como slot; o wizard
          // não oferece o controle enquanto a fase não existe de fato.
          retificacao: false,
        },
      },
      {
        onSuccess: () => {
          // DFD, ETP e documentos ainda são as próximas etapas do back-end.
          // A lista já é integrada e exibe o rascunho persistido.
          router.push("/processos");
        },
      },
    );
  };

  const destinoAposCriar = "à lista de processos como rascunho";

  return (
    <div className="max-w-content p-4 sm:p-5 lg:p-7">
      <div className="mb-8">
        <StepIndicator
          steps={["Modalidade", "Identificação", "Documentos"]}
          current={step}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {/* ── Passo 1 ── */}
          {step === 1 && (
            <div>
              <h2 className={headingClasses}>Selecione a Modalidade</h2>
              <p className={subtextClasses}>
                Escolha a modalidade de licitação de acordo com o objeto e os
                valores estimados.
              </p>

              <div className="mb-6 flex flex-col gap-2.5">
                {modalidades.map((m) => (
                  <ChoiceCard
                    key={m.key}
                    selected={modalidade === m.key}
                    onClick={() => escolherModalidade(m.key)}
                    icon={m.icon}
                    title={MODALIDADE_LABEL[m.valor]}
                    desc={m.desc}
                  />
                ))}
              </div>

              {/* Adesão de ATA antecipada */}
              <div className="rounded-card border border-border bg-surface px-5 py-4.5">
                <div className="flex items-start gap-3">
                  <div className="pt-0.5">
                    <Toggle
                      checked={isAdesaoATA}
                      onChange={setIsAdesaoATA}
                      label="Processo como Adesão de ATA"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="font-display text-md font-bold text-text-1">
                      Este processo será instaurado como Adesão de Ata de
                      Registro de Preços
                    </div>
                    <p className="m-0 mt-1 text-base text-text-3">
                      Ative caso a solução já seja previamente definida como
                      Adesão de ATA. O modelo será orientado a gerar o ETP com
                      essa conclusão.
                    </p>
                  </div>
                </div>

                {isAdesaoATA && (
                  <div className="mt-4.5 flex flex-col gap-4 border-t border-border-soft pt-4.5">
                    <FormField
                      label="Motivo da decisão prévia pela Adesão de ATA"
                      required
                      hint="Justifique por que a Adesão de ATA já foi definida antes do ETP"
                    >
                      <Textarea
                        value={ataMotivo}
                        onChange={(e) => setATAMotivo(e.target.value)}
                        rows={3}
                        placeholder="Ex: Existe ATA vigente do PNCP com objeto compatível e condições vantajosas devidamente comprovadas..."
                      />
                    </FormField>

                    <div>
                      <span className={labelClasses}>Gestão da ATA</span>
                      <div className="mt-2 flex flex-col gap-2">
                        {modosATA.map((opt) => (
                          <ChoiceCard
                            key={opt.key}
                            size="small"
                            selected={ataMode === opt.key}
                            onClick={() => setATAMode(opt.key)}
                            title={opt.label}
                            desc={opt.desc}
                          />
                        ))}
                      </div>
                    </div>

                    {(ataMode === "anexar" || ataMode === "combinado") && (
                      <FormField
                        label="Anexar ATA"
                        hint="Formatos aceitos: PDF, DOCX"
                      >
                        <FileUpload
                          file={ataFile}
                          onChange={setATAFile}
                          placeholder="Clique para selecionar a ATA ou arraste o arquivo"
                          accept=".pdf,.docx"
                        />
                      </FormField>
                    )}

                    {ataMode === "delegar" && (
                      <InfoBanner tone="info">
                        O modelo realizará a busca de ATAs após o processo ser
                        criado. Os resultados ficarão disponíveis na aba de
                        Processos para sua análise e seleção.
                      </InfoBanner>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Passo 2 ── */}
          {step === 2 && (
            <div>
              <h2 className={headingClasses}>Identificação do Processo</h2>
              <p className={subtextClasses}>
                Informe os dados básicos. A descrição do processo é obrigatória
                e identifica-o no painel e nos documentos.
              </p>

              <div className="flex flex-col gap-4.5">
                <FormField label="Secretaria Requisitante" required>
                  <Dropdown
                    value={secretaria}
                    onChange={setSecretaria}
                    ariaLabel="Secretaria requisitante"
                    options={[
                      { value: "", label: "Selecione a secretaria..." },
                      ...(tenant?.secretarias ?? []).map((s) => ({
                        value: s.id,
                        label: s.nome,
                      })),
                    ]}
                  />
                  {/*
                    Sem secretaria cadastrada, o seletor só tem o texto de
                    instrução — e a tela virava um beco: exigia uma escolha que
                    não existia e não dizia por quê. O servidor exige a
                    secretaria (é dela que sai a lotação do processo), então a
                    saída não é liberar: é dizer quem resolve.
                  */}
                  {semSecretariaCadastrada ? (
                    <div className="mt-2">
                      <InfoBanner tone="warning">
                        Este órgão ainda não tem secretaria cadastrada, e todo processo
                        pertence a uma.{" "}
                        {perfil === "coordenador" ? (
                          <>
                            Cadastre a primeira em{" "}
                            <Link href="/configuracoes" className="font-semibold underline">
                              Configurações
                            </Link>
                            .
                          </>
                        ) : (
                          "Peça ao coordenador do órgão para cadastrá-la em Configurações."
                        )}
                      </InfoBanner>
                    </div>
                  ) : (
                    secretaria === "" && (
                      <div className="mt-2">
                        <ValidationMsg
                          type="error"
                          msg="Selecione a secretaria requisitante para continuar."
                        />
                      </div>
                    )
                  )}
                </FormField>

                <FormField
                  label="Descrição do Processo"
                  required
                  hint="Nomenclatura que identifica o processo no painel, nas listagens e nos documentos gerados."
                >
                  <Textarea
                    value={objeto}
                    onChange={(e) => setObjeto(e.target.value)}
                    placeholder="Ex: Modernização dos laboratórios de informática das escolas municipais"
                    rows={2}
                  />
                  {objeto.trim() === "" && (
                    <div className="mt-2">
                      <ValidationMsg
                        type="error"
                        msg="Informe a descrição do processo para continuar."
                      />
                    </div>
                  )}
                </FormField>

                {/* Upload do DFD */}
                <div className="rounded-card border border-border bg-surface px-5 py-4.5">
                  <div className="mb-3">
                    <span className="inline-flex items-center gap-2 text-base font-bold text-text-2">
                      Documento de Formalização de Demanda (DFD)
                      <Tag tone="warning">Recomendado</Tag>
                    </span>
                    <p className="m-0 mt-1 text-sm text-text-3">
                      O DFD alimentará automaticamente as seções do ETP. Caso
                      não possua, informe o Objeto da Demanda abaixo.
                    </p>
                  </div>
                  <FileUpload
                    file={dfdFile}
                    onChange={setDFDFile}
                    placeholder="Clique para selecionar o DFD ou arraste o arquivo aqui"
                    accept=".pdf,.docx,.doc"
                  />
                  {dfdFile && (
                    <InfoBanner
                      tone="success"
                      icon={<IconCheck size={14} strokeWidth={2.5} />}
                      className="mt-2.5"
                    >
                      DFD anexado — o ETP será gerado com base neste documento.
                    </InfoBanner>
                  )}
                </div>

                <FormField
                  label="Objeto da Demanda"
                  required={!dfdFile}
                  hint="Objeto da contratação em si — trabalha junto com o DFD e alimenta as seções do ETP. Obrigatório caso não anexe o DFD."
                >
                  <Textarea
                    value={objetoDemanda}
                    onChange={(e) => setObjetoDemanda(e.target.value)}
                    placeholder="Ex: Aquisição de 150 microcomputadores tipo desktop e periféricos para os laboratórios..."
                    rows={3}
                  />
                  {!dfdOuObjeto && (
                    <div className="mt-2">
                      <ValidationMsg
                        type="error"
                        msg="Anexe o DFD ou preencha o Objeto da Demanda para continuar."
                      />
                    </div>
                  )}
                </FormField>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField label="Valor de Referência Estimado">
                    <MoneyInput value={valorRef} onChange={setValorRef} />
                  </FormField>
                  <FormField label="Fundamento Legal">
                    <Input
                      value={fundamento}
                      onChange={(e) => setFundamento(e.target.value)}
                      placeholder="Ex: Art. 75, II, Lei 14.133/21"
                    />
                  </FormField>
                </div>
              </div>
            </div>
          )}

          {/* ── Passo 3 ── */}
          {step === 3 && (
            <div>
              <h2 className={headingClasses}>Configurar Processo</h2>
              <p className={subtextClasses}>
                Selecione os documentos a gerar e configure as fases opcionais
                do processo.
              </p>

              <div className="mb-6">
                <span className={`mb-3 block ${labelClasses}`}>
                  Documentos a Gerar
                </span>
                <p className="m-0 mb-3 text-sm text-text-3">
                  Listados na ordem do fluxo de contratação. Os obrigatórios da
                  modalidade já vêm marcados.
                </p>
                <div className="flex flex-col gap-2.5">
                  {tiposCabiveis.map((tipo, i) => {
                    const meta = CATALOGO[tipo];
                    const classes = CLASSES_SELECAO[tipo];
                    const obrig = modalidadeSel
                      ? ehObrigatorio(modalidadeSel.valor, tipo)
                      : false;
                    const selected = documentosEscolhidos.includes(tipo);
                    return (
                      <button
                        key={tipo}
                        type="button"
                        onClick={() => toggleDoc(tipo)}
                        aria-pressed={selected}
                        className={`flex w-full items-start gap-4 rounded-card px-4.5 py-4 text-left transition-colors ${
                          selected
                            ? `border-2 ${classes.card}`
                            : "border border-border bg-surface"
                        } ${obrig ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <span
                          className={`mt-0.5 flex size-9.5 shrink-0 items-center justify-center rounded-lg border ${
                            selected
                              ? classes.chip
                              : "border-border bg-ice text-text-muted"
                          }`}
                        >
                          <IconFile size={17} />
                        </span>
                        <span className="block flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs text-text-muted">
                              {i + 1}.
                            </span>
                            <span className="font-display text-md font-bold text-text-1">
                              {meta.titulo}
                            </span>
                            {obrig ? (
                              <Tag tone="success">Obrigatório</Tag>
                            ) : (
                              <Tag tone="info">Opcional</Tag>
                            )}
                          </span>
                          <span className="mt-1 block text-base text-text-3">
                            {meta.descricao}
                          </span>
                          <span className="mt-1.25 block text-xs text-text-muted">
                            {totalSecoes(tipo)} seções · {meta.fundamento}
                          </span>
                        </span>
                        <span
                          className={`mt-2 flex size-5.5 shrink-0 items-center justify-center rounded-sm border-2 text-surface transition-colors ${
                            selected ? classes.check : "border-border bg-ice"
                          }`}
                        >
                          {selected && (
                            <IconCheck size={11} strokeWidth={3.5} />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {modalidadeSel && !tiposCabiveis.includes("Edital") && (
                  <InfoBanner tone="info" className="mt-3">
                    A modalidade{" "}
                    <strong>{MODALIDADE_LABEL[modalidadeSel.valor]}</strong> é
                    contratação direta e não gera edital de licitação — o
                    processo é instruído na forma do Art. 72 da Lei 14.133/21,
                    em que o ETP é dispensável (Art. 18, § 2º).
                  </InfoBanner>
                )}
              </div>

              {/* Fase inicial opcional — verificação do DFD pela IA */}
              <div className="mb-5">
                <span className={`mb-3 block ${labelClasses}`}>
                  Etapa Inicial do Processo
                </span>
                {temDFD ? (
                  <div
                    className={`rounded-card border bg-surface px-4.5 py-4 transition-colors ${
                      includeDFDVerification ? "border-royal" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="pt-0.5">
                        <Toggle
                          checked={includeDFDVerification}
                          onChange={setIncludeDFDVerification}
                          label="Verificação do DFD pela IA"
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-md font-bold text-text-1">
                            Verificação do DFD pela IA
                          </span>
                          <Tag tone="info">Etapa Inicial</Tag>
                        </div>
                        <p className="m-0 mt-1 text-base text-text-3">
                          Antes de elaborar os documentos, o DFD anexado será
                          analisado pela IA, que emitirá parecer sobre qualidade,
                          completude e conformidade com a legislação e o PCA.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-card border border-dashed border-border bg-surface px-4.5 py-4 opacity-80">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-md font-bold text-text-2">
                        Verificação do DFD pela IA
                      </span>
                      <Tag tone="neutral">Requer DFD</Tag>
                    </div>
                    <p className="m-0 mt-1 text-base text-text-3">
                      A verificação analisa o DFD anexado. Anexe o DFD na etapa de
                      Identificação para habilitar esta análise.
                    </p>
                  </div>
                )}
              </div>

              <InfoBanner tone="warning">
                O número do processo é gerado na criação. Depois dela você será
                direcionado {destinoAposCriar}.
              </InfoBanner>
            </div>
          )}

          {/* Ações */}
          <div className="mt-8 flex flex-wrap gap-3">
            {step > 1 && (
              <Button
                variant="secondary"
                size="lg"
                onClick={() => setStep((s) => s - 1)}
              >
                Voltar
              </Button>
            )}
            <p id="motivo-avancar" className="sr-only">
              Preencha os campos obrigatórios desta etapa para avançar.
            </p>
            <Button
              size="lg"
              disabled={!canProceed || criarProcesso.isPending}
              ariaDescribedBy="motivo-avancar"
              onClick={() => {
                if (step < 3) setStep((s) => s + 1);
                else handleCreate();
              }}
            >
              {criarProcesso.isPending
                ? "Criando processo..."
                : step === 3
                  ? // O rótulo prometia levar ao ETP (ou ao DFD) e levava à
                    // lista. Promessa de navegação que não se cumpre é pior que
                    // rótulo genérico: a pessoa procura a tela que não abriu.
                    "Criar Processo →"
                  : "Continuar →"}
            </Button>
          </div>
        </div>

        {/* Resumo do processo — acompanha as escolhas do wizard */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-card border border-border bg-surface p-5">
            <h3 className="m-0 mb-1 font-display text-base font-bold text-text-1">
              Resumo do Processo
            </h3>
            <p className="m-0 mb-4 text-sm text-text-3">
              {/* Sem monoespaçada nem destaque: monoespaçada é para
                  identificador de verdade (PROC-2026-000007), e esta é uma
                  frase — destacá-la faz parecer que já existe um número. */}
              Número <span className="text-text-muted">{numeroProcesso}</span>
            </p>
            <dl className="flex flex-col gap-3">
              {[
                {
                  rotulo: "Modalidade",
                  valor: modalidadeSel
                    ? MODALIDADE_LABEL[modalidadeSel.valor]
                    : undefined,
                },
                { rotulo: "Secretaria", valor: secretariaNome },
                { rotulo: "Descrição", valor: objeto.trim() },
                {
                  rotulo: "Objeto da demanda",
                  valor:
                    objetoDemanda.trim() ||
                    (dfdFile ? "Definido pelo DFD anexado" : ""),
                },
                {
                  rotulo: "Valor de referência",
                  valor: valorRef.trim() ? formatBRL(parseValorBR(valorRef)) : "",
                },
                {
                  rotulo: "Documentos",
                  valor: documentosEscolhidos.join(" · "),
                },
              ].map((item) => (
                <div key={item.rotulo}>
                  <dt className="text-2xs font-semibold tracking-caps text-text-muted uppercase">
                    {item.rotulo}
                  </dt>
                  <dd className="m-0 mt-0.5 text-base break-words text-text-1">
                    {item.valor ? (
                      item.valor
                    ) : (
                      <span className="text-text-faint">Não definido</span>
                    )}
                  </dd>
                </div>
              ))}
              {verificarDFD && (
                <div>
                  <dt className="text-2xs font-semibold tracking-caps text-text-muted uppercase">
                    Etapa inicial
                  </dt>
                  <dd className="m-0 mt-1 flex flex-wrap gap-1.5">
                    <Tag tone="info">Verificação do DFD</Tag>
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
