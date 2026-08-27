import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as api from "@/lib/api/client"
import * as hooks from "@/lib/api/hooks"
import { chaves } from "@/lib/api/hooks"

/**
 * Os hooks não são invólucro burro do TanStack Query.
 *
 * O que eles decidem é **o que fica velho quando algo muda** — e essa é uma
 * regra de produto, não de biblioteca. Citar o PCA grava texto no documento, e
 * por isso precisa invalidar as seções e o corpo; separar essas invalidações
 * deixaria a tela mostrando uma estrutura e o corpo de outra.
 *
 * Ficaram fora do gate de cobertura até 22/08/2026, sob a justificativa de que
 * "testá-los mediria o TanStack, não o produto". A justificativa envelheceu: as
 * escolhas de invalidação se acumularam e nenhuma estava verificada.
 */
vi.mock("@/lib/api/client", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/api/client")>()
  return Object.fromEntries(
    Object.keys(real).map((nome) => [nome, vi.fn()]),
  ) as unknown as typeof import("@/lib/api/client")
})

const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"
const ENTIDADE = "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d"

function ambiente() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  const invalidou = vi.spyOn(queryClient, "invalidateQueries")
  const gravou = vi.spyOn(queryClient, "setQueryData")
  const limpou = vi.spyOn(queryClient, "clear")
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return { queryClient, invalidou, gravou, limpou, wrapper }
}

/** As chaves que a mutação mandou recarregar, em texto comparável. */
function invalidadas(invalidou: { mock: { calls: unknown[][] } }) {
  return invalidou.mock.calls.map((chamada) =>
    JSON.stringify((chamada[0] as { queryKey?: unknown } | undefined)?.queryKey ?? null),
  )
}

/**
 * As mutações têm entradas e saídas diferentes; o teste só precisa de `mutate`.
 * Sem este apontamento, cada laço vira uma união que o compilador não aceita.
 */
type Mutacao = { mutate: (entrada: never) => void; isError: boolean }

const comoMutacao = (usar: () => unknown) => usar as () => Mutacao

const chave = (valor: unknown) => JSON.stringify(valor)

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("consultas: cada uma pede ao servidor o que a sua chave promete", () => {
  const consultas: Array<[string, () => unknown, unknown, keyof typeof api]> = [
    ["useSessao", () => hooks.useSessao(), chaves.sessao, "getSessao"],
    ["useEstatisticas", () => hooks.useEstatisticas(), chaves.estatisticas, "getEstatisticas"],
    ["useProcessos", () => hooks.useProcessos(), chaves.processos({}), "getProcessos"],
    ["useProcesso", () => hooks.useProcesso(PROCESSO), chaves.processo(PROCESSO), "getProcesso"],
    ["useParecerDFD", () => hooks.useParecerDFD(PROCESSO), chaves.parecerDFD(PROCESSO), "getParecerDFD"],
    ["useSecoes", () => hooks.useSecoes(PROCESSO, "ETP"), chaves.secoes(PROCESSO, "ETP"), "getSecoes"],
    ["useDocumentos", () => hooks.useDocumentos(), chaves.documentos, "getDocumentos"],
    [
      "useResumoDocumentos",
      () => hooks.useResumoDocumentos(),
      chaves.resumoDocumentos,
      "getResumoDocumentos",
    ],
    [
      "useHistoricoVersoes",
      () => hooks.useHistoricoVersoes(PROCESSO, "ETP"),
      chaves.historicoVersoes(PROCESSO, "ETP"),
      "getHistoricoVersoes",
    ],
    [
      "useCorpoDocumento",
      () => hooks.useCorpoDocumento(PROCESSO, "ETP"),
      ["corpo-documento", PROCESSO, "ETP"],
      "getCorpoDocumento",
    ],
    [
      "useVersoesComTexto",
      () => hooks.useVersoesComTexto(PROCESSO, "ETP"),
      ["versoes-com-texto", PROCESSO, "ETP"],
      "getVersoesComTexto",
    ],
    [
      "useConsolidacaoDaDemanda",
      () => hooks.useConsolidacaoDaDemanda(PROCESSO),
      ["consolidacao-demanda", PROCESSO],
      "getConsolidacaoDaDemanda",
    ],
    [
      "useComparacaoDeVersoes",
      () => hooks.useComparacaoDeVersoes(PROCESSO, "ETP", 1, 2),
      ["comparacao-versoes", PROCESSO, "ETP", 1, 2],
      "compararVersoes",
    ],
    ["useEntidades", () => hooks.useEntidades(), chaves.entidades, "getEntidades"],
    [
      "useConfigTenant",
      () => hooks.useConfigTenant(ENTIDADE),
      chaves.tenant(ENTIDADE),
      "getConfigTenant",
    ],
    ["useUsuarios", () => hooks.useUsuarios(ENTIDADE), chaves.usuarios(ENTIDADE, ""), "getUsuarios"],
  ]

  it.each(consultas)("%s", async (_nome, usar, chaveEsperada, fn) => {
    const { queryClient, wrapper } = ambiente()
    vi.mocked(api[fn] as unknown as ReturnType<typeof vi.fn>).mockResolvedValue("ok")

    renderHook(comoMutacao(usar), { wrapper })

    await waitFor(() => expect(api[fn]).toHaveBeenCalled())
    expect(queryClient.getQueryData(chaveEsperada as readonly unknown[])).toBe("ok")
  })
})

