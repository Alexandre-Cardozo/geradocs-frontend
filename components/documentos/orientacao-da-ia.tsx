"use client"

import { createContext, useContext, useId } from "react"

import { FormField, InfoBanner, Textarea } from "@/components/ui"
import { LIMITE_DA_ORIENTACAO, sobraDaOrientacao } from "@/lib/documentos/orientacao"

/**
 * A orientação do servidor à IA para a seção aberta (§91; ADR-057 do back-end).
 *
 * <p>O editor fornece o estado — é dele saber qual seção está aberta e limpar a
 * orientação ao trocar de seção —, e o cartão "Gerar com IA" mostra o campo,
 * esteja ele no cartão genérico ou num painel especial.
 */
export interface OrientacaoDaIa {
  texto: string
  onTexto: (texto: string) => void
  /** O que a curadoria achou sensível e deixou seguir. */
  avisos: string[]
  /** Por que a curadoria recusou a orientação. */
  erro?: string
}

export const OrientacaoDaIaContexto = createContext<OrientacaoDaIa | null>(null)

/** O campo, recolhido: é opcional, e a maioria das gerações não precisa dele. */
export function CampoDeOrientacao() {
  const orientacao = useContext(OrientacaoDaIaContexto)
  const contadorId = useId()
  if (!orientacao) return null
  const sobra = sobraDaOrientacao(orientacao.texto)

  return (
    <details className="text-sm" open={orientacao.texto !== "" || orientacao.erro !== undefined}>
      <summary className="cursor-pointer font-semibold text-text-2">Orientar a IA (opcional)</summary>
      <div className="mt-2 flex flex-col gap-2">
        <FormField label="Orientação para esta seção" hint="Vai ao modelo de IA só nesta seção. Não inclua dados pessoais.">
          <Textarea
            value={orientacao.texto}
            onChange={(e) => orientacao.onTexto(e.target.value)}
            rows={3}
            placeholder="Ex.: enfatizar que as escolas rurais não têm armazenamento; entrega em lotes mensais."
          />
        </FormField>
        <span id={contadorId} className={`self-end text-xs ${sobra < 0 ? "text-tint-danger-fg" : "text-text-muted"}`}>
          {sobra < 0
            ? `Passa ${-sobra} do limite de ${LIMITE_DA_ORIENTACAO} caracteres.`
            : `${LIMITE_DA_ORIENTACAO - sobra}/${LIMITE_DA_ORIENTACAO}`}
        </span>
        {orientacao.erro && <InfoBanner tone="danger">{orientacao.erro}</InfoBanner>}
        {orientacao.avisos.length > 0 && (
          <InfoBanner tone="warning">
            <ul className="m-0 flex list-disc flex-col gap-1 pl-4">
              {orientacao.avisos.map((aviso) => (
                <li key={aviso}>{aviso}</li>
              ))}
            </ul>
          </InfoBanner>
        )}
      </div>
    </details>
  )
}
