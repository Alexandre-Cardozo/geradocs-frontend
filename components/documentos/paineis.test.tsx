import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { PainelDaSecao } from "@/components/documentos/paineis"
import { secoesPorTipoBase } from "@/lib/documentos"
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

const secao = (titulo: string, painel: "necessidade" | "quantidades" | "valor"): SecaoDocumento => ({
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

const TITULOS = {
  necessidade: "Descrição da Necessidade",
  quantidades: "Estimativa das Quantidades",
  valor: "Estimativa do Valor",
} as const

function renderizarPainel(qual: "necessidade" | "quantidades" | "valor") {
  const setRascunho = vi.fn()
  const gerar = vi.fn()
  renderizar(
    <PainelDaSecao
      secao={secao(TITULOS[qual], qual)}
      processoId={PROCESSO}
      rascunho=""
      setRascunho={setRascunho}
      gerando={false}
      onGerarComIa={gerar}
    />,
  )
  return { setRascunho, gerar }
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
    // Sem a fonte não há rascunho: o parágrafo afirma de onde saiu o preço.
    expect(screen.queryByRole("button", { name: /a partir dos itens/ })).not.toBeInTheDocument()
    expect(screen.getByText(/Escolha a fonte de pesquisa de preços/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /Fonte de pesquisa de preços/ }))
    await userEvent.click(await screen.findByRole("option", { name: /Painel de Preços/ }))
    await userEvent.click(screen.getByRole("button", { name: /a partir dos itens/ }))

    const texto = setRascunho.mock.calls[0]?.[0] as string
    expect(texto).toContain("Papel A4")
    // O fundamento vai junto: é o que o controle procura.
    expect(texto).toContain("Painel de Preços")
    expect(texto).toContain("Art. 23, § 1º, I, Lei 14.133/21")
    expect(texto).toContain("[Justificar a diferença")
  })

  it("a fonte volta marcada do texto já gravado na seção", async () => {
    comDfds([dfd("DFD 003/2026", "Secretaria de Educação", [papel])])
    const setRascunho = vi.fn()
    const memoria = [
      "O valor estimado resulta dos preços unitários referenciais.",
      "Fonte de pesquisa de preços: Base nacional de notas fiscais eletrônicas"
        + " (Art. 23, § 1º, V, Lei 14.133/21).",
    ].join("\n\n")
    renderizar(
      <PainelDaSecao
        secao={secao(TITULOS.valor, "valor")}
        processoId={PROCESSO}
        rascunho={memoria}
        setRascunho={setRascunho}
        gerando={false}
        onGerarComIa={vi.fn()}
      />,
    )

    // A escolha não vive na memória da aba: ela é a linha do texto que a seção
    // guarda, e é de lá que volta ao trocar de seção ou recarregar (§70).
    // O nome acessível do dropdown é o rótulo do campo; o que mostra a escolha
    // é o texto dentro dele — junto do fundamento, que é como a lista o exibe.
    const campo = await screen.findByRole("button", { name: "Fonte de pesquisa de preços" })
    expect(campo).toHaveTextContent("Base nacional de notas fiscais eletrônicas")
    expect(campo).toHaveTextContent("Art. 23, § 1º, V, Lei 14.133/21")
  })

  it("fonte fora da lista volta no campo livre, e não some", async () => {
    comDfds([dfd("DFD 003/2026", "Secretaria de Educação", [papel])])
    renderizar(
      <PainelDaSecao
        secao={secao(TITULOS.valor, "valor")}
        processoId={PROCESSO}
        rascunho="Fonte de pesquisa de preços: Cotação do consórcio intermunicipal."
        setRascunho={vi.fn()}
        gerando={false}
        onGerarComIa={vi.fn()}
      />,
    )

    // Contratação municipal tem exceção; recusá-la seria transformar orientação
    // em obstáculo.
    expect(await screen.findByDisplayValue("Cotação do consórcio intermunicipal")).toBeInTheDocument()
  })

  it("sem item nenhum, não oferece uma estimativa que não existe", async () => {
    comDfds([])
    renderizarPainel("valor")

    expect(await screen.findByText(/Nenhum item informado nos DFDs/)).toBeInTheDocument()
  })
})

