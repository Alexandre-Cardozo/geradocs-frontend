import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { AlteracoesDaMinuta, JustificativaDoDesvio } from "@/components/documentos/justificativa-da-minuta"
import { documentoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"
import type { SecaoDocumento } from "@/lib/types"

const PROCESSO = documentoApi.processId

const secao = (sobrescrever: Partial<SecaoDocumento> = {}): SecaoDocumento => ({
  id: "PC01",
  titulo: "Do Objeto",
  status: "Completo",
  obrigatoria: true,
  conteudo: "Texto próprio.",
  origem: "catalogo",
  desvioDaMinuta: { clausulas: 3, faltam: ["1.5. O critério de julgamento será o menor preço."] },
  ...sobrescrever,
})

function comJustificativas() {
  const pedidos: { url: string; corpo: unknown }[] = []
  const registrar = async ({ request }: { request: Request }) => {
    pedidos.push({ url: new URL(request.url).pathname, corpo: await request.json() })
    return HttpResponse.json({ ...documentoApi, documentType: "EDITAL" })
  }
  servidor.use(
    http.put(`${urlDaApi}/procurement-processes/:id/documents/:tipo/model-justification`, registrar),
    http.put(`${urlDaApi}/procurement-processes/:id/documents/:tipo/sections/:secao/model-deviation`, registrar),
  )
  return pedidos
}

/**
 * O Art. 19, § 2º na tela (§88): a seção que se afasta da minuta diz o que
 * falta e pede a justificativa; a etapa final resume, sem travar.
 */
describe("justificativa da minuta", () => {
  it("a seção alterada lista as cláusulas fora do texto e grava a justificativa", async () => {
    const pedidos = comJustificativas()
    renderizar(<JustificativaDoDesvio processoId={PROCESSO} tipo="Edital" secao={secao()} />)

    expect(screen.getByText(/deixa de fora 1 de 3 cláusulas da minuta/)).toBeInTheDocument()
    expect(screen.getByText(/Justifique a alteração \(Art. 19, § 2º, Lei 14.133\/21\)/)).toBeInTheDocument()
    expect(screen.getByText("1.5. O critério de julgamento será o menor preço.")).toBeInTheDocument()

    await userEvent.type(screen.getByRole("textbox", { name: "Justificativa da Alteração" }), "Lei municipal.")
    await userEvent.click(screen.getByRole("button", { name: "Salvar Justificativa" }))

    await waitFor(() =>
      expect(pedidos).toEqual([
        { url: expect.stringMatching(/\/sections\/PC01\/model-deviation$/), corpo: { text: "Lei municipal." } },
      ]),
    )
  })

  it("justificada, mostra o texto e deixa editar ou cancelar", async () => {
    renderizar(
      <JustificativaDoDesvio
        processoId={PROCESSO}
        tipo="Edital"
        secao={secao({ justificativaDoDesvio: "Lei municipal.", desvioDaMinuta: { clausulas: 1, faltam: ["X."] } })}
      />,
    )

    expect(screen.getByText(/de 1 cláusula da minuta. Alteração justificada./)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Editar Justificativa" }))
    expect(screen.getByRole("textbox", { name: "Justificativa da Alteração" })).toHaveValue("Lei municipal.")
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(screen.getByRole("button", { name: "Editar Justificativa" })).toBeInTheDocument()
  })

  it("sem afastamento, nada aparece", () => {
    const { container } = renderizar(
      <JustificativaDoDesvio processoId={PROCESSO} tipo="Edital" secao={secao({ desvioDaMinuta: undefined })} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("a etapa final pede a do documento fora da minuta e resume as seções alteradas", async () => {
    const pedidos = comJustificativas()
    const abrir = vi.fn()
    renderizar(
      <AlteracoesDaMinuta
        processoId={PROCESSO}
        tipo="Edital"
        secoes={[secao(), secao({ id: "PC02", titulo: "Da Participação", justificativaDoDesvio: "Ok." }), secao({ id: "PC03", desvioDaMinuta: undefined })]}
        justificativa={{ pedida: true }}
        onAbrirSecao={abrir}
      />,
    )

    expect(screen.getByText(/Há minuta da AGU para este documento, e ele não a segue/)).toBeInTheDocument()
    expect(screen.getByText("Alteração sem Justificativa")).toBeInTheDocument()
    expect(screen.getByText("Alteração Justificada")).toBeInTheDocument()
    await userEvent.click(screen.getAllByRole("button", { name: "Abrir Seção" })[0] as HTMLElement)
    expect(abrir).toHaveBeenCalledWith("PC01")

    await userEvent.type(
      screen.getByRole("textbox", { name: "Justificativa de Não Utilização da Minuta" }),
      "Iniciado antes das minutas.",
    )
    await userEvent.click(screen.getByRole("button", { name: "Salvar Justificativa" }))
    await waitFor(() =>
      expect(pedidos).toEqual([
        { url: expect.stringMatching(/\/model-justification$/), corpo: { text: "Iniciado antes das minutas." } },
      ]),
    )
  })

  it("no modelo do órgão mostra a justificativa dele; sem nada a dizer, nada aparece", () => {
    const { rerender, container } = renderizar(
      <AlteracoesDaMinuta
        processoId={PROCESSO}
        tipo="Edital"
        secoes={[]}
        justificativa={{ pedida: false, doModelo: "Lei 1.234/2024." }}
        onAbrirSecao={() => {}}
      />,
    )
    expect(screen.getByText(/Modelo do órgão. Justificativa registrada: Lei 1.234\/2024./)).toBeInTheDocument()

    rerender(
      <AlteracoesDaMinuta processoId={PROCESSO} tipo="Edital" secoes={[]} justificativa={{ pedida: false }} onAbrirSecao={() => {}} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
