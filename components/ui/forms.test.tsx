import { describe, expect, it } from "vitest"

import {
  Dropdown,
  FormField,
  Input,
  MoneyInput,
  QuantityInput,
  Select,
  Textarea,
} from "@/components/ui"
import { renderizar, screen } from "@/lib/teste/renderizar"

/**
 * O rótulo do `FormField` nomeia o controle que ele rotula.
 *
 * Até 22/08/2026 não nomeava: o `<label>` vem antes do campo, como irmão, e sem
 * ligação explícita não havia associação nenhuma — quarenta e sete campos do
 * produto eram anunciados como "caixa de edição" e nada mais.
 *
 * Este teste é a prova de que a ligação existe para **cada tipo de controle**.
 * Sem ele, um controle novo entraria sem nome acessível e ninguém notaria: a
 * tela continua bonita, e só quem depende de leitor de tela descobre.
 */
describe("rótulo do campo", () => {
  it("nomeia o input de texto", () => {
    renderizar(
      <FormField label="Nome Completo">
        <Input value="" onChange={() => {}} />
      </FormField>,
    )

    expect(screen.getByLabelText("Nome Completo")).toBeInTheDocument()
  })

  it("nomeia o input com prefixo, que é outro elemento", () => {
    renderizar(
      <FormField label="Processo">
        <Input value="" onChange={() => {}} prefix="nº" />
      </FormField>,
    )

    expect(screen.getByLabelText("Processo")).toBeInTheDocument()
  })

  it("nomeia o campo monetário e o de quantidade", () => {
    renderizar(
      <>
        <FormField label="Valor Estimado">
          <MoneyInput value="" onChange={() => {}} />
        </FormField>
        <FormField label="Quantidade Estimada">
          <QuantityInput value="" onChange={() => {}} />
        </FormField>
      </>,
    )

    expect(screen.getByLabelText("Valor Estimado")).toBeInTheDocument()
    expect(screen.getByLabelText("Quantidade Estimada")).toBeInTheDocument()
  })

  it("nomeia a área de texto", () => {
    renderizar(
      <FormField label="Memória de Cálculo">
        <Textarea value="" onChange={() => {}} />
      </FormField>,
    )

    expect(screen.getByLabelText("Memória de Cálculo")).toBeInTheDocument()
  })

  it("nomeia o select nativo", () => {
    renderizar(
      <FormField label="Perfil de Acesso">
        <Select>
          <option value="servidor">Servidor</option>
        </Select>
      </FormField>,
    )

    expect(screen.getByLabelText("Perfil de Acesso")).toBeInTheDocument()
  })

  it("nomeia o dropdown do design system, que é botão e não select", () => {
    renderizar(
      <FormField label="Modalidade">
        <Dropdown value="a" onChange={() => {}} options={[{ value: "a", label: "Pregão" }]} />
      </FormField>,
    )

    expect(screen.getByLabelText("Modalidade")).toBeInTheDocument()
  })

  it("dois controles no mesmo campo compartilham o rótulo sem duplicar id", () => {
    renderizar(
      <FormField label="Vigência">
        <Input value="" onChange={() => {}} />
        <Input value="" onChange={() => {}} />
      </FormField>,
    )

    // Ligar por `htmlFor` daria o mesmo `id` aos dois: DOM inválido, e o
    // segundo campo voltaria a não ter nome.
    expect(screen.getAllByLabelText("Vigência")).toHaveLength(2)
  })

  it("o aria-label escrito à mão vence o rótulo visível", () => {
    renderizar(
      <FormField label="Unidade">
        <Dropdown
          value="a"
          onChange={() => {}}
          ariaLabel="Unidade de medida do item"
          options={[{ value: "a", label: "Resma" }]}
        />
      </FormField>,
    )

    // `aria-labelledby` sobrepõe `aria-label`: aplicar os dois faria o texto
    // escrito à mão ser ignorado em silêncio.
    expect(screen.getByLabelText("Unidade de medida do item")).toBeInTheDocument()
    expect(screen.queryByLabelText("Unidade")).not.toBeInTheDocument()
  })

  it("o campo obrigatório não vira “Nome *” no leitor de tela", () => {
    renderizar(
      <FormField label="Nome Completo" required>
        <Input value="" onChange={() => {}} />
      </FormField>,
    )

    expect(screen.getByLabelText(/Nome Completo/)).toBeInTheDocument()
  })

  it("controle fora de um FormField não ganha rótulo nenhum", () => {
    renderizar(<Input value="" onChange={() => {}} placeholder="Buscar" />)

    // `aria-labelledby` apontando para id inexistente deixaria o campo sem nome
    // e ainda esconderia o placeholder do leitor de tela.
    expect(screen.getByPlaceholderText("Buscar")).not.toHaveAttribute("aria-labelledby")
  })
})
