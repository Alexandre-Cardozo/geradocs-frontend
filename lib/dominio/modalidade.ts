/**
 * O que muda no processo quando a modalidade muda.
 *
 * Trocar a modalidade não é trocar um rótulo: cada uma tem os seus documentos
 * exigidos (Art. 28 e seguintes da Lei 14.133/21). A troca **acrescenta** o que
 * a nova exige e **não tira nada** (ADR-047 do back-end): sair do Pregão para a
 * Dispensa deixa o Edital no processo, sem ser cobrado — e se ele já foi gerado,
 * o arquivo continua no acervo. Quem não for usá-lo o retira depois.
 *
 * O back-end aplica a mesma regra ao gravar; esta cópia serve para a tela
 * mostrar o efeito antes de confirmar.
 */

import { anexosSob, documentosDaModalidade, ordenar, regraDe } from "@/lib/documentos"
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
  /**
   * O que entra no processo para elaboração: os obrigatórios da nova regra que
   * faltavam e, com cada principal que entra, os anexos que vêm marcados com
   * ele (a minuta de contrato com o edital).
   */
  entram: TipoDocumento[]
  /**
   * O que já estava no processo e a nova modalidade não prevê. **Continua** —
   * a troca não tira nada (ADR-047); quem não for usar retira depois.
   */
  naoPrevistos: TipoDocumento[]
  /** Entre os não previstos, os já gerados: o arquivo continua no acervo. */
  jaGeradosNaoPrevistos: TipoDocumento[]
  /** A lista que o processo passa a ter: a de hoje mais o que entra. */
  documentos: TipoDocumento[]
}

/**
 * O que a troca faz com a lista de documentos: **acrescenta** o que a nova
 * modalidade exige e **mantém** tudo o que já estava — marcado ou elaborado
 * (ADR-047 do back-end).
 *
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
  const regra = regraDe(para, formas.para)
  const cabiveis = documentosDaModalidade(para, formas.para)
  const obrigatoriosQueFaltam = regra.obrigatorios.filter((tipo) => !solicitados.includes(tipo))
  const anexosQueVemJunto = obrigatoriosQueFaltam.flatMap((principal) =>
    anexosSob(principal).filter((anexo) => regra.recomendados.includes(anexo) && !solicitados.includes(anexo)),
  )
  const entram = ordenar([...new Set([...obrigatoriosQueFaltam, ...anexosQueVemJunto])])
  const naoPrevistos = de === para && formas.de === formas.para
    ? []
    : ordenar(solicitados.filter((tipo) => !cabiveis.includes(tipo)))
  return {
    cabiveis,
    entram,
    naoPrevistos,
    jaGeradosNaoPrevistos: naoPrevistos.filter((tipo) => gerados.includes(tipo)),
    documentos: ordenar([...solicitados, ...entram]),
  }
}

/** Mudou a modalidade ou, na dispensa, a forma. */
export function houveTroca(de: Modalidade, para: Modalidade, formas: FormasDaTroca = {}): boolean {
  return de !== para || (para === "Dispensa Art. 75" && formas.de !== formas.para)
}

/** O que a trilha registra sobre a troca: o que entrou e o que ficou sem estar previsto. */
export function motivoDaTrocaDeModalidade(
  de: Modalidade,
  para: Modalidade,
  impacto: ImpactoTrocaModalidade,
  formas: FormasDaTroca = {},
): string {
  const partes = [`Modalidade alterada de ${naTrilha(de, formas.de)} para ${naTrilha(para, formas.para)}.`]
  if (impacto.entram.length > 0) {
    partes.push(`Incluídos para elaboração: ${impacto.entram.join(", ")}.`)
  }
  if (impacto.naoPrevistos.length > 0) {
    // Documento gerado não some ao trocar a modalidade: a trilha, que é quem
    // responde ao controle meses depois, precisa dizer que ele ficou.
    const gerados = impacto.jaGeradosNaoPrevistos.length > 0
      ? ` (já gerados: ${impacto.jaGeradosNaoPrevistos.join(", ")})`
      : ""
    partes.push(`Mantidos, embora a nova modalidade não os preveja: ${impacto.naoPrevistos.join(", ")}${gerados}.`)
  }
  return partes.join(" ")
}
