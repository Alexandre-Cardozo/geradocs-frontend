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
        // 21/08/2026 — fora do gate por prazo, não por conveniência.
        //
        // `client.ts` é a fachada mockada e `hooks.ts` são invólucros do TanStack
        // Query sobre ela. O Bloco 4 apaga cerca de duzentas linhas do primeiro
        // (fluxo de aprovação) e o Bloco 5 extrai o restante da regra de negócio
        // para `lib/dominio/`. Cobri-los hoje seria escrever teste para código
        // marcado para remoção — o alarme que a própria ordem de implementação
        // lista.
        //
        // Voltam ao gate no Bloco 5, quando o que sobrar for domínio de verdade.
        "lib/api/client.ts",
        "lib/api/hooks.ts",
      ],
      reporter: ["text", "lcov"],
      thresholds: {
        // Catraca: estes números são a cobertura medida hoje, não uma meta.
        // Sobem a cada bloco da ordem de implementação e nunca descem — quem
        // baixar um deles precisa dizer por quê na descrição da PR.
        // 20/08/2026 — Bloco 1.7: só a camada de transporte de autenticação.
        // 21/08/2026 — os clientes de acesso e de processos entraram cobertos;
        // a catraca subiu de 11% para 16% de linha.
        // 21/08/2026 — Bloco 3 fechado: domínio, formatação, RBAC, CPF, máquina
        // de estados e os três clientes HTTP em **100% de linha, statement e
        // função**. O gate deixa de ser catraca nesses três e passa a ser piso
        // absoluto: cair de 100 é regressão, não flutuação.
        lines: 100,
        functions: 100,
        statements: 100,
        // Branch fica em 94: as 13 restantes são fallbacks `??` que existem só
        // para satisfazer o TypeScript, porque a especificação OpenAPI declara
        // todo campo como opcional. Não há entrada capaz de alcançá-las pela API
        // pública — testá-las seria escrever teste que executa sem afirmar. Elas
        // desaparecem quando o contrato passar a declarar `required`, correção já
        // registrada como pendência do Bloco 2.
        branches: 94,
      },
    },
  },
})
