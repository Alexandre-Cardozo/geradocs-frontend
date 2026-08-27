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

const ARQUIVO_PCA = new File(["1;P"], "p.csv", { type: "text/csv" })
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"
const ENTIDADE = "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d"

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
    entidadeId: ENTIDADE,
    avatarDataUrl: null,
    ultimoAcesso: "2026-08-20T14:30:00-03:00",
    ativo: true,
    ...sobrescrever,
  }
}

function sessao(sobrescrever: Record<string, unknown> = {}) {
  return {
    usuario: usuario(sobrescrever),
    entidade: { id: ENTIDADE, nome: "Prefeitura de Ecoporanga" },
  }
}

function processo(sobrescrever: Record<string, unknown> = {}) {
  return {
    id: PROCESSO,
    entidadeId: ENTIDADE,
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

/** Entra na fachada, que é o que dá contexto de entidade ao que sobrou local. */
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
    ["declararPrevisaoNoPca", (a) => a.declararPrevisaoNoPca(PROCESSO, { demanda: "Papel", codigo: "2026-1" }), pca.declararPrevisao, [PROCESSO, { demanda: "Papel", codigo: "2026-1" }]],
    ["citarPcaNaSecao", (a) => a.citarPcaNaSecao(PROCESSO), pca.citarNaSecao, [PROCESSO]],
    ["getPlanoPca", (a) => a.getPlanoPca(), pca.planoVigente, []],
    ["importarPlanoPca", (a) => a.importarPlanoPca({ ano: 2026, arquivo: ARQUIVO_PCA }), pca.importarPlano, [{ ano: 2026, arquivo: ARQUIVO_PCA }]],
    ["baixarPlanoPca", (a) => a.baixarPlanoPca(2026), pca.baixarPlano, [2026]],
    ["getPlanosPca", (a) => a.getPlanosPca(), pca.planosDoOrgao, []],
    ["getEntidades", (a) => a.getEntidades(), acesso.listarEntidades, []],
    ["criarEntidade", (a) => a.criarEntidade({ nome: "P", tipo: "prefeitura" }), acesso.criarEntidade, [{ nome: "P", tipo: "prefeitura" }]],
    ["removerEntidade", (a) => a.removerEntidade(ENTIDADE), acesso.desativarEntidade, [ENTIDADE]],
    ["getUsuarios", (a) => a.getUsuarios(ENTIDADE, "maria"), acesso.listarUsuarios, [ENTIDADE, "maria"]],
    ["atualizarUsuario", (a) => a.atualizarUsuario({ id: "u1", nome: "Maria" }), acesso.atualizarUsuario, [{ id: "u1", nome: "Maria" }]],
    ["removerUsuario", (a) => a.removerUsuario("u1"), acesso.desativarUsuario, ["u1"]],
    ["criarSecretaria", (a) => a.criarSecretaria(ENTIDADE, "Compras"), acesso.criarDepartamento, [ENTIDADE, "Compras"]],
    ["renomearSecretaria", (a) => a.renomearSecretaria(ENTIDADE, "s1", "Educação"), acesso.renomearDepartamento, [ENTIDADE, "s1", "Educação"]],
    ["removerSecretaria", (a) => a.removerSecretaria(ENTIDADE, "s1"), acesso.desativarDepartamento, [ENTIDADE, "s1"]],
    ["recuperarSenha", (a) => a.recuperarSenha("  a@b.gov.br  "), autenticacao.solicitarRedefinicao, ["a@b.gov.br"]],
    ["resetarSenha", (a) => a.resetarSenha("t", "s"), autenticacao.redefinirSenha, ["t", "s"]],
    ["logout", (a) => a.logout(), autenticacao.encerrarSessao, []],
    ["trocarPropriaSenha", (a) => a.trocarPropriaSenha("atual", "nova"), autenticacao.trocarPropriaSenha, ["atual", "nova"]],
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
    // Sem sessão guardada, o que ainda é local perde o contexto de entidade.
    expect(await api.getSessao()).toBeNull()
  })

  it("consultar a sessão devolve o que o servidor disser", async () => {
    const api = await fachadaLimpa()
    vi.mocked(autenticacao.obterSessao).mockResolvedValue(sessao() as never)

    expect((await api.getSessao())?.usuario.cpf).toBe("33333333333")
  })

})

