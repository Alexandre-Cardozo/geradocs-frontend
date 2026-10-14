"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useMemo, useState } from "react"

import { Button, DocPill, Dropdown, FilterTabs, Input, StatCard } from "@/components/ui"
import {
  IconArrowRight,
  IconCalendar,
  IconDatabase,
  IconDownload,
  IconFileText,
  IconPlus,
  IconX,
} from "@/components/ui/icons"
import { BaixarArquivos } from "@/components/documentos/baixar-arquivos"
import { JuntadasExportadas } from "@/components/documentos/juntadas-exportadas"
import { JuntadaDoProcesso } from "@/components/processos/juntada-do-processo"
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/estados"
import { Th } from "@/components/shared/tabela"
import { useDocumentos, useJuntadas, useResumoDocumentos } from "@/lib/api/hooks"
import type { Juntada } from "@/lib/api/generation-client"
import { CATALOGO, ORDEM_FLUXO, porSlug } from "@/lib/documentos"
import {
  agruparPorProcesso,
  rotaDoDocumentoGerado,
  type DocumentosDoProcesso,
} from "@/lib/documentos/rotas"
import { foiRetificado, rotuloDaVersao, totalDeBytes } from "@/lib/dominio"
import { formatarBytes, formatDataHora } from "@/lib/format"
import type { DocumentoGerado } from "@/lib/types"

type Visao = "processo" | "arquivos"

