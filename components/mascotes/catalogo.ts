/**
 * Catálogo comum dos mascotes GovPro (§127). A GovPri e o GovBô respondem à
 * mesma API, `expressar(id)` e `agir(id)`; cada um declara o que sabe fazer e
 * ignora o resto. As cores vêm dos tokens `--color-mascote-*` e da marca.
 */

/** Cor de token do `@theme`, para atributos de SVG. */
export const cor = (token: string) => `var(--color-${token})`

export type Expressao =
  | "neutro"
  | "alegre"
  | "sorridente"
  | "animado"
  | "rindo"
  | "piscando"
  | "confiante"
  | "pensativo"
  | "em-duvida"
  | "surpreso"
  | "preocupado"
  | "serio"
  | "olhando-para-cima"
  | "triste"
  | "bravo"
  | "apaixonado"
  | "dormindo"

export type AcaoDoBo = "ociosa" | "acenar" | "pular" | "girar" | "inclinar" | "comemorar" | "disparar" | "dormir" | "clicar"
export type AcaoDaPri =
  | "ociosa"
  | "acenar"
  | "comemorar"
  | "apresentar"
  | "bracos-cruzados"
  | "notebook"
  | "tablet"
  | "ideia"

/** `repetir`: a ação recomeça ao terminar. `manter`: a pose fica até a próxima ação. */
export type OpcoesDaAcao = { repetir?: boolean; manter?: boolean }

// ---------------------------------------------------------------------------
// Rosto do GovBô, desenhado no visor numa caixa de 400 x 200, olhos em x=130 e
// x=270. São caminhos SVG: o 2D os usa direto em `<path d>`.
// ---------------------------------------------------------------------------

export const COR_LUZ = cor("mascote-bo-luz")
const COR_CORACAO = cor("mascote-bo-coracao")

export type ElementoDoRosto = {
  d: string
  tipo: "traco" | "preenche"
  larg?: number
  cor?: string
  olho?: "e" | "d"
  cx?: number
  cy?: number
}
export type Rosto = { elementos: ElementoDoRosto[]; extra?: Extra; oculos?: boolean }
export type Extra = "brilho" | "exclamacao" | "interrogacao" | "balao" | "coracoes" | "zzz"

const OE = 130
const OD = 270
const OY = 92

