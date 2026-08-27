import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { PainelPca } from "@/components/documentos/painel-pca"
import { documentoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"
import type { SecaoDocumento } from "@/lib/types"

/**
 * O painel do inciso II — Art. 18, § 1º, II, Lei 14.133/21.
 *
 * Duas coisas o teste guarda: item fora do plano **não trava**, e "encontrado
 * pela plataforma" nunca aparece com a mesma cara de "informado por você".
 */
const PROCESSO = documentoApi.processId

const SECAO: SecaoDocumento = {
  id: "2",
  titulo: "Demonstração da Previsão no PCA",
  status: "Não iniciado",
  obrigatoria: false,
  origem: "catalogo",
  conteudo: "",
  hint: "Demonstre que a contratação está prevista no PCA vigente.",
  painel: "pca",
}

const PLANO = {
  year: 2026,
  sourceFileName: "pca-2026.csv",
  importedAt: "2026-08-22T12:00:00-03:00",
  indexedItems: 247,
}

function verificacao(sobrescrever: Record<string, unknown> = {}) {
  return {
    plan: PLANO,
    exerciseYear: 2026,
    foreseen: true,
    citable: true,
    citation: "A presente contratação está prevista no Plano de Contratações Anual de 2026.",
    findings: [
      {
        demand: "Papel A4 75 g/m2",
        foreseen: true,
        kind: "TERMS",
        code: "2026-0142",
        description: "Papel A4 75 g/m2, resma com 500 folhas",
        unit: "RESMA",
        quantity: 1200,
        estimatedValue: 28800,
      },
    ],
    ...sobrescrever,
  }
}

function responder(corpo: Record<string, unknown>) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/${PROCESSO}/pca`, () => HttpResponse.json(corpo)),
  )
}

const setRascunho = vi.fn()
const gerar = vi.fn()

function painel(rascunho = "") {
  setRascunho.mockClear()
  return (
    <PainelPca
      secao={SECAO}
      processoId={PROCESSO}
      rascunho={rascunho}
      setRascunho={setRascunho}
      gerando={false}
      onGerarComIa={gerar}
    />
  )
}

describe("painel de previsão no PCA", () => {
  it("mostra o item encontrado com código, quantidade e valor", async () => {
    responder(verificacao())
    renderizar(painel())

    expect(await screen.findByText(/2026-0142/)).toBeInTheDocument()
    expect(screen.getByText(/1200 RESMA/)).toBeInTheDocument()
    expect(screen.getByText(/PCA 2026/)).toBeInTheDocument()
    expect(screen.getByText(/247 itens indexados/)).toBeInTheDocument()
  })

  it("item fora do plano orienta e não trava", async () => {
    responder(
      verificacao({
        foreseen: false,
        findings: [
          ...verificacao().findings,
          { demand: "Cimento CP-II 50 kg", foreseen: false },
        ],
      }),
    )
    renderizar(painel())

    expect(await screen.findByText(/Um item não consta do plano/)).toBeInTheDocument()
    expect(screen.getByText(/não vai travar aqui/)).toBeInTheDocument()
    // Continua citável: o texto sai com a justificativa entre colchetes, e é
    // travar que transformaria orientação em obstáculo.
    expect(screen.getByRole("button", { name: "Citar na seção" })).toBeEnabled()
    // E o campo da seção está aberto: escrever à mão é sempre possível.
    expect(screen.getByLabelText(/O que vai para a seção/)).toBeInTheDocument()
  })

  it("sem nada encontrado, o botão de citar diz o que falta", async () => {
    responder(
      verificacao({
        plan: null,
        foreseen: false,
        citable: false,
        citation: undefined,
        findings: [{ demand: "Cimento CP-II 50 kg", foreseen: false }],
      }),
    )
    renderizar(painel())

    // Sem parágrafo a oferecer não há botão de citar — e a tela diz o caminho:
    // informar o item, ou escrever a justificativa no campo, que está aberto.
    await screen.findByLabelText(/O que vai para a seção/)
    expect(screen.queryByRole("button", { name: /Citar na seção/ })).not.toBeInTheDocument()
    expect(screen.getByText(/informe o item na linha da demanda/i)).toBeInTheDocument()
    // O ano é dito: o plano que falta é o de 2026, e pode existir um de outro
    // exercício — que não demonstra a previsão desta contratação.
    expect(screen.getByText(/Nenhum PCA de 2026 anexado a este órgão/)).toBeInTheDocument()
  })

  it("o que o servidor informou não se confunde com o que a plataforma encontrou", async () => {
    responder(
      verificacao({
        findings: [
          {
            demand: "Cimento CP-II 50 kg",
            foreseen: true,
            kind: "DECLARED",
            code: "2026-0731",
            // A nota é do item: era uma por processo, e a tela a mostrava
            // colada em todos (ADR-038).
            declaredNote: "Conferido no portal do município.",
          },
        ],
      }),
    )
    renderizar(painel())

    expect(await screen.findByText("Informado por você")).toBeInTheDocument()
    expect(screen.getByText(/A plataforma não conferiu este item/)).toBeInTheDocument()
    expect(screen.getByText(/Conferido no portal do município\./)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Corrigir o item informado" }),
    ).toBeInTheDocument()
  })

  it("marcar exige o item do plano — “está no PCA” sem dizer onde não demonstra nada", async () => {
    responder(
      verificacao({
        plan: null,
        foreseen: false,
        citable: false,
        citation: undefined,
        findings: [{ demand: "Cimento CP-II 50 kg", foreseen: false }],
      }),
    )
    let enviado: Record<string, unknown> | undefined
    servidor.use(
      http.post(
        `${urlDaApi}/procurement-processes/${PROCESSO}/pca/declaration`,
        async ({ request }) => {
          enviado = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(verificacao())
        },
      ),
    )
    renderizar(painel())

    await userEvent.click(await screen.findByRole("button", { name: "Informar o item do PCA" }))
    const registrar = screen.getByRole("button", { name: "Registrar item informado" })
    expect(registrar).toBeDisabled()
    expect(screen.getByText(/sem dizer onde não demonstra a previsão/)).toBeInTheDocument()

    await userEvent.type(screen.getByLabelText(/Item do PCA/), "2026-0731")
    await userEvent.click(screen.getByRole("button", { name: "Registrar item informado" }))

    // A demanda vai junto: a declaração é dela, e não do processo inteiro.
    await waitFor(() =>
      expect(enviado).toEqual({
        demand: "Cimento CP-II 50 kg",
        itemCode: "2026-0731",
        note: null,
      }),
    )
  })

  it("citar preenche o rascunho da seção, e não grava por conta própria", async () => {
    responder(verificacao())
    renderizar(painel())

    await userEvent.click(await screen.findByRole("button", { name: "Citar na seção" }))

    // A citação é facilitador de rascunho: quem assina revisa, ajusta e grava.
    // Escrevê-la direto no documento era texto de processo administrativo
    // entrando sem ninguém ler (ADR-039).
    expect(setRascunho).toHaveBeenCalledWith(
      expect.stringContaining("A presente contratação está prevista no Plano"),
    )
  })

  it("com a seção já escrita, o botão oferece refazer — e a IA continua ali", async () => {
    responder(verificacao())
    renderizar(painel("Texto que o servidor escreveu."))

    expect(await screen.findByRole("button", { name: "Refazer a citação" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Gerar com IA/ })).toBeInTheDocument()
  })

  it("consulta indisponível não impede escrever a seção à mão", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/${PROCESSO}/pca`, () =>
        HttpResponse.json({ detail: "falha" }, { status: 500 }),
      ),
    )
    renderizar(painel())

    expect(await screen.findByText(/escrever a seção mesmo assim/)).toBeInTheDocument()
  })

  it("cada item tem a sua declaração — informar um não marca o outro", async () => {
    responder(
      verificacao({
        plan: null,
        foreseen: false,
        citable: false,
        citation: undefined,
        findings: [
          { demand: "Cimento CP-II 50 kg", foreseen: false },
          { demand: "Areia lavada", foreseen: false },
        ],
      }),
    )
    let enviado: Record<string, unknown> | undefined
    servidor.use(
      http.post(
        `${urlDaApi}/procurement-processes/${PROCESSO}/pca/declaration`,
        async ({ request }) => {
          enviado = (await request.json()) as Record<string, unknown>
          return HttpResponse.json(verificacao())
        },
      ),
    )
    renderizar(painel())

    // Havia um formulário só para o processo inteiro: com dois itens fora do
    // plano, informar um código marcava os dois com o mesmo item (ADR-038).
    const acoes = await screen.findAllByRole("button", { name: "Informar o item do PCA" })
    expect(acoes).toHaveLength(2)

    await userEvent.click(acoes[1]!)
    await userEvent.type(screen.getByLabelText(/Item do PCA/), "2026-0999")
    await userEvent.click(screen.getByRole("button", { name: "Registrar item informado" }))

    await waitFor(() => expect(enviado?.demand).toBe("Areia lavada"))
  })

  it("item já encontrado oferece corrigir, e não informar do zero", async () => {
    responder(
      verificacao({
        findings: [
          { demand: "Papel A4", foreseen: true, kind: "TERMS", code: "2026-0142" },
        ],
      }),
    )
    renderizar(painel())

    // A ação continua existindo: a busca pode ter apontado o item errado, e
    // corrigir é diferente de informar o que ela não achou.
    expect(
      await screen.findByRole("button", { name: "Informar outro item do plano" }),
    ).toBeInTheDocument()
  })
})
