// Guarda explícita: o "banco" em memória abaixo é estado mutável de módulo e só
// pode viver no browser. Se algum RSC importar isto (ex.: prefetch no servidor),
// o build falha em vez de vazar estado entre requests/usuários.
import "client-only"

import {
  documentos as documentosFixture,
  estatisticas as estatisticasFixture,
  parecerDFDBase,
  prefeituras as prefeiturasFixture,
  processos as processosFixture,
  resumoDocumentos as resumoDocumentosFixture,
  usuarios as usuariosFixture,
} from "@/lib/mocks/fixtures"
import { CATALOGO } from "@/lib/documentos"
import { podeEmitir, proximoStatus } from "@/lib/processos/fluxo"
import {
  calcularIndicadores,
  documentosPendentes,
  empilharVersao,
  entradaDeHistorico,
  impactoTrocaModalidade,
  iniciaisDe,
  motivoDaTrocaDeModalidade,
  notaDaVersao,
  numeroDeDocumento,
  numeroDeProcesso,
  primeiroNome,
  exigeJustificativaParaEncerrar,
  motivoDoEncerramento,
  noEscopo,
  prefeiturasVisiveis,
  resumirDocumentos,
  statusAposEditar,
  tituloComRotuloDeVersao,
  tituloDoDocumento,
} from "@/lib/dominio"
import type { BlocoDoDocumento, Retificacao } from "@/lib/dominio"
import {
  autenticar,
  encerrarSessao,
  obterSessao,
  redefinirSenha,
  solicitarRedefinicao,
} from "@/lib/api/auth-client"
import {
  criarDepartamento as criarDepartamentoNaApi,
  criarPrefeitura as criarPrefeituraNaApi,
  criarUsuario as criarUsuarioNaApi,
  desativarDepartamento as desativarDepartamentoNaApi,
  desativarPrefeitura as desativarPrefeituraNaApi,
  desativarUsuario as desativarUsuarioNaApi,
  listarPrefeituras as listarPrefeiturasNaApi,
  listarUsuarios as listarUsuariosNaApi,
  obterTenant as obterTenantNaApi,
} from "@/lib/api/access-client"
import {
  abrirDocumento,
  compararVersoes as compararVersoesNaApi,
  concluirDocumento,
  corpoDaVersaoVigente,
  gerarTextoDaSecao,
  historicoDeVersoes,
  salvarSecao,
  versoesComTexto,
} from "@/lib/api/authoring-client"
import {
  atualizarProcessoReal,
  criarProcessoReal,
  listarProcessos,
  obterProcesso,
} from "@/lib/api/procurement-client"
import { dataBrasiliaISO, dataHoraBrasiliaISO } from "@/lib/format"
import type {
  DocumentoGerado,
  EstatisticasDashboard,
  EventoDoProcesso,
  EventoProcesso,
  Modalidade,
  NovoProcessoInput,
  ParecerDFD,
  PerfilAcesso,
  Processo,
  ResumoDocumentos,
  SecaoDocumento,
  Secretaria,
  Sessao,
  StatusProcesso,
  Tenant,
  TipoDocumento,
  Usuario,
  VersaoDocumento,
} from "@/lib/types"

/**
 * Fachada de dados do GeraDocs. Autenticação e recuperação usam a API Spring;
 * os módulos ainda não implementados no backend permanecem em memória sem
 * alterar as assinaturas consumidas pelas telas e hooks.
 */

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T

/** Ano-série dos identificadores do órgão (PROC-/DOC-). Mantém a numeração coerente com o acervo. */
const ANO_SERIE = "2024"

