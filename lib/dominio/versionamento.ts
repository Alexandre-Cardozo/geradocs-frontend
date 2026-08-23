/**
 * Versionamento de documento gerado.
 *
 * Regerar **nunca sobrescreve sem rastro**: incrementa a versão e empilha a
 * anterior no histórico. É exigência de controle — um documento que instrui
 * processo de contratação precisa poder mostrar o que mudou e quando.
 */

import type { VersaoDocumento } from "@/lib/types"

/** Rótulo do motivo da versão, exibido no histórico. */
export type MotivoDaVersao = "inicial" | "regeracao"

export const NOTA_DA_VERSAO: Record<MotivoDaVersao, string> = {
  inicial: "Geração inicial",
  regeracao: "Regeração",
}

/**
 * Por que o documento foi retificado.
 *
 * A distinção não é burocrática. **Erro material** é o que se corrige sem mudar
 * o que foi decidido — número trocado, nome errado, parágrafo repetido.
 * **Alteração substancial** muda o conteúdo da decisão, e é a que costuma exigir
 * republicação e novo prazo. Guardar as duas no mesmo balaio faria o histórico
 * dizer "retificado" sem dizer o que aconteceu, que é justamente o que o
 * controle vai perguntar.
 */
export type MotivoRetificacao = "erro_material" | "alteracao_substancial"

export const MOTIVO_RETIFICACAO_LABEL: Record<MotivoRetificacao, string> = {
  erro_material: "Erro material",
  alteracao_substancial: "Alteração substancial",
}

/** O que a retificação muda no documento, em uma frase — para a tela orientar. */
export const MOTIVO_RETIFICACAO_EXPLICACAO: Record<MotivoRetificacao, string> = {
  erro_material: "Corrige a forma sem mudar o que foi decidido.",
  alteracao_substancial: "Muda o conteúdo da decisão e costuma exigir republicação.",
}

export interface Retificacao {
  motivo: MotivoRetificacao
  /** O que exatamente foi retificado. Vai literal para o histórico. */
  detalhe: string
}

/** Nota do histórico: geração, regeração ou retificação com o motivo declarado. */
export function notaDaVersao(versao: number, retificacao?: Retificacao): string {
  if (!retificacao) return NOTA_DA_VERSAO[versao === 1 ? "inicial" : "regeracao"]
  const rotulo = MOTIVO_RETIFICACAO_LABEL[retificacao.motivo]
  const detalhe = retificacao.detalhe.trim()
  // Sem o detalhe, o histórico diria só "erro material" — e a pergunta seguinte
  // seria sempre "qual?".
  return detalhe ? `Retificação (${rotulo}): ${detalhe}` : `Retificação (${rotulo})`
}

/** Próxima versão de um documento. A primeira geração é a versão 1. */
export function proximaVersao(versaoAtual?: number): number {
  return (versaoAtual ?? 0) + 1
}

/** Entrada do histórico para uma versão recém-gerada. */
export function entradaDeHistorico(
  versao: number,
  geradoEm: string,
  retificacao?: Retificacao,
): VersaoDocumento {
  return { versao, geradoEm, nota: notaDaVersao(versao, retificacao) }
}

/**
 * Empilha a nova versão no topo do histórico.
 *
 * A ordem é do mais recente para o mais antigo porque é assim que a tela lê — e
 * porque a versão vigente é a que se procura primeiro.
 */
export function empilharVersao(historico: VersaoDocumento[], entrada: VersaoDocumento): VersaoDocumento[] {
  return [entrada, ...historico]
}

/** Rótulo da versão para exibição: a partir da segunda, o documento é retificado. */
export function rotuloDaVersao(versao: number): string {
  return versao === 1 ? "v1" : `v${versao} · RETIFICADO`
}

/** O documento foi retificado? Vale da segunda versão em diante. */
export function foiRetificado(versao: number): boolean {
  return versao > 1
}

/**
 * Título do arquivo, marcado quando há retificação.
 *
 * O rótulo entra no **título**, e não só no badge da tela, porque o arquivo sai
 * da plataforma: ele é anexado ao processo no sistema da prefeitura, impresso e
 * encaminhado. Fora daqui, o badge não viaja junto — o título, sim.
 */
export function tituloComRotuloDeVersao(titulo: string, versao: number): string {
  return foiRetificado(versao) ? `${titulo} (RETIFICADO — v${versao})` : titulo
}
