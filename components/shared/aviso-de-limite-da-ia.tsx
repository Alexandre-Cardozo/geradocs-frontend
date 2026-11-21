"use client"

import { useEffect, useId, useRef, type KeyboardEvent } from "react"

import { Button } from "@/components/ui"
import { IconSparkles } from "@/components/ui/icons"
import { FaixaDaMarca } from "@/components/shared/marca"
import { CONTATO_DA_GOVPRO, LINK_PARA_AMPLIAR_O_LIMITE } from "@/lib/api/limite-da-ia"

const FOCAVEIS = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

/**
 * O aviso de que o limite de IA do plano acabou (§109).
 *
 * <p>Abre sozinho quando qualquer pedido à IA volta com `402`
 * (`AI_BUDGET_EXHAUSTED`): gerar a seção, revisar o documento ou melhorar a
 * redação do DFD. Antes, a recusa virava um toast que sumia em três segundos,
 * ou uma linha de erro, e a pessoa ficava sem saber o que fazer. Esperar não
 * resolve; quem amplia o limite é a GovPro, e o aviso diz isso com o contato.
 *
 * <p>É modal de verdade, como o encerramento com pendências: o foco entra no
 * botão de contato, não sai pelo Tab, Esc fecha e o foco volta a quem abriu.
 */
export function AvisoDeLimiteDaIa({ onFechar }: { onFechar: () => void }) {
  const janela = useRef<HTMLDivElement>(null)
  const contato = useRef<HTMLAnchorElement>(null)
  const tituloId = useId()
  const descricaoId = useId()

  useEffect(() => {
    const quemAbriu = document.activeElement instanceof HTMLElement ? document.activeElement : null
    contato.current?.focus()
    return () => quemAbriu?.focus()
  }, [])

  const teclado = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation()
      onFechar()
      return
    }
    if (e.key !== "Tab" || !janela.current) return
    const focaveis = Array.from(janela.current.querySelectorAll<HTMLElement>(FOCAVEIS))
    const primeiro = focaveis[0]
    const ultimo = focaveis[focaveis.length - 1]
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault()
      ultimo?.focus()
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault()
      primeiro?.focus()
    }
  }

  return (
    <div className="fixed inset-0 z-90 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/50" aria-hidden onClick={onFechar} />
      <div
        ref={janela}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricaoId}
        onKeyDown={teclado}
        className="relative flex w-full max-w-md animate-ia-surgir flex-col gap-4 overflow-hidden rounded-card border border-border bg-surface p-5"
      >
        <FaixaDaMarca className="absolute inset-x-0 top-0" />
        <div className="flex items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full gradient-brand text-surface">
            <IconSparkles size={18} />
          </span>
          <div className="flex flex-col gap-1">
            <h2 id={tituloId} className="m-0 font-display text-md font-bold text-text-1">
              Limite de IA Atingido
            </h2>
            <p id={descricaoId} className="m-0 text-sm text-text-2">
              Sua entidade usou todo o limite de geração por IA do plano contratado neste mês. Para contratar mais
              limite de uso, fale com a GovPro.
            </p>
          </div>
        </div>
        <p className="m-0 text-xs text-text-muted">
          A redação manual continua disponível. Contato: <span className="font-mono">{CONTATO_DA_GOVPRO}</span>
        </p>
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="ghost" onClick={onFechar}>
            Entendi
          </Button>
          <a
            ref={contato}
            href={LINK_PARA_AMPLIAR_O_LIMITE}
            className="inline-flex h-9 items-center justify-center gap-1.75 rounded-md bg-royal px-4 font-body text-base font-semibold whitespace-nowrap text-surface transition-colors hover:bg-royal-hover"
          >
            Falar com a GovPro
          </a>
        </div>
      </div>
    </div>
  )
}
