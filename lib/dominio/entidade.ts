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