/*
 * O bloco "escopo: quem vê o quê" saiu no 12.3. Ele verificava o recorte por
 * entidade feito **aqui**; agora quem recorta é o servidor, e há teste de
 * integração cobrando que o acervo da vizinha não apareça. Mantê-lo exigiria
 * remontar na fachada o filtro que acabou de ser removido, para ter o que testar.
 */

describe("o painel soma dois assuntos", () => {
  it("junta os números de processo com os do acervo", async () => {
    const api = await fachadaLimpa()
    vi.mocked(contratacao.estatisticasDeProcesso).mockResolvedValue({
      ativos: 7,
      encerrados: 3,
      criadosNoMes: 2,
      iniciados: 5,
      documentosPendentes: 11,
      taxaConclusao: 0.3,
    })
    vi.mocked(impressao.resumoDoAcervo).mockResolvedValue({
      total: 141,
      esteMes: 14,
      ultimosSeteDias: 3,
      bytesArmazenados: 53_477_376,
      etpsConcluidos: 27,
    })

    const painel = await api.getEstatisticas()

    // Nenhum módulo do servidor conta pelo outro: quem soma é a tela (ADR-025).
    expect(painel.processosAtivos).toBe(7)
    expect(painel.documentosPendentes).toBe(11)
    expect(painel.documentosGerados).toBe(141)
    expect(painel.etpsConcluidos).toBe(27)
    expect(painel.taxaConclusao).toBe(0.3)
  })

  it("o armazenamento é convertido para MB só na apresentação", async () => {
    const api = await fachadaLimpa()
    vi.mocked(impressao.resumoDoAcervo).mockResolvedValue({
      total: 141,
      esteMes: 14,
      ultimosSeteDias: 3,
      bytesArmazenados: 53_477_376,
      etpsConcluidos: 27,
    })

    // O servidor mede em bytes; fixar MB lá obrigaria a desfazer a conta para
    // mostrar KB quando for pouco.
    expect((await api.getResumoDocumentos()).armazenamentoMB).toBe(51)
  })

  it("a lista de documentos é o acervo do servidor", async () => {
    const api = await fachadaLimpa()
    vi.mocked(impressao.acervoDoNome).mockResolvedValue([])

    expect(await api.getDocumentos()).toEqual([])
    expect(impressao.acervoDoNome).toHaveBeenCalled()
  })
})

