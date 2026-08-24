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

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe("endereço da API", () => {
  it("usa o que a configuração informa, sem barra no fim", async () => {
    let recebida = ""
    vi.stubEnv("NEXT_PUBLIC_API_URL", "https://api.geradocs.example/v1/")
    servidor.use(
      http.post("https://api.geradocs.example/v1/auth/login", ({ request }) => {
        recebida = request.url
        return HttpResponse.json(autenticacao)
      }),
    )
    const { autenticar } = await carregarClienteLimpo()

    await autenticar("33333333333", "senha-correta")

    // A barra sobrando produziria "//auth/login": alguns servidores respondem,
    // outros devolvem 404, e o erro aparece só no ambiente publicado.
    expect(recebida).toBe("https://api.geradocs.example/v1/auth/login")
  })

  it("cai no localhost quando nada está configurado", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", undefined)
    const { autenticar } = await carregarClienteLimpo()
    const espiao = vi.spyOn(globalThis, "fetch")

    await autenticar("33333333333", "senha-correta")

    // É o padrão de desenvolvimento: sem ele, rodar o front local exigiria
    // configurar variável antes do primeiro `npm run dev`.
    expect(String(espiao.mock.calls[0]?.[0])).toBe("http://localhost:8080/api/v1/auth/login")
    espiao.mockRestore()
  })
})

describe("obterSessao", () => {
  it("com token em memória, não renova antes de consultar", async () => {
    let renovacoes = 0
    servidor.use(
      http.post(`${urlDaApi}/auth/refresh`, () => {
        renovacoes += 1
        return HttpResponse.json(autenticacao)
      }),
    )
    const { autenticar, obterSessao } = await carregarClienteLimpo()
    await autenticar("33333333333", "senha-correta")

    const sessao = await obterSessao()

    // Renovar a cada leitura de sessão rotacionaria o refresh token à toa e
    // dobraria as idas ao servidor em toda navegação.
    expect(sessao?.usuario.nome).toBe("Maria Costa Andrade")
    expect(renovacoes).toBe(0)
  })

  it("sem token em memória, renova antes de consultar", async () => {
    let renovacoes = 0
    servidor.use(
      http.post(`${urlDaApi}/auth/refresh`, () => {
        renovacoes += 1
        return HttpResponse.json(autenticacao)
      }),
    )
    const { obterSessao } = await carregarClienteLimpo()

    // É o caso do recarregamento de página: o token vive em memória e se perde,
    // mas o cookie de refresh sobrevive — é ele que devolve a sessão.
    expect((await obterSessao())?.usuario.nome).toBe("Maria Costa Andrade")
    expect(renovacoes).toBe(1)
  })
})

