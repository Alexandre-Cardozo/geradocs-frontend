import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import * as autenticacao from "@/lib/api/auth-client"
import * as acesso from "@/lib/api/access-client"
import * as contratacao from "@/lib/api/procurement-client"
import * as elaboracao from "@/lib/api/authoring-client"
import * as pca from "@/lib/api/pca-client"
import * as impressao from "@/lib/api/generation-client"

/**
 * A fachada de dados.
 *
 * Ela é fina de propósito — as telas chamam sempre as mesmas funções, e cada
 * bloco troca por baixo o que era mock por chamada real. Justamente por isso o
 * erro que ela comete é **ligar no lugar errado**: `getVerificacaoPca` chamando
 * `planoVigente` compila, passa no tipo, e devolve a coisa errada em silêncio.
 *
 * Ficou fora do gate de cobertura até 22/08/2026, quando 22 das suas funções já
 * falavam com o servidor. A justificativa de que era "o mock encolhendo"
 * envelheceu, e com ela escondia dois defeitos reais: encerrar processo e editar
 * usuário procuravam nas fixtures gente que só existia no servidor.
 */
vi.mock("@/lib/api/auth-client")
vi.mock("@/lib/api/access-client")
vi.mock("@/lib/api/procurement-client")
vi.mock("@/lib/api/authoring-client")
vi.mock("@/lib/api/pca-client")
vi.mock("@/lib/api/generation-client")

const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"
const PREFEITURA = "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d"

function usuario(sobrescrever: Record<string, unknown> = {}) {
  return {
    id: "9f1c1c62-0f1a-4a6e-9a53-2a9f4b7f1a01",
    nome: "Maria Costa Andrade",
    primeiroNome: "Maria",
    iniciais: "MC",
    cpf: "33333333333",
    email: "maria@ecoporanga.es.gov.br",
    cargo: "Servidora de Compras",
    perfilAcesso: "servidor",
    prefeituraId: PREFEITURA,
    avatarDataUrl: null,
    ultimoAcesso: "2026-08-20T14:30:00-03:00",
    ativo: true,
    ...sobrescrever,
  }
}

function sessao(sobrescrever: Record<string, unknown> = {}) {
  return {
    usuario: usuario(sobrescrever),
    prefeitura: { id: PREFEITURA, orgao: "Prefeitura de Ecoporanga" },
  }
}

function processo(sobrescrever: Record<string, unknown> = {}) {
  return {
    id: PROCESSO,
    prefeituraId: PREFEITURA,
    objeto: "Aquisição de material de expediente",
    modalidade: "Pregão Eletrônico",
    documentos: ["ETP", "TR"],
    status: "rascunho",
    versao: 0,
    ...sobrescrever,
  }
}

async function fachadaLimpa() {
  vi.resetModules()
  return import("@/lib/api/client")
}

/** Entra na fachada, que é o que dá contexto de prefeitura ao que sobrou local. */
async function fachadaLogada(comoUsuario = usuario()) {
  const api = await fachadaLimpa()
  vi.mocked(autenticacao.autenticar).mockResolvedValue({
    ...sessao(),
    usuario: comoUsuario,
  } as never)
  await api.login("333.333.333-33", "senha")
  return api
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.resetModules())

