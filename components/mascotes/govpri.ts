import {
  Laco,
  amortecer,
  cor,
  lerp,
  limitar,
  movimentoReduzido,
  novoId,
  ouvirCursor,
  type AcaoDaPri,
  type Expressao,
  type OpcoesDaAcao,
} from "@/components/mascotes/catalogo"
import { nomeGovPro, simboloGovPro } from "@/components/mascotes/simbolo"

const NS = "http://www.w3.org/2000/svg"

const PELE = cor("mascote-pele")
const PELE_SOMBRA = cor("mascote-pele-sombra")
const PELE_TRACO = cor("mascote-pele-traco")
const CABELO_ESCURO = cor("mascote-cabelo-escuro")
const CABELO_LUZ = cor("mascote-cabelo-luz")
const BLAZER_ESCURO = cor("mascote-blazer-escuro")
const LABIO = cor("mascote-labio")
const BOCA = cor("mascote-boca")
const LINGUA = cor("mascote-lingua")
const CILIO = cor("mascote-cilio")
const OLHO_E = { x: 162, y: 183 }
const OLHO_D = { x: 238, y: 183 }
const PESCOCO = { x: 200, y: 266 }

type Lado = "e" | "d"
const LADOS: Lado[] = ["e", "d"]

// ---------------- expressões ----------------
type ModoDoOlho = "aberto" | "feliz" | "calmo"
type Sobrancelha = { o: number; m: number; i: number }
type NomeDaBoca =
  | "neutra"
  | "sorriso"
  | "malicia"
  | "aberto"
  | "largo"
  | "seria"
  | "o"
  | "preocupada"
  | "duvida"
  | "pensativa"
  | "A"
  | "E"
  | "O"
  | "M"
type Rosto = {
  olhos: Record<Lado, { modo: ModoDoOlho; ab: number }>
  olhar: [number, number] | null
  sob: Record<Lado, Sobrancelha>
  boca: NomeDaBoca
  incl: number
  rubor: number
  pulo: boolean
}
type AjusteDoRosto = Partial<Omit<Rosto, "olhos" | "sob">> & {
  olhos?: Partial<Record<Lado, Partial<Rosto["olhos"][Lado]>>>
  sob?: Partial<Record<Lado, Sobrancelha>>
}

const sobr = (o: number, m: number, i: number): Sobrancelha => ({ o, m, i })
const ambos = (s: Sobrancelha) => ({ e: { ...s }, d: { ...s } })
const olhos = (modo: ModoDoOlho, ab = 1) => ({ e: { modo, ab }, d: { modo, ab } })

const EXPRESSOES: Partial<Record<Expressao, AjusteDoRosto>> = {
  neutro: {},
  alegre: { olhos: olhos("feliz"), sob: ambos(sobr(-4, -4, -3)), boca: "aberto", rubor: 0.7, incl: 3 },
  sorridente: { olhos: olhos("aberto", 0.94), sob: ambos(sobr(-2, -2, -1)), boca: "sorriso", rubor: 0.45 },
  animado: { olhos: olhos("feliz"), sob: ambos(sobr(-6, -7, -5)), boca: "largo", rubor: 0.85, incl: -3, pulo: true },
  piscando: {
    olhos: { e: { modo: "aberto", ab: 1 }, d: { modo: "feliz" } },
    sob: { e: sobr(-3, -3, -2), d: sobr(2, 2, 3) },
    boca: "malicia",
    rubor: 0.5,
    incl: 4,
  },
  confiante: { olhos: olhos("calmo"), sob: ambos(sobr(-1, -3, 0)), boca: "malicia", rubor: 0.35, incl: -4 },
  pensativo: {
    olhos: olhos("aberto", 0.88),
    olhar: [-6, -7],
    sob: { e: sobr(-2, -5, -6), d: sobr(0, -1, -1) },
    boca: "pensativa",
    incl: 6,
  },
  "em-duvida": {
    olhos: { e: { modo: "aberto", ab: 0.78 }, d: { modo: "aberto", ab: 0.96 } },
    olhar: [6, 1],
    sob: { e: sobr(2, 3, 4), d: sobr(-4, -9, -6) },
    boca: "duvida",
    incl: -6,
  },
  surpreso: { olhos: olhos("aberto", 1.16), sob: ambos(sobr(-8, -10, -9)), boca: "o", rubor: 0.3 },
  preocupado: { olhar: [0, 2], sob: ambos(sobr(3, -3, -8)), boca: "preocupada", rubor: 0.15 },
  serio: { olhos: olhos("aberto", 0.8), sob: ambos(sobr(0, 1, 5)), boca: "seria", rubor: 0.1 },
  "olhando-para-cima": { olhos: olhos("aberto", 1.12), olhar: [1, -6], sob: ambos(sobr(-4, -5, -4)), boca: "neutra", incl: 2 },
}

function resolverExpressao(ajuste: AjusteDoRosto): Rosto {
  const base: Rosto = {
    olhos: olhos("aberto"),
    olhar: null,
    sob: ambos(sobr(0, 0, 0)),
    boca: "neutra",
    incl: 0,
    rubor: 0.25,
    pulo: false,
  }
  return {
    ...base,
    ...ajuste,
    olhos: { e: { ...base.olhos.e, ...ajuste.olhos?.e }, d: { ...base.olhos.d, ...ajuste.olhos?.d } },
    sob: { e: { ...base.sob.e, ...ajuste.sob?.e }, d: { ...base.sob.d, ...ajuste.sob?.d } },
  }
}

