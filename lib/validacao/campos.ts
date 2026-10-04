/**
 * O que cada campo de texto livre do cadastro aceita.
 *
 * Espelho de `FormatosDeTexto` no back-end — mesmas expressões, mesmas
 * mensagens —, para a pessoa ver o problema ao digitar e não depois de enviar.
 * Quem decide continua sendo o servidor.
 *
 * Não é defesa contra injeção de SQL (o banco recebe tudo por parâmetro). É
 * qualidade de cadastro: esses textos saem em documento oficial, e
 * "select * from users" como nome ou um endereço de site como nome de entidade
 * não são dado de prefeitura.
 *
 * Cada função devolve a mensagem do problema, ou `undefined` quando o valor
 * serve. Texto em branco sempre serve aqui: obrigatoriedade é outra regra.
 */

const NOME_DE_PESSOA = /^(?=.*\p{L})[\p{L}\p{M} '’.-]+$/u
const NOME_INSTITUCIONAL = /^(?=.*\p{L})[\p{L}\p{M}\p{N} .,;'’"()/&ºª°–-]+$/u
const MATRICULA = /^(?=.*[0-9])[A-Za-z0-9./-]+$/
const DECRETO = /^(?=.*[0-9])[\p{L}\p{M}\p{N} .,;'’()/ºª°–-]+$/u
/** Quebra de linha e tabulação passam; os demais caracteres de controle e os invisíveis, não. */
const TEXTO_DO_TIMBRE = /^(?:[\n\r\t]|[^\p{Cc}\p{Cf}])*$/u

const PONTUACAO_PERMITIDA = "Use letras, números e apenas . , ; ' \" ( ) / & º ª ° -"

function conferir(valor: string, formato: RegExp, mensagem: string): string | undefined {
  const limpo = valor.trim()
  return limpo === "" || formato.test(limpo) ? undefined : mensagem
}

export function erroNomeDePessoa(valor: string): string | undefined {
  return conferir(valor, NOME_DE_PESSOA, "O nome deve conter apenas letras, espaços, apóstrofo, hífen e ponto.")
}

export function erroCargo(valor: string): string | undefined {
  return conferir(valor, NOME_INSTITUCIONAL, `O cargo precisa ter letras. ${PONTUACAO_PERMITIDA}.`)
}

/**
 * Nome de entidade, unidade ou secretaria.
 *
 * @param oQue o campo como a mensagem o nomeia: "O nome da entidade", "A unidade"
 */
export function erroNomeInstitucional(valor: string, oQue: string): string | undefined {
  return conferir(valor, NOME_INSTITUCIONAL, `${oQue} precisa ter letras. ${PONTUACAO_PERMITIDA}.`)
}

export function erroMatricula(valor: string): string | undefined {
  return conferir(
    valor,
    MATRICULA,
    "A matrícula deve ter ao menos um número e só pode usar letras sem acento, números, ponto, barra e hífen.",
  )
}

export function erroDecreto(valor: string): string | undefined {
  return conferir(
    valor,
    DECRETO,
    "Informe o número do decreto, ex.: Decreto 1.234/2026. Use letras, números e apenas . , ; ' ( ) / º ª ° -",
  )
}

/**
 * As variáveis que cabeçalho e rodapé aceitam, e o que cada uma imprime.
 *
 * A mesma lista de `Letterhead.VARIAVEIS` no back-end: a tela não pode oferecer
 * uma variável que o papel não troca.
 */
export const VARIAVEIS_DO_TIMBRE = [
  { nome: "{processo}", descricao: "número do processo", exemplo: "PROC-2026-007" },
  { nome: "{data}", descricao: "data da versão do documento", exemplo: "" },
  { nome: "{secretaria}", descricao: "secretaria requisitante", exemplo: "Secretaria de Administração" },
  { nome: "{numero}", descricao: "versão do documento", exemplo: "1" },
  { nome: "{pagina}", descricao: "número da página", exemplo: "1" },
] as const

const NOMES_DAS_VARIAVEIS = new Set<string>(VARIAVEIS_DO_TIMBRE.map((v) => v.nome))

/**
 * Cabeçalho ou rodapé: sem caractere de controle e sem variável desconhecida.
 *
 * "{processso}" era aceito e saía no papel ao pé da letra; a prefeitura só
 * descobria o erro de digitação no documento já gerado.
 *
 * @param oQue "O cabeçalho" ou "O rodapé"
 */
export function erroTextoDoTimbre(valor: string, oQue: string): string | undefined {
  if (!TEXTO_DO_TIMBRE.test(valor)) return `${oQue} tem caracteres de controle que não podem ser impressos.`
  const desconhecida = (valor.match(/\{[^{}]*\}/g) ?? []).find((v) => !NOMES_DAS_VARIAVEIS.has(v))
  if (desconhecida) {
    return `Variável desconhecida: ${desconhecida}. Use apenas ${VARIAVEIS_DO_TIMBRE.map((v) => v.nome).join(", ")}.`
  }
  return undefined
}
