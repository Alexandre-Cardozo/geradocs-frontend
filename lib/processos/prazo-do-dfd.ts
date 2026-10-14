/**
 * A data prevista de conclusão da contratação, como o DFD a informa (ADR-044
 * do back-end).
 *
 * Ela não trava nada — DFD registrado depois da data é caso real —, mas a tela
 * diz quanto falta, para que a data vencida salte aos olhos. O ano fora de
 * 2000–2100 o servidor recusa, e aqui ele é apontado antes do envio: "0202" é o
 * erro de digitação mais comum num campo de data.
 */

const DIA_EM_MS = 86_400_000

/** Os atalhos de prazo, em dias a partir de hoje. */
export const ATALHOS_DE_PRAZO = [30, 60, 90] as const

/** O dia "AAAA-MM-DD" somado de `dias` — no calendário, sem fuso no meio. */
export function somarDias(iso: string, dias: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + dias * DIA_EM_MS).toISOString().slice(0, 10)
}

/** Quantos dias de `hoje` até `iso`; negativo quando já passou. */
export function diasAte(iso: string, hoje: string): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / DIA_EM_MS)
}

export interface SituacaoDoPrazo {
  rotulo: string
  tom: "neutral" | "warning" | "danger"
}

const dias = (n: number) => (n === 1 ? "1 dia" : `${n} dias`)

/** "Em 45 dias", "Vence hoje", "Venceu há 3 dias" — e o tom que a tela dá a isso. */
export function situacaoDoPrazo(iso: string, hoje: string): SituacaoDoPrazo {
  const faltam = diasAte(iso, hoje)
  if (faltam < 0) return { rotulo: `Venceu há ${dias(-faltam)}`, tom: "danger" }
  if (faltam === 0) return { rotulo: "Vence hoje", tom: "warning" }
  return { rotulo: `Em ${dias(faltam)}`, tom: faltam <= 30 ? "warning" : "neutral" }
}

/** O que impede gravar a data; vazio é aceito (a data é opcional). */
export function erroDaDataPrevista(iso: string): string | undefined {
  if (iso === "") return undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || Number.isNaN(Date.parse(`${iso}T00:00:00Z`))) {
    return "Informe uma data válida."
  }
  const ano = Number(iso.slice(0, 4))
  if (ano < 2000 || ano > 2100) return "Confira o ano: a data prevista precisa estar entre 2000 e 2100."
  return undefined
}
