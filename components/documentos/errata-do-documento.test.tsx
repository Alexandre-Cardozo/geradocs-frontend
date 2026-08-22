import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { ErrataDoDocumento } from "@/components/documentos/errata-do-documento"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * A errata é facultativa e comparativa: sem duas versões ela não existe, e o
 * recorte de cada linha vem do servidor.
 */
const padrao = { processoId: "3f2b1a00-1111-4222-8333-444455556666", tipo: "ETP" as const }

/**
 * O `Dropdown` do design system é um listbox próprio, não um `<select>`: abre
 * com clique no botão e escolhe com clique na opção.
 */
async function escolher(rotulo: string, versao: number) {
  await userEvent.click(await screen.findByRole("button", { name: rotulo }))
  await userEvent.click(
    await screen.findByRole("option", { name: new RegExp(`^v${versao} `) }),
  )
}

function versao(version: number, note: string) {
  return { version, note, generatedAt: "2026-08-22T12:00:00-03:00", contentHash: "a".repeat(64), body: [] }
}

function comVersoes(quantas: number) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/versions`, () =>
      HttpResponse.json(
        Array.from({ length: quantas }, (_, i) => versao(quantas - i, i === quantas - 1 ? "Geração inicial" : "Regeração")),
      ),
    ),
  )
}

describe("errata do documento", () => {
  it("com uma versão só, explica que não há o que comparar", async () => {
    comVersoes(1)
    renderizar(<ErrataDoDocumento {...padrao} />)

    expect(await screen.findByText(/ainda tem só uma/i)).toBeInTheDocument()
  })

  it("não compara antes de escolher as duas versões", async () => {
    let pediu = false
    comVersoes(2)
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/versions/comparison`, () => {
        pediu = true
        return HttpResponse.json({ from: 1, to: 2, sections: [], errata: [] })
      }),
    )
    renderizar(<ErrataDoDocumento {...padrao} />)

    // Pedir antes traria um 400 a cada abertura do painel.
    expect(await screen.findByText(/Escolha as duas versões/i)).toBeInTheDocument()
    expect(pediu).toBe(false)
  })

  it("mostra onde se lê e leia-se do que o servidor recortou", async () => {
    comVersoes(2)
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/versions/comparison`, () =>
        HttpResponse.json({
          from: 1,
          to: 2,
          sections: [],
          errata: [
            {
              sectionCode: "4",
              title: "Prazo de Entrega",
              ondeSeLe: "O prazo de entrega será de 30 dias corridos.",
              leiaSe: "O prazo de entrega será de 45 dias corridos.",
            },
          ],
        }),
      ),
    )
    renderizar(<ErrataDoDocumento {...padrao} />)

    await escolher("Versão de origem da errata", 1)
    await escolher("Versão de destino da errata", 2)

    // O período inteiro, dos dois lados: é assim que a errata é publicada, e é
    // assim que quem confere encontra o trecho no documento.
    expect(await screen.findByText("O prazo de entrega será de 30 dias corridos.")).toBeInTheDocument()
    expect(screen.getByText("O prazo de entrega será de 45 dias corridos.")).toBeInTheDocument()
  })

  it("sem diferenças, diz que não há errata a publicar", async () => {
    comVersoes(2)
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/versions/comparison`, () =>
        HttpResponse.json({ from: 1, to: 2, sections: [], errata: [] }),
      ),
    )
    renderizar(<ErrataDoDocumento {...padrao} />)

    await escolher("Versão de origem da errata", 1)
    await escolher("Versão de destino da errata", 2)

    expect(await screen.findByText(/não há errata a publicar/i)).toBeInTheDocument()
  })

  it("seção acrescentada ou suprimida é dita, não deixada em branco", async () => {
    comVersoes(2)
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/versions/comparison`, () =>
        HttpResponse.json({
          from: 1,
          to: 2,
          sections: [],
          errata: [
            { sectionCode: "7", title: "Resultados", ondeSeLe: null, leiaSe: "Texto novo." },
            { sectionCode: "8", title: "Anexos", ondeSeLe: "Texto antigo.", leiaSe: null },
          ],
        }),
      ),
    )
    renderizar(<ErrataDoDocumento {...padrao} />)

    await escolher("Versão de origem da errata", 1)
    await escolher("Versão de destino da errata", 2)

    // Um traço sem explicação faria parecer erro de montagem da errata.
    expect(await screen.findByText(/seção acrescentada nesta versão/i)).toBeInTheDocument()
    expect(screen.getByText(/seção suprimida nesta versão/i)).toBeInTheDocument()
  })
})
