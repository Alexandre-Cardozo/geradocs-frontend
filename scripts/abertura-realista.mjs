/**
 * Gera as camadas da abertura realista (§135, §136) a partir da foto da sede sem
 * galhos, uma por enquadramento. A foto é fatiada por profundidade, como uma
 * maquete: cada fatia é uma camada que a página move numa velocidade própria.
 * Saem quatro camadas por enquadramento em `public/landing/abertura/<nome>/`,
 * do fundo para a frente:
 *
 * - `ceu`: a foto inteira, com tudo o que não é céu preenchido de céu, para as
 *   camadas da frente poderem se mover sobre ele sem revelar um buraco;
 * - `sede`: do horizonte para baixo (prédio, palmeiras, bandeiras), com o lugar
 *   das árvores das laterais preenchido pelo lado espelhado do prédio;
 * - `jardim`: o chão da linha da praça para baixo (gramado, canteiros, caminho);
 * - `arvore-esquerda` e `arvore-direita`: as árvores das laterais, recortadas do
 *   céu e da fachada, uma por lado para cada uma crescer a partir do próprio pé.
 *
 * As árvores ficam em retângulos escritos à mão para cada foto (`ARVORES`): acima
 * do telhado, tudo o que não é céu nem nuvem é árvore; abaixo dele, só a folhagem.
 *
 * Uso: node scripts/abertura-realista.mjs <pasta-das-originais> [--depuracao <pasta>]
 * A pasta precisa ter `<largo|medio|alto>-sem-galhos.png`.
 */
import { mkdir } from "node:fs/promises"
import { join } from "node:path"

import sharp from "sharp"

const [origem, bandeira, pastaDepuracao] = process.argv.slice(2)
if (!origem) throw new Error("Informe a pasta das fotos originais.")
const depuracao = bandeira === "--depuracao" ? pastaDepuracao : null

/** Proporção de cada enquadramento; a foto é cortada ao centro até ela. */
const ENQUADRAMENTOS = { largo: 16 / 9, medio: 3 / 4, alto: 9 / 16 }

/**
 * Céu a acrescentar no alto (px), cortando o mesmo tanto da calçada: na foto larga
 * a sede começa a 36% da altura e cobriria a frase do título; com 56 px ela começa
 * a 42%, como na cena desenhada (§124).
 */
const TOPO_EXTRA = { largo: 56, medio: 0, alto: 0 }

/**
 * Medidas de cada foto, em px da foto já cortada e antes do céu extra:
 * - `chao`: a linha da praça, entre o pé do prédio e o gramado. Fica abaixo do pé
 *   das palmeiras e dos mastros, para nenhum deles ser cortado ao meio;
 * - `eixo`: o centro da fachada, que divide o prédio em duas metades espelhadas;
 * - `modulo`: a largura, em px, de um módulo das alas (pilar e janela), medida por
 *   autocorrelação numa faixa sem árvores. Atrás das árvores a ala continua
 *   repetindo o módulo vizinho;
 * - `telhado`: dois pontos da borda do telhado de cada ala, medidos fora das
 *   copas. Atrás das copas o telhado segue essa reta, em vez de ser adivinhado
 *   coluna a coluna entre as folhas;
 * - `evitar`: retângulos que não servem de modelo para essa repetição (bandeiras,
 *   palmeiras e árvores ficariam duplicadas);
 * - `refazer`: a fachada atrás das copas, do telhado ao pé das colunas, refeita
 *   inteira para não misturar pedaços reais e copiados;
 * - `espelhar`: os lados em que a ala vem do lado oposto, espelhado, em vez do
 *   módulo vizinho (quando os vizinhos estão tapados por bandeiras e palmeiras).
 *   Um lado usa uma fonte só: duas fontes deixariam uma emenda entre andares;
 * - `arvores`: retângulos `[x0, x1, y0, y1]` das copas das laterais. Em `copa`,
 *   acima do telhado, tudo o que não é céu é árvore; em `folhas`, na frente da
 *   fachada, só o que tem cor de folha; `fora` tira o que não é árvore.
 */
