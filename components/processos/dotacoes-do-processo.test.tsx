import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { DotacoesDoProcesso } from "@/components/processos/dotacoes-do-processo"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * O cadastro de dotação orçamentária.
 *
 * <p>O crédito é declarado uma vez no processo e serve três seções em três
 * documentos: TR 'j', Edital (Art. 150) e a cláusula do contrato (Art. 92,
 * VIII). O que estes testes cobram é que ele seja declarável, corrigível e
 * retirável — e que a cobertura da despesa apareça, porque é ela que faz a
 * palavra "adequação" significar alguma coisa.
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"

const daApi = {
  id: "b1c2d3e4-0000-4111-8222-333344445555",
  budgetUnit: "02.01 — Secretaria Municipal de Educação",
  workProgram: "12.361.0004.2.045",
  expenseNature: "3.3.90.30.00 — Material de Consumo",
  resourceSource: "1.500.1001 — Recursos Ordinários",
  ledgerCode: "1245",
  fiscalYear: 2026,
  amount: 850000,
  registeredAt: "2026-08-28T12:00:00Z",
}

function comDotacoes(dotacoes: unknown[]) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/budget-appropriations`, () =>
      HttpResponse.json(dotacoes),
    ),
  )
}

describe("dotações do processo", () => {
  it("sem crédito declarado, a tela diz o que a lei não admite", async () => {
    comDotacoes([])
    renderizar(<DotacoesDoProcesso processoId={PROCESSO} valorEstimado={1250000} />)

    expect(await screen.findByText(/Art. 150 da Lei 14.133\/21/)).toBeInTheDocument()
  })

  it("mostra o crédito e o quanto ainda falta para cobrir a despesa", async () => {
    comDotacoes([daApi])
    renderizar(<DotacoesDoProcesso processoId={PROCESSO} valorEstimado={1250000} />)

    expect(await screen.findByText("12.361.0004.2.045")).toBeInTheDocument()
    // 1.250.000,00 − 850.000,00: declarar o crédito sem confrontá-lo com a
    // despesa deixaria a seção afirmar adequação que ninguém verificou.
    expect(screen.getByText(/Faltam R\$\s*400\.000,00/)).toBeInTheDocument()
  })

  it("com os créditos cobrindo o valor, a tela diz que a despesa está coberta", async () => {
    comDotacoes([daApi, { ...daApi, id: "outra", fiscalYear: 2027, amount: 400000 }])
    renderizar(<DotacoesDoProcesso processoId={PROCESSO} valorEstimado={1250000} />)

    expect(await screen.findByText("A despesa está coberta")).toBeInTheDocument()
  })

  it("declara um crédito e recusa o formulário incompleto antes de enviar", async () => {
    comDotacoes([])
    let enviado: Record<string, unknown> | null = null
    servidor.use(
      http.post(
        `${urlDaApi}/procurement-processes/:id/budget-appropriations`,
        async ({ request }) => {
          enviado = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(daApi, { status: 201 })
        },
      ),
    )
    renderizar(<DotacoesDoProcesso processoId={PROCESSO} valorEstimado={1250000} />)

    await userEvent.click(await screen.findByRole("button", { name: "Declarar Dotação" }))

    // O botão nasce travado com o motivo à vista: o Art. 92, VIII pede a
    // classificação funcional programática e a categoria econômica nome por nome.
    const declarar = screen.getByRole("button", { name: "Declarar Dotação" })
    expect(declarar).toBeDisabled()
    // O motivo do botão travado, e não a dica do campo: as duas citam o mesmo
    // artigo, e é o motivo que diz o que ainda falta.
    const motivo = () =>
      document.getElementById(declarar.getAttribute("aria-describedby") ?? "")?.textContent ?? ""

    expect(motivo()).toMatch(/unidade orçamentária/)
    await userEvent.type(screen.getByLabelText("Unidade Orçamentária"), "02.01 — Educação")
    expect(motivo()).toMatch(/classificação funcional programática/)
    await userEvent.type(screen.getByLabelText("Programa de Trabalho"), "12.361.0004.2.045")
    expect(motivo()).toMatch(/categoria econômica/)
    await userEvent.type(screen.getByLabelText("Natureza da Despesa"), "3.3.90.30.00")
    expect(motivo()).toMatch(/fonte ou destinação/)
    await userEvent.type(screen.getByLabelText("Fonte de Recurso"), "1.500.1001")
    expect(motivo()).toMatch(/valor previsto/)
    await userEvent.type(screen.getByLabelText(/Valor Previsto/), "850000")
    expect(motivo()).toBe("Tudo certo para gravar.")

    await userEvent.click(screen.getByRole("button", { name: "Declarar Dotação" }))

    await waitFor(() => expect(enviado).not.toBeNull())
    expect(enviado!.workProgram).toBe("12.361.0004.2.045")
    expect(enviado!.amount).toBe(850000)
  })

  it("corrige o crédito no mesmo registro, sem retirar e declarar de novo", async () => {
    comDotacoes([daApi])
    let corpo: Record<string, unknown> | null = null
    servidor.use(
      http.put(
        `${urlDaApi}/procurement-processes/:id/budget-appropriations/:dotacaoId`,
        async ({ request }) => {
          corpo = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(daApi)
        },
      ),
    )
    renderizar(<DotacoesDoProcesso processoId={PROCESSO} valorEstimado={1250000} />)

    await userEvent.click(await screen.findByRole("button", { name: "Corrigir" }))

    // O formulário abre com o crédito que está lá: corrigir um dígito não pode
    // custar redigitar a dotação inteira.
    const programa = screen.getByLabelText("Programa de Trabalho")
    expect(programa).toHaveValue("12.361.0004.2.045")
    await userEvent.clear(programa)
    await userEvent.type(programa, "12.361.0004.2.046")
    await userEvent.click(screen.getByRole("button", { name: "Salvar Correção" }))

    await waitFor(() => expect(corpo).not.toBeNull())
    expect(corpo!.workProgram).toBe("12.361.0004.2.046")
    expect(corpo!.ledgerCode).toBe("1245")
  })

  it("retirar pede confirmação antes de tirar o crédito do processo", async () => {
    comDotacoes([daApi])
    let removida = ""
    servidor.use(
      http.delete(
        `${urlDaApi}/procurement-processes/:id/budget-appropriations/:dotacaoId`,
        ({ params }) => {
          removida = String(params.dotacaoId)
          return new HttpResponse(null, { status: 204 })
        },
      ),
    )
    renderizar(<DotacoesDoProcesso processoId={PROCESSO} valorEstimado={1250000} />)

    await userEvent.click(await screen.findByRole("button", { name: /Retirar/ }))
    // Sem a confirmação, um clique errado apagaria a indicação do crédito — e a
    // ausência dela é causa de nulidade (Art. 150).
    expect(screen.getByText("Retirar do processo?")).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(removida).toBe("")

    await userEvent.click(screen.getByRole("button", { name: /Retirar/ }))
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }))
    await waitFor(() => expect(removida).toBe(daApi.id))
  })

  it("quando a consulta falha, a tela diz isso em vez de fingir que não há crédito", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/budget-appropriations`, () =>
        HttpResponse.json({ detail: "erro" }, { status: 500 }),
      ),
    )
    renderizar(<DotacoesDoProcesso processoId={PROCESSO} valorEstimado={1250000} />)

    expect(
      await screen.findByText("Não foi possível listar a dotação orçamentária."),
    ).toBeInTheDocument()
  })
})