describe("consultas que só disparam quando têm o que perguntar", () => {
  const desligadas: Array<[string, () => unknown, keyof typeof api]> = [
    ["useProcesso sem id", () => hooks.useProcesso(""), "getProcesso"],
    ["useParecerDFD sem id", () => hooks.useParecerDFD(""), "getParecerDFD"],
    ["useSecoes sem id", () => hooks.useSecoes("", "ETP"), "getSecoes"],
    ["useCorpoDocumento sem id", () => hooks.useCorpoDocumento("", "ETP"), "getCorpoDocumento"],
    ["useVersoesComTexto sem id", () => hooks.useVersoesComTexto("", "ETP"), "getVersoesComTexto"],
    ["useHistoricoVersoes sem id", () => hooks.useHistoricoVersoes("", "ETP"), "getHistoricoVersoes"],
    [
      "useConsolidacaoDaDemanda sem id",
      () => hooks.useConsolidacaoDaDemanda(""),
      "getConsolidacaoDaDemanda",
    ],
    [
      "useComparacaoDeVersoes sem as duas versões",
      () => hooks.useComparacaoDeVersoes(PROCESSO, "ETP", 1, null),
      "compararVersoes",
    ],
    [
      "usePrevisaoNoPca sem id",
      () => hooks.usePrevisaoNoPca("", "ETP"),
      "getVerificacaoPca",
    ],
  ]

  it.each(desligadas)("%s não chama o servidor", async (_nome, usar, fn) => {
    const { wrapper } = ambiente()

    renderHook(comoMutacao(usar), { wrapper })

    // Pedir a comparação antes de escolher as duas versões traria um 400 a cada
    // abertura de painel — e o erro apareceria para quem não fez nada errado.
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(api[fn]).not.toHaveBeenCalled()
  })
})

