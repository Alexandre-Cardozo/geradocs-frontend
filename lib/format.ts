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

/**
 * Tamanho de arquivo em pt-BR, a partir dos bytes que o servidor mediu.
 *
 * Até 23/08/2026 o tamanho era texto fabricado por tipo de documento ("312 KB",
 * igual para todo processo). Agora entra o número real, e formatar é trabalho da
 * tela — guardar "312 KB" como texto obrigava a interpretar de volta para somar.
 */
export function formatarBytes(bytes: number): string {
  // Sem casas decimais em byte: "512,00 B" mede meio byte, que não existe.
  if (bytes < 1024) return `${bytes} B`
  const kb = bytes / 1024
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0).replace(".", ",")} KB`
  return `${(kb / 1024).toFixed(1).replace(".", ",")} MB`
}

/**
 * Fuso oficial de Brasília (UTC−3). Toda data que a tela mostra passa por ele —
 * não pelo fuso do navegador de quem está olhando.
 */
const FUSO_BRASILIA = "America/Sao_Paulo"

/**
 * O deslocamento de Brasília em relação ao UTC. Fixo desde o fim do horário de
 * verão (Decreto 9.772/2019); é o que se assume para data e hora sem fuso.
 */
const DESLOCAMENTO_BRASILIA = "-03:00"

const horaDoDia = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO_BRASILIA,
  hour: "2-digit",
  hour12: false,
  hourCycle: "h23",
})
const ano = new Intl.DateTimeFormat("en-US", { timeZone: FUSO_BRASILIA, year: "numeric" })
const diaISO = new Intl.DateTimeFormat("en-CA", {
  timeZone: FUSO_BRASILIA,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
})
const relogio = new Intl.DateTimeFormat("en-GB", {
  timeZone: FUSO_BRASILIA,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
})
const porExtenso = new Intl.DateTimeFormat("pt-BR", {
  timeZone: FUSO_BRASILIA,
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
})

/**
 * Hora do dia (0–23) no fuso de Brasília.
 *
 * Formata direto em vez de procurar a parte "hour" no resultado de
 * `formatToParts`: a busca devolve `T | undefined`, obrigava a um `?? "0"` que
 * nenhuma entrada alcança, e "0" seria meia-noite — um fallback que, se um dia
 * fosse atingido, mudaria a saudação em silêncio.
 */
export function horaBrasilia(d: Date = new Date()): number {
  return Number(horaDoDia.format(d))
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
  return Number(ano.format(d))
}

/** Data atual como ISO "AAAA-MM-DD" no fuso de Brasília (para registrar em fixtures/mocks). */
export function dataBrasiliaISO(d: Date = new Date()): string {
  return diaISO.format(d)
}

/** Data+hora atual como ISO "AAAA-MM-DDTHH:mm:ss" no fuso de Brasília. */
export function dataHoraBrasiliaISO(d: Date = new Date()): string {
  return `${dataBrasiliaISO(d)}T${relogio.format(d)}`
}

/** Data por extenso em pt-BR no fuso de Brasília: "Segunda-feira, 07 de julho de 2024". */
export function dataPorExtenso(d: Date = new Date()): string {
  const texto = porExtenso.format(d)
  // Intl retorna com inicial minúscula ("segunda-feira, ...") — capitaliza a primeira letra.
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/** Data de calendário pura ("2024-07-05"): dia sem hora, que não muda com fuso. */
const SO_DATA = /^\d{4}-\d{2}-\d{2}$/
/** Sufixo de fuso no fim do ISO: "Z", "+00:00", "-0300". */
const COM_FUSO = /(?:Z|[+-]\d{2}:?\d{2})$/i

/**
 * Texto ISO de data e hora → instante.
 *
 * O servidor manda instantes em UTC ("2024-07-08T19:42:07.123456Z"); as fixtures
 * e o campo `datetime-local` mandam a hora de parede, sem fuso. Sem fuso, a hora
 * é a de Brasília — nunca a do navegador, que é o que `new Date()` assumiria.
 * As casas além do milissegundo saem porque nem todo motor as aceita.
 */
function instante(iso: string): Date {
  const texto = iso.replace(/(\.\d{3})\d+/, "$1")
  return new Date(COM_FUSO.test(texto) ? texto : `${texto}${DESLOCAMENTO_BRASILIA}`)
}

/**
 * O dia e a hora de Brasília ("AAAA-MM-DDTHH:mm:ss") de um texto ISO, ou `null`
 * quando o texto não é data — a tela mostra o texto como veio em vez de quebrar.
 */
function emBrasilia(iso: string): string | null {
  const d = instante(iso)
  return Number.isNaN(d.getTime()) ? null : dataHoraBrasiliaISO(d)
}

/** "AAAA-MM-DD" → "DD/MM/AAAA". */
function diaBR(dia: string): string {
  const [a, mes, d] = dia.split("-")
  return `${d}/${mes}/${a}`
}

/**
 * Data no formato brasileiro, no dia de Brasília.
 *
 * "2024-07-05" → "05/07/2024" (data pura, sem conversão).
 * "2024-07-08T02:30:00Z" → "07/07/2024" (23:30 do dia 7 em Brasília).
 */
export function formatData(iso: string): string {
  if (SO_DATA.test(iso)) return diaBR(iso)
  const local = emBrasilia(iso)
  return local ? diaBR(local.slice(0, 10)) : iso
}

/**
 * Data e hora no formato brasileiro, no horário de Brasília.
 *
 * "2024-07-03T19:42:00Z" → "03/07/2024 — 16:42". Data pura não tem hora a
 * mostrar e sai só com o dia.
 */
export function formatDataHora(iso: string): string {
  if (SO_DATA.test(iso)) return diaBR(iso)
  const local = emBrasilia(iso)
  return local ? `${diaBR(local.slice(0, 10))} — ${local.slice(11, 16)}` : iso
}

/**
 * O instante no formato do campo `datetime-local` ("AAAA-MM-DDTHH:mm"), na hora
 * de Brasília. Aceita o instante do servidor e a hora já digitada no campo.
 */
export function paraCampoDataHora(iso: string): string {
  if (iso.trim() === "") return ""
  return emBrasilia(iso)?.slice(0, 16) ?? ""
}

/** A hora digitada no `datetime-local`, lida como hora de Brasília, como instante ISO (UTC). */
export function deCampoDataHora(local: string): string {
  return instante(local).toISOString()
}