describe("processo", () => {
  it("editar sem trocar a modalidade não manda motivo nenhum", async () => {
    const api = await fachadaLimpa()
    vi.mocked(contratacao.obterProcesso).mockResolvedValue(processo() as never)
    vi.mocked(contratacao.atualizarProcessoReal).mockResolvedValue(processo() as never)

    await api.atualizarProcesso({ id: PROCESSO, objeto: "Aquisição revista" })

    // Motivo em toda edição transformaria a trilha em log de cliques.
    expect(contratacao.atualizarProcessoReal).toHaveBeenCalledWith(
      expect.objectContaining({ id: PROCESSO }),
      expect.objectContaining({ objeto: "Aquisição revista", motivo: undefined }),
    )
  })

  it("trocar a modalidade manda o motivo junto, com a justificativa", async () => {
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

    // O motivo acompanha a edição: quem registra é o servidor, e é ele que
    // sabe quem agiu e quando (ADR-024).
    const [, mudancas] = vi.mocked(contratacao.atualizarProcessoReal).mock.calls.at(-1) ?? []
    expect(mudancas?.motivo).toContain("Valor abaixo do limite do inciso II.")
    expect(mudancas?.motivo).toContain("Pregão Eletrônico")
    expect(mudancas?.motivo).toContain("Dispensa Art. 75")
  })

  it("troca de modalidade sem justificativa manda o motivo assim mesmo", async () => {
    const api = await fachadaLimpa()
    vi.mocked(contratacao.obterProcesso).mockResolvedValue(processo() as never)
    vi.mocked(contratacao.atualizarProcessoReal).mockResolvedValue(processo() as never)

    await api.atualizarProcesso({ id: PROCESSO, modalidade: "Concorrência" })

    // A troca em si já é o que o controle pergunta depois.
    const [, mudancas] = vi.mocked(contratacao.atualizarProcessoReal).mock.calls.at(-1) ?? []
    expect(mudancas?.motivo).toContain("Concorrência")
  })

  it("encerrar e reabrir falam com o servidor", async () => {
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
    expect(contratacao.reabrirProcessoReal).toHaveBeenCalledWith(PROCESSO, "Retificar o ETP.")
    // Sem registro paralelo: quem grava o evento é o servidor, e a tela lê de lá.
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

  it("a primeira geração cria o documento com a versão e o título certos", async () => {
    const api = await fachadaLogada()

    const doc = await api.gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })

    expect(doc.versao).toBe(1)
    expect(doc.titulo).toContain("Aquisição de material de expediente")
    expect(await api.getCorpoDocumento(PROCESSO, "ETP")).toBeDefined()
    // Que gerar move o indicador é verificado contra o banco, no
    // DocumentGenerationIntegrationTest: contar aqui contaria o mock.
  })

  it("regerar troca a versão do documento em vez de criar outro", async () => {
    const api = await fachadaLogada()
    await api.gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })

    vi.mocked(elaboracao.concluirDocumento).mockResolvedValue({ ...concluido, versao: 2 } as never)
    const regerado = await api.gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })

    expect(regerado.versao).toBe(2)
    expect(regerado.titulo).toContain("v2")
  })

  it("o histórico de versões acompanha cada geração", async () => {
    const api = await fachadaLogada()
    vi.mocked(elaboracao.historicoDeVersoes).mockResolvedValue([{ versao: 1 }] as never)

    await api.gerarDocumento({ processoId: PROCESSO, tipo: "ETP" })

    expect(await api.getHistoricoVersoes(PROCESSO, "ETP")).toHaveLength(1)
  })
})

describe("configuração do órgão", () => {
  it("consulta a entidade indicada, e só ela", async () => {
    const api = await fachadaLimpa()
    vi.mocked(acesso.obterTenant).mockResolvedValue({ id: ENTIDADE } as never)

    await api.getConfigTenant(ENTIDADE)

    // Quem resolve "a da sessão" é o hook, e não esta função: enquanto isso
    // morava aqui, a resposta dependia de um objeto em memória do mock.
    expect(acesso.obterTenant).toHaveBeenCalledWith(ENTIDADE)
  })

  it("com entidade indicada, é ela que manda", async () => {
    const api = await fachadaLimpa()
    vi.mocked(acesso.obterTenant).mockResolvedValue({ id: "outra" } as never)

    await api.getConfigTenant("outra")

    expect(acesso.obterTenant).toHaveBeenCalledWith("outra")
  })

  it("salvar manda ao servidor o que ele guarda e devolve o resto como veio", async () => {
    const api = await fachadaLogada()
    vi.mocked(acesso.atualizarEntidade).mockResolvedValue({
      id: ENTIDADE,
      nome: "Prefeitura de Ecoporanga",
      timbrado: true,
    } as never)

    const salvo = await api.atualizarConfigTenant(
      { nome: "Prefeitura de Ecoporanga", timbrado: false },
      ENTIDADE,
    )

    expect(acesso.atualizarEntidade).toHaveBeenCalledWith(ENTIDADE, {
      nome: "Prefeitura de Ecoporanga",
    })
    // Timbre não é guardado pelo servidor: segue o que a pessoa escolheu nesta
    // sessão, e está marcado como sintético na tela.
    expect(salvo.timbrado).toBe(false)
    expect(salvo.id).toBe(ENTIDADE)
  })
})