function delay(ms = 350 + Math.random() * 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* ── Estado em memória (persiste durante a sessão) ─────────────────────────── */
const db = {
  usuarios: clone(usuariosFixture),
  prefeituras: clone(prefeiturasFixture),
  /** Sessão real usada como identidade pelos módulos ainda mockados. */
  sessao: null as Sessao | null,
  processos: clone(processosFixture),
  /** Seções por documento — chave `${processoId}:${tipo}`. */
  pareceresDFD: new Map<string, ParecerDFD>(),
  documentos: clone(documentosFixture),
  /** Trilha dos processos que vivem no servidor — chave é o id do processo. */
  trilhas: new Map<string, EventoDoProcesso[]>(),
  /** Histórico de versões por documento — chave `${processoId}:${tipo}`. */
  versoes: new Map<string, VersaoDocumento[]>(),
  /**
   * Corpo congelado na geração — chave `${processoId}:${tipo}`.
   *
   * Congelado, e não recalculado a cada leitura: o documento gerado é um
   * retrato. Editar uma seção depois não pode mudar o que já saiu — é
   * exatamente para isso que regerar incrementa a versão.
   */
  corpos: new Map<string, BlocoDoDocumento[]>(),
  estatisticas: clone(estatisticasFixture),
  resumoDocumentos: clone(resumoDocumentosFixture),
  seqProcesso: 90,
  // Acima do maior id gerado pelas fixtures (evita colisão com novos documentos).
  seqDocumento: 200,
  seqApontamento: 0,
  seqUsuario: usuariosFixture.length,
  seqPrefeitura: prefeiturasFixture.length,
}

/** Usuário logado, ou null. */
function usuarioLogado(): Usuario | null {
  return db.sessao?.usuario ?? null
}

/** Usuário logado ou erro (para operações que exigem sessão). */
function exigeSessao(): Usuario {
  const u = usuarioLogado()
  if (!u) throw new Error("Sessão expirada. Faça login novamente.")
  return u
}

/** Prefeitura de um usuário (null para admin geral). */
function prefeituraDo(usuario: Usuario): Tenant | null {
  if (db.sessao?.usuario.id === usuario.id) return db.sessao.prefeitura
  return usuario.prefeituraId ? db.prefeituras.find((p) => p.id === usuario.prefeituraId) ?? null : null
}

// Semeia o histórico de versões (v1) dos documentos já existentes nas fixtures,
// para que getHistoricoVersoes seja coerente desde o início.
for (const doc of db.documentos) {
  db.versoes.set(`${doc.processoId}:${doc.tipo}`, [
    { versao: doc.versao, geradoEm: doc.geradoEm, tamanho: doc.tamanho, nota: "Geração inicial" },
  ])
}


/* ── Autenticação / sessão ─────────────────────────────────────────────────── */

function montarSessao(usuario: Usuario): Sessao {
  return { usuario: clone(usuario), prefeitura: clone(prefeituraDo(usuario)) }
}

/**
 * Login real pela chave configurada + senha. O access token fica somente em
 * memória e o refresh token permanece no cookie HttpOnly emitido pelo backend.
 *
 * A normalização é do descritor (ADR-015): quem sabe o que fazer com o valor
 * digitado é a chave ativa, não este módulo.
 */
export async function login(identificador: string, senha: string): Promise<Sessao> {
  const sessao = await autenticar(identificador, senha)
  db.sessao = clone(sessao)
  return clone(sessao)
}

export async function logout(): Promise<void> {
  await encerrarSessao()
  db.sessao = null
}

/** Sessão atual, ou null se ninguém está logado. */
export async function getSessao(): Promise<Sessao | null> {
  const sessao = await obterSessao()
  db.sessao = sessao ? clone(sessao) : null
  return sessao ? clone(sessao) : null
}

/**
 * Recuperação de senha — mock. Resposta sempre genérica (não revela se o e-mail
 * está cadastrado). A integração real dispara o e-mail de redefinição.
 */
export async function recuperarSenha(email: string): Promise<void> {
  await solicitarRedefinicao(email.trim())
}

export async function resetarSenha(token: string, senha: string): Promise<void> {
  await redefinirSenha(token, senha)
}

/** Atualiza a foto de perfil do usuário logado (data URL ou null para o padrão). */
export async function atualizarAvatar(avatarDataUrl: string | null): Promise<Sessao> {
  await delay(200)
  const usuario = exigeSessao()
  usuario.avatarDataUrl = avatarDataUrl
  return montarSessao(usuario)
}

/** Edição dos próprios dados (Meu Perfil). CPF e perfil de acesso não mudam aqui. */
export interface MeuPerfilInput {
  nome?: string
  email?: string
  cargo?: string
  secretaria?: string
  avatarDataUrl?: string | null
}

export async function atualizarMeuPerfil(input: MeuPerfilInput): Promise<Sessao> {
  await delay(400)
  const usuario = exigeSessao()
  if (input.nome != null && input.nome.trim() !== "") {
    usuario.nome = input.nome.trim()
    usuario.primeiroNome = primeiroNome(usuario.nome)
    usuario.iniciais = iniciaisDe(usuario.nome)
  }
  if (input.email != null) usuario.email = input.email.trim()
  if (input.cargo != null) usuario.cargo = input.cargo.trim()
  if (input.secretaria !== undefined) usuario.secretaria = input.secretaria
  if (input.avatarDataUrl !== undefined) usuario.avatarDataUrl = input.avatarDataUrl
  return montarSessao(usuario)
}


/** Estatísticas do dashboard, escopadas à prefeitura do usuário logado. */
export async function getEstatisticas(): Promise<EstatisticasDashboard> {
  await delay()
  const escopo = escopoPrefeituras()
  return {
    ...clone(db.estatisticas),
    ...calcularIndicadores(noEscopo(db.processos, escopo), noEscopo(db.documentos, escopo)),
  }
}

/* ── Processos ─────────────────────────────────────────────────────────────── */

export interface ListaProcessosParams {
  busca?: string
  status?: StatusProcesso | "todos"
  pagina?: number
  porPagina?: number
}

export interface Paginado<T> {
  itens: T[]
  total: number
  pagina: number
  totalPaginas: number
}

/** Ids de prefeitura visíveis ao usuário logado (admin vê todas). */
function escopoPrefeituras(): string[] | null {
  return prefeiturasVisiveis(usuarioLogado())
}

export async function getProcessos(params: ListaProcessosParams = {}): Promise<Paginado<Processo>> {
  return listarProcessos(params)
}

export async function getProcesso(id: string): Promise<Processo> {
  return obterProcesso(id)
}

export async function getProximoNumeroProcesso(): Promise<string> {
  await delay(150)
  return numeroDeProcesso(ANO_SERIE, db.seqProcesso)
}

export async function criarProcesso(input: NovoProcessoInput): Promise<Processo> {
  return criarProcessoReal(input)
}

export interface AtualizarProcessoInput {
  id: string
  secretaria?: string
  objeto?: string
  objetoDemanda?: string
  dfdArquivo?: string | null
  documentos?: Array<TipoDocumento>
  modalidade?: Modalidade
  /**
   * Preenchida quando a lista de documentos é mantida divergindo da
   * recomendação. Vai literal para a trilha — é ela que responde ao controle.
   */
  justificativaModalidade?: string
}

/**
 * Edições feitas no hub do processo.
 *
 * A troca de modalidade continua produzindo o registro da trilha aqui porque a
 * trilha ainda vive em memória — ela migra junto com o histórico do processo. O
 * dado do processo, esse, já vai e volta do servidor.
 */
export async function atualizarProcesso(input: AtualizarProcessoInput): Promise<Processo> {
  const atual = await obterProcesso(input.id)
  if (input.modalidade !== undefined && input.modalidade !== atual.modalidade) {
    // Contra a lista que o processo tinha, e não contra a que está sendo salva:
    // com a lista nova, o que a tela acabou de remover já não estaria lá, e a
    // trilha registraria "nada removido" exatamente quando algo foi.
    const impacto = impactoTrocaModalidade(
      atual.modalidade,
      input.modalidade,
      atual.documentos,
      docsGeradosDo(atual.id),
    )
    registrarEventoLocal(
      atual.id,
      "troca_modalidade",
      motivoDaTrocaDeModalidade(
        atual.modalidade,
        input.modalidade,
        impacto,
        input.justificativaModalidade ?? "",
      ),
    )
  }
  return atualizarProcessoReal(atual, {
    objeto: input.objeto,
    objetoDemanda: input.objetoDemanda,
    modalidade: input.modalidade,
    documentos: input.documentos,
    dfdArquivo: input.dfdArquivo,
  })
}


/* ── Verificação do DFD ────────────────────────────────────────────────────── */

/** Dispara a análise mockada do DFD (a UI mostra o progresso ~1s). */
export async function analisarDFD(processoId: string, arquivo: string): Promise<ParecerDFD> {
  await delay(900)
  // Registra a data/hora real da análise (fuso de Brasília).
  const parecer: ParecerDFD = { ...clone(parecerDFDBase), processoId, arquivo, analisadoEm: dataHoraBrasiliaISO() }
  db.pareceresDFD.set(processoId, parecer)
  return clone(parecer)
}

/** Parecer persistido no mock (null se o DFD ainda não foi analisado). */
export async function getParecerDFD(processoId: string): Promise<ParecerDFD | null> {
  await delay()
  const parecer = db.pareceresDFD.get(processoId)
  return parecer ? clone(parecer) : null
}

/* ── Seções de documento (todos os tipos do catálogo) ──────────────────────── */

export async function getSecoes(processoId: string, tipo: TipoDocumento): Promise<SecaoDocumento[]> {
  return (await abrirDocumento(processoId, tipo)).secoes
}

export interface AtualizarSecaoInput {
  processoId: string
  tipo: TipoDocumento
  secaoId: string
  conteudo: string
  status?: SecaoDocumento["status"]
  /**
   * Por que a seção dispensável fica em branco (Art. 18, § 2º).
   *
   * `undefined` não mexe no que já está gravado; string vazia retira a dispensa
   * — é assim que a tela desfaz sem precisar de uma operação própria.
   */
  justificativaDispensa?: string
}

export async function atualizarSecao(input: AtualizarSecaoInput): Promise<SecaoDocumento> {
  const documento = await salvarSecao(
    input.processoId,
    input.tipo,
    input.secaoId,
    input.conteudo,
    input.justificativaDispensa,
  )
  const secao = documento.secoes.find((s) => s.id === input.secaoId)
  if (!secao) throw new Error(`Seção ${input.secaoId} não encontrada`)
  return secao
}

/**
 * Pede ao servidor a redação da seção.
 *
 * O texto volta para o rascunho e **não** é gravado: quem decide se aquilo entra
 * no documento é quem assina. A seção devolvida traz o texto proposto com o
 * status que ela teria se fosse aceito — e é a tela que decide aceitar.
 */
export async function gerarSecao(processoId: string, tipo: TipoDocumento, secaoId: string): Promise<SecaoDocumento> {
  const documento = await abrirDocumento(processoId, tipo)
  const secao = documento.secoes.find((s) => s.id === secaoId)
  if (!secao) throw new Error(`Seção ${secaoId} não encontrada`)
  const texto = await gerarTextoDaSecao(processoId, tipo, secaoId)
  return { ...secao, conteudo: texto, status: statusAposEditar(texto) }
}

/* ── Ciclo do processo ─────────────────────────────────────────────────────── */

function processoOuErro(processoId: string): Processo {
  const processo = db.processos.find((p) => p.id === processoId)
  if (!processo) throw new Error(`Processo ${processoId} não encontrado`)
  return processo
}

function docsGeradosDo(processoId: string): TipoDocumento[] {
  return db.documentos.filter((d) => d.processoId === processoId).map((d) => d.tipo)
}

/** Documentos do processo ainda não gerados. Vazio = o processo pode ser encerrado. */
export function pendentesDoProcesso(processo: Processo): TipoDocumento[] {
  return documentosPendentes(processo, docsGeradosDo(processo.id))
}

/** Registra um evento na trilha, aplicando a transição quando ela existir. */
/**
 * Registra um evento na trilha de um processo que vive no servidor.
 *
 * A trilha ainda é local — ela migra junto com o histórico do processo. Até lá,
 * o evento é guardado à parte, indexado pelo id do processo, em vez de dentro do
 * objeto que agora vem da API.
 */
/**
 * A trilha de um processo.
 *
 * Ainda local — ela migra para o servidor junto com o histórico do processo. A
 * tela já a consome por aqui para que essa migração não mexa nas páginas.
 */
export async function getTrilha(processoId: string): Promise<EventoDoProcesso[]> {
  await delay(120)
  return clone(db.trilhas.get(processoId) ?? [])
}

function registrarEventoLocal(processoId: string, evento: EventoProcesso, comentario: string): void {
  const usuario = usuarioLogado()
  const trilha = db.trilhas.get(processoId) ?? []
  trilha.unshift({
    evento,
    de: "rascunho",
    para: "rascunho",
    autor: usuario?.nome ?? "Sistema",
    papel: usuario?.perfilAcesso ?? "servidor",
    data: dataHoraBrasiliaISO(),
    comentario,
  })
  db.trilhas.set(processoId, trilha)
}

function registrarEvento(
  processo: Processo,
  evento: EventoProcesso,
  comentario: string,
): void {
  const usuario = usuarioLogado()
  const para = proximoStatus(processo.status, evento) ?? processo.status
  processo.trilha.unshift({
    evento,
    de: processo.status,
    para,
    autor: usuario?.nome ?? "Sistema",
    papel: usuario?.perfilAcesso ?? "servidor",
    data: dataHoraBrasiliaISO(),
    comentario,
  })
  processo.status = para
  processo.atualizadoEm = dataBrasiliaISO()
}

/**
 * Encerra o processo. A plataforma termina aqui: protocolo, assinatura e
 * aprovação acontecem no sistema de processo administrativo da prefeitura.
 *
 * Documento pendente **não impede** o encerramento — apenas exige justificativa.
 * A plataforma orienta; quem decide é o servidor.
 */
export async function encerrarProcesso(processoId: string, justificativa = ""): Promise<Processo> {
  await delay(500)
  const processo = processoOuErro(processoId)
  const pendentes = pendentesDoProcesso(processo)
  if (exigeJustificativaParaEncerrar(pendentes) && justificativa.trim() === "") {
    throw new Error(
      `Ainda faltam documentos: ${pendentes.map((t) => CATALOGO[t].titulo).join(", ")}. ` +
        "Informe a justificativa para encerrar mesmo assim.",
    )
  }
  if (!podeEmitir(processo.status, "encerramento")) {
    throw new Error("Só é possível encerrar um processo em elaboração.")
  }
  registrarEvento(processo, "encerramento", motivoDoEncerramento(pendentes, justificativa))
  return clone(processo)
}

/** Reabre um processo encerrado para retificar documento. */
export async function reabrirProcesso(processoId: string, motivo: string): Promise<Processo> {
  await delay(400)
  const processo = processoOuErro(processoId)
  if (!podeEmitir(processo.status, "reabertura")) {
    throw new Error("Só é possível reabrir um processo concluído.")
  }
  registrarEvento(processo, "reabertura", motivo)
  return clone(processo)
}


/* ── Documentos ────────────────────────────────────────────────────────────── */

export async function getDocumentos(): Promise<DocumentoGerado[]> {
  await delay()
  const docs = noEscopo(db.documentos, escopoPrefeituras())
  return clone(docs)
}

export async function getResumoDocumentos(): Promise<ResumoDocumentos> {
  await delay()
  const escopo = escopoPrefeituras()
  if (!escopo) return clone(db.resumoDocumentos)
  return resumirDocumentos(noEscopo(db.documentos, escopo))
}

/**
 * O texto do documento como ele saiu na geração.
 *
 * Vazio quando o documento ainda não foi gerado — não há retrato de algo que
 * não aconteceu.
 */
export async function getCorpoDocumento(
  processoId: string,
  tipo: TipoDocumento,
): Promise<BlocoDoDocumento[]> {
  return corpoDaVersaoVigente(processoId, tipo)
}

export async function getHistoricoVersoes(processoId: string, tipo: TipoDocumento): Promise<VersaoDocumento[]> {
  return historicoDeVersoes(processoId, tipo)
}

/**
 * As versões com o texto de cada uma.
 *
 * Separada de `getHistoricoVersoes` porque carrega o corpo inteiro: a listagem
 * do histórico não precisa dele, e trazê-lo ali faria toda abertura de painel
 * baixar todas as versões do documento.
 */
export async function getVersoesComTexto(processoId: string, tipo: TipoDocumento) {
  return versoesComTexto(processoId, tipo)
}

/** Compara duas versões geradas e traz a errata. */
export async function compararVersoes(
  processoId: string,
  tipo: TipoDocumento,
  de: number,
  para: number,
) {
  return compararVersoesNaApi(processoId, tipo, de, para)
}

export interface GerarDocumentoInput {
  processoId: string
  tipo: TipoDocumento
  /**
   * Presente quando a regeração é uma retificação declarada.
   *
   * Ausente, a regeração é apenas isso: o servidor mexeu numa seção e gerou de
   * novo antes de o documento sair da plataforma. Marcar tudo como retificação
   * esvaziaria a palavra justamente onde ela tem peso.
   */
  retificacao?: Retificacao
}

/**
 * Finaliza um documento do processo. Na primeira geração cria o registro; na
 * regeração **incrementa a versão** e guarda a versão anterior no histórico —
 * nunca sobrescreve sem deixar rastro (rastreabilidade exigida pelo controle).
 */
/**
 * Conclui o documento.
 *
 * A conclusão em si e o corpo são do servidor — é ele que valida as seções
 * indispensáveis e congela o texto. O que ainda vive aqui é o **acervo**:
 * identificador `DOC-`, formato e tamanho do arquivo, que só passam a existir de
 * verdade quando o Bloco 11 produzir o arquivo.
 */
export async function gerarDocumento(input: GerarDocumentoInput): Promise<DocumentoGerado> {
  const concluido = await concluirDocumento(input.processoId, input.tipo, input.retificacao)
  const processo = await obterProcesso(input.processoId)
  const objeto = processo.objeto
  const meta = CATALOGO[input.tipo]
  const tamanhoKB = meta.tamanhoKB
  const chaveVersao = `${input.processoId}:${input.tipo}`

  const existente = db.documentos.find((d) => d.processoId === input.processoId && d.tipo === input.tipo)
  const geradoEm = dataHoraBrasiliaISO()

  if (existente) {
    // A versão vem do servidor: é ele que conta as conclusões, e contar aqui
    // faria duas abas divergirem sobre qual é a versão vigente.
    existente.versao = concluido.versao
    existente.titulo = tituloComRotuloDeVersao(
      tituloDoDocumento(input.tipo, objeto),
      existente.versao,
    )
    existente.geradoEm = geradoEm
    existente.tamanho = `${tamanhoKB} KB`
    existente.status = "final"
    db.versoes.set(
      chaveVersao,
      empilharVersao(
        db.versoes.get(chaveVersao) ?? [],
        entradaDeHistorico(existente.versao, geradoEm, `${tamanhoKB} KB`, input.retificacao),
      ),
    )
    db.corpos.set(chaveVersao, concluido.corpo)
    if (input.retificacao) {
      // Só a retificação declarada entra na trilha do processo. Regeração
      // corriqueira fica no histórico do documento, que é onde ela pertence.
      registrarEventoLocal(
        input.processoId,
        "retificacao",
        `${CATALOGO[input.tipo].titulo} retificado (v${existente.versao}) — ${notaDaVersao(
          existente.versao,
          input.retificacao,
        )}`,
      )
    }
    return clone(existente)
  }

  const doc: DocumentoGerado = {
    id: numeroDeDocumento(ANO_SERIE, ++db.seqDocumento),
    prefeituraId: processo.prefeituraId,
    processoId: input.processoId,
    titulo: tituloDoDocumento(input.tipo, objeto),
    tipo: input.tipo,
    formato: meta.formato,
    geradoEm,
    tamanho: `${tamanhoKB} KB`,
    status: "final",
    versao: concluido.versao,
  }
  db.documentos.unshift(doc)
  db.versoes.set(chaveVersao, [entradaDeHistorico(concluido.versao, geradoEm, `${tamanhoKB} KB`)])
  db.corpos.set(chaveVersao, concluido.corpo)

  // Indicadores da tela de Documentos e do dashboard acompanham a nova geração.
  db.resumoDocumentos.total += 1
  db.resumoDocumentos.esteMes += 1
  db.resumoDocumentos.armazenamentoMB = Math.round((db.resumoDocumentos.armazenamentoMB + tamanhoKB / 1024) * 10) / 10
  db.estatisticas.documentosGerados += 1
  db.estatisticas.documentosSemana += 1
  if (input.tipo === "ETP") db.estatisticas.etpsConcluidos += 1

  return clone(doc)
}

/* ── Configurações da prefeitura ───────────────────────────────────────────── */

/** Prefeitura em foco: a indicada, senão a do usuário logado, senão a primeira. */
function prefeituraFoco(prefeituraId?: string): Tenant {
  if (prefeituraId) {
    const p = db.prefeituras.find((x) => x.id === prefeituraId)
    if (!p) throw new Error(`Prefeitura ${prefeituraId} não encontrada`)
    return p
  }
  const usuario = usuarioLogado()
  const p = usuario?.prefeituraId ? db.prefeituras.find((x) => x.id === usuario.prefeituraId) : db.prefeituras[0]
  if (!p) throw new Error("Nenhuma prefeitura no contexto")
  return p
}

export async function getConfigTenant(prefeituraId?: string): Promise<Tenant> {
  const id = prefeituraId ?? exigeSessao().prefeituraId
  if (!id) throw new Error("Selecione uma prefeitura para consultar as configurações.")
  return obterTenantNaApi(id)
}

export async function atualizarConfigTenant(patch: Partial<Tenant>, prefeituraId?: string): Promise<Tenant> {
  await delay(450)
  const alvo = prefeituraFoco(prefeituraId)
  Object.assign(alvo, clone({ ...patch, id: alvo.id })) // o id nunca é sobrescrito
  return clone(alvo)
}

/* ── Cadastro de prefeituras (admin geral) ─────────────────────────────────── */

export async function getPrefeituras(): Promise<Tenant[]> {
  return listarPrefeiturasNaApi()
}

export interface NovaPrefeituraInput {
  orgao: string
  unidade: string
}

export async function criarPrefeitura(input: NovaPrefeituraInput): Promise<Tenant> {
  return criarPrefeituraNaApi(input)
}

export async function removerPrefeitura(id: string): Promise<void> {
  await desativarPrefeituraNaApi(id)
}

/* ── Cadastro de usuários (admin geral e coordenador da própria prefeitura) ── */

/**
 * @param busca trecho de nome ou matrícula; quem filtra é o servidor
 */
export async function getUsuarios(prefeituraId?: string, busca?: string): Promise<Usuario[]> {
  return listarUsuariosNaApi(prefeituraId, busca)
}

export interface NovoUsuarioInput {
  nome: string
  cpf: string
  email: string
  cargo: string
  matricula?: string
  decretoNomeacao?: string
  senha: string
  perfilAcesso: PerfilAcesso
  prefeituraId: string | null
  secretaria?: string
}

export async function criarUsuario(input: NovoUsuarioInput): Promise<Usuario> {
  return criarUsuarioNaApi({
    ...input,
    departamentoId: input.secretaria,
  })
}

export interface AtualizarUsuarioInput {
  id: string
  nome?: string
  email?: string
  cargo?: string
  matricula?: string
  decretoNomeacao?: string
  perfilAcesso?: PerfilAcesso
  prefeituraId?: string | null
  secretaria?: string
  ativo?: boolean
}

export async function atualizarUsuario(input: AtualizarUsuarioInput): Promise<Usuario> {
  await delay(450)
  const usuario = db.usuarios.find((u) => u.id === input.id)
  if (!usuario) throw new Error(`Usuário ${input.id} não encontrado`)
  if (input.nome != null && input.nome.trim() !== "") {
    usuario.nome = input.nome.trim()
    usuario.primeiroNome = primeiroNome(usuario.nome)
    usuario.iniciais = iniciaisDe(usuario.nome)
  }
  if (input.email != null) usuario.email = input.email.trim()
  if (input.cargo != null) usuario.cargo = input.cargo.trim()
  if (input.matricula !== undefined) usuario.matricula = input.matricula.trim() || undefined
  if (input.decretoNomeacao !== undefined) {
    usuario.decretoNomeacao = input.decretoNomeacao.trim() || undefined
  }
  if (input.perfilAcesso != null) usuario.perfilAcesso = input.perfilAcesso
  if (input.prefeituraId !== undefined) usuario.prefeituraId = input.prefeituraId
  if (input.secretaria !== undefined) usuario.secretaria = input.secretaria
  if (input.ativo != null) usuario.ativo = input.ativo
  return clone(usuario)
}

export async function removerUsuario(id: string): Promise<void> {
  await desativarUsuarioNaApi(id)
}

export async function criarSecretaria(prefeituraId: string, nome: string): Promise<Secretaria> {
  return criarDepartamentoNaApi(prefeituraId, nome)
}

export async function removerSecretaria(prefeituraId: string, secretariaId: string): Promise<void> {
  await desativarDepartamentoNaApi(prefeituraId, secretariaId)
}
