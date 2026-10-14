/**
 * O que muda no processo quando a modalidade muda.
 *
 * Trocar a modalidade não é trocar um rótulo: cada uma tem a sua lista de
 * documentos cabíveis (Art. 28 e seguintes da Lei 14.133/21). Sair de Pregão
 * Eletrônico para Dispensa do Art. 75 faz o Edital deixar de existir no
 * processo — e se ele já foi gerado, passa a haver um documento no acervo que a
 * modalidade vigente não comporta.
 *
 * A regra vive aqui, e não na tela, porque descreve o produto: quando o back-end
 * assumir a persistência, a palavra final passa a ser dele e esta cópia continua
 * servindo apenas para a interface avisar antes de deixar salvar.
 */

import { documentosDaModalidade, ordenar, regraDe } from "@/lib/documentos"
import { FORMA_DA_DISPENSA, MODALIDADE_LABEL, type FormaDaDispensa, type Modalidade, type TipoDocumento } from "@/lib/types"

/** A forma da dispensa antes e depois da troca; ausente fora da dispensa. */
export interface FormasDaTroca {
  de?: FormaDaDispensa
  para?: FormaDaDispensa
}

/** "Dispensa com Disputa" na dispensa de forma declarada; o rótulo da modalidade nas demais. */
export function rotuloDaModalidade(modalidade: Modalidade, forma?: FormaDaDispensa): string {
  return modalidade === "Dispensa Art. 75" && forma ? FORMA_DA_DISPENSA[forma].titulo : MODALIDADE_LABEL[modalidade]
}

/** Como a trilha nomeia a modalidade: o valor técnico, e a forma entre parênteses na dispensa. */
function naTrilha(modalidade: Modalidade, forma?: FormaDaDispensa): string {
  if (modalidade !== "Dispensa Art. 75" || !forma) return modalidade
  return `${modalidade} (${forma === "DIRECT" ? "direta" : "com disputa"})`
}

export interface ImpactoTrocaModalidade {
  /** Tipos que a nova modalidade comporta, na ordem do fluxo. */
  cabiveis: TipoDocumento[]
  /** Solicitados hoje que a nova modalidade não comporta. */
  deixamDeSerCabiveis: TipoDocumento[]
  /**
   * Os que já existem no acervo e deixam de ser cabíveis.
   *
   * É o aviso mais grave da lista: documento gerado não some ao trocar a
   * modalidade, e um Edital de um processo que virou dispensa fica no acervo
   * contradizendo o próprio processo.
   */
  jaGeradosQueDeixamDeSerCabiveis: TipoDocumento[]
  /** Obrigatórios da nova modalidade que ainda não foram solicitados. */
  passamASerObrigatorios: TipoDocumento[]
  /** A lista de documentos que a recomendação propõe. */
  documentosSugeridos: TipoDocumento[]
  /** Manter a lista atual diverge da recomendação e precisa de justificativa. */
  exigeJustificativa: boolean
}

/**
 * Trocar a forma da dispensa (direta ↔ com disputa) é troca do mesmo jeito: a
 * regra de documentos é outra (ADR-046).
 *
 * @param solicitados documentos escolhidos no processo hoje
 * @param gerados     documentos que já existem no acervo do processo
 * @param formas      a forma da dispensa antes e depois, quando há dispensa
 */
export function impactoTrocaModalidade(
  de: Modalidade,
  para: Modalidade,
  solicitados: TipoDocumento[],
  gerados: TipoDocumento[] = [],
  formas: FormasDaTroca = {},
): ImpactoTrocaModalidade {
  const cabiveis = documentosDaModalidade(para, formas.para)
  const deixamDeSerCabiveis = ordenar(solicitados.filter((tipo) => !cabiveis.includes(tipo)))
  const passamASerObrigatorios = ordenar(
    regraDe(para, formas.para).obrigatorios.filter((tipo) => !solicitados.includes(tipo)),
  )
  // Mantém o que continua cabível e acrescenta o que a modalidade nova exige —
  // preservar a escolha de quem montou o processo onde ela ainda vale.
  const documentosSugeridos = ordenar([
    ...solicitados.filter((tipo) => cabiveis.includes(tipo)),
    ...passamASerObrigatorios,
  ])
  return {
    cabiveis,
    deixamDeSerCabiveis,
    jaGeradosQueDeixamDeSerCabiveis: deixamDeSerCabiveis.filter((tipo) => gerados.includes(tipo)),
    passamASerObrigatorios,
    documentosSugeridos,
    // Trocar entre modalidades de mesma exigência documental não pede nada: o
    // alerta precisa aparecer quando há consequência, senão vira ruído que se
    // aprende a fechar sem ler.
    exigeJustificativa:
      houveTroca(de, para, formas) && (deixamDeSerCabiveis.length > 0 || passamASerObrigatorios.length > 0),
  }
}

/** Mudou a modalidade ou, na dispensa, a forma. */
export function houveTroca(de: Modalidade, para: Modalidade, formas: FormasDaTroca = {}): boolean {
  return de !== para || (para === "Dispensa Art. 75" && formas.de !== formas.para)
}

/** O que a trilha registra sobre a troca. */
export function motivoDaTrocaDeModalidade(
  de: Modalidade,
  para: Modalidade,
  impacto: ImpactoTrocaModalidade,
  justificativa: string,
  formas: FormasDaTroca = {},
): string {
  const cabecalho = `Modalidade alterada de ${naTrilha(de, formas.de)} para ${naTrilha(para, formas.para)}.`
  // O fato mais grave da troca, e o que a trilha precisa carregar em qualquer
  // caminho: documento gerado não some ao trocar a modalidade, e um Edital de um
  // processo que virou dispensa fica no acervo contradizendo o próprio processo.
  // Até 26/08/2026 este campo era calculado e descartado aqui — a tela avisava,
  // e a trilha, que é quem responde ao controle meses depois, não dizia nada.
  const jaGerados = impacto.jaGeradosQueDeixamDeSerCabiveis.length > 0
    ? ` Documento já gerado que deixa de ser cabível: ${impacto.jaGeradosQueDeixamDeSerCabiveis.join(", ")}.`
    : ""
  if (justificativa.trim()) {
    // A justificativa entra literal: é ela que responde ao controle por que a
    // lista de documentos ficou divergente da recomendação.
    return `${cabecalho} Lista de documentos mantida mediante justificativa: ${justificativa.trim()}${jaGerados}`
  }
  if (impacto.deixamDeSerCabiveis.length === 0 && impacto.passamASerObrigatorios.length === 0) {
    return `${cabecalho}${jaGerados}`
  }
  const partes: string[] = []
  if (impacto.deixamDeSerCabiveis.length > 0) {
    partes.push(`removidos por deixarem de ser cabíveis: ${impacto.deixamDeSerCabiveis.join(", ")}`)
  }
  if (impacto.passamASerObrigatorios.length > 0) {
    partes.push(`incluídos por passarem a ser obrigatórios: ${impacto.passamASerObrigatorios.join(", ")}`)
  }
  return `${cabecalho} Lista de documentos ajustada — ${partes.join("; ")}.${jaGerados}`
}
