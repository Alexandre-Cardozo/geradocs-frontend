import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { EtapaFinal } from "@/components/documentos/etapa-final"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"
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

function renderizarEtapa(secoes: SecaoDocumento[], jaGerado = false) {
  const gerar = vi.fn()
  const visualizar = vi.fn()
  renderizar(
    <EtapaFinal
      processoId={PROCESSO}
      tipo="ETP"
      secoes={secoes}
      jaGerado={jaGerado}
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
    expect(screen.getByText(/Conclua as seções obrigatórias/)).toBeInTheDocument()
    expect(screen.getByText(/Seção 13/)).toBeInTheDocument()
    // Guarda-corpo nº 7: motivo desenhado e não anunciado só existe para quem
    // enxerga a tela.
    const descrito = gerar.getAttribute("aria-describedby")
    expect(document.getElementById(descrito as string)).toHaveTextContent(/Faltam seções/)
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

    // Sumir sem registro é o que o Art. 18, § 2º não aceita — mas travar aqui
    // transformaria orientação em obstáculo.
    expect(await screen.findByText(/ficarão de fora do documento/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Finalizar e Gerar/ })).toBeEnabled()
  })

  it("com o documento já gerado, regerar pede confirmação antes de substituir", async () => {
    const { gerar } = renderizarEtapa(
      [secao("1", true, "Completo", "Necessidade descrita.")],
      true,
    )

    await userEvent.click(await screen.findByRole("button", { name: /Regerar/ }))
    expect(screen.getByText(/documento gerado anteriormente será/)).toBeInTheDocument()
    expect(gerar).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole("button", { name: /Confirmar e Regerar/ }))
    expect(gerar).toHaveBeenCalledWith(true, {})
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
      await screen.findByRole("option", { name: "Decreto nº 10.210, de 05/03/2025 — Regulamenta a Lei 14.133/21" }),
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