describe("a fachada liga cada chamada no lugar certo", () => {
  it.each([
    ["getProcessos", (a: typeof import("@/lib/api/client")) => a.getProcessos({ busca: "papel" }), contratacao.listarProcessos, [{ busca: "papel" }]],
    ["getProcesso", (a) => a.getProcesso(PROCESSO), contratacao.obterProcesso, [PROCESSO]],
    ["criarProcesso", (a) => a.criarProcesso({ objeto: "Papel" } as never), contratacao.criarProcessoReal, [{ objeto: "Papel" }]],
    ["getConsolidacaoDaDemanda", (a) => a.getConsolidacaoDaDemanda(PROCESSO), contratacao.consolidacaoDaDemanda, [PROCESSO]],
    ["getSecoes", (a) => a.getSecoes(PROCESSO, "ETP"), elaboracao.abrirDocumento, [PROCESSO, "ETP"]],
    ["getCorpoDocumento", (a) => a.getCorpoDocumento(PROCESSO, "ETP"), elaboracao.corpoDaVersaoVigente, [PROCESSO, "ETP"]],
    ["getHistoricoVersoes", (a) => a.getHistoricoVersoes(PROCESSO, "ETP"), elaboracao.historicoDeVersoes, [PROCESSO, "ETP"]],
    ["getVersoesComTexto", (a) => a.getVersoesComTexto(PROCESSO, "ETP"), elaboracao.versoesComTexto, [PROCESSO, "ETP"]],
    ["acrescentarSecaoDoDocumento", (a) => a.acrescentarSecaoDoDocumento(PROCESSO, "ETP", "Memória", "4", true), elaboracao.acrescentarSecao, [PROCESSO, "ETP", "Memória", "4", true]],
    ["excluirSecaoDoDocumento", (a) => a.excluirSecaoDoDocumento(PROCESSO, "ETP", "4.1"), elaboracao.excluirSecao, [PROCESSO, "ETP", "4.1"]],
    ["reordenarSecoesDoDocumento", (a) => a.reordenarSecoesDoDocumento(PROCESSO, "ETP", ["4.1"]), elaboracao.reordenarSecoes, [PROCESSO, "ETP", ["4.1"]]],
    ["compararVersoes", (a) => a.compararVersoes(PROCESSO, "ETP", 1, 2), elaboracao.compararVersoes, [PROCESSO, "ETP", 1, 2]],
    ["getVerificacaoPca", (a) => a.getVerificacaoPca(PROCESSO), pca.verificacaoDoProcesso, [PROCESSO]],
    ["declararPrevisaoNoPca", (a) => a.declararPrevisaoNoPca(PROCESSO, { codigo: "2026-1" }), pca.declararPrevisao, [PROCESSO, { codigo: "2026-1" }]],
    ["citarPcaNaSecao", (a) => a.citarPcaNaSecao(PROCESSO), pca.citarNaSecao, [PROCESSO]],
    ["getPlanoPca", (a) => a.getPlanoPca(), pca.planoVigente, []],
    ["importarPlanoPca", (a) => a.importarPlanoPca({ ano: 2026, arquivo: "p.csv", conteudo: "1;P" }), pca.importarPlano, [{ ano: 2026, arquivo: "p.csv", conteudo: "1;P" }]],
    ["getPrefeituras", (a) => a.getPrefeituras(), acesso.listarPrefeituras, []],
    ["criarPrefeitura", (a) => a.criarPrefeitura({ orgao: "P", unidade: "U" }), acesso.criarPrefeitura, [{ orgao: "P", unidade: "U" }]],
    ["removerPrefeitura", (a) => a.removerPrefeitura(PREFEITURA), acesso.desativarPrefeitura, [PREFEITURA]],
    ["getUsuarios", (a) => a.getUsuarios(PREFEITURA, "maria"), acesso.listarUsuarios, [PREFEITURA, "maria"]],
    ["atualizarUsuario", (a) => a.atualizarUsuario({ id: "u1", nome: "Maria" }), acesso.atualizarUsuario, [{ id: "u1", nome: "Maria" }]],
    ["removerUsuario", (a) => a.removerUsuario("u1"), acesso.desativarUsuario, ["u1"]],
    ["criarSecretaria", (a) => a.criarSecretaria(PREFEITURA, "Compras"), acesso.criarDepartamento, [PREFEITURA, "Compras"]],
    ["removerSecretaria", (a) => a.removerSecretaria(PREFEITURA, "s1"), acesso.desativarDepartamento, [PREFEITURA, "s1"]],
    ["recuperarSenha", (a) => a.recuperarSenha("  a@b.gov.br  "), autenticacao.solicitarRedefinicao, ["a@b.gov.br"]],
    ["resetarSenha", (a) => a.resetarSenha("t", "s"), autenticacao.redefinirSenha, ["t", "s"]],
    ["logout", (a) => a.logout(), autenticacao.encerrarSessao, []],
    ["baixarArquivoGerado", (a) => a.baixarArquivoGerado(PROCESSO, "ETP", "arq-1"), impressao.baixarArquivo, [PROCESSO, "ETP", "arq-1"]],
  ] as Array<[string, (a: typeof import("@/lib/api/client")) => Promise<unknown>, unknown, unknown[]]>)(
    "%s",
    async (_nome, chamar, destino, argumentos) => {
      const api = await fachadaLimpa()
      vi.mocked(destino as ReturnType<typeof vi.fn>).mockResolvedValue({ secoes: [] })

      await chamar(api)

      expect(destino).toHaveBeenCalledWith(...argumentos)
    },
  )

  it("criar usuário traduz “secretaria” para o departamento do contrato", async () => {
    const api = await fachadaLimpa()
    vi.mocked(acesso.criarUsuario).mockResolvedValue(usuario() as never)

    await api.criarUsuario({ nome: "Maria", secretaria: "s1" } as never)

    // A tela fala em secretaria; o contrato, em departamento. Trocar os dois de
    // lugar criaria a pessoa sem lotação, e ela não veria processo nenhum.
    expect(acesso.criarUsuario).toHaveBeenCalledWith(
      expect.objectContaining({ departamentoId: "s1" }),
    )
  })
})

