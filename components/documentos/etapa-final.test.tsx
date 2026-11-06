import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { EtapaFinal } from "@/components/documentos/etapa-final"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, within } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"
import type { SecaoDocumento } from "@/lib/types"

/**
 * A etapa final do documento.
 *
 * <p>Estes blocos moravam dentro da última seção da lei — no ETP, o inciso XIII.
 * O que estes testes cobram é o que faz dela uma etapa: ela fala do documento
 * inteiro, e a geração só acontece com as indispensáveis resolvidas (§69).
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"

const secao = (
  id: string,
  obrigatoria: boolean,
  status: SecaoDocumento["status"],
  conteudo = "",
  justificativaDispensa?: string,
): SecaoDocumento => ({
  id,
  titulo: `Seção ${id}`,
  fundamentoLegal: `Art. 18, § 1º, ${id}, Lei 14.133/21`,
  hint: "",
  obrigatoria,
  origem: "catalogo",
  status,
  conteudo,
  ...(justificativaDispensa ? { justificativaDispensa } : {}),
})

function renderizarEtapa(
  secoes: SecaoDocumento[],
  jaGerado = false,
  versao: { alterado?: boolean; retificacaoExigida?: boolean } = {},
  tipo: "ETP" | "Contrato" = "ETP",
) {
  const gerar = vi.fn()
  const visualizar = vi.fn()
  renderizar(
    <EtapaFinal
      processoId={PROCESSO}
      tipo={tipo}
      secoes={secoes}
      jaGerado={jaGerado}
      versaoAtual={jaGerado ? 2 : 0}
      alteradoDesdeAVersao={versao.alterado ?? true}
      retificacaoExigida={versao.retificacaoExigida ?? false}
      pendente={false}
      onGerar={gerar}
      onVisualizar={visualizar}
    />,
  )
  return { gerar, visualizar }
}

describe("etapa final do documento", () => {
  it("com obrigatória pendente, não gera — e diz qual falta", async () => {
    renderizarEtapa([
      secao("1", true, "Completo", "Necessidade descrita."),
      secao("13", true, "Não iniciado"),
    ])

    const gerar = await screen.findByRole("button", { name: /Finalizar e Gerar/ })
    expect(gerar).toBeDisabled()
    expect(screen.getByText(/Para gerar, falta preencher/).parentElement).toHaveTextContent(
      "Para gerar, falta preencher: Seção 13.",
    )
    // Guarda-corpo nº 7: motivo desenhado e não anunciado só existe para quem
    // enxerga a tela.
    const descrito = gerar.getAttribute("aria-describedby")
    expect(document.getElementById(descrito as string)).toHaveTextContent("Faltam seções obrigatórias: Seção 13.")
  })

  it("com as indispensáveis resolvidas, gera", async () => {
    const { gerar } = renderizarEtapa([
      secao("1", true, "Completo", "Necessidade descrita."),
      secao("13", true, "Completo", "Posicionamento."),
    ])

    await userEvent.click(await screen.findByRole("button", { name: /Finalizar e Gerar/ }))

    expect(gerar).toHaveBeenCalledWith(false, {})
  })

  it("dispensável em branco sem justificativa é apontada, e não trava", async () => {
    renderizarEtapa([
      secao("1", true, "Completo", "Necessidade descrita."),
      secao("3", false, "Não iniciado"),
      secao("13", true, "Completo", "Posicionamento."),
    ])

    // Sumir sem registro é o que o Art. 18, § 2º não aceita, mas travar aqui
    // transformaria orientação em obstáculo.
    expect((await screen.findByText(/em branco e sem dispensa/)).parentElement).toHaveTextContent(
      "Ficam fora do documento, em branco e sem dispensa: Seção 3. Se não se aplicam, dispense-as com justificativa (Art. 18, § 2º).",
    )
    expect(screen.getByRole("button", { name: /Finalizar e Gerar/ })).toBeEnabled()
  })

  it("obrigatória pendente e dispensável em branco vão num aviso só, junto do botão", async () => {
    renderizarEtapa([
      secao("1", true, "Não iniciado"),
      secao("3", false, "Não iniciado"),
      { ...secao("3.1", false, "Não iniciado"), titulo: "Convenção Coletiva", origem: "servidor", secaoPai: "3" },
    ])

    const aviso = (await screen.findByText(/Para gerar, falta preencher/)).closest("ul")!
    const itens = within(aviso).getAllByRole("listitem")
    expect(itens.map((item) => item.textContent)).toEqual([
      "Para gerar, falta preencher: Seção 1.",
      "Ficam fora do documento, em branco e sem dispensa: Seção 3. Se não se aplicam, dispense-as com justificativa (Art. 18, § 2º).",
      "Acrescentadas em branco, também ficam fora: Convenção Coletiva. Preencha ou exclua.",
    ])
    // Um só: nem o aviso de cima, nem a etiqueta de opcionais omitidas.
    expect(screen.getAllByText(/Para gerar, falta preencher/)).toHaveLength(1)
    expect(screen.queryByText(/serão omitidas/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Seções obrigatórias pendentes/)).not.toBeInTheDocument()
  })

  it("a acrescentada em branco não é mandada dispensar, que o servidor recusa", async () => {
    renderizarEtapa([
      secao("1", true, "Completo", "Necessidade."),
      { ...secao("1+1", false, "Não iniciado"), titulo: "Palavrinhas", origem: "servidor" },
    ])

    expect(await screen.findByText(/Acrescentadas em branco/)).toBeInTheDocument()
    expect(screen.queryByText(/dispense-as/)).not.toBeInTheDocument()
  })

  it("fora do ETP, a dispensa não cita o Art. 18, § 2º, que é do ETP", async () => {
    renderizarEtapa(
      [secao("PC01", true, "Completo", "Objeto."), secao("PC04", false, "Não iniciado")],
      false,
      {},
      "Contrato",
    )

    expect((await screen.findByText(/em branco e sem dispensa/)).parentElement).toHaveTextContent(
      "Ficam fora do documento, em branco e sem dispensa: Seção PC04. Se não se aplicam, dispense-as com justificativa.",
    )
  })

  it("com tudo resolvido, não há aviso", async () => {
    renderizarEtapa([secao("1", true, "Completo", "Necessidade."), secao("3", false, "Completo", "", "Não se aplica.")])

    expect(await screen.findByRole("button", { name: /Finalizar e Gerar/ })).toBeEnabled()
    expect(screen.queryByText(/falta preencher|ficam fora|também ficam fora/i)).not.toBeInTheDocument()
  })

  /*
    A versão nova de um documento já gerado diz como entra no histórico. Antes,
    "Regerar" no editor não perguntava nada, e "Retificar" na capa perguntava
    tudo mas não deixava mudar o texto (§93).
  */
  it("já gerado, a versão nova não sai sem dizer se é regeração ou retificação", async () => {
    const { gerar } = renderizarEtapa([secao("1", true, "Completo", "Necessidade descrita.")], true)

    const botao = await screen.findByRole("button", { name: /Gerar v3/ })
    expect(botao).toBeDisabled()
    const descrito = botao.getAttribute("aria-describedby")
    expect(document.getElementById(descrito as string)).toHaveTextContent(/regeração ou retificação/)

    await userEvent.click(screen.getByText("Regeração"))
    await userEvent.click(screen.getByRole("button", { name: /Regerar ETP/ }))
    expect(gerar).toHaveBeenCalledWith(true, {}, undefined)
  })

  it("retificar exige a natureza e o que foi corrigido, e entrega os dois", async () => {
    const { gerar } = renderizarEtapa([secao("1", true, "Completo", "Necessidade descrita.")], true)

    await userEvent.click(await screen.findByText("Retificação: Alteração substancial"))
    // Sem dizer o quê, "alteração substancial" deixa a pergunta seguinte em aberto.
    const botao = screen.getByRole("button", { name: /Retificar e Gerar v3/ })
    expect(botao).toBeDisabled()

    await userEvent.type(screen.getByLabelText("O que está sendo retificado"), "  Prazo de entrega alterado.  ")
    await userEvent.click(botao)

    expect(gerar).toHaveBeenCalledWith(true, {}, {
      motivo: "alteracao_substancial",
      detalhe: "Prazo de entrega alterado.",
    })
  })

  it("com as seções iguais às da versão gerada, avisa que a nova sairia com o mesmo texto", async () => {
    renderizarEtapa([secao("1", true, "Completo", "Necessidade descrita.")], true, { alterado: false })

    expect(await screen.findByText(/Sem edições desde a v2/)).toBeInTheDocument()
  })

  it("com o modelo trocado depois de gerar, só admite retificação", async () => {
    renderizarEtapa([secao("1", true, "Completo", "Necessidade descrita.")], true, {
      retificacaoExigida: true,
    })

    expect(await screen.findByText(/só pode ser concluída como retificação/)).toBeInTheDocument()
    expect(screen.queryByText("Regeração")).not.toBeInTheDocument()
    expect(screen.getByText("Retificação: Erro material")).toBeInTheDocument()
  })

  it("com o Objeto da Demanda em branco, diz que vale a descrição e leva à capa (§97)", async () => {
    const editarCapa = vi.fn()
    const abertura = {
      titulo: "ESTUDO TÉCNICO PRELIMINAR",
      introducao: "O presente documento caracteriza a primeira etapa.",
      processo: "PROC-2026-000006",
      objeto: "Aquisição de materiais",
      objetoDaDescricao: true,
    }
    const { rerender } = renderizar(
      <EtapaFinal
        processoId={PROCESSO}
        tipo="ETP"
        secoes={[secao("1", true, "Completo", "Necessidade descrita.")]}
        jaGerado={false}
        abertura={abertura}
        onEditarCapa={editarCapa}
        pendente={false}
        onGerar={vi.fn()}
        onVisualizar={vi.fn()}
      />,
    )

    expect(await screen.findByText(/Objeto da Demanda em branco/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Preencher na capa" }))
    expect(editarCapa).toHaveBeenCalled()

    // Preenchido na capa, o aviso some: o objeto é o da demanda.
    rerender(
      <EtapaFinal
        processoId={PROCESSO}
        tipo="ETP"
        secoes={[secao("1", true, "Completo", "Necessidade descrita.")]}
        jaGerado={false}
        abertura={{ ...abertura, objetoDaDescricao: false }}
        onEditarCapa={editarCapa}
        pendente={false}
        onGerar={vi.fn()}
        onVisualizar={vi.fn()}
      />,
    )
    expect(screen.queryByText(/Objeto da Demanda em branco/)).not.toBeInTheDocument()
  })

  it("já gerado, o caminho de ver o documento leva ao acervo", async () => {
    const { visualizar } = renderizarEtapa(
      [secao("1", true, "Completo", "Necessidade descrita.")],
      true,
    )

    await userEvent.click(await screen.findByRole("button", { name: /Visualizar Documento/ }))

    expect(visualizar).toHaveBeenCalled()
  })
})