const MEDIDAS = {
  largo: {
    chao: 800,
    eixo: 821,
    modulo: 33,
    telhado: { esquerda: [[330, 458], [510, 446]], direita: [[1290, 453], [1450, 460]] },
    // Bandeiras, a árvore redonda e as palmeiras da esquerda; palmeiras e árvore da direita.
    evitar: [[226, 625, 580, 800], [1040, 1335, 470, 800]],
    refazer: [[0, 225, 445, 770], [1440, 1670, 450, 745]],
    espelhar: ["esquerda"],
    arvores: {
      copa: [[0, 345, 0, 445], [1440, 1670, 0, 450]],
      folhas: [[0, 225, 445, 800], [225, 290, 445, 605], [1440, 1670, 450, 800]],
      // As cercas vivas do chão e o poste de luz não são árvore.
      fora: [[0, 160, 770, 800], [1500, 1670, 745, 800], [1438, 1470, 540, 580], [1446, 1470, 700, 800]],
    },
  },
  medio: {
    chao: 1020,
    eixo: 543,
    modulo: 30,
    telhado: { esquerda: [[197, 714], [285, 708]], direita: [[849, 709], [949, 715]] },
    evitar: [[105, 345, 715, 1020], [1064, 1085, 700, 1020]],
    refazer: [[0, 80, 705, 848]],
    espelhar: ["esquerda"],
    arvores: { copa: [[0, 205, 0, 705]], folhas: [[0, 80, 705, 848]], fora: [] },
  },
  alto: {
    chao: 1128,
    eixo: 472,
    modulo: 32,
    telhado: { esquerda: [[136, 805], [160, 803]], direita: [[800, 796], [900, 790]] },
    evitar: [[85, 280, 815, 1128], [690, 900, 815, 1128]],
    refazer: [[0, 65, 795, 880]],
    espelhar: ["esquerda"],
    arvores: { copa: [[0, 135, 0, 795]], folhas: [[0, 65, 795, 880]], fora: [] },
  },
}

/** Céu: azul bem acima do vermelho. A fachada branca fica abaixo de 30 e o céu claro acima de 45. */
const ceuDe = (r, g, b) => b - r > 38 && b > 190

/** Nuvem: clara e puxada para o azul. As folhas ao sol puxam para o amarelo. */
const nuvemDe = (r, g, b) => 0.3 * r + 0.59 * g + 0.11 * b > 175 && b >= g

/**
 * Folha: verde saturado ou sombra escura esverdeada. A fachada branca é pouco
 * saturada e as janelas escuras puxam para o azul, então ficam de fora.
 */
function folhaDe(r, g, b) {
  const maior = Math.max(r, g, b)
  const saturacao = maior ? (maior - Math.min(r, g, b)) / maior : 0
  const luz = 0.3 * r + 0.59 * g + 0.11 * b
  return (g - b > 10 && g >= r - 10 && saturacao > 0.18) || (luz < 90 && g - b > 4)
}

/** Quantos pixels seguidos que não são céu marcam o horizonte numa coluna. */
const CORRIDA = 4

async function ler(arquivo, largura, altura) {
  const imagem = sharp(arquivo).removeAlpha()
  const { width, height } = await imagem.metadata()
  const quer = largura / altura
  // Corta ao centro até a proporção pedida, sem esticar.
  const w = Math.min(width, Math.round(height * quer))
  const h = Math.min(height, Math.round(width / quer))
  const { data } = await imagem
    .extract({ left: Math.floor((width - w) / 2), top: Math.floor((height - h) / 2), width: w, height: h })
    .resize(largura, altura, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true })
  return data
}

/**
 * Primeira linha de cada coluna em que começa uma corrida de pixels que não
 * `passam` (que não são céu nem o que está na frente dele).
 */
