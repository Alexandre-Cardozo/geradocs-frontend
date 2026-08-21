import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

/**
 * Suíte de testes do front-end. O gate de cobertura vale para `lib/**` — é onde
 * mora domínio e dados; telas e componentes são cobertos por cenário nomeado, não
 * por percentual.
 *
 * Sem plugin do React: o transformador do Vite resolve TSX sozinho. O arquivo é
 * `.mts` porque o `package.json` não declara `type: module` — como `.ts`, o Vite
 * o carregaria como CommonJS e avisaria a cada execução.
 */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./lib/teste/setup.ts"],
    include: ["{app,components,lib}/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules/**", ".next/**", "out/**", "e2e/**"],
    coverage: {
      provider: "v8",
      include: ["lib/**/*.ts"],
      exclude: ["lib/mocks/**", "lib/teste/**", "lib/api/gerado/**", "**/*.test.ts"],
      reporter: ["text", "lcov"],
      thresholds: {
        // Catraca: estes números são a cobertura medida hoje, não uma meta.
        // Sobem a cada bloco da ordem de implementação e nunca descem — quem
        // baixar um deles precisa dizer por quê na descrição da PR.
        // 20/08/2026 — Bloco 1.7: só a camada de transporte de autenticação.
        // 21/08/2026 — os clientes de acesso e de processos entraram cobertos;
        // a catraca subiu de 11% para 16% de linha.
        // 21/08/2026 — Bloco 3: domínio puro (catálogo, seções, formatação,
        // RBAC, CPF) e guarda-corpos executáveis; 16% → 27%.
        lines: 27,
        functions: 22,
        branches: 33,
        statements: 27,
      },
    },
  },
})
