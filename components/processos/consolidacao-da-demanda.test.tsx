import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { ConsolidacaoDaDemanda } from "@/components/processos/consolidacao-da-demanda"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * A tabela item × secretaria × total, e o que diverge entre os pedidos.
 *
 * O caso da reunião: três secretarias pedem o mesmo item em unidades
 * diferentes. A tabela precisa mostrar quem pediu o quê, e o total precisa dizer
 * que não pode ser usado como está.
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"

function comConsolidacao(corpo: Record<string, unknown>) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/demand-consolidation`, () =>
      HttpResponse.json(corpo),
    ),
  )
}

const TRES_SECRETARIAS = {
  items: [
    {
      description: "Papel A4",
      unit: "resma",
      total: 170,
      summable: false,
      byDepartment: [
        { departmentName: "Educação", quantity: 100, unit: "resma" },
        { departmentName: "Saúde", quantity: 20, unit: "caixa" },
        { departmentName: "Administração", quantity: 50, unit: "resma" },
      ],
    },
  ],
  incongruences: [
    {
      kind: "UNIT",
      itemDescription: "Papel A4",
      values: [
        { departmentName: "Educação", value: "resma" },
        { departmentName: "Saúde", value: "caixa" },
        { departmentName: "Administração", value: "resma" },
      ],
    },
  ],
}

describe("consolidação da demanda", () => {
  it("mostra a tabela item × secretaria × total", async () => {
    comConsolidacao(TRES_SECRETARIAS)
    renderizar(<ConsolidacaoDaDemanda processoId={PROCESSO} />)

    expect(await screen.findByText("Papel A4")).toBeInTheDocument()
    for (const secretaria of ["Educação", "Saúde", "Administração"]) {
      expect(screen.getAllByText(secretaria).length).toBeGreaterThan(0)
    }
    expect(screen.getByText("100 resma")).toBeInTheDocument()
    expect(screen.getByText("20 caixa")).toBeInTheDocument()
  })

  it("o total divergente aparece, mas dito que não serve como está", async () => {
    comConsolidacao(TRES_SECRETARIAS)
    renderizar(<ConsolidacaoDaDemanda processoId={PROCESSO} />)

    // Sumir com o total deixaria a pessoa sem ver o que já foi pedido; mostrá-lo
    // como bom faria a Cotação sair com um número que ninguém pode usar.
    const riscado = await screen.findByText("170")
    expect(riscado).toHaveClass("line-through")
    // A tabela diz o motivo na própria célula, além do alerta acima dela.
    expect(screen.getAllByText(/unidades divergentes/i).length).toBeGreaterThan(1)
  })

  it("a incongruência diz a consequência e quem declarou cada valor", async () => {
    comConsolidacao(TRES_SECRETARIAS)
    renderizar(<ConsolidacaoDaDemanda processoId={PROCESSO} />)

    // A consequência é o que separa alerta de ruído; a origem é o que permite
    // perguntar à secretaria certa.
    expect(await screen.findByText(/Não é possível somar as quantidades/i)).toBeInTheDocument()
    expect(screen.getByText("Unidades divergentes — Papel A4")).toBeInTheDocument()
  })

  it("sem divergência, mostra o total como bom", async () => {
    comConsolidacao({
      items: [
        {
          description: "Papel A4",
          unit: "resma",
          total: 150,
          summable: true,
          byDepartment: [
            { departmentName: "Educação", quantity: 100, unit: "resma" },
            { departmentName: "Saúde", quantity: 50, unit: "resma" },
          ],
        },
      ],
      incongruences: [],
    })
    renderizar(<ConsolidacaoDaDemanda processoId={PROCESSO} />)

    expect(await screen.findByText("150 resma")).toBeInTheDocument()
    expect(screen.queryByText(/unidades divergentes/i)).not.toBeInTheDocument()
  })

  it("secretaria que não pediu o item aparece com traço, não em branco", async () => {
    comConsolidacao({
      items: [
        {
          description: "Papel A4",
          unit: "resma",
          total: 100,
          summable: true,
          byDepartment: [{ departmentName: "Educação", quantity: 100, unit: "resma" }],
        },
        {
          description: "Caneta",
          unit: "un",
          total: 200,
          summable: true,
          byDepartment: [{ departmentName: "Saúde", quantity: 200, unit: "un" }],
        },
      ],
      incongruences: [],
    })
    renderizar(<ConsolidacaoDaDemanda processoId={PROCESSO} />)

    // Célula vazia se lê como dado faltando; o traço diz "não pediu".
    expect(await screen.findByText("Caneta")).toBeInTheDocument()
    expect(screen.getAllByText("—")).toHaveLength(2)
  })

  it("processo sem DFD explica em vez de mostrar tabela vazia", async () => {
    comConsolidacao({ items: [], incongruences: [] })
    renderizar(<ConsolidacaoDaDemanda processoId={PROCESSO} />)

    expect(await screen.findByText(/Nenhum DFD com itens/i)).toBeInTheDocument()
  })
})
