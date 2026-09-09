import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { TrilhaDoProcesso } from "@/components/processos/trilha-do-processo"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * A trilha do processo.
 *
 * Antes do 12.1 ela era um campo de fixture que nenhuma tela mostrava, e o que
 * a interface registrava vivia na memória da aba. Agora vem do servidor, e o
 * que estes testes cobram é o que isso implica: a trilha mostra **o que foi
 * registrado**, e admite o que não foi (ADR-024).
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"

function comTrilha(eventos: Array<Record<string, unknown>>) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/trail`, () => HttpResponse.json(eventos)),
  )
}

describe("trilha do processo", () => {
  it("mostra quem agiu, quando e por quê", async () => {
    comTrilha([
      {
        event: "PROCUREMENT_PROCESS_CLOSED",
        occurredAt: "2026-08-25T14:30:00-03:00",
        actorName: "Maria Costa Andrade",
        reason: "Contratação cancelada pela secretaria.",
      },
    ])
    renderizar(<TrilhaDoProcesso processoId={PROCESSO} />)

    expect(await screen.findByText("Encerramento")).toBeInTheDocument()
    expect(screen.getByText("Maria Costa Andrade")).toBeInTheDocument()
    expect(screen.getByText("Contratação cancelada pela secretaria.")).toBeInTheDocument()
  })

  it("a edição aparece com o rótulo dela, e não como troca de modalidade", async () => {
    comTrilha([
      {
        event: "PROCUREMENT_PROCESS_UPDATED",
        occurredAt: "2026-08-25T14:00:00-03:00",
        actorName: "Maria Costa Andrade",
        reason: "Modalidade alterada de Pregão Eletrônico para Dispensa Art. 75.",
      },
    ])
    renderizar(<TrilhaDoProcesso processoId={PROCESSO} />)

    // O servidor grava edição; deduzir "troca de modalidade" a partir do texto
    // do motivo seria reconstruir o passado por adivinhação.
    expect(await screen.findByText("Edição de Dados")).toBeInTheDocument()
  })

  it("evento sem autor registrado admite a lacuna em vez de inventar alguém", async () => {
    comTrilha([
      {
        event: "PROCUREMENT_PROCESS_CREATED",
        occurredAt: "2026-08-20T10:00:00-03:00",
        actorName: null,
        reason: null,
      },
    ])
    renderizar(<TrilhaDoProcesso processoId={PROCESSO} />)

    // Eventos anteriores à gravação do nome. Atribuir a ação a alguém para não
    // deixar o campo vazio seria pior que a lacuna.
    expect(await screen.findByText("Autor não registrado")).toBeInTheDocument()
  })

  it("ação que a tela não conhece não vira linha em branco", async () => {
    comTrilha([
      { event: "ALGO_QUE_AINDA_NAO_EXISTE", occurredAt: "2026-08-20T10:00:00-03:00" },
      {
        event: "PROCUREMENT_PROCESS_CREATED",
        occurredAt: "2026-08-20T09:00:00-03:00",
        actorName: "Maria Costa Andrade",
      },
    ])
    renderizar(<TrilhaDoProcesso processoId={PROCESSO} />)

    await screen.findByText("Criação do Processo")
    // Uma ação nova no servidor não pode produzir um item sem rótulo na tela.
    expect(screen.getAllByRole("listitem")).toHaveLength(1)
  })

  it("fechada, mostra só o evento mais recente e diz quantos ficaram guardados", async () => {
    comTrilha([
      { event: "PROCUREMENT_PROCESS_CLOSED", occurredAt: "2026-08-25T14:30:00-03:00", actorName: "Maria" },
      { event: "PROCUREMENT_PROCESS_UPDATED", occurredAt: "2026-08-25T14:00:00-03:00", actorName: "Maria" },
      { event: "PROCUREMENT_PROCESS_CREATED", occurredAt: "2026-08-20T10:00:00-03:00", actorName: "Maria" },
    ])
    renderizar(<TrilhaDoProcesso processoId={PROCESSO} />)

    // A pergunta de quem abre o processo é "o que aconteceu por último"; o
    // histórico inteiro é consulta, e ocupava a tela para respondê-la.
    expect(await screen.findByText("Encerramento")).toBeInTheDocument()
    expect(screen.queryByText("Criação do Processo")).not.toBeInTheDocument()
    // O número vai no botão: ninguém precisa abrir para descobrir se há mais.
    expect(screen.getByRole("button", { name: /Ver 2 evento\(s\) anterior\(es\)/ }))
      .toBeInTheDocument()
  })

  it("abrir mostra o histórico inteiro, e fechar volta ao último", async () => {
    comTrilha([
      { event: "PROCUREMENT_PROCESS_CLOSED", occurredAt: "2026-08-25T14:30:00-03:00", actorName: "Maria" },
      { event: "PROCUREMENT_PROCESS_CREATED", occurredAt: "2026-08-20T10:00:00-03:00", actorName: "Maria" },
    ])
    renderizar(<TrilhaDoProcesso processoId={PROCESSO} />)

    await userEvent.click(await screen.findByRole("button", { name: /Ver 1 evento/ }))
    expect(screen.getByText("Criação do Processo")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: /Ocultar o histórico/ }))
    expect(screen.queryByText("Criação do Processo")).not.toBeInTheDocument()
  })

  it("clicar no cartão abre o histórico, e clicar de novo fecha", async () => {
    comTrilha([
      { event: "PROCUREMENT_PROCESS_CLOSED", occurredAt: "2026-08-25T14:30:00-03:00", actorName: "Maria" },
      { event: "PROCUREMENT_PROCESS_CREATED", occurredAt: "2026-08-20T10:00:00-03:00", actorName: "Maria" },
    ])
    const { container } = renderizar(<TrilhaDoProcesso processoId={PROCESSO} />)
    await screen.findByText("Encerramento")

    // Mirar a linha "Ver N evento(s)" era pedir precisão para uma ação que vale
    // em qualquer ponto do cartão.
    const cartao = container.firstElementChild as HTMLElement
    await userEvent.click(cartao)
    expect(screen.getByText("Criação do Processo")).toBeInTheDocument()

    await userEvent.click(cartao)
    expect(screen.queryByText("Criação do Processo")).not.toBeInTheDocument()
  })

  it("o clique no botão não conta duas vezes", async () => {
    comTrilha([
      { event: "PROCUREMENT_PROCESS_CLOSED", occurredAt: "2026-08-25T14:30:00-03:00", actorName: "Maria" },
      { event: "PROCUREMENT_PROCESS_CREATED", occurredAt: "2026-08-20T10:00:00-03:00", actorName: "Maria" },
    ])
    renderizar(<TrilhaDoProcesso processoId={PROCESSO} />)

    // O botão está dentro do cartão: sem parar a propagação, o mesmo gesto
    // abriria e fecharia a trilha.
    await userEvent.click(await screen.findByRole("button", { name: /Ver 1 evento/ }))

    expect(screen.getByText("Criação do Processo")).toBeInTheDocument()
  })

  it("com um evento só, não há o que abrir", async () => {
    comTrilha([
      { event: "PROCUREMENT_PROCESS_CREATED", occurredAt: "2026-08-20T10:00:00-03:00", actorName: "Maria" },
    ])
    renderizar(<TrilhaDoProcesso processoId={PROCESSO} />)

    await screen.findByText("Criação do Processo")
    expect(screen.queryByRole("button", { name: /evento/ })).not.toBeInTheDocument()
  })

  it("processo sem eventos diz isso", async () => {
    comTrilha([])
    renderizar(<TrilhaDoProcesso processoId={PROCESSO} />)

    expect(await screen.findByText(/Nenhum evento registrado/)).toBeInTheDocument()
  })

  it("falha de leitura não vira trilha vazia", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/trail`, () =>
        HttpResponse.json({ detail: "Erro", status: 500 }, { status: 500 }),
      ),
    )
    renderizar(<TrilhaDoProcesso processoId={PROCESSO} />)

    // "Nenhum evento" e "não consegui ler" são coisas diferentes, e confundi-las
    // faria a tela afirmar que nada aconteceu.
    expect(await screen.findByText(/Não foi possível carregar a trilha/)).toBeInTheDocument()
  })
})
