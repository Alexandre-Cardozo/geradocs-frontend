/**
 * As fontes de pesquisa de preços da estimativa de valor.
 *
 * <p>São os cinco parâmetros do <b>Art. 23, § 1º, da Lei 14.133/21</b>, com o
 * detalhamento da <b>IN SEGES/ME nº 65/2021</b>. A ordem aqui é a de preferência
 * que a IN estabelece: os dois primeiros são prioritários, e os demais entram de
 * forma complementar ou subsidiária, com justificativa. A pesquisa direta com
 * fornecedores fica por último de propósito — a IN manda evitar que ela seja a
 * única fonte.
 *
 * <p>A escolha entra na memória de cálculo, que é o que a seção guarda: é lá que
 * o controle vai procurar de onde saiu o preço. Guardá-la em outro lugar criaria
 * um segundo registro da mesma coisa, e os dois divergiriam.
 */

export interface FonteDePreco {
  /** O que é gravado e lido de volta da memória de cálculo. */
  rotulo: string
  /** O parâmetro legal correspondente, citado literalmente. */
  fundamento: string
}

/** O valor que a tela usa para dizer "não é nenhuma destas". */
export const OUTRA_FONTE = "__outra__"

export const FONTES_DE_PRECO: FonteDePreco[] = [
  {
    rotulo: "Painel de Preços do Governo Federal (Compras.gov.br)",
    fundamento: "Art. 23, § 1º, I, Lei 14.133/21",
  },
  {
    rotulo: "Banco de Preços em Saúde, no Portal Nacional de Contratações Públicas (PNCP)",
    fundamento: "Art. 23, § 1º, I, Lei 14.133/21",
  },
  {
    rotulo:
      "Contratações similares da Administração Pública, em execução ou concluídas no último ano",
    fundamento: "Art. 23, § 1º, II, Lei 14.133/21",
  },
  {
    rotulo: "Tabela de referência aprovada pelo Poder Executivo federal",
    fundamento: "Art. 23, § 1º, III, Lei 14.133/21",
  },
  {
    rotulo: "Pesquisa publicada em mídia especializada ou em sítio eletrônico especializado",
    fundamento: "Art. 23, § 1º, III, Lei 14.133/21",
  },
  {
    rotulo: "Base nacional de notas fiscais eletrônicas",
    fundamento: "Art. 23, § 1º, V, Lei 14.133/21",
  },
  {
    rotulo: "Pesquisa direta com no mínimo três fornecedores, mediante solicitação formal",
    fundamento: "Art. 23, § 1º, IV, Lei 14.133/21",
  },
]

/** A linha que a memória de cálculo guarda — e de onde a escolha é lida de volta. */
export const PREFIXO_DA_FONTE = "Fonte de pesquisa de preços:"

/**
 * A fonte escolhida, lida da memória de cálculo já gravada.
 *
 * <p>A escolha não tem armazenamento próprio: ela **é** a linha do texto da
 * seção. Ler de volta daqui é o que faz a marcação sobreviver a trocar de seção
 * e recarregar a página — antes ela vivia só na memória da aba e sumia no
 * primeiro clique (§70).
 *
 * @returns o rótulo gravado, ou `null` quando a memória ainda não o declara
 */
export function fonteDeclarada(memoria: string): string | null {
  for (const linha of memoria.split("\n")) {
    const texto = linha.trim()
    if (!texto.startsWith(PREFIXO_DA_FONTE)) continue
    const declarada = texto
      .slice(PREFIXO_DA_FONTE.length)
      .trim()
      .replace(/\.$/, "")
      // O fundamento entre parênteses é escrito pela própria plataforma: lê-lo
      // de volta como parte do rótulo faria a fonte da lei parecer uma "outra".
      .replace(/\s*\(Art\..*\)$/, "")
      .trim()
    return declarada === "" ? null : declarada
  }
  return null
}

/** Se o rótulo gravado é um dos parâmetros da lei — o que decide entre lista e campo livre. */
export function ehFonteCanonica(rotulo: string): boolean {
  return FONTES_DE_PRECO.some((fonte) => fonte.rotulo === rotulo)
}

/** O fundamento legal da fonte, quando ela é um dos parâmetros do Art. 23, § 1º. */
export function fundamentoDaFonte(rotulo: string): string | null {
  return FONTES_DE_PRECO.find((fonte) => fonte.rotulo === rotulo)?.fundamento ?? null
}
