import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { PainelDaSecao } from "@/components/documentos/paineis"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"
import type { SecaoDocumento } from "@/lib/types"

/**
 * Os painéis de quantidade e de valor do ETP.
 *
 * <p>Eram três campos com números fixos do protótipo — 150,00 × R$ 3.233,33 =
 * R$ 484.999,50 — iguais em toda contratação, que ninguém salvava e que não
 * vinham do processo. O que estes testes cobram é o oposto: os números vêm dos
 * itens que as secretarias pediram, e o que a seção guarda é a memória de
 * cálculo escrita a partir deles.
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"

const secao = (titulo: string, painel: "quantidades" | "valor"): SecaoDocumento => ({
  id: "4",
  titulo,
  fundamentoLegal: "Art. 18, § 1º, Lei 14.133/21",
  hint: "",
  obrigatoria: true,
  origem: "catalogo",
  status: "Não iniciado",
  conteudo: "",
  painel,
})

function comConsolidacao(itens: unknown[]) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/demand-consolidation`, () =>
      HttpResponse.json({ items: itens, incongruences: [] }),
    ),
  )
}

function comDfds(dfds: unknown[]) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/dfds`, () => HttpResponse.json(dfds)),
  )
}

const dfd = (fileName: string, departmentName: string, items: unknown[]) => ({
  id: "d-1",
  fileName,
  departmentId: "02753761-6201-45f7-a9d9-2a1abf6d4f3c",
  departmentName,
  submittedAt: "2026-03-10T12:00:00Z",
  items,
  file: null,
})

function renderizarPainel(qual: "quantidades" | "valor") {
  const setRascunho = vi.fn()
  renderizar(
    <PainelDaSecao
      secao={secao(qual === "valor" ? "Estimativa do Valor" : "Estimativa das Quantidades", qual)}
      processoId={PROCESSO}
      rascunho=""
      setRascunho={setRascunho}
    />,
  )
  return { setRascunho }
}

describe("painel de quantidades", () => {
  it("mostra o que cada secretaria pediu e o total, e não um número inventado", async () => {
    comConsolidacao([
      {
        description: "Papel A4",
        unit: "RESMA",
        total: 1500,
        summable: true,
        byDepartment: [
          { departmentName: "Educação", quantity: 1200, unit: "RESMA" },
          { departmentName: "Saúde", quantity: 300, unit: "RESMA" },
        ],
      },
    ])
    renderizarPainel("quantidades")

    expect(await screen.findByText("Papel A4")).toBeInTheDocument()
    expect(screen.getByText(/Educação: 1\.200,00/)).toBeInTheDocument()
    expect(screen.getByText("1.500,00")).toBeInTheDocument()
    expect(screen.getByText("Resma (RESMA)")).toBeInTheDocument()
  })

  it("unidades divergentes não viram um total somado", async () => {
    comConsolidacao([
      {
        description: "Papel A4",
        unit: "RESMA",
        total: 0,
        summable: false,
        byDepartment: [
          { departmentName: "Educação", quantity: 1200, unit: "RESMA" },
          { departmentName: "Saúde", quantity: 30, unit: "CX" },
        ],
      },
    ])
    renderizarPainel("quantidades")

    // Mostrar um total ali seria a plataforma afirmando um número que ninguém
    // pode usar.
    expect(await screen.findByText("Papel A4")).toBeInTheDocument()
    expect(screen.getByText("—")).toBeInTheDocument()
  })

  it("escreve a memória de cálculo a partir dos DFDs, dizendo de onde veio cada quantidade", async () => {
    comConsolidacao([
      {
        description: "Papel A4",
        unit: "RESMA",
        total: 1500,
        summable: true,
        byDepartment: [{ departmentName: "Educação", quantity: 1500, unit: "RESMA" }],
      },
    ])
    const { setRascunho } = renderizarPainel("quantidades")

    await userEvent.click(await screen.findByRole("button", { name: /a partir dos DFDs/ }))

    const texto = setRascunho.mock.calls[0]?.[0] as string
    expect(texto).toContain("Papel A4")
    expect(texto).toContain("Educação")
    // O critério é de quem conduz o processo: fica marcado, e não inventado.
    expect(texto).toContain("[Descrever o critério")
  })

  it("sem item informado, aponta onde informá-lo em vez de mostrar tabela vazia", async () => {
    comConsolidacao([])
    renderizarPainel("quantidades")

    expect(await screen.findByText(/Nenhum item informado nos DFDs/)).toBeInTheDocument()
  })
})

describe("painel de valor", () => {
  const papel = {
    description: "Papel A4",
    unit: "RESMA",
    quantity: 100,
    specification: null,
    unitPrice: 25,
  }

  it("soma os itens precificados e compara com o valor declarado na abertura", async () => {
    comDfds([dfd("DFD 003/2026", "Educação", [papel])])
    renderizarPainel("valor")

    // 100 × 25 = 2.500; o processo do fixture declarou 485.000.
    expect(await screen.findByText(/R\$ 2\.500,00/)).toBeInTheDocument()
    expect(screen.getByText(/R\$ 485\.000,00/)).toBeInTheDocument()
    // A diferença é dita: escondê-la deixaria a estimativa se contradizer.
    expect(screen.getByText(/Diferença de/)).toBeInTheDocument()
  })

  it("item sem preço vira pendência, e não zero", async () => {
    comDfds([
      dfd("DFD 003/2026", "Educação", [
        papel,
        { description: "Caneta", unit: "UN", quantity: 50, specification: null, unitPrice: null },
      ]),
    ])
    renderizarPainel("valor")

    // Zero é um preço; "ninguém estimou" é outra coisa, e some do total.
    expect(await screen.findByText(/Um item ainda não tem/)).toBeInTheDocument()
    expect(screen.getByText(/Caneta/)).toBeInTheDocument()
    expect(screen.getByText(/1 de 2 itens com preço informado/)).toBeInTheDocument()
  })

  it("a memória de cálculo sai dos itens, com a fonte escolhida e a diferença marcada", async () => {
    comDfds([dfd("DFD 003/2026", "Educação", [papel])])
    const { setRascunho } = renderizarPainel("valor")

    await screen.findByText(/R\$ 2\.500,00/)
    await userEvent.click(screen.getByLabelText(/Painel de Preços/))
    await userEvent.click(screen.getByRole("button", { name: /a partir dos itens/ }))

    const texto = setRascunho.mock.calls[0]?.[0] as string
    expect(texto).toContain("Papel A4")
    expect(texto).toContain("Painel de Preços")
    expect(texto).toContain("[Justificar a diferença")
  })

  it("sem item nenhum, não oferece uma estimativa que não existe", async () => {
    comDfds([])
    renderizarPainel("valor")

    expect(await screen.findByText(/Nenhum item informado nos DFDs/)).toBeInTheDocument()
  })
})
