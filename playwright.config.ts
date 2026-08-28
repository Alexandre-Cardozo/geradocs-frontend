import { defineConfig, devices } from "@playwright/test"

const ORIGEM = "http://localhost:3000"

/**
 * O prefixo da publicação, quando há um (GitHub Pages). Em desenvolvimento é
 * vazio. O `baseURL` guarda só a origem e as rotas vêm de `e2e/api.ts` já com o
 * prefixo: um caminho iniciado por "/" descarta a parte de caminho do baseURL, e
 * o teste iria para a URL errada sem reclamar de nada.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ""

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
    command: "npm run dev",
    url: ORIGEM + BASE_PATH,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
