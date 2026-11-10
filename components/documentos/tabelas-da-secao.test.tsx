import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import { TabelasDaSecao } from "@/components/documentos/tabelas-da-secao"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"

/** Campo de texto de verdade, para conferir o que o editor devolve ao texto da seção. */
function ComTexto({ inicial, aoMudar = vi.fn() }: { inicial: string; aoMudar?: (texto: string) => void }) {
  const [texto, setTexto] = useState(inicial)
  return (
    <>
      <textarea aria-label="Texto da seção" value={texto} readOnly />
      <TabelasDaSecao
        texto={texto}
        onChange={(novo) => {
          setTexto(novo)
          aoMudar(novo)
        }}
      />
    </>
  )
}

const campo = () => screen.getByLabelText("Texto da seção") as HTMLTextAreaElement

/** O editor de tabela da seção (§101): grade que devolve ao texto no formato de sempre. */
describe("editor de tabela da seção", () => {
  it("insere uma tabela nova no fim do texto, sem linha em branco (§102)", async () => {
    renderizar(<ComTexto inicial="Texto da seção." />)

    await userEvent.click(screen.getByRole("button", { name: "Inserir tabela" }))
    const cabecalho1 = screen.getByLabelText("Cabeçalho da coluna 1")
    await userEvent.clear(cabecalho1)
    await userEvent.type(cabecalho1, "Item")
    await userEvent.type(screen.getByLabelText("Linha 1, coluna 1"), "Papel A4")
    await userEvent.click(screen.getByRole("button", { name: "Inserir no texto" }))

    expect(campo().value).toBe("Texto da seção.\nItem | Coluna 2 | Coluna 3\nPapel A4 |  | ")
    // De volta à linha compacta, agora com a tabela para editar.
    expect(screen.getByRole("button", { name: "Editar tabela 1" })).toBeInTheDocument()
  })

  it("edita a tabela que já está no texto: acrescenta linha e coluna e tira o que sobra", async () => {
    const aoMudar = vi.fn()
    renderizar(<ComTexto inicial={"Antes.\n\nA | B\n1 | 2\n\nDepois."} aoMudar={aoMudar} />)

    await userEvent.click(screen.getByRole("button", { name: "Editar tabela 1" }))
    expect((screen.getByLabelText("Linha 1, coluna 2") as HTMLInputElement).value).toBe("2")
    await userEvent.click(screen.getByRole("button", { name: "Linha" }))
    await userEvent.type(screen.getByLabelText("Linha 2, coluna 1"), "3")
    await userEvent.click(screen.getByRole("button", { name: "Coluna" }))
    expect((screen.getByLabelText("Cabeçalho da coluna 3") as HTMLInputElement).value).toBe("Coluna 3")
    await userEvent.click(screen.getByRole("button", { name: "Tirar a coluna 3" }))
    await userEvent.click(screen.getByRole("button", { name: "Salvar tabela" }))

    expect(campo().value).toBe("Antes.\n\nA | B\n1 | 2\n3 | \n\nDepois.")
    expect(aoMudar).toHaveBeenCalledTimes(1)

    // Tirar linha só vale enquanto sobra ao menos uma além do cabeçalho.
    await userEvent.click(screen.getByRole("button", { name: "Editar tabela 1" }))
    await userEvent.click(screen.getByRole("button", { name: "Tirar a linha 2" }))
    expect(screen.queryByRole("button", { name: /Tirar a linha/ })).not.toBeInTheDocument()
    // Com duas colunas, não há coluna a tirar: uma coluna só não é tabela.
    expect(screen.queryByRole("button", { name: /Tirar a coluna/ })).not.toBeInTheDocument()
  })

  it("cabeçalho em branco trava a gravação e diz por quê", async () => {
    renderizar(<ComTexto inicial="" />)

    await userEvent.click(screen.getByRole("button", { name: "Inserir tabela" }))
    for (const c of [1, 2, 3]) await userEvent.clear(screen.getByLabelText(`Cabeçalho da coluna ${c}`))

    const inserir = screen.getByRole("button", { name: "Inserir no texto" })
    expect(inserir).toBeDisabled()
    expect(inserir).toHaveAccessibleDescription("Dê nome às colunas no cabeçalho.")
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }))
    expect(campo().value).toBe("")
  })

  it("excluir pede confirmação, e confirmar tira a tabela do texto", async () => {
    renderizar(<ComTexto inicial={"Antes.\n\nA | B\n1 | 2"} />)

    await userEvent.click(screen.getByRole("button", { name: "Editar tabela 1" }))
    await userEvent.click(screen.getByRole("button", { name: "Excluir tabela" }))
    await userEvent.click(screen.getByRole("button", { name: "Manter" }))
    await userEvent.click(screen.getByRole("button", { name: "Excluir tabela" }))
    await userEvent.click(screen.getByRole("button", { name: "Confirmar" }))

    expect(campo().value).toBe("Antes.")
    expect(screen.queryByRole("button", { name: /Editar tabela/ })).not.toBeInTheDocument()
  })

  it("a tabela nova não oferece excluir, porque ainda não está no texto", async () => {
    renderizar(<ComTexto inicial="" />)

    await userEvent.click(screen.getByRole("button", { name: "Inserir tabela" }))
    expect(screen.queryByRole("button", { name: "Excluir tabela" })).not.toBeInTheDocument()
  })
})
