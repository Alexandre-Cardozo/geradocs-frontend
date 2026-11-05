import type { TipoEntidade } from "@/lib/types"

/**
 * O que a entidade é, traduzido do vocabulário do servidor.
 *
 * <p>Vive aqui, e não em cada cliente de API, porque duas telas leem a mesma
 * informação por caminhos diferentes: a sessão (`/me`) e a listagem de
 * organizações. Enquanto o mapa estava duplicado, acrescentar um tipo novo
 * significava lembrar de dois lugares — e o que fosse esquecido viraria
 * "prefeitura" em silêncio.
 */
const TIPOS: Record<string, TipoEntidade> = {
  PREFEITURA: "prefeitura",
  CAMARA: "camara",
  AUTARQUIA: "autarquia",
  FUNDACAO: "fundacao",
  CONSORCIO: "consorcio",
  OUTRO: "outro",
}

/**
 * O tipo declarado pelo servidor.
 *
 * <p>`prefeitura` é o que sobra quando o servidor não declara — é também o
 * padrão dele (`Organization.entityType == null ? PREFEITURA`), então os dois
 * lados concordam sobre o que significa a ausência.
 */
export function tipoDaEntidade(entityType: string | null | undefined): TipoEntidade {
  return (entityType ? TIPOS[entityType] : undefined) ?? "prefeitura"
}

/** A faixa do limite de usuários de uma entidade, a mesma do servidor (ADR-060 do back-end). */
export const LIMITE_USUARIOS_MINIMO = 1
export const LIMITE_USUARIOS_MAXIMO = 999

/**
 * Se a entidade já tem todos os usuários que o plano permite.
 *
 * <p>Só *affordance*: desabilita o botão e explica. Quem recusa de fato é a API
 * (409 `USER_LIMIT_REACHED`), e reabilitar o botão no navegador não muda isso.
 * Sem a contagem — a entidade da sessão não a traz — a tela não presume nada e
 * deixa a API decidir.
 */
export function limiteDeUsuariosAtingido(entidade: {
  limiteUsuarios?: number
  usuariosAtivos?: number
}): boolean {
  const { limiteUsuarios, usuariosAtivos } = entidade
  return limiteUsuarios !== undefined && usuariosAtivos !== undefined && usuariosAtivos >= limiteUsuarios
}

/** O aviso de limite atingido, com o número do plano. */
export function avisoDeLimiteAtingido(limiteUsuarios: number): string {
  const usuarios = limiteUsuarios === 1 ? "usuário" : "usuários"
  return `Limite de ${limiteUsuarios} ${usuarios} atingido, conforme o plano da entidade.`
}

/**
 * O limite como a pessoa digita: inteiro de 1 a 999.
 *
 * @returns o motivo da recusa, ou `undefined` quando o valor serve
 */
export function erroLimiteDeUsuarios(texto: string): string | undefined {
  const limpo = texto.trim()
  if (limpo === "") return "Informe o limite de usuários."
  if (!/^\d+$/.test(limpo)) return "Use apenas números inteiros."
  const valor = Number(limpo)
  if (valor < LIMITE_USUARIOS_MINIMO || valor > LIMITE_USUARIOS_MAXIMO) {
    return `O limite deve estar entre ${LIMITE_USUARIOS_MINIMO} e ${LIMITE_USUARIOS_MAXIMO}.`
  }
  return undefined
}
