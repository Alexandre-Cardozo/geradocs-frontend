/**
 * Máquina de estados do processo de contratação.
 *
 * Três estados, e não seis: o fluxo de aprovação entre setores acontece no
 * sistema de processo administrativo da prefeitura (ADR §24 do front-end). Aqui
 * o processo nasce em rascunho, entra em elaboração quando ganha documentos e se
 * encerra quando todos os que ele contém foram gerados.
 *
 * Esta tabela é a **fonte única** das transições. As guardas de negócio — quais
 * documentos existem, quais foram gerados — ficam fora dela, porque dependem de
 * dados do processo, não do grafo.
 */

import type { EventoProcesso, PerfilAcesso, StatusProcesso } from "@/lib/types"

export interface Transicao {
  evento: EventoProcesso
  de: StatusProcesso
  para: StatusProcesso
  /** Perfil que executa a transição. */
  papel: PerfilAcesso
}

/**
 * Rascunho → Em Elaboração → Concluído, com reabertura para retificar.
 *
 * A reabertura existe porque documento gerado pode precisar de correção — e
 * corrigir não pode exigir criar outro processo, que quebraria o histórico.
 */
export const TRANSICOES: Transicao[] = [
  { evento: "geracao_documento", de: "rascunho", para: "em_elaboracao", papel: "servidor" },
  { evento: "encerramento", de: "em_elaboracao", para: "concluido", papel: "servidor" },
  { evento: "reabertura", de: "concluido", para: "em_elaboracao", papel: "servidor" },
]

/**
 * Rótulos dos eventos na trilha.
 *
 * Nem todo evento muda o status: trocar a modalidade ou retificar um documento
 * são registros da trilha sem transição correspondente.
 */
export const EVENTO_LABEL: Record<EventoProcesso, string> = {
  criacao: "Criação do Processo",
  troca_modalidade: "Troca de Modalidade",
  geracao_documento: "Geração de Documento",
  retificacao: "Retificação",
  encerramento: "Encerramento",
  reabertura: "Reabertura",
}

/** A transição que sai de `de` sob `evento`, se existir. */
export function transicaoDe(de: StatusProcesso, evento: EventoProcesso): Transicao | undefined {
  return TRANSICOES.find((t) => t.de === de && t.evento === evento)
}

/** Há uma transição válida saindo de `de` sob `evento`? (só o grafo — sem guardas de negócio) */
export function podeEmitir(de: StatusProcesso, evento: EventoProcesso): boolean {
  return transicaoDe(de, evento) !== undefined
}

/** Status resultante de aplicar `evento` a `de`, ou `undefined` se a transição não existe. */
export function proximoStatus(de: StatusProcesso, evento: EventoProcesso): StatusProcesso | undefined {
  return transicaoDe(de, evento)?.para
}
