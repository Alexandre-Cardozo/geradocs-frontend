/**
 * Versionamento de documento gerado.
 *
 * Regerar **nunca sobrescreve sem rastro**: incrementa a versão e empilha a
 * anterior no histórico. É exigência de controle — um documento que instrui
 * processo de contratação precisa poder mostrar o que mudou e quando.
 *
 * <p>Quem **monta** o histórico é o servidor desde o Bloco 10: a nota de cada
 * versão vem pronta em `version.note`. O que restou aqui é o vocabulário da
 * retificação, que a tela usa para perguntar, e a leitura da versão, que a tela
 * usa para exibir. As funções que empilhavam versão em memória saíram em
 * 26/08/2026 — ninguém as chamava, e um histórico local seria um segundo lugar
 * onde a mesma verdade mora.
 */

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
