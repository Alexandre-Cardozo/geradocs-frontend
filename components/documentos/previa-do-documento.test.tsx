import { describe, expect, it } from "vitest"

import { PreviaDoDocumento } from "@/components/documentos/previa-do-documento"
import { renderizar, screen } from "@/lib/teste/renderizar"

/**
 * A prévia existe por causa da dispensa: sem ver o resultado, o servidor não tem
 * como saber que a seção deixada em branco vira um parágrafo declarando a
 * dispensa — nem que a deixada em branco *sem* justificar não vai aparecer.
 */
describe("prévia do documento", () => {
  it("mostra as seções na ordem, com o texto que sai", () => {
    renderizar(
      <PreviaDoDocumento
        blocos={[
          { id: "1", titulo: "Necessidade", texto: "Descrição da necessidade.", dispensada: false },
          { id: "2", titulo: "Resultados", texto: "Dispensado nos termos...", dispensada: true },
        ]}
      />,
    )

    expect(screen.getByText("Descrição da necessidade.")).toBeInTheDocument()
    // A marca distingue o parágrafo de dispensa do conteúdo escrito: sem ela,
    // os dois se leem como se fossem a mesma coisa.
    expect(screen.getByText("Dispensada")).toBeInTheDocument()
  })

  it("documento sem nada resolvido avisa que sairia vazio", () => {
    renderizar(<PreviaDoDocumento blocos={[]} />)

    expect(screen.getByText(/sairia vazio/i)).toBeInTheDocument()
  })

  it("aceita um título próprio", () => {
    renderizar(<PreviaDoDocumento blocos={[]} titulo="Conteúdo gerado" />)

    // Vazio não mostra título — o aviso já diz tudo.
    expect(screen.queryByText("Conteúdo gerado")).not.toBeInTheDocument()

    renderizar(
      <PreviaDoDocumento
        blocos={[{ id: "1", titulo: "Necessidade", texto: "Texto.", dispensada: false }]}
        titulo="Conteúdo gerado"
      />,
    )
    expect(screen.getByText("Conteúdo gerado")).toBeInTheDocument()
  })
})
