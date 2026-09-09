import { fileURLToPath } from "node:url"

import { defineConfig } from "vitest/config"

/**
 * Suíte de testes do front-end. O gate de cobertura vale para `lib/**` — é onde
 * mora domínio e dados; telas e componentes são cobertos por cenário nomeado, não
 * por percentual.
 *
 * **Sem exclusões de conveniência desde 22/08/2026.** `client.ts` e `hooks.ts`
 * ficaram de fora até o Bloco 10, sob a justificativa de que um era "o mock
 * encolhendo" e o outro, "invólucro do TanStack". As duas envelheceram: 22
 * funções da fachada já falavam com o servidor, e as escolhas de invalidação dos
 * hooks são regra de produto. Fora do gate, elas escondiam dois defeitos reais —
 * encerrar processo e editar usuário procuravam nas fixtures gente que só
 * existia no servidor.
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
      exclude: [
        "lib/mocks/**",
        "lib/teste/**",
        "lib/api/gerado/**",
        "**/*.test.ts",
      ],
      reporter: ["text", "lcov"],
      thresholds: {
        // Piso absoluto, não catraca. Foi catraca de 20 a 21/08/2026, subindo
        // de 11% a cada bloco; ao fechar o Bloco 7 chegou a 100 nos quatro
        // números, e a partir daqui qualquer queda é regressão.
        lines: 100,
        functions: 100,
        statements: 100,
        // Branch foi o último a chegar. O que faltava eram fallbacks `??` que
        // existiam só para satisfazer o compilador, porque a especificação
        // declarava todo campo como opcional; com o contrato afirmando
        // `required`, eles viraram código sem caminho e saíram.
        branches: 100,
      },
    },
  },
})