// ---------------- poses dos braços (graus: ombro, cotovelo, punho) ----------------
type NomeDaMao = "aberta" | "palma" | "punho" | "aponta" | "oculta"
type Angulos = [number, number, number]
type Pose = {
  e: Angulos
  d: Angulos
  maoE: NomeDaMao
  maoD: NomeDaMao
  dur?: number
  onda?: Lado
  fixa?: boolean
  prop?: "notebook" | "tablet"
  pulos?: boolean
}

const POSES: Record<AcaoDaPri, Pose> = {
  ociosa: { e: [7, -5, 0], d: [-7, 5, 0], maoE: "aberta", maoD: "aberta" },
  acenar: { e: [48, 136, -4], d: [-7, 5, 0], maoE: "aberta", maoD: "aberta", dur: 2.6, onda: "e" },
  apresentar: { e: [7, -5, 0], d: [-24, -118, 34], maoE: "aberta", maoD: "palma", fixa: true },
  "bracos-cruzados": { e: [-12, -98, 0], d: [12, 96, 0], maoE: "oculta", maoD: "punho", fixa: true },
  notebook: { e: [6, -84, -10], d: [-6, 84, 10], maoE: "punho", maoD: "punho", prop: "notebook", fixa: true },
  tablet: { e: [8, -102, -6], d: [-8, 102, 6], maoE: "punho", maoD: "punho", prop: "tablet", fixa: true },
  ideia: { e: [7, -5, 0], d: [-28, -150, 6], maoE: "aberta", maoD: "aponta", dur: 2.6 },
  comemorar: { e: [30, 146, 0], d: [-30, -146, 0], maoE: "punho", maoD: "punho", dur: 2.0, pulos: true },
}

// ---------------- desenho ----------------
const MAOS: Record<NomeDaMao, string> = {
  aberta: `
    <path d="M-14 -2 C-16 10 -16 22 -13 32 L13 32 C16 22 16 10 14 -2 Z"/>
    <rect x="-14" y="25" width="7" height="20" rx="3.5"/><rect x="-6.5" y="27" width="7" height="24" rx="3.5"/>
    <rect x="1" y="27" width="7" height="23" rx="3.5"/><rect x="8.5" y="25" width="6.5" height="18" rx="3.2"/>
    <rect x="-4" y="0" width="8" height="22" rx="4" transform="translate(-13 6) rotate(40)"/>`,
  palma: `
    <path d="M-14 -2 C-16 10 -16 22 -13 32 L13 32 C16 22 16 10 14 -2 Z"/>
    <rect x="-14" y="25" width="7" height="18" rx="3.5"/><rect x="-6.5" y="27" width="7" height="21" rx="3.5"/>
    <rect x="1" y="27" width="7" height="20" rx="3.5"/><rect x="8.5" y="25" width="6.5" height="16" rx="3.2"/>
    <rect x="-4" y="0" width="8" height="20" rx="4" transform="translate(13 6) rotate(-40)"/>`,
  punho: `
    <rect x="-15" y="-2" width="30" height="34" rx="13"/>
    <path d="M-8 23 v7 M0 24 v7 M8 23 v7" fill="none"/>
    <rect x="-16" y="4" width="9" height="20" rx="4.5"/>`,
  aponta: `
    <rect x="-15" y="-2" width="30" height="32" rx="13"/>
    <rect x="-14" y="22" width="8" height="30" rx="4"/>
    <path d="M0 22 v6 M8 21 v6" fill="none"/>
    <rect x="-17" y="4" width="9" height="18" rx="4.5"/>`,
  oculta: "",
}

function braco(lado: Lado, u: string) {
  const contorno = `stroke="${BLAZER_ESCURO}" stroke-width="1.3" stroke-opacity="0.85"`
  return `
    <g class="ombro-${lado}">
      <rect x="-24" y="-14" width="48" height="112" rx="24" fill="url(#${u}-manga)" ${contorno}/><path d="M14 10 C16 40 16 70 12 96" fill="none" stroke="${BLAZER_ESCURO}" stroke-width="2" opacity="0.5"/>
      <g class="cotovelo-${lado}" transform="translate(0 92)">
        <rect x="-21" y="-10" width="42" height="96" rx="21" fill="url(#${u}-manga)" ${contorno}/><path d="M-16 -2 Q0 6 16 -2" fill="none" stroke="${BLAZER_ESCURO}" stroke-width="2" opacity="0.45"/>
        <rect x="-19" y="76" width="38" height="12" rx="5" fill="white" stroke="${cor("border")}"/>
        <circle cx="-9" cy="72" r="2.6" fill="${cor("mascote-ouro")}"/><circle cx="-1" cy="73" r="2.6" fill="${cor("mascote-ouro")}"/>
        <g class="punho-${lado}" transform="translate(0 88)"><g transform="scale(1.18)">
          ${(Object.keys(MAOS) as NomeDaMao[])
            .map(
              (id) =>
                `<g class="mao mao-${id}" fill="${PELE}" stroke="${PELE_TRACO}" stroke-width="1.2" stroke-linecap="round" style="display:none">${MAOS[id]}</g>`,
            )
            .join("")}
        </g></g>
      </g>
    </g>`
}

const MANDIBULA =
  "M200 84 C252 84 283 120 284 166 C285 206 265 242 234 258 C220 266 208 269 200 269 C192 269 180 266 166 258 C135 242 115 206 116 166 C117 120 148 84 200 84 Z"
const CONTORNO_OLHO = "M-25 2 C-19 -17 15 -21 25 -4 C17 11 -14 14 -25 2 Z"
const traco = (d: string, larg = 3.2) =>
  `<path d="${d}" fill="none" stroke="${LABIO}" stroke-width="${larg}" stroke-linecap="round"/>`

