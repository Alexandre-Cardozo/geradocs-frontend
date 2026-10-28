"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState, type ReactNode } from "react"

import { Button, InfoBanner, Tag } from "@/components/ui"
import { IconArrowRight, IconCheckCircle, IconChevronRight, IconDownload, IconPencil } from "@/components/ui/icons"
import { BaixarArquivos } from "@/components/documentos/baixar-arquivos"
import { ConteudoDoDocumento } from "@/components/documentos/conteudo-do-documento"
import { JuntadasExportadas } from "@/components/documentos/juntadas-exportadas"
import { ErrataDoDocumento } from "@/components/documentos/errata-do-documento"
import { VersoesDoDocumento } from "@/components/documentos/versoes-do-documento"
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { baixarArquivoGerado } from "@/lib/api/client"
import { useDocumentos, useGeracoesDoDocumento, useJuntadas, useProcesso } from "@/lib/api/hooks"
import { CATALOGO, porSlug } from "@/lib/documentos"
import { rotaDosDocumentosDoProcesso } from "@/lib/documentos/rotas"
import { formatarBytes, formatDataHora } from "@/lib/format"
import { salvarArquivo } from "@/lib/navegador/salvar-arquivo"
import type { TipoDocumento } from "@/lib/types"

/** Um bloco da página, com título. */
function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-surface p-5">
      <h2 className="m-0 mb-3 font-display text-md font-bold text-text-1">{titulo}</h2>
      {children}
    </section>
  )
}

/** As gerações do documento, cada uma com os arquivos dela — inclusive as de versões anteriores. */
function Geracoes({ processoId, tipo }: { processoId: string; tipo: TipoDocumento }) {
  const geracoes = useGeracoesDoDocumento(processoId, tipo)
  const showToast = useToast()
  const [baixando, setBaixando] = useState<string | null>(null)

  if (geracoes.isPending) return <p className="m-0 text-sm text-text-muted">Carregando as gerações...</p>
  if (geracoes.isError) return <p className="m-0 text-sm text-danger">Não foi possível carregar as gerações.</p>

  const baixar = async (arquivoId: string, nome: string) => {
    setBaixando(arquivoId)
    try {
      const { conteudo, nomeSugerido } = await baixarArquivoGerado(processoId, tipo, arquivoId)
      salvarArquivo(conteudo, nomeSugerido ?? nome)
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Não foi possível baixar o arquivo.")
    } finally {
      setBaixando(null)
    }
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-2 p-0">
      {geracoes.data.map((geracao, i) => (
        <li key={geracao.id} className="rounded-md border border-border-soft px-3 py-2">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-xs font-semibold text-royal">v{geracao.versaoDoDocumento}</span>
            <span className="text-xs text-text-muted">{formatDataHora(geracao.pedidaEm)}</span>
            {i === 0 && <Tag tone="success">Vigente</Tag>}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {geracao.arquivos.map((arquivo) => (
              <button
                key={arquivo.id}
                type="button"
                disabled={baixando === arquivo.id}
                aria-label={`Baixar ${arquivo.formato} da versão ${geracao.versaoDoDocumento}`}
                onClick={() => void baixar(arquivo.id, arquivo.nomeDoArquivo)}
                className="flex h-7 cursor-pointer items-center gap-1 rounded-sm border border-border bg-ice px-1.5 text-2xs font-semibold text-royal disabled:opacity-60"
              >
                <IconDownload size={12} strokeWidth={2.5} />
                {arquivo.formato} · {formatarBytes(arquivo.bytes)}
              </button>
            ))}
          </div>
        </li>
      ))}
    </ol>
  )
}

/**
 * A página do documento gerado (ADR-049 do back-end).
 *
 * <p>É onde o processo e a tela de Documentos se encontram: o destino de
 * "Finalizar e gerar", de "Visualizar documento" na capa e de cada linha de
 * Documentos. Reúne o que é do documento — arquivos, conteúdo, versões e
 * juntadas — e leva de volta ao processo e à lista.
 */
