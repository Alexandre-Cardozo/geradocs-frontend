"use client"

import { type ReactNode, useState } from "react"

import { IconChevronDown, IconChevronRight, IconClock } from "@/components/ui/icons"
import { useTrilhaDoProcesso } from "@/lib/api/hooks"
import { formatDataHora } from "@/lib/format"
import { EVENTO_LABEL } from "@/lib/processos/fluxo"

/**
 * O que aconteceu com o processo, na ordem em que aconteceu.
 *
 * <p>Vem do servidor (ADR-024). Até o 12.1 a trilha era um campo de fixture que
 * nenhuma tela mostrava, e o que a interface registrava — troca de modalidade,
 * encerramento — vivia na memória da aba: sumia ao recarregar.
 *
 * <p>Mostra <b>só o que foi registrado</b>. Geração de documento e retificação
 * ainda não são auditadas no servidor e por isso não aparecem: exibi-las a
 * partir do que esta aba viu acontecer é o que fazia a trilha parecer registro
 * sem ser.
 *
 * <p><b>Fechada, mostra o último evento.</b> A pergunta de quem abre o processo
 * é "o que aconteceu por último"; o histórico inteiro é consulta, e ocupava a
 * tela toda para respondê-la. Quantos eventos ficaram guardados vai no próprio
 * botão, para que ninguém precise abrir só para descobrir se há mais.
 *
 * <p><b>O cartão inteiro abre e fecha.</b> Mirar a linha "Ver N evento(s)" era
 * pedir precisão para uma ação que vale em qualquer ponto do cartão. O botão
 * continua existindo — é por ele que o teclado e o leitor de tela chegam, com o
 * estado anunciado —, e o cartão é a mesma ação com alvo maior.
 */
/** A moldura da seção — a mesma com ou sem evento para mostrar. */
function Cartao({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-card border border-border bg-surface p-5 ${className}`}>{children}</div>
}

export function TrilhaDoProcesso({ processoId }: { processoId: string }) {
  const trilha = useTrilhaDoProcesso(processoId)
  const [aberta, setAberta] = useState(false)

  // Carregando, em falha ou vazia, a trilha continua sendo o mesmo cartão: sem
  // a moldura, a seção pareceria não existir enquanto a resposta não chega.
  if (trilha.isPending) {
    return <Cartao className="text-sm text-text-muted">Carregando a trilha...</Cartao>
  }
  if (trilha.isError) {
    return <Cartao className="text-sm text-danger">Não foi possível carregar a trilha.</Cartao>
  }
  if (trilha.data.length === 0) {
    return (
      <Cartao className="text-sm text-text-muted">
        Nenhum evento registrado para este processo.
      </Cartao>
    )
  }

  const anteriores = trilha.data.length - 1
  const visiveis = aberta ? trilha.data : trilha.data.slice(0, 1)
  const alternar = () => setAberta((estava) => !estava)

  return (
    <div
      /*
        O clique no cartão é conveniência de ponteiro: a semântica fica no botão
        de baixo, que é o que o teclado alcança e o leitor de tela anuncia. Um
        `role="button"` aqui envolveria esse botão num outro, o que nenhum dos
        dois entende.
      */
      onClick={anteriores > 0 ? alternar : undefined}
      className={`rounded-card border border-border bg-surface p-5 ${
        anteriores > 0 ? "cursor-pointer transition-colors hover:bg-ice" : ""
      }`}
    >
      <ol className="m-0 flex list-none flex-col gap-0 p-0">
        {visiveis.map((evento, i) => (
          <li key={`${evento.data}-${evento.evento}-${i}`} className="flex gap-3">
            {/* Marcador e linha: a linha para no último, senão apontaria para o nada. */}
            <div className="flex flex-col items-center">
              <span className="mt-1.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-tint-royal-bg text-royal">
                <IconClock size={13} />
              </span>
              {i < visiveis.length - 1 && <span className="w-px flex-1 bg-border" />}
            </div>
            <div className={`min-w-0 flex-1 ${i < visiveis.length - 1 ? "pb-4" : ""}`}>
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-base font-semibold text-text-1">
                  {EVENTO_LABEL[evento.evento]}
                </span>
                <span className="font-mono text-xs text-text-muted">
                  {formatDataHora(evento.data)}
                </span>
              </div>
              <div className="mt-0.5 text-sm text-text-3">
                {evento.autor ?? (
                  // Eventos anteriores à gravação do nome (antes de 25/08/2026).
                  // Atribuir a ação a alguém para não deixar o campo vazio seria
                  // inventar quem agiu.
                  <span className="text-text-faint">Autor não registrado</span>
                )}
              </div>
              {evento.comentario && (
                <p className="m-0 mt-1.5 border-l-2 border-border-soft pl-2.5 text-sm break-words text-text-2">
                  {evento.comentario}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>

      {anteriores > 0 && (
        <button
          type="button"
          onClick={(e) => {
            // Sem isto o clique conta duas vezes — no botão e no cartão —, e a
            // trilha voltaria a fechar no mesmo gesto que a abriu.
            e.stopPropagation()
            alternar()
          }}
          aria-expanded={aberta}
          className="mt-1 flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-sm font-semibold text-royal"
        >
          {aberta ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
          {aberta
            ? "Ocultar o histórico"
            : `Ver ${anteriores} evento(s) anterior(es)`}
        </button>
      )}
    </div>
  )
}
