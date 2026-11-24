import type { AcaoDoBo, Expressao } from "@/components/mascotes/catalogo"
import { movimentoReduzido } from "@/components/mascotes/catalogo"
import { soltarConfetes } from "@/components/mascotes/confetes"
import { GovBo } from "@/components/mascotes/govbo"
import type { PalcoDaIa } from "@/lib/api/acompanhar-ia"

/**
 * A coreografia do GovBô nas ações com IA (§129). O coordenador
 * (`lib/api/acompanhar-ia`) chama `entrar`, `concluir` ou `falhar` e `sair`; aqui
 * se decide o desenho de cada momento:
 *
 * - entrar: o Bô vem voando em arco de uma borda sorteada até o lado do botão
 *   que pediu a ação (ou o canto de baixo, à direita) e fica pensando, flutuando;
 * - concluir: faz uma ação e uma expressão sorteadas e, no pico, solta confetes;
 * - falhar: fica triste, sem confetes;
 * - sair: vai embora voando por outra borda, e a camada some.
 *
 * Nada existe fora de uma ação: a camada, o Bô e o laço de quadros nascem no
 * `entrar` e são removidos no fim do voo de saída. Com movimento reduzido, o Bô
 * aparece e some no lugar, sem voo e sem confetes, e os tempos encolhem.
 */

export const ACOES_DA_COMEMORACAO: AcaoDoBo[] = ["pular", "girar", "acenar", "comemorar", "inclinar"]
export const EXPRESSOES_DA_COMEMORACAO: Expressao[] = ["alegre", "animado", "rindo", "piscando", "confiante", "apaixonado", "sorridente"]

const VOO_DE_ENTRADA_MS = 700
const VOO_DE_SAIDA_MS = 650
const CONFETES_APOS_MS = 650
const TRISTEZA_MS = 900
const MARGEM = 16
/** Um toque mais antigo que isso não serve de referência para onde o Bô para. */
const VALIDADE_DO_TOQUE_MS = 10_000

type Ponto = { x: number; y: number }
type Voo = { de: Ponto; para: Ponto; controle: Ponto; inicio: number; duracao: number; aoFim: () => void }
type Estado = "fora" | "entrando" | "esperando" | "celebrando" | "triste" | "saindo"

const suavizar = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

export class CoreografiaDaIa implements PalcoDaIa {
  readonly esperaMinimaMs: number
  readonly celebracaoMs: number
  private readonly reduzido = movimentoReduzido()
  private estado: Estado = "fora"
  private camada: HTMLDivElement | null = null
  private caixa: HTMLDivElement | null = null
  private bo: GovBo | null = null
  private pos: Ponto = { x: 0, y: 0 }
  private repouso: Ponto = { x: 0, y: 0 }
  private voo: Voo | null = null
  private pedido = 0
  private relogios: number[] = []
  private ultimoToque: { caixa: DOMRect; quando: number } | null = null
  private bordaDeEntrada = 0

  constructor(private readonly sorteio: () => number = Math.random) {
    // Com resposta imediata: entrada (0,7 s) + pensando (1 s) + comemoração (1,6 s)
    // + saída (0,65 s) dá uns 4 s. Com movimento reduzido, pouco mais de 1 s.
    this.esperaMinimaMs = this.reduzido ? 600 : 1700
    this.celebracaoMs = this.reduzido ? 600 : 1600
    document.addEventListener("pointerdown", this.aoTocar, { capture: true, passive: true })
  }

  /** Guarda o botão que o usuário acabou de apertar: é ao lado dele que o Bô para. */
  private aoTocar = (evento: PointerEvent) => {
    const alvo = evento.target instanceof Element ? evento.target.closest("button, a, [role='button']") : null
    if (alvo) this.ultimoToque = { caixa: alvo.getBoundingClientRect(), quando: Date.now() }
  }

  private get tamanho() {
    return window.innerWidth < 640 ? 84 : 104
  }

