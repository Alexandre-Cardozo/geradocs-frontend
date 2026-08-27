import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { DfdsDoProcesso } from "@/components/processos/dfds-do-processo"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * O cadastro de DFDs do processo.
 *
 * <p>Era uma lista de anexos e ficou poluída: cada correção de item registrava
 * outro DFD, todos herdando o mesmo nome de arquivo, sem como distinguir,
 * corrigir ou remover nenhum. O que estes testes cobram é o que faz dela um
 * cadastro — a linha abre, diz o que aquele DFD pede, e tem por onde ser mudada
 * (ADR-036).
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"
const PDF = "application/pdf"

function comDfds(dfds: unknown[]) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/dfds`, () => HttpResponse.json(dfds)),
  )
}

const dfd = (
  id: string,
  fileName: string,
  departmentName: string,
  items: unknown[],
  file: unknown = null,
) => ({
  id,
  fileName,
  departmentId: "02753761-6201-45f7-a9d9-2a1abf6d4f3c",
  departmentName,
  submittedAt: "2026-03-10T12:00:00Z",
  items,
  file,
})

const papel = { description: "Papel A4", unit: "RESMA", quantity: 1200, specification: null }

describe("DFDs do processo", () => {
  it("cada DFD aparece com a secretaria que pediu e quantos itens trouxe", async () => {
    comDfds([
      dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [papel]),
      dfd("d-2", "DFD 004/2026", "Secretaria de Obras", []),
    ])
    renderizar(<DfdsDoProcesso processoId={PROCESSO} onEditarItens={() => {}} />)

    expect(await screen.findByText("DFD 003/2026")).toBeInTheDocument()
    expect(screen.getByText(/Secretaria de Educação/)).toBeInTheDocument()
    // A contagem é o que se procura aqui: qual DFD trouxe o quê.
    expect(screen.getByText("1 item")).toBeInTheDocument()
    // Sem itens não é pendência — o DFD pode ser registrado antes do
    // detalhamento chegar.
    expect(screen.getByText("Sem itens")).toBeInTheDocument()
  })

  it("com um DFD só a lista aparece, porque é dela que se edita e remove", async () => {
    comDfds([dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [papel])])
    renderizar(<DfdsDoProcesso processoId={PROCESSO} onEditarItens={() => {}} />)

    // O cabeçalho do processo mostra o nome do DFD e o download; o que ele não
    // tem é por onde corrigir os itens ou tirar o DFD do processo.
    expect(await screen.findByText("DFD 003/2026")).toBeInTheDocument()
  })

  it("abrir a linha mostra os itens daquele DFD", async () => {
    comDfds([dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [papel])])
    renderizar(<DfdsDoProcesso processoId={PROCESSO} onEditarItens={() => {}} />)

    expect(screen.queryByText("Papel A4")).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole("button", { name: /DFD 003\/2026/ }))

    // É o que responde de onde veio cada quantidade da consolidação.
    expect(screen.getByText("Papel A4")).toBeInTheDocument()
    expect(screen.getByText(/1\.200,00 RESMA/)).toBeInTheDocument()
  })

  it("editar itens manda o DFD da linha, e não um novo", async () => {
    const editar = vi.fn()
    comDfds([dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [papel])])
    renderizar(<DfdsDoProcesso processoId={PROCESSO} onEditarItens={editar} />)

    await userEvent.click(await screen.findByRole("button", { name: /DFD 003\/2026/ }))
    await userEvent.click(screen.getByRole("button", { name: /Editar itens/ }))

    expect(editar).toHaveBeenCalledWith("d-1")
  })

  it("o arquivo pode ser anexado depois, direto na linha", async () => {
    let recebeu: string | null = null
    comDfds([dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [papel])])
    servidor.use(
      http.put(`${urlDaApi}/procurement-processes/:id/dfds/:dfdId/file`, async ({ request }) => {
        const corpo = await request.formData()
        recebeu = (corpo.get("file") as File).name
        return HttpResponse.json({})
      }),
    )
    renderizar(<DfdsDoProcesso processoId={PROCESSO} onEditarItens={() => {}} />)

    await userEvent.click(await screen.findByRole("button", { name: /DFD 003\/2026/ }))
    // "Sem arquivo anexado" era estado sem saída: o PDF assinado chega no tempo
    // dele, às vezes só no fim do processo.
    await userEvent.upload(
      screen.getByLabelText("Arquivo de DFD 003/2026"),
      new File(["%PDF-1.7"], "assinado.pdf", { type: PDF }),
    )

    await waitFor(() => expect(recebeu).toBe("assinado.pdf"))
  })

  it("com arquivo, a linha oferece o download e a substituição", async () => {
    comDfds([
      dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [papel], {
        mediaType: PDF,
        byteSize: 2048,
        sha256: "a".repeat(64),
      }),
    ])
    renderizar(<DfdsDoProcesso processoId={PROCESSO} onEditarItens={() => {}} />)

    expect(await screen.findByText(/2,0 KB/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: /DFD 003\/2026/ }))

    expect(screen.getByRole("button", { name: /Baixar DFD 003\/2026/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Substituir arquivo/ })).toBeInTheDocument()
  })

  it("remover pede confirmação na própria linha", async () => {
    let removeu = false
    comDfds([dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [papel])])
    servidor.use(
      http.delete(`${urlDaApi}/procurement-processes/:id/dfds/:dfdId`, () => {
        removeu = true
        return new HttpResponse(null, { status: 204 })
      }),
    )
    renderizar(<DfdsDoProcesso processoId={PROCESSO} onEditarItens={() => {}} />)

    await userEvent.click(await screen.findByRole("button", { name: /DFD 003\/2026/ }))
    await userEvent.click(screen.getByRole("button", { name: "Remover" }))

    // Remover muda a consolidação: a confirmação fica na linha para que a pessoa
    // continue vendo qual DFD está prestes a sair.
    expect(screen.getByText("Remover do processo?")).toBeInTheDocument()
    expect(removeu).toBe(false)

    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    await waitFor(() => expect(removeu).toBe(true))
  })

  it("desistir da remoção volta a linha ao normal", async () => {
    comDfds([dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [papel])])
    renderizar(<DfdsDoProcesso processoId={PROCESSO} onEditarItens={() => {}} />)

    await userEvent.click(await screen.findByRole("button", { name: /DFD 003\/2026/ }))
    await userEvent.click(screen.getByRole("button", { name: "Remover" }))
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(screen.queryByText("Remover do processo?")).not.toBeInTheDocument()
  })

  it("DFD sem item diz o que falta, em vez de uma lista vazia", async () => {
    comDfds([dfd("d-1", "DFD 004/2026", "Secretaria de Obras", [])])
    renderizar(<DfdsDoProcesso processoId={PROCESSO} onEditarItens={() => {}} />)

    await userEvent.click(await screen.findByRole("button", { name: /DFD 004\/2026/ }))

    expect(screen.getByText(/ainda não tem itens informados/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Informar itens/ })).toBeInTheDocument()
  })

  it("sem DFD nenhum, não desenha um bloco vazio", async () => {
    comDfds([])
    const { container } = renderizar(
      <DfdsDoProcesso processoId={PROCESSO} onEditarItens={() => {}} />,
    )

    await waitFor(() => expect(screen.queryByText(/Carregando/)).not.toBeInTheDocument())
    expect(container).toBeEmptyDOMElement()
  })

  it("a falha do servidor aparece na tela", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/dfds`, () =>
        HttpResponse.json({ status: 500 }, { status: 500 }),
      ),
    )
    renderizar(<DfdsDoProcesso processoId={PROCESSO} onEditarItens={() => {}} />)

    expect(await screen.findByText(/Não foi possível listar/)).toBeInTheDocument()
  })
})