const oval = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`
const arcoFeliz = (cx: number, cy: number, w = 30, h = 26) =>
  `M${cx - w} ${cy + h / 2} Q${cx} ${cy - h * 1.3} ${cx + w} ${cy + h / 2}`
const arcoTriste = (cx: number, cy: number, w = 28, h = 18) =>
  `M${cx - w} ${cy - h / 3} Q${cx} ${cy + h * 1.2} ${cx + w} ${cy - h / 3}`
const coracao = (cx: number, cy: number, s = 1) => {
  const p = (x: number, y: number) => `${cx + x * s} ${cy + y * s}`
  return `M${p(0, 22)} C${p(-38, -2)} ${p(-30, -32)} ${p(-14, -32)} C${p(-5, -32)} ${p(0, -24)} ${p(0, -18)} C${p(0, -24)} ${p(5, -32)} ${p(14, -32)} C${p(30, -32)} ${p(38, -2)} ${p(0, 22)} Z`
}

const t = (d: string, larg = 15, extra: Partial<ElementoDoRosto> = {}): ElementoDoRosto => ({ d, tipo: "traco", larg, ...extra })
const f = (d: string, extra: Partial<ElementoDoRosto> = {}): ElementoDoRosto => ({ d, tipo: "preenche", ...extra })
const olhoAberto = (cx: number, lado: "e" | "d", rx = 24, ry = 31) => f(oval(cx, OY, rx, ry), { olho: lado, cx, cy: OY })

const BOCA_ABERTA = "M160 128 Q200 134 240 128 Q236 172 200 174 Q164 172 160 128 Z"
const BOCA_SORRISO = "M162 134 Q200 168 238 134"
const RUBOR = [t("M86 140 L96 128", 7), t("M100 142 L110 130", 7), t("M290 140 L300 128", 7), t("M304 142 L314 130", 7)]

export const ROSTOS_DO_BO: Partial<Record<Expressao, Rosto>> = {
  neutro: { elementos: [olhoAberto(OE, "e"), olhoAberto(OD, "d"), t("M178 140 Q200 152 222 140", 12)] },
  alegre: { elementos: [t(arcoFeliz(OE, OY), 17), t(arcoFeliz(OD, OY), 17), f(BOCA_ABERTA), ...RUBOR] },
  sorridente: { elementos: [t(arcoFeliz(OE, OY), 17), t(arcoFeliz(OD, OY), 17), t(BOCA_SORRISO, 14)] },
  animado: {
    elementos: [olhoAberto(OE, "e", 27, 34), olhoAberto(OD, "d", 27, 34), f(BOCA_ABERTA)],
    extra: "brilho",
  },
  rindo: {
    elementos: [
      t(`M${OE - 26} ${OY - 22} L${OE + 18} ${OY} L${OE - 26} ${OY + 22}`, 15),
      t(`M${OD + 26} ${OY - 22} L${OD - 18} ${OY} L${OD + 26} ${OY + 22}`, 15),
      f("M150 124 Q200 132 250 124 Q246 182 200 184 Q154 182 150 124 Z"),
      ...RUBOR,
    ],
    extra: "brilho",
  },
  piscando: {
    elementos: [olhoAberto(OE, "e"), t(arcoFeliz(OD, OY + 6, 28, 20), 15), t("M168 138 Q205 162 236 128", 13)],
  },
  confiante: {
    elementos: [
      f("M84 70 L176 70 Q178 112 150 118 L112 118 Q84 112 84 70 Z"),
      f("M224 70 L316 70 Q316 112 288 118 L250 118 Q222 112 224 70 Z"),
      t("M176 76 L224 76", 9),
      t("M180 140 Q212 156 234 128", 13),
    ],
    oculos: true,
  },
  pensativo: {
    elementos: [
      f(oval(OE + 12, OY - 12, 20, 26), { olho: "e", cx: OE + 12, cy: OY - 12 }),
      f(oval(OD + 12, OY - 12, 20, 26), { olho: "d", cx: OD + 12, cy: OY - 12 }),
      t("M184 146 Q196 140 206 146 Q216 152 226 144", 11),
    ],
    extra: "balao",
  },
  "em-duvida": {
    elementos: [
      t(`M${OE - 26} ${OY + 2} L${OE + 26} ${OY + 2}`, 15),
      olhoAberto(OD, "d", 22, 29),
      t(`M${OD - 24} ${OY - 46} L${OD + 22} ${OY - 52}`, 10),
      t("M178 146 L222 140", 12),
    ],
    extra: "interrogacao",
  },
  surpreso: {
    elementos: [
      t(oval(OE, OY, 24, 28), 13, { olho: "e", cx: OE, cy: OY }),
      t(oval(OD, OY, 24, 28), 13, { olho: "d", cx: OD, cy: OY }),
      t(oval(200, 152, 13, 16), 11),
    ],
    extra: "exclamacao",
  },
  preocupado: {
    elementos: [
      olhoAberto(OE, "e", 20, 24),
      olhoAberto(OD, "d", 20, 24),
      t(`M${OE - 30} ${OY - 34} L${OE + 22} ${OY - 48}`, 10),
      t(`M${OD + 30} ${OY - 34} L${OD - 22} ${OY - 48}`, 10),
      t("M176 152 Q188 142 200 150 Q212 158 224 148", 11),
    ],
  },
  triste: {
    elementos: [
      t(arcoTriste(OE, OY + 4), 15),
      t(arcoTriste(OD, OY + 4), 15),
      t(`M${OE - 28} ${OY - 26} L${OE + 22} ${OY - 40}`, 10),
      t(`M${OD + 28} ${OY - 26} L${OD - 22} ${OY - 40}`, 10),
      t("M174 156 Q200 132 226 156", 12),
    ],
  },
  bravo: {
    elementos: [
      f(`M${OE - 26} ${OY - 14} L${OE + 26} ${OY + 2} Q${OE + 22} ${OY + 30} ${OE} ${OY + 30} Q${OE - 26} ${OY + 28} ${OE - 26} ${OY - 14} Z`),
      f(`M${OD + 26} ${OY - 14} L${OD - 26} ${OY + 2} Q${OD - 22} ${OY + 30} ${OD} ${OY + 30} Q${OD + 26} ${OY + 28} ${OD + 26} ${OY - 14} Z`),
      t("M176 154 Q200 136 224 154", 12),
    ],
  },
  apaixonado: {
    elementos: [
      f(coracao(OE, OY + 4, 1.05), { cor: COR_CORACAO, olho: "e", cx: OE, cy: OY }),
      f(coracao(OD, OY + 4, 1.05), { cor: COR_CORACAO, olho: "d", cx: OD, cy: OY }),
      t(BOCA_SORRISO, 13),
    ],
    extra: "coracoes",
  },
  dormindo: {
    elementos: [t(arcoTriste(OE, OY + 6, 26, 14), 13), t(arcoTriste(OD, OY + 6, 26, 14), 13), t(oval(200, 146, 9, 7), 9)],
    extra: "zzz",
  },
}

/** Elementos que flutuam acima da cabeça: SVG 160 x 120, ancorado no centro de baixo. */
export function extraSVG(tipo: Extra, atributos = ""): string {
  const abre = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" ${atributos}>`
  const fecha = "</svg>"
  const azul = cor("marca-azul")
  const amarelo = cor("marca-amarelo")
  switch (tipo) {
    case "brilho":
      return `${abre}<g stroke="${amarelo}" stroke-width="9" stroke-linecap="round" fill="none"><path d="M80 20 L80 52"/><path d="M48 34 L60 58"/><path d="M112 34 L100 58"/></g>${fecha}`
    case "exclamacao":
      return `${abre}<g fill="${amarelo}"><rect x="58" y="10" width="14" height="58" rx="7" transform="rotate(-10 65 40)"/><circle cx="72" cy="88" r="8"/><rect x="88" y="10" width="14" height="58" rx="7" transform="rotate(10 95 40)"/><circle cx="90" cy="88" r="8"/></g>${fecha}`
    case "interrogacao":
      return `${abre}<path d="M62 40 Q62 14 82 14 Q104 14 104 36 Q104 52 86 60 Q80 64 80 76" fill="none" stroke="${azul}" stroke-width="12" stroke-linecap="round"/><circle cx="80" cy="98" r="8" fill="${azul}"/>${fecha}`
    case "balao":
      return `${abre}<path d="M44 20 H116 Q132 20 132 36 V62 Q132 78 116 78 H86 L70 96 L72 78 H44 Q28 78 28 62 V36 Q28 20 44 20 Z" fill="white" stroke="${azul}" stroke-width="6"/><g fill="${azul}"><circle cx="60" cy="49" r="7"/><circle cx="80" cy="49" r="7"/><circle cx="100" cy="49" r="7"/></g>${fecha}`
    case "coracoes":
      return `${abre}<g fill="${COR_CORACAO}"><path d="${coracao(58, 64, 0.8)}"/><path d="${coracao(106, 40, 0.62)}"/></g>${fecha}`
    case "zzz":
      return `${abre}<g fill="none" stroke="${azul}" stroke-linecap="round" stroke-linejoin="round"><path d="M40 70 H62 L40 94 H62" stroke-width="8"/><path d="M78 44 H96 L78 64 H96" stroke-width="7"/><path d="M110 16 H124 L110 32 H124" stroke-width="6"/></g>${fecha}`
  }
}

