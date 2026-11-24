import {
  COR_LUZ,
  Laco,
  ROSTOS_DO_BO,
  amortecer,
  cor,
  extraSVG,
  movimentoReduzido,
  novoId,
  ouvirCursor,
  type AcaoDoBo,
  type ElementoDoRosto,
  type Expressao,
  type OpcoesDaAcao,
} from "@/components/mascotes/catalogo"
import { MovimentoDoBo, Piscar } from "@/components/mascotes/movimento-do-bo"
import { nomeGovPro, simboloGovPro } from "@/components/mascotes/simbolo"

const NS = "http://www.w3.org/2000/svg"
const CX = 160
const CY = 185
const R = 110

export type OpcoesDoBo = {
  /** O olhar e o corpo seguem o cursor. */
  olharCursor?: boolean
  /** Sombra de contato no chão. */
  sombra?: boolean
}

/**
 * GovBô em SVG (§127), animado em código. O giro e o olhar usam um falso 3D: a
 * frente (visor, rosto, logo) desliza sobre a esfera e os fones acompanham.
 * Instância imperativa: o componente React só a cria, repassa as ordens e destrói.
 */
export class GovBo {
  readonly svg: SVGSVGElement
  expressao: Expressao = "neutro"
  private readonly movimento = new MovimentoDoBo(movimentoReduzido())
  private readonly piscar = new Piscar()
  private readonly laco = new Laco((dt) => this.quadro(dt))
  private readonly olhar = { x: 0, y: 0 }
  private readonly alvoDoOlhar = { x: 0, y: 0 }
  private readonly giro = { x: 0, y: 0 }
  private readonly pararCursor: () => void
  private olhos: { el: ElementoDoRosto; no: SVGElement }[] = []
  private inicioDoExtra = 0
  private readonly no: Record<string, SVGElement>
  private readonly pontas: SVGElement[]
  private readonly leds: SVGElement[]

  constructor(
    private readonly container: HTMLElement,
    { olharCursor = true, sombra = true }: OpcoesDoBo = {},
  ) {
    const u = novoId("govbo")
    this.svg = document.createElementNS(NS, "svg")
    this.svg.setAttribute("viewBox", "0 0 320 340")
    this.svg.setAttribute("aria-hidden", "true")
    this.svg.setAttribute("focusable", "false")
    this.svg.dataset.mascote = "govbo"
    Object.assign(this.svg.style, { width: "100%", height: "100%", overflow: "visible", display: "block" })
    this.svg.innerHTML = desenho(u, sombra)
    container.appendChild(this.svg)

    const q = (s: string) => this.svg.querySelector<SVGElement>(s)!
    this.no = {
      flutuador: q(".flutuador"),
      corpo: q(".corpo"),
      frente: q(".frente"),
      rosto: q(".rosto"),
      rostoPos: q(".rosto-pos"),
      extra: q(".extra"),
      foneE: q(".fone-e"),
      foneD: q(".fone-d"),
      antE: q(".antena-e"),
      antD: q(".antena-d"),
    }
    const s = this.svg.querySelector<SVGElement>(".sombra")
    if (s) this.no.sombra = s
    this.pontas = [...this.svg.querySelectorAll<SVGElement>(".ponta")]
    this.leds = [...this.svg.querySelectorAll<SVGElement>(".led")]
    this.pararCursor = olharCursor ? ouvirCursor(container, this.alvoDoOlhar) : () => {}
    this.expressar("neutro")
    this.laco.iniciar()
  }