describe("painel da necessidade", () => {
  const papel = {
    description: "Papel A4",
    unit: "RESMA",
    quantity: 100,
    specification: null,
    unitPrice: null,
  }

  it("escreve o rascunho com o objeto, as secretarias e os itens", async () => {
    comDfds([dfd("DFD 003/2026", "Secretaria de Educação", [papel])])
    const { setRascunho } = renderizarPainel("necessidade")

    await userEvent.click(await screen.findByRole("button", { name: /Escrever o rascunho/ }))

    const texto = setRascunho.mock.calls[0]?.[0] as string
    expect(texto).toContain("Secretaria de Educação")
    expect(texto).toContain("Papel A4")
    // O problema é juízo de quem conduz o processo, e fica marcado como tal:
    // escrevê-lo por inferência seria a plataforma assinando no lugar dela.
    expect(texto).toContain("[Descrever o problema")
  })

  it("sem DFD registrado, não oferece um rascunho que não teria base", async () => {
    comDfds([])
    renderizarPainel("necessidade")

    await screen.findByLabelText(/Descrição da Necessidade/)
    expect(screen.queryByRole("button", { name: /rascunho/ })).not.toBeInTheDocument()
  })
})

describe("rascunho e IA convivem", () => {
  const papel = {
    description: "Papel A4",
    unit: "RESMA",
    quantity: 100,
    specification: null,
    unitPrice: 25,
  }

  it("os dois botões ficam lado a lado, e o da IA não some depois do rascunho", async () => {
    comDfds([dfd("DFD 003/2026", "Secretaria de Educação", [papel])])
    renderizarPainel("necessidade")

    // Um rascunho não substitui a IA: um serve a quem não usa o modelo, o
    // outro a quem usa — e o modelo parte do que já está escrito.
    await screen.findByRole("button", { name: /Escrever o rascunho/ })
    expect(screen.getByRole("button", { name: /Gerar com IA/ })).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /Escrever o rascunho/ }))
    expect(screen.getByRole("button", { name: /Gerar com IA/ })).toBeInTheDocument()
  })

  it("o painel de valor também oferece os dois", async () => {
    comDfds([dfd("DFD 003/2026", "Secretaria de Educação", [papel])])
    renderizarPainel("valor")

    await userEvent.click(await screen.findByRole("button", { name: /Fonte de pesquisa de preços/ }))
    await userEvent.click(await screen.findByRole("option", { name: /Painel de Preços/ }))

    expect(screen.getByRole("button", { name: /a partir dos itens/ })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Gerar com IA/ })).toBeInTheDocument()
  })
})

/**
 * O painel acompanha a matéria da seção, e não o documento.
 *
 * <p>O TR estima o valor pelos mesmos preços unitários do inciso VI do ETP, e a
 * Cotação apura o preço de referência com a mesma memória de cálculo. Enquanto
 * o painel existia só no ETP, essas seções obrigavam a redigitar à mão número
 * que a plataforma já tinha — e número digitado duas vezes diverge.
 */
describe("o mesmo painel em outros documentos", () => {
  const papel = {
    description: "Papel A4",
    unit: "RESMA",
    quantity: 100,
    specification: null,
    unitPrice: 25,
  }

  const secaoDe = (tipo: "TR", titulo: string) => {
    const encontrada = secoesPorTipoBase[tipo].find((s) => s.titulo === titulo)
    if (!encontrada) throw new Error(`${tipo} não tem a seção ${titulo}`)
    return encontrada
  }

  it.each([
    ["TR" as const, "Estimativa do Valor da Contratação", "Art. 6º, XXIII, 'i', Lei 14.133/21"],
  ])("%s: o valor sai dos itens do processo, com a fonte da lei", async (tipo, titulo, fundamento) => {
    comDfds([dfd("DFD 003/2026", "Secretaria de Educação", [papel])])
    const alvo = secaoDe(tipo, titulo)
    expect(alvo.painel).toBe("valor")
    expect(alvo.fundamentoLegal).toBe(fundamento)

    renderizar(
      <PainelDaSecao
        secao={alvo}
        processoId={PROCESSO}
        rascunho=""
        setRascunho={vi.fn()}
        gerando={false}
        onGerarComIa={vi.fn()}
      />,
    )

    // O painel se rotula pela seção que o hospeda: no TR e na Cotação ele não
    // pode anunciar o inciso do ETP.
    expect(await screen.findByText(titulo)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Fonte de pesquisa de preços" }),
    ).toBeInTheDocument()
  })

  it("o TR define o objeto com as quantidades consolidadas dos DFDs", async () => {
    comDfds([dfd("DFD 003/2026", "Secretaria de Educação", [papel])])
    const alvo = secaoDe("TR", "Definição do Objeto")
    expect(alvo.painel).toBe("quantidades")

    renderizar(
      <PainelDaSecao
        secao={alvo}
        processoId={PROCESSO}
        rascunho=""
        setRascunho={vi.fn()}
        gerando={false}
        onGerarComIa={vi.fn()}
      />,
    )

    expect(await screen.findByText("Definição do Objeto")).toBeInTheDocument()
  })
})