// ---------------------------------------------------------------------------
// Utilitários de animação
// ---------------------------------------------------------------------------

export const lerp = (a: number, b: number, k: number) => a + (b - a) * k
export const suave = (x: number) => x * x * (3 - 2 * x)
export const limitar = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x))
/** Aproxima `atual` de `alvo` com taxa independente da taxa de quadros. */
export const amortecer = (atual: number, alvo: number, taxa: number, dt: number) => lerp(atual, alvo, 1 - Math.exp(-taxa * dt))
export const movimentoReduzido = () =>
  typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches

let contador = 0
/** Prefixo único para os ids internos (gradientes, máscaras) de cada mascote. */
export const novoId = (prefixo: string) => `${prefixo}${++contador}`

/**
 * Laço de quadros comum: `quadro(dt)` a cada `requestAnimationFrame`, parado
 * quando o mascote sai da tela (`pausar`) e retomado quando volta.
 */
export class Laco {
  private pedido = 0
  private ultimo = 0
  private ativo = false

  constructor(private readonly quadro: (dt: number) => void) {}

  iniciar() {
    if (this.ativo) return
    this.ativo = true
    this.ultimo = performance.now()
    const passo = (agora: number) => {
      if (!this.ativo) return
      const dt = Math.min(0.05, Math.max(0, (agora - this.ultimo) / 1000))
      this.ultimo = agora
      this.quadro(dt)
      this.pedido = requestAnimationFrame(passo)
    }
    this.pedido = requestAnimationFrame(passo)
  }

  parar() {
    this.ativo = false
    cancelAnimationFrame(this.pedido)
  }
}

/** Direção do cursor em relação ao centro de um elemento, de -1 a 1 em cada eixo. */
export function ouvirCursor(elemento: Element, alvo: { x: number; y: number }, alturaDoOlhar = 0.5) {
  const aoMover = (ev: PointerEvent) => {
    const r = elemento.getBoundingClientRect()
    alvo.x = limitar((ev.clientX - (r.left + r.width / 2)) / (window.innerWidth / 2), -1, 1)
    alvo.y = limitar((ev.clientY - (r.top + r.height * alturaDoOlhar)) / (window.innerHeight / 2), -1, 1)
  }
  window.addEventListener("pointermove", aoMover, { passive: true })
  return () => window.removeEventListener("pointermove", aoMover)
}
