import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * Os tokens da landing (§121, §122) vivem no `@theme` de `app/globals.css`, e as
 * classes dos componentes dependem deles. Se um token sumir, o Tailwind simplesmente
 * não gera a classe e a página perde o estilo sem erro algum — este teste é o aviso.
 */
const css = readFileSync(join(process.cwd(), "app", "globals.css"), "utf8")

describe("tokens da landing no @theme", () => {
  it.each([
    "--container-landing:",
    "--ease-landing:",
    "--text-landing-h1:",
    "--text-landing-h1--line-height:",
    "--text-landing-h2:",
    "--text-landing-lead:",
    "--text-landing-body:",
    "--animate-landing-entrada:",
    "--animate-landing-menu-abre:",
    "--animate-landing-menu-fecha:",
    "@keyframes landing-entrada",
    "@keyframes landing-menu-abre",
    "@keyframes landing-menu-fecha",
    "--ease-landing-cena:",
    "--text-landing-abertura:",
    "--animate-landing-camada:",
    "--animate-landing-deriva:",
    "--animate-landing-gota:",
    "@keyframes landing-camada",
    "@keyframes landing-deriva",
    "@keyframes landing-gota",
    "--text-landing-manifesto:",
    "--text-landing-numero:",
    "--animate-landing-clique:",
    "@keyframes landing-clique",
    "--animate-landing-pressiona:",
    "@keyframes landing-pressiona",
    "@utility landing-grade",
  ])("declara %s", (token) => {
    expect(css).toContain(token)
  })

  it("não declara cor hex nos tokens da landing", () => {
    const trecho = css.slice(css.indexOf("Landing (§121"), css.indexOf("/*\n  `sr-only`"))
    expect(trecho.length).toBeGreaterThan(0)
    expect(trecho).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
  })
})
