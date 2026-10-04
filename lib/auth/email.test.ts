import { describe, expect, it } from "vitest"

import { validaEmail } from "@/lib/auth/email"

describe("validaEmail", () => {
  it.each([
    "maria.costa@ecoporanga.es.gov.br",
    "joao+compras@gmail.com",
    "  ana@prefeitura.gov.br  ",
  ])("aceita %s", (email) => {
    expect(validaEmail(email)).toBe(true)
  })

  it.each([
    "",
    "1.@gmail@hotmail.com",
    "maria@prefeitura",
    "maria",
    "@gmail.com",
    "maria@",
    ".maria@gmail.com",
    "maria.@gmail.com",
    "ma..ria@gmail.com",
    "maria costa@gmail.com",
    "maria@gmail..com",
    "1.%%34≈ƒ©¨∆˚gmail@homail.com",
    "joão@prefeitura.gov.br",
    "maria@gmail.c0m",
    "maria@-gmail.com",
  ])("recusa %j", (email) => {
    expect(validaEmail(email)).toBe(false)
  })
})
