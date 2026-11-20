/**
 * As cláusulas "(Se for o caso)" da minuta, vistas pela tela (ADR 117; ADR-078 do back-end).
 *
 * O servidor reconhece as cláusulas e a IA sugere quais provavelmente não se aplicam, mas quem decide é quem assina:
 * nada é tirado sem o clique. Aqui mora só o que não depende de React nem de rede.
 */

/** Uma cláusula condicional do texto que o editor mostra, no modelo da interface. */
export type ClausulaCondicional = {
  /** Identifica a cláusula nesse texto exato: vale só até o texto mudar. */
  id: string
  /** A numeração na minuta ("10.2"), quando a linha tem. */
  numero?: string
  /** O começo do texto da cláusula, para quem lê reconhecê-la. */
  previa: string
  linhaInicial: number
  linhaFinal: number
  /** A cláusula condicional que contém esta: tirar a mãe tira esta junto. */
  paiId?: string
  /** Está ao lado de um "OU": escolher uma tira a outra. */
  alternativa: boolean
}

export type Veredito = "provavelmente-nao-se-aplica" | "provavelmente-se-aplica" | "indeterminada"

/** O que a IA acha de uma cláusula, com o dado do processo que levou a isso. */
export type SugestaoDaClausula = {
  clausulaId: string
  veredito: Veredito
  motivo: string
}

const MARCADOR = /\(se for o caso\)/i

/** O texto tem alguma marcação? Evita pedir análise ao servidor para a seção que nunca terá. */
export function temClausulaCondicional(texto: string): boolean {
  return MARCADOR.test(texto)
}

export const ROTULO_DO_VEREDITO: Record<Veredito, string> = {
  "provavelmente-nao-se-aplica": "Provavelmente Não Se Aplica",
  "provavelmente-se-aplica": "Provavelmente Se Aplica",
  indeterminada: "Sem Sugestão",
}

/** A cor da etiqueta: só "não se aplica" chama atenção, porque é a única que sugere tirar. */
export const TOM_DO_VEREDITO: Record<Veredito, "warning" | "success" | "neutral"> = {
  "provavelmente-nao-se-aplica": "warning",
  "provavelmente-se-aplica": "success",
  indeterminada: "neutral",
}

/** As que a IA sugere tirar: é o que o botão "Marcar as sugeridas" seleciona, sem tirar nada. */
export function idsSugeridosParaTirar(sugestoes: SugestaoDaClausula[]): string[] {
  return sugestoes.filter((s) => s.veredito === "provavelmente-nao-se-aplica").map((s) => s.clausulaId)
}

/**
 * Quantas cláusulas saem se estas forem tiradas: as escolhidas e os subitens delas.
 *
 * Mostrar o número antes do clique evita a surpresa de tirar "uma" e perder cinco.
 */
export function totalQueSai(clausulas: ClausulaCondicional[], escolhidas: ReadonlySet<string>): number {
  const saem = new Set(escolhidas)
  // Os subitens vêm depois da mãe na ordem do texto, então uma passada basta.
  for (const clausula of clausulas) {
    if (clausula.paiId && saem.has(clausula.paiId)) saem.add(clausula.id)
  }
  return clausulas.filter((c) => saem.has(c.id)).length
}

/** A cláusula tem mãe condicional também escolhida? Então ela sai de qualquer jeito, e a caixa mostra isso. */
export function saiComAMae(clausula: ClausulaCondicional, escolhidas: ReadonlySet<string>): boolean {
  return clausula.paiId !== undefined && escolhidas.has(clausula.paiId)
}
