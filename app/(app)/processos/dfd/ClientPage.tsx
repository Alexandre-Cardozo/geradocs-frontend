"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { Button, ProgressBar } from "@/components/ui"
import {
  IconCheck,
  IconChevronRight,
  IconFile,
  IconHelp,
  IconInfo,
  IconSearch,
  IconUpload,
  IconX,
  IconXCircle,
} from "@/components/ui/icons"
import { ErrorState, LoadingState } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { useAnalisarDFD, useParecerDFD, useProcesso } from "@/lib/api/hooks"
import { MarcaSintetica } from "@/components/shared/marca-sintetica";
import { CATALOGO, ordenar, totalSecoes } from "@/lib/documentos"
import { formatDataHora } from "@/lib/format"
import type { AchadoDFD } from "@/lib/types"

const etapasAnalise = [
  "Leitura e estruturação do documento",
  "Verificação de conformidade legal",
  "Cruzamento com PCA 2025",
  "Geração do parecer",
]

/** Classes de cor por severidade do achado. */
function severidadeCfg(achado: AchadoDFD) {
  if (achado.tipo === "conformidade") {
    return { card: "bg-status-done-bg border-tint-success-border", icon: "✓", iconCor: "text-success", texto: "text-tint-success-fg" }
  }
  if (achado.severidade === "atencao") {
    return { card: "bg-tint-danger-bg border-tint-danger-border", icon: "✕", iconCor: "text-danger", texto: "text-tint-danger-fg" }
  }
  return { card: "bg-tint-warning-bg border-tint-warning-border", icon: "!", iconCor: "text-warning", texto: "text-tint-warning-fg" }
}