describe("sessão", () => {
  it("entrar guarda a sessão, e sair a apaga", async () => {
    const api = await fachadaLimpa()
    vi.mocked(autenticacao.autenticar).mockResolvedValue(sessao() as never)
    vi.mocked(autenticacao.encerrarSessao).mockResolvedValue(undefined)
    vi.mocked(autenticacao.obterSessao).mockResolvedValue(null)

    const entrou = await api.login("333.333.333-33", "senha")
    expect(entrou.usuario.nome).toBe("Maria Costa Andrade")

    await api.logout()
    // Sem sessão guardada, o que ainda é local perde o contexto de prefeitura.
    expect(await api.getSessao()).toBeNull()
  })

  it("consultar a sessão devolve o que o servidor disser", async () => {
    const api = await fachadaLimpa()
    vi.mocked(autenticacao.obterSessao).mockResolvedValue(sessao() as never)

    expect((await api.getSessao())?.usuario.cpf).toBe("33333333333")
  })

  it("mexer no perfil sem sessão é recusado", async () => {
    const api = await fachadaLimpa()

    await expect(api.atualizarAvatar(null)).rejects.toThrow(/Sessão expirada/)
    await expect(api.atualizarMeuPerfil({ nome: "Maria" })).rejects.toThrow(/Sessão expirada/)
  })

  it("trocar o avatar e o perfil recalcula iniciais e apara o resto", async () => {
    const api = await fachadaLogada()

    const comAvatar = await api.atualizarAvatar("data:image/png;base64,x")
    expect(comAvatar.usuario.avatarDataUrl).toBe("data:image/png;base64,x")

    const editado = await api.atualizarMeuPerfil({
      nome: "  Ana Paula Ribeiro  ",
      email: "  ana@x.gov.br ",
      cargo: "  Coordenadora ",
      secretaria: "s2",
      avatarDataUrl: null,
    })
    expect(editado.usuario.nome).toBe("Ana Paula Ribeiro")
    // Primeiro e último nome: "Ana Paula Ribeiro" é AR, não AP.
    expect(editado.usuario.iniciais).toBe("AR")
    expect(editado.usuario.primeiroNome).toBe("Ana")
    expect(editado.usuario.email).toBe("ana@x.gov.br")
    expect(editado.usuario.cargo).toBe("Coordenadora")
    expect(editado.usuario.avatarDataUrl).toBeNull()
  })

  it("nome em branco não apaga o nome de quem está logado", async () => {
    const api = await fachadaLogada()

    const igual = await api.atualizarMeuPerfil({ nome: "   " })

    expect(igual.usuario.nome).toBe("Maria Costa Andrade")
  })
})

describe("escopo: quem vê o quê", () => {
  it("servidor de uma prefeitura só conta o acervo dela", async () => {
    const api = await fachadaLogada()

    const estatisticas = await api.getEstatisticas()
    const documentos = await api.getDocumentos()

    expect(documentos.every((d) => d.prefeituraId === PREFEITURA)).toBe(true)
    expect(estatisticas.documentosGerados).toBeGreaterThanOrEqual(0)
  })

  it("administrador geral vê o acervo inteiro, e o resumo pronto", async () => {
    const api = await fachadaLogada(usuario({ perfilAcesso: "admin_geral", prefeituraId: null }))

    const semEscopo = await api.getDocumentos()
    const doServidor = await (await fachadaLogada()).getDocumentos()

    expect(semEscopo.length).toBeGreaterThanOrEqual(doServidor.length)
    // Sem prefeitura em foco, o resumo é o do acervo inteiro e não precisa ser
    // recalculado por prefeitura.
    expect((await api.getResumoDocumentos()).total).toBeGreaterThanOrEqual(0)
  })

  it("resumo de quem tem prefeitura é recalculado no escopo dela", async () => {
    const api = await fachadaLogada()

    expect((await api.getResumoDocumentos()).total).toBeGreaterThanOrEqual(0)
  })
})

