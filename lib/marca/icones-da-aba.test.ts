import { describe, expect, it } from "vitest"

import { iconesDaAba, iconesDeOutraMarca, marcaDoIcone } from "./icones-da-aba"

describe("iconesDaAba", () => {
  it("aponta para a pasta da marca, com o favicon, o ícone grande e o da Apple", () => {
    expect(iconesDaAba("govpro")).toEqual({
      icon: [
        { url: "/icones/govpro/favicon.ico", sizes: "32x32" },
        { url: "/icones/govpro/icon.png", type: "image/png", sizes: "512x512" },
      ],
      apple: [{ url: "/icones/govpro/apple-icon.png", type: "image/png", sizes: "180x180" }],
    })
  })

  it("cada marca tem a sua pasta", () => {
    const urls = (marca: "govpro" | "geradocs") => JSON.stringify(iconesDaAba(marca))
    expect(urls("geradocs")).toContain("/icones/geradocs/")
    expect(urls("geradocs")).not.toContain("govpro")
  })
})

describe("marcaDoIcone", () => {
  it("reconhece a marca pela pasta, também sob o prefixo da publicação", () => {
    expect(marcaDoIcone("/icones/govpro/icon.png")).toBe("govpro")
    expect(marcaDoIcone("/geradocs-frontend/icones/geradocs/favicon.ico")).toBe("geradocs")
    expect(marcaDoIcone("/outro.png")).toBeNull()
  })
})

describe("iconesDeOutraMarca", () => {
  it("com uma marca só, não tira nada", () => {
    expect(iconesDeOutraMarca(["/icones/govpro/favicon.ico", "/icones/govpro/icon.png"])).toEqual([])
  })

  it("com duas, tira as que não são do último ícone inserido", () => {
    const enderecos = [
      "/icones/govpro/favicon.ico",
      "/icones/govpro/icon.png",
      "/outro.png",
      "/icones/geradocs/favicon.ico",
      "/icones/geradocs/icon.png",
    ]
    expect(iconesDeOutraMarca(enderecos)).toEqual([0, 1])
    // Invertida, a última é a GovPro: saem os do GeraDocs, agora no começo.
    expect(iconesDeOutraMarca([...enderecos].reverse())).toEqual([0, 1])
  })

  it("sem ícone de marca, não tira nada", () => {
    expect(iconesDeOutraMarca([])).toEqual([])
    expect(iconesDeOutraMarca(["/outro.png"])).toEqual([])
  })
})
