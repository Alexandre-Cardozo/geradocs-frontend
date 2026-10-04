import { describe, expect, it } from "vitest"

import {
  erroCargo,
  erroDecreto,
  erroMatricula,
  erroNomeDePessoa,
  erroNomeInstitucional,
  erroTextoDoTimbre,
} from "@/lib/validacao/campos"

// Os valores recusados são os de um teste de cadastro real.
describe("erroNomeDePessoa", () => {
  it.each(["Maria Costa Andrade", "José D'Ávila Jr.", "Ana-Paula Ribeiro", "", "   "])("aceita %j", (nome) => {
    expect(erroNomeDePessoa(nome)).toBeUndefined()
  })

  it.each(["select * from users", "Maria <script>", "' OR 1=1 --", "..."])("recusa %j", (nome) => {
    expect(erroNomeDePessoa(nome)).toMatch(/apenas letras/)
  })
})

describe("erroCargo", () => {
  it("aceita cargo comum e recusa marcação", () => {
    expect(erroCargo("Agente Administrativo II (Compras)")).toBeUndefined()
    expect(erroCargo("Analista de Carro de Boi")).toBeUndefined()
    expect(erroCargo("Analista <b>TI</b>")).toBeDefined()
  })
})

describe("erroMatricula", () => {
  it.each(["MAT-4471", "12.345-6", "2026/0042", "hml-0001", ""])("aceita %j", (matricula) => {
    expect(erroMatricula(matricula)).toBeUndefined()
  })

  it.each(["Cabeça de gelo", "ABC", "MAT 4471", "MAÇ-1"])("recusa %j", (matricula) => {
    expect(erroMatricula(matricula)).toMatch(/ao menos um número/)
  })
})

describe("erroDecreto", () => {
  it.each(["Decreto 1.234/2026", "Decreto nº 12, de 3 de janeiro de 2026", ""])("aceita %j", (decreto) => {
    expect(erroDecreto(decreto)).toBeUndefined()
  })

  it.each(["' UNION SELECT NULL,NULL,NULL --", "Decreto do prefeito", "Decreto = 1"])("recusa %j", (decreto) => {
    expect(erroDecreto(decreto)).toMatch(/número do decreto/)
  })
})

describe("erroNomeInstitucional", () => {
  it.each(["Prefeitura Municipal de Ecoporanga", "Fundo Municipal de Saúde (FMS)", "Secretaria de Obras/Serviços"])(
    "aceita %j",
    (nome) => {
      expect(erroNomeInstitucional(nome, "O nome da entidade")).toBeUndefined()
    },
  )

  it.each([
    "https://www.google.com/D3v4c$&7_r 1+4=5_˜≈ç√˜",
    "https://www.4devs.com.br/gerador_de_cpf",
    "' OR 1=1 --",
    "12345",
  ])("recusa %j", (nome) => {
    expect(erroNomeInstitucional(nome, "O nome da secretaria")).toMatch(/^O nome da secretaria precisa ter letras/)
  })
})

describe("erroTextoDoTimbre", () => {
  it("aceita as variáveis e quebras de linha", () => {
    expect(
      erroTextoDoTimbre("Meu cabeçalho, processo {processo}.\nRealizado na data: {data} · {secretaria}", "O cabeçalho"),
    ).toBeUndefined()
    expect(erroTextoDoTimbre("Página: {pagina}\nVersão: {numero}", "O rodapé")).toBeUndefined()
  })

  it("aponta a variável desconhecida", () => {
    expect(erroTextoDoTimbre("Processo {processso}", "O cabeçalho")).toBe(
      "Variável desconhecida: {processso}. Use apenas {processo}, {data}, {secretaria}, {numero}, {pagina}.",
    )
  })

  it("recusa caractere de controle", () => {
    expect(erroTextoDoTimbre("Rodapé\u0000com nulo", "O rodapé")).toMatch(/caracteres de controle/)
  })
})
