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
  images: {
    unoptimized: true,
  },
}

export default nextConfig