describe("sessão", () => {
  it("entrar guarda a sessão e recarrega tudo no escopo do novo usuário", async () => {
    const { wrapper, gravou, invalidou } = ambiente()
    const sessao = { usuario: { id: "u1", perfilAcesso: "servidor" } }
    vi.mocked(api.login).mockResolvedValue(sessao as never)

    const { result } = renderHook(() => hooks.useLogin(), { wrapper })
    result.current.mutate({ identificador: "333", senha: "s" })

    await waitFor(() => expect(api.login).toHaveBeenCalledWith("333", "s"))
    await waitFor(() => expect(gravou).toHaveBeenCalledWith(chaves.sessao, sessao))
    // Sem invalidar tudo, a lista do usuário anterior continuaria na tela.
    expect(invalidou).toHaveBeenCalledWith()
  })

  it("sair zera a sessão e limpa o cache inteiro", async () => {
    const { wrapper, gravou, limpou } = ambiente()
    vi.mocked(api.logout).mockResolvedValue(undefined)

    const { result } = renderHook(() => hooks.useLogout(), { wrapper })
    result.current.mutate()

    // Invalidar não bastaria: os dados do usuário anterior seguiriam em memória
    // até a próxima consulta responder.
    await waitFor(() => expect(limpou).toHaveBeenCalled())
    expect(gravou).toHaveBeenCalledWith(chaves.sessao, null)
  })

  it("o perfil sai da sessão, e é indefinido enquanto ela não chega", async () => {
    const { wrapper } = ambiente()
    vi.mocked(api.getSessao).mockResolvedValue(undefined as never)

    const semSessao = renderHook(() => hooks.usePerfil(), { wrapper })
    expect(semSessao.result.current).toBeUndefined()

    const outro = ambiente()
    vi.mocked(api.getSessao).mockResolvedValue({
      usuario: { perfilAcesso: "coordenador" },
    } as never)
    const comSessao = renderHook(() => hooks.usePerfil(), { wrapper: outro.wrapper })
    await waitFor(() => expect(comSessao.result.current).toBe("coordenador"))
  })

  const doPerfil: Array<[string, () => { mutate: (v: never) => void }, never, keyof typeof api]> = [
    ["useRecuperarSenha", () => hooks.useRecuperarSenha(), "a@b.gov.br" as never, "recuperarSenha"],
    [
      "useRedefinirSenha",
      () => hooks.useRedefinirSenha(),
      { token: "t", senha: "s" } as never,
      "resetarSenha",
    ],
  ]

  it.each(doPerfil)("%s repassa o que a tela informou", async (_nome, usar, entrada, fn) => {
    const { wrapper } = ambiente()
    vi.mocked(api[fn] as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(undefined)

    const { result } = renderHook(comoMutacao(usar), { wrapper })
    result.current.mutate(entrada)

    await waitFor(() => expect(api[fn]).toHaveBeenCalled())
  })

  it("trocar a própria senha grava a sessão nova sem recarregar tudo", async () => {
    const sessao = { usuario: { id: "u1", precisaTrocarSenha: false } }
    const { wrapper, gravou } = ambiente()
    vi.mocked(api.trocarPropriaSenha).mockResolvedValue(sessao as never)

    const { result } = renderHook(() => hooks.useTrocarPropriaSenha(), { wrapper })
    result.current.mutate({ atual: "a-que-veio", nova: "a-que-escolhi" })

    // Gravar em vez de invalidar: a resposta já traz o usuário sem o marcador,
    // e invalidar faria o aviso de senha provisória piscar de volta.
    await waitFor(() => expect(gravou).toHaveBeenCalledWith(chaves.sessao, sessao))
  })
})

describe("processo: o que fica velho quando ele muda", () => {
  it("criar recarrega a listagem e os indicadores", async () => {
    const { wrapper, invalidou } = ambiente()
    vi.mocked(api.criarProcesso).mockResolvedValue({ id: PROCESSO } as never)

    const { result } = renderHook(() => hooks.useCriarProcesso(), { wrapper })
    result.current.mutate({ objeto: "Papel" } as never)

    await waitFor(() => expect(invalidadas(invalidou)).toContain(chave(["processos"])))
    expect(invalidadas(invalidou)).toContain(chave(chaves.estatisticas))
  })

  it("editar grava o processo em cache e recarrega só a listagem", async () => {
    const { wrapper, invalidou, gravou } = ambiente()
    const processo = { id: PROCESSO }
    vi.mocked(api.atualizarProcesso).mockResolvedValue(processo as never)

    const { result } = renderHook(() => hooks.useAtualizarProcesso(), { wrapper })
    result.current.mutate({ id: PROCESSO, objeto: "Papel A4" })

    // Gravar em vez de invalidar evita a ida e volta que faria a tela piscar
    // com o valor antigo antes de mostrar o novo.
    await waitFor(() => expect(gravou).toHaveBeenCalledWith(chaves.processo(PROCESSO), processo))
    expect(invalidadas(invalidou)).toContain(chave(["processos"]))
  })

  it("encerrar e reabrir recarregam listagem, processo e indicadores", async () => {
    for (const [usar, entrada, fn] of [
      [() => hooks.useEncerrarProcesso(), { processoId: PROCESSO }, "encerrarProcesso"],
      [
        () => hooks.useReabrirProcesso(),
        { processoId: PROCESSO, motivo: "Retificar o ETP." },
        "reabrirProcesso",
      ],
    ] as const) {
      const { wrapper, invalidou } = ambiente()
      vi.mocked(api[fn] as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: PROCESSO })

      const { result } = renderHook(comoMutacao(usar), { wrapper })
      result.current.mutate(entrada as never)

      await waitFor(() =>
        expect(invalidadas(invalidou)).toContain(chave(chaves.processo(PROCESSO))),
      )
      expect(invalidadas(invalidou)).toContain(chave(["processos"]))
      expect(invalidadas(invalidou)).toContain(chave(chaves.estatisticas))
    }
  })

  it("encerrar sem justificativa manda string vazia, e não indefinido", async () => {
    const { wrapper } = ambiente()
    vi.mocked(api.encerrarProcesso).mockResolvedValue({ id: PROCESSO } as never)

    const { result } = renderHook(() => hooks.useEncerrarProcesso(), { wrapper })
    result.current.mutate({ processoId: PROCESSO })

    await waitFor(() => expect(api.encerrarProcesso).toHaveBeenCalledWith(PROCESSO, ""))
  })

  it("analisar o DFD grava o parecer no lugar de recarregá-lo", async () => {
    const { wrapper, gravou } = ambiente()
    const parecer = { processoId: PROCESSO }
    vi.mocked(api.analisarDFD).mockResolvedValue(parecer as never)

    const { result } = renderHook(() => hooks.useAnalisarDFD(PROCESSO), { wrapper })
    result.current.mutate("dfd.pdf")

    await waitFor(() =>
      expect(gravou).toHaveBeenCalledWith(chaves.parecerDFD(PROCESSO), parecer),
    )
  })
})

