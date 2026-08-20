import { HttpResponse, http } from "msw"
import { afterEach, describe, expect, it, vi } from "vitest"

import { autenticacao, problema, sessaoAdmin, sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * O `auth-client` guarda o access token em uma variável de módulo. Cada teste
 * precisa de um módulo novo, senão o token de um vaza para o outro e a suíte
 * passa a testar a ordem em que os testes rodam.
 */
async function carregarClienteLimpo() {
  vi.resetModules()
  return import("@/lib/api/auth-client")
}

afterEach(() => vi.resetModules())

describe("autenticar", () => {
  it("mapeia a sessão do backend para o modelo da interface", async () => {
    const { autenticar } = await carregarClienteLimpo()

    const sessao = await autenticar("33333333333", "senha-correta")

    expect(sessao.usuario.nome).toBe("Maria Costa Andrade")
    expect(sessao.usuario.primeiroNome).toBe("Maria")
    expect(sessao.usuario.iniciais).toBe("MA")
    expect(sessao.usuario.perfilAcesso).toBe("servidor")
    expect(sessao.usuario.papel).toBe("servidor_compras")
    expect(sessao.usuario.ativo).toBe(true)
    expect(sessao.prefeitura?.orgao).toBe("Prefeitura Municipal de Ecoporanga")
  })

  it("envia o cookie de sessão em toda requisição", async () => {
    const { autenticar } = await carregarClienteLimpo()
    const espiao = vi.spyOn(globalThis, "fetch")

    await autenticar("33333333333", "senha-correta")

    const primeiraChamada = espiao.mock.calls[0]
    expect(primeiraChamada?.[1]?.credentials).toBe("include")
  })

  it("não guarda o token em localStorage", async () => {
    const { autenticar } = await carregarClienteLimpo()

    await autenticar("33333333333", "senha-correta")

    expect(window.localStorage.length).toBe(0)
  })

  it("responde com mensagem genérica quando a credencial é inválida", async () => {
    servidor.use(
      http.post(`${urlDaApi}/auth/login`, () =>
        HttpResponse.json(problema(401, "Usuário 33333333333 não encontrado"), { status: 401 }),
      ),
    )
    const { autenticar } = await carregarClienteLimpo()

    // A mensagem do backend citava o usuário; a da interface não pode — senão a
    // tela vira oráculo de quem tem conta (enumeração).
    await expect(autenticar("33333333333", "errada")).rejects.toThrow("CPF ou senha inválidos.")
  })

  it("preserva a mensagem de bloqueio por excesso de tentativas", async () => {
    servidor.use(
      http.post(`${urlDaApi}/auth/login`, () =>
        HttpResponse.json(problema(429, "Muitas tentativas. Tente novamente em 15 minutos."), { status: 429 }),
      ),
    )
    const { autenticar } = await carregarClienteLimpo()

    // 429 não é credencial inválida: dizer "CPF ou senha inválidos" faria o
    // usuário bloqueado seguir tentando, que é exatamente o que o bloqueio evita.
    await expect(autenticar("33333333333", "senha-correta")).rejects.toThrow(/tentativas/i)
  })

  it("avisa que o servidor está fora do ar em vez de falhar em silêncio", async () => {
    servidor.use(http.post(`${urlDaApi}/auth/login`, () => HttpResponse.error()))
    const { autenticar, ApiError } = await carregarClienteLimpo()

    const erro = await autenticar("33333333333", "senha").catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ApiError)
    expect((erro as InstanceType<typeof ApiError>).status).toBe(0)
    expect((erro as Error).message).toMatch(/backend está em execução/i)
  })
})

describe("obterSessao", () => {
  it("renova o token e confirma a identidade em /me", async () => {
    const { obterSessao } = await carregarClienteLimpo()

    const sessao = await obterSessao()

    expect(sessao?.usuario.email).toBe(sessaoServidor.user.email)
  })

  it("devolve null quando a renovação falha, sem vazar exceção para a tela", async () => {
    servidor.use(
      http.post(`${urlDaApi}/auth/refresh`, () =>
        HttpResponse.json(problema(401, "Refresh token inválido"), { status: 401 }),
      ),
    )
    const { obterSessao } = await carregarClienteLimpo()

    await expect(obterSessao()).resolves.toBeNull()
  })

  it("renova uma única vez quando duas chamadas concorrem com o token vencido", async () => {
    let refreshes = 0
    servidor.use(
      http.post(`${urlDaApi}/auth/refresh`, async () => {
        refreshes += 1
        await new Promise((r) => setTimeout(r, 20))
        return HttpResponse.json(autenticacao)
      }),
    )
    const { obterSessao } = await carregarClienteLimpo()

    await Promise.all([obterSessao(), obterSessao()])

    // Sem a deduplicação de `refreshEmAndamento`, cada chamada dispararia o seu
    // refresh — e com token rotativo o segundo invalidaria o primeiro.
    expect(refreshes).toBe(1)
  })

  it("mapeia o administrador geral sem organização", async () => {
    servidor.use(http.get(`${urlDaApi}/me`, () => HttpResponse.json(sessaoAdmin)))
    const { obterSessao } = await carregarClienteLimpo()

    const sessao = await obterSessao()

    expect(sessao?.usuario.perfilAcesso).toBe("admin_geral")
    expect(sessao?.usuario.papel).toBe("admin_lahhm")
    expect(sessao?.prefeitura).toBeNull()
  })
})

