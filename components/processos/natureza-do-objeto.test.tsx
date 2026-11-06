import { describe, expect, it, vi } from "vitest"

import { NaturezaDoObjetoEmPilulas } from "@/components/processos/natureza-do-objeto"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"

/**
 * A natureza do objeto em pílulas (ADR-053 e ADR-061 do back-end): uma só,
 * "Não informada" explícita, e a dica diz o que ela muda.
 */
const CONVENCAO = {
  codigo: "CONVENCAO_COLETIVA",
  documento: "ETP" as const,
  ancora: "3",
  titulo: "Convenção Coletiva",
  fundamentoLegal: "Art. 135, II, Lei 14.133/21",
}

describe("natureza do objeto em pílulas", () => {
  it("é uma escolha só, e Não informada vem marcada quando não há natureza", () => {
    renderizar(<NaturezaDoObjetoEmPilulas valor="" onChange={vi.fn()} />)

    expect(screen.getByRole("radiogroup", { name: "Natureza do Objeto" })).toBeInTheDocument()
    expect(screen.getAllByRole("radio")).toHaveLength(5)
    expect(screen.getByRole("radio", { checked: true })).toHaveTextContent("Não informada")
  })

  it("escolher manda a natureza, e Não informada manda vazio", async () => {
    const onChange = vi.fn()
    renderizar(<NaturezaDoObjetoEmPilulas valor="GOODS" onChange={onChange} />)

    expect(screen.getByRole("radio", { name: "Bens" })).toHaveAttribute("aria-checked", "true")
    await userEvent.click(screen.getByRole("radio", { name: "Obras e serviços de engenharia" }))
    await userEvent.click(screen.getByRole("radio", { name: "Não informada" }))

    expect(onChange.mock.calls).toEqual([["WORKS_AND_ENGINEERING"], [""]])
  })

  it("a dica diz o que a natureza é e, quando o servidor diz, o que traz ao ETP", () => {
    renderizar(
      <NaturezaDoObjetoEmPilulas
        valor=""
        onChange={vi.fn()}
        topicos={{ SERVICES_WITH_DEDICATED_LABOR: [CONVENCAO], GOODS: [] }}
        rotuloVazio="Não informar agora"
      />,
    )

    expect(screen.getByRole("radio", { name: "Não informar agora" })).not.toHaveAttribute("title")
    expect(screen.getByRole("radio", { name: "Serviços com dedicação exclusiva de mão de obra" })).toHaveAttribute(
      "title",
      expect.stringMatching(/Art\. 6º, XVI.*\nAcrescenta: Convenção Coletiva\.$/s),
    )
    expect(screen.getByRole("radio", { name: "Bens" })).toHaveAttribute(
      "title",
      expect.not.stringContaining("Acrescenta"),
    )
  })
})