describe("documento: seções, estrutura e geração", () => {
  it("salvar e gerar seção recarregam as seções do documento", async () => {
    for (const [usar, entrada, fn] of [
      [
        () => hooks.useAtualizarSecao(PROCESSO, "ETP"),
        { secaoId: "1", conteudo: "texto" },
        "atualizarSecao",
      ],
      [() => hooks.useGerarSecao(PROCESSO, "ETP"), "1", "gerarSecao"],
    ] as const) {
      const { wrapper, invalidou } = ambiente()
      vi.mocked(api[fn] as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "1" })

      const { result } = renderHook(comoMutacao(usar), { wrapper })
      result.current.mutate(entrada as never)

      await waitFor(() =>
        expect(invalidadas(invalidou)).toContain(chave(chaves.secoes(PROCESSO, "ETP"))),
      )
    }
  })

  it("salvar seção repassa processo e tipo, que a tela não precisa repetir", async () => {
    const { wrapper } = ambiente()
    vi.mocked(api.atualizarSecao).mockResolvedValue({ id: "1" } as never)

    const { result } = renderHook(() => hooks.useAtualizarSecao(PROCESSO, "ETP"), { wrapper })
    result.current.mutate({ secaoId: "2", conteudo: "texto", justificativaDispensa: "não se aplica" })

    await waitFor(() =>
      expect(api.atualizarSecao).toHaveBeenCalledWith({
        processoId: PROCESSO,
        tipo: "ETP",
        secaoId: "2",
        conteudo: "texto",
        justificativaDispensa: "não se aplica",
      }),
    )
  })

  it("acrescentar, excluir e reordenar invalidam as mesmas consultas", async () => {
    const acoes = ["acrescentar", "excluir", "reordenar"] as const
    const entradas = [
      { titulo: "Memória de cálculo", ancora: "4", subtopico: true },
      "4.1",
      ["4.1", "4.2"],
    ]
    const funcoes = [
      "acrescentarSecaoDoDocumento",
      "excluirSecaoDoDocumento",
      "reordenarSecoesDoDocumento",
    ] as const

    for (let i = 0; i < acoes.length; i += 1) {
      const { wrapper, invalidou } = ambiente()
      vi.mocked(api[funcoes[i]!] as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({})

      const { result } = renderHook(() => hooks.useEstruturaDoDocumento(PROCESSO, "ETP"), { wrapper })
      result.current[acoes[i]!].mutate(entradas[i] as never)

      // Separar as invalidações deixaria a tela mostrando uma estrutura e o
      // corpo de outra.
      await waitFor(() =>
        expect(invalidadas(invalidou)).toContain(chave(chaves.secoes(PROCESSO, "ETP"))),
      )
      expect(invalidadas(invalidou)).toContain(chave(["corpo-documento"]))
      expect(api[funcoes[i]!]).toHaveBeenCalled()
    }
  })

  it("gerar o documento recarrega tudo que depende dele", async () => {
    const { wrapper, invalidou } = ambiente()
    vi.mocked(api.gerarDocumento).mockResolvedValue({ id: "d1" } as never)

    const { result } = renderHook(() => hooks.useGerarDocumento(), { wrapper })
    result.current.mutate({ processoId: PROCESSO, tipo: "ETP" } as never)

    await waitFor(() => expect(invalidadas(invalidou)).toContain(chave(chaves.documentos)))
    // A geração muda o acervo, o resumo, os indicadores, a listagem, as seções,
    // as versões e o corpo. Esquecer um deixa uma tela contando outra história.
    for (const esperada of [
      chaves.resumoDocumentos,
      chaves.estatisticas,
      ["processos"],
      ["secoes"],
      ["versoes"],
      ["corpo-documento"],
      ["versoes-com-texto"],
      chaves.processo(PROCESSO),
    ]) {
      expect(invalidadas(invalidou)).toContain(chave(esperada))
    }
  })
})