function horizonte(passa, w, h) {
  const linhas = new Int32Array(w)
  for (let x = 0; x < w; x++) {
    let corrida = 0
    let y = 0
    for (; y < h; y++) {
      corrida = passa(y * w + x) ? 0 : corrida + 1
      if (corrida >= CORRIDA) break
    }
    linhas[x] = Math.max(0, y - CORRIDA + 1)
  }
  // Mediana de 9 colunas: tira as pontas de um pixel que um reflexo no céu cria.
  return linhas.map((_, x) => {
    const janela = Array.from(linhas.subarray(Math.max(0, x - 4), Math.min(w, x + 5))).sort((a, b) => a - b)
    return janela[janela.length >> 1]
  })
}

/** Apaga da máscara as manchas menores que `minimo` px (vizinhança de 8). */
function semManchas(mascara, w, h, minimo) {
  const visto = new Uint8Array(w * h)
  const fila = new Int32Array(w * h)
  for (let inicio = 0; inicio < w * h; inicio++) {
    if (!mascara[inicio] || visto[inicio]) continue
    let topo = 0
    let fim = 0
    fila[fim++] = inicio
    visto[inicio] = 1
    while (topo < fim) {
      const i = fila[topo++]
      const x = i % w
      const y = (i - x) / w
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const j = ny * w + nx
          if (mascara[j] && !visto[j]) { visto[j] = 1; fila[fim++] = j }
        }
    }
    if (fim < minimo) for (let k = 0; k < fim; k++) mascara[fila[k]] = 0
  }
  return mascara
}

/**
 * Preenche os pixels desconhecidos (`conhecido` = 0) com a média dos vizinhos
 * conhecidos, de níveis cada vez mais grossos (push-pull): sai um céu liso, sem
 * listras, que só aparece quando a sede se desloca sobre ele.
 */
function preencher(px, conhecido, w, h) {
  const niveis = [{ w, h, cor: Float32Array.from(px), peso: Float32Array.from(conhecido) }]
  while (niveis.at(-1).w > 1 || niveis.at(-1).h > 1) {
    const a = niveis.at(-1)
    const nw = Math.max(1, Math.ceil(a.w / 2))
    const nh = Math.max(1, Math.ceil(a.h / 2))
    const cor = new Float32Array(nw * nh * 3)
    const peso = new Float32Array(nw * nh)
    for (let y = 0; y < a.h; y++)
      for (let x = 0; x < a.w; x++) {
        const p = a.peso[y * a.w + x]
        if (!p) continue
        const j = (y >> 1) * nw + (x >> 1)
        peso[j] += p
        for (let c = 0; c < 3; c++) cor[j * 3 + c] += a.cor[(y * a.w + x) * 3 + c] * p
      }
    for (let j = 0; j < nw * nh; j++) if (peso[j]) for (let c = 0; c < 3; c++) cor[j * 3 + c] /= peso[j]
    for (let j = 0; j < nw * nh; j++) peso[j] = Math.min(1, peso[j])
    niveis.push({ w: nw, h: nh, cor, peso })
  }
  for (let n = niveis.length - 2; n >= 0; n--) {
    const a = niveis[n]
    const b = niveis[n + 1]
    for (let y = 0; y < a.h; y++)
      for (let x = 0; x < a.w; x++) {
        const i = y * a.w + x
        const p = a.peso[i]
        if (p >= 1) continue
        // Bilinear do nível de cima, para não aparecerem blocos.
        const fx = Math.min(b.w - 1, Math.max(0, (x - 0.5) / 2))
        const fy = Math.min(b.h - 1, Math.max(0, (y - 0.5) / 2))
        const x0 = Math.floor(fx), y0 = Math.floor(fy)
        const x1 = Math.min(b.w - 1, x0 + 1), y1 = Math.min(b.h - 1, y0 + 1)
        const tx = fx - x0, ty = fy - y0
        for (let c = 0; c < 3; c++) {
          const v =
            (b.cor[(y0 * b.w + x0) * 3 + c] * (1 - tx) + b.cor[(y0 * b.w + x1) * 3 + c] * tx) * (1 - ty) +
            (b.cor[(y1 * b.w + x0) * 3 + c] * (1 - tx) + b.cor[(y1 * b.w + x1) * 3 + c] * tx) * ty
          a.cor[i * 3 + c] = a.cor[i * 3 + c] * p + v * (1 - p)
        }
        a.peso[i] = 1
      }
  }
  return niveis[0].cor
}

