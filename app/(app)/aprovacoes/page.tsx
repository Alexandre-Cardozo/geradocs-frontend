"use client";

import { useState } from "react";

import {
  Button,
  Dropdown,
  Input,
  StatusBadge,
  Textarea,
  ValidationMsg,
} from "@/components/ui";
import {
  IconCalendar,
  IconCheck,
  IconCheckCircle,
  IconEye,
  IconFolder,
  IconGavel,
  IconHelp,
  IconPlus,
  IconUser,
  IconX,
} from "@/components/ui/icons";
import {
  EmptyState,
  ErrorState,
  SkeletonRows,
} from "@/components/shared/estados";
import { useToast } from "@/components/shared/providers";
import {
  useConcluirProcesso,
  useDecidirAprovacao,
  useEncaminharParaAprovacao,
  useFilaAprovacoes,
  useRegistrarParecerJuridico,
} from "@/lib/api/hooks";
import { CATALOGO, REGRA_MODALIDADE } from "@/lib/documentos";
import { EVENTO_LABEL } from "@/lib/processos/fluxo";
import { formatBRL, formatData } from "@/lib/format";
import {
  MODALIDADE_LABEL,
  PAPEL_LABEL,
  STATUS_PROCESSO_LABEL,
  type ItemAprovacao,
  type Modalidade,
  type TipoDocumento,
} from "@/lib/types";

/** Opções do filtro de status da fila (vocabulário fixo). */
const OPCOES_STATUS = [
  { value: "todos", label: "Todos os status" },
  { value: "aguardando", label: STATUS_PROCESSO_LABEL.aguardando },
  { value: "em_revisao", label: STATUS_PROCESSO_LABEL.em_revisao },
  { value: "aprovado", label: STATUS_PROCESSO_LABEL.aprovado },
  { value: "rejeitado", label: STATUS_PROCESSO_LABEL.rejeitado },
];

/**
 * Opções do filtro de modalidade — modalidades do catálogo (fonte única) com o
 * mesmo rótulo exibido no wizard de Novo Processo (MODALIDADE_LABEL).
 */
const OPCOES_MODALIDADE = [
  { value: "todas", label: "Todas as modalidades" },
  ...(Object.keys(REGRA_MODALIDADE) as Modalidade[]).map((m) => ({
    value: m,
    label: MODALIDADE_LABEL[m],
  })),
];

/** Cor do ponto na trilha por tipo de evento. */
const eventoDot: Record<string, string> = {
  aprovacao: "bg-success",
  rejeicao: "bg-danger",
  retificacao: "bg-violet",
  envio: "bg-royal",
  conclusao: "bg-royal",
};

interface ApontamentoLocal {
  tipo: TipoDocumento;
  secaoTitulo: string;
  texto: string;
}