const BOCAS: Record<NomeDaBoca, string> = {
  neutra: traco("M186 238 Q200 243 214 238"),
  sorriso: `${traco("M179 233 Q200 251 221 233", 3.4)}<path d="M190 246 Q200 249 210 246" fill="none" stroke="${LINGUA}" stroke-width="2" stroke-linecap="round"/>`,
  malicia: traco("M182 238 Q204 250 222 230", 3.4),
  aberto: `<path d="M177 231 Q200 237 223 231 Q220 256 200 258 Q180 256 177 231 Z" fill="${BOCA}" stroke="${LABIO}" stroke-width="1.6"/><path d="M180 232 Q200 237 220 232 L219 239 Q200 243 181 239 Z" fill="white"/><path d="M187 252 Q200 245 213 252 Q200 258 187 252 Z" fill="${LINGUA}"/>`,
  largo: `<path d="M173 228 Q200 236 227 228 Q224 264 200 266 Q176 264 173 228 Z" fill="${BOCA}" stroke="${LABIO}" stroke-width="1.6"/><path d="M177 229 Q200 236 223 229 L222 238 Q200 243 178 238 Z" fill="white"/><path d="M185 259 Q200 249 215 259 Q200 266 185 259 Z" fill="${LINGUA}"/>`,
  seria: traco("M186 240 L214 240"),
  o: `<ellipse cx="200" cy="242" rx="8" ry="10" fill="${BOCA}" stroke="${LABIO}" stroke-width="2.4"/>`,
  preocupada: traco("M185 243 Q192 236 200 239 Q208 242 215 237"),
  duvida: traco("M185 242 Q200 243 216 234"),
  pensativa: traco("M192 240 Q201 237 209 241"),
  // Fonemas para a fala.
  A: `<path d="M187 234 Q200 238 213 234 Q211 251 200 252 Q189 251 187 234 Z" fill="${BOCA}" stroke="${LABIO}" stroke-width="1.8"/><path d="M190 246 Q200 242 210 246 Q200 251 190 246 Z" fill="${LINGUA}"/>`,
  E: `<path d="M181 235 Q200 240 219 235 Q215 246 200 247 Q185 246 181 235 Z" fill="${BOCA}" stroke="${LABIO}" stroke-width="1.8"/><path d="M184 236 Q200 240 216 236 L215 240 Q200 243 185 240 Z" fill="white"/>`,
  O: `<ellipse cx="200" cy="241" rx="7" ry="9" fill="${BOCA}" stroke="${LABIO}" stroke-width="2.4"/>`,
  M: traco("M187 239 Q200 241 213 239", 3.6),
}
const FONEMAS: NomeDaBoca[] = ["A", "E", "O", "M", "A", "E"]

// Curva da pálpebra superior: interpola entre aberta e fechada.
const PALPEBRA_ABERTA = [24, -4, 14, -21, -18, -17, -25, 2]
const PALPEBRA_FECHADA = [24, 0, 14, 11, -16, 13, -25, 3]
const curvaDaPalpebra = (ab: number) =>
  PALPEBRA_FECHADA.map((v, i) => lerp(v, PALPEBRA_ABERTA[i] ?? v, limitar(ab))) as [
    number, number, number, number, number, number, number, number,
  ]

function sobrancelha(lado: Lado, { o, m, i }: Sobrancelha) {
  const s = lado === "e" ? 1 : -1
  const c = lado === "e" ? OLHO_E : OLHO_D
  const ox = c.x - 29 * s
  const oy = c.y - 29 + o
  const mx = c.x - 4 * s
  const my = c.y - 45 + m
  const ix = c.x + 24 * s
  const iy = c.y - 33 + i
  return `M${ox} ${oy} Q${mx} ${my} ${ix} ${iy} L${ix + s} ${iy + 6.5} Q${mx} ${my + 9} ${ox} ${oy + 3} Z`
}

export type OpcoesDaPri = {
  /** `busto` corta na cintura (padrão); `inteiro` mostra a GovPri de pé, com calça e sapatos. */
  corpo?: "busto" | "inteiro"
  /** O olhar e a cabeça seguem o cursor. */
  olharCursor?: boolean
}

type Olho = {
  g: SVGElement
  aberto: SVGElement
  iris: SVGElement
  palpebra: SVGElement
  cilio: SVGElement
  delineado: SVGElement
  feliz: SVGElement
  calmo: SVGElement
}

/**
 * GovPri em SVG articulado (§127): cabeça, olhos com pálpebra, íris e brilho,
 * sobrancelhas, boca com expressões e fonemas, cabelo com atraso, respiração e
 * dois braços com ombro, cotovelo e punho. Instância imperativa, como o GovBô.
 */
export class GovPri {
  readonly svg: SVGSVGElement
  expressao: Expressao = "neutro"
  private readonly reduzido = movimentoReduzido()
  private readonly laco = new Laco((dt) => this.quadro(dt))
  private readonly pararCursor: () => void
  private readonly cursor = { x: 0, y: 0 }
  private t = 0
  private alvo: Rosto = resolverExpressao({})
  private readonly atual = {
    ab: { e: 1, d: 1 },
    olhar: { x: 0, y: 0 },
    sob: ambos(sobr(0, 0, 0)),
    incl: 0,
    rubor: 0.25,
    bracos: { e: [...POSES.ociosa.e] as Angulos, d: [...POSES.ociosa.d] as Angulos },
  }
  private pose: AcaoDaPri = "ociosa"
  private poseFixa: AcaoDaPri = "ociosa"
  private manter = false
  private inicioDaPose = 0
  private inicioDoPulo = -10
  private readonly voltaEm: Record<Lado, number> = { e: Infinity, d: Infinity }
  private readonly piscada = { proxima: 1.8, fase: -1 }
  private falando = false
  private readonly fonema: { atual: NomeDaBoca; troca: number } = { atual: "M", troca: 0 }
  private readonly no: Record<string, SVGElement>
  private readonly juntas: Record<Lado, [SVGElement, SVGElement, SVGElement]>
  private readonly olhos: Record<Lado, Olho>