const passo = (a, b, v) => Math.min(1, Math.max(0, (v - a) / (b - a)))

/** Dilata uma máscara binária por `raio` px (caixa separável). */
function dilatar(mascara, w, h, raio) {
  const tmp = new Uint8Array(w * h)
  const out = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    let ultimo = -1e9
    for (let x = 0; x < w; x++) if (mascara[y * w + x]) ultimo = x
      else if (x - ultimo <= raio) tmp[y * w + x] = 1
    ultimo = 1e9
    for (let x = w - 1; x >= 0; x--) {
      if (mascara[y * w + x]) { ultimo = x; tmp[y * w + x] = 1 }
      else if (ultimo - x <= raio) tmp[y * w + x] = 1
    }
  }
  for (let x = 0; x < w; x++) {
    let ultimo = -1e9
    for (let y = 0; y < h; y++) if (tmp[y * w + x]) ultimo = y
      else if (y - ultimo <= raio) out[y * w + x] = 1
    ultimo = 1e9
    for (let y = h - 1; y >= 0; y--) {
      if (tmp[y * w + x]) { ultimo = y; out[y * w + x] = 1 }
      else if (ultimo - y <= raio) out[y * w + x] = 1
    }
  }
  return out
}

/**
 * Desce a camada `extra` linhas, mantendo a altura (sai o pé). O céu ganho no alto
 * repete a primeira linha, suavizada na horizontal; a sede ganha o próprio alto
 * espelhado, para a copa que encosta na borda não terminar reta.
 */
function descer(px, w, h, canais, extra, modo) {
  if (!extra) return px
  const out = new Uint8Array(w * h * canais)
  out.set(px.subarray(0, w * (h - extra) * canais), w * extra * canais)
  for (let y = 0; y < extra; y++)
    for (let x = 0; x < w; x++)
      for (let c = 0; c < canais; c++) {
        let v
        if (modo === "espelho") v = px[((extra - 1 - y) * w + x) * canais + c]
        else {
          // Média de 61 colunas da primeira linha: nada de listras verticais.
          let soma = 0, quantos = 0
          for (let dx = -30; dx <= 30; dx++) {
            const xx = Math.min(w - 1, Math.max(0, x + dx))
            soma += px[xx * canais + c]
            quantos++
          }
          v = Math.round(soma / quantos)
        }
        out[(y * w + x) * canais + c] = v
      }
  return out
}


/** Encolhe uma máscara binária por `raio` px: dilata o avesso. */
function erodir(mascara, w, h, raio) {
  const avesso = mascara.map((v) => (v ? 0 : 1))
  return dilatar(avesso, w, h, raio).map((v) => (v ? 0 : 1))
}

/** Média 3x3 de uma máscara binária: a borda ganha um pixel de transição. */
function suavizar(mascara, w, h) {
  const out = new Float32Array(w * h)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let soma = 0, quantos = 0
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          soma += mascara[ny * w + nx]
          quantos++
        }
      out[y * w + x] = soma / quantos
    }
  return out
}

