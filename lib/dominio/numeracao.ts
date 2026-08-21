/**
 * Identificadores de processo e documento do órgão.
 *
 * O formato é institucional: `PROC-AAAA-NNN` aparece no protocolo, em ofício e
 * na capa do processo. Mudá-lo por engano quebra a correspondência com o acervo
 * do município, então a regra fica em um lugar só.
 */

/** `PROC-2026-007` — três dígitos, por ano. */
export function numeroDeProcesso(ano: number | string, sequencia: number): string {
  return `PROC-${ano}-${String(sequencia).padStart(3, "0")}`
}

/** `DOC-2026-0042` — quatro dígitos, por ano. */
export function numeroDeDocumento(ano: number | string, sequencia: number): string {
  return `DOC-${ano}-${String(sequencia).padStart(4, "0")}`
}

/** Título do arquivo gerado: tipo e objeto do processo. */
export function tituloDoDocumento(tipo: string, objeto: string): string {
  return `${tipo} — ${objeto}`
}
