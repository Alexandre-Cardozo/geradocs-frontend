import { describe, expect, it, vi } from "vitest"

import { EtapaFinal } from "@/components/documentos/etapa-final"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"
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

    expect(gerar).toHaveBeenCalledWith(false)
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
    expect(gerar).toHaveBeenCalledWith(true)
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
