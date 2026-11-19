"use client"

import { createContext, useContext, useId } from "react"

import { InfoBanner, Textarea } from "@/components/ui"
import type { Preenchimento } from "@/components/documentos/caminhos-da-secao"
import type { RascunhoEtpComFontes } from "@/lib/api/authoring-client"
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
  /** O que a IA lê nesta seção, dito no cartão ("no DFD e no processo"). */
  fontes?: string
  /** A resposta chegou e o texto está sendo escrito no campo (§107). */
  escrevendo?: boolean
  /**
   * O rascunho da IA que ainda não foi salvo, com a base que o embasou e o
   * descarte (§112). Mostrado no rodapé do bloco da IA, recolhido.
   */
  rascunhoDaIa?: { fontes: RascunhoEtpComFontes; onDescartar: () => void; pedeConfirmacao: boolean }
  /** As origens de texto sem IA que vêm do editor, e não do painel: a minuta e o modelo anterior (§114). */
  preenchimentos?: Preenchimento[]
  /** Avisa o editor de uma escrita sem IA, para ele oferecer o "Desfazer" (§114). */
  registrarEscrita?: (escrita: { anterior: string; escrito: string; rotulo: string }) => void
  /** A última escrita automática, enquanto o texto continua como ela deixou (§114). */
  desfazer?: { rotulo: string; ia: boolean; onDesfazer: () => void }
  /** As notas da minuta para a seção aberta, mostradas recolhidas na barra do texto (§114). */
  notasDaMinuta?: string[]
}

export const OrientacaoDaIaContexto = createContext<OrientacaoDaIa | null>(null)

/**
 * O campo, sempre aberto, em cima da barra de ações do bloco da IA (§110,
 * §113). Era um `details` recolhido: quem não sabia que podia orientar a IA
 * não abria. Começa com duas linhas e cresce com o texto até um teto.
 * Continua opcional, com o contador na linha do rótulo (§112). O aviso de dado
 * pessoal saiu da tela (§111): a curadoria do servidor recusa dado pessoal e
 * diz o motivo.
 */
export function CampoDeOrientacao() {
  const orientacao = useContext(OrientacaoDaIaContexto)
  const contadorId = useId()
  const campoId = useId()
  if (!orientacao) return null
  const sobra = sobraDaOrientacao(orientacao.texto)

  return (
    <div className="flex min-w-0 flex-col gap-1.5 text-sm" data-ia-fora-da-escrita>
      {/*
        O contador fica na linha do rótulo (§112): embaixo do campo ele abria
        uma linha só para si, entre o campo e a barra de ações.
      */}
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={campoId} className="text-base font-semibold text-text-2">
          Orientação para a IA (opcional)
        </label>
        <span
          id={contadorId}
          className={`shrink-0 text-xs tabular-nums ${sobra < 0 ? "text-tint-danger-fg" : "text-text-muted"}`}
        >
          {sobra < 0
            ? `Passa ${-sobra} do limite de ${LIMITE_DA_ORIENTACAO} caracteres.`
            : `${LIMITE_DA_ORIENTACAO - sobra}/${LIMITE_DA_ORIENTACAO}`}
        </span>
      </div>
      <Textarea
        id={campoId}
        value={orientacao.texto}
        onChange={(e) => orientacao.onTexto(e.target.value)}
        rows={2}
        className="min-h-16 max-h-60 field-sizing-content"
        placeholder="Ex.: entrega em lotes mensais; escolas rurais sem armazenamento."
      />
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
  )
}
