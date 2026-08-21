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
        // 21/08/2026, revisto ao fim do Bloco 5.
        //
        // A extração para `lib/dominio/` foi feita: escopo, indicadores,
        // pendências do processo, seções e versionamento saíram daqui e estão em
        // 100%. O que sobrou **não é domínio** — `client.ts` virou armazenamento
        // em memória com funções finas sobre arrays, e `hooks.ts` é invólucro do
        // TanStack Query.
        //
        // Cobri-los a 100% mediria fixture e cola de framework: o número subiria
        // sem que nada ficasse mais verificado, e cada módulo entregue pelo
        // back-end apaga um pedaço deles. Ver §27 de docs/decisions.md.
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
        // Branch em 97: as 7 restantes são fallbacks `??` que existem só para
        // satisfazer o TypeScript, porque a especificação OpenAPI declara todo
        // campo como opcional. Não há entrada capaz de alcançá-las pela API
        // pública — testá-las seria escrever teste que executa sem afirmar. Elas
        // desaparecem quando o contrato passar a declarar `required`, correção já
        // registrada como pendência do Bloco 2.
        // 21/08/2026 — Bloco 6: 96 -> 97 com o descritor de identificador.
        branches: 97,
      },
    },
  },
})