describe("processo", () => {
  it("editar sem trocar a modalidade não registra nada na trilha", async () => {
    const api = await fachadaLimpa()
    vi.mocked(contratacao.obterProcesso).mockResolvedValue(processo() as never)
    vi.mocked(contratacao.atualizarProcessoReal).mockResolvedValue(processo() as never)

    await api.atualizarProcesso({ id: PROCESSO, objeto: "Aquisição revista" })

    expect(await api.getTrilha(PROCESSO)).toEqual([])
    expect(contratacao.atualizarProcessoReal).toHaveBeenCalledWith(
      expect.objectContaining({ id: PROCESSO }),
      expect.objectContaining({ objeto: "Aquisição revista" }),
    )
  })

  it("trocar a modalidade registra o motivo na trilha, com a justificativa", async () => {
    const api = await fachadaLogada()
    vi.mocked(contratacao.obterProcesso).mockResolvedValue(
      processo({ documentos: ["ETP", "TR", "Edital"] }) as never,
    )
    vi.mocked(elaboracao.concluirDocumento).mockResolvedValue({ versao: 1, corpo: [] } as never)
    vi.mocked(impressao.gerarArquivos).mockResolvedValue({
      id: "GER-EDITAL",
      versaoDoDocumento: 1,
      pedidaEm: "2026-08-23T10:00:00-03:00",
      concluida: true,
      arquivos: [],
    } as never)
    // O caso que importa: o Edital já foi gerado quando a modalidade muda para
    // uma em que ele não é cabível. O impacto é medido contra o que existe.
    await api.gerarDocumento({ processoId: PROCESSO, tipo: "Edital" })
    vi.mocked(contratacao.atualizarProcessoReal).mockResolvedValue(
      processo({ modalidade: "Dispensa Art. 75" }) as never,
    )

    await api.atualizarProcesso({
      id: PROCESSO,
      modalidade: "Dispensa Art. 75",
      justificativaModalidade: "Valor abaixo do limite do inciso II.",
    })

    const trilha = await api.getTrilha(PROCESSO)
    expect(trilha).toHaveLength(1)
    expect(trilha[0]?.evento).toBe("troca_modalidade")
    expect(trilha[0]?.autor).toBe("Maria Costa Andrade")
    expect(trilha[0]?.comentario).toContain("Valor abaixo do limite do inciso II.")
  })

  it("troca de modalidade sem justificativa registra assim mesmo", async () => {
    const api = await fachadaLimpa()
    vi.mocked(contratacao.obterProcesso).mockResolvedValue(processo() as never)
    vi.mocked(contratacao.atualizarProcessoReal).mockResolvedValue(processo() as never)

    await api.atualizarProcesso({ id: PROCESSO, modalidade: "Concorrência" })

    // Sem ninguém logado o autor é "Sistema" — a trilha não fica sem autor.
    expect((await api.getTrilha(PROCESSO))[0]?.autor).toBe("Sistema")
  })

  it("encerrar e reabrir falam com o servidor e registram a trilha da sessão", async () => {
    const api = await fachadaLogada()
    vi.mocked(contratacao.encerrarProcessoReal).mockResolvedValue(
      processo({ status: "concluido" }) as never,
    )
    vi.mocked(contratacao.reabrirProcessoReal).mockResolvedValue(processo() as never)

    const encerrado = await api.encerrarProcesso(PROCESSO, "Contratação cancelada.")
    expect(encerrado.status).toBe("concluido")
    expect(contratacao.encerrarProcessoReal).toHaveBeenCalledWith(
      PROCESSO,
      "Contratação cancelada.",
    )

    const reaberto = await api.reabrirProcesso(PROCESSO, "Retificar o ETP.")
    expect(reaberto.status).toBe("rascunho")

    const trilha = await api.getTrilha(PROCESSO)
    expect(trilha.map((e) => e.evento)).toEqual(["reabertura", "encerramento"])
    expect(trilha[1]?.comentario).toBe("Encerrado com pendências. Contratação cancelada.")
  })

  it("encerrar sem justificativa registra a conclusão normal", async () => {
    const api = await fachadaLimpa()
    vi.mocked(contratacao.encerrarProcessoReal).mockResolvedValue(processo() as never)

    await api.encerrarProcesso(PROCESSO)

    expect((await api.getTrilha(PROCESSO))[0]?.comentario).toBe(
      "Todos os documentos foram gerados.",
    )
  })
})