  constructor(
    private readonly container: HTMLElement,
    { corpo = "busto", olharCursor = true }: OpcoesDaPri = {},
  ) {
    const u = novoId("govpri")
    this.svg = document.createElementNS(NS, "svg")
    this.svg.setAttribute("viewBox", corpo === "inteiro" ? "-40 40 480 910" : "-40 0 480 496")
    this.svg.setAttribute("aria-hidden", "true")
    this.svg.setAttribute("focusable", "false")
    this.svg.dataset.mascote = "govpri"
    Object.assign(this.svg.style, { width: "100%", height: "100%", overflow: "visible", display: "block" })
    this.svg.innerHTML = desenho(u, corpo === "inteiro")
    container.appendChild(this.svg)

    const q = (s: string) => this.svg.querySelector<SVGElement>(s)!
    this.no = {
      personagem: q(".personagem"),
      cabeca: q(".cabeca"),
      cabeloTras: q(".cabelo-tras"),
      mechas: q(".mechas-frente"),
      tronco: q(".tronco"),
      bocas: q(".bocas"),
      rubor: q(".rubor"),
      sobE: q(".sob-e"),
      sobD: q(".sob-d"),
      notebook: q(".prop-notebook"),
      tablet: q(".prop-tablet"),
      bracoE: q(".braco-e"),
      bracoD: q(".braco-d"),
    }
    this.juntas = {
      e: [q(".ombro-e"), q(".cotovelo-e"), q(".punho-e")],
      d: [q(".ombro-d"), q(".cotovelo-d"), q(".punho-d")],
    }
    const olho = (lado: Lado): Olho => {
      const g = q(`.olho-${lado}`)
      const em = (s: string) => g.querySelector<SVGElement>(s)!
      return {
        g,
        aberto: em(".olho-aberto"),
        iris: em(".iris"),
        palpebra: em(".palpebra"),
        cilio: em(".cilio"),
        delineado: em(".delineado"),
        feliz: em(".olho-feliz"),
        calmo: em(".olho-calmo"),
      }
    }
    this.olhos = { e: olho("e"), d: olho("d") }
    this.pararCursor = olharCursor ? ouvirCursor(container, this.cursor, corpo === "inteiro" ? 0.2 : 0.35) : () => {}
    this.expressar("neutro")
    this.aplicarPose("ociosa")
    this.laco.iniciar()
  }

  // ---------------- API comum ----------------
  expressar(id: Expressao): boolean {
    const ajuste = EXPRESSOES[id]
    if (!ajuste) return false
    this.expressao = id
    this.alvo = resolverExpressao(ajuste)
    if (this.alvo.pulo) this.inicioDoPulo = this.t
    this.mostrarBoca(this.alvo.boca)
    return true
  }

  agir(id: AcaoDaPri, opcoes: OpcoesDaAcao = {}): boolean {
    const p = POSES[id]
    if (!p) return false
    this.manter = Boolean(opcoes.manter)
    if (p.fixa || id === "ociosa" || this.manter) this.poseFixa = id
    this.aplicarPose(id)
    return true
  }

  falar(ligado = true) {
    this.falando = ligado
    if (!ligado) this.mostrarBoca(this.alvo.boca)
  }

  pausar() {
    this.laco.parar()
  }

  retomar() {
    this.laco.iniciar()
  }

  destruir() {
    this.laco.parar()
    this.pararCursor()
    this.svg.remove()
  }

  // ---------------- interno ----------------
  private aplicarPose(id: AcaoDaPri) {
    const p = POSES[id]
    this.pose = id
    this.inicioDaPose = this.t
    for (const lado of LADOS) {
      const mao = lado === "e" ? p.maoE : p.maoD
      for (const g of this.svg.querySelectorAll<SVGElement>(`.punho-${lado} .mao`)) {
        g.style.display = g.classList.contains(`mao-${mao}`) ? "" : "none"
      }
    }
    this.no.notebook!.style.display = p.prop === "notebook" ? "" : "none"
    this.no.tablet!.style.display = p.prop === "tablet" ? "" : "none"
    const repouso = POSES.ociosa
    for (const lado of LADOS) {
      const ativo = p[lado].some((v, i) => Math.abs(v - (repouso[lado][i] ?? v)) > 1)
      if (ativo) this.bracoNaFrente(lado, true)
      else this.voltaEm[lado] = this.t + 0.7
    }
  }

  /** Em repouso os braços ficam sob as mechas; nos gestos passam para a frente do cabelo. */
  private bracoNaFrente(lado: Lado, frente: boolean) {
    const g = lado === "e" ? this.no.bracoE! : this.no.bracoD!
    this.voltaEm[lado] = Infinity
    if (frente) this.no.personagem!.appendChild(g)
    else this.no.personagem!.insertBefore(g, this.no.mechas!)
  }

  private mostrarBoca(id: NomeDaBoca) {
    for (const g of this.no.bocas!.children) {
      ;(g as SVGElement).style.display = (g as SVGElement).dataset.id === id ? "" : "none"
    }
  }

  private piscar(dt: number): number {
    const p = this.piscada
    p.proxima -= dt
    if (p.proxima <= 0 && p.fase < 0) p.fase = 0
    if (p.fase < 0) return 1
    p.fase += dt / 0.17
    if (p.fase >= 1) {
      p.fase = -1
      p.proxima = Math.random() < 0.15 ? 0.22 : 2 + Math.random() * 3.5
      return 1
    }
    return Math.abs(1 - p.fase * 2) ** 0.8
  }