  entrar() {
    if (this.estado === "fora") this.montar()
    this.limparRelogios()
    this.repouso = this.ondeParar()
    this.bo?.expressar("sorridente")
    if (this.reduzido) {
      this.pos = { ...this.repouso }
      this.estado = "esperando"
      this.bo?.expressar("pensativo")
      this.aparecer(true)
      return
    }
    if (this.estado === "fora") {
      this.bordaDeEntrada = Math.floor(this.sorteio() * 4)
      this.pos = this.foraDaTela(this.bordaDeEntrada, this.repouso)
    }
    this.estado = "entrando"
    this.voar(this.repouso, VOO_DE_ENTRADA_MS, () => {
      this.estado = "esperando"
      this.bo?.expressar("pensativo")
    })
  }

  concluir() {
    if (!this.bo) return
    this.voo = null
    this.pos = { ...this.repouso }
    this.estado = "celebrando"
    this.bo.expressar(this.sortear(EXPRESSOES_DA_COMEMORACAO))
    this.bo.agir(this.sortear(ACOES_DA_COMEMORACAO))
    if (this.reduzido) return
    this.depois(CONFETES_APOS_MS, () => {
      const meio = this.tamanho / 2
      soltarConfetes(this.pos.x + meio, this.pos.y + meio * 0.7)
    })
  }

  falhar() {
    if (!this.bo) return
    this.estado = "triste"
    this.bo.expressar("triste")
    this.bo.agir("inclinar")
  }

  sair() {
    if (!this.bo) return
    const atraso = this.estado === "triste" ? TRISTEZA_MS : 0
    this.depois(atraso, () => {
      if (this.reduzido) {
        this.aparecer(false)
        this.depois(250, () => this.desmontar())
        return
      }
      this.estado = "saindo"
      // Sai por uma borda diferente da que entrou.
      const borda = (this.bordaDeEntrada + 1 + Math.floor(this.sorteio() * 3)) % 4
      this.voar(this.foraDaTela(borda, this.pos), VOO_DE_SAIDA_MS, () => this.desmontar())
    })
  }

  destruir() {
    document.removeEventListener("pointerdown", this.aoTocar, { capture: true })
    this.desmontar()
  }

  // ---------------- interno ----------------

  private montar() {
    const camada = document.createElement("div")
    camada.setAttribute("aria-hidden", "true")
    camada.dataset.palcoDaIa = ""
    Object.assign(camada.style, { position: "fixed", inset: "0", pointerEvents: "none", zIndex: "70", overflow: "hidden" })
    const caixa = document.createElement("div")
    const s = this.tamanho
    Object.assign(caixa.style, {
      position: "absolute",
      left: "0",
      top: "0",
      width: `${s}px`,
      height: `${s}px`,
      willChange: "transform",
      transition: this.reduzido ? "opacity 200ms ease" : "",
      opacity: this.reduzido ? "0" : "1",
    })
    camada.appendChild(caixa)
    document.body.appendChild(camada)
    this.camada = camada
    this.caixa = caixa
    this.bo = new GovBo(caixa, { olharCursor: true, sombra: false })
    const inicio = performance.now()
    const quadro = (agora: number) => {
      this.desenhar(agora, inicio)
      if (this.caixa) this.pedido = requestAnimationFrame(quadro)
    }
    this.pedido = requestAnimationFrame(quadro)
  }

  private desmontar() {
    cancelAnimationFrame(this.pedido)
    this.limparRelogios()
    this.bo?.destruir()
    this.camada?.remove()
    this.bo = null
    this.caixa = null
    this.camada = null
    this.voo = null
    this.estado = "fora"
  }

