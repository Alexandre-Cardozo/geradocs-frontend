import { describe, expect, it } from "vitest"

import { navPrincipal, navSistema, rotaPermitida } from "@/lib/auth/acesso"
import type { PerfilAcesso } from "@/lib/types"

/**
 * RBAC de rota é conveniência de interface, não segurança — quem barra de
 * verdade é o backend. Ainda assim, uma rota liberada por engano mostra à pessoa
 * uma tela que ela não deveria ver, e a tela pede dados que o servidor vai negar.
 */

const perfis: PerfilAcesso[] = ["admin_geral", "coordenador", "servidor"]

const matriz: Array<{ rota: string; permitidos: PerfilAcesso[] }> = [
  { rota: "/", permitidos: perfis },
  { rota: "/admin", permitidos: ["admin_geral"] },
  { rota: "/admin/entidades", permitidos: ["admin_geral"] },
  { rota: "/admin/servidores", permitidos: ["admin_geral"] },
  { rota: "/configuracoes", permitidos: ["coordenador"] },
  { rota: "/configuracoes/timbre", permitidos: ["coordenador"] },
  { rota: "/configuracoes/secretarias", permitidos: ["coordenador"] },
  { rota: "/configuracoes/pca", permitidos: ["coordenador"] },
  { rota: "/configuracoes/usuarios", permitidos: ["coordenador"] },
  { rota: "/processos", permitidos: ["servidor", "coordenador"] },
  { rota: "/processos/novo", permitidos: ["servidor", "coordenador"] },
  { rota: "/documentos", permitidos: ["servidor", "coordenador"] },
  { rota: "/perfil", permitidos: perfis },
]

describe("matriz de rotas por perfil", () => {
  for (const { rota, permitidos } of matriz) {
    for (const perfil of perfis) {
      const esperado = permitidos.includes(perfil)
      it(`${perfil} ${esperado ? "acessa" : "não acessa"} ${rota}`, () => {
        expect(rotaPermitida(perfil, rota)).toBe(esperado)
      })
    }
  }
})

describe("resolução do prefixo", () => {
  it("casa o prefixo mais específico", () => {
    // "/admin/entidades" precisa cair na regra de "/admin", não numa mais
    // genérica que a preceda na lista.
    expect(rotaPermitida("coordenador", "/admin/entidades")).toBe(false)
    expect(rotaPermitida("admin_geral", "/admin/entidades")).toBe(true)
  })

  it("não confunde rota que apenas começa com o mesmo texto", () => {
    // "/processos-antigos" não é filha de "/processos": sem a barra, o prefixo
    // liberaria uma rota que ninguém declarou.
    expect(rotaPermitida("admin_geral", "/processos-antigos")).toBe(true)
  })

  it("libera rota não declarada", () => {
    expect(rotaPermitida("servidor", "/rota-nova")).toBe(true)
  })
})

describe("navegação por perfil", () => {
  it("o administrador geral não vê processos nem documentos", () => {
    const hrefs = navPrincipal("admin_geral").map((item) => item.href)
    expect(hrefs).toEqual(["/", "/admin/entidades", "/admin/servidores"])
  })

  it("servidor e coordenador veem o mesmo menu principal", () => {
    expect(navPrincipal("servidor")).toEqual(navPrincipal("coordenador"))
  })

  it("só o coordenador tem a seção de configurações", () => {
    expect(navSistema("servidor")).toHaveLength(0)
    expect(navSistema("admin_geral")).toHaveLength(0)
  })

  it("cada assunto das configurações é uma entrada de menu, e não uma aba escondida", () => {
    // A tela única de abas obrigava a abrir /configuracoes para descobrir o que
    // havia dentro; o menu agora nomeia os quatro assuntos.
    expect(navSistema("coordenador").map((item) => item.href)).toEqual([
      "/configuracoes/timbre",
      "/configuracoes/secretarias",
      "/configuracoes/pca",
      "/configuracoes/usuarios",
    ])
  })

  it("todo item do menu aponta para rota que o perfil pode acessar", () => {
    // Menu que oferece rota bloqueada leva a pessoa a um redirecionamento sem
    // explicação.
    for (const perfil of perfis) {
      for (const item of [...navPrincipal(perfil), ...navSistema(perfil)]) {
        expect(rotaPermitida(perfil, item.href), `${perfil} → ${item.href}`).toBe(true)
      }
    }
  })
})
