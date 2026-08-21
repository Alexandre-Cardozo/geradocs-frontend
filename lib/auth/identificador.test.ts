import { afterEach, describe, expect, it, vi } from "vitest"

import {
  DESCRITORES,
  IDENTIFICADOR,
  type TipoIdentificador,
  mensagemCredencialRecusada,
} from "@/lib/auth/identificador"

const TIPOS = Object.keys(DESCRITORES) as TipoIdentificador[]

/** Um exemplo válido e um inválido por chave, na forma em que a pessoa digita. */
const EXEMPLOS: Record<TipoIdentificador, { valido: string; invalido: string; api: string }> = {
  CPF: { valido: "529.982.247-25", invalido: "529.982.247-24", api: "52998224725" },
  EMAIL: {
    valido: "  Maria.Costa@Ecoporanga.ES.GOV.BR ",
    invalido: "maria.costa",
    api: "maria.costa@ecoporanga.es.gov.br",
  },
  REGISTRATION_NUMBER: { valido: "  mat-4471 ", invalido: "   ", api: "MAT-4471" },
}

describe("descritor de identificador", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it.each(TIPOS)("%s tem tudo o que a tela de login precisa", (tipo) => {
    const descritor = DESCRITORES[tipo]

    // A tela não sabe qual é a chave: ela lê o descritor. Um campo faltando
    // aqui vira placeholder vazio ou rótulo "undefined" em produção.
    expect(descritor.tipo).toBe(tipo)
    expect(descritor.rotulo).not.toBe("")
    expect(descritor.placeholder).not.toBe("")
    expect(descritor.autoComplete).not.toBe("")
    expect(descritor.mensagemFormato).not.toBe("")
  })

  it.each(TIPOS)("%s normaliza para a forma que a API espera", (tipo) => {
    const { valido, api } = EXEMPLOS[tipo]

    expect(DESCRITORES[tipo].normaliza(valido)).toBe(api)
  })

  it.each(TIPOS)("%s normaliza o que já está normalizado sem mudar nada", (tipo) => {
    const { api } = EXEMPLOS[tipo]

    // Normalizar duas vezes precisa dar o mesmo resultado: o valor passa pelo
    // descritor no formulário e de novo no cliente HTTP.
    expect(DESCRITORES[tipo].normaliza(api)).toBe(api)
  })

  it.each(TIPOS)("%s aceita o válido e recusa o inválido", (tipo) => {
    const { valido, invalido } = EXEMPLOS[tipo]

    expect(DESCRITORES[tipo].valida(valido)).toBe(true)
    expect(DESCRITORES[tipo].valida(invalido)).toBe(false)
  })

  it.each(TIPOS)("%s formata sem perder o que foi digitado", (tipo) => {
    const { valido } = EXEMPLOS[tipo]
    const descritor = DESCRITORES[tipo]

    // Máscara não pode engolir caractere: formatar o já formatado tem de ser
    // estável, senão o campo embaralha o texto a cada tecla.
    const formatado = descritor.formata(valido)
    expect(descritor.formata(formatado)).toBe(formatado)
    expect(descritor.normaliza(formatado)).toBe(EXEMPLOS[tipo].api)
  })

  it.each(TIPOS)("%s abre a mensagem de credencial recusada com o próprio rótulo", (tipo) => {
    const descritor = DESCRITORES[tipo]

    // O mesmo texto que o back-end devolve no 401 (ADR-015): divergindo, a tela
    // mostraria "CPF ou senha inválida" com e-mail configurado.
    expect(mensagemCredencialRecusada(descritor)).toBe(`${descritor.rotulo} ou senha inválida.`)
  })

  it.each(TIPOS)("passa a %s quando a configuração pede", async (tipo) => {
    vi.stubEnv("NEXT_PUBLIC_LOGIN_IDENTIFIER", tipo)
    vi.resetModules()

    // É esta linha que sustenta a promessa do ADR-015: trocar a chave custa uma
    // variável de ambiente, não uma alteração de código.
    const recarregado = await import("@/lib/auth/identificador")
    expect(recarregado.IDENTIFICADOR.tipo).toBe(tipo)
  })

  it("cai no CPF quando a configuração traz um valor que não existe", async () => {
    vi.stubEnv("NEXT_PUBLIC_LOGIN_IDENTIFIER", "BIOMETRIA")
    vi.resetModules()

    // Configuração errada não pode derrubar o login: entra o padrão, e o
    // back-end recusa o que não bater com a chave dele.
    const recarregado = await import("@/lib/auth/identificador")
    expect(recarregado.IDENTIFICADOR.tipo).toBe("CPF")
  })

  it("usa CPF quando nada está configurado", () => {
    // Instalação sem NEXT_PUBLIC_LOGIN_IDENTIFIER é o caso de hoje, e precisa
    // continuar entrando por CPF sem ninguém configurar nada.
    expect(IDENTIFICADOR.tipo).toBe("CPF")
  })
})
