/**
 * As unidades de medida da contratação.
 *
 * <p>A unidade era texto livre no item do DFD ("RESMA", "Unidade", "un") e uma
 * lista de quatro opções no painel de quantidades do ETP — duas fontes que não
 * conversavam. O efeito prático: "UN" e "Unidade" viravam divergência de
 * unidade na consolidação sem que nada estivesse errado, e a quantidade que a
 * secretaria pediu não chegava à seção que a lei manda demonstrar.
 *
 * <p>A lista é a mesma nos dois lugares, agrupada por natureza, e guarda a
 * **sigla** — a coluna do banco aceita 20 caracteres, e é a sigla que cabe num
 * quadro de itens. `Outra` existe de propósito: unidade de contratação
 * municipal tem exceção, e recusá-la transformaria orientação em obstáculo.
 */

/** O valor gravado é a sigla; o rótulo é o que a pessoa lê ao escolher. */
export interface UnidadeDeMedida {
  sigla: string
  nome: string
}

export interface GrupoDeUnidades {
  grupo: string
  unidades: UnidadeDeMedida[]
}

/**
 * As unidades mais recorrentes em contratação municipal.
 *
 * <p>Ordenadas por frequência dentro de cada grupo: quem escolhe encontra o
 * comum primeiro, e a lista longa não atrapalha quem procura o raro.
 */
export const UNIDADES: GrupoDeUnidades[] = [
  {
    grupo: "Contagem",
    unidades: [
      { sigla: "UN", nome: "Unidade" },
      { sigla: "PÇ", nome: "Peça" },
      { sigla: "CX", nome: "Caixa" },
      { sigla: "PCT", nome: "Pacote" },
      { sigla: "RESMA", nome: "Resma" },
      { sigla: "FARDO", nome: "Fardo" },
      { sigla: "ROLO", nome: "Rolo" },
      { sigla: "PAR", nome: "Par" },
      { sigla: "KIT", nome: "Kit" },
      { sigla: "CJ", nome: "Conjunto" },
      { sigla: "DZ", nome: "Dúzia" },
    ],
  },
  {
    grupo: "Massa",
    unidades: [
      { sigla: "KG", nome: "Quilograma" },
      { sigla: "G", nome: "Grama" },
      { sigla: "T", nome: "Tonelada" },
    ],
  },
  {
    grupo: "Volume",
    unidades: [
      { sigla: "L", nome: "Litro" },
      { sigla: "ML", nome: "Mililitro" },
      { sigla: "M³", nome: "Metro cúbico" },
      { sigla: "GL", nome: "Galão" },
      { sigla: "FR", nome: "Frasco" },
      { sigla: "TB", nome: "Tubo" },
    ],
  },
  {
    grupo: "Comprimento e área",
    unidades: [
      { sigla: "M", nome: "Metro" },
      { sigla: "ML", nome: "Metro linear" },
      { sigla: "M²", nome: "Metro quadrado" },
      { sigla: "KM", nome: "Quilômetro" },
    ],
  },
  {
    grupo: "Tempo e serviço",
    unidades: [
      { sigla: "SERV", nome: "Serviço" },
      { sigla: "MÊS", nome: "Mês" },
      { sigla: "DIÁRIA", nome: "Diária" },
      { sigla: "H", nome: "Hora" },
      { sigla: "POSTO", nome: "Posto" },
      { sigla: "LIC", nome: "Licença" },
      { sigla: "ASSIN", nome: "Assinatura" },
    ],
  },
]

/** O valor que a tela usa para dizer "não é nenhuma destas". */
export const OUTRA_UNIDADE = "__outra__"

/** Toda unidade da lista, achatada — a ordem dos grupos é a da lista. */
export const TODAS_AS_UNIDADES: UnidadeDeMedida[] = UNIDADES.flatMap((g) => g.unidades)

/**
 * A unidade comparável: maiúsculas, sem acento e sem pontuação.
 *
 * <p>É a mesma regra do servidor (`DemandItem.normalizedUnit`), e é ela que faz
 * "un", "UN" e "Unidade" pararem de aparecer como divergência entre secretarias
 * que pediram a mesma coisa.
 */
export function unidadeComparavel(unidade: string): string {
  return unidade
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9²³]/g, "")
}

/**
 * O rótulo de uma unidade gravada.
 *
 * <p>Unidade fora da lista **continua aparecendo como foi gravada**: há item
 * antigo com "Unidade" e "Bloco" no banco, e trocá-los por "não reconhecida"
 * apagaria o que a secretaria pediu.
 */
export function rotuloDaUnidade(unidade: string): string {
  const conhecida = TODAS_AS_UNIDADES.find(
    (u) => unidadeComparavel(u.sigla) === unidadeComparavel(unidade),
  )
  return conhecida ? `${conhecida.nome} (${conhecida.sigla})` : unidade
}

/** Se a unidade gravada é uma das canônicas — o que decide entre lista e campo livre. */
export function ehUnidadeCanonica(unidade: string): boolean {
  return TODAS_AS_UNIDADES.some(
    (u) => unidadeComparavel(u.sigla) === unidadeComparavel(unidade),
  )
}

/**
 * A sigla canônica correspondente, quando existir.
 *
 * <p>Aceita o nome por extenso além da sigla: o cadastro antigo gravou
 * "Unidade" e "Caixa", e reconhecê-los evita que a mesma unidade apareça duas
 * vezes na lista de quem edita um item antigo.
 */
export function siglaDaUnidade(unidade: string): string | null {
  const comparavel = unidadeComparavel(unidade)
  const porSigla = TODAS_AS_UNIDADES.find((u) => unidadeComparavel(u.sigla) === comparavel)
  if (porSigla) return porSigla.sigla
  const porNome = TODAS_AS_UNIDADES.find((u) => unidadeComparavel(u.nome) === comparavel)
  return porNome ? porNome.sigla : null
}