describe("previsão no PCA", () => {
  it("marcar recarrega só a verificação", async () => {
    const { wrapper, invalidou } = ambiente()
    vi.mocked(api.declararPrevisaoNoPca).mockResolvedValue({} as never)

    const { result } = renderHook(() => hooks.usePrevisaoNoPca(PROCESSO, "ETP"), { wrapper })
    result.current.marcar.mutate({ codigo: "2026-0142" })

    await waitFor(() =>
      expect(invalidadas(invalidou)).toContain(chave(["previsao-pca", PROCESSO])),
    )
    expect(invalidadas(invalidou)).not.toContain(chave(chaves.secoes(PROCESSO, "ETP")))
  })

  it("citar recarrega também as seções e o corpo, porque grava texto no documento", async () => {
    const { wrapper, invalidou } = ambiente()
    vi.mocked(api.citarPcaNaSecao).mockResolvedValue({} as never)

    const { result } = renderHook(() => hooks.usePrevisaoNoPca(PROCESSO, "ETP"), { wrapper })
    result.current.citar.mutate()

    await waitFor(() =>
      expect(invalidadas(invalidou)).toContain(chave(chaves.secoes(PROCESSO, "ETP"))),
    )
    expect(invalidadas(invalidou)).toContain(chave(["corpo-documento"]))
    expect(invalidadas(invalidou)).toContain(chave(["previsao-pca", PROCESSO]))
  })

  it("importar o plano recarrega o plano e as verificações que dependem dele", async () => {
    const { wrapper, invalidou } = ambiente()
    vi.mocked(api.getPlanoPca).mockResolvedValue(null as never)
    vi.mocked(api.importarPlanoPca).mockResolvedValue({ ano: 2026 } as never)

    const { result } = renderHook(() => hooks.usePlanoPca(), { wrapper })
    await waitFor(() => expect(api.getPlanoPca).toHaveBeenCalled())
    result.current.importar.mutate({ ano: 2026, arquivo: "pca.csv", conteudo: "1;Papel" })

    await waitFor(() => expect(invalidadas(invalidou)).toContain(chave(["plano-pca"])))
    // Sem isto, a seção do inciso II continuaria dizendo "nenhum PCA anexado"
    // depois de a pessoa anexar um.
    expect(invalidadas(invalidou)).toContain(chave(["previsao-pca"]))
  })
})

