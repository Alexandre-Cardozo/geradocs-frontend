"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

import { DocPill, Dropdown, Input, StatCard } from "@/components/ui"
import { IconCalendar, IconDatabase, IconEye, IconFileText, IconPlus } from "@/components/ui/icons"
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/estados"
import { Th } from "@/components/shared/tabela"
import { useDocumentos, useResumoDocumentos } from "@/lib/api/hooks"
import { CATALOGO, ORDEM_FLUXO } from "@/lib/documentos"
import { ConteudoDoDocumento } from "@/components/documentos/conteudo-do-documento"
import { foiRetificado, rotuloDaVersao, totalDeBytes } from "@/lib/dominio"
import { BaixarArquivos } from "@/components/documentos/baixar-arquivos"
import { formatarBytes } from "@/lib/format"
import { formatDataHora } from "@/lib/format"
import type { DocumentoGerado, TipoDocumento } from "@/lib/types"

/**
 * Nome do processo a partir do título do documento. O título segue o padrão
 * `<Tipo> — <objeto do processo>`; a coluna Tipo já informa o tipo, então aqui
 * exibimos apenas o processo (sem o prefixo redundante).
 */
function nomeProcesso(doc: DocumentoGerado): string {
  const partes = doc.titulo.split(" — ")
  return partes.length > 1 ? partes.slice(1).join(" — ") : doc.titulo
}

