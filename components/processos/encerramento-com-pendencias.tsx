"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"

import { Button, InfoBanner, Textarea } from "@/components/ui"

const FOCAVEIS = 'button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

/**
 * Encerrar o processo com documento ainda por gerar.
 *
 * <p>Pendência não impede o encerramento: exige justificativa, que vai para a
 * trilha. Até 07/10/2026 isso era um {@code window.prompt} — a caixa do
 * navegador, com "alexandre-cardozo.github.io diz" no topo, um campo de uma
 * linha para um texto que fica nos autos, e confirmar em branco não fazia nada
 * sem dizer por quê.
 *
 * <p>É modal de verdade: o foco entra no campo, não sai da janela pelo Tab,
 * Esc cancela e, ao fechar, volta para o botão que a abriu.
 */
export function EncerramentoComPendencias({
  pendentes,
  pendente,
  onConfirmar,
  onCancelar,
}: {
  /** Os títulos dos documentos que faltam, já na ordem do fluxo. */
  pendentes: string[]
  /** O encerramento está a caminho do servidor. */
  pendente: boolean
  /** Recebe a justificativa já aparada; só é chamada com texto. */
  onConfirmar: (justificativa: string) => void
  onCancelar: () => void
}) {
  const [justificativa, setJustificativa] = useState("")
  const janela = useRef<HTMLDivElement>(null)
  const campo = useRef<HTMLTextAreaElement>(null)
  const tituloId = useId()
  const descricaoId = useId()
  const campoId = useId()
  const motivoId = useId()
  const vazia = justificativa.trim() === ""

  useEffect(() => {
    const quemAbriu = document.activeElement instanceof HTMLElement ? document.activeElement : null
    campo.current?.focus()
    return () => quemAbriu?.focus()
  }, [])

  const cancelar = () => {
    if (!pendente) onCancelar()
  }

  const teclado = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation()
      cancelar()
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
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/50" aria-hidden onClick={cancelar} />
      <div
        ref={janela}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricaoId}
        onKeyDown={teclado}
        className="relative flex max-h-full w-full max-w-lg flex-col gap-4 overflow-y-auto rounded-card border border-border bg-surface p-5"
      >
        <h2 id={tituloId} className="m-0 font-display text-md font-bold text-text-1">
          Encerrar processo com pendências
        </h2>

        <InfoBanner tone="warning">
          <div id={descricaoId}>
            {pendentes.length === 1 ? "Falta gerar 1 documento:" : `Faltam gerar ${pendentes.length} documentos:`}
            <ul className="m-0 mt-1 flex list-disc flex-col gap-0.5 pl-4">
              {pendentes.map((titulo) => (
                <li key={titulo}>{titulo}</li>
              ))}
            </ul>
          </div>
        </InfoBanner>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={campoId} className="text-sm font-semibold text-text-2">
            Justificativa para encerrar mesmo assim
          </label>
          <Textarea
            ref={campo}
            id={campoId}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder="Explique por que o processo pode ser encerrado sem esses documentos."
            rows={4}
          />
          <p id={motivoId} className="m-0 text-xs text-text-muted">
            Obrigatória. Fica registrada na trilha do processo, com autor e data.
          </p>
        </div>

        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="ghost" disabled={pendente} onClick={cancelar}>
            Cancelar
          </Button>
          <Button
            disabled={pendente || vazia}
            // Quem chega pelo teclado ouve "botão desabilitado"; isto diz o que falta.
            ariaDescribedBy={vazia ? motivoId : undefined}
            onClick={() => onConfirmar(justificativa.trim())}
          >
            {pendente ? "Encerrando..." : "Encerrar mesmo assim"}
          </Button>
        </div>
      </div>
    </div>
  )
}
