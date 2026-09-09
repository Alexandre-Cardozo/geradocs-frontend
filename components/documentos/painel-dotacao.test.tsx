import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { PainelDotacao, textoDaDotacao } from "@/components/documentos/painel-dotacao"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"
import { secoesPorTipoBase } from "@/lib/documentos"
import type { DotacaoOrcamentaria } from "@/lib/api/procurement-client"

/**
 * A dotação na seção que a pede — três seções, três documentos.
 *
 * <p>O crédito é declarado uma vez no processo. Aqui se cobra que ele apareça
 * onde a lei o exige, que o total seja confrontado com o valor estimado — que é
 * o que "adequação" significa — e que o TR receba também a previsão no PCA, que
 * é a outra metade da alínea 'j'.
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

function comPca(previsto: boolean) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/pca`, () =>
      HttpResponse.json({
        plan: {
          year: 2026,
          sourceFileName: "pca-2026.csv",
          importedAt: "2026-08-22T12:00:00-03:00",
          indexedItems: 247,
        },
        exerciseYear: 2026,
        foreseen: previsto,
        citable: true,
        citation: "A contratação está prevista no PCA 2026, item 12.",
        findings: [
          {
            demand: "Papel A4",
            foreseen: previsto,
            kind: previsto ? "TERMS" : undefined,
            code: previsto ? "2026-0142" : undefined,
          },
        ],
      }),
    ),
  )
}

const secaoDe = (tipo: "TR" | "Edital" | "Contrato", titulo: string) => {
  const secao = secoesPorTipoBase[tipo].find((s) => s.titulo === titulo)
  if (!secao) throw new Error(`${tipo} não tem a seção ${titulo}`)
  return secao
}

function renderizarPainel(
  tipo: "TR" | "Edital" | "Contrato",
  titulo: string,
  setRascunho = vi.fn(),
) {
  renderizar(
    <PainelDotacao
      secao={secaoDe(tipo, titulo)}
      processoId={PROCESSO}
      rascunho=""
      setRascunho={setRascunho}
      gerando={false}
      onGerarComIa={vi.fn()}
      comPrevisaoNoPca={tipo === "TR"}
    />,
  )
  return setRascunho
}

describe("painel de dotação", () => {
  it.each([
    ["Edital" as const, "Da Dotação Orçamentária"],
    ["Contrato" as const, "Da Dotação Orçamentária"],
    ["TR" as const, "Adequação Orçamentária"],
  ])("%s: o mesmo crédito aparece na seção que o exige", async (tipo, titulo) => {
    comDotacoes([daApi])
    comPca(true)
    renderizarPainel(tipo, titulo)

    expect(await screen.findByText("12.361.0004.2.045")).toBeInTheDocument()
    expect(screen.getByText("3.3.90.30.00 — Material de Consumo")).toBeInTheDocument()
  })

  it("sem crédito declarado, a seção diz que a ausência é causa de nulidade", async () => {
    comDotacoes([])
    renderizarPainel("Edital", "Da Dotação Orçamentária")

    expect(await screen.findByText(/Art. 150 da Lei 14.133\/21/)).toBeInTheDocument()
    // Sem crédito não há rascunho a montar: o parágrafo afirma de onde sai o
    // dinheiro.
    expect(
      screen.queryByRole("button", { name: /Escrever a partir dos créditos/ }),
    ).not.toBeInTheDocument()
  })

  it("o crédito é confrontado com o valor estimado do processo", async () => {
    comDotacoes([daApi])
    renderizarPainel("Contrato", "Da Dotação Orçamentária")

    // A fixture do processo estima R$ 485.000,00, e o crédito declarado é maior.
    expect(await screen.findByText("A despesa está coberta")).toBeInTheDocument()
  })

  it("créditos insuficientes aparecem como diferença, e não em silêncio", async () => {
    comDotacoes([{ ...daApi, amount: 1000 }])
    renderizarPainel("Contrato", "Da Dotação Orçamentária")

    expect(await screen.findByText(/Faltam R\$/)).toBeInTheDocument()
  })

  it("só o TR mostra a previsão no PCA — é a outra metade da alínea 'j'", async () => {
    comDotacoes([daApi])
    comPca(true)
    renderizarPainel("TR", "Adequação Orçamentária")

    expect(await screen.findByText(/Previsão no PCA 2026/)).toBeInTheDocument()
    expect(screen.getByText("A contratação consta do plano")).toBeInTheDocument()
  })

  it("demanda sem previsão no PCA aparece como pendência da seção", async () => {
    comDotacoes([daApi])
    comPca(false)
    renderizarPainel("TR", "Adequação Orçamentária")

    expect(
      await screen.findByText("Há demanda sem previsão — justifique na seção"),
    ).toBeInTheDocument()
  })

  it("o Edital não consulta o PCA: o Art. 150 pede só o crédito", async () => {
    comDotacoes([daApi])
    renderizarPainel("Edital", "Da Dotação Orçamentária")

    await screen.findByText("12.361.0004.2.045")
    expect(screen.queryByText(/Previsão no PCA/)).not.toBeInTheDocument()
  })

  it("o rascunho sai dos créditos e cita o artigo da cláusula", async () => {
    comDotacoes([daApi])
    const setRascunho = renderizarPainel("Contrato", "Da Dotação Orçamentária")

    await userEvent.click(
      await screen.findByRole("button", { name: /Escrever a partir dos créditos/ }),
    )

    const texto = setRascunho.mock.calls[0]?.[0] as string
    expect(texto).toContain("Art. 92, VIII")
    expect(texto).toContain("12.361.0004.2.045")
  })
})

describe("o parágrafo montado dos créditos", () => {
  const credito: DotacaoOrcamentaria = {
    id: "b1",
    unidadeOrcamentaria: "02.01 — Educação",
    programaDeTrabalho: "12.361.0004.2.045",
    naturezaDaDespesa: "3.3.90.30.00",
    fonteDeRecurso: "1.500.1001",
    ficha: "1245",
    exercicio: 2026,
    valor: "850.000,00",
    declaradaEm: "2026-08-28T12:00:00Z",
  }

  it("quando os créditos não cobrem a despesa, deixa a lacuna em colchetes", () => {
    const texto = textoDaDotacao([credito], 850000, 1250000)

    // Afirmar adequação que os números não sustentam seria a plataforma
    // assinando no lugar de quem responde pelo processo.
    expect(texto).toContain("[Justificar a diferença de R$ 400.000,00")
    expect(texto).toContain("Art. 150")
    expect(texto).toContain("Ficha 1245")
  })

  it("cobertos, o parágrafo afirma a suficiência — e o TR ganha a previsão no PCA", () => {
    const semFicha = { ...credito, ficha: undefined }
    expect(textoDaDotacao([semFicha], 1250000, 1250000)).toContain(
      "suportam integralmente a despesa",
    )
    expect(textoDaDotacao([semFicha], 1250000, 1250000)).not.toContain("Ficha")

    const comPrevisao = textoDaDotacao([credito], 1250000, 1250000, "Consta do PCA 2026, item 12.")
    expect(comPrevisao).toContain("Consta do PCA 2026, item 12.")
  })
})
