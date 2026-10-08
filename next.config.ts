import type { NextConfig } from "next"

/**
 * O prefixo de caminho da publicação.
 *
 * <p>O GitHub Pages serve o projeto em `https://<conta>.github.io/geradocs-frontend`
 * — sob um caminho, e não na raiz do domínio. É o único motivo do `basePath`.
 *
 * <p>Ele era fixo, e por isso valia também em desenvolvimento: `localhost:3000`
 * respondia 308 e a aplicação só abria em `localhost:3000/geradocs-frontend`. Um
 * detalhe da hospedagem aparecia em toda URL da máquina de quem desenvolve, sem
 * ter função nenhuma ali. Agora quem publica é que o declara — `deploy.yml` —, e
 * localmente o endereço é o que se espera: `localhost:3000/processos/detalhe?id=…`.
 */
const prefixo = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

const nextConfig: NextConfig = {
  output: "export",
  ...(prefixo === "" ? {} : { basePath: prefixo }),
  /**
   * Cada rota vira uma pasta (`/login/index.html`), e os dados de navegação
   * dela ficam dentro da pasta.
   *
   * <p>Sem isto, a raiz sob `basePath` pedia `/geradocs-frontend.txt` — um
   * arquivo fora do site, que o Pages responde com 404. O Next então desistia
   * da navegação interna e recarregava a página: toda ida para "/" (depois do
   * login, no menu, na guarda de RBAC) levava junto o access token, que vive só
   * na memória. No computador a renovação pelo cookie disfarçava; no iPhone o
   * cookie é de terceiros, não chega, e a pessoa voltava para o login. Valer
   * também em desenvolvimento é proposital: a URL é a mesma da publicação.
   */
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

export default nextConfig