/**
 * Responsável pela elaboração e o ato normativo (ADR-044 do back-end).
 *
 * <p>Por padrão é quem conclui; informar outra pessoa exige nome e CPF válidos.
 * No ETP vem a portaria; no Edital, o decreto.
 */
describe("etapa final: quem elaborou", () => {
  const prontas = [secao("1", true, "Completo", "Necessidade descrita.")]

  function renderizarDo(tipo: "ETP" | "TR" | "Edital") {
    const gerar = vi.fn()
    renderizar(
      <EtapaFinal
        processoId={PROCESSO}
        tipo={tipo}
        secoes={prontas}
        jaGerado={false}
        pendente={false}
        onGerar={gerar}
        onVisualizar={vi.fn()}
      />,
    )
    return gerar
  }

  it("por padrão é quem conclui, e mostra o nome e o CPF mascarado como vão sair", async () => {
    renderizarDo("TR")

    expect(await screen.findByDisplayValue("Maria Costa Andrade")).toBeDisabled()
    expect(screen.getByDisplayValue("***.333.333-**")).toBeDisabled()
    // Fora do ETP e do Edital não há ato a citar.
    expect(screen.queryByRole("button", { name: "Portaria" })).not.toBeInTheDocument()
  })

  it("outra pessoa precisa de nome e CPF válidos antes de gerar", async () => {
    const gerar = renderizarDo("TR")

    await userEvent.click(await screen.findByRole("button", { name: /Pessoa Externa/ }))
    await userEvent.type(screen.getByPlaceholderText("Ex.: José Pereira"), "José Pereira")
    await userEvent.type(screen.getByRole("textbox", { name: "CPF de quem elaborou" }), "12345678900")
    await userEvent.click(screen.getByRole("button", { name: /Finalizar e Gerar/ }))
    expect(screen.getByText("Informe um CPF válido.")).toBeInTheDocument()
    expect(gerar).not.toHaveBeenCalled()

    await userEvent.clear(screen.getByRole("textbox", { name: "CPF de quem elaborou" }))
    await userEvent.type(screen.getByRole("textbox", { name: "CPF de quem elaborou" }), "52998224725")
    await userEvent.click(screen.getByRole("button", { name: /Finalizar e Gerar/ }))
    expect(gerar).toHaveBeenCalledWith(false, { responsavel: { nome: "José Pereira", cpf: "52998224725" } })
  })

  it("no ETP, a portaria é digitada quando não está no acervo", async () => {
    const gerar = renderizarDo("ETP")

    await userEvent.click(await screen.findByRole("button", { name: "Portaria" }))
    await userEvent.click(await screen.findByRole("option", { name: /Digitar portaria/ }))
    await userEvent.type(screen.getByRole("textbox", { name: "Portaria digitada" }), "Portaria nº 77/2026")
    await userEvent.click(screen.getByRole("button", { name: /Finalizar e Gerar/ }))

    expect(gerar).toHaveBeenCalledWith(false, { ato: { citacao: "Portaria nº 77/2026" } })
  })

  it("no Edital, o decreto vem do acervo de normas", async () => {
    servidor.use(
      http.get(`${urlDaApi}/regulations`, () =>
        HttpResponse.json([
          {
            id: "n-dec",
            kind: "DECREE",
            kindLabel: "Decreto",
            number: "10.210",
            publishedOn: "2025-03-05",
            title: "Regulamenta a Lei 14.133/21",
            status: "IN_FORCE",
            currentFile: {
              version: 1,
              fileName: "d.pdf",
              mediaType: "application/pdf",
              byteSize: 1,
              sha256: "a".repeat(64),
              textAvailable: true,
              textCharacters: 1,
              uploadedAt: "2026-10-01T00:00:00Z",
              current: true,
            },
            updatedAt: "2026-10-01T00:00:00Z",
            version: 0,
          },
        ]),
      ),
    )
    const gerar = renderizarDo("Edital")

    await userEvent.click(await screen.findByRole("button", { name: "Decreto" }))
    await userEvent.click(
      await screen.findByRole("option", { name: "Decreto nº 10.210, de 05/03/2025: Regulamenta a Lei 14.133/21" }),
    )
    await userEvent.click(screen.getByRole("button", { name: /Finalizar e Gerar/ }))

    expect(gerar).toHaveBeenCalledWith(false, { ato: { normaId: "n-dec" } })
  })

  it("outro servidor do órgão é escolhido na lista, e vai pelo id", async () => {
    servidor.use(
      http.get(`${urlDaApi}/staff`, () =>
        HttpResponse.json([
          { id: "u-ana", name: "Ana Souza", jobTitle: "Analista", registrationNumber: "0042", cpf: "***.533.447-**" },
          { id: "u-jose", name: "José Pereira", cpf: "***.982.247-**" },
        ]),
      ),
    )
    const gerar = renderizarDo("TR")

    await userEvent.click(await screen.findByRole("button", { name: /Servidor do Órgão/ }))
    // Sem escolher, não gera — e diz o que falta.
    await userEvent.click(screen.getByRole("button", { name: /Finalizar e Gerar/ }))
    expect(await screen.findByText("Escolha o servidor que elaborou.")).toBeInTheDocument()
    expect(gerar).not.toHaveBeenCalled()

    expect(await screen.findByRole("option", { name: /Ana Souza/ })).toHaveTextContent("Analista · Matrícula 0042")
    await userEvent.type(screen.getByRole("textbox", { name: "Buscar servidor do órgão" }), "jose")
    expect(screen.queryByRole("option", { name: /Ana Souza/ })).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("option", { name: /José Pereira/ }))

    // Escolhido, aparece como vai sair no documento.
    expect(screen.getByDisplayValue("José Pereira")).toBeDisabled()
    expect(screen.getByDisplayValue("***.982.247-**")).toBeDisabled()
    await userEvent.click(screen.getByRole("button", { name: /Finalizar e Gerar/ }))
    expect(gerar).toHaveBeenCalledWith(false, { responsavel: { servidorId: "u-jose" } })

    // Trocar volta à lista.
    await userEvent.click(screen.getByRole("button", { name: "Trocar Servidor" }))
    expect(screen.getByRole("textbox", { name: "Buscar servidor do órgão" })).toBeInTheDocument()
  })

  it("busca sem resultado diz isso, e órgão sem colegas aponta a pessoa externa", async () => {
    servidor.use(http.get(`${urlDaApi}/staff`, () => HttpResponse.json([])))
    renderizarDo("TR")

    await userEvent.click(await screen.findByRole("button", { name: /Servidor do Órgão/ }))
    expect(await screen.findByText(/Nenhum outro servidor ativo/)).toBeInTheDocument()
    await userEvent.type(screen.getByRole("textbox", { name: "Buscar servidor do órgão" }), "Carlos")
    expect(screen.getByText("Nenhum servidor encontrado com essa busca.")).toBeInTheDocument()
  })

  it("a falha ao carregar os servidores oferece tentar de novo", async () => {
    servidor.use(http.get(`${urlDaApi}/staff`, () => HttpResponse.json({}, { status: 500 })))
    renderizarDo("TR")

    await userEvent.click(await screen.findByRole("button", { name: /Servidor do Órgão/ }))
    expect(await screen.findByText("Não foi possível carregar os servidores.")).toBeInTheDocument()
    servidor.use(http.get(`${urlDaApi}/staff`, () => HttpResponse.json([])))
    await userEvent.click(screen.getByRole("button", { name: "Tentar Novamente" }))
    expect(await screen.findByText(/Nenhum outro servidor ativo/)).toBeInTheDocument()
  })

  it("mostra quem ficou salvo na última versão gerada", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/documents/:tipo/versions`, () =>
        HttpResponse.json([
          {
            version: 2,
            note: "Regeração",
            generatedAt: "2026-10-10T12:00:00Z",
            contentHash: "a".repeat(64),
            preparedBy: { name: "Ana Souza", cpf: "***.533.447-**" },
            legalActCitation: null,
            body: [],
          },
        ]),
      ),
    )
    renderizarDo("TR")

    expect(await screen.findByText(/Na versão 2 gerada/)).toHaveTextContent("Na versão 2 gerada: Ana Souza · CPF ***.533.447-**")
  })
})