describe("DFD", () => {
  it("o parecer não existe antes da análise, e passa a existir depois", async () => {
    const api = await fachadaLimpa()

    expect(await api.getParecerDFD(PROCESSO)).toBeNull()

    const parecer = await api.analisarDFD(PROCESSO, "dfd-2026-014.pdf")
    expect(parecer.arquivo).toBe("dfd-2026-014.pdf")
    expect((await api.getParecerDFD(PROCESSO))?.processoId).toBe(PROCESSO)
  })
})

describe("seções do documento", () => {
  const documento = {
    secoes: [{ id: "1", titulo: "Necessidade", conteudo: "texto", status: "Completo" }],
  }

  it("salvar devolve a seção que foi gravada", async () => {
    const api = await fachadaLimpa()
    vi.mocked(elaboracao.salvarSecao).mockResolvedValue(documento as never)

    const secao = await api.atualizarSecao({
      processoId: PROCESSO,
      tipo: "ETP",
      secaoId: "1",
      conteudo: "texto",
    })

    expect(secao.id).toBe("1")
    expect(elaboracao.salvarSecao).toHaveBeenCalledWith(PROCESSO, "ETP", "1", "texto", undefined)
  })

  it("seção que o documento não tem é erro, e não `undefined` na tela", async () => {
    const api = await fachadaLimpa()
    vi.mocked(elaboracao.salvarSecao).mockResolvedValue(documento as never)
    vi.mocked(elaboracao.abrirDocumento).mockResolvedValue(documento as never)

    await expect(
      api.atualizarSecao({ processoId: PROCESSO, tipo: "ETP", secaoId: "99", conteudo: "x" }),
    ).rejects.toThrow(/Seção 99/)
    await expect(api.gerarSecao(PROCESSO, "ETP", "99")).rejects.toThrow(/Seção 99/)
  })

  it("gerar devolve o texto proposto sem gravá-lo", async () => {
    const api = await fachadaLimpa()
    vi.mocked(elaboracao.abrirDocumento).mockResolvedValue(documento as never)
    vi.mocked(elaboracao.gerarTextoDaSecao).mockResolvedValue("Texto proposto pelo servidor.")

    const secao = await api.gerarSecao(PROCESSO, "ETP", "1")

    // Quem decide se aquilo entra no documento é quem assina.
    expect(secao.conteudo).toBe("Texto proposto pelo servidor.")
    expect(elaboracao.salvarSecao).not.toHaveBeenCalled()
  })
})

