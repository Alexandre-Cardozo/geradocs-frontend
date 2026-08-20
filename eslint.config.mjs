import { defineConfig, globalIgnores } from "eslint/config"
import nextCoreWebVitals from "eslint-config-next/core-web-vitals"
import nextTypescript from "eslint-config-next/typescript"

const config = defineConfig([
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "design_system/**",
    "next-env.d.ts",
    // Skills instaladas por terceiros: código de agente, não do produto.
    // Lintá-las mistura aviso alheio com aviso nosso e esconde o que importa.
    ".claude/**",
    ".agents/**",
    // Tipos gerados do contrato OpenAPI: alterá-los à mão é o que este arquivo
    // existe para impedir, então lintá-los não muda nada.
    "lib/api/gerado/**",
  ]),
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    files: ["app/**/*.{ts,tsx}", "components/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
    rules: {
      // ─── Aderência ao DS no regime Tailwind (utility-first) ─────────────────
      // A fonte única de verdade das cores/fontes/raios é o bloco @theme de
      // app/globals.css. Cores devem vir de classes de token (bg-royal,
      // text-tint-success-fg...), NUNCA de hex cru nem de valores arbitrários de
      // cor no Tailwind (bg-[#2563EB]). Valores estruturais pontuais em brackets
      // (min-w-[560px] de tabela rolável) continuam permitidos — são o
      // equivalente utility-first das "dimensões pontuais" que antes eram números.
      "no-restricted-syntax": [
        "error",
        {
          selector: "Literal[value=/#[0-9a-fA-F]{3,8}\\b/]",
          message: "Cor hex crua — use uma classe de token do design system (ex.: bg-royal, text-tint-success-fg).",
        },
        {
          selector: "Literal[value=/-\\[#[0-9a-fA-F]/]",
          message: "Cor arbitrária no Tailwind (bg-[#...]) burla o @theme — use a classe de token correspondente.",
        },
        {
          selector: "Literal[value=/-\\[rgb/]",
          message: "Cor arbitrária no Tailwind (…-[rgb(...)]) burla o @theme — use a classe de token correspondente.",
        },
        {
          selector: "Literal[value=/\\btext-\\[[0-9]/]",
          message: "Tamanho de fonte arbitrário (text-[NNpx]) burla a escala tipográfica — use text-xs/sm/base/md/lg/xl/2xl.",
        },
      ],
    },
  },
])

export default config
