import { describe, expect, it } from "vitest"

import { iconesDaAba } from "./icones-da-aba"

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