/** Recorta as copas das laterais dentro dos retângulos das medidas. */
function arvoresDe(px, w, h, { copa, folhas, fora }) {
  const n = w * h
  const mascara = new Uint8Array(n)
  const marcar = (retangulos, teste) => {
    for (const [x0, x1, y0, y1] of retangulos)
      for (let y = y0; y < Math.min(h, y1); y++)
        for (let x = x0; x < Math.min(w, x1); x++) {
          const i = y * w + x
          if (teste(px[i * 3], px[i * 3 + 1], px[i * 3 + 2])) mascara[i] = 1
        }
  }
  marcar(copa, (r, g, b) => !ceuDe(r, g, b) && !nuvemDe(r, g, b))
  marcar(folhas, folhaDe)
  for (const [x0, x1, y0, y1] of fora)
    for (let y = y0; y < Math.min(h, y1); y++) for (let x = x0; x < Math.min(w, x1); x++) mascara[y * w + x] = 0
  // Fecha os furinhos entre as folhas e some com o que ficou solto.
  return semManchas(erodir(dilatar(mascara, w, h, 2), w, h, 2), w, h, 200)
}

async function salvar(rgba, w, h, destino, canais = 4) {
  await sharp(Buffer.from(rgba), { raw: { width: w, height: h, channels: canais } })
    .webp({ quality: 86, alphaQuality: 90, effort: 6, smartSubsample: true })
    .toFile(destino)
  console.log(destino)
}

