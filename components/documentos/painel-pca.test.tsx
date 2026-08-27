import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

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

function painel() {
  return <PainelPca secao={SECAO} processoId={PROCESSO} tipo="ETP" />
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

    const citar = await screen.findByRole("button", { name: "Citar na seção" })
    expect(citar).toBeDisabled()
    // Botão travado sem dizer o que falta é o guarda-corpo nº 7: quem chega
    // pelo teclado ouviria "desabilitado" e não descobriria a saída.
    expect(citar).toHaveAttribute("aria-describedby")
    expect(screen.getByText(/informe o item do plano/i)).toBeInTheDocument()
    // O ano é dito: o plano que falta é o de 2026, e pode existir um de outro
    // exercício — que não demonstra a previsão desta contratação.
    expect(screen.getByText(/Nenhum PCA de 2026 anexado a este órgão/)).toBeInTheDocument()
  })

  it("o que o servidor informou não se confunde com o que a plataforma encontrou", async () => {
    responder(
      verificacao({
        declaredNote: "Conferido no portal do município.",
        findings: [
          { demand: "Cimento CP-II 50 kg", foreseen: true, kind: "DECLARED", code: "2026-0731" },
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

    await waitFor(() => expect(enviado).toEqual({ itemCode: "2026-0731", note: null }))
  })

  it("a citação aparece para leitura antes de ir para o documento", async () => {
    responder(verificacao())
    let citou = false
    servidor.use(
      http.post(`${urlDaApi}/procurement-processes/${PROCESSO}/pca/citation`, () => {
        citou = true
        return HttpResponse.json(verificacao())
      }),
    )
    renderizar(painel())

    // É texto que entra em processo administrativo: quem assina lê antes.
    expect(
      await screen.findByText(/A presente contratação está prevista no Plano/),
    ).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Citar na seção" }))
    await waitFor(() => expect(citou).toBe(true))
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
})
