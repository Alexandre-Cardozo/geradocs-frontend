/**
 * Converte as capturas da landing (`public/landing/telas/*.png`, geradas por
 * `e2e/capturas-landing.spec.ts`) para WebP com 1.600 px de largura, e apaga os
 * PNG. A landing mostra as telas a no máximo ~800 px; 1.600 cobre telas de
 * densidade 2 sem pesar a página.
 */
import { readdir, unlink } from "node:fs/promises"
import { join } from "node:path"

import sharp from "sharp"

const PASTA = "public/landing/telas"

for (const arquivo of (await readdir(PASTA)).filter((a) => a.endsWith(".png"))) {
  const origem = join(PASTA, arquivo)
  const destino = origem.replace(/\.png$/, ".webp")
  await sharp(origem).resize({ width: 1600 }).webp({ quality: 82 }).toFile(destino)
  await unlink(origem)
  console.log(destino)
}