describe("requisição autenticada", () => {
  it("repete uma única vez após 401 e desiste no segundo", async () => {
    let chamadasMe = 0
    servidor.use(
      http.get(`${urlDaApi}/me`, () => {
        chamadasMe += 1
        return HttpResponse.json(problema(401, "Token expirado"), { status: 401 })
      }),
    )
    const { obterSessao } = await carregarClienteLimpo()

    await expect(obterSessao()).resolves.toBeNull()
    // Uma tentativa original + uma repetição. A terceira seria laço infinito.
    expect(chamadasMe).toBe(2)
  })
})

describe("encerrarSessao", () => {
  it("limpa o token mesmo quando o backend recusa o logout", async () => {
    servidor.use(
      http.post(`${urlDaApi}/auth/logout`, () =>
        HttpResponse.json(problema(401, "Sessão já encerrada"), { status: 401 }),
      ),
    )
    const { autenticar, encerrarSessao, obterSessao } = await carregarClienteLimpo()
    await autenticar("33333333333", "senha-correta")

    // Não pode lançar: o usuário clicou em sair, e sair tem que sair.
    await expect(encerrarSessao()).resolves.toBeUndefined()

    servidor.use(
      http.post(`${urlDaApi}/auth/refresh`, () =>
        HttpResponse.json(problema(401, "Sem refresh token"), { status: 401 }),
      ),
    )
    await expect(obterSessao()).resolves.toBeNull()
  })

  it("propaga falha inesperada do logout", async () => {
    servidor.use(
      http.post(`${urlDaApi}/auth/logout`, () =>
        HttpResponse.json(problema(500, "Falha interna"), { status: 500 }),
      ),
    )
    const { autenticar, encerrarSessao } = await carregarClienteLimpo()
    await autenticar("33333333333", "senha-correta")

    await expect(encerrarSessao()).rejects.toThrow(/Falha interna/)
  })
})

describe("recuperação de senha", () => {
  it("aceita a solicitação sem revelar se o e-mail existe", async () => {
    const { solicitarRedefinicao } = await carregarClienteLimpo()

    await expect(solicitarRedefinicao("maria.costa@ecoporanga.es.gov.br")).resolves.toBeUndefined()
  })

  it("conclui a redefinição com token válido", async () => {
    const { redefinirSenha } = await carregarClienteLimpo()

    await expect(redefinirSenha("token-do-email", "NovaSenha!2026")).resolves.toBeUndefined()
  })

  it("informa o motivo quando o token expirou", async () => {
    servidor.use(
      http.post(`${urlDaApi}/auth/password-reset`, () =>
        HttpResponse.json(problema(400, "Token expirado ou já utilizado.", "reset-token-invalid"), { status: 400 }),
      ),
    )
    const { redefinirSenha, ApiError } = await carregarClienteLimpo()

    const erro = await redefinirSenha("token-velho", "NovaSenha!2026").catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ApiError)
    expect((erro as InstanceType<typeof ApiError>).code).toBe("reset-token-invalid")
  })
})

describe("tenant sintetizado (ponte temporária)", () => {
  it("documenta os campos que o backend ainda não expõe", async () => {
    const { autenticar } = await carregarClienteLimpo()

    const { prefeitura } = await autenticar("33333333333", "senha-correta")

    // Estes valores são fabricados por `tenantDa()` porque o endpoint de
    // organização ainda não devolve configuração. Quando passar a devolver, este
    // teste falha — que é o objetivo: a ponte não pode sumir sem alguém notar.
    expect(prefeitura?.secretarias).toEqual([])
    expect(prefeitura?.pca.arquivo).toBeNull()
    expect(prefeitura?.pca.itensIndexados).toBe(0)
    expect(prefeitura?.logoDataUrl).toBeNull()
  })
})