  private quadro(dt: number) {
    this.t += dt
    const t = this.t
    const a = this.atual
    const alvo = this.alvo
    const amp = this.reduzido ? 0.3 : 1

    // Pose temporária volta para a pose fixa.
    const pose = POSES[this.pose]
    if (pose.dur && !this.manter && t - this.inicioDaPose > pose.dur) this.aplicarPose(this.poseFixa)
    for (const lado of LADOS) if (t > this.voltaEm[lado]) this.bracoNaFrente(lado, false)

    for (const lado of LADOS) {
      a.ab[lado] = amortecer(a.ab[lado], alvo.olhos[lado].ab, 12, dt)
      for (const k of ["o", "m", "i"] as const) a.sob[lado][k] = amortecer(a.sob[lado][k], alvo.sob[lado][k], 12, dt)
    }
    const [ox, oy] = alvo.olhar ?? [this.cursor.x * 7, this.cursor.y * 5]
    a.olhar.x = amortecer(a.olhar.x, ox, 10, dt)
    a.olhar.y = amortecer(a.olhar.y, oy, 10, dt)
    a.incl = amortecer(a.incl, alvo.incl + (alvo.olhar ? 0 : this.cursor.x * 3), 6, dt)
    a.rubor = amortecer(a.rubor, alvo.rubor, 6, dt)

    // Braços.
    const onda = pose.onda && !this.reduzido
    for (const lado of LADOS) {
      const b = a.bracos[lado]
      for (let i = 0; i < 3; i++) b[i] = amortecer(b[i]!, pose[lado][i]!, 9, dt)
      const o = b[0]
      let [, c, p] = b
      if (onda && pose.onda === lado) {
        c += 12 * Math.sin(t * 9)
        p += 14 * Math.sin(t * 9 + 0.6)
      }
      if (pose.pulos) c += (lado === "e" ? 1 : -1) * 14 * Math.sin(t * 12)
      if (this.pose === "ideia" && lado === "d") p += 6 * Math.sin(t * 5)
      const respira = Math.sin(t * 1.6) * 1.4 * amp
      const [ombro, cotovelo, punho] = this.juntas[lado]
      ombro.setAttribute("transform", `translate(0 ${(-respira).toFixed(2)}) rotate(${o.toFixed(2)})`)
      cotovelo.setAttribute("transform", `translate(0 92) rotate(${c.toFixed(2)})`)
      punho.setAttribute("transform", `translate(0 88) rotate(${p.toFixed(2)})`)
    }

    // Corpo: respiração, pulo, balanço.
    let pulo = 0
    if (pose.pulos) pulo += Math.abs(Math.sin((t - this.inicioDaPose) * Math.PI * 1.6)) * 14 * amp
    const k = (t - this.inicioDoPulo) / 0.6
    if (k < 1) pulo += Math.sin(k * Math.PI) * 10 * amp
    this.no.personagem!.setAttribute("transform", `translate(0 ${(-pulo).toFixed(2)})`)
    const resp = 1 + Math.sin(t * 1.6) * 0.006 * amp
    this.no.tronco!.setAttribute("transform", `translate(200 520) scale(1 ${resp.toFixed(4)}) translate(-200 -520)`)

    const ang = a.incl + Math.sin(t * 0.7) * 1.4 * amp
    const sobe = -Math.sin(t * 1.6) * 1.2 * amp
    this.no.cabeca!.setAttribute("transform", `translate(0 ${sobe.toFixed(2)}) rotate(${ang.toFixed(2)} ${PESCOCO.x} ${PESCOCO.y})`)
    this.no.cabeloTras!.setAttribute(
      "transform",
      `translate(0 ${sobe.toFixed(2)}) rotate(${(ang * 0.85).toFixed(2)} ${PESCOCO.x} ${PESCOCO.y})`,
    )
    this.no.mechas!.setAttribute(
      "transform",
      `translate(${(ang * 0.35).toFixed(2)} ${(sobe * 0.6).toFixed(2)}) rotate(${(-ang * 0.15).toFixed(2)} 200 240)`,
    )

    // Olhos.
    const pisca = this.piscar(dt)
    for (const lado of LADOS) {
      const o = this.olhos[lado]
      const modo = alvo.olhos[lado].modo
      o.aberto.style.display = modo === "aberto" ? "" : "none"
      o.feliz.style.display = modo === "feliz" ? "" : "none"
      o.calmo.style.display = modo === "calmo" ? "" : "none"
      if (modo !== "aberto") continue
      const ab = a.ab[lado]
      const escala = Math.max(1, ab) * 1.1
      const abPalp = Math.min(1, ab) * pisca
      const s = lado === "e" ? 1 : -1
      const c = lado === "e" ? OLHO_E : OLHO_D
      o.g.setAttribute("transform", `translate(${c.x} ${c.y}) scale(${(s * escala).toFixed(3)} ${escala.toFixed(3)})`)
      o.iris.setAttribute("transform", `translate(${(a.olhar.x * s).toFixed(2)} ${a.olhar.y.toFixed(2)})`)
      const [x1, y1, c1x, c1y, c2x, c2y, x2, y2] = curvaDaPalpebra(abPalp)
      o.palpebra.setAttribute("d", `M32 -40 L32 ${y1} L${x1} ${y1} C${c1x} ${c1y} ${c2x} ${c2y} ${x2} ${y2} L-32 ${y2} L-32 -40 Z`)
      o.cilio.setAttribute("d", `M${x1} ${y1} C${c1x} ${c1y} ${c2x} ${c2y} ${x2} ${y2}`)
      o.delineado.setAttribute("d", `M${x2 + 2} ${y2 - 2} L${x2 - 7} ${y2 - 9 + (1 - abPalp) * 6}`)
    }

    this.no.sobE!.setAttribute("d", sobrancelha("e", a.sob.e))
    this.no.sobD!.setAttribute("d", sobrancelha("d", a.sob.d))
    this.no.rubor!.setAttribute("opacity", a.rubor.toFixed(2))

    if (this.falando) {
      this.fonema.troca -= dt
      if (this.fonema.troca <= 0) {
        let n = FONEMAS[Math.floor(Math.random() * FONEMAS.length)] ?? "M"
        if (n === this.fonema.atual) n = "M"
        this.fonema.atual = n
        this.fonema.troca = 0.08 + Math.random() * 0.07
        this.mostrarBoca(n)
      }
    }
  }
}