export default function Documentos() {
  const documentos = useDocumentos()
  const resumoDados = useResumoDocumentos()
  const [filtroTipo, setFiltroTipo] = useState<TipoDocumento | null>(null)
  const [filtroProcesso, setFiltroProcesso] = useState("")
  const [filtroVersao, setFiltroVersao] = useState("")
  // Um documento aberto por vez: dois conteúdos longos lado a lado na tabela
  // fazem perder de vista qual linha é qual.
  const [aberto, setAberto] = useState<string | null>(null)

  const todos = useMemo(() => documentos.data ?? [], [documentos.data])

  // Opções do filtro de versão derivadas dos documentos carregados (sem duplicatas).
  const opcoesVersao = useMemo(() => {
    const versoes = [...new Set(todos.map((d) => d.versao))].sort((a, b) => a - b)
    return [
      { value: "", label: "Todas as versões" },
      ...versoes.map((v) => ({ value: String(v), label: `v${v}` })),
    ]
  }, [todos])

  const termoProcesso = filtroProcesso.trim().toLowerCase()
  const docs = todos.filter(
    (d) =>
      (filtroTipo === null || d.tipo === filtroTipo) &&
      (termoProcesso === "" ||
        nomeProcesso(d).toLowerCase().includes(termoProcesso) ||
        d.processoId.toLowerCase().includes(termoProcesso)) &&
      (filtroVersao === "" || String(d.versao) === filtroVersao),
  )

  const r = resumoDados.data

  return (
    <div className="w-full p-4 sm:p-5 lg:p-7">
      {/* Cards de resumo — StatCard padrão do DS (mesmo dos demais dashboards) */}
      <div className="mb-6 grid grid-cols-1 gap-3 xs:grid-cols-3">
        <StatCard label="Total de Documentos" value={r ? String(r.total) : "—"} icon={IconFileText} tone="royal" />
        <StatCard label="Gerados este Mês" value={r ? String(r.esteMes) : "—"} icon={IconCalendar} tone="teal" />
        <StatCard label="Armazenamento Usado" value={r ? `${r.armazenamentoMB} MB` : "—"} icon={IconDatabase} tone="success" />
      </div>
      {/* Tabela */}
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-border-soft px-5 py-4">
          <div className="w-full sm:w-64">
            <Input
              placeholder="Buscar por processo..."
              value={filtroProcesso}
              onChange={(e) => setFiltroProcesso(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-40">
            <Dropdown
              value={filtroVersao}
              onChange={setFiltroVersao}
              ariaLabel="Filtrar por versão"
              options={opcoesVersao}
            />
          </div>
          <div className="flex flex-wrap gap-2 sm:ml-auto">
            {ORDEM_FLUXO.map((f) => {
              const ativo = filtroTipo === f
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={ativo}
                  onClick={() => setFiltroTipo(ativo ? null : f)}
                  className={`cursor-pointer rounded-sm px-3 py-1.25 text-sm font-semibold transition-colors ${
                    ativo ? "border border-royal bg-tint-royal-bg text-royal" : "border border-border bg-ice text-text-3"
                  }`}
                >
                  {f}
                </button>
              )
            })}
          </div>
        </div>

        {documentos.isPending && <SkeletonRows rows={7} />}
        {documentos.isError && <ErrorState onRetry={() => void documentos.refetch()} />}
        {documentos.isSuccess && docs.length === 0 && <EmptyState message="Nenhum documento encontrado para os filtros selecionados" />}

        {documentos.isSuccess && docs.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-ice">
                  {["Processo", "Tipo", "Formato", "Gerado em", "Tamanho", "Status", ""].map((h, i) => (
                    <Th key={h === "" ? `vazio-${i}` : h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {docs.flatMap((doc, i) => [
                  <tr key={doc.id} className={`transition-colors hover:bg-ice ${i < docs.length - 1 ? "border-b border-ice" : ""}`}>
                    <td className="px-4 py-3.25">
                      <div className="text-base font-semibold text-text-1">{nomeProcesso(doc)}</div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-royal">{doc.processoId}</span>
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
                      {/* Os formatos que existem de verdade, e não uma constante
                          por tipo de documento. */}
                      {doc.arquivos.map((arquivo) => arquivo.formato).join(" + ") || "—"}
                    </td>
                    <td className="px-4 py-3.25 text-sm whitespace-nowrap text-text-3">{formatDataHora(doc.geradoEm)}</td>
                    <td className="px-4 py-3.25 font-mono text-sm text-text-muted">
                      {doc.arquivos.length > 0 ? formatarBytes(totalDeBytes(doc.arquivos)) : "—"}
                    </td>
                    <td className="px-4 py-3.25">
                      <DocPill
                        status={doc.status === "final" ? "Final" : "Rascunho"}
                        classes={doc.status === "final" ? "bg-tint-success-bg text-tint-success-fg" : "bg-border-soft text-slate-strong"}
                      />
                    </td>
                    <td className="px-4 py-3.25">
                      <div className="flex gap-1.5">
                        <BaixarArquivos documento={doc} />
                        <button
                          type="button"
                          title={aberto === doc.id ? "Ocultar conteúdo" : "Visualizar conteúdo"}
                          aria-label={`Visualizar ${doc.titulo}`}
                          aria-expanded={aberto === doc.id}
                          onClick={() => setAberto(aberto === doc.id ? null : doc.id)}
                          className={`flex size-7 cursor-pointer items-center justify-center rounded-sm border border-border ${
                            aberto === doc.id ? "bg-tint-royal-bg text-royal" : "bg-ice text-text-3"
                          }`}
                        >
                          <IconEye size={13} strokeWidth={2.5} />
                        </button>
                      </div>
                    </td>
                  </tr>,
                  aberto === doc.id ? (
                    <tr key={`${doc.id}-conteudo`} className="border-b border-ice bg-ice">
                      <td colSpan={7} className="px-4 py-4">
                        <ConteudoDoDocumento processoId={doc.processoId} tipo={doc.tipo} />
                      </td>
                    </tr>
                  ) : null,
                ])}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CTA gerar novo documento */}
      <div className="on-dark mt-5 flex flex-wrap items-center gap-5 rounded-card px-7 py-6 gradient-hero">
        <div className="flex-[1_1_260px]">
          <h3 className="m-0 mb-1.5 font-display text-md font-extrabold text-on-dark">Gerar Novo Documento</h3>
          <p className="m-0 text-base text-on-dark-60">
            Selecione um processo com ETP ou TR concluído para gerar o documento final em DOCX e PDF.
          </p>
        </div>
        <Link
          href="/processos"
          className="flex items-center gap-2 rounded-lg bg-royal px-6 py-2.75 text-md font-bold whitespace-nowrap text-surface no-underline"
        >
          <IconPlus size={14} strokeWidth={2.5} />
          Selecionar Processo
        </Link>
      </div>
    </div>
  )
}