describe("cadastros", () => {
  it("mexer em entidade recarrega a lista, e remover recarrega também os usuários", async () => {
    const criar = ambiente()
    vi.mocked(api.criarEntidade).mockResolvedValue({} as never)
    const nova = renderHook(() => hooks.useCriarEntidade(), { wrapper: criar.wrapper })
    nova.result.current.mutate({ nome: "Entidade" } as never)
    await waitFor(() =>
      expect(invalidadas(criar.invalidou)).toContain(chave(chaves.entidades)),
    )

    const remover = ambiente()
    vi.mocked(api.removerEntidade).mockResolvedValue(undefined as never)
    const saiu = renderHook(() => hooks.useRemoverEntidade(), { wrapper: remover.wrapper })
    saiu.result.current.mutate(ENTIDADE)
    // Os usuários da entidade removida saem junto; deixá-los em cache mostraria
    // gente de um órgão que não existe mais.
    await waitFor(() => expect(invalidadas(remover.invalidou)).toContain(chave(["usuarios"])))
    expect(invalidadas(remover.invalidou)).toContain(chave(chaves.entidades))
  })

  it("mexer em usuário recarrega usuários e entidades", async () => {
    for (const [usar, entrada, fn] of [
      [() => hooks.useCriarUsuario(), { nome: "Maria" }, "criarUsuario"],
      [() => hooks.useAtualizarUsuario(), { id: "u1", nome: "Maria" }, "atualizarUsuario"],
      [() => hooks.useRemoverUsuario(), "u1", "removerUsuario"],
    ] as const) {
      const { wrapper, invalidou } = ambiente()
      vi.mocked(api[fn] as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({})

      const { result } = renderHook(comoMutacao(usar), { wrapper })
      result.current.mutate(entrada as never)

      await waitFor(() => expect(invalidadas(invalidou)).toContain(chave(["usuarios"])))
      // A contagem de servidores aparece no cartão da entidade.
      expect(invalidadas(invalidou)).toContain(chave(chaves.entidades))
    }
  })

  it("salvar a configuração grava o tenant e recarrega a sessão", async () => {
    const { wrapper, invalidou, gravou } = ambiente()
    const tenant = { id: ENTIDADE }
    vi.mocked(api.atualizarConfigTenant).mockResolvedValue(tenant as never)

    const { result } = renderHook(() => hooks.useAtualizarConfigTenant(ENTIDADE), { wrapper })
    result.current.mutate({ timbrado: false })

    await waitFor(() => expect(gravou).toHaveBeenCalledWith(chaves.tenant(ENTIDADE), tenant))
    // A sessão carrega a entidade; sem recarregá-la, a sidebar seguiria com o
    // nome antigo.
    expect(invalidadas(invalidou)).toContain(chave(chaves.sessao))
    expect(invalidadas(invalidou)).toContain(chave(chaves.entidades))
  })

  it("secretaria sem entidade identificada recusa antes de chamar o servidor", async () => {
    for (const usar of [
      () => hooks.useCriarSecretaria(undefined),
      () => hooks.useRemoverSecretaria(undefined),
    ]) {
      const { wrapper } = ambiente()
      const { result } = renderHook(comoMutacao(usar), { wrapper })
      result.current.mutate("Secretaria de Compras" as never)

      // Mandar sem entidade criaria a secretaria no órgão errado, ou em
      // nenhum — e o erro só apareceria depois, na lista.
      await waitFor(() => expect(result.current.isError).toBe(true))
      expect(api.criarSecretaria).not.toHaveBeenCalled()
      expect(api.removerSecretaria).not.toHaveBeenCalled()
    }
  })

  it("secretaria com entidade recarrega a configuração daquele órgão", async () => {
    for (const [usar, entrada, fn] of [
      [() => hooks.useCriarSecretaria(ENTIDADE), "Secretaria de Compras", "criarSecretaria"],
      [() => hooks.useRemoverSecretaria(ENTIDADE), "s1", "removerSecretaria"],
    ] as const) {
      const { wrapper, invalidou } = ambiente()
      vi.mocked(api[fn] as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({})

      const { result } = renderHook(comoMutacao(usar), { wrapper })
      result.current.mutate(entrada as never)

      await waitFor(() =>
        expect(invalidadas(invalidou)).toContain(chave(chaves.tenant(ENTIDADE))),
      )
    }
  })

  it("a busca de usuários espera a digitação parar", async () => {
    vi.useFakeTimers()
    const { wrapper } = ambiente()
    vi.mocked(api.getUsuarios).mockResolvedValue([] as never)

    const { rerender } = renderHook(({ busca }) => hooks.useUsuarios(ENTIDADE, busca), {
      wrapper,
      initialProps: { busca: "M" },
    })
    rerender({ busca: "MA" })
    rerender({ busca: "MAT-4471" })

    // Sem o adiamento, "MAT-4471" dispararia oito requisições e a última
    // resposta a chegar poderia não ser a do último termo.
    expect(api.getUsuarios).not.toHaveBeenCalledWith(ENTIDADE, "MAT-4471")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400)
    })
    expect(api.getUsuarios).toHaveBeenCalledWith(ENTIDADE, "MAT-4471")
  })
})