export default function Aprovacoes() {
  const showToast = useToast();
  const fila = useFilaAprovacoes();
  const decidir = useDecidirAprovacao();
  const registrarParecer = useRegistrarParecerJuridico();
  const encaminhar = useEncaminharParaAprovacao();
  const concluir = useConcluirProcesso();

  const [selected, setSelected] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [erroComentario, setErroComentario] = useState(false);

  // Filtros da fila
  const [filtroProcesso, setFiltroProcesso] = useState("");
  const [filtroModalidade, setFiltroModalidade] = useState("todas");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // Parecer jurídico (estágio Em Revisão)
  const [parecerTexto, setParecerTexto] = useState("");

  // Retificação por seção (estágio Aguardando)
  const [retificando, setRetificando] = useState(false);
  const [apontamentos, setApontamentos] = useState<ApontamentoLocal[]>([]);
  const [apTipo, setApTipo] = useState<TipoDocumento | "">("");
  const [apSecao, setApSecao] = useState("");
  const [apTexto, setApTexto] = useState("");

  const itens = fila.data ?? [];

  // A fila já chega ordenada (ver getFilaAprovacoes). Aqui só aplicamos os
  // filtros de exibição, preservando a ordem.
  const termo = filtroProcesso.trim().toLowerCase();
  const filtrados = itens.filter((a) => {
    const casaTexto =
      termo === "" ||
      a.objeto.toLowerCase().includes(termo) ||
      a.processoId.toLowerCase().includes(termo) ||
      a.secretaria.toLowerCase().includes(termo);
    const casaModalidade =
      filtroModalidade === "todas" || a.modalidade === filtroModalidade;
    const casaStatus = filtroStatus === "todos" || a.status === filtroStatus;
    return casaTexto && casaModalidade && casaStatus;
  });

  // Item ativo: mantém a seleção se ela sobrevive ao filtro; senão, o primeiro visível.
  const activeId =
    selected && filtrados.some((a) => a.processoId === selected)
      ? selected
      : (filtrados[0]?.processoId ?? null);
  const active: ItemAprovacao | undefined = itens.find(
    (a) => a.processoId === activeId,
  );

  const resetForms = () => {
    setComment("");
    setErroComentario(false);
    setParecerTexto("");
    setRetificando(false);
    setApontamentos([]);
    setApTipo("");
    setApSecao("");
    setApTexto("");
  };

  const exigeComentario = (): boolean => {
    if (comment.trim() === "") {
      setErroComentario(true);
      return false;
    }
    setErroComentario(false);
    return true;
  };

  const handleDecisao = (decisao: "aprovar" | "rejeitar") => {
    if (!active || !exigeComentario()) return;
    const comentario = comment.trim();
    setComment("");
    decidir.mutate(
      { processoId: active.processoId, decisao, comentario },
      {
        onSuccess: () =>
          showToast(
            decisao === "aprovar"
              ? "Processo aprovado — decisão registrada na trilha de auditoria."
              : "Processo rejeitado e devolvido ao elaborador.",
          ),
        onError: (e) =>
          showToast(
            e instanceof Error
              ? e.message
              : "Não foi possível registrar a decisão.",
          ),
      },
    );
  };

  const adicionarApontamento = () => {
    if (apTipo === "" || apTexto.trim() === "") return;
    setApontamentos((prev) => [
      ...prev,
      { tipo: apTipo, secaoTitulo: apSecao.trim(), texto: apTexto.trim() },
    ]);
    setApTipo("");
    setApSecao("");
    setApTexto("");
  };

  const confirmarRetificacao = () => {
    if (!active || !exigeComentario()) return;
    if (apontamentos.length === 0) {
      showToast(
        "Adicione ao menos um apontamento de retificação antes de confirmar.",
      );
      return;
    }
    const comentario = comment.trim();
    const lista = apontamentos;
    resetForms();
    decidir.mutate(
      {
        processoId: active.processoId,
        decisao: "retificar",
        comentario,
        apontamentos: lista.map((a) => ({
          tipo: a.tipo,
          secaoTitulo: a.secaoTitulo || undefined,
          texto: a.texto,
        })),
      },
      {
        onSuccess: () =>
          showToast(
            "Retificação solicitada — apontamentos registrados e processo devolvido.",
          ),
        onError: (e) =>
          showToast(
            e instanceof Error
              ? e.message
              : "Não foi possível solicitar a retificação.",
          ),
      },
    );
  };

  const handleParecer = (favoravel: boolean) => {
    if (!active) return;
    if (parecerTexto.trim() === "") {
      showToast("Registre o fundamento do parecer jurídico.");
      return;
    }
    const comentario = parecerTexto.trim();
    setParecerTexto("");
    registrarParecer.mutate(
      { processoId: active.processoId, favoravel, comentario },
      {
        onSuccess: () =>
          showToast(
            favoravel
              ? "Parecer jurídico favorável registrado."
              : "Parecer jurídico desfavorável registrado.",
          ),
      },
    );
  };

  const handleEncaminhar = () => {
    if (!active || !exigeComentario()) return;
    const comentario = comment.trim();
    setComment("");
    encaminhar.mutate(
      { processoId: active.processoId, comentario },
      {
        onSuccess: () =>
          showToast("Processo encaminhado para decisão do gestor."),
        onError: (e) =>
          showToast(
            e instanceof Error
              ? e.message
              : "Não foi possível encaminhar o processo.",
          ),
      },
    );
  };

  const handleConcluir = () => {
    if (!active || !exigeComentario()) return;
    const comentario = comment.trim();
    setComment("");
    concluir.mutate(
      { processoId: active.processoId, comentario },
      {
        onSuccess: () =>
          showToast("Processo concluído — contratação homologada."),
        onError: (e) =>
          showToast(
            e instanceof Error
              ? e.message
              : "Não foi possível concluir o processo.",
          ),
      },
    );
  };

  if (fila.isPending) {
    return (
      <div className="p-4 sm:p-5 lg:p-7">
        <SkeletonRows rows={6} />
      </div>
    );
  }
  if (fila.isError) {
    return (
      <div className="p-4 sm:p-5 lg:p-7">
        <div className="rounded-card border border-border bg-surface">
          <ErrorState onRetry={() => void fila.refetch()} />
        </div>
      </div>
    );
  }

  const pendentesCount = itens.filter((a) => a.status === "aguardando").length;
  const checklistOk = active ? active.checklist.every((i) => i.ok) : false;
  const parecerFavoravel = active?.parecerJuridico?.favoravel === true;

  return (
    <div className="flex flex-col lg:h-full lg:flex-row lg:overflow-hidden">
      {/* Lista à esquerda */}
      <div className="flex w-full shrink-0 flex-col overflow-hidden border-b border-border bg-surface lg:w-85 lg:min-w-85 lg:border-r lg:border-b-0">
        <div className="border-b border-border-soft px-4.5 py-4">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-text-1">
              Fila de Aprovação
            </span>
            {pendentesCount > 0 && (
              <span className="min-w-4.5 rounded-full bg-danger px-1.5 py-px text-center text-2xs font-bold text-on-dark">
                {pendentesCount} aguardando
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-col gap-2">
            <Input
              placeholder="Buscar por processo..."
              value={filtroProcesso}
              onChange={(e) => setFiltroProcesso(e.target.value)}
            />
            <Dropdown
              value={filtroModalidade}
              onChange={setFiltroModalidade}
              ariaLabel="Filtrar por modalidade"
              options={OPCOES_MODALIDADE}
            />
            <Dropdown
              value={filtroStatus}
              onChange={setFiltroStatus}
              ariaLabel="Filtrar por status"
              options={OPCOES_STATUS}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {itens.length === 0 && (
            <EmptyState message="Nenhum processo no fluxo de aprovação" />
          )}
          {itens.length > 0 && filtrados.length === 0 && (
            <EmptyState message="Nenhum processo corresponde aos filtros selecionados" />
          )}
          {filtrados.map((a) => (
            <div
              key={a.processoId}
              onClick={() => {
                setSelected(a.processoId);
                resetForms();
              }}
              className={`cursor-pointer border-b border-ice px-4.5 py-3.5 transition-colors ${
                activeId === a.processoId
                  ? "border-l-[3px] border-l-royal bg-tint-royal-bg"
                  : "border-l-[3px] border-l-transparent hover:bg-ice"
              }`}
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <div className="flex-1 text-base font-semibold text-text-1">
                  {a.objeto}
                </div>
                <StatusBadge status={a.status} size="sm" />
              </div>
              <div className="mb-1 font-mono text-xs text-text-muted">
                {a.processoId}
              </div>
              <div className="mb-1 text-sm text-text-3">{a.secretaria}</div>
              <div className="flex flex-wrap items-center gap-1.5">
                {a.documentos.map((tipo) => (
                  <span
                    key={tipo}
                    className={`rounded-sm px-1.5 py-0.5 font-mono text-2xs font-bold ${CATALOGO[tipo].chip}`}
                  >
                    {tipo}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detalhe à direita */}
      {active && (
        <div className="flex flex-1 flex-col overflow-hidden bg-ice">
          <div className="border-b border-border bg-surface px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div className="min-w-0">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-text-muted">
                    {active.processoId}
                  </span>
                  <StatusBadge status={active.status} size="sm" />
                </div>
                <h2 className="m-0 font-display text-lg font-extrabold tracking-display text-text-1">
                  {active.objeto}
                </h2>
                <div className="mt-2 flex flex-wrap gap-3.5">
                  <span className="inline-flex items-center gap-1.25 text-sm text-text-3">
                    <IconFolder size={12} /> {active.secretaria}
                  </span>
                  <span className="inline-flex items-center gap-1.25 text-sm text-text-3">
                    <IconUser size={12} /> {active.responsavel}
                  </span>
                  <span className="inline-flex items-center gap-1.25 text-sm text-text-3">
                    <IconCalendar size={12} /> Enviado em{" "}
                    {formatData(active.enviadoEm)}
                  </span>
                </div>
              </div>
              <Button
                variant="secondary"
                size="sm"
                icon={<IconEye size={13} />}
                onClick={() =>
                  showToast(
                    "Pré-visualização dos documentos disponível na integração com o backend.",
                  )
                }
              >
                Visualizar Documentos
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 lg:p-6">
            {/* Cards de informação */}
            <div className="mb-5 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3.5">
              {[
                {
                  label: "Modalidade",
                  value: <span>{MODALIDADE_LABEL[active.modalidade]}</span>,
                },
                {
                  label: "Documentos",
                  value: <span>{active.documentos.length}</span>,
                },
                {
                  label: "Valor Estimado",
                  value: (
                    <span className="font-mono">
                      {formatBRL(active.valorEstimado)}
                    </span>
                  ),
                },
                {
                  label: "Status",
                  value: <StatusBadge status={active.status} size="sm" />,
                },
              ].map((info) => (
                <div
                  key={info.label}
                  className="rounded-xl border border-border bg-surface px-3.5 py-3"
                >
                  <div className="mb-1.25 text-xs font-semibold tracking-caps text-text-muted uppercase">
                    {info.label}
                  </div>
                  <div className="text-base font-bold text-text-1">
                    {info.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Checklist de conformidade (derivado do estado do processo) */}
            <div className="mb-4 rounded-card border border-border bg-surface px-5 py-4.5">
              <h3 className="m-0 mb-3.5 font-display text-md font-bold text-text-1">
                Checklist de Conformidade
              </h3>
              <div className="flex flex-col gap-2">
                {active.checklist.map((item, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <span
                      className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                        item.ok
                          ? "bg-tint-success-bg text-success"
                          : "bg-tint-danger-bg text-danger"
                      }`}
                    >
                      {item.ok ? (
                        <IconCheck size={10} strokeWidth={3.5} />
                      ) : (
                        <IconX size={10} strokeWidth={3.5} />
                      )}
                    </span>
                    <span
                      className={`text-base ${item.ok ? "text-text-2" : "font-semibold text-danger"}`}
                    >
                      {item.texto}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Parecer jurídico (Art. 53) */}
            <div className="mb-4 rounded-card border border-border bg-surface px-5 py-4.5">
              <div className="mb-2 flex items-center gap-2">
                <span className="flex text-royal">
                  <IconGavel size={16} />
                </span>
                <h3 className="m-0 font-display text-md font-bold text-text-1">
                  Parecer Jurídico — Art. 53, Lei 14.133/21
                </h3>
              </div>
              {active.parecerJuridico ? (
                <div
                  className={`rounded-xl border px-4 py-3 ${parecerFavoravel ? "border-tint-success-border bg-tint-success-bg" : "border-tint-danger-border bg-tint-danger-bg"}`}
                >
                  <div
                    className={`text-base font-bold ${parecerFavoravel ? "text-tint-success-fg" : "text-tint-danger-fg"}`}
                  >
                    {parecerFavoravel
                      ? "Favorável ao prosseguimento"
                      : "Desfavorável — corrigir antes de prosseguir"}
                  </div>
                  <p className="m-0 mt-1 text-sm text-text-2">
                    {active.parecerJuridico.comentario}
                  </p>
                  <p className="m-0 mt-1.5 text-xs text-text-muted">
                    {active.parecerJuridico.autor} ·{" "}
                    {formatData(active.parecerJuridico.data)}
                  </p>
                </div>
              ) : active.status === "em_revisao" ? (
                <div>
                  <p className="m-0 mb-2.5 text-sm text-text-muted">
                    O controle prévio de legalidade é obrigatório antes de
                    encaminhar ao gestor.
                  </p>
                  <Textarea
                    value={parecerTexto}
                    onChange={(e) => setParecerTexto(e.target.value)}
                    placeholder="Fundamente o parecer jurídico sobre a conformidade do processo..."
                    rows={3}
                  />
                  <div className="mt-2.5 flex flex-wrap gap-2.5">
                    <Button
                      variant="success"
                      size="sm"
                      icon={<IconCheck size={13} strokeWidth={2.5} />}
                      disabled={registrarParecer.isPending}
                      onClick={() => handleParecer(true)}
                    >
                      Registrar Favorável
                    </Button>
                    <Button
                      variant="danger-soft"
                      size="sm"
                      icon={<IconX size={13} strokeWidth={2.5} />}
                      disabled={registrarParecer.isPending}
                      onClick={() => handleParecer(false)}
                    >
                      Registrar Desfavorável
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="m-0 text-sm text-text-muted">
                  Parecer jurídico ainda não registrado.
                </p>
              )}
            </div>

            {/* Trilha de auditoria */}
            <div className="mb-4 rounded-card border border-border bg-surface px-5 py-4.5">
              <h3 className="m-0 mb-3.5 font-display text-md font-bold text-text-1">
                Histórico do Processo
              </h3>
              <div className="flex flex-col">
                {active.trilha.length === 0 && (
                  <p className="m-0 text-sm text-text-muted">
                    Sem transições registradas.
                  </p>
                )}
                {active.trilha.map((t, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`mt-1 size-2.5 shrink-0 rounded-full ${eventoDot[t.evento] ?? "bg-royal"}`}
                      />
                      {i < active.trilha.length - 1 && (
                        <span className="w-0.5 flex-1 bg-border-soft" />
                      )}
                    </div>
                    <div
                      className={`flex-1 ${i < active.trilha.length - 1 ? "pb-4" : ""}`}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-text-1">
                          {EVENTO_LABEL[t.evento]}
                        </span>
                        <span className="text-xs text-text-muted">
                          {STATUS_PROCESSO_LABEL[t.de]} →{" "}
                          {STATUS_PROCESSO_LABEL[t.para]}
                        </span>
                        <span className="font-mono text-xs text-text-muted">
                          {formatData(t.data)}
                        </span>
                      </div>
                      <div className="mt-0.5 text-sm text-text-3">
                        {t.autor} · {PAPEL_LABEL[t.papel]}
                      </div>
                      <div className="mt-1 text-base leading-normal text-text-2">
                        {t.comentario}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Ações por estágio do fluxo */}
            {active.status === "em_revisao" ||
            active.status === "aguardando" ||
            active.status === "aprovado" ? (
              <div className="rounded-card border border-border bg-surface px-5 py-4.5">
                <h3 className="m-0 mb-1 font-display text-md font-bold text-text-1">
                  Parecer / Observações
                </h3>
                <p className="m-0 mb-2.5 text-sm text-text-muted">
                  O comentário é obrigatório e ficará registrado na trilha de
                  auditoria do processo.
                </p>
                <Textarea
                  value={comment}
                  onChange={(e) => {
                    setComment(e.target.value);
                    if (e.target.value.trim() !== "") setErroComentario(false);
                  }}
                  placeholder="Registre seu parecer ou observações sobre o processo..."
                  rows={3}
                />
                {erroComentario && (
                  <ValidationMsg
                    type="error"
                    msg="Informe o parecer antes de registrar a decisão."
                  />
                )}

                {/* Estágio: Em Revisão → encaminhar (exige parecer jurídico favorável) */}
                {active.status === "em_revisao" && (
                  <div className="mt-3">
                    {!parecerFavoravel && (
                      <div className="mb-2.5">
                        <ValidationMsg
                          type="error"
                          msg="Registre um parecer jurídico favorável (acima) antes de encaminhar ao gestor."
                        />
                      </div>
                    )}
                    <Button
                      size="lg"
                      className="w-full font-bold sm:w-auto"
                      icon={<IconCheckCircle size={15} strokeWidth={2.5} />}
                      disabled={encaminhar.isPending || !parecerFavoravel}
                      onClick={handleEncaminhar}
                    >
                      Encaminhar para o Gestor
                    </Button>
                  </div>
                )}

                {/* Estágio: Aguardando → decisão do gestor */}
                {active.status === "aguardando" && !retificando && (
                  <div className="mt-3 flex flex-col gap-2.5 md:flex-row md:gap-3">
                    <Button
                      variant="danger-soft"
                      size="lg"
                      className="flex-1 font-bold"
                      icon={<IconX size={15} strokeWidth={2.5} />}
                      disabled={decidir.isPending}
                      onClick={() => handleDecisao("rejeitar")}
                    >
                      Rejeitar e Devolver
                    </Button>
                    <Button
                      variant="secondary"
                      size="lg"
                      className="flex-1 border-violet font-bold text-tint-violet-fg"
                      icon={<IconHelp size={15} />}
                      disabled={decidir.isPending}
                      onClick={() => setRetificando(true)}
                    >
                      Solicitar Retificação
                    </Button>
                    <Button
                      variant="success"
                      size="lg"
                      className="flex-1 font-bold"
                      icon={<IconCheck size={15} strokeWidth={2.5} />}
                      disabled={decidir.isPending || !checklistOk}
                      onClick={() => handleDecisao("aprovar")}
                    >
                      Aprovar Processo
                    </Button>
                  </div>
                )}
                {active.status === "aguardando" &&
                  !retificando &&
                  !checklistOk && (
                    <p className="mt-2 text-xs text-text-muted">
                      A aprovação exige o checklist de conformidade
                      integralmente atendido.
                    </p>
                  )}

                {/* Painel de apontamentos por seção (retificação) */}
                {active.status === "aguardando" && retificando && (
                  <div className="mt-3 rounded-xl border border-violet bg-tint-violet-bg px-4 py-4">
                    <div className="mb-2.5 text-base font-bold text-tint-violet-fg">
                      Apontamentos de Retificação
                    </div>
                    <p className="m-0 mb-3 text-sm text-text-3">
                      Indique, por documento e seção, o que deve ser corrigido.
                      O elaborador verá os apontamentos no editor.
                    </p>

                    {apontamentos.length > 0 && (
                      <div className="mb-3 flex flex-col gap-2">
                        {apontamentos.map((a, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 rounded-md border border-border bg-surface px-3 py-2"
                          >
                            <span
                              className={`mt-0.5 rounded-sm px-1.5 py-0.5 font-mono text-2xs font-bold ${CATALOGO[a.tipo].chip}`}
                            >
                              {a.tipo}
                            </span>
                            <div className="min-w-0 flex-1">
                              {a.secaoTitulo && (
                                <div className="text-xs font-semibold text-text-2">
                                  {a.secaoTitulo}
                                </div>
                              )}
                              <div className="text-sm text-text-2">
                                {a.texto}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setApontamentos((prev) =>
                                  prev.filter((_, j) => j !== i),
                                )
                              }
                              className="flex shrink-0 text-text-muted hover:text-danger"
                              aria-label="Remover apontamento"
                            >
                              <IconX size={14} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex flex-col gap-2">
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <Dropdown
                          value={apTipo}
                          onChange={(v) => setApTipo(v as TipoDocumento)}
                          ariaLabel="Documento do apontamento"
                          options={[
                            { value: "", label: "Selecione o documento..." },
                            ...active.documentos.map((tipo) => ({
                              value: tipo,
                              label: CATALOGO[tipo].titulo,
                            })),
                          ]}
                        />
                        <Input
                          value={apSecao}
                          onChange={(e) => setApSecao(e.target.value)}
                          placeholder="Seção (opcional). Ex: Estimativa do Valor"
                        />
                      </div>
                      <Textarea
                        value={apTexto}
                        onChange={(e) => setApTexto(e.target.value)}
                        placeholder="Descreva a correção necessária..."
                        rows={2}
                      />
                      <div>
                        <Button
                          variant="secondary"
                          size="sm"
                          icon={<IconPlus size={13} strokeWidth={2.5} />}
                          disabled={apTipo === "" || apTexto.trim() === ""}
                          onClick={adicionarApontamento}
                        >
                          Adicionar Apontamento
                        </Button>
                      </div>
                    </div>

                    <div className="mt-3.5 flex flex-wrap gap-2.5">
                      <Button
                        variant="secondary"
                        disabled={decidir.isPending}
                        onClick={() => {
                          setRetificando(false);
                          setApontamentos([]);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="dark"
                        disabled={
                          decidir.isPending || apontamentos.length === 0
                        }
                        onClick={confirmarRetificacao}
                      >
                        {decidir.isPending
                          ? "Registrando..."
                          : `Confirmar Retificação (${apontamentos.length})`}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Estágio: Aprovado → concluir */}
                {active.status === "aprovado" && (
                  <div className="mt-3">
                    <div className="mb-2.5 rounded-xl border border-tint-success-border bg-tint-success-bg px-4 py-3 text-tint-success-fg">
                      <span className="text-base font-bold">
                        Processo Aprovado.
                      </span>{" "}
                      Homologue para concluir a contratação.
                    </div>
                    <Button
                      size="lg"
                      variant="success"
                      className="w-full font-bold sm:w-auto"
                      icon={<IconCheckCircle size={15} strokeWidth={2.5} />}
                      disabled={concluir.isPending}
                      onClick={handleConcluir}
                    >
                      Concluir Processo
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-border bg-surface px-5 py-4 text-center">
                <div className="text-lg font-bold text-text-1">
                  {active.status === "rejeitado"
                    ? "Processo Rejeitado"
                    : "Processo Concluído"}
                </div>
                <div className="mt-1 text-base text-text-3">
                  Decisão registrada na trilha de auditoria acima.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