/** Os documentos gerados de um processo, com a juntada e as juntadas exportadas. */
function ProcessoNoAcervo({
  grupo,
  juntadas,
  juntadaAberta,
}: {
  grupo: DocumentosDoProcesso
  juntadas: Juntada[]
  juntadaAberta: boolean
}) {
  const router = useRouter()
  const [montando, setMontando] = useState(juntadaAberta)
  const tituloId = `processo-${grupo.processoId}`

  return (
    <article aria-labelledby={tituloId} className="rounded-card border border-border bg-surface p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-[1_1_280px]">
          <h2 id={tituloId} className="m-0 font-display text-md font-bold text-text-1">
            <span className="font-mono">{grupo.numero}</span>
            {grupo.objeto && <span className="font-body font-semibold text-text-2"> · {grupo.objeto}</span>}
          </h2>
          <p className="m-0 mt-0.5 text-sm text-text-3">
            {grupo.documentos.length === 1 ? "1 documento gerado" : `${grupo.documentos.length} documentos gerados`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!montando && (
            <Button size="sm" variant="secondary" icon={<IconDownload size={13} />} onClick={() => setMontando(true)}>
              Exportar Juntada
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            icon={<IconArrowRight size={13} />}
            onClick={() => router.push(`/processos/detalhe?id=${encodeURIComponent(grupo.processoId)}`)}
          >
            Abrir Processo
          </Button>
        </div>
      </header>

      {montando && (
        <div className="mt-4">
          <JuntadaDoProcesso
            processoId={grupo.processoId}
            solicitados={grupo.documentos.map((documento) => documento.tipo)}
            gerados={grupo.documentos}
            onFechar={() => setMontando(false)}
          />
        </div>
      )}

      <ul className="m-0 mt-3 flex list-none flex-col p-0">
        {grupo.documentos.map((documento) => (
          <li
            key={documento.id}
            className="flex flex-wrap items-center gap-3 border-t border-border-soft py-2.5 first:border-t-0"
          >
            <DocPill status={documento.tipo} classes={CATALOGO[documento.tipo].chip} />
            <span className="min-w-0 flex-[1_1_200px]">
              <span className="block text-base font-semibold text-text-1">
                {CATALOGO[documento.tipo].titulo}
                <span className="ml-2 font-mono text-xs font-normal text-text-muted">{rotuloDaVersao(documento.versao)}</span>
              </span>
              <span className="block text-xs text-text-muted">Gerado em {formatDataHora(documento.geradoEm)}</span>
            </span>
            <BaixarArquivos documento={documento} />
            <Button
              size="sm"
              variant="ghost"
              icon={<IconArrowRight size={13} />}
              onClick={() => router.push(rotaDoDocumentoGerado(documento.processoId, documento.tipo))}
            >
              Abrir
            </Button>
          </li>
        ))}
      </ul>

      {juntadas.length > 0 && (
        <div className="mt-3 border-t border-border-soft pt-3">
          <h3 className="m-0 mb-2 text-sm font-bold text-text-2">Juntadas Exportadas</h3>
          <JuntadasExportadas juntadas={juntadas} vazio="" />
        </div>
      )}
    </article>
  )
}

/**
 * Os documentos gerados no órgão (ADR-049 do back-end).
 *
 * <p>Duas visões do mesmo acervo: **por processo** — a padrão, porque é como
 * os documentos se usam, com a juntada e as juntadas exportadas de cada um — e
 * **todos os arquivos**, a lista corrida para achar um documento ou versão. Os
 * filtros vão no endereço, para que "os documentos do processo X" tenha link.
 */
export default function Documentos() {
  const router = useRouter()
  const params = useSearchParams()
  const documentos = useDocumentos()
  const juntadas = useJuntadas()
  const resumoDados = useResumoDocumentos()

  const visao: Visao = params.get("visao") === "arquivos" ? "arquivos" : "processo"
  const processoFiltrado = params.get("processo") ?? ""
  const tipoFiltrado = porSlug(params.get("tipo") ?? "") ?? null
  const versaoFiltrada = params.get("versao") ?? ""
  const juntadaAberta = params.get("juntada") === "1"
  const [busca, setBusca] = useState("")

  /** Troca um filtro no endereço, mantendo os demais. */
  const filtrar = (chave: string, valor: string | null) => {
    const novos = new URLSearchParams(params.toString())
    if (valor === null || valor === "") novos.delete(chave)
    else novos.set(chave, valor)
    novos.delete("juntada")
    const consulta = novos.toString()
    router.replace(consulta ? `/documentos?${consulta}` : "/documentos")
  }

  const todos = useMemo(() => documentos.data ?? [], [documentos.data])
  const opcoesVersao = useMemo(() => {
    const versoes = [...new Set(todos.map((d) => d.versao))].sort((a, b) => a - b)
    return [{ value: "", label: "Todas as versões" }, ...versoes.map((v) => ({ value: String(v), label: `v${v}` }))]
  }, [todos])

  const termo = busca.trim().toLowerCase()
  const docs = todos.filter(
    (d: DocumentoGerado) =>
      (processoFiltrado === "" || d.processoId === processoFiltrado) &&
      (tipoFiltrado === null || d.tipo === tipoFiltrado) &&
      (versaoFiltrada === "" || String(d.versao) === versaoFiltrada) &&
      (termo === "" ||
        (d.processoNumero ?? "").toLowerCase().includes(termo) ||
        (d.processoObjeto ?? "").toLowerCase().includes(termo)),
  )
  const grupos = agruparPorProcesso(docs)
  const processoDoFiltro = processoFiltrado
    ? todos.find((d) => d.processoId === processoFiltrado)?.processoNumero ?? "processo selecionado"
    : null

  const r = resumoDados.data

  return (
    <div className="w-full p-4 sm:p-5 lg:p-7">
      <div className="mb-6 grid grid-cols-1 gap-3 xs:grid-cols-3">
        <StatCard label="Total de Documentos" value={r ? String(r.total) : "—"} icon={IconFileText} tone="royal" />
        <StatCard label="Gerados este Mês" value={r ? String(r.esteMes) : "—"} icon={IconCalendar} tone="teal" />
        <StatCard label="Armazenamento Usado" value={r ? `${r.armazenamentoMB} MB` : "—"} icon={IconDatabase} tone="success" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5 rounded-card border border-border bg-surface px-5 py-4">
        <div role="group" aria-label="Visão dos documentos">
          <FilterTabs
            options={[
              { key: "processo", label: "Por processo" },
              { key: "arquivos", label: "Todos os arquivos" },
            ]}
            active={visao}
            onChange={(chave) => filtrar("visao", chave === "arquivos" ? "arquivos" : null)}
          />
        </div>
        <div className="w-full sm:w-64">
          <Input
            placeholder="Buscar por número ou objeto do processo"
            ariaLabel="Buscar por processo"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-40">
          <Dropdown
            value={versaoFiltrada}
            onChange={(valor) => filtrar("versao", valor)}
            ariaLabel="Filtrar por versão"
            options={opcoesVersao}
          />
        </div>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          {ORDEM_FLUXO.map((f) => {
            const ativo = tipoFiltrado === f
            return (
              <button
                key={f}
                type="button"
                aria-pressed={ativo}
                onClick={() => filtrar("tipo", ativo ? null : CATALOGO[f].slug)}
                className={`cursor-pointer rounded-sm px-3 py-1.25 text-sm font-semibold transition-colors ${
                  ativo ? "border border-royal bg-tint-royal-bg text-royal" : "border border-border bg-ice text-text-3"
                }`}
              >
                {f}
              </button>
            )
          })}
        </div>
        {processoDoFiltro && (
          <div className="flex w-full items-center gap-2 text-sm text-text-3">
            Mostrando os documentos de <span className="font-mono font-semibold text-text-1">{processoDoFiltro}</span>
            <button
              type="button"
              onClick={() => filtrar("processo", null)}
              className="flex cursor-pointer items-center gap-1 rounded-sm border border-border bg-ice px-2 py-0.5 text-xs font-semibold text-royal"
            >
              <IconX size={11} />
              Ver todos os processos
            </button>
          </div>
        )}
      </div>

      {documentos.isPending && (
        <div className="rounded-card border border-border bg-surface">
          <SkeletonRows rows={5} />
        </div>
      )}
      {documentos.isError && (
        <div className="rounded-card border border-border bg-surface">
          <ErrorState onRetry={() => void documentos.refetch()} />
        </div>
      )}
      {documentos.isSuccess && docs.length === 0 && (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState message="Nenhum documento encontrado para os filtros selecionados" />
        </div>
      )}

      {documentos.isSuccess && docs.length > 0 && visao === "processo" && (
        <div className="flex flex-col gap-3">
          {grupos.map((grupo) => (
            <ProcessoNoAcervo
              key={grupo.processoId}
              grupo={grupo}
              juntadas={(juntadas.data ?? []).filter((juntada) => juntada.processoId === grupo.processoId)}
              juntadaAberta={juntadaAberta && grupo.processoId === processoFiltrado}
            />
          ))}
        </div>
      )}

      {documentos.isSuccess && docs.length > 0 && visao === "arquivos" && (
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-ice">
                  {["Processo", "Tipo", "Formato", "Gerado em", "Tamanho", ""].map((h, i) => (
                    <Th key={h === "" ? `vazio-${i}` : h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.map((doc, i) => (
                  <tr key={doc.id} className={`transition-colors hover:bg-ice ${i < docs.length - 1 ? "border-b border-ice" : ""}`}>
                    <td className="px-4 py-3.25">
                      <div className="text-base font-semibold text-text-1">{doc.processoObjeto}</div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-royal">{doc.processoNumero}</span>
                        <span
                          className={`rounded-sm px-1.5 py-0.5 font-mono text-2xs font-semibold ${
                            foiRetificado(doc.versao)
                              ? "bg-tint-warning-bg text-tint-warning-fg"
                              : "bg-border-soft text-slate-strong"
                          }`}
                        >
                          {rotuloDaVersao(doc.versao)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3.25">
                      <DocPill status={doc.tipo} classes={CATALOGO[doc.tipo].chip} />
                    </td>
                    <td className="px-4 py-3.25 text-sm text-text-3">
                      {doc.arquivos.map((arquivo) => arquivo.formato).join(" + ") || "—"}
                    </td>
                    <td className="px-4 py-3.25 text-sm whitespace-nowrap text-text-3">{formatDataHora(doc.geradoEm)}</td>
                    <td className="px-4 py-3.25 font-mono text-sm text-text-muted">
                      {doc.arquivos.length > 0 ? formatarBytes(totalDeBytes(doc.arquivos)) : "—"}
                    </td>
                    <td className="px-4 py-3.25">
                      <div className="flex items-center gap-1.5">
                        <BaixarArquivos documento={doc} />
                        <button
                          type="button"
                          aria-label={`Abrir ${CATALOGO[doc.tipo].titulo} de ${doc.processoNumero}`}
                          title="Abrir o documento"
                          onClick={() => router.push(rotaDoDocumentoGerado(doc.processoId, doc.tipo))}
                          className="flex size-7 cursor-pointer items-center justify-center rounded-sm border border-border bg-ice text-royal"
                        >
                          <IconArrowRight size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="on-dark mt-5 flex flex-wrap items-center gap-5 rounded-card px-7 py-6 gradient-hero">
        <div className="flex-[1_1_260px]">
          <h3 className="m-0 mb-1.5 font-display text-md font-extrabold text-on-dark">Gerar Novo Documento</h3>
          <p className="m-0 text-base text-on-dark-60">
            Os documentos são elaborados no processo. Abra um processo para elaborar e gerar os documentos dele.
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/processos")}
          className="flex cursor-pointer items-center gap-2 rounded-lg border-0 bg-royal px-6 py-2.75 text-md font-bold whitespace-nowrap text-surface"
        >
          <IconPlus size={14} strokeWidth={2.5} />
          Selecionar Processo
        </button>
      </div>
    </div>
  )
}
