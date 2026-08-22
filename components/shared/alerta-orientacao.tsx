"use client"

import type { ReactNode } from "react"
import { useId, useState } from "react"

import { Button, InfoBanner, Textarea } from "@/components/ui"

/**
 * O padrão de alerta do GeraDocs: **orienta e deixa seguir**.
 *
 * A plataforma não decide pela prefeitura. Quando a regra aponta um problema,
 * ela diz qual é, propõe o que fazer e oferece as duas saídas: seguir a
 * recomendação, ou manter a decisão e justificar — e aí a justificativa vai para
 * a trilha, que é o que responde ao controle depois.
 *
 * Bloquear seria pior de duas formas. A regra do sistema pode estar errada para
 * o caso concreto, e o servidor precisaria contornar a plataforma por fora dela
 * — perdendo justamente o registro. E travar transforma orientação em obstáculo,
 * que é o que fez o fluxo de aprovação sair do produto (ADR §24).
 *
 * Nasce no 8.1 e é o formato de todos os alertas do produto daqui em diante.
 */
export function AlertaOrientacao({
  titulo,
  recomendacao,
  detalhes,
  rotuloSeguir = "Seguir a recomendação",
  rotuloDivergir = "Manter e justificar",
  placeholderJustificativa = "Explique por que manter a decisão atual.",
  onSeguir,
  onDivergir,
  onCancelar,
  pendente = false,
}: {
  titulo: string
  /** O que a regra propõe, em uma frase. */
  recomendacao: string
  /** O que sustenta a recomendação — costuma ser uma lista de consequências. */
  detalhes?: ReactNode
  rotuloSeguir?: string
  rotuloDivergir?: string
  placeholderJustificativa?: string
  onSeguir: () => void
  /** Recebe a justificativa já aparada; só é chamada com texto. */
  onDivergir: (justificativa: string) => void
  onCancelar?: () => void
  pendente?: boolean
}) {
  const [divergindo, setDivergindo] = useState(false)
  const [justificativa, setJustificativa] = useState("")
  const campoId = useId()
  const motivoId = useId()
  const justificativaVazia = justificativa.trim() === ""

  return (
    <div className="flex flex-col gap-3">
      <InfoBanner tone="warning">
        <div className="font-semibold">{titulo}</div>
        <p className="m-0 mt-1">{recomendacao}</p>
        {detalhes && <div className="mt-2">{detalhes}</div>}
      </InfoBanner>

      {divergindo && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={campoId} className="text-sm font-semibold text-text-2">
            Justificativa
          </label>
          <Textarea
            id={campoId}
            value={justificativa}
            onChange={(e) => setJustificativa(e.target.value)}
            placeholder={placeholderJustificativa}
            rows={3}
          />
          <p id={motivoId} className="m-0 text-xs text-text-muted">
            Fica registrada na trilha do processo, com autor e data.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2.5">
        <Button disabled={pendente} onClick={onSeguir}>
          {rotuloSeguir}
        </Button>
        {divergindo ? (
          <Button
            variant="secondary"
            disabled={pendente || justificativaVazia}
            // Sem isto, quem chega pelo teclado ouve "botão desabilitado" e não
            // descobre que falta preencher a justificativa.
            ariaDescribedBy={justificativaVazia ? motivoId : undefined}
            onClick={() => onDivergir(justificativa.trim())}
          >
            Confirmar e registrar
          </Button>
        ) : (
          <Button variant="secondary" disabled={pendente} onClick={() => setDivergindo(true)}>
            {rotuloDivergir}
          </Button>
        )}
        {onCancelar && (
          <Button variant="ghost" disabled={pendente} onClick={onCancelar}>
            Cancelar
          </Button>
        )}
      </div>
    </div>
  )
}