export default function VerificacaoDFD() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const showToast = useToast()
  const processoId = searchParams.get("id") ?? ""

  const processo = useProcesso(processoId)
  const parecer = useParecerDFD(processoId)
  const analisar = useAnalisarDFD(processoId)

  // undefined = usuário ainda não mexeu → herda o DFD anexado na criação do processo.
  const [dfdFileEscolhido, setDfdFile] = useState<string | null | undefined>(undefined)
  const dfdFile = dfdFileEscolhido === undefined ? (processo.data?.dfdArquivo ?? null) : dfdFileEscolhido
  const [progress, setProgress] = useState(0)
  const [analisando, setAnalisando] = useState(false)
  const [reenviando, setReenviando] = useState(false)
  const intervalo = useRef<ReturnType<typeof setInterval> | null>(null)

  // Documento que sucede o DFD no fluxo. Em regra é o ETP, mas na contratação
  // direta ele é dispensável (Art. 18, § 2º) e o processo começa por outro.
  const proximo = ordenar(processo.data?.documentos ?? [])[0]
  const proximoTitulo = proximo ? CATALOGO[proximo].titulo : "processo"
  const irParaProximo = () =>
    router.push(
      proximo
        ? `/processos/documento?id=${encodeURIComponent(processoId)}&tipo=${CATALOGO[proximo].slug}`
        : `/processos/detalhe?id=${encodeURIComponent(processoId)}`,
    )

  useEffect(() => () => {
    if (intervalo.current) clearInterval(intervalo.current)
  }, [])

  const handleAnalyze = () => {
    if (!dfdFile) return
    setAnalisando(true)
    setProgress(0)
    analisar.mutate(dfdFile, {
      onSuccess: () => setReenviando(false),
      onError: (erro) => {
        // Falha na análise: interrompe a animação e volta ao upload com aviso.
        if (intervalo.current) clearInterval(intervalo.current)
        setAnalisando(false)
        setProgress(0)
        showToast(`Não foi possível analisar o DFD: ${erro.message}. Tente novamente.`)
      },
    })
    intervalo.current = setInterval(() => {
      setProgress((p) => {
        const next = p + Math.random() * 18 + 5
        if (next >= 100) {
          if (intervalo.current) clearInterval(intervalo.current)
          setTimeout(() => setAnalisando(false), 300)
          return 100
        }
        return next
      })
    }, 280)
  }

  const done = !analisando && parecer.data != null && !reenviando
  const upload = !analisando && (parecer.data == null || reenviando)

  if (processo.isPending || parecer.isPending) {
    return (
      <div className="max-w-review p-4 sm:p-5 lg:p-7">
        <LoadingState label="Carregando processo..." />
      </div>
    )
  }
  if (processo.isError) {
    return (
      <div className="max-w-review p-4 sm:p-5 lg:p-7">
        <div className="rounded-card border border-border bg-surface">
          <ErrorState message={processo.error.message} onRetry={() => void processo.refetch()} />
        </div>
      </div>
    )
  }

  const okCount = parecer.data?.achados.filter((a) => a.tipo === "conformidade").length ?? 0
  const warnCount = parecer.data?.achados.filter((a) => a.tipo === "alerta" && a.severidade === "recomendacao").length ?? 0
  const errorCount = parecer.data?.achados.filter((a) => a.tipo === "alerta" && a.severidade === "atencao").length ?? 0

  const resumos = [
    { count: okCount, label: "Conformes", card: "bg-tint-success-bg", num: "text-tint-success-fg", sub: "text-tint-success-fg-soft", icone: <IconCheck size={18} strokeWidth={2.5} />, iconeCor: "text-success" },
    { count: warnCount, label: "Recomendações", card: "bg-tint-warning-bg", num: "text-tint-warning-fg", sub: "text-tint-warning-fg-strong", icone: <IconInfo size={18} strokeWidth={2.5} />, iconeCor: "text-warning" },
    { count: errorCount, label: "Atenção necessária", card: "bg-tint-danger-bg", num: "text-tint-danger-fg", sub: "text-tint-danger-fg-strong", icone: <IconXCircle size={18} strokeWidth={2.5} />, iconeCor: "text-danger" },
  ]

  return (
    <div className="max-w-content p-4 sm:p-5 lg:p-7">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2">
        <Link href="/processos" className="text-base text-text-3 no-underline">
          Processos
        </Link>
        <span className="flex text-text-faint">
          <IconChevronRight size={14} strokeWidth={2.5} />
        </span>
        <span className="font-mono text-sm font-bold text-royal">{processoId}</span>
        <span className="flex text-text-faint">
          <IconChevronRight size={14} strokeWidth={2.5} />
        </span>
        <span className="text-base font-semibold text-text-1">Verificação do DFD</span>
      </div>

      {/* Indicador de fase */}
      <div className="on-dark mb-6 flex items-center gap-5 rounded-[14px] px-6 py-5 gradient-hero">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-card bg-on-dark-electric-chip text-electric">
          <IconHelp size={22} />
        </div>
        <div className="flex-1">
          <div className="mb-1 font-display text-panel font-extrabold text-on-dark">
            Etapa Inicial — Verificação do DFD pela IA
          </div>
          <p className="m-0 text-base text-on-dark-60">
            O modelo analisará o DFD quanto à completude, conformidade legal e compatibilidade com o PCA antes de iniciar a elaboração dos documentos do processo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div>
      {/* ── Estado: Upload ── */}
      {upload && (
        <div className="flex flex-col gap-4.5">
          <div className="rounded-card border border-border bg-surface px-6 py-5.5">
            <h3 className="m-0 mb-1 font-display text-lg font-bold text-text-1">Enviar DFD para Verificação</h3>
            <p className="m-0 mb-4.5 text-base text-text-3">
              Anexe o Documento de Formalização de Demanda que será analisado pela IA. Caso já tenha enviado na criação do processo, o arquivo está disponível abaixo.
            </p>

            {dfdFile ? (
              <div>
                <div className="mb-4 flex items-center gap-3 rounded-xl border border-border bg-ice px-4 py-3.5">
                  <div className="flex size-9.5 shrink-0 items-center justify-center rounded-lg bg-tint-royal-bg text-royal">
                    <IconFile size={18} />
                  </div>
                  <div className="flex-1">
                    <div className="text-base font-semibold text-text-1">{dfdFile}</div>
                    <div className="mt-0.5 text-xs text-text-muted">Pronto para análise</div>
                  </div>
                  <button
                    type="button"
                    aria-label="Remover DFD"
                    onClick={() => setDfdFile(null)}
                    className="flex cursor-pointer border-0 bg-transparent p-1 text-text-muted"
                  >
                    <IconX size={14} strokeWidth={2.5} />
                  </button>
                </div>
                <Button size="lg" icon={<IconSearch size={15} strokeWidth={2.5} />} onClick={handleAnalyze}>
                  Iniciar Análise do DFD pela IA
                </Button>
              </div>
            ) : (
              <label className="block cursor-pointer">
                <input
                  type="file"
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) setDfdFile(f.name)
                  }}
                />
                <div className="rounded-xl border-2 border-dashed border-text-faint bg-surface-upload px-6 py-8 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-card bg-border-soft text-text-muted">
                    <IconUpload size={22} strokeWidth={1.5} />
                  </div>
                  <p className="m-0 mb-1 text-md font-semibold text-text-2">Clique para selecionar o DFD</p>
                  <p className="m-0 text-sm text-text-muted">PDF, DOCX ou DOC</p>
                </div>
              </label>
            )}
          </div>

          <button
            type="button"
            onClick={irParaProximo}
            className="cursor-pointer self-start border-0 bg-transparent p-0 text-base text-text-3 underline"
          >
            Pular esta fase e iniciar o {proximoTitulo} sem verificação
          </button>
        </div>
      )}

      {/* ── Estado: Analisando ── */}
      {analisando && (
        <div className="rounded-card border border-border bg-surface px-7 py-9 text-center">
          <div className="mx-auto mb-5 flex size-15 items-center justify-center rounded-full bg-tint-royal-bg text-royal">
            <IconHelp size={28} strokeWidth={1.5} />
          </div>
          <h3 className="m-0 mb-2 font-display text-xl font-bold text-text-1">Analisando o DFD...</h3>
          <p className="m-0 mb-7 text-base text-text-3">
            O modelo está verificando completude, conformidade e compatibilidade com o PCA vigente.
          </p>
          <div className="mx-auto max-w-105">
            <ProgressBar percent={progress} label="Progresso da análise" barClasses="h-2" transition="width 0.3s" />
            <div className="mt-4 flex flex-col gap-2">
              {etapasAnalise.map((etapa, i) => {
                const feito = progress > (i + 1) * 25
                const ativo = !feito && progress > i * 25
                return (
                  <div key={etapa} className="flex items-center gap-2.5">
                    <span
                      className={`flex size-4.5 shrink-0 items-center justify-center rounded-full border-2 text-surface ${
                        feito ? "border-success bg-success" : ativo ? "border-royal bg-transparent" : "border-border bg-transparent"
                      }`}
                    >
                      {feito && <IconCheck size={9} strokeWidth={3.5} />}
                      {ativo && !feito && <span className="size-1.5 rounded-full bg-royal" />}
                    </span>
                    <span
                      className={`text-sm ${
                        feito ? "font-semibold text-tint-success-fg" : ativo ? "font-semibold text-royal-hover" : "font-normal text-text-muted"
                      }`}
                    >
                      {etapa}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Estado: Parecer ── */}
      {done && parecer.data && (
        <div className="flex flex-col gap-4.5">
          <div className="rounded-card border border-border bg-surface px-6 py-5.5">
            <div className="mb-5 flex items-start gap-5">
              <div className="flex-1">
                <h3 className="m-0 mb-1 font-display text-lg font-bold text-text-1">Parecer da IA — DFD Analisado</h3>
                <p className="m-0 text-base text-text-3">
                  {parecer.data.arquivo} · Analisado em {formatDataHora(parecer.data.analisadoEm).replace(" — ", " às ")}
                </p>
                {/*
                  O parecer é o dado fabricado que mais engana: nota, achados e
                  fundamentação têm exatamente a forma de uma análise real.
                */}
                <MarcaSintetica campo="parecerDfd" />
              </div>
              <div className="shrink-0 rounded-xl border border-tint-warning-border bg-tint-warning-bg px-4.5 py-2.5 text-center">
                <div className="font-display text-score font-extrabold tracking-stat text-tint-warning-fg">
                  {parecer.data.nota}
                </div>
                <div className="text-2xs font-bold tracking-caps text-tint-warning-fg-strong uppercase">/ 100</div>
                <div className="mt-0.5 text-2xs text-tint-warning-fg">{parecer.data.classificacao}</div>
              </div>
            </div>

            {/* Resumo */}
            <div className="mb-5 grid grid-cols-1 gap-3 xs:grid-cols-3">
              {resumos.map((r) => (
                <div key={r.label} className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 ${r.card}`}>
                  <span className={`flex ${r.iconeCor}`}>{r.icone}</span>
                  <div>
                    <div className={`font-display text-2xl font-extrabold ${r.num}`}>{r.count}</div>
                    <div className={`text-xs ${r.sub}`}>{r.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Checklist de achados com fundamentação */}
            <div className="flex flex-col gap-2">
              {parecer.data.achados.map((achado, i) => {
                const cfg = severidadeCfg(achado)
                return (
                  <div key={i} className={`flex items-start gap-2.5 rounded-md border px-3.5 py-2.5 ${cfg.card}`}>
                    <span className={`mt-px shrink-0 text-sm font-bold ${cfg.iconCor}`}>{cfg.icon}</span>
                    <span className={`text-base leading-normal ${cfg.texto}`}>
                      {achado.descricao}
                      {achado.fundamentacao && (
                        <>
                          {" "}
                          <span className="font-bold">({achado.fundamentacao})</span>
                        </>
                      )}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Ações */}
          <div className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-surface px-5.5 py-4.5">
            <div className="flex-[1_1_260px]">
              <div className="mb-1 font-display text-md font-bold text-text-1">Como deseja prosseguir?</div>
              <p className="m-0 text-base text-text-3">
                O DFD foi aceito com ressalvas. Você pode corrigir os pontos apontados antes de continuar ou prosseguir
                para o {proximoTitulo} com as informações atuais.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2.5">
              <Button
                variant="secondary"
                onClick={() => {
                  setDfdFile(null)
                  setProgress(0)
                  analisar.reset()
                  setReenviando(true)
                }}
              >
                Enviar DFD Corrigido
              </Button>
              <Button onClick={irParaProximo}>
                Prosseguir para o {proximoTitulo}
                <span className="flex">
                  <IconChevronRight size={14} strokeWidth={2.5} />
                </span>
              </Button>
            </div>
          </div>
        </div>
      )}
        </div>

        {/* Fases do processo — painel lateral */}
        <aside className="lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-card border border-border bg-surface p-5">
            <h3 className="m-0 mb-3.5 font-display text-base font-bold text-text-1">Fases do Processo</h3>
            <ol className="flex flex-col">
              {[
                { label: "Verificação do DFD", sub: "Análise pela IA", estado: "atual" },
                ...ordenar(processo.data?.documentos ?? []).map((tipo) => ({
                  label: CATALOGO[tipo].titulo,
                  sub: `${totalSecoes(tipo)} seções`,
                  estado: "proxima",
                })),
              ].map((f, i, arr) => (
                <li key={f.label} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span
                      className={`flex size-6 shrink-0 items-center justify-center rounded-full text-2xs font-bold ${
                        f.estado === "atual" ? "bg-royal text-on-dark" : "border border-border bg-surface text-text-muted"
                      }`}
                    >
                      {i + 1}
                    </span>
                    {i < arr.length - 1 && <span className="w-0.5 flex-1 bg-border-soft" />}
                  </div>
                  <div className={i < arr.length - 1 ? "pb-4" : ""}>
                    <div className={`text-base font-semibold ${f.estado === "atual" ? "text-text-1" : "text-text-3"}`}>
                      {f.label}
                    </div>
                    <div className="text-xs text-text-muted">{f.sub}</div>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-4 border-t border-border-soft pt-4">
              <p className="m-0 text-sm text-text-3">
                A verificação do DFD é opcional. Você pode prosseguir direto ao {proximoTitulo} a qualquer momento.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