describe("geração de documento", () => {
  const concluido = { versao: 1, corpo: [{ sectionCode: "1", titulo: "N", texto: "t" }] }

  /** O que o impressor do servidor devolve: arquivos com bytes medidos. */
  function geracao(versao = 1) {
    return {
      id: `GER-${versao}`,
      versaoDoDocumento: versao,
      pedidaEm: "2026-08-23T10:00:00-03:00",
      concluida: true,
      arquivos: [
        {
          id: `ARQ-DOCX-${versao}`,
          formato: "DOCX" as const,
          nomeDoArquivo: `PROC-ETP-v${versao}.docx`,
          bytes: 524_288,
          checksum: "1".repeat(64),
          versaoDoDocumento: versao,
          versaoDoTemplate: 1,
          geradoEm: "2026-08-23T10:00:01-03:00",
        },
      ],
    }
  }

  beforeEach(() => {
    vi.mocked(elaboracao.concluirDocumento).mockResolvedValue(concluido as never)
    vi.mocked(contratacao.obterProcesso).mockResolvedValue(processo() as never)
    vi.mocked(impressao.gerarArquivos).mockResolvedValue(geracao() as never)
  })

  it("a primeira geração cria o documento e move os indicadores", async () => {
    const api = await fachadaLogada()
    const antes = await api.getResumoDocumentos()

    const doc = await api.gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })

    expect(doc.versao).toBe(1)
    expect(doc.titulo).toContain("Aquisição de material de expediente")
    expect((await api.getResumoDocumentos()).total).toBe(antes.total + 1)
    expect(await api.getCorpoDocumento(PROCESSO, "ETP")).toBeDefined()
  })

  it("regerar troca a versão do documento existente em vez de criar outro", async () => {
    const api = await fachadaLogada()
    await api.gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })
    const depoisDaPrimeira = (await api.getDocumentos()).length

    vi.mocked(elaboracao.concluirDocumento).mockResolvedValue({ ...concluido, versao: 2 } as never)
    const regerado = await api.gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })

    expect(regerado.versao).toBe(2)
    expect(regerado.titulo).toContain("v2")
    expect((await api.getDocumentos()).length).toBe(depoisDaPrimeira)
    // Regeração corriqueira não entra na trilha do processo: ela pertence ao
    // histórico do documento.
    expect(await api.getTrilha(PROCESSO)).toEqual([])
  })

  it("a retificação declarada entra na trilha do processo", async () => {
    const api = await fachadaLogada()
    await api.gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })

    vi.mocked(elaboracao.concluirDocumento).mockResolvedValue({ ...concluido, versao: 2 } as never)
    await api.gerarDocumento({
      processoId: PROCESSO,
      tipo: "ETP",
      retificacao: { motivo: "erro_material", detalhe: "Data de entrega corrigida." },
    })

    const trilha = await api.getTrilha(PROCESSO)
    expect(trilha).toHaveLength(1)
    expect(trilha[0]?.evento).toBe("retificacao")
    expect(trilha[0]?.comentario).toContain("v2")
  })

  it("documento que não é ETP não move o contador de ETPs concluídos", async () => {
    const api = await fachadaLogada()
    const antes = (await api.getEstatisticas()).etpsConcluidos

    await api.gerarDocumento({ processoId: PROCESSO, tipo: "TR" })

    expect((await api.getEstatisticas()).etpsConcluidos).toBe(antes)
  })

  it("o histórico de versões acompanha cada geração", async () => {
    const api = await fachadaLogada()
    vi.mocked(elaboracao.historicoDeVersoes).mockResolvedValue([{ versao: 1 }] as never)

    await api.gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })

    expect(await api.getHistoricoVersoes(PROCESSO, "ETP")).toHaveLength(1)
  })
})

describe("configuração do órgão", () => {
  it("sem prefeitura indicada, usa a de quem está logado", async () => {
    const api = await fachadaLogada()
    vi.mocked(acesso.obterTenant).mockResolvedValue({ id: PREFEITURA } as never)

    await api.getConfigTenant()

    expect(acesso.obterTenant).toHaveBeenCalledWith(PREFEITURA)
  })

  it("com prefeitura indicada, é ela que manda", async () => {
    const api = await fachadaLimpa()
    vi.mocked(acesso.obterTenant).mockResolvedValue({ id: "outra" } as never)

    await api.getConfigTenant("outra")

    expect(acesso.obterTenant).toHaveBeenCalledWith("outra")
  })

  it("administrador geral sem prefeitura escolhida precisa escolher uma", async () => {
    const api = await fachadaLogada(usuario({ perfilAcesso: "admin_geral", prefeituraId: null }))

    await expect(api.getConfigTenant()).rejects.toThrow(/Selecione uma prefeitura/)
    await expect(api.atualizarConfigTenant({ orgao: "P" })).rejects.toThrow(
      /Selecione uma prefeitura/,
    )
  })

  it("salvar manda ao servidor o que ele guarda e devolve o resto como veio", async () => {
    const api = await fachadaLogada()
    vi.mocked(acesso.atualizarPrefeitura).mockResolvedValue({
      id: PREFEITURA,
      orgao: "Prefeitura de Ecoporanga",
      unidade: "Administração",
      timbrado: true,
    } as never)

    const salvo = await api.atualizarConfigTenant({
      orgao: "Prefeitura de Ecoporanga",
      unidade: "Administração",
      timbrado: false,
    })

    expect(acesso.atualizarPrefeitura).toHaveBeenCalledWith(PREFEITURA, {
      orgao: "Prefeitura de Ecoporanga",
      unidade: "Administração",
    })
    // Timbre não é guardado pelo servidor: segue o que a pessoa escolheu nesta
    // sessão, e está marcado como sintético na tela.
    expect(salvo.timbrado).toBe(false)
    expect(salvo.id).toBe(PREFEITURA)
  })
})