describe("chaves", () => {
  it("entidade ausente vira “sessao” e “todos”, e não undefined na chave", () => {
    // `["tenant", undefined]` e `["tenant", "sessao"]` seriam caches diferentes
    // para a mesma coisa, e um deles nunca seria invalidado.
    expect(chaves.tenant()).toEqual(["tenant", "sessao"])
    expect(chaves.usuarios()).toEqual(["usuarios", "todos", ""])
    expect(chaves.usuarios(ENTIDADE, "maria")).toEqual(["usuarios", ENTIDADE, "maria"])
  })
})

describe("configuração do órgão: de quem é a entidade", () => {
  const DA_SESSAO = "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d"

  it("sem id, consulta a entidade da sessão", async () => {
    const { wrapper } = ambiente()
    vi.mocked(api.getSessao).mockResolvedValue({
      usuario: { id: "u1" },
      entidade: { id: DA_SESSAO },
    } as never)
    vi.mocked(api.getConfigTenant).mockResolvedValue({ id: DA_SESSAO } as never)

    renderHook(() => hooks.useConfigTenant(), { wrapper })

    // O `enabled` exigia um id vindo da tela. As telas que dependem da
    // entidade da própria pessoa chamam sem id — e o seletor de secretaria
    // ficava vazio para sempre, sem erro nenhum aparecer.
    await waitFor(() => expect(api.getConfigTenant).toHaveBeenCalledWith(DA_SESSAO))
  })

  it("quem não tem entidade não pergunta nada", async () => {
    const { wrapper } = ambiente()
    vi.mocked(api.getSessao).mockResolvedValue({
      usuario: { id: "u1" },
      entidade: null,
    } as never)

    const { result } = renderHook(
      () => ({ sessao: hooks.useSessao(), tenant: hooks.useConfigTenant() }),
      { wrapper },
    )

    // Administrador geral não tem órgão: não há configuração a consultar até
    // que ele escolha uma.
    await waitFor(() => expect(result.current.sessao.isSuccess).toBe(true))
    expect(api.getConfigTenant).not.toHaveBeenCalled()
  })

  it("id explícito vence o da sessão", async () => {
    const { wrapper } = ambiente()
    vi.mocked(api.getSessao).mockResolvedValue({
      usuario: { id: "u1" },
      entidade: { id: DA_SESSAO },
    } as never)
    vi.mocked(api.getConfigTenant).mockResolvedValue({ id: "outra" } as never)

    renderHook(() => hooks.useConfigTenant("outra"), { wrapper })

    await waitFor(() => expect(api.getConfigTenant).toHaveBeenCalledWith("outra"))
  })

  it("salvar sem entidade identificada é recusado antes de sair da tela", async () => {
    const { wrapper } = ambiente()

    const { result } = renderHook(() => hooks.useAtualizarConfigTenant(undefined), { wrapper })
    result.current.mutate({ nome: "Entidade" })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(api.atualizarConfigTenant).not.toHaveBeenCalled()
  })
})