describe("autenticar", () => {
  it("mapeia a sessão do backend para o modelo da interface", async () => {
    const { autenticar } = await carregarClienteLimpo()

    const sessao = await autenticar("33333333333", "senha-correta")

    expect(sessao.usuario.nome).toBe("Maria Costa Andrade")
    expect(sessao.usuario.primeiroNome).toBe("Maria")
    expect(sessao.usuario.iniciais).toBe("MA")
    expect(sessao.usuario.perfilAcesso).toBe("servidor")
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
    await expect(autenticar("33333333333", "errada")).rejects.toThrow("CPF ou senha inválida.")
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

describe("respostas malformadas", () => {
  it("não quebra quando o corpo de erro não é JSON válido", async () => {
    servidor.use(
      http.post(`${urlDaApi}/auth/login`, () =>
        new HttpResponse("<html>erro do proxy</html>", {
          status: 502,
          headers: { "content-type": "application/json" },
        }),
      ),
    )
    const { autenticar } = await carregarClienteLimpo()

    // Um proxy no meio do caminho devolve HTML com content-type de JSON. Sem o
    // tratamento, o erro exibido seria de parse, escondendo o 502.
    await expect(autenticar("33333333333", "senha")).rejects.toThrow("CPF ou senha inválida.")
  })

  it("usa a mensagem padrão quando o erro vem sem corpo JSON", async () => {
    servidor.use(
      http.post(`${urlDaApi}/auth/refresh`, () =>
        new HttpResponse("Bad Gateway", { status: 502, headers: { "content-type": "text/plain" } }),
      ),
    )
    const { obterSessao } = await carregarClienteLimpo()

    // Gateway e balanceador respondem texto puro. Sem a checagem de
    // content-type, tentar interpretar como JSON trocaria o 502 por um erro de
    // parse — e o motivo real sumiria.
    await expect(obterSessao()).rejects.toThrow("Não foi possível concluir a solicitação.")
  })

  it("recusa sessão sem usuário identificado", async () => {
    servidor.use(
      http.post(`${urlDaApi}/auth/login`, () =>
        HttpResponse.json({ ...autenticacao, session: { ...sessaoServidor, user: undefined } }),
      ),
    )
    const { autenticar, ApiError } = await carregarClienteLimpo()

    const erro = await autenticar("33333333333", "senha-correta").catch((e: unknown) => e)

    // Seguir com campos vazios criaria uma sessão anônima que parece válida.
    expect(erro).toBeInstanceOf(ApiError)
    expect((erro as InstanceType<typeof ApiError>).status).toBe(502)
  })

  it("avisa quando o servidor cai no meio de uma requisição autenticada", async () => {
    servidor.use(http.get(`${urlDaApi}/me`, () => HttpResponse.error()))
    const { obterSessao, ApiError } = await carregarClienteLimpo()

    const erro = await obterSessao().catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ApiError)
    expect((erro as InstanceType<typeof ApiError>).status).toBe(0)
  })

  it("propaga erro do servidor que não seja de autorização", async () => {
    servidor.use(
      http.get(`${urlDaApi}/me`, () => HttpResponse.json(problema(500, "Falha interna"), { status: 500 })),
    )
    const { obterSessao } = await carregarClienteLimpo()

    // 500 não é "não autenticado": tratar como tal deslogaria a pessoa por causa
    // de um defeito passageiro do servidor.
    await expect(obterSessao()).rejects.toThrow(/Falha interna/)
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

describe("campos que o contrato declara como opcionais", () => {
  it("preenche o que é opcional no contrato, e só isso", async () => {
    // CPF de cadastro pendente, cargo, matrícula e último acesso são de fato
    // opcionais. A ausência vira vazio para não exibir "undefined" na tela.
    servidor.use(
      http.post(`${urlDaApi}/auth/login`, () =>
        HttpResponse.json({
          ...autenticacao,
          session: {
            user: {
              id: sessaoServidor.user.id,
              name: "Maria Costa Andrade",
              email: "maria@ecoporanga.es.gov.br",
              profileAccess: "SERVIDOR",
              status: "PENDING_ACTIVATION",
            },
            organization: { id: "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d" },
            permissions: [],
          },
        }),
      ),
    )
    const { autenticar } = await carregarClienteLimpo()

    const sessao = await autenticar("33333333333", "senha-correta")

    expect(sessao.usuario.cpf).toBe("")
    expect(sessao.usuario.cargo).toBe("")
    expect(sessao.usuario.ultimoAcesso).toBe("")
    expect(sessao.usuario.ativo).toBe(false)
    expect(sessao.prefeitura?.orgao).toBe("")
  })

  it("recusa sessão sem perfil de acesso em vez de assumir um", async () => {
    servidor.use(
      http.get(`${urlDaApi}/me`, () =>
        HttpResponse.json({
          user: {
            id: sessaoServidor.user.id,
            name: "Maria Costa Andrade",
            email: "maria@ecoporanga.es.gov.br",
            status: "ACTIVE",
          },
          organization: null,
          activeMembership: null,
        }),
      ),
    )
    const { obterSessao, ApiError } = await carregarClienteLimpo()

    const erro = await obterSessao().catch((e: unknown) => e)

    // Assumir "servidor" parecia prudente, mas escondia servidor quebrado: a
    // pessoa entraria com menos acesso do que tem e abriria chamado de
    // permissão. O contrato declara o perfil como obrigatório desde 21/08/2026.
    expect(erro).toBeInstanceOf(ApiError)
    expect((erro as InstanceType<typeof ApiError>).status).toBe(502)
  })

  it("recusa autenticação que volta sem sessão", async () => {
    servidor.use(
      http.post(`${urlDaApi}/auth/login`, () => HttpResponse.json({ accessToken: "t", tokenType: "Bearer" })),
    )
    const { autenticar, ApiError } = await carregarClienteLimpo()

    const erro = await autenticar("33333333333", "senha-correta").catch((e: unknown) => e)

    expect(erro).toBeInstanceOf(ApiError)
    expect((erro as InstanceType<typeof ApiError>).status).toBe(502)
  })

  it("trata renovação que volta sem token", async () => {
    servidor.use(
      http.post(`${urlDaApi}/auth/refresh`, () => HttpResponse.json({ tokenType: "Bearer", session: sessaoServidor })),
      http.get(`${urlDaApi}/me`, () => HttpResponse.json(problema(401, "Sem token"), { status: 401 })),
    )
    const { obterSessao } = await carregarClienteLimpo()

    await expect(obterSessao()).resolves.toBeNull()
  })

  it("não quebra quando a resposta de erro vem sem content-type", async () => {
    servidor.use(
      http.get(`${urlDaApi}/me`, () => new HttpResponse(null, { status: 503 })),
    )
    const { obterSessao } = await carregarClienteLimpo()

    await expect(obterSessao()).rejects.toThrow("Não foi possível concluir a solicitação.")
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
    expect(prefeitura?.logoDataUrl).toBeNull()
    // O PCA saiu daqui no 10.5: ele é do módulo `pca` e vem indexado do
    // servidor, e não um `itensIndexados: 0` fabricado na ponte.
    expect(prefeitura).not.toHaveProperty("pca")
  })
})

/** Ver a nota do gitleaks em `TrocaDeSenhaObrigatoria.test.tsx`. */
const PROVISORIA = "provisoria-16-chars"
const ESCOLHIDA = "EscolhidaPorMim2026"

describe("trocarPropriaSenha", () => {
  it("troca a senha e devolve a sessão já liberada", async () => {
    let corpo: Record<string, unknown> | undefined
    servidor.use(
      http.post(`${urlDaApi}/auth/refresh`, () => HttpResponse.json(autenticacao)),
      http.post(`${urlDaApi}/auth/password-change`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json({
          ...sessaoServidor,
          user: { ...sessaoServidor.user, passwordChangeRequired: false },
        })
      }),
    )
    const { trocarPropriaSenha } = await carregarClienteLimpo()

    const sessao = await trocarPropriaSenha(PROVISORIA, ESCOLHIDA)

    expect(corpo).toEqual({
      currentPassword: PROVISORIA,
      newPassword: ESCOLHIDA,
    })
    // Sessão liberada na mesma resposta: o marcador é lido do banco a cada
    // requisição, então o token que a pessoa já tem passa a valer para tudo.
    expect(sessao.usuario.precisaTrocarSenha).toBe(false)
  })
})
