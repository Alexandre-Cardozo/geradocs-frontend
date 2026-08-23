import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

/**
 * Os tipos gerados são o contrato, e não uma cópia dele.
 *
 * Em 23/08/2026 o back-end publicou a geração de arquivo e o encerramento de
 * processo, e `contracts/openapi_v1.json` aqui continuou na versão anterior por
 * dois passos inteiros. Nada avisou: o `npm run tipos` é manual, e tipo velho
 * não dá erro de compilação — ele **descreve um servidor que não existe mais**,
 * e a tela só descobre em produção.
 *
 * O que este teste alcança é a metade local: os tipos correspondem ao contrato
 * que está aqui. A outra metade — o contrato daqui corresponder ao que o
 * back-end publicou — mora em `npm run contrato:conferir`, porque em CI os dois
 * repositórios não estão lado a lado.
 */
describe("contrato", () => {
  it("os tipos gerados correspondem ao contrato versionado", () => {
    const versionado = readFileSync("lib/api/gerado/v1.d.ts", "utf8")

    const regerado = execFileSync(
      "npx",
      ["openapi-typescript", "contracts/openapi_v1.json"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    )

    // Sem isto, sincronizar o contrato e esquecer `npm run tipos` deixa os tipos
    // descrevendo a versão anterior da API — e o compilador aprova.
    expect(regerado.trim()).toBe(versionado.trim())
  })
})
