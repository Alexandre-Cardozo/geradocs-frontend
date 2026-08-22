"use client"

import Link from "next/link"
import { notFound, useRouter, useSearchParams } from "next/navigation"
import { useRef, useState } from "react"

import { Button, InfoBanner, ProgressBar, SectionBlock, Tag, Textarea, ValidationMsg } from "@/components/ui"
import { IconArrowRight, IconCheckCircle, IconCheck, IconDownload, IconEye, IconHelp, IconSave, IconSparkles } from "@/components/ui/icons"
import { PainelATA, PainelDaSecao } from "@/components/documentos/paineis"
import { ErrorState, InlineSpinner, LoadingState } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import {
  useAtualizarSecao,
  useDocumentos,
  useGerarDocumento,
  useGerarSecao,
  useProcesso,
  useSecoes,
} from "@/lib/api/hooks"
import { CATALOGO, porSlug } from "@/lib/documentos"
import { foiRetificado, rotuloDaVersao } from "@/lib/dominio"
import { concluidas, obrigatoriasPendentes, podeGerar, progresso } from "@/lib/dominio"
import { type SecaoDocumento, type StatusDocumento } from "@/lib/types"

const statusRail: Record<StatusDocumento, { dot: string; chip: string }> = {
  "Completo": { dot: "bg-success", chip: "bg-tint-success-bg text-tint-success-fg" },
  "Em andamento": { dot: "bg-status-waiting-dot", chip: "bg-tint-royal-bg text-royal-hover" },
  "Em revisão": { dot: "bg-warning", chip: "bg-tint-warning-chip-bg text-tint-warning-fg" },
  "Rejeitado": { dot: "bg-danger", chip: "bg-tint-danger-bg text-tint-danger-fg" },
  "Não iniciado": { dot: "bg-text-muted", chip: "bg-border-soft text-slate-strong" },
}

