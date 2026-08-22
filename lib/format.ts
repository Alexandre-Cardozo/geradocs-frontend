/** Formatação pt-BR — IDs e valores monetários em monospace com formato exato. */

const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
})

/** 485000 → "R$ 485.000,00" (espaço comum, como no protótipo). */
export function formatBRL(valor: number): string {
  return brl.format(valor).replace(/ /g, " ")
}

const numeroBR = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/** 485000 → "485.000,00" — o mesmo formato de formatBRL, sem o símbolo da moeda. */
export function formatNumeroBR(valor: number): string {
  return numeroBR.format(valor)
}

/** "485.000,00" → 485000. Aceita texto sujo ("R$ 485.000,00"); vazio ou inválido → 0. */
export function parseValorBR(texto: string): number {
  const limpo = texto.replace(/[^\d,]/g, "").replace(",", ".")
  return Number.parseFloat(limpo) || 0
}

/**
 * Máscara aplicada a cada tecla nos campos valorados: mantém só dígitos e uma
 * vírgula decimal, agrupa os milhares e corta em duas casas.
 *
 * Não completa as casas decimais — quem faz isso é `normalizaValorBR`, no blur;
 * completar durante a digitação atrapalharia quem ainda está digitando.
 */
export function mascaraValorBR(texto: string): string {
  const limpo = texto.replace(/[^\d,]/g, "")
  const [primeiro = "", ...resto] = limpo.split(",")
  // Zeros à esquerda saem, mas o "0" sozinho permanece.
  const inteiro = primeiro.replace(/^0+(?=\d)/, "")
  const agrupado = inteiro.replace(/\B(?=(\d{3})+(?!\d))/g, ".")
  if (resto.length === 0) return agrupado
  const decimais = resto.join("").slice(0, 2)
  return `${agrupado || "0"},${decimais}`
}

/** Fecha o campo no formato canônico: "500.000" → "500.000,00". Vazio continua vazio. */
export function normalizaValorBR(texto: string): string {
  if (texto.trim() === "") return ""
  return formatNumeroBR(parseValorBR(texto))
}

/** ISO "2024-07-05" → "05/07/2024". */
export function formatData(iso: string): string {
  const [ano, mes, dia] = iso.slice(0, 10).split("-")
  return `${dia}/${mes}/${ano}`
}

/** ISO "2024-07-03T16:42:00" → "03/07/2024 — 16:42". */
export function formatDataHora(iso: string): string {
  return `${formatData(iso)} — ${iso.slice(11, 16)}`
}

/** Fuso oficial de Brasília — usado nas saudações e na data do Dashboard. */
const FUSO_BRASILIA = "America/Sao_Paulo"

/**
 * Hora do dia (0–23) no fuso de Brasília.
 *
 * Formata direto em vez de procurar a parte "hour" no resultado de
 * `formatToParts`: a busca devolve `T | undefined`, obrigava a um `?? "0"` que
 * nenhuma entrada alcança, e "0" seria meia-noite — um fallback que, se um dia
 * fosse atingido, mudaria a saudação em silêncio.
 */
export function horaBrasilia(d: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: FUSO_BRASILIA,
      hour: "2-digit",
      hour12: false,
      hourCycle: "h23",
    }).format(d),
  )
}

/** Saudação conforme o período do dia em Brasília: Bom dia / Boa tarde / Boa noite. */
export function saudacao(d: Date = new Date()): string {
  const h = horaBrasilia(d)
  if (h >= 5 && h < 12) return "Bom dia"
  if (h >= 12 && h < 18) return "Boa tarde"
  return "Boa noite"
}

/** Ano vigente (4 dígitos) no fuso de Brasília. */
export function anoBrasilia(d: Date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", { timeZone: FUSO_BRASILIA, year: "numeric" }).format(d),
  )
}

/** Data atual como ISO "AAAA-MM-DD" no fuso de Brasília (para registrar em fixtures/mocks). */
export function dataBrasiliaISO(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_BRASILIA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d)
}

/** Data+hora atual como ISO "AAAA-MM-DDTHH:mm:ss" no fuso de Brasília. */
export function dataHoraBrasiliaISO(d: Date = new Date()): string {
  const hora = new Intl.DateTimeFormat("en-GB", {
    timeZone: FUSO_BRASILIA,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d)
  return `${dataBrasiliaISO(d)}T${hora}`
}

/** Data por extenso em pt-BR no fuso de Brasília: "Segunda-feira, 07 de julho de 2024". */
export function dataPorExtenso(d: Date = new Date()): string {
  const texto = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_BRASILIA,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(d)
  // Intl retorna com inicial minúscula ("segunda-feira, ...") — capitaliza a primeira letra.
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
