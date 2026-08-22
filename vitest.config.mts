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
      exclude: [
        "lib/mocks/**",
        "lib/teste/**",
        "lib/api/gerado/**",
        "**/*.test.ts",
        // 21/08/2026, revisto ao fechar o Bloco 7.
        //
        // Tudo o que está no gate está em 100% — linha, branch, statement e
        // função. Estes dois continuam de fora, e o motivo não é dívida:
        //
        // `client.ts` é o banco em memória que o back-end vem substituindo
        // fatia por fatia; hoje ele é 4% de cobertura de funções finas sobre
        // arrays de fixture, e some junto com os Blocos 8 a 11.
        //
        // `hooks.ts` é invólucro do TanStack Query: `useQuery` com uma chave e
        // uma função. Testá-lo mediria o TanStack, não o produto.
        //
        // Cobri-los levaria o número a 100% sem que uma regra a mais ficasse
        // verificada — o oposto do que cobertura deveria significar. Ver §27 de
        // docs/decisions.md.
        "lib/api/client.ts",
        "lib/api/hooks.ts",
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
