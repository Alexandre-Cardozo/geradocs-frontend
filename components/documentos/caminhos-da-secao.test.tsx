import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { CaminhosDaSecao, dadosDoProcesso, type Preenchimento } from "@/components/documentos/caminhos-da-secao"
import { OrientacaoDaIaContexto } from "@/components/documentos/orientacao-da-ia"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * O atalho da IA na seção.
 *
 * <p>Com o provedor `none`, que é o padrão e o que roda hoje, o clique devolvia
 * `503`: o servidor descobria **por erro** que o facilitador não existe. A IA é
 * facilitadora, nunca bloqueadora — o motivo vem escrito antes do clique.
 *
 * <p>O cartão "Escrever à mão" que ficava ao lado saiu: o campo de texto está
 * logo acima, aberto, e quem vai escrever já está escrevendo.
 */
function comIa(disponivel: boolean) {
  servidor.use(
    http.get(`${urlDaApi}/ai/status`, () => HttpResponse.json({ available: disponivel })),
  )
}

function renderizarCaminhos(props: Partial<Parameters<typeof CaminhosDaSecao>[0]> = {}) {
  const gerar = vi.fn()
  const { container } = renderizar(<CaminhosDaSecao gerando={false} onGerarComIa={gerar} {...props} />)
  return { gerar, container }
}

