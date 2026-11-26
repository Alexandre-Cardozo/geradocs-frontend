/**
 * Gera os ícones de aba da GovPro (§137) a partir do símbolo oficial do design
 * system, nas mesmas medidas dos ícones do GeraDocs:
 *
 * - `icon.png` (512 px): o símbolo em fundo transparente, com 32 px de margem;
 * - `favicon.ico` (16, 32 e 48 px): o mesmo, para quem pede `/favicon.ico`;
 * - `apple-icon.png` (180 px): o símbolo no selo azul-marinho, porque o iOS não
 *   aceita transparência; ele ocupa 100 px, como o do GeraDocs.
 *
 * Saem em `public/icones/govpro/`, e o `favicon.ico` também em `public/`.
 *
 * Uso: node scripts/icones-govpro.mjs
 */
import { copyFile, mkdir, writeFile } from "node:fs/promises"

import sharp from "sharp"

const SIMBOLO = "design_system/assets/govpro-mark.svg"
const PASTA = "public/icones/govpro"
const TRANSPARENTE = { r: 0, g: 0, b: 0, alpha: 0 }
/** O azul-marinho do selo do ícone da Apple do GeraDocs. */
const SELO = { r: 7, g: 26, b: 61, alpha: 1 }

/** O símbolo em `lado` px, centrado num quadrado de `quadro` px. */
async function simbolo(lado, quadro, fundo) {
  const desenho = await sharp(SIMBOLO, { density: 600 })
    .resize(lado, lado, { fit: "contain", background: TRANSPARENTE })
    .png()
    .toBuffer()
  const margem = Math.round((quadro - lado) / 2)
  return sharp({ create: { width: quadro, height: quadro, channels: 4, background: fundo } })
    .composite([{ input: desenho, left: margem, top: margem }])
    .png()
    .toBuffer()
}

/** Um `.ico` com uma imagem PNG por tamanho (aceito por todos os navegadores atuais). */
function ico(imagens) {
  const cabecalho = Buffer.alloc(6 + 16 * imagens.length)
  cabecalho.writeUInt16LE(0, 0)
  cabecalho.writeUInt16LE(1, 2)
  cabecalho.writeUInt16LE(imagens.length, 4)
  let posicao = cabecalho.length
  imagens.forEach(({ lado, png }, k) => {
    const e = 6 + 16 * k
    cabecalho.writeUInt8(lado, e)
    cabecalho.writeUInt8(lado, e + 1)
    cabecalho.writeUInt16LE(1, e + 4)
    cabecalho.writeUInt16LE(32, e + 6)
    cabecalho.writeUInt32LE(png.length, e + 8)
    cabecalho.writeUInt32LE(posicao, e + 12)
    posicao += png.length
  })
  return Buffer.concat([cabecalho, ...imagens.map((i) => i.png)])
}

await mkdir(PASTA, { recursive: true })
await writeFile(`${PASTA}/icon.png`, await simbolo(448, 512, TRANSPARENTE))
await writeFile(`${PASTA}/apple-icon.png`, await simbolo(100, 180, SELO))
const pequenos = await Promise.all(
  [16, 32, 48].map(async (lado) => ({
    lado,
    png: await sharp(await simbolo(448, 512, TRANSPARENTE)).resize(lado, lado).png().toBuffer(),
  })),
)
await writeFile(`${PASTA}/favicon.ico`, ico(pequenos))
await copyFile(`${PASTA}/favicon.ico`, "public/favicon.ico")
console.log("Ícones da GovPro em", PASTA)
