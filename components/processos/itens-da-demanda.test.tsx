import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { ItensDaDemanda } from "@/components/processos/itens-da-demanda"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Os itens da demanda, com o DFD de cada um.
 *
 * <p>Cadastrar item é operação à parte de registrar o DFD (ADR-036): o que o
 * item declara, além da quantidade, é <b>a qual DFD ela pertence</b> — o
 * documento assinado que responde por aquele número.
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"

function comDfds(dfds: unknown[]) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/dfds`, () => HttpResponse.json(dfds)),
  )
}

/** Captura o `PUT` de itens por DFD: é ele que grava o vínculo. */
function capturarTroca() {
  const gravado: Record<string, Array<Record<string, unknown>>> = {}
  servidor.use(
    http.put(
      `${urlDaApi}/procurement-processes/:id/dfds/:dfdId/items`,
      async ({ request, params }) => {
        const corpo = (await request.json()) as { items: Array<Record<string, unknown>> }
        gravado[params.dfdId as string] = corpo.items
        return HttpResponse.json({})
      },
    ),
  )
  return gravado
}

const dfd = (id: string, fileName: string, departmentName: string, items: unknown[]) => ({
  id,
  fileName,
  departmentId: "02753761-6201-45f7-a9d9-2a1abf6d4f3c",
  departmentName,
  submittedAt: "2026-03-10T12:00:00Z",
  items,
  file: null,
})

const papel = { description: "Papel A4", unit: "RESMA", quantity: 1200, specification: null }
const caneta = { description: "Caneta azul", unit: "UN", quantity: 50, specification: null }

/**
 * A unidade vem da lista canônica — a mesma do painel de quantidades do ETP.
 *
 * @param unidade o rótulo da opção, como "Resma (RESMA)"
 */
async function preencher(descricao: string, unidade: string, quantidade: string) {
  await userEvent.type(screen.getByLabelText(/Descrição do item/), descricao)
  await userEvent.click(screen.getByRole("button", { name: /Unidade/ }))
  await userEvent.click(await screen.findByRole("option", { name: unidade }))
  await userEvent.type(screen.getByLabelText(/Quantidade/), quantidade)
}

describe("itens da demanda", () => {
  it("a tabela mostra cada item com o DFD e a secretaria de origem", async () => {
    comDfds([
      dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [papel]),
      dfd("d-2", "DFD 004/2026", "Secretaria de Obras", [caneta]),
    ])
    renderizar(<ItensDaDemanda processoId={PROCESSO} />)

    // É o vínculo que responde de onde veio cada quantidade da consolidação.
    expect(await screen.findByText("Papel A4")).toBeInTheDocument()
    expect(screen.getByText("DFD 003/2026")).toBeInTheDocument()
    expect(screen.getByText("Caneta azul")).toBeInTheDocument()
    expect(screen.getByText("DFD 004/2026")).toBeInTheDocument()
    expect(screen.getByText("Itens da demanda (2)")).toBeInTheDocument()
  })

  it("sem DFD registrado, não há a que vincular — e a tela diz isso", async () => {
    comDfds([])
    renderizar(<ItensDaDemanda processoId={PROCESSO} />)

    // Um item solto não teria como dizer qual secretaria o pediu.
    expect(await screen.findByText(/Registre um DFD acima/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Adicionar item/ })).not.toBeInTheDocument()
  })

  it("o item novo entra no DFD escolhido, preservando os que já estavam lá", async () => {
    const gravado = capturarTroca()
    comDfds([
      dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [papel]),
      dfd("d-2", "DFD 004/2026", "Secretaria de Obras", []),
    ])
    renderizar(<ItensDaDemanda processoId={PROCESSO} />)

    await userEvent.click(await screen.findByRole("button", { name: /Adicionar item/ }))
    await preencher("Caneta azul", "Unidade (UN)", "50")
    await userEvent.click(screen.getByRole("button", { name: /DFD em que foi pedido/ }))
    await userEvent.click(
      await screen.findByRole("option", { name: /DFD 004\/2026 · Secretaria de Obras/ }),
    )
    await userEvent.click(screen.getByRole("button", { name: "Adicionar item" }))

    await waitFor(() => expect(gravado["d-2"]).toHaveLength(1))
    expect(gravado["d-2"]?.[0]?.description).toBe("Caneta azul")
    expect(gravado["d-2"]?.[0]?.quantity).toBe(50)
    // O DFD de origem não é tocado: a gravação troca a lista de um DFD só.
    expect(gravado["d-1"]).toBeUndefined()
  })

  it("com um DFD só, o vínculo já vem escolhido", async () => {
    const gravado = capturarTroca()
    comDfds([dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [])])
    renderizar(<ItensDaDemanda processoId={PROCESSO} />)

    await userEvent.click(await screen.findByRole("button", { name: /Adicionar item/ }))
    await preencher("Papel A4", "Resma (RESMA)", "1200")
    await userEvent.click(screen.getByRole("button", { name: "Adicionar item" }))

    // Pedir para confirmar o óbvio seria um clique a mais sem informação nenhuma.
    await waitFor(() => expect(gravado["d-1"]).toHaveLength(1))
    expect(gravado["d-1"]?.[0]?.quantity).toBe(1200)
  })

  it("faltando dado, diz qual — inclusive o DFD", async () => {
    comDfds([
      dfd("d-1", "DFD 003/2026", "Secretaria de Educação", []),
      dfd("d-2", "DFD 004/2026", "Secretaria de Obras", []),
    ])
    renderizar(<ItensDaDemanda processoId={PROCESSO} />)

    await userEvent.click(await screen.findByRole("button", { name: /Adicionar item/ }))
    expect(screen.getByText(/Informe a descrição do item/)).toBeInTheDocument()

    await preencher("Papel A4", "Resma (RESMA)", "1200")

    // Com dois DFDs não há vínculo óbvio, e gravar sem ele deixaria o item sem
    // origem — que é a única coisa que a consolidação não pode perguntar depois.
    expect(screen.getByText(/Escolha o DFD em que este item foi pedido/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Adicionar item" })).toBeDisabled()
  })

  it("editar troca o item no lugar, sem duplicá-lo", async () => {
    const gravado = capturarTroca()
    comDfds([dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [papel, caneta])])
    renderizar(<ItensDaDemanda processoId={PROCESSO} />)

    await userEvent.click((await screen.findAllByRole("button", { name: "Editar" }))[1]!)
    const quantidade = screen.getByLabelText(/Quantidade/)
    await userEvent.clear(quantidade)
    await userEvent.type(quantidade, "80")
    await userEvent.click(screen.getByRole("button", { name: "Salvar item" }))

    await waitFor(() => expect(gravado["d-1"]).toHaveLength(2))
    expect(gravado["d-1"]?.[1]?.quantity).toBe(80)
    expect(gravado["d-1"]?.[0]?.description).toBe("Papel A4")
  })

  it("mudar o vínculo tira o item de um DFD e põe no outro", async () => {
    const gravado = capturarTroca()
    comDfds([
      dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [papel]),
      dfd("d-2", "DFD 004/2026", "Secretaria de Obras", []),
    ])
    renderizar(<ItensDaDemanda processoId={PROCESSO} />)

    await userEvent.click(await screen.findByRole("button", { name: "Editar" }))
    await userEvent.click(screen.getByRole("button", { name: /DFD em que foi pedido/ }))
    await userEvent.click(
      await screen.findByRole("option", { name: /DFD 004\/2026 · Secretaria de Obras/ }),
    )
    await userEvent.click(screen.getByRole("button", { name: "Salvar item" }))

    // Sem a segunda gravação o item ficaria contado duas vezes na consolidação.
    await waitFor(() => expect(gravado["d-2"]).toHaveLength(1))
    await waitFor(() => expect(gravado["d-1"]).toEqual([]))
  })

  it("remover pede confirmação e tira só aquele item", async () => {
    const gravado = capturarTroca()
    comDfds([dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [papel, caneta])])
    renderizar(<ItensDaDemanda processoId={PROCESSO} />)

    await userEvent.click((await screen.findAllByRole("button", { name: "Remover" }))[0]!)
    expect(screen.getByText("Remover?")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }))

    await waitFor(() => expect(gravado["d-1"]).toHaveLength(1))
    expect(gravado["d-1"]?.[0]?.description).toBe("Caneta azul")
  })

  it("DFD registrado e nenhum item ainda diz isso, sem tabela vazia", async () => {
    comDfds([dfd("d-1", "DFD 003/2026", "Secretaria de Educação", [])])
    renderizar(<ItensDaDemanda processoId={PROCESSO} />)

    expect(await screen.findByText(/Nenhum item cadastrado ainda/)).toBeInTheDocument()
  })
})