function olhoSVG(u: string, lado: Lado) {
  const c = lado === "e" ? OLHO_E : OLHO_D
  const s = lado === "e" ? 1 : -1
  return `
    <g class="olho-${lado}" transform="translate(${c.x} ${c.y}) scale(${s} 1)">
      <clipPath id="${u}-clip-olho-${lado}"><path d="${CONTORNO_OLHO}"/></clipPath>
      <g class="olho-aberto">
        <path d="${CONTORNO_OLHO}" fill="white"/>
        <g clip-path="url(#${u}-clip-olho-${lado})">
          <g class="iris">
            <circle r="13.5" cy="1" fill="url(#${u}-iris)" stroke="${cor("mascote-iris-escura")}" stroke-width="1.4"/>
            <circle r="6.2" cy="1" fill="${cor("mascote-pupila")}"/>
            <circle cx="${4 * s}" cy="-4.5" r="3.8" fill="white"/>
            <circle cx="${-4 * s}" cy="5" r="1.6" fill="white" opacity="0.85"/>
          </g>
          <path d="M-30 -8 Q0 -16 30 -8 L30 -30 L-30 -30 Z" fill="black" opacity="0.06"/>
          <path class="palpebra" fill="${PELE}"/>
        </g>
        <path d="M-20 7 C-10 13 12 12 22 2" fill="none" stroke="${PELE_TRACO}" stroke-width="1.3" opacity="0.7"/>
        <path class="cilio" fill="none" stroke="${CILIO}" stroke-width="4" stroke-linecap="round"/>
        <path class="delineado" d="M-23 0 L-32 -8" stroke="${CILIO}" stroke-width="3.6" stroke-linecap="round"/>
      </g>
      <path class="olho-feliz" d="M-22 4 Q0 -15 22 4" fill="none" stroke="${CILIO}" stroke-width="4" stroke-linecap="round" style="display:none"/>
      <g class="olho-calmo" style="display:none">
        <path d="M-23 -1 Q0 11 23 -1" fill="none" stroke="${CILIO}" stroke-width="4" stroke-linecap="round"/>
        <path d="M-21 2 L-30 -3" stroke="${CILIO}" stroke-width="3.4" stroke-linecap="round"/>
      </g>
    </g>`
}

/** Pernas, sapatos e a barra do blazer: só no corpo inteiro, atrás do tronco. */
function pernas(u: string) {
  const vinco = `fill="none" stroke="${BLAZER_ESCURO}" stroke-width="1.6" opacity="0.35"`
  return `
    <g class="pernas">
      <ellipse cx="200" cy="934" rx="86" ry="9" fill="${cor("navy")}" opacity="0.16"/>
      <path d="M130 536 C134 600 146 660 150 720 C152 780 154 840 158 898 L186 898 C188 840 192 760 194 700 C196 640 198 590 199 536 Z" fill="url(#${u}-calca)"/>
      <path d="M270 536 C266 600 254 660 250 720 C248 780 246 840 242 898 L214 898 C212 840 208 760 206 700 C204 640 202 590 201 536 Z" fill="url(#${u}-calca)"/>
      <path d="M170 600 C171 700 172 800 172 890" ${vinco}/>
      <path d="M230 600 C229 700 228 800 228 890" ${vinco}/>
      <path d="M161 896 L184 896 L183 910 L162 910 Z" fill="${PELE_SOMBRA}"/>
      <path d="M239 896 L216 896 L217 910 L238 910 Z" fill="${PELE_SOMBRA}"/>
      <path d="M156 906 C162 901 182 901 188 906 C193 914 193 924 187 931 L155 931 C149 924 150 914 156 906 Z" fill="${BLAZER_ESCURO}"/>
      <path d="M244 906 C238 901 218 901 212 906 C207 914 207 924 213 931 L245 931 C251 924 250 914 244 906 Z" fill="${BLAZER_ESCURO}"/>
      <path d="M160 910 Q170 906 180 909" fill="none" stroke="white" stroke-width="1.6" opacity="0.25" stroke-linecap="round"/>
      <path d="M240 910 Q230 906 220 909" fill="none" stroke="white" stroke-width="1.6" opacity="0.25" stroke-linecap="round"/>
    </g>`
}