  expressar(id: Expressao): boolean {
    const rosto = ROSTOS_DO_BO[id]
    if (!rosto) return false
    this.expressao = id
    this.movimento.pop()
    this.no.rosto!.innerHTML = rosto.elementos
      .map((el, i) => {
        const c = el.cor ?? COR_LUZ
        const estilo =
          el.tipo === "traco"
            ? `fill="none" stroke="${c}" stroke-width="${el.larg}" stroke-linecap="round" stroke-linejoin="round"`
            : `fill="${c}"`
        return `<path data-i="${i}" d="${el.d}" ${estilo}/>`
      })
      .join("")
    if (rosto.oculos) {
      const linhas = [82, 93, 104, 115].map((y) => `<path d="M90 ${y} H172 M228 ${y} H312"/>`).join("")
      this.no.rosto!.insertAdjacentHTML(
        "beforeend",
        `<g stroke="${cor("mascote-bo-visor-fundo")}" stroke-opacity="0.55" stroke-width="5">${linhas}</g>`,
      )
    }
    this.olhos = rosto.elementos.flatMap((el, i) => {
      const no = this.no.rosto!.querySelector<SVGElement>(`[data-i="${i}"]`)
      return el.olho && no ? [{ el, no }] : []
    })
    this.no.extra!.innerHTML = rosto.extra ? extraSVG(rosto.extra, 'x="-48" y="-72" width="96" height="72"') : ""
    this.inicioDoExtra = this.movimento.t
    return true
  }

