import { defineConfig, devices } from "@playwright/test"

/**
 * O prefixo da publicação, quando há um (GitHub Pages). Em desenvolvimento é
 * vazio. O `baseURL` guarda só a origem e as rotas vêm de `e2e/api.ts` já com o
 * prefixo: um caminho iniciado por "/" descarta a parte de caminho do baseURL, e
 * o teste iria para a URL errada sem reclamar de nada.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

/**
 * `E2E_PUBLICADO=1` roda a mesma jornada contra o export estático (`out/`),
 * servido como o GitHub Pages o serve (`scripts/servir-publicacao.mjs`). O
 * `next dev` não reproduz a publicação: o login que recarregava a página no
 * celular passava verde aqui e só falhava no Pages. Exige `npm run build` antes.
 */
const PUBLICADO = process.env.E2E_PUBLICADO === "1"

/**
 * Porta própria no modo publicado: não disputa a 3000 com um `next dev` aberto
 * nem a 4173 com um `vite preview` de outro projeto.
 */
const ORIGEM = PUBLICADO ? "http://localhost:4400" : "http://localhost:3000"

/**
 * E2E sobe o servidor de desenvolvimento e intercepta a API (`e2e/api.ts`).
 *
 * Interceptar é deliberado: a jornada não pode depender de o backend estar no ar
 * nem de que dados existem nele. O que se verifica aqui é a aplicação — guarda de
 * sessão, RBAC, acessibilidade e responsividade —, não a integração, que já tem
 * teste próprio em `lib/api/*.test.ts`.
 *
 * A versão do Playwright é fixada (1.62.1) para que o Chromium seja o mesmo aqui
 * e no CI. Navegador que se atualiza sozinho transforma teste verde em teste
 * vermelho de madrugada, sem ninguém ter mudado nada.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: ORIGEM,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: PUBLICADO ? "PORTA=4400 node scripts/servir-publicacao.mjs" : "npm run dev",
    url: ORIGEM + BASE_PATH,
    // Reaproveitar no modo publicado testaria o que já estivesse na porta, e não
    // o `out/` que acabou de ser gerado.
    reuseExistingServer: !process.env.CI && !PUBLICADO,
    timeout: 120_000,
  },
})