function desenho(u: string, inteiro: boolean): string {
  const corte = inteiro ? 566 : 520
  return `
    <defs>
      <radialGradient id="${u}-rosto" cx="0.46" cy="0.42" r="0.62">
        <stop offset="0" stop-color="${cor("mascote-pele-clara")}"/>
        <stop offset="0.75" stop-color="${PELE}"/>
        <stop offset="1" stop-color="${PELE_SOMBRA}"/>
      </radialGradient>
      <radialGradient id="${u}-iris" cx="0.5" cy="0.62" r="0.6">
        <stop offset="0" stop-color="${cor("mascote-iris-clara")}"/>
        <stop offset="0.6" stop-color="${cor("mascote-iris")}"/>
        <stop offset="1" stop-color="${cor("mascote-iris-escura")}"/>
      </radialGradient>
      <linearGradient id="${u}-cabelo" x1="0" y1="0" x2="0.4" y2="1">
        <stop offset="0" stop-color="${cor("mascote-cabelo-claro")}"/>
        <stop offset="0.6" stop-color="${cor("mascote-cabelo")}"/>
        <stop offset="1" stop-color="${cor("mascote-cabelo-profundo")}"/>
      </linearGradient>
      <linearGradient id="${u}-cabelo-tras" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${cor("mascote-cabelo-profundo")}"/>
        <stop offset="1" stop-color="${CABELO_ESCURO}"/>
      </linearGradient>
      <linearGradient id="${u}-blazer" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="${cor("mascote-blazer-claro")}"/>
        <stop offset="0.5" stop-color="${cor("mascote-blazer")}"/>
        <stop offset="1" stop-color="${BLAZER_ESCURO}"/>
      </linearGradient>
      <linearGradient id="${u}-calca" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${cor("mascote-blazer-claro")}"/>
        <stop offset="0.55" stop-color="${cor("mascote-blazer")}"/>
        <stop offset="1" stop-color="${BLAZER_ESCURO}"/>
      </linearGradient>
      <linearGradient id="${u}-manga" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stop-color="${cor("mascote-blazer-claro")}"/>
        <stop offset="1" stop-color="${BLAZER_ESCURO}"/>
      </linearGradient>
      <radialGradient id="${u}-ouro" cx="0.35" cy="0.35" r="0.7">
        <stop offset="0" stop-color="${cor("mascote-ouro-claro")}"/>
        <stop offset="0.5" stop-color="${cor("mascote-ouro")}"/>
        <stop offset="1" stop-color="${cor("mascote-ouro-escuro")}"/>
      </radialGradient>
      <linearGradient id="${u}-prata" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${cor("border-soft")}"/>
        <stop offset="1" stop-color="${cor("mascote-prata")}"/>
      </linearGradient>
      <filter id="${u}-borrao" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
    </defs>
    <g class="personagem">
      <g class="cabelo-tras">
        <path d="M200 56 C124 56 84 106 84 170 C84 210 72 240 74 276 C76 300 60 318 64 344 C68 368 56 384 70 400 C86 416 116 408 128 392 C140 378 150 360 156 340 L244 340 C250 360 260 378 272 392 C284 408 314 416 330 400 C344 384 332 368 336 344 C340 318 324 300 326 276 C328 240 316 210 316 170 C316 106 276 56 200 56 Z" fill="url(#${u}-cabelo-tras)"/>
      </g>
      ${inteiro ? pernas(u) : ""}
      <g class="tronco">
        <path d="M178 232 L178 302 Q200 314 222 302 L222 232 Z" fill="${PELE_SOMBRA}"/>
        <path d="M178 246 Q200 272 222 246 L222 266 Q200 284 178 266 Z" fill="${PELE_TRACO}" opacity="0.55"/>
        <path d="M200 296 C158 296 122 302 102 316 C88 326 84 344 90 362 C98 386 118 400 125 420 C132 440 135 452 133 466 C131 482 124 496 120 520 L280 520 C276 496 269 482 267 466 C265 452 268 440 275 420 C282 400 302 386 310 362 C316 344 312 326 298 316 C278 302 242 296 200 296 Z" fill="url(#${u}-blazer)"/>
        ${inteiro ? `<path d="M121 512 C118 530 116 548 116 562 Q200 574 284 562 C284 548 282 530 279 512 Z" fill="url(#${u}-blazer)"/>` : ""}
        <path d="M150 334 C140 372 146 412 152 452 C154 470 150 488 146 510" fill="none" stroke="${BLAZER_ESCURO}" stroke-width="1.6" opacity="0.55"/>
        <path d="M250 334 C260 372 254 412 248 452 C246 470 250 488 254 510" fill="none" stroke="${BLAZER_ESCURO}" stroke-width="1.6" opacity="0.55"/>
        <path d="M200 446 L${inteiro ? 186 : 190} ${corte} M200 446 L${inteiro ? 214 : 210} ${corte}" fill="none" stroke="${BLAZER_ESCURO}" stroke-width="1.8"/>
        <circle cx="200" cy="458" r="4.2" fill="${cor("mascote-ouro")}"/>
        <path d="M170 297 L230 297 L213 382 L200 444 L187 382 Z" fill="white"/>
        <path d="M184 300 Q200 316 216 300 L212 312 Q200 324 188 312 Z" fill="${cor("border-soft")}"/>
        <circle cx="200" cy="372" r="2.4" fill="${cor("border")}"/><circle cx="200" cy="404" r="2.4" fill="${cor("border")}"/>
        <path d="M178 290 L160 322 L188 344 L197 304 Z" fill="white" stroke="${cor("border")}" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M222 290 L240 322 L212 344 L203 304 Z" fill="white" stroke="${cor("border")}" stroke-width="1.2" stroke-linejoin="round"/>
        <path d="M168 300 L146 330 L166 354 L156 364 L197 446 L200 444 L187 382 L172 300 Z" fill="${BLAZER_ESCURO}"/>
        <path d="M232 300 L254 330 L234 354 L244 364 L203 446 L200 444 L213 382 L228 300 Z" fill="${BLAZER_ESCURO}"/>
        <path d="M146 330 L166 354 L156 364" fill="none" stroke="${cor("mascote-blazer-realce")}" stroke-width="1.4"/>
        <path d="M254 330 L234 354 L244 364" fill="none" stroke="${cor("mascote-blazer-realce")}" stroke-width="1.4"/>
        ${simboloGovPro(`${u}-simbolo`, 250, 388, 26)}
        ${nomeGovPro(250, 416, 11, { primeira: "white", segunda: cor("marca-azul-claro"), caixa: "mista" })}
      </g>
      <g class="prop-notebook" style="display:none">
        <rect x="114" y="378" width="172" height="104" rx="9" fill="url(#${u}-prata)" stroke="${cor("mascote-prata-escura")}" stroke-width="1.5"/>
        <rect x="108" y="480" width="184" height="9" rx="4" fill="${cor("mascote-prata-escura")}"/>
        <g opacity="0.9">${simboloGovPro(`${u}-simbolo-notebook`, 200, 430, 30)}</g>
      </g>
      <g class="prop-tablet" style="display:none">
        <rect x="146" y="372" width="108" height="78" rx="9" fill="${cor("mascote-tablet")}" stroke="${cor("navy")}" stroke-width="2"/>
        <rect x="152" y="378" width="96" height="66" rx="5" fill="url(#${u}-prata)"/>
        <circle cx="200" cy="384" r="2" fill="${cor("navy")}"/>
        <g opacity="0.85">${simboloGovPro(`${u}-simbolo-tablet`, 200, 412, 22)}</g>
      </g>
      <g class="braco-e" transform="translate(104 330)">${braco("e", u)}</g>
      <g class="braco-d" transform="translate(296 330)">${braco("d", u)}</g>
      <g class="mechas-frente">
        <path d="M118 220 C100 250 112 276 100 302 C88 328 102 350 92 372 C86 392 100 410 120 404 C110 392 118 380 124 366 C134 344 126 322 134 300 C142 276 132 250 134 226 Z" fill="url(#${u}-cabelo)"/>
        <path d="M282 220 C300 250 288 276 300 302 C312 328 298 350 308 372 C314 392 300 410 280 404 C290 392 282 380 276 366 C266 344 274 322 266 300 C258 276 268 250 266 226 Z" fill="url(#${u}-cabelo)"/>
        <path d="M120 236 C110 260 120 282 110 306 C102 328 112 348 104 372" fill="none" stroke="${CABELO_LUZ}" stroke-width="2.2" stroke-linecap="round" opacity="0.55"/>
        <path d="M280 236 C290 260 280 282 290 306 C298 328 288 348 296 372" fill="none" stroke="${CABELO_LUZ}" stroke-width="2.2" stroke-linecap="round" opacity="0.55"/>
        <path d="M126 244 C122 268 128 290 120 316" fill="none" stroke="${CABELO_ESCURO}" stroke-width="1.6" opacity="0.4"/>
        <path d="M274 244 C278 268 272 290 280 316" fill="none" stroke="${CABELO_ESCURO}" stroke-width="1.6" opacity="0.4"/>
      </g>
      <g class="cabeca">
        <ellipse cx="118" cy="188" rx="11" ry="18" fill="${PELE_SOMBRA}"/>
        <ellipse cx="282" cy="188" rx="11" ry="18" fill="${PELE_SOMBRA}"/>
        <path d="${MANDIBULA}" fill="url(#${u}-rosto)"/>
        <circle cx="119" cy="209" r="7.5" fill="url(#${u}-ouro)"/>
        <circle cx="281" cy="209" r="7.5" fill="url(#${u}-ouro)"/>
        <g class="rubor" filter="url(#${u}-borrao)">
          <ellipse cx="149" cy="216" rx="16" ry="9" fill="${cor("mascote-rubor")}"/>
          <ellipse cx="251" cy="216" rx="16" ry="9" fill="${cor("mascote-rubor")}"/>
        </g>
        ${olhoSVG(u, "e")}
        ${olhoSVG(u, "d")}
        <path class="sob-e" fill="${cor("mascote-sobrancelha")}"/>
        <path class="sob-d" fill="${cor("mascote-sobrancelha")}"/>
        <path d="M197 207 Q201 215 206 212" fill="none" stroke="${PELE_TRACO}" stroke-width="2.2" stroke-linecap="round"/>
        <ellipse cx="201" cy="214" rx="7" ry="2.4" fill="${PELE_TRACO}" opacity="0.25"/>
        <g class="bocas" transform="translate(200 240) scale(1.18) translate(-200 -240)">${(Object.keys(BOCAS) as NomeDaBoca[])
          .map((id) => `<g data-id="${id}" style="display:none">${BOCAS[id]}</g>`)
          .join("")}</g>
        <g class="cabelo-frente">
          <path d="M172 76 C150 70 110 86 102 132 C98 154 100 172 107 182 C111 152 122 122 140 104 C152 92 164 86 172 86 C190 104 220 120 252 132 C270 140 280 156 285 178 C288 192 292 202 297 208 C305 172 303 120 285 96 C264 70 214 62 172 76 Z" fill="url(#${u}-cabelo)"/>
          <path d="M176 82 C210 86 250 102 270 130 C282 150 287 172 284 198 C277 170 264 152 242 140 C214 126 192 110 176 82 Z" fill="${cor("mascote-cabelo-claro")}"/>
          <path d="M188 86 C220 94 250 112 268 142" fill="none" stroke="${CABELO_LUZ}" stroke-width="2.4" stroke-linecap="round" opacity="0.6"/>
          <path d="M206 80 C236 86 266 104 284 134" fill="none" stroke="${CABELO_LUZ}" stroke-width="2" stroke-linecap="round" opacity="0.45"/>
          <path d="M156 80 C134 90 116 110 108 142" fill="none" stroke="${CABELO_LUZ}" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
          <path d="M172 76 C168 82 168 86 172 86" fill="none" stroke="${CABELO_ESCURO}" stroke-width="2" opacity="0.6"/>
        </g>
      </g>
    </g>`
}
