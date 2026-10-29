"use client"

import { useId } from "react"

import { ChoiceCard, InfoBanner, Textarea } from "@/components/ui"
import {
  MOTIVO_RETIFICACAO_EXPLICACAO,
  MOTIVO_RETIFICACAO_LABEL,
  type MotivoRetificacao,
  type Retificacao,
} from "@/lib/dominio"
import type { TipoDocumento } from "@/lib/types"

/** Como a nova versão entra no histórico: regeração, ou retificação de uma das naturezas. */
export type ModoDaNovaVersao = "regeracao" | MotivoRetificacao

export interface EscolhaDaNovaVersao {
  modo: ModoDaNovaVersao | null
  detalhe: string
}

export const NOVA_VERSAO_INICIAL: EscolhaDaNovaVersao = { modo: null, detalhe: "" }

const MOTIVOS = Object.keys(MOTIVO_RETIFICACAO_LABEL) as MotivoRetificacao[]

/** O que falta para gerar a nova versão; `null` quando a escolha está completa. */
export function faltaNaNovaVersao(escolha: EscolhaDaNovaVersao): string | null {
  if (escolha.modo === null) return "Diga se a nova versão é regeração ou retificação."
  if (escolha.modo !== "regeracao" && escolha.detalhe.trim() === "") {
    return "Descreva o que está sendo retificado."
  }
  return null
}

/** A retificação declarada, ou nada quando a nova versão é regeração. */
export function retificacaoDa(escolha: EscolhaDaNovaVersao): Retificacao | undefined {
  if (escolha.modo === null || escolha.modo === "regeracao") return undefined
  return { motivo: escolha.modo, detalhe: escolha.detalhe.trim() }
}

/**
 * Como a nova versão de um documento já gerado entra no histórico.
 *
 * <p>A retificação morava na capa do processo, num painel que pedia a natureza
 * e a descrição mas não deixava mudar o texto — e gerava a versão nova com o
 * que estivesse nas seções, igual à anterior quando ninguém tinha editado
 * nada. No editor, o caminho era o inverso: editava-se o texto e "Regerar"
 * criava a versão sem perguntar nada. A mesma ação, em dois lugares, cada um
 * com metade dela.
 *
 * <p>Agora a pergunta é feita aqui, na etapa em que o texto editado já pode ser
 * lido. Regerar continua sendo possível — o ajuste antes de o documento sair
 * da plataforma não é retificação, e marcar toda regeração como retificação
 * esvaziaria a palavra (§30) —, mas é escolha declarada, e não o padrão mudo.
 */
export function NovaVersaoDoDocumento({
  tipo,
  versaoAtual,
  alterado,
  exigeRetificacao,
  escolha,
  onChange,
}: {
  tipo: TipoDocumento
  versaoAtual: number
  /** As seções já não são o texto da versão gerada. */
  alterado: boolean
  /** O documento mudou de modelo desde a versão gerada (ADR-052 do back-end). */
  exigeRetificacao: boolean
  escolha: EscolhaDaNovaVersao
  onChange: (escolha: EscolhaDaNovaVersao) => void
}) {
  const campoId = useId()
  const retificando = escolha.modo !== null && escolha.modo !== "regeracao"

  return (
    <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-5">
      <div>
        <div className="font-display text-md font-bold text-text-1">Nova Versão — v{versaoAtual + 1}</div>
        <p className="m-0 mt-0.5 text-sm text-text-3">
          A v{versaoAtual} fica no histórico. Diga como esta versão entra nele.
        </p>
      </div>

      {exigeRetificacao ? (
        <InfoBanner tone="warning">
          O {tipo} mudou de modelo desde a v{versaoAtual}: a nova versão só pode ser concluída como
          retificação.
        </InfoBanner>
      ) : (
        !alterado && (
          // Sem isto, retificar sem ter editado gerava uma versão com o mesmo
          // texto (o mesmo hash) da anterior, declarada como correção.
          <InfoBanner tone="info">
            Sem edições desde a v{versaoAtual}: a nova versão sairá com o mesmo texto.
          </InfoBanner>
        )
      )}

      <div className={`grid grid-cols-1 gap-2.5 ${exigeRetificacao ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        {!exigeRetificacao && (
          <ChoiceCard
            size="small"
            selected={escolha.modo === "regeracao"}
            onClick={() => onChange({ ...escolha, modo: "regeracao" })}
            title="Regeração"
            desc="Ajuste antes de o documento sair da plataforma. Não fica registrada como retificação."
          />
        )}
        {MOTIVOS.map((motivo) => (
          <ChoiceCard
            key={motivo}
            size="small"
            selected={escolha.modo === motivo}
            onClick={() => onChange({ ...escolha, modo: motivo })}
            title={`Retificação: ${MOTIVO_RETIFICACAO_LABEL[motivo]}`}
            desc={MOTIVO_RETIFICACAO_EXPLICACAO[motivo]}
          />
        ))}
      </div>

      {retificando && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor={campoId} className="text-sm font-semibold text-text-2">
            O que está sendo retificado
          </label>
          <Textarea
            id={campoId}
            value={escolha.detalhe}
            onChange={(e) => onChange({ ...escolha, detalhe: e.target.value })}
            rows={3}
            placeholder="Ex: o valor estimado da seção 5 constava como R$ 150.000,00 e o correto é R$ 105.000,00."
          />
        </div>
      )}
    </div>
  )
}