describe("caminhos da seção", () => {
  it("sem modelo configurado, o botão de IA vem desabilitado com o motivo antes do clique", async () => {
    comIa(false)
    renderizarCaminhos()

    const botao = await screen.findByRole("button", { name: /Gerar com IA/ })
    await waitFor(() => expect(botao).toBeDisabled())
    expect(screen.getByText(/Nenhum modelo de IA configurado/)).toBeInTheDocument()
    // O guarda-corpo nº 7: motivo desenhado, mas não anunciado, é motivo que só
    // existe para quem enxerga a tela.
    const descrito = botao.getAttribute("aria-describedby")
    expect(document.getElementById(descrito as string)).toHaveTextContent(
      /Nenhum modelo de IA configurado/,
    )
    expect(screen.getByText("Indisponível")).toBeInTheDocument()
  })

  it("seção maior do que a IA lê: botão desabilitado com o motivo, e o texto pequeno segue liberado (ADR 121)", async () => {
    // Homologação, 23/11/2026: a minuta da AGU de "Critérios de Medição e Pagamento" (TR de serviços) tinha
    // 36 mil caracteres, e o clique voltava "400 Existem campos inválidos".
    comIa(true)
    const { gerar } = renderizarCaminhos({ texto: "x".repeat(36_298) })

    const botao = await screen.findByRole("button", { name: /Gerar com IA/ })
    await waitFor(() =>
      expect(document.getElementById(botao.getAttribute("aria-describedby") as string)).toHaveTextContent(
        "A IA lê seções de até 20.000 caracteres, e esta tem 36.298.",
      ),
    )
    expect(botao).toBeDisabled()
    // Não é indisponibilidade da IA: o selo fica para o caso de não haver modelo.
    expect(screen.queryByText("Indisponível")).not.toBeInTheDocument()
    await userEvent.click(botao)
    expect(gerar).not.toHaveBeenCalled()
  })

  it("no limite exato, a IA ainda recebe a seção", async () => {
    comIa(true)
    renderizarCaminhos({ texto: "x".repeat(20_000) })

    await waitFor(async () => expect(await screen.findByRole("button", { name: /Gerar com IA/ })).toBeEnabled())
    expect(screen.queryByText(/A IA lê seções de até/)).not.toBeInTheDocument()
  })

  it("não há um cartão para anunciar que dá para escrever à mão", async () => {
    comIa(false)
    renderizarCaminhos()

    // O campo de texto está aberto logo acima. Um cartão com um botão que só
    // leva o cursor até ele é instrução, não caminho.
    await screen.findByRole("button", { name: /Gerar com IA/ })
    expect(screen.queryByText("Escrever à mão")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Escrever agora" })).not.toBeInTheDocument()
  })

  it("com modelo configurado, a IA fica disponível, sem título nem frase repetindo o botão (§111)", async () => {
    comIa(true)
    const { gerar } = renderizarCaminhos()

    const botao = await screen.findByRole("button", { name: /Gerar com IA/ })
    await waitFor(() => expect(botao).toBeEnabled())
    // O pedido de revisão fica na dica do botão, e não escrito no cartão.
    expect(botao).toHaveAttribute("title", expect.stringMatching(/Revise antes de salvar/))
    expect(screen.queryByText(/Revise antes de salvar/)).not.toBeInTheDocument()
    expect(screen.getAllByText("Gerar com IA")).toHaveLength(1)
    expect(screen.queryByText("Indisponível")).not.toBeInTheDocument()

    await userEvent.click(botao)

    expect(gerar).toHaveBeenCalledOnce()
  })

  it("enquanto a resposta não chega, o botão não convida ao clique que dá erro", async () => {
    comIa(true)
    renderizarCaminhos()

    // Habilitar por otimismo devolveria exatamente o 503 que este passo existe
    // para evitar.
    expect(screen.getByRole("button", { name: /Gerar com IA/ })).toBeDisabled()
    expect(screen.getByText(/Verificando a IA/)).toBeInTheDocument()
  })

  it("gerando em andamento, o botão diz isso e não aceita segundo clique", async () => {
    comIa(true)
    const { gerar } = renderizarCaminhos({ gerando: true })

    const botao = await screen.findByRole("button", { name: /Gerando com IA/ })
    await waitFor(() => expect(botao).toBeDisabled())

    await userEvent.click(botao)

    expect(gerar).not.toHaveBeenCalled()
  })

  it("gerando, o cartão ganha a borda nas cores da marca e mostra a IA trabalhando (§107)", async () => {
    comIa(true)
    const { container } = renderizarCaminhos({ gerando: true })

    const status = await screen.findByRole("status")
    expect(status).toHaveTextContent("Gerando o rascunho da seção com IA.")
    expect(status.querySelector('[data-marca="carregando"]')).not.toBeNull()
    expect(container.firstElementChild).toHaveClass("ia-aura")
    // Uma borda colorida só: a do cartão.
    expect(status).not.toHaveClass("ia-aura")
  })

  it("com a resposta chegando, o cartão diz que está escrevendo a seção (§107)", async () => {
    comIa(true)
    renderizar(
      <OrientacaoDaIaContexto.Provider value={{ texto: "", onTexto: vi.fn(), avisos: [], escrevendo: true }}>
        <CaminhosDaSecao gerando onGerarComIa={vi.fn()} />
      </OrientacaoDaIaContexto.Provider>,
    )

    expect(await screen.findByRole("status")).toHaveTextContent("Escrevendo a seção")
  })

  it("parado, o cartão volta ao normal e não há IA trabalhando", async () => {
    comIa(true)
    const { container } = renderizarCaminhos()

    await screen.findByRole("button", { name: "Gerar com IA" })
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(container.firstElementChild).not.toHaveClass("ia-aura")
  })

  describe("base do rascunho e rodapé (§112, §114)", () => {
    const fontes = {
      content: "Texto.",
      missingFacts: ["Situação-problema não informada nos DFDs."],
      warnings: [],
      evidence: [
        { source: "Processo", fact: "Número: PROC-2026-000001" },
        { source: "Processo", fact: "Objeto: Papel A4" },
      ],
      guidanceWarnings: [],
    }

    function comRascunho({
      gerando = false,
      desfazer,
      pedeConfirmacao = true,
    }: { gerando?: boolean; desfazer?: () => void; pedeConfirmacao?: boolean } = {}) {
      const descartar = vi.fn()
      renderizar(
        <OrientacaoDaIaContexto.Provider
          value={{
            texto: "",
            onTexto: vi.fn(),
            avisos: [],
            rascunhoDaIa: { fontes, onDescartar: descartar, pedeConfirmacao },
            ...(desfazer ? { desfazer: { rotulo: "IA", ia: true, onDesfazer: desfazer } } : {}),
          }}
        >
          <CaminhosDaSecao gerando={gerando} onGerarComIa={vi.fn()} />
        </OrientacaoDaIaContexto.Provider>,
      )
      return { descartar }
    }

    it("é uma linha recolhida, informativa, com o resumo do que a IA recebeu", async () => {
      comIa(true)
      comRascunho()

      expect(await screen.findByText(/2 dados de origem · 1 lacuna/)).toBeInTheDocument()
      // As listas só aparecem a pedido: não ocupam o fluxo.
      expect(screen.queryByText("Lacunas no DFD")).not.toBeInTheDocument()
      expect(screen.queryByText(/Revise o Rascunho da IA/)).not.toBeInTheDocument()

      const ver = screen.getByRole("button", { name: "Ver detalhes" })
      expect(ver).toHaveAttribute("aria-expanded", "false")
      await userEvent.click(ver)
      expect(screen.getByText(/É informativo/)).toBeInTheDocument()
      expect(screen.getByText("Lacunas no DFD")).toBeInTheDocument()
      expect(screen.getByText("Processo: Objeto: Papel A4")).toBeInTheDocument()
      expect(screen.queryByText("Fontes não integradas")).not.toBeInTheDocument()

      await userEvent.click(screen.getByRole("button", { name: "Ocultar detalhes" }))
      expect(screen.queryByText("Lacunas no DFD")).not.toBeInTheDocument()
    })

    it("logo depois da geração, a ação é Desfazer, e não Descartar", async () => {
      comIa(true)
      const desfazer = vi.fn()
      comRascunho({ desfazer })

      await userEvent.click(await screen.findByRole("button", { name: "Desfazer" }))
      expect(desfazer).toHaveBeenCalledOnce()
      expect(screen.queryByRole("button", { name: "Descartar rascunho" })).not.toBeInTheDocument()
    })

    it("rascunho editado: descartar confirma na própria linha, sem popup do navegador", async () => {
      comIa(true)
      const popup = vi.spyOn(window, "confirm")
      const { descartar } = comRascunho()

      await userEvent.click(await screen.findByRole("button", { name: "Descartar rascunho" }))
      expect(screen.getByText("Voltar ao texto salvo?")).toBeInTheDocument()
      await userEvent.click(screen.getByRole("button", { name: "Manter" }))
      expect(descartar).not.toHaveBeenCalled()

      await userEvent.click(screen.getByRole("button", { name: "Descartar rascunho" }))
      await userEvent.click(screen.getByRole("button", { name: "Descartar" }))
      expect(descartar).toHaveBeenCalledOnce()
      expect(popup).not.toHaveBeenCalled()
    })

    it("sem alteração a perder, descartar vai direto", async () => {
      comIa(true)
      const { descartar } = comRascunho({ pedeConfirmacao: false })
      await userEvent.click(await screen.findByRole("button", { name: "Descartar rascunho" }))
      expect(descartar).toHaveBeenCalledOnce()
      expect(screen.queryByText("Voltar ao texto salvo?")).not.toBeInTheDocument()
    })

    it("as fontes não integradas entram no resumo e nos detalhes, no singular ou no plural", async () => {
      comIa(true)
      renderizar(
        <OrientacaoDaIaContexto.Provider
          value={{
            texto: "",
            onTexto: vi.fn(),
            avisos: [],
            rascunhoDaIa: {
              fontes: { ...fontes, missingFacts: [], warnings: ["PCA não integrado."], evidence: [fontes.evidence[0]!] },
              onDescartar: vi.fn(),
              pedeConfirmacao: false,
            },
          }}
        >
          <CaminhosDaSecao gerando={false} onGerarComIa={vi.fn()} />
        </OrientacaoDaIaContexto.Provider>,
      )

      expect(await screen.findByText(/1 dado de origem · 1 fonte não integrada/)).toBeInTheDocument()
      await userEvent.click(screen.getByRole("button", { name: "Ver detalhes" }))
      expect(screen.getByText("Fontes não integradas")).toBeInTheDocument()
      expect(screen.queryByText("Lacunas no DFD")).not.toBeInTheDocument()
    })

    it("enquanto a IA gera de novo, a base do rascunho anterior sai de cena", async () => {
      comIa(true)
      comRascunho({ gerando: true })
      await screen.findByRole("status")
      expect(screen.queryByText(/dados de origem/)).not.toBeInTheDocument()
    })

    it("depois de um preenchimento sem IA, o rodapé diz de onde veio e oferece Desfazer", async () => {
      comIa(true)
      const desfazer = vi.fn()
      renderizar(
        <OrientacaoDaIaContexto.Provider
          value={{
            texto: "",
            onTexto: vi.fn(),
            avisos: [],
            desfazer: { rotulo: "Texto da minuta", ia: false, onDesfazer: desfazer },
          }}
        >
          <CaminhosDaSecao gerando={false} onGerarComIa={vi.fn()} />
        </OrientacaoDaIaContexto.Provider>,
      )
      expect(await screen.findByText("Preenchido com:")).toBeInTheDocument()
      expect(screen.getByText(/Texto da minuta/)).toBeInTheDocument()
      await userEvent.click(screen.getByRole("button", { name: "Desfazer" }))
      expect(desfazer).toHaveBeenCalledOnce()
    })
  })

  describe("preencher sem IA, num lugar só (§114)", () => {
    const dados = dadosDoProcesso("monta o texto a partir dos DFDs.", () => "Texto dos DFDs.")
    const minuta: Preenchimento = {
      chave: "minuta",
      rotulo: "Texto da minuta",
      botao: "Preencher com o texto da minuta",
      dica: "usa o texto padrão da minuta do documento.",
      modo: "substituir",
      texto: () => "Torna-se público que...",
    }
    const anterior: Preenchimento = {
      chave: "anterior-12",
      rotulo: "Modelo anterior: Da Dotação",
      botao: "Acrescentar o texto do modelo anterior",
      dica: "acrescenta ao fim o texto anterior.",
      modo: "acrescentar",
      texto: () => "02.01.33.",
    }

    function comOrigens(texto: string, doPainel: Preenchimento[], doEditor: Preenchimento[] = []) {
      const setTexto = vi.fn()
      const registrar = vi.fn()
      renderizar(
        <OrientacaoDaIaContexto.Provider
          value={{ texto: "", onTexto: vi.fn(), avisos: [], preenchimentos: doEditor, registrarEscrita: registrar }}
        >
          <CaminhosDaSecao
            gerando={false}
            onGerarComIa={vi.fn()}
            texto={texto}
            setTexto={setTexto}
            preenchimentos={doPainel}
          />
        </OrientacaoDaIaContexto.Provider>,
      )
      return { setTexto, registrar }
    }

    it("com uma origem, é um botão; escreve sem perguntar e avisa o editor para o Desfazer", async () => {
      comIa(true)
      const popup = vi.spyOn(window, "confirm")
      const { setTexto, registrar } = comOrigens("Texto que já estava.", [dados])

      const botao = await screen.findByRole("button", { name: "Preencher com dados do processo" })
      expect(botao).toHaveAttribute("title", "Sem IA: monta o texto a partir dos DFDs.")
      await userEvent.click(botao)
      expect(popup).not.toHaveBeenCalled()
      expect(setTexto).toHaveBeenCalledWith("Texto dos DFDs.")
      expect(registrar).toHaveBeenCalledWith({
        anterior: "Texto que já estava.",
        escrito: "Texto dos DFDs.",
        rotulo: "Dados do processo",
      })
    })

    it("a minuta, que vem do editor, também é um botão quando é a única origem", async () => {
      comIa(true)
      const { setTexto } = comOrigens("", [], [minuta])
      await userEvent.click(await screen.findByRole("button", { name: "Preencher com o texto da minuta" }))
      expect(setTexto).toHaveBeenCalledWith("Torna-se público que...")
    })

    it("com mais de uma origem, é o menu Preencher com, e o texto anterior é acrescentado ao fim", async () => {
      comIa(true)
      const { setTexto } = comOrigens("Texto atual.", [dados], [minuta, anterior])

      const menu = await screen.findByRole("button", { name: "Preencher com" })
      expect(menu).toHaveAttribute("aria-haspopup", "menu")
      expect(screen.queryByRole("button", { name: "Preencher com dados do processo" })).not.toBeInTheDocument()

      await userEvent.click(menu)
      const opcoes = screen.getAllByRole("menuitem")
      expect(opcoes.map((opcao) => opcao.textContent)).toEqual([
        "Dados do processoSubstitui o texto da seção",
        "Texto da minutaSubstitui o texto da seção",
        "Modelo anterior: Da DotaçãoAcrescenta ao fim do texto",
      ])
      // O foco entra no menu, e as setas andam entre as opções, nos dois sentidos.
      expect(opcoes[0]).toHaveFocus()
      await userEvent.keyboard("{ArrowDown}")
      expect(opcoes[1]).toHaveFocus()
      await userEvent.keyboard("{ArrowUp}{ArrowUp}")
      expect(opcoes[2]).toHaveFocus()
      await userEvent.keyboard("{Enter}")

      expect(setTexto).toHaveBeenCalledWith("Texto atual.\n02.01.33.")
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    })

    it("o menu fecha com Esc (devolvendo o foco), com o clique fora e no próprio botão", async () => {
      comIa(true)
      const { setTexto } = comOrigens("", [dados], [minuta])
      const menu = await screen.findByRole("button", { name: "Preencher com" })

      await userEvent.click(menu)
      await userEvent.keyboard("{Escape}")
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()
      expect(menu).toHaveFocus()

      await userEvent.click(menu)
      await userEvent.keyboard("a")
      expect(screen.getByRole("menu")).toBeInTheDocument()
      await userEvent.click(document.body)
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()

      await userEvent.click(menu)
      await userEvent.click(screen.getByRole("menu"))
      expect(screen.getByRole("menu")).toBeInTheDocument()
      await userEvent.click(menu)
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()
      // Acrescentar numa seção em branco é escrever o texto como veio.
      await userEvent.click(menu)
      await userEvent.click(screen.getByRole("menuitem", { name: /^Texto da minuta/ }))
      expect(setTexto).toHaveBeenCalledWith("Torna-se público que...")
      expect(menu).toHaveAttribute("aria-expanded", "false")
    })

    it("sem quem escreva na seção (fora do editor e do painel), não há preenchimento", async () => {
      comIa(true)
      renderizar(
        <OrientacaoDaIaContexto.Provider value={{ texto: "", onTexto: vi.fn(), avisos: [], preenchimentos: [minuta] }}>
          <CaminhosDaSecao gerando={false} onGerarComIa={vi.fn()} />
        </OrientacaoDaIaContexto.Provider>,
      )
      await screen.findByRole("button", { name: "Gerar com IA" })
      expect(screen.queryByRole("button", { name: /Preencher/ })).not.toBeInTheDocument()
    })

    it("acrescentar numa seção vazia escreve só o texto anterior", async () => {
      comIa(true)
      const { setTexto } = comOrigens("  ", [], [anterior])
      await userEvent.click(await screen.findByRole("button", { name: "Acrescentar o texto do modelo anterior" }))
      expect(setTexto).toHaveBeenCalledWith("02.01.33.")
    })
  })

  describe("teto de IA da entidade (ADR-064)", () => {
    function comTeto(corpo: Record<string, unknown>) {
      servidor.use(http.get(`${urlDaApi}/organizations/:id/ai-budget`, () => HttpResponse.json(corpo)))
    }

    it("com modelo e sem teto definido, o motivo vem escrito antes do clique", async () => {
      comIa(true)
      comTeto({ spentAmount: 0, defined: false, available: false })
      const { gerar } = renderizarCaminhos()

      const botao = await screen.findByRole("button", { name: /Gerar com IA/ })
      // Não é um toast que some: fica na seção, e diz a quem recorrer.
      expect(await screen.findByText(/não está liberada para esta entidade/)).toBeInTheDocument()
      expect(botao).toBeDisabled()
      expect(screen.getByText(/Fale com o administrador da plataforma/)).toBeInTheDocument()
      expect(screen.getByText("Indisponível")).toBeInTheDocument()
      expect(document.getElementById(botao.getAttribute("aria-describedby") as string)).toHaveTextContent(
        /administrador da plataforma/,
      )

      await userEvent.click(botao)
      expect(gerar).not.toHaveBeenCalled()
    })

    it("com o teto do mês consumido, o botão continua clicável: o clique abre o aviso do limite (§109)", async () => {
      comIa(true)
      comTeto({ period: "2026-11", limitAmount: 10, spentAmount: 10, remainingAmount: 0, defined: true, available: false })
      const { gerar } = renderizarCaminhos()

      const botao = await screen.findByRole("button", { name: "Gerar com IA" })
      await waitFor(() => expect(botao).toBeEnabled())
      expect(screen.queryByText("Indisponível")).not.toBeInTheDocument()
      expect(screen.queryByText(/não está liberada/)).not.toBeInTheDocument()
      await userEvent.click(botao)
      expect(gerar).toHaveBeenCalledTimes(1)
    })

    it("sem IA instalada, o motivo continua sendo a falta de modelo, e o teto nem é consultado", async () => {
      comIa(false)
      comTeto({ spentAmount: 0, defined: false, available: false })
      renderizarCaminhos()

      await waitFor(() => expect(screen.getByText(/Nenhum modelo de IA configurado/)).toBeInTheDocument())
      expect(screen.queryByText(/administrador da plataforma/)).not.toBeInTheDocument()
    })
  })
})
