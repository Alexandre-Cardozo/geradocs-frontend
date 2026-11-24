/**
 * Confetes na paleta GovPro (§129): uma explosão curta saindo de um ponto da
 * tela. Um `<canvas>` só existe durante a explosão (cerca de 2 s) e é removido
 * no fim; nada roda antes nem depois. Em máquina modesta ou tela pequena, menos
 * partículas. As cores vêm dos tokens da marca, lidas do tema na hora.
 */

const CORES = ["marca-azul", "marca-azul-claro", "marca-amarelo", "marca-verde", "marca-faceta-clara", "mascote-bo-luz"]

type Particula = {
  x: number
  y: number
  vx: number
  vy: number
  giro: number
  velGiro: number
  balanco: number
  largura: number
  altura: number
  cor: string
  forma: "fita" | "quadrado" | "bolinha"
  vida: number
  duracao: number
}

/** Quantas partículas: menos em máquina com poucos núcleos ou em tela estreita. */
export function quantidadeDeConfetes(nucleos: number | undefined, largura: number): number {
  if (largura < 640) return 42
  if ((nucleos ?? 8) <= 4) return 50
  return 80
}

function lerCores(): string[] {
  const estilo = getComputedStyle(document.documentElement)
  const cores = CORES.map((t) => estilo.getPropertyValue(`--color-${t}`).trim()).filter(Boolean)
  return cores.length ? cores : ["royalblue", "gold", "seagreen"]
}

/** Solta os confetes a partir de (x, y), em px da janela. Devolve quem os recolhe antes do fim. */
export function soltarConfetes(x: number, y: number): () => void {
  const canvas = document.createElement("canvas")
  const ctx = canvas.getContext("2d")
  if (!ctx) return () => {}
  const escala = Math.min(window.devicePixelRatio || 1, 1.5)
  const largura = window.innerWidth
  const altura = window.innerHeight
  canvas.width = Math.round(largura * escala)
  canvas.height = Math.round(altura * escala)
  canvas.setAttribute("aria-hidden", "true")
  canvas.dataset.confetes = ""
  Object.assign(canvas.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    pointerEvents: "none",
    zIndex: "71",
  })
  document.body.appendChild(canvas)
  ctx.scale(escala, escala)

  const cores = lerCores()
  const formas: Particula["forma"][] = ["fita", "fita", "quadrado", "bolinha"]
  const particulas: Particula[] = Array.from({ length: quantidadeDeConfetes(navigator.hardwareConcurrency, largura) }, () => {
    // Um cone para cima, aberto: a festa sobe e cai devagar em volta do Bô.
    const angulo = -Math.PI / 2 + (Math.random() - 0.5) * 2.4
    const velocidade = 380 + Math.random() * 520
    const forma = formas[Math.floor(Math.random() * formas.length)] ?? "fita"
    return {
      x,
      y,
      vx: Math.cos(angulo) * velocidade,
      vy: Math.sin(angulo) * velocidade,
      giro: Math.random() * Math.PI * 2,
      velGiro: (Math.random() - 0.5) * 14,
      balanco: Math.random() * Math.PI * 2,
      largura: forma === "fita" ? 5 + Math.random() * 3 : 6 + Math.random() * 3,
      altura: forma === "fita" ? 10 + Math.random() * 6 : 6 + Math.random() * 3,
      cor: cores[Math.floor(Math.random() * cores.length)] ?? "gold",
      forma,
      vida: 0,
      duracao: 1.3 + Math.random() * 0.7,
    }
  })

  let pedido = 0
  let ultimo = performance.now()
  const recolher = () => {
    cancelAnimationFrame(pedido)
    canvas.remove()
  }
  const quadro = (agora: number) => {
    const dt = Math.min(0.05, (agora - ultimo) / 1000)
    ultimo = agora
    ctx.clearRect(0, 0, largura, altura)
    let vivas = 0
    for (const p of particulas) {
      p.vida += dt
      if (p.vida >= p.duracao) continue
      vivas++
      // Gravidade, resistência do ar e o balanço de papel caindo.
      p.vy += 980 * dt
      const arrasto = Math.pow(0.12, dt)
      p.vx *= arrasto
      p.vy *= arrasto
      p.balanco += dt * 6
      p.x += (p.vx + Math.sin(p.balanco) * 40) * dt
      p.y += p.vy * dt
      p.giro += p.velGiro * dt
      const restante = p.duracao - p.vida
      ctx.globalAlpha = Math.min(1, restante / 0.45)
      ctx.fillStyle = p.cor
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.giro)
      if (p.forma === "bolinha") {
        ctx.beginPath()
        ctx.arc(0, 0, p.largura / 2, 0, Math.PI * 2)
        ctx.fill()
      } else {
        // O cosseno do balanço achata o papel: parece girar em 3D.
        ctx.scale(1, Math.cos(p.balanco))
        ctx.fillRect(-p.largura / 2, -p.altura / 2, p.largura, p.altura)
      }
      ctx.restore()
    }
    if (vivas > 0) pedido = requestAnimationFrame(quadro)
    else recolher()
  }
  pedido = requestAnimationFrame(quadro)
  return recolher
}
