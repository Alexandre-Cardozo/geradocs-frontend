import { limitar, suave, type AcaoDoBo, type OpcoesDaAcao } from "@/components/mascotes/catalogo"

/**
 * Coreografia do GovBô (§127): devolve uma pose abstrata a cada quadro, que o
 * desenho aplica. Unidades: `x`/`y` em raios do corpo, ângulos em radianos.
 */
export type PoseDoBo = {
  x: number
  y: number
  rx: number
  ry: number
  rz: number
  sx: number
  sy: number
  antE: number
  antD: number
  brilhoAntena: number
  brilhoLed: number
  sono: number
}

type AcaoComDuracao = Exclude<AcaoDoBo, "ociosa" | "dormir">

const DURACAO: Record<AcaoComDuracao, number> = {
  acenar: 1.8,
  pular: 0.9,
  girar: 1.3,
  inclinar: 1.8,
  comemorar: 1.9,
  disparar: 1.4,
  clicar: 0.5,
}

/** Pausa entre uma repetição e a seguinte, em segundos. */
const PAUSA_DA_REPETICAO = 0.55

const envelope = (p: number, entra = 0.2, sai = 0.8) =>
  p < entra ? suave(p / entra) : p > sai ? suave((1 - p) / (1 - sai)) : 1

export class MovimentoDoBo {
  t = 0
  private acao: { id: AcaoComDuracao; inicio: number; dur: number } | null = null
  private repetir: { id: AcaoComDuracao; em: number } | null = null
  private dormindo = false
  private pesoDoSono = 0
  private inicioDoPop = -10

  constructor(private readonly reduzido = false) {}

  agir(id: AcaoDoBo, opcoes: OpcoesDaAcao = {}): boolean {
    this.repetir = null
    if (id === "dormir") {
      this.dormindo = true
      this.acao = null
      return true
    }
    this.dormindo = false
    if (id === "ociosa") {
      this.acao = null
      return true
    }
    if (!(id in DURACAO)) return false
    this.iniciar(id)
    if (opcoes.repetir) this.repetir = { id, em: Infinity }
    return true
  }

  private iniciar(id: AcaoComDuracao) {
    const dur = DURACAO[id]
    this.acao = { id, inicio: this.t, dur: this.reduzido ? dur * 0.6 : dur }
  }

  /** Pequeno salto de escala quando a expressão muda. */
  pop() {
    this.inicioDoPop = this.t
  }

  atualizar(dt: number): PoseDoBo {
    this.t += dt
    const t = this.t
    const amp = this.reduzido ? 0.25 : 1
    this.pesoDoSono += ((this.dormindo ? 1 : 0) - this.pesoDoSono) * (1 - Math.exp(-2.5 * dt))
    const s = this.pesoDoSono
    const acordado = 1 - s

    const pose: PoseDoBo = {
      x: 0,
      y: amp * (acordado * 0.06 * Math.sin(1.7 * t) + s * (-0.14 + 0.025 * Math.sin(0.9 * t))),
      rx: s * 0.16,
      ry: 0,
      rz: amp * 0.035 * Math.sin(0.85 * t) * acordado + s * 0.06,
      sx: 1,
      sy: 1 + s * 0.012 * Math.sin(0.9 * t),
      antE: amp * 0.06 * Math.sin(2.3 * t) * acordado + s * 0.32,
      antD: amp * 0.06 * Math.sin(2.3 * t + 1) * acordado - s * 0.32,
      brilhoAntena: 0.65 + 0.35 * Math.sin(3 * t) * acordado,
      brilhoLed: acordado * (0.8 + 0.2 * Math.sin(2 * t)) + s * (0.35 + 0.25 * Math.sin(1.2 * t)),
      sono: s,
    }

    if (this.acao) {
      const p = limitar((t - this.acao.inicio) / this.acao.dur)
      this.aplicarAcao(this.acao.id, p, pose)
      if (p >= 1) {
        this.acao = null
        if (this.repetir) this.repetir.em = t + PAUSA_DA_REPETICAO
      }
    } else if (this.repetir && t >= this.repetir.em) {
      this.iniciar(this.repetir.id)
    }

    const q = limitar((t - this.inicioDoPop) / 0.38)
    if (q < 1) {
      const k = Math.sin(Math.PI * q) * (1 - q) * 0.09 * amp
      pose.sx *= 1 + k
      pose.sy *= 1 + k
    }
    return pose
  }

