import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import {
  ApoioDaMinuta,
  EscolhaDoModelo,
  TextosDeOutroModelo,
  TrocaDeModelo,
} from "@/components/documentos/modelo-do-documento"
import { documentoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"
import type { ModeloDeEstrutura, SecaoDocumento } from "@/lib/types"

const PROCESSO = documentoApi.processId

const modelo = (codigo: string, titulo: string, atual = false): ModeloDeEstrutura => ({
  codigo,
  versao: "2026-04",
  titulo,
  descricao: "Para o caso.",
  publicadoEm: "abr/2026",
  quantidadeDeSecoes: 13,
  atual,
})

const PC = modelo("AGU-EDITAL-PC", "Minuta AGU — Pregão e Concorrência")
const TP = modelo("AGU-EDITAL-TP", "Minuta AGU — Técnica e Preço")

/** Grava o código pedido na troca e devolve o documento. */
function comTroca() {
  const pedidos: unknown[] = []
  servidor.use(
    http.put(`${urlDaApi}/procurement-processes/:id/documents/:tipo/structure-model`, async ({ request }) => {
      pedidos.push(await request.json())
      return HttpResponse.json({ ...documentoApi, documentType: "EDITAL" })
    }),
    http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/structure-model/preview`, () =>
      HttpResponse.json({
        kept: ["Do Objeto", "Da Habilitação"],
        merged: ["Da Participação"],
        blank: ["Dos Recursos"],
        unplaced: ["Da Formação do Cadastro de Reserva"],
      }),
    ),
  )
  return pedidos
}

/**
 * A minuta da AGU como estrutura do documento (§85): escolher, trocar com a
 * prévia, usar o texto da minuta e recuperar o que ficou de outro modelo.
 */
describe("escolha da minuta", () => {
  it("nada vem escolhido, e o botão diz o que falta", async () => {
    const pedidos = comTroca()
    renderizar(<EscolhaDoModelo processoId={PROCESSO} tipo="Edital" modelos={[PC, TP]} />)

    const usar = screen.getByRole("button", { name: "Usar Esta Minuta" })
    expect(usar).toBeDisabled()
    expect(usar).toHaveAccessibleDescription("Escolha uma minuta.")

    await userEvent.click(screen.getByRole("button", { name: /Técnica e Preço/ }))
    await userEvent.click(usar)

    await waitFor(() => expect(pedidos).toEqual([{ code: "AGU-EDITAL-TP" }]))
  })
})

describe("troca de minuta", () => {
  it("mostra a prévia do texto e avisa que a próxima geração é retificação", async () => {
    const pedidos = comTroca()
    const onFechar = vi.fn()
    renderizar(
      <TrocaDeModelo
        processoId={PROCESSO}
        tipo="Edital"
        modelos={[{ ...PC, atual: true }, TP]}
        versaoGerada={1}
        onFechar={onFechar}
      />,
    )

    // Com uma só outra opção, ela já vem escolhida e a prévia aparece.
    expect(await screen.findByText(/seções recebem o texto/)).toHaveTextContent(
      "2 seções recebem o texto · 1 reúnem textos · 1 ficam em branco",
    )
    expect(screen.getByText(/Da Formação do Cadastro de Reserva/)).toBeInTheDocument()
    expect(screen.getByText(/A versão 1 já foi gerada/)).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Trocar Modelo" }))

    await waitFor(() => expect(onFechar).toHaveBeenCalled())
    expect(pedidos).toEqual([{ code: "AGU-EDITAL-TP" }])
  })

  it("voltar à minuta anterior diz quantas seções voltam com o texto que já tinham", async () => {
    comTroca()
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/structure-model/preview`, () =>
        HttpResponse.json({ kept: [], merged: [], blank: ["Dos Recursos"], unplaced: [], restored: ["Do Objeto", "Da Habilitação"] }),
      ),
    )
    renderizar(
      <TrocaDeModelo processoId={PROCESSO} tipo="Edital" modelos={[{ ...PC, atual: true }, TP]} versaoGerada={0} onFechar={() => {}} />,
    )

    expect(await screen.findByText(/seções recebem o texto/)).toHaveTextContent(
      "0 seções recebem o texto · 0 reúnem textos · 1 ficam em branco · 2 voltam com o texto que já tinham",
    )
    expect(screen.queryByText(/Sem lugar/)).not.toBeInTheDocument()
  })

  it("com várias opções, pede a escolha; Esc fecha", async () => {
    comTroca()
    const onFechar = vi.fn()
    renderizar(
      <TrocaDeModelo
        processoId={PROCESSO}
        tipo="Edital"
        modelos={[PC, TP]}
        versaoGerada={0}
        onFechar={onFechar}
      />,
    )

    const trocar = screen.getByRole("button", { name: "Trocar Modelo" })
    expect(trocar).toBeDisabled()
    expect(trocar).toHaveAccessibleDescription(/Escolha a minuta/)
    expect(screen.queryByText(/já foi gerada/)).not.toBeInTheDocument()

    await userEvent.keyboard("{Escape}")
    expect(onFechar).toHaveBeenCalled()
  })

  it("prévia indisponível é dita, e a troca não é oferecida", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/structure-model/preview`, () =>
        HttpResponse.json({ detail: "falhou" }, { status: 500 }),
      ),
    )
    renderizar(
      <TrocaDeModelo processoId={PROCESSO} tipo="Edital" modelos={[{ ...PC, atual: true }, TP]} versaoGerada={0} onFechar={vi.fn()} />,
    )

    expect(await screen.findByText(/Não foi possível conferir/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Trocar Modelo" })).toBeDisabled()
  })
})

describe("texto e notas da minuta", () => {
  const secao: SecaoDocumento = {
    id: "PC00",
    titulo: "Preâmbulo",
    status: "Não iniciado",
    obrigatoria: true,
    conteudo: "",
    origem: "catalogo",
    textoDaMinuta: "Torna-se público que...",
    notasDaMinuta: ["Nota explicativa: adapte ao órgão."],
  }

  it("seção em branco recebe o texto da minuta direto", async () => {
    const setRascunho = vi.fn()
    renderizar(<ApoioDaMinuta secao={secao} rascunho="" setRascunho={setRascunho} />)

    await userEvent.click(screen.getByRole("button", { name: "Usar o Texto da Minuta" }))

    expect(setRascunho).toHaveBeenCalledWith("Torna-se público que...")
    expect(screen.getByText("Notas da AGU (1)")).toBeInTheDocument()
  })

  it("com texto escrito, substituir pede confirmação", async () => {
    const setRascunho = vi.fn()
    renderizar(<ApoioDaMinuta secao={secao} rascunho="Meu texto." setRascunho={setRascunho} />)

    await userEvent.click(screen.getByRole("button", { name: "Usar o Texto da Minuta" }))
    await userEvent.click(screen.getByRole("button", { name: "Manter o Atual" }))
    expect(setRascunho).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: "Usar o Texto da Minuta" }))
    await userEvent.click(screen.getByRole("button", { name: "Substituir" }))
    expect(setRascunho).toHaveBeenCalledWith("Torna-se público que...")
  })

  it("seção sem texto nem notas da minuta não mostra nada", () => {
    const { container } = renderizar(
      <ApoioDaMinuta secao={{ ...secao, textoDaMinuta: undefined, notasDaMinuta: [] }} rascunho="" setRascunho={vi.fn()} />,
    )
    expect(container).toBeEmptyDOMElement()

    renderizar(<ApoioDaMinuta secao={{ ...secao, textoDaMinuta: undefined }} rascunho="" setRascunho={vi.fn()} />)
    expect(screen.queryByRole("button", { name: "Usar o Texto da Minuta" })).not.toBeInTheDocument()
    expect(screen.getByText("Notas da AGU (1)")).toBeInTheDocument()
  })
})

describe("textos de outro modelo", () => {
  it("lista o que ficou guardado e insere na seção aberta", async () => {
    const onInserir = vi.fn()
    renderizar(
      <TextosDeOutroModelo
        textos={[{ secao: "12", titulo: "Da Dotação Orçamentária", texto: "02.01.33." }]}
        onInserir={onInserir}
      />,
    )

    expect(screen.getByText("Textos de Outro Modelo (1)")).toBeInTheDocument()
    await userEvent.click(screen.getByText("Textos de Outro Modelo (1)"))
    await userEvent.click(screen.getByRole("button", { name: "Inserir nesta Seção" }))

    expect(onInserir).toHaveBeenCalledWith("02.01.33.")
  })

  it("sem seção aberta, o texto é só para leitura, com título próprio", () => {
    renderizar(
      <TextosDeOutroModelo
        titulo="Textos Sem Seção Correspondente"
        textos={[{ secao: "14", titulo: "Da Matriz de Riscos", texto: "Riscos." }]}
      />,
    )

    expect(screen.getByText("Textos Sem Seção Correspondente (1)")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Inserir nesta Seção" })).not.toBeInTheDocument()
  })

  it("sem texto guardado, não aparece", () => {
    const { container } = renderizar(<TextosDeOutroModelo textos={[]} onInserir={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })
})