  agir(id: AcaoDoBo, opcoes?: OpcoesDaAcao): boolean {
    const ok = this.movimento.agir(id, opcoes)
    if (ok && id === "dormir") this.expressar("dormindo")
    else if (ok && this.expressao === "dormindo") this.expressar("neutro")
    return ok
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

  private quadro(dt: number) {
    const pose = this.movimento.atualizar(dt)
    const acordado = 1 - pose.sono
    this.olhar.x = amortecer(this.olhar.x, this.alvoDoOlhar.x, 6, dt)
    this.olhar.y = amortecer(this.olhar.y, this.alvoDoOlhar.y, 6, dt)
    this.giro.x = amortecer(this.giro.x, this.alvoDoOlhar.x * 0.42 * acordado, 3.5, dt)
    this.giro.y = amortecer(this.giro.y, this.alvoDoOlhar.y * 0.22 * acordado, 3.5, dt)

    const grau = 180 / Math.PI
    const tx = pose.x * R * 1.1
    const ty = -pose.y * R
    const n = this.no
    n.flutuador!.setAttribute("transform", `translate(${tx.toFixed(2)} ${ty.toFixed(2)})`)
    n.corpo!.setAttribute(
      "transform",
      `translate(${CX} ${CY}) rotate(${(-pose.rz * grau).toFixed(2)}) scale(${pose.sx.toFixed(4)} ${pose.sy.toFixed(4)}) translate(${-CX} ${-CY})`,
    )

    // Falso 3D: a guinada (ry) desliza a frente; a arfagem (rx) a sobe ou desce.
    const ry = pose.ry + this.giro.x
    const rx = pose.rx + this.giro.y
    const cos = Math.cos(ry)
    const sin = Math.sin(ry)
    const visivel = Math.max(0, Math.min(1, (cos - 0.05) / 0.3))
    n.frente!.setAttribute(
      "transform",
      `translate(${(CX + sin * R * 0.78).toFixed(2)} ${(CY + Math.sin(rx) * R * 0.6).toFixed(2)}) scale(${Math.max(0.05, Math.abs(cos)).toFixed(3)} ${Math.max(0.3, Math.cos(rx)).toFixed(3)}) translate(${-CX} ${-CY})`,
    )
    n.frente!.setAttribute("opacity", visivel.toFixed(3))

    for (const [fone, lado] of [
      [n.foneE!, -1],
      [n.foneD!, 1],
    ] as const) {
      const x = CX + lado * (R - 4) * cos
      const z = -lado * sin // positivo: virado para quem olha
      fone.setAttribute("transform", `translate(${x.toFixed(2)} ${CY - 3}) scale(${((14 + 14 * Math.abs(sin)) / 24).toFixed(3)} 1)`)
      // O fone que vira para trás some de uma vez, um pouco antes da borda.
      fone.setAttribute("opacity", z < -0.22 ? "0" : "1")
    }
    for (const [antena, lado, ang] of [
      [n.antE!, -1, pose.antE],
      [n.antD!, 1, pose.antD],
    ] as const) {
      antena.setAttribute("transform", `translate(${(CX + lado * 98 * cos).toFixed(2)} ${CY - 46}) rotate(${((lado * 0.2 + ang) * grau).toFixed(2)})`)
    }

    const abertura = pose.sono > 0.5 ? 1 : this.piscar.atualizar(dt)
    const gx = this.olhar.x * 12
    const gy = this.olhar.y * 8
    for (const { el, no } of this.olhos) {
      const cx = el.cx ?? 0
      const cy = el.cy ?? 0
      no.setAttribute("transform", `translate(${cx + gx} ${cy + gy}) scale(1 ${Math.max(0.08, abertura).toFixed(3)}) translate(${-cx} ${-cy})`)
    }
    // A caixa 400 x 200 do rosto encaixada no visor de 192 x 110.
    n.rostoPos!.setAttribute("transform", `translate(${CX - 90} ${CY - 70}) scale(0.45)`)

    for (const p of this.pontas) p.setAttribute("opacity", (0.55 + 0.45 * pose.brilhoAntena).toFixed(2))
    for (const l of this.leds) l.setAttribute("opacity", (0.35 + 0.65 * pose.brilhoLed).toFixed(2))

    if (n.sombra) {
      const k = Math.max(0.4, 1 - pose.y * 0.7)
      n.sombra.setAttribute("transform", `translate(${tx.toFixed(2)} 0) translate(${CX} 318) scale(${k.toFixed(3)}) translate(${-CX} -318)`)
      n.sombra.setAttribute("opacity", Math.min(1, k).toFixed(2))
    }

    if (n.extra!.firstChild) {
      const te = this.movimento.t - this.inicioDoExtra
      const entra = Math.min(1, te / 0.35)
      n.extra!.setAttribute("transform", `translate(${CX + 18} ${CY - R - 34 + (1 - entra) * 16 + 4 * Math.sin(te * 2.4)})`)
      n.extra!.setAttribute("opacity", entra.toFixed(2))
    }
  }
}

function desenho(u: string, comSombra: boolean): string {
  const fone = `<ellipse rx="24" ry="40" fill="${cor("marca-azul")}"/><ellipse rx="15" ry="29" fill="url(#${u}-fone)" stroke="${cor("marca-amarelo")}" stroke-width="6"/>`
  const antena = `<rect x="-6" y="-84" width="12" height="88" rx="6" fill="url(#${u}-antena)"/><circle class="ponta" cx="0" cy="-82" r="7" fill="${cor("mascote-bo-ponta")}" filter="url(#${u}-brilho)"/>`
  return `
    <defs>
      <radialGradient id="${u}-casco" cx="0.38" cy="0.3" r="0.8">
        <stop offset="0" stop-color="white"/>
        <stop offset="0.6" stop-color="${cor("ice")}"/>
        <stop offset="1" stop-color="${cor("mascote-bo-casco-sombra")}"/>
      </radialGradient>
      <radialGradient id="${u}-volume" cx="0.35" cy="0.28" r="0.85">
        <stop offset="0.55" stop-color="${cor("text-1")}" stop-opacity="0"/>
        <stop offset="1" stop-color="${cor("text-1")}" stop-opacity="0.22"/>
      </radialGradient>
      <linearGradient id="${u}-azul" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${cor("marca-faceta-clara")}"/>
        <stop offset="1" stop-color="${cor("marca-faceta-escura")}"/>
      </linearGradient>
      <linearGradient id="${u}-antena" x1="0" y1="1" x2="0" y2="0">
        <stop offset="0" stop-color="${cor("marca-azul")}"/>
        <stop offset="0.55" stop-color="${cor("marca-verde")}"/>
        <stop offset="1" stop-color="${cor("mascote-bo-ponta")}"/>
      </linearGradient>
      <linearGradient id="${u}-visor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${cor("mascote-bo-visor")}"/>
        <stop offset="1" stop-color="${cor("mascote-bo-visor-fundo")}"/>
      </linearGradient>
      <radialGradient id="${u}-fone" cx="0.4" cy="0.35" r="0.7">
        <stop offset="0" stop-color="${cor("mascote-bo-fone-claro")}"/>
        <stop offset="1" stop-color="${cor("mascote-bo-fone-escuro")}"/>
      </radialGradient>
      <linearGradient id="${u}-faixa" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0.18" stop-color="white" stop-opacity="1"/>
        <stop offset="0.36" stop-color="white" stop-opacity="0"/>
        <stop offset="0.64" stop-color="white" stop-opacity="0"/>
        <stop offset="0.82" stop-color="white" stop-opacity="1"/>
      </linearGradient>
      <mask id="${u}-mascara-faixa" maskUnits="userSpaceOnUse" x="0" y="0" width="320" height="340">
        <rect x="${CX - R}" y="0" width="${2 * R}" height="340" fill="url(#${u}-faixa)"/>
      </mask>
      <clipPath id="${u}-esfera"><circle cx="${CX}" cy="${CY}" r="${R}"/></clipPath>
      <clipPath id="${u}-clip-visor"><rect x="${CX - 96}" y="${CY - 80}" width="192" height="110" rx="52"/></clipPath>
      <filter id="${u}-brilho" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="3.2" result="b"/>
        <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
      </filter>
      <radialGradient id="${u}-sombra">
        <stop offset="0" stop-color="${cor("navy")}" stop-opacity="0.45"/>
        <stop offset="1" stop-color="${cor("navy")}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    ${comSombra ? `<ellipse class="sombra" cx="${CX}" cy="318" rx="92" ry="14" fill="url(#${u}-sombra)"/>` : ""}
    <g class="flutuador">
      <g class="extra"></g>
      <g class="corpo">
        <g class="antena-e">${antena}</g>
        <g class="antena-d">${antena}</g>
        <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#${u}-casco)"/>
        <g clip-path="url(#${u}-esfera)">
          <g mask="url(#${u}-mascara-faixa)" fill="none" stroke-linecap="round">
            <path d="M44 166 Q66 276 160 274 Q254 276 276 166" stroke="${cor("marca-verde")}" stroke-width="9"/>
            <path d="M48 176 Q70 280 160 278 Q250 280 272 176" stroke="${cor("marca-amarelo")}" stroke-width="9"/>
          </g>
          <path d="M50 182 Q72 284 160 282 Q248 284 270 182 L300 340 L20 340 Z" fill="url(#${u}-azul)"/>
          <g class="frente">
            <ellipse cx="${CX}" cy="${CY - 104}" rx="52" ry="20" fill="url(#${u}-azul)"/>
            <rect class="led" x="${CX - 32}" y="${CY - 98}" width="64" height="7" rx="3.5" fill="${COR_LUZ}" filter="url(#${u}-brilho)"/>
            <rect class="led" x="${CX - 36}" y="${CY + 90}" width="72" height="7" rx="3.5" fill="${COR_LUZ}" filter="url(#${u}-brilho)"/>
            <rect x="${CX - 101}" y="${CY - 85}" width="202" height="120" rx="57" fill="${cor("border")}"/>
            <rect x="${CX - 96}" y="${CY - 80}" width="192" height="110" rx="52" fill="url(#${u}-visor)"/>
            <g clip-path="url(#${u}-clip-visor)">
              <g class="rosto-pos"><g class="rosto" filter="url(#${u}-brilho)"></g></g>
              <ellipse cx="${CX - 44}" cy="${CY - 66}" rx="56" ry="12" fill="white" opacity="0.10"/>
            </g>
            ${simboloGovPro(`${u}-simbolo`, CX, CY + 57, 30)}
            ${nomeGovPro(CX, CY + 85, 12.5, { primeira: cor("text-1"), segunda: cor("marca-azul") })}
          </g>
          <circle cx="${CX}" cy="${CY}" r="${R}" fill="url(#${u}-volume)"/>
        </g>
        <g class="fone-e">${fone}</g>
        <g class="fone-d">${fone}</g>
      </g>
    </g>`
}
