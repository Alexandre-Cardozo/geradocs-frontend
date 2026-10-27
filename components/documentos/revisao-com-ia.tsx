"use client"

import { useEffect, useId, useRef, useState } from "react"

import { Button, InfoBanner } from "@/components/ui"
import { InlineSpinner } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { useAtualizarSecao, useIaDisponivel, useRevisarSecao } from "@/lib/api/hooks"
import { compararRevisao, revisaoMudouOTexto } from "@/lib/documentos/revisao"
import type { SecaoDocumento, TipoDocumento } from "@/lib/types"

type Sugestao = { secaoId: string; titulo: string; atual: string; sugerido: string }

type Resultado = { sugestoes: Sugestao[]; semMudanca: number; falhas: string[]; erro?: string }

/**
 * A revisão do documento pela IA, na etapa final, antes do arquivo (§87).
 *
 * <p>Seção por seção, com a minuta, os dados do processo e as normas do órgão
 * (ADR-054 do back-end). A sugestão aparece marcada sobre o texto atual e só
 * entra se quem assina aceitar — a revisão nunca grava sozinha.
 */
export function RevisaoComIa({
  processoId,
  tipo,
  secoes,
}: {
  processoId: string
  tipo: TipoDocumento
  secoes: SecaoDocumento[]
}) {
  const revisar = useRevisarSecao(processoId, tipo)
  const atualizar = useAtualizarSecao(processoId, tipo)
  const showToast = useToast()
  const motivoId = useId()
  const [andamento, setAndamento] = useState<{ indice: number; total: number; titulo: string } | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const parar = useRef(false)

  // Sair da etapa no meio da revisão interrompe o laço: sem isto, ele seguiria
  // pedindo revisões que ninguém vai ver.
  useEffect(() => {
    parar.current = false
    return () => {
      parar.current = true
    }
  }, [])

  const ia = useIaDisponivel()
  const escritas = secoes.filter((secao) => secao.conteudo.trim() !== "")
  // O motivo vem antes do clique, como no Gerar com IA da seção.
  const motivo = ia.isPending
    ? "Verificando a IA..."
    : ia.data !== true
      ? "Nenhum modelo de IA configurado nesta instalação."
      : escritas.length === 0
        ? "Nenhuma seção escrita."
        : null

  const iniciar = async () => {
    parar.current = false
    setResultado(null)
    const parcial: Resultado = { sugestoes: [], semMudanca: 0, falhas: [] }
    for (const [indice, secao] of escritas.entries()) {
      if (parar.current) break
      setAndamento({ indice: indice + 1, total: escritas.length, titulo: secao.titulo })
      try {
        const sugerido = await revisar.mutateAsync({ secaoId: secao.id, texto: secao.conteudo })
        if (revisaoMudouOTexto(secao.conteudo, sugerido)) {
          parcial.sugestoes.push({ secaoId: secao.id, titulo: secao.titulo, atual: secao.conteudo, sugerido })
        } else {
          parcial.semMudanca++
        }
      } catch (erro) {
        parcial.falhas.push(secao.titulo)
        parcial.erro ??= erro instanceof Error ? erro.message : undefined
      }
    }
    setAndamento(null)
    setResultado(parcial)
  }

  const retirar = (secaoId: string) =>
    setResultado((atual) =>
      atual ? { ...atual, sugestoes: atual.sugestoes.filter((s) => s.secaoId !== secaoId) } : atual,
    )

  const aceitar = (sugestao: Sugestao) => {
    if (atualizar.isPending) return
    atualizar.mutate(
      { secaoId: sugestao.secaoId, conteudo: sugestao.sugerido },
      {
        onSuccess: () => {
          retirar(sugestao.secaoId)
          showToast(`Sugestão aceita em ${sugestao.titulo}.`)
        },
        onError: (erro) => showToast(erro instanceof Error ? erro.message : "Não foi possível salvar a sugestão."),
      },
    )
  }

  return (
    <section aria-labelledby={`${motivoId}-titulo`} className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h3 id={`${motivoId}-titulo`} className="m-0 font-display text-md font-bold text-text-1">
            Revisão com IA
          </h3>
          <p className="m-0 mt-1 text-sm text-text-3">
            Confere cada seção com a minuta, os dados do processo e as normas do órgão. Nada muda sem você aceitar.
          </p>
        </div>
        {andamento == null && (
          <span className="flex items-center gap-2">
            {motivo && (
              <span id={motivoId} className="text-xs text-text-muted">
                {motivo}
              </span>
            )}
            <Button
              size="sm"
              variant="secondary"
              disabled={motivo != null}
              ariaDescribedBy={motivo ? motivoId : undefined}
              onClick={() => void iniciar()}
            >
              {resultado ? "Revisar de Novo" : "Revisar com IA"}
            </Button>
          </span>
        )}
      </div>

      {andamento && (
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <InlineSpinner label={`Revisando ${andamento.indice} de ${andamento.total}: ${andamento.titulo}`} />
          <Button size="sm" variant="ghost" onClick={() => (parar.current = true)}>
            Parar
          </Button>
        </div>
      )}

      {resultado && (
        <p role="status" className="m-0 text-sm text-text-2">
          <strong>{resultado.sugestoes.length}</strong> com sugestão · <strong>{resultado.semMudanca}</strong> sem
          alteração
        </p>
      )}
      {resultado && resultado.falhas.length > 0 && (
        <InfoBanner tone="warning">
          Não foi possível revisar: {resultado.falhas.join(", ")}.{resultado.erro ? ` ${resultado.erro}` : ""}
        </InfoBanner>
      )}

      {resultado?.sugestoes.map((sugestao) => (
        <article key={sugestao.secaoId} className="flex flex-col gap-2.5 border-t border-border-soft pt-3">
          <h4 className="m-0 text-sm font-semibold text-text-1">{sugestao.titulo}</h4>
          <p className="m-0 whitespace-pre-line text-sm leading-relaxed text-text-2">
            {compararRevisao(sugestao.atual, sugestao.sugerido).map((trecho, i) =>
              trecho.tipo === "igual" ? (
                <span key={i}>{trecho.texto}</span>
              ) : trecho.tipo === "removido" ? (
                <del key={i} className="bg-tint-danger-bg text-tint-danger-fg">
                  <span className="sr-only">Removido: </span>
                  {trecho.texto}
                </del>
              ) : (
                <ins key={i} className="bg-tint-success-bg text-tint-success-fg no-underline">
                  <span className="sr-only">Incluído: </span>
                  {trecho.texto}
                </ins>
              ),
            )}
          </p>
          <span className="flex gap-2">
            <Button size="sm" onClick={() => aceitar(sugestao)}>
              Aceitar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => retirar(sugestao.secaoId)}>
              Descartar
            </Button>
          </span>
        </article>
      ))}
    </section>
  )
}