export default function DocumentoGerado() {
  const params = useSearchParams()
  const router = useRouter()
  const processoId = params.get("processo") ?? ""
  const tipo = porSlug(params.get("tipo") ?? "")
  const acabouDeGerar = params.get("gerado") === "1"

  const processo = useProcesso(processoId)
  const documentos = useDocumentos()
  const juntadas = useJuntadas(processoId || undefined)

  if (!tipo || processoId === "") {
    return (
      <div className="p-4 sm:p-5 lg:p-7">
        <div className="rounded-card border border-border bg-surface">
          <EmptyState message="Documento não encontrado">
            <Link href="/documentos" className="text-sm font-semibold text-royal">
              Ver todos os documentos
            </Link>
          </EmptyState>
        </div>
      </div>
    )
  }
  if (processo.isPending || documentos.isPending) return <LoadingState label="Carregando o documento..." />
  if (processo.isError || documentos.isError) {
    return (
      <div className="p-4 sm:p-5 lg:p-7">
        <div className="rounded-card border border-border bg-surface">
          <ErrorState
            onRetry={() => {
              void processo.refetch()
              void documentos.refetch()
            }}
          />
        </div>
      </div>
    )
  }

  const meta = CATALOGO[tipo]
  const proc = processo.data
  const gerado = documentos.data.find((d) => d.processoId === processoId && d.tipo === tipo)
  const editor = `/processos/documento?id=${encodeURIComponent(processoId)}&tipo=${meta.slug}`
  const capa = `/processos/detalhe?id=${encodeURIComponent(processoId)}`
  const comEste = (juntadas.data ?? []).filter((juntada) => juntada.itens.some((item) => item.tipo === tipo))

  return (
    <div className="flex flex-col gap-4 p-4 sm:p-5 lg:p-7">
      <nav aria-label="Caminho" className="flex flex-wrap items-center gap-1.5 text-sm text-text-3">
        <Link href="/documentos" className="text-royal no-underline">
          Documentos
        </Link>
        <IconChevronRight size={12} />
        <Link href={rotaDosDocumentosDoProcesso(processoId)} className="font-mono text-royal no-underline">
          {proc.numero}
        </Link>
        <IconChevronRight size={12} />
        <span className="text-text-1">{meta.titulo}</span>
      </nav>

      {acabouDeGerar && gerado && (
        <InfoBanner tone="success" icon={<IconCheckCircle size={16} />}>
          {meta.titulo} v{gerado.versao} gerado. Os arquivos estão prontos para baixar.
        </InfoBanner>
      )}

      <section className="rounded-card border border-border bg-surface p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-[1_1_320px]">
            <h1 className="m-0 flex flex-wrap items-center gap-2 font-display text-2xl font-extrabold text-text-1">
              {meta.titulo}
              {gerado && <Tag tone="info">v{gerado.versao} · vigente</Tag>}
            </h1>
            <p className="m-0 mt-1 text-sm text-text-3">
              <span className="font-mono">{proc.numero}</span> · {proc.objeto}
            </p>
            <p className="m-0 mt-0.5 text-xs text-text-muted">
              {meta.fundamento}
              {gerado && ` · Gerado em ${formatDataHora(gerado.geradoEm)}`}
            </p>
          </div>
          {gerado && <BaixarArquivos documento={gerado} />}
        </div>
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border-soft pt-4">
          <Button size="sm" variant="secondary" icon={<IconPencil size={13} />} onClick={() => router.push(editor)}>
            {gerado ? "Revisar Seções" : "Elaborar Documento"}
          </Button>
          {gerado && proc.status !== "concluido" && (
            <Button size="sm" variant="ghost" onClick={() => router.push(`${editor}&retificar=1`)}>
              Retificar
            </Button>
          )}
          <Button size="sm" variant="ghost" icon={<IconArrowRight size={13} />} onClick={() => router.push(capa)}>
            Abrir Processo
          </Button>
          {gerado && (
            <Button size="sm" variant="ghost" onClick={() => router.push(rotaDosDocumentosDoProcesso(processoId, true))}>
              Incluir em Juntada
            </Button>
          )}
        </div>
      </section>

      {!gerado ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState message="Este documento ainda não foi gerado">
            <Link href={editor} className="text-sm font-semibold text-royal">
              Abrir o editor para elaborá-lo
            </Link>
          </EmptyState>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-4">
            <Bloco titulo="Conteúdo">
              <ConteudoDoDocumento processoId={processoId} tipo={tipo} />
            </Bloco>
            <Bloco titulo="Histórico do Texto">
              <VersoesDoDocumento processoId={processoId} tipo={tipo} />
            </Bloco>
            {/*
              Facultativa. Morava no painel de retificação da capa, antes de a
              versão nova existir — e a errata compara versões já geradas.
            */}
            <Bloco titulo="Errata — Facultativa">
              <ErrataDoDocumento processoId={processoId} tipo={tipo} />
            </Bloco>
          </div>
          <div className="flex min-w-0 flex-col gap-4">
            <Bloco titulo="Arquivos por Geração">
              <Geracoes processoId={processoId} tipo={tipo} />
            </Bloco>
            <Bloco titulo="Juntadas com este Documento">
              <JuntadasExportadas juntadas={comEste} vazio="Nenhuma juntada exportada com este documento." />
            </Bloco>
          </div>
        </div>
      )}
    </div>
  )
}
