#!/usr/bin/env node
/**
 * Serve `out/` como o GitHub Pages serve: sob o prefixo do repositório.
 *
 * Existe porque o `next dev` não reproduz a publicação. Em 08/10/2026 o login no
 * celular voltava para a tela de login: depois de entrar, `router.replace("/")`
 * pedia `/geradocs-frontend.txt` — fora do site, 404 —, e o Next desistia da
 * navegação interna e recarregava a página. O access token, que vive só na
 * memória, ia junto, e no iPhone o cookie de renovação é de terceiros e não
 * chega. No `next dev` a rota raiz responde, e o e2e passava verde.
 *
 * As regras imitadas são as que importam para o roteamento:
 * - fora do prefixo, 404;
 * - arquivo existente é servido como está;
 * - `/rota` sem barra final tenta `rota.html` antes da pasta `rota/` — o Next 16
 *   gera as duas, e é o `.html` que o Pages entrega;
 * - pasta sem barra final redireciona (301) para a versão com barra;
 * - pasta com barra final serve o `index.html` dela;
 * - o resto recebe `404.html` com status 404.
 *
 * Uso: `NEXT_PUBLIC_BASE_PATH=/geradocs-frontend node scripts/servir-publicacao.mjs`
 */
import { createReadStream, existsSync, statSync } from "node:fs"
import { createServer } from "node:http"
import path from "node:path"

const RAIZ = path.resolve("out")
const PREFIXO = process.env.NEXT_PUBLIC_BASE_PATH ?? ""
const PORTA = Number(process.env.PORTA ?? 3000)

const TIPOS = {
  ".css": "text/css",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".js": "text/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
}

function envia(resposta, arquivo, status = 200) {
  resposta.writeHead(status, {
    "content-type": TIPOS[path.extname(arquivo)] ?? "application/octet-stream",
  })
  createReadStream(arquivo).pipe(resposta)
}

function redireciona(resposta, destino) {
  resposta.writeHead(301, { location: destino })
  resposta.end()
}

const ehArquivo = (caminho) => existsSync(caminho) && statSync(caminho).isFile()
const ehDiretorio = (caminho) => existsSync(caminho) && statSync(caminho).isDirectory()

createServer((requisicao, resposta) => {
  const url = new URL(requisicao.url ?? "/", "http://localhost")
  const caminho = decodeURIComponent(url.pathname)
  const naoEncontrado = () => envia(resposta, path.join(RAIZ, "404.html"), 404)

  if (PREFIXO !== "" && caminho !== PREFIXO && !caminho.startsWith(`${PREFIXO}/`)) {
    return naoEncontrado()
  }
  const relativo = caminho.slice(PREFIXO.length)
  const alvo = path.join(RAIZ, relativo)
  // `path.join` resolve "..": sem esta checagem, a URL alcançaria arquivos fora de out/.
  if (alvo !== RAIZ && !alvo.startsWith(`${RAIZ}${path.sep}`)) return naoEncontrado()

  if (ehArquivo(alvo)) return envia(resposta, alvo)
  if (!caminho.endsWith("/") && ehArquivo(`${alvo}.html`)) return envia(resposta, `${alvo}.html`)
  if (ehDiretorio(alvo)) {
    if (!caminho.endsWith("/")) return redireciona(resposta, `${caminho}/${url.search}`)
    const indice = path.join(alvo, "index.html")
    return ehArquivo(indice) ? envia(resposta, indice) : naoEncontrado()
  }
  return naoEncontrado()
}).listen(PORTA, () => {
  console.log(`out/ publicado em http://localhost:${PORTA}${PREFIXO}/`)
})