for (const [nome, proporcao] of Object.entries(ENQUADRAMENTOS)) {
  const arquivo = join(origem, `${nome}-sem-galhos.png`)
  const { width, height } = await sharp(arquivo).metadata()
  // Mantém a resolução da foto; só corta o que sobra da proporção.
  const w = Math.min(width, Math.round(height * proporcao))
  const h = Math.round(w / proporcao)
  const px = await ler(arquivo, w, h)
  const n = w * h
  const { chao, eixo, modulo, telhado, evitar, refazer: refeitos, espelhar, arvores: retangulos } = MEDIDAS[nome]

  /** A borda do telhado na coluna `x`, pela reta da ala daquele lado. */
  const telhadoEm = (x) => {
    const [[xa, ya], [xb, yb]] = x < eixo ? telhado.esquerda : telhado.direita
    return ya + ((yb - ya) * (x - xa)) / (xb - xa)
  }
  const dentro = (retangulos, x, y) => retangulos.some(([x0, x1, y0, y1]) => x >= x0 && x < x1 && y >= y0 && y < y1)

  // 1. As árvores das laterais, com folgas em volta: 4 px para a sede e 6 px para
  //    o céu, onde a borda clara das folhas viraria um halo ao abrir.
  const arvore = arvoresDe(px, w, h, retangulos)
  const folga = dilatar(arvore, w, h, 4)
  const folgaDoCeu = dilatar(arvore, w, h, 6)

  // 2. Horizonte sem as árvores: acima, céu; abaixo, a sede. Nas colunas das
  //    copas ele segue a reta do telhado (a borda da folhagem não é prédio), um
  //    pixel abaixo dela para não sobrar céu na cornija.
  const passa = (i) => {
    const [r, g, b] = [px[i * 3], px[i * 3 + 1], px[i * 3 + 2]]
    return ceuDe(r, g, b) || nuvemDe(r, g, b) || folga[i] === 1
  }
  const linhas = horizonte(passa, w, h)
  for (const [x0, x1] of retangulos.copa)
    for (let x = x0; x < Math.min(w, x1); x++) linhas[x] = Math.round(telhadoEm(x)) + 1
  const naSede = (i) => Math.floor(i / w) >= linhas[i % w]

  // 3. Céu: fica a foto acima do horizonte, menos perto das árvores e nos 3 px
  //    logo acima do telhado (a borda do prédio deixaria uma linha clara). O
  //    resto é preenchido só com azul puro de céu: nem nuvem, nem borda de folha.
  const ceuMantido = new Uint8Array(n)
  const ceuModelo = new Uint8Array(n)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (y >= linhas[x] - 3 || folgaDoCeu[i]) continue
      const [r, g, b] = [px[i * 3], px[i * 3 + 1], px[i * 3 + 2]]
      // Folhinha solta no céu também sai: apareceria parada quando a árvore anda.
      if (ceuDe(r, g, b) || nuvemDe(r, g, b)) ceuMantido[i] = 1
      if (ceuDe(r, g, b)) ceuModelo[i] = 1
    }
  const ceuCor = preencher(px, ceuModelo, w, h)
  const ceuRgb = new Uint8Array(n * 3)
  for (let i = 0; i < n * 3; i++) ceuRgb[i] = ceuMantido[Math.floor(i / 3)] ? px[i] : Math.round(ceuCor[i])

  // 4. Sede: do horizonte para baixo. Atrás das copas a ala inteira é refeita
  //    (`refazer`), e o que a folha tapa fora dali também. A ala repete o módulo
  //    mais próximo em direção ao centro ou, nos lados de `espelhar`, vem do lado
  //    oposto; por fim, a média dos vizinhos. A linha copiada acompanha a
  //    perspectiva: entre o telhado e o chão, a mesma proporção da altura. Na
  //    borda da área refeita, 16 px de transição para a ala real.
  const refazer = new Uint8Array(n)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (y >= linhas[x] && (folga[i] || dentro(refeitos, x, y))) refazer[i] = 1
    }
  const sedeConhecida = new Uint8Array(n)
  for (let i = 0; i < n; i++) sedeConhecida[i] = naSede(i) && !refazer[i] ? 1 : 0
  const modelo = sedeConhecida.slice()
  for (const [x0, x1, y0, y1] of evitar)
    for (let y = y0; y < Math.min(h, y1); y++) for (let x = x0; x < Math.min(w, x1); x++) modelo[y * w + x] = 0
  const sedeCor = preencher(px, sedeConhecida, w, h)
  const linhaCorrespondente = (x, y, xs) => {
    const t = telhadoEm(x)
    if (y <= t || t >= chao) return Math.round(telhadoEm(xs) + (y - t))
    return Math.round(chao - ((chao - y) * (chao - telhadoEm(xs))) / (chao - t))
  }
  const fonte = (x, y) => {
    const sentido = x < eixo ? 1 : -1
    const vizinhos = Array.from({ length: 12 }, (_, k) => x + sentido * (k + 1) * modulo)
    // No espelho, procura o módulo livre para os dois lados, o mais perto primeiro.
    const xe = 2 * eixo - x
    const espelhados = [xe, ...Array.from({ length: 24 }, (_, k) => xe + (k % 2 ? 1 : -1) * sentido * ((k >> 1) + 1) * modulo)]
    const lado = x < eixo ? "esquerda" : "direita"
    const tentativas = espelhar.includes(lado) ? espelhados : vizinhos
    for (const xs of tentativas) {
      if (xs < 0 || xs >= w) continue
      const ys = linhaCorrespondente(x, y, xs)
      if (ys >= 0 && ys < h && modelo[ys * w + xs]) return ys * w + xs
    }
    return -1
  }
  /** Distância horizontal, em px, até a área refeita mais próxima na mesma linha. */
  const bordaDaRefeita = (x, y) => {
    let menor = Infinity
    for (const [x0, x1, y0, y1] of refeitos) {
      if (y < y0 || y >= y1) continue
      if (x >= x1) menor = Math.min(menor, x - x1 + 1)
      else if (x < x0) menor = Math.min(menor, x0 - x)
    }
    return menor
  }
  const sede = new Uint8Array(n * 4)
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      const distancia = y - linhas[x]
      const alfa = distancia >= 0 ? 1 : distancia >= -2 ? (3 + distancia) / 4 : 0
      let cor = [px[i * 3], px[i * 3 + 1], px[i * 3 + 2]]
      if (refazer[i] || (alfa > 0 && distancia < 0 && folga[i])) {
        const j = fonte(x, y)
        cor =
          j >= 0
            ? [px[j * 3], px[j * 3 + 1], px[j * 3 + 2]]
            : [sedeCor[i * 3], sedeCor[i * 3 + 1], sedeCor[i * 3 + 2]].map(Math.round)
      } else if (alfa > 0 && !folga[i]) {
        // Perto da área refeita, mistura a cópia com a ala real.
        const borda = bordaDaRefeita(x, y)
        if (borda < 16) {
          const j = fonte(x, y)
          if (j >= 0) {
            const t = borda / 16
            cor = cor.map((v, c) => Math.round(v * t + px[j * 3 + c] * (1 - t)))
          }
        }
      }
      sede.set([...cor, Math.round(alfa * 255)], i * 4)
    }

  // 5. Jardim: a foto da linha da praça para baixo, com 8 px de transição.
  const jardim = new Uint8Array(n * 4)
  for (let y = 0; y < h; y++) {
    const alfa = passo(chao - 8, chao, y)
    if (!alfa) continue
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      jardim.set([px[i * 3], px[i * 3 + 1], px[i * 3 + 2], Math.round(alfa * 255)], i * 4)
    }
  }

  // 6. Árvores: a cor da foto com a borda suave; na borda contra o céu, tira o
  //    céu de fundo da cor (F = (C - (1 - a)·B) / a) para não sobrar halo azul.
  const alfaArvore = suavizar(arvore, w, h)
  const frente = new Uint8Array(n * 4)
  for (let i = 0; i < n; i++) {
    const a = alfaArvore[i]
    if (!a) continue
    for (let c = 0; c < 3; c++) {
      const f = a < 0.98 && !naSede(i) ? (px[i * 3 + c] - (1 - a) * ceuRgb[i * 3 + c]) / a : px[i * 3 + c]
      frente[i * 4 + c] = Math.min(255, Math.max(0, Math.round(f)))
    }
    frente[i * 4 + 3] = Math.round(a * 255)
  }

  // Uma camada por lado: cada árvore cresce a partir do próprio pé.
  const doLado = (esquerda) => {
    const parte = new Uint8Array(n * 4)
    for (let i = 0; i < n; i++) if (i % w < eixo === esquerda) parte.set(frente.subarray(i * 4, i * 4 + 4), i * 4)
    return parte
  }

  const extra = TOPO_EXTRA[nome]
  const camadas = {
    ceu: { dados: descer(ceuRgb, w, h, 3, extra, "liso"), canais: 3 },
    sede: { dados: descer(sede, w, h, 4, extra, "espelho"), canais: 4 },
    jardim: { dados: descer(jardim, w, h, 4, extra, "espelho"), canais: 4 },
    "arvore-esquerda": { dados: descer(doLado(true), w, h, 4, extra, "espelho"), canais: 4 },
    "arvore-direita": { dados: descer(doLado(false), w, h, 4, extra, "espelho"), canais: 4 },
  }

  const pasta = join("public/landing/abertura", nome)
  await mkdir(pasta, { recursive: true })
  for (const [camada, { dados, canais }] of Object.entries(camadas))
    await salvar(dados, w, h, join(pasta, `${camada}.webp`), canais)
  console.log(nome, `${w}x${h}`)

  if (depuracao) {
    await mkdir(depuracao, { recursive: true })
    const bruto = (c) => ({ input: Buffer.from(c.dados), raw: { width: w, height: h, channels: 4 } })
    // As camadas compostas, para comparar com a foto original.
    await sharp(Buffer.from(camadas.ceu.dados), { raw: { width: w, height: h, channels: 3 } })
      .composite(["sede", "jardim", "arvore-esquerda", "arvore-direita"].map((c) => bruto(camadas[c])))
      .png()
      .toFile(join(depuracao, `${nome}-composta.png`))
    // Cada camada sobre magenta, para ver o recorte; o céu, sozinho.
    for (const camada of ["sede", "jardim", "arvore-esquerda", "arvore-direita"])
      await sharp({ create: { width: w, height: h, channels: 3, background: "#ff00ff" } })
        .composite([bruto(camadas[camada])])
        .png()
        .toFile(join(depuracao, `${nome}-${camada}.png`))
    await sharp(Buffer.from(camadas.ceu.dados), { raw: { width: w, height: h, channels: 3 } })
      .png()
      .toFile(join(depuracao, `${nome}-ceu.png`))
  }
}