export default function EditorDocumento() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const showToast = useToast()
  const processoId = searchParams.get("id") ?? ""
  const tipo = porSlug(searchParams.get("tipo") ?? "")
  if (!tipo) notFound()

  const meta = CATALOGO[tipo]

  const processo = useProcesso(processoId)
  const secoes = useSecoes(processoId, tipo)
  const documentos = useDocumentos()
  const salvar = useAtualizarSecao(processoId, tipo)
  const gerar = useGerarSecao(processoId, tipo)
  const gerarDocumento = useGerarDocumento()

  const documentoGerado = (documentos.data ?? []).find(
    (d) => d.processoId === processoId && d.tipo === tipo,
  )
  const jaGerado = documentoGerado != null

  const [activeSection, setActiveSection] = useState("1")
  const [rascunho, setRascunho] = useState("")
  const [saved, setSaved] = useState(false)
  const [confirmarRegerar, setConfirmarRegerar] = useState(false)
  const secaoAtivaRef = useRef("1")
  const trocarSecao = (id: string) => {
    secaoAtivaRef.current = id
    setActiveSection(id)
  }

  const lista = secoes.data ?? []
  const active: SecaoDocumento | undefined = lista.find((s) => s.id === activeSection)

  const [secaoSincronizada, setSecaoSincronizada] = useState<string | null>(null)
  if (secoes.isSuccess && activeSection !== secaoSincronizada) {
    setSecaoSincronizada(activeSection)
    setRascunho(active?.conteudo ?? "")
  }

  const completedCount = concluidas(lista).length
  const progress = progresso(lista)

  // Só as seções indispensáveis prendem a geração: as demais são dispensáveis
  // mediante justificativa (no ETP, Art. 18, § 2º). A regra vive em lib/dominio.
  const secoesPendentes = obrigatoriasPendentes(lista)
  const documentoPodeSerGerado = podeGerar(lista)

  const handleSave = (avancar = false) => {
    if (!active) return
    salvar.mutate(
      { secaoId: active.id, conteudo: rascunho, ...(avancar ? { status: "Completo" as const } : {}) },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2500)
          if (avancar) {
            const idx = lista.findIndex((s) => s.id === activeSection)
            const proxima = lista[idx + 1]
            if (proxima) trocarSecao(proxima.id)
          }
        },
      }
    )
  }

  const handleGerarIA = () => {
    if (!active) return
    const secaoId = active.id
    gerar.mutate(secaoId, {
      onSuccess: (secaoGerada) => {
        if (secaoAtivaRef.current === secaoId) setRascunho(secaoGerada.conteudo)
      },
    })
  }

  if (processo.isPending || secoes.isPending) {
    return <LoadingState label={`Carregando ${tipo}...`} />
  }
  if (processo.isError || secoes.isError) {
    return (
      <div className="p-4 sm:p-5 lg:p-7">
        <div className="rounded-card border border-border bg-surface">
          <ErrorState
            message={processo.error?.message ?? secoes.error?.message}
            onRetry={() => {
              void processo.refetch()
              void secoes.refetch()
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:h-full lg:flex-row lg:overflow-hidden">
      {/* Rail de seções */}
      <div className="flex w-full shrink-0 flex-col overflow-hidden border-b border-border bg-surface lg:w-70 lg:min-w-70 lg:border-r lg:border-b-0">
        <div className="border-b border-border-soft px-4.5 pt-4.5 pb-3.5">
          <Link
            href={`/processos/detalhe?id=${encodeURIComponent(processoId)}`}
            className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-text-3 no-underline"
          >
            <span className="rotate-180">
              <IconArrowRight size={12} strokeWidth={2.5} />
            </span>
            Voltar ao Processo
          </Link>
          <div className="mb-3.5">
            <div className="font-mono text-xs text-text-muted">{processo.data.id}</div>
            <div className="mt-0.5 text-base leading-snug font-bold text-text-1">{processo.data.objeto}</div>
            <div className="mt-0.75 text-xs text-text-3">{processo.data.secretaria}</div>
            {documentoGerado && foiRetificado(documentoGerado.versao) && (
              // O cabeçalho é onde quem está editando descobre que trabalha
              // sobre um documento já retificado — antes de gerar mais uma versão.
              <div className="mt-1.5 inline-flex rounded-sm bg-tint-warning-bg px-1.5 py-0.5 font-mono text-2xs font-semibold text-tint-warning-fg">
                {rotuloDaVersao(documentoGerado.versao)}
              </div>
            )}
          </div>
          <ProgressBar percent={progress} label={`Progresso do ${tipo}`} sub={`${completedCount} de ${lista.length} seções concluídas`} />
        </div>

        <div className="flex gap-1.5 overflow-x-auto p-2.5 lg:block lg:flex-1 lg:overflow-x-hidden lg:overflow-y-auto">
          {lista.map((s) => {
            const cfg = statusRail[s.status]
            const isActive = activeSection === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => trocarSecao(s.id)}
                className={`mb-0.5 flex w-60 shrink-0 cursor-pointer items-center gap-2.5 rounded-md p-2.5 text-left transition-colors lg:w-full ${
                  isActive ? "border border-tint-royal-border bg-tint-royal-bg" : "border border-transparent bg-transparent"
                }`}
              >
                <span className={`flex size-5.5 shrink-0 items-center justify-center rounded-sm font-mono text-2xs font-bold ${cfg.chip}`}>
                  {s.status === "Completo" ? (
                    <span className="flex text-success">
                      <IconCheck size={11} strokeWidth={3} />
                    </span>
                  ) : (
                    s.id
                  )}
                </span>
                <span className="block min-w-0 flex-1">
                  <span className={`block text-sm leading-snug ${isActive ? "font-semibold text-royal-hover" : "font-medium text-text-2"}`}>
                    {s.titulo}
                    {!s.obrigatoria && <span className="ml-1.25 text-2xs text-text-muted">Opt.</span>}
                  </span>
                </span>
                <span className={`size-1.5 shrink-0 rounded-full ${cfg.dot}`} />
              </button>
            )
          })}
        </div>
      </div>

      {/* Área do formulário */}
      <div className="flex flex-1 flex-col overflow-hidden bg-ice">
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-3.5">
          <div className="min-w-0 flex-[1_1_220px]">
            <div className="mb-0.5 text-xs text-text-muted">
              Seção {active?.id} de {lista.length} · {active?.fundamentoLegal}
            </div>
            <h2 className="m-0 font-display text-panel font-bold text-text-1">{active?.titulo}</h2>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<IconHelp size={13} />}
              onClick={() => showToast(active?.hint ?? "Preencha a seção conforme as orientações metodológicas.")}
            >
              Orientações
            </Button>
            <Button
              variant={saved ? "success" : "primary"}
              size="sm"
              icon={saved ? <IconCheck size={13} strokeWidth={3} /> : <IconSave size={13} />}
              disabled={salvar.isPending}
              onClick={() => handleSave()}
            >
              {saved ? "Salvo!" : salvar.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 lg:p-6">

          {active?.painel && active.painel !== "ata" ? (
            <PainelDaSecao secao={active} rascunho={rascunho} setRascunho={setRascunho} />
          ) : active ? (
            <SectionBlock title={active.titulo} hint={active.hint}>
              {active.status === "Completo" && rascunho === active.conteudo && active.conteudo !== "" ? (
                <div className="flex flex-col gap-3.5">
                  <div className="flex items-start gap-3 rounded-xl border border-tint-success-border bg-tint-success-bg px-4.5 py-4">
                    <span className="mt-px flex shrink-0 text-success">
                      <IconCheckCircle size={18} strokeWidth={2.5} />
                    </span>
                    <div>
                      <div className="text-md font-bold text-tint-success-fg">Seção Concluída</div>
                      <p className="m-0 mt-1 text-base text-tint-success-fg-soft">
                        Esta seção foi preenchida e validada. Edite o conteúdo abaixo para revisar.
                      </p>
                    </div>
                  </div>
                  <Textarea value={rascunho} onChange={(e) => setRascunho(e.target.value)} rows={6} />
                  <ValidationMsg type="ok" msg="Texto suficiente para fundamentar a seção." />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Textarea
                    value={rascunho}
                    onChange={(e) => setRascunho(e.target.value)}
                    rows={6}
                    placeholder="Preencha o conteúdo desta seção..."
                  />
                  {rascunho.trim() === "" ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <Button variant="dark" size="sm" icon={<IconSparkles size={13} />} disabled={gerar.isPending} onClick={handleGerarIA}>
                        {gerar.isPending ? "Gerando com IA..." : "Gerar com IA"}
                      </Button>
                      <span className="text-sm text-text-muted">A IA redige a seção com base no DFD, no PCA e nos dados do processo.</span>
                    </div>
                  ) : (
                    <ValidationMsg type="ok" msg="Texto suficiente para fundamentar a seção." />
                  )}
                  {gerar.isPending && <InlineSpinner label="Gerando conteúdo da seção... aguarde." />}
                </div>
              )}
            </SectionBlock>
          ) : null}

          {/* Painel de Adesão de ATA — acompanha o Levantamento de Mercado. */}
          {active?.painel === "ata" && <PainelATA />}

          {(() => {
            const isLast = activeSection === lista[lista.length - 1]?.id
            const finalizar = (regerar: boolean) =>
              gerarDocumento.mutate(
                { processoId, tipo },
                {
                  onSuccess: () => {
                    showToast(`${tipo} ${regerar ? "regerado" : "gerado"} e disponível em Documentos.`)
                    router.push(`/processos/detalhe?id=${encodeURIComponent(processoId)}`)
                  },
                }
              )
            return (
              <div className="mt-6 flex flex-col gap-3">
                {isLast && jaGerado && confirmarRegerar && (
                  <InfoBanner tone="warning">
                    Ao regerar o {tipo}, o documento gerado anteriormente será <strong>substituído</strong> por esta nova versão.
                  </InfoBanner>
                )}
                {isLast && !jaGerado && !documentoPodeSerGerado && (
                  <InfoBanner tone="warning">
                    Conclua as seções obrigatórias para gerar o {meta.titulo}. Faltam:{" "}
                    <strong>{secoesPendentes.map((s) => s.titulo).join(", ")}</strong>.
                  </InfoBanner>
                )}
                <div className="flex flex-wrap justify-between gap-2.5">
                  <p id="motivo-secao-anterior" className="sr-only">
                    Esta é a primeira seção do documento.
                  </p>
                  <Button
                    variant="secondary"
                    disabled={activeSection === "1"}
                    ariaDescribedBy={activeSection === "1" ? "motivo-secao-anterior" : undefined}
                    onClick={() => {
                      const idx = lista.findIndex((s) => s.id === activeSection)
                      const anterior = lista[idx - 1]
                      if (anterior) trocarSecao(anterior.id)
                    }}
                    className={activeSection === "1" ? "opacity-40" : ""}
                  >
                    ← Seção Anterior
                  </Button>
                  <div className="flex flex-wrap items-center gap-2.5">
                    {!isLast && documentoPodeSerGerado && !jaGerado && (
                      <Button
                        variant="success"
                        icon={<IconDownload size={14} strokeWidth={2.5} />}
                        disabled={gerarDocumento.isPending}
                        onClick={() => finalizar(false)}
                      >
                        {gerarDocumento.isPending ? `Gerando ${tipo}...` : `Finalizar e Gerar ${tipo}`}
                      </Button>
                    )}
                    {!isLast ? (
                      <Button disabled={salvar.isPending} onClick={() => handleSave(true)}>
                        Salvar e Avançar →
                      </Button>
                    ) : jaGerado ? (
                      confirmarRegerar ? (
                        <>
                          <Button variant="secondary" disabled={gerarDocumento.isPending} onClick={() => setConfirmarRegerar(false)}>
                            Cancelar
                          </Button>
                          <Button variant="dark" disabled={gerarDocumento.isPending} onClick={() => finalizar(true)}>
                            {gerarDocumento.isPending ? "Regerando..." : "Confirmar e Regerar"}
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="secondary" icon={<IconEye size={14} />} onClick={() => router.push("/documentos")}>
                            Visualizar Documento
                          </Button>
                          <Button variant="dark" onClick={() => setConfirmarRegerar(true)}>
                            Regerar {tipo}
                          </Button>
                        </>
                      )
                    ) : (
                      <Button
                        variant="success"
                        icon={<IconDownload size={14} strokeWidth={2.5} />}
                        disabled={gerarDocumento.isPending || !documentoPodeSerGerado}
                        onClick={() => finalizar(false)}
                      >
                        {gerarDocumento.isPending ? `Gerando ${tipo}...` : `Finalizar e Gerar ${tipo}`}
                      </Button>
                    )}
                  </div>
                </div>
                {isLast && !jaGerado && lista.some((s) => !s.obrigatoria && s.status !== "Completo") && documentoPodeSerGerado && (
                  <div className="flex justify-end">
                    <Tag tone="info">Seções opcionais em branco serão omitidas do documento</Tag>
                  </div>
                )}
              </div>
            )
          })()}
        </div>
      </div>
    </div>
  )
}
