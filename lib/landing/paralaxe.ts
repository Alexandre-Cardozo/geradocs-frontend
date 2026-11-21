/**
 * A conta da abertura em paralaxe (§120): onde está a rolagem e onde fica cada
 * camada. Sem DOM e sem React, para que o componente só aplique o quadro.
 */

export type NomeDaCamada = "ceu" | "nuvens" | "edificio" | "meio" | "frente"

export type Camada = {
  nome: NomeDaCamada
  /** Deslocamento máximo, em px, que o ponteiro provoca. A mais próxima move mais. */
  profundidade: number
  /** Escala no fim da rolagem: a câmera avança e o que está perto cresce mais. */
  escala: number
  /** Deslocamento vertical no fim da rolagem, em % da altura da camada. */
  subida: number
}

/** Do fundo para a frente, na ordem em que são empilhadas. */
export const CAMADAS: readonly Camada[] = [
  { nome: "ceu", profundidade: 4, escala: 1.05, subida: -2 },
  { nome: "nuvens", profundidade: 7, escala: 1.1, subida: -6 },
  { nome: "edificio", profundidade: 12, escala: 1.16, subida: -3 },
  { nome: "meio", profundidade: 22, escala: 1.32, subida: -2 },
  { nome: "frente", profundidade: 38, escala: 1.7, subida: 0 },
]

/** O título fica entre o céu e a sede, e o ponteiro o move como uma camada. */
export const PROFUNDIDADE_DO_TITULO = 10

/** Fração de `valor` entre `inicio` e `fim`, presa entre 0 e 1. */
export function trecho(valor: number, inicio: number, fim: number): number {
  return Math.min(1, Math.max(0, (valor - inicio) / (fim - inicio)))
}

/**
 * Quanto da abertura já foi percorrido, de 0 a 1. `topo` é a distância da seção
 * ao topo da janela (negativa depois de rolar), `altura` a da seção e `janela` a
 * da janela. Seção que cabe na janela não tem percurso: fica em 0.
 */
export function progressoDaRolagem(topo: number, altura: number, janela: number): number {
  const percurso = altura - janela
  if (percurso <= 0) return 0
  return trecho(-topo, 0, percurso)
}

export type Quadro = {
  camadas: Record<NomeDaCamada, { escala: number; subida: number }>
  titulo: { subida: number; opacidade: number }
  seta: number
  veu: number
  manifesto: { opacidade: number; deslocamento: number }
}

/**
 * O estado da abertura num ponto da rolagem. Com `movimento: false` (movimento
 * reduzido) nada se desloca nem cresce; só as opacidades acompanham a rolagem.
 * O `+ 0` desfaz o `-0` das contas com fator negativo.
 */
export function quadroDaRolagem(progresso: number, { movimento }: { movimento: boolean }): Quadro {
  const p = movimento ? progresso : 0
  const camadas = Object.fromEntries(
    CAMADAS.map((c) => [c.nome, { escala: 1 + (c.escala - 1) * p, subida: c.subida * p + 0 }]),
  ) as Quadro["camadas"]

  // O manifesto fica até o fim: o palco solta com ele à vista e a página segue
  // para o hero do GeraDocs sem uma tela de navy vazio no meio.
  const entra = trecho(progresso, 0.5, 0.8)
  return {
    camadas,
    titulo: { subida: -14 * trecho(p, 0, 0.6) + 0, opacidade: 1 - trecho(progresso, 0.22, 0.47) },
    seta: 1 - trecho(progresso, 0, 0.1),
    veu: 0.84 * trecho(progresso, 0.38, 0.52) + 0.16 * trecho(progresso, 0.8, 1),
    manifesto: { opacidade: entra, deslocamento: movimento ? 40 * (1 - entra) : 0 },
  }
}

/**
 * Para onde o ponteiro leva uma camada. `x` e `y` vão de -1 (canto esquerdo ou
 * topo) a 1; a camada anda para o lado oposto, menos na vertical.
 */
export function alvoDoPonteiro(x: number, y: number, profundidade: number): { x: number; y: number } {
  return { x: -x * profundidade + 0, y: -y * profundidade * 0.45 + 0 }
}

/** Um passo da posição atual em direção ao alvo; chega quando a diferença é desprezível. */
export function aproximar(atual: number, alvo: number, fator = 0.08): number {
  const proximo = atual + (alvo - atual) * fator
  return Math.abs(alvo - proximo) < 0.05 ? alvo : proximo
}
