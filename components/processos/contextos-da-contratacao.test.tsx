import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { ContextosDaContratacao } from "@/components/processos/contextos-da-contratacao"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Os contextos da contratação como campo da capa (ADR-061 do back-end):
 * compacto, nada sugerido nem marcado de antemão, e editado só em "Editar
 * Dados", que grava a capa inteira.
 */
const toast = vi.fn()
vi.mock("@/components/shared/providers", () => ({ useToast: () => toast }))

const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"
const ROTA = `${urlDaApi}/procurement-processes/:id/contracting-contexts`

function contexto(code: string, title: string, extra: Record<string, unknown> = {}) {
  return {
    code,
    title,
    description: `Descrição de ${title}.`,
    confirmed: false,
    confirmedAt: null,
    topics: [
      { code: `${code}_T`, documentType: "ETP", anchorSectionCode: "3", title: `Tópico de ${title}`, legalBasis: "Art. 1º" },
    ],
    ...extra,
  }
}

const catalogo = (contextos: unknown[]) => ({ catalogVersion: "2026-11", contexts: contextos })
const MOTORISTA = contexto("CONDUTOR_DE_VEICULO", "Motorista")
const LOCACAO = contexto("LOCACAO_DE_BENS", "Locação de Bens")
const VEICULOS = contexto("FROTA_DE_VEICULOS", "Veículos", { confirmed: true, confirmedAt: "2026-11-05T12:00:00Z" })

function exibir(editando = false, marcados: string[] = [], onAlternar = vi.fn()) {
  renderizar(
    <dl>
      <ContextosDaContratacao processoId={PROCESSO} editando={editando} marcados={marcados} onAlternar={onAlternar} />
    </dl>,
  )
  return onAlternar
}

beforeEach(() => toast.mockReset())

describe("contextos da contratação na capa", () => {
  it("mostra os declarados em etiqueta, sem sugestão nem botão próprio, com o que acrescenta na dica", async () => {
    servidor.use(http.get(ROTA, () => HttpResponse.json(catalogo([MOTORISTA, LOCACAO, VEICULOS]))))
    exibir()

    expect(await screen.findByText("Veículos")).toBeInTheDocument()
    expect(screen.queryByText("Motorista")).not.toBeInTheDocument()
    expect(screen.queryByText(/Sugerid/)).not.toBeInTheDocument()
    expect(screen.getByText("Veículos").closest("[title]")).toHaveAttribute(
      "title",
      expect.stringContaining("Acrescenta: Tópico de Veículos."),
    )
    // Editar é da capa inteira: o campo não tem lápis, Salvar nem pílulas.
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument()
  })

  it("sem declarado, diz Nenhum informado, como a natureza do objeto", async () => {
    servidor.use(http.get(ROTA, () => HttpResponse.json(catalogo([MOTORISTA, LOCACAO]))))
    exibir()

    expect(await screen.findByText("Nenhum informado")).toBeInTheDocument()
  })

  it("na edição da capa vira pílulas com a escolha em edição, e clicar avisa a capa", async () => {
    servidor.use(http.get(ROTA, () => HttpResponse.json(catalogo([MOTORISTA, LOCACAO, VEICULOS]))))
    const onAlternar = exibir(true, ["FROTA_DE_VEICULOS"])

    const motorista = await screen.findByRole("checkbox", { name: /Motorista/ })
    expect(motorista).toHaveAttribute("aria-checked", "false")
    expect(motorista).toHaveAttribute("title", "Descrição de Motorista.\nAcrescenta: Tópico de Motorista.")
    expect(screen.getByRole("checkbox", { name: /Veículos/ })).toHaveAttribute("aria-checked", "true")
    expect(screen.queryByRole("button", { name: "Salvar" })).not.toBeInTheDocument()

    await userEvent.click(motorista)
    await userEvent.click(screen.getByRole("checkbox", { name: /Veículos/ }))
    expect(onAlternar.mock.calls).toEqual([["CONDUTOR_DE_VEICULO"], ["FROTA_DE_VEICULOS"]])
  })

  it("carregando e com erro, diz em poucas palavras", async () => {
    servidor.use(http.get(ROTA, () => HttpResponse.json({ detail: "falhou" }, { status: 500 })))
    exibir()

    expect(screen.getByText("Carregando...")).toBeInTheDocument()
    expect(await screen.findByText("Não foi possível carregar.")).toBeInTheDocument()
  })
})