  private aplicarAcao(id: AcaoComDuracao, p: number, pose: PoseDoBo) {
    const r = this.reduzido ? 0.35 : 1
    switch (id) {
      case "pular": {
        const arranque = p < 0.18 ? Math.sin((p / 0.18) * Math.PI) : 0
        const voo = p >= 0.18 && p < 0.82 ? (p - 0.18) / 0.64 : -1
        const pouso = p >= 0.82 ? Math.sin(((p - 0.82) / 0.18) * Math.PI) : 0
        if (voo >= 0) {
          pose.y += r * 0.75 * (1 - (2 * voo - 1) ** 2)
          pose.sy *= 1 + 0.07 * r * Math.sin(voo * Math.PI)
          pose.sx *= 1 - 0.04 * r * Math.sin(voo * Math.PI)
        }
        const amassa = (arranque + pouso) * 0.12 * r
        pose.sy *= 1 - amassa
        pose.sx *= 1 + amassa * 0.7
        pose.y -= amassa * 0.9
        pose.antE += (arranque + pouso) * 0.25
        pose.antD -= (arranque + pouso) * 0.25
        break
      }
      case "clicar": {
        // Mergulha até o botão, amassa no toque e volta.
        const toque = Math.sin(Math.PI * p)
        pose.y -= 0.32 * r * toque
        pose.rx += 0.25 * toque
        const amassa = p > 0.35 && p < 0.65 ? Math.sin((Math.PI * (p - 0.35)) / 0.3) : 0
        pose.sy *= 1 - 0.12 * r * amassa
        pose.sx *= 1 + 0.07 * r * amassa
        pose.antE += 0.3 * toque
        pose.antD -= 0.3 * toque
        break
      }
      case "girar": {
        pose.ry += Math.PI * 2 * suave(p)
        pose.y += 0.16 * r * Math.sin(Math.PI * p)
        pose.antE += 0.2 * Math.sin(Math.PI * p)
        pose.antD -= 0.2 * Math.sin(Math.PI * p)
        break
      }
      case "inclinar": {
        const e = envelope(p, 0.18, 0.78)
        pose.rz += 0.34 * e * r
        pose.ry += 0.32 * e * r
        pose.rx -= 0.08 * e * r
        pose.antE += e * 0.1 * Math.sin(this.t * 18)
        break
      }
      case "acenar": {
        const e = envelope(p, 0.12, 0.85)
        pose.rz -= 0.14 * e * r
        pose.antD -= e * (0.45 + 0.4 * Math.sin(this.t * 14))
        pose.y += 0.06 * e * r * Math.abs(Math.sin(this.t * 7))
        break
      }
      case "comemorar": {
        const pulos = Math.abs(Math.sin(p * Math.PI * 3))
        pose.y += 0.42 * r * pulos * envelope(p, 0.05, 0.9)
        if (p > 0.34) pose.ry += Math.PI * 2 * suave(limitar((p - 0.34) / 0.5))
        pose.antE += 0.35 * Math.sin(this.t * 20) * envelope(p)
        pose.antD += 0.35 * Math.sin(this.t * 20 + 1.5) * envelope(p)
        pose.brilhoAntena = 1
        break
      }
      case "disparar": {
        const longe = 4.2
        if (p < 0.42) {
          const k = (p / 0.42) ** 2.2
          pose.x += longe * k
          pose.rz -= 0.32 * suave(limitar(p / 0.15))
          pose.sx *= 1 + 0.16 * k
          pose.sy *= 1 - 0.08 * k
        } else if (p < 0.55) {
          pose.x += longe * 2
        } else {
          const k = suave((p - 0.55) / 0.45)
          pose.x -= longe * (1 - k)
          pose.rz -= 0.3 * (1 - k) * Math.sin(k * Math.PI * 1.5 + 0.6)
          pose.sx *= 1 + 0.12 * (1 - k)
        }
        pose.antE += 0.35
        pose.antD += 0.35
        break
      }
    }
  }
}

/** Piscar: devolve a abertura dos olhos (0 fechado, 1 aberto). */
export class Piscar {
  proximo = 1.5 + Math.random() * 2
  private fase = -1

  atualizar(dt: number): number {
    this.proximo -= dt
    if (this.proximo <= 0 && this.fase < 0) this.fase = 0
    if (this.fase < 0) return 1
    this.fase += dt / 0.16
    if (this.fase >= 1) {
      this.fase = -1
      this.proximo = Math.max(0.25, 2.2 + Math.random() * 3.2 + (Math.random() < 0.2 ? -2 : 0))
      return 1
    }
    return Math.abs(1 - this.fase * 2) ** 0.7
  }
}