  private desenhar(agora: number, inicio: number) {
    if (!this.caixa) return
    let { x, y } = this.pos
    let inclinacao = 0
    if (this.voo) {
      const v = this.voo
      const t = Math.min(1, (agora - v.inicio) / v.duracao)
      const k = suavizar(t)
      // Curva de Bézier quadrática: o voo faz um arco, não uma reta.
      const a = (1 - k) * (1 - k)
      const b = 2 * (1 - k) * k
      const c = k * k
      x = a * v.de.x + b * v.controle.x + c * v.para.x
      y = a * v.de.y + b * v.controle.y + c * v.para.y
      // Inclina na direção do voo, mais no meio do caminho.
      inclinacao = Math.max(-18, Math.min(18, (v.para.x - v.de.x) * 0.03)) * Math.sin(Math.PI * t)
      this.pos = { x, y }
      if (t >= 1) {
        this.voo = null
        v.aoFim()
        // O fim do voo de saída desmonta o Bô: não há mais caixa para mover.
        if (!this.caixa) return
      }
    } else if (this.estado === "esperando" && !this.reduzido) {
      // Pensando: flutua em volta do ponto de repouso.
      const s = (agora - inicio) / 1000
      x = this.repouso.x + Math.sin(s * 1.3) * 8
      y = this.repouso.y + Math.cos(s * 0.9) * 6
      this.pos = { x, y }
    }
    this.caixa.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0) rotate(${inclinacao.toFixed(2)}deg)`
  }

  private voar(para: Ponto, duracao: number, aoFim: () => void) {
    const de = { ...this.pos }
    const meio = { x: (de.x + para.x) / 2, y: (de.y + para.y) / 2 }
    const distancia = Math.hypot(para.x - de.x, para.y - de.y)
    // O arco sobe para um lado sorteado, proporcional à distância.
    const lado = this.sorteio() < 0.5 ? -1 : 1
    const controle = { x: meio.x + lado * distancia * 0.15, y: meio.y - distancia * 0.3 }
    this.voo = { de, para, controle, inicio: performance.now(), duracao, aoFim }
  }

  /** Ao lado do botão apertado, do lado com mais espaço; sem botão, o canto de baixo à direita. */
  private ondeParar(): Ponto {
    const s = this.tamanho
    const largura = window.innerWidth
    const altura = window.innerHeight
    const toque = this.ultimoToque && Date.now() - this.ultimoToque.quando < VALIDADE_DO_TOQUE_MS ? this.ultimoToque.caixa : null
    let ponto: Ponto
    if (toque && toque.bottom > 0 && toque.top < altura) {
      const y = toque.top + toque.height / 2 - s / 2
      if (toque.right + 16 + s <= largura - MARGEM) ponto = { x: toque.right + 16, y }
      else if (toque.left - 16 - s >= MARGEM) ponto = { x: toque.left - 16 - s, y }
      else ponto = { x: toque.left + toque.width / 2 - s / 2, y: toque.top - s - 12 }
    } else {
      ponto = { x: largura - s - 32, y: altura - s - 32 }
    }
    return {
      x: Math.min(Math.max(ponto.x, MARGEM), largura - s - MARGEM),
      y: Math.min(Math.max(ponto.y, MARGEM + 64), altura - s - MARGEM),
    }
  }

  /** Um ponto fora da tela, na borda pedida (0 esquerda, 1 direita, 2 topo, 3 base), na altura de `perto`. */
  private foraDaTela(borda: number, perto: Ponto): Ponto {
    const s = this.tamanho + 40
    const desvio = (this.sorteio() - 0.5) * 0.5
    switch (borda) {
      case 0:
        return { x: -s, y: perto.y + desvio * window.innerHeight }
      case 1:
        return { x: window.innerWidth + 40, y: perto.y + desvio * window.innerHeight }
      case 2:
        return { x: perto.x + desvio * window.innerWidth, y: -s }
      default:
        return { x: perto.x + desvio * window.innerWidth, y: window.innerHeight + 40 }
    }
  }

  private aparecer(visivel: boolean) {
    if (!this.caixa) return
    this.caixa.style.transform = `translate3d(${this.pos.x}px, ${this.pos.y}px, 0)`
    // Um quadro depois, para a transição de opacidade acontecer.
    requestAnimationFrame(() => {
      if (this.caixa) this.caixa.style.opacity = visivel ? "1" : "0"
    })
  }

  private sortear<T>(lista: T[]): T {
    return lista[Math.floor(this.sorteio() * lista.length)] ?? (lista[0] as T)
  }

  private depois(ms: number, fazer: () => void) {
    this.relogios.push(window.setTimeout(fazer, ms))
  }

  private limparRelogios() {
    for (const r of this.relogios) window.clearTimeout(r)
    this.relogios = []
  }
}
