import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { ImportarPca } from "@/components/configuracoes/importar-pca"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Anexar o PCA do órgão.
 *
 * O que a tela promete é o que a plataforma faz: itens **indexados**, e não
 * "arquivo carregado com sucesso". Enquanto só CSV é lido, é isso que a tela
 * aceita — dizer que leu um PDF seria afirmar ter lido o que ninguém leu.
 */
const ANOS = [
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
]

function semPlano() {
  servidor.use(http.get(`${urlDaApi}/pca-plan`, () => new HttpResponse(null, { status: 204 })))
}

function arquivoCsv(nome = "pca-2026.csv") {
  return new File(["2026-0142;Papel A4 75 g/m2;RESMA;1.200;28.800,00"], nome, {
    type: "text/csv",
  })
}

describe("importar o PCA do órgão", () => {
  it("sem plano, diz o que isso custa em vez de fingir que há um", async () => {
    semPlano()
    renderizar(<ImportarPca anos={ANOS} />)

    expect(await screen.findByText(/Nenhum PCA importado ainda/)).toBeInTheDocument()
    expect(screen.getByText(/informar o item à mão/)).toBeInTheDocument()
  })

  it("mostra o plano vigente pelo número que importa: itens indexados", async () => {
    servidor.use(
      http.get(`${urlDaApi}/pca-plan`, () =>
        HttpResponse.json({
          year: 2026,
          sourceFileName: "pca-2026.csv",
          importedAt: "2026-08-22T12:00:00-03:00",
          indexedItems: 247,
        }),
      ),
    )
    renderizar(<ImportarPca anos={ANOS} />)

    expect(await screen.findByText("247 itens indexados.")).toBeInTheDocument()
    expect(screen.getByText("pca-2026.csv")).toBeInTheDocument()
  })

  it("o botão só libera com arquivo, e diz o que falta enquanto não há", async () => {
    semPlano()
    renderizar(<ImportarPca anos={ANOS} />)

    const importar = await screen.findByRole("button", { name: "Importar e indexar" })
    expect(importar).toBeDisabled()
    expect(importar).toHaveAttribute("aria-describedby")
  })

  it("envia o conteúdo do arquivo, e não só o nome", async () => {
    semPlano()
    let corpo: Record<string, unknown> | undefined
    servidor.use(
      http.post(`${urlDaApi}/pca-plan`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          year: 2026,
          sourceFileName: "pca-2026.csv",
          importedAt: "2026-08-22T12:00:00-03:00",
          indexedItems: 1,
        })
      }),
    )
    renderizar(<ImportarPca anos={ANOS} />)

    await userEvent.upload(
      await screen.findByLabelText("Arquivo CSV do PCA"),
      arquivoCsv(),
    )
    await userEvent.click(screen.getByRole("button", { name: "Importar e indexar" }))

    // Mandar só o nome deixaria a plataforma dizendo "indexado" sobre um
    // arquivo que ela nunca leu.
    await waitFor(() =>
      expect(corpo).toEqual({
        year: 2026,
        fileName: "pca-2026.csv",
        content: "2026-0142;Papel A4 75 g/m2;RESMA;1.200;28.800,00",
      }),
    )
  })

  it("arquivo recusado mostra a linha do problema, e não “formato inválido”", async () => {
    semPlano()
    servidor.use(
      http.post(`${urlDaApi}/pca-plan`, () =>
        HttpResponse.json(
          { detail: "Linha 2: esperado \"código;descrição;unidade;quantidade;valor\"." },
          { status: 400 },
        ),
      ),
    )
    renderizar(<ImportarPca anos={ANOS} />)

    await userEvent.upload(
      await screen.findByLabelText("Arquivo CSV do PCA"),
      arquivoCsv(),
    )
    await userEvent.click(screen.getByRole("button", { name: "Importar e indexar" }))

    // Sem a linha, a pessoa procura sozinha o erro em uma planilha de 400 itens.
    expect(await screen.findByText(/Linha 2/)).toBeInTheDocument()
  })

  it("diz que só lê CSV, em vez de aceitar PDF e mentir que leu", async () => {
    semPlano()
    renderizar(<ImportarPca anos={ANOS} />)

    expect(await screen.findByText(/PDF e XLSX ainda não são lidos/)).toBeInTheDocument()
    expect(screen.getByLabelText("Arquivo CSV do PCA")).toHaveAttribute(
      "accept",
      ".csv,text/csv",
    )
  })
})
