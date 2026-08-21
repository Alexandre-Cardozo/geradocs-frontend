// Guarda explícita: o "banco" em memória abaixo é estado mutável de módulo e só
// pode viver no browser. Se algum RSC importar isto (ex.: prefetch no servidor),
// o build falha em vez de vazar estado entre requests/usuários.
import "client-only"

import {
  conteudoDemoETP,
  documentos as documentosFixture,
  estatisticas as estatisticasFixture,
  parecerDFDBase,
  prefeituras as prefeiturasFixture,
  processos as processosFixture,
  resumoDocumentos as resumoDocumentosFixture,
  usuarios as usuariosFixture,
} from "@/lib/mocks/fixtures"
import { CATALOGO, secoesPorTipoBase } from "@/lib/documentos"
import { podeEmitir, proximoStatus } from "@/lib/processos/fluxo"
import {
  calcularIndicadores,
  documentosPendentes,
  empilharVersao,
  entradaDeHistorico,
  exigeJustificativaParaEncerrar,
  motivoDoEncerramento,
  noEscopo,
  prefeiturasVisiveis,
  resumirDocumentos,
  proximaVersao,
  statusAposEditar,
} from "@/lib/dominio"
import { limpaCPF } from "@/lib/auth/cpf"
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
import { criarProcessoReal, listarProcessos } from "@/lib/api/procurement-client"
import { dataBrasiliaISO, dataHoraBrasiliaISO } from "@/lib/format"
import type {
  DocumentoGerado,
  EstatisticasDashboard,
  EventoProcesso,
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
  secoes: new Map<string, SecaoDocumento[]>(),
  pareceresDFD: new Map<string, ParecerDFD>(),
  documentos: clone(documentosFixture),
  /** Histórico de versões por documento — chave `${processoId}:${tipo}`. */
  versoes: new Map<string, VersaoDocumento[]>(),
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

function secoesDoDocumento(processoId: string, tipo: TipoDocumento): SecaoDocumento[] {
  const chave = `${processoId}:${tipo}`
  let secoes = db.secoes.get(chave)
  if (!secoes) {
    // As seções nascem em branco a partir do catálogo de domínio.
    secoes = clone(secoesPorTipoBase[tipo])
    const jaGerado = db.documentos.some((d) => d.processoId === processoId && d.tipo === tipo)
    if (jaGerado) {
      // Documento já gerado → todas as seções contam como concluídas (progresso 100%).
      secoes = secoes.map((s) => ({ ...s, status: "Completo" }))
    } else if (tipo === "ETP" && processoId === "PROC-2024-089") {
      // Só o ETP do processo de referência já chega com seções redigidas.
      secoes = secoes.map((s) => {
        const conteudo = conteudoDemoETP[s.id]
        return conteudo ? { ...s, conteudo, status: "Completo" as const } : s
      })
    }
    db.secoes.set(chave, secoes)
  }
  return secoes
}

/* ── Autenticação / sessão ─────────────────────────────────────────────────── */

function montarSessao(usuario: Usuario): Sessao {
  return { usuario: clone(usuario), prefeitura: clone(prefeituraDo(usuario)) }
}

/**
 * Login real por CPF + senha. O access token fica somente em memória e o
 * refresh token permanece no cookie HttpOnly emitido pelo backend.
 */
export async function login(cpf: string, senha: string): Promise<Sessao> {
  const sessao = await autenticar(limpaCPF(cpf), senha)
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
    usuario.primeiroNome = usuario.nome.split(" ")[0] ?? usuario.nome
    usuario.iniciais = iniciaisDe(usuario.nome)
  }
  if (input.email != null) usuario.email = input.email.trim()
  if (input.cargo != null) usuario.cargo = input.cargo.trim()
  if (input.secretaria !== undefined) usuario.secretaria = input.secretaria
  if (input.avatarDataUrl !== undefined) usuario.avatarDataUrl = input.avatarDataUrl
  return montarSessao(usuario)
}

/** Iniciais a partir do nome (2 primeiras palavras). */
function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  const primeira = partes[0]?.[0] ?? ""
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : ""
  return (primeira + ultima).toUpperCase() || "?"
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
  await delay()
  const proc = db.processos.find((p) => p.id === id)
  if (!proc) throw new Error(`Processo ${id} não encontrado`)
  return clone(proc)
}

export async function getProximoNumeroProcesso(): Promise<string> {
  await delay(150)
  return `PROC-${ANO_SERIE}-${String(db.seqProcesso).padStart(3, "0")}`
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
}

/** Edições feitas no hub do processo (secretaria, descrição, objeto da demanda, DFD, documentos). */
export async function atualizarProcesso(input: AtualizarProcessoInput): Promise<Processo> {
  await delay(400)
  const proc = db.processos.find((p) => p.id === input.id)
  if (!proc) throw new Error(`Processo ${input.id} não encontrado`)
  if (input.secretaria !== undefined) proc.secretaria = input.secretaria
  if (input.objeto !== undefined) proc.objeto = input.objeto
  if (input.objetoDemanda !== undefined) proc.objetoDemanda = input.objetoDemanda
  if (input.dfdArquivo !== undefined) proc.dfdArquivo = input.dfdArquivo
  if (input.documentos !== undefined) proc.documentos = input.documentos
  proc.atualizadoEm = dataBrasiliaISO()
  return clone(proc)
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
  await delay()
  return clone(secoesDoDocumento(processoId, tipo))
}

export interface AtualizarSecaoInput {
  processoId: string
  tipo: TipoDocumento
  secaoId: string
  conteudo: string
  status?: SecaoDocumento["status"]
}

export async function atualizarSecao(input: AtualizarSecaoInput): Promise<SecaoDocumento> {
  await delay(400)
  const secoes = secoesDoDocumento(input.processoId, input.tipo)
  const secao = secoes.find((s) => s.id === input.secaoId)
  if (!secao) throw new Error(`Seção ${input.secaoId} não encontrada`)
  secao.conteudo = input.conteudo
  secao.status = statusAposEditar(input.conteudo, input.status)
  return clone(secao)
}

/** Geração de conteúdo por IA — simulada com delay maior. */
export async function gerarSecao(processoId: string, tipo: TipoDocumento, secaoId: string): Promise<SecaoDocumento> {
  await delay(1800)
  const secoes = secoesDoDocumento(processoId, tipo)
  const secao = secoes.find((s) => s.id === secaoId)
  if (!secao) throw new Error(`Seção ${secaoId} não encontrada`)
  const processo = db.processos.find((p) => p.id === processoId)
  const objeto = processo?.objetoDemanda || processo?.objeto || "objeto da contratação"
  secao.conteudo =
    `[Conteúdo gerado pela IA] ${secao.titulo} referente ao processo ${processoId} — ` +
    `${objeto}. Elaborado em conformidade com o ` +
    `${secao.fundamentoLegal}, considerando o DFD anexado, o PCA vigente e as informações prestadas pela ${processo?.secretaria ?? "secretaria demandante"}.`
  secao.status = "Completo"
  return clone(secao)
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

export async function getHistoricoVersoes(processoId: string, tipo: TipoDocumento): Promise<VersaoDocumento[]> {
  await delay()
  return clone(db.versoes.get(`${processoId}:${tipo}`) ?? [])
}

export interface GerarDocumentoInput {
  processoId: string
  tipo: TipoDocumento
}

/**
 * Finaliza um documento do processo. Na primeira geração cria o registro; na
 * regeração **incrementa a versão** e guarda a versão anterior no histórico —
 * nunca sobrescreve sem deixar rastro (rastreabilidade exigida pelo controle).
 */
export async function gerarDocumento(input: GerarDocumentoInput): Promise<DocumentoGerado> {
  await delay(700)
  const processo = db.processos.find((p) => p.id === input.processoId)
  const objeto = processo?.objeto ?? "Processo de Contratação"
  const meta = CATALOGO[input.tipo]
  const tamanhoKB = meta.tamanhoKB
  const chaveVersao = `${input.processoId}:${input.tipo}`

  // Documento finalizado → todas as suas seções ficam concluídas (inclui a última).
  for (const secao of secoesDoDocumento(input.processoId, input.tipo)) secao.status = "Completo"

  const existente = db.documentos.find((d) => d.processoId === input.processoId && d.tipo === input.tipo)
  const geradoEm = dataHoraBrasiliaISO()

  if (existente) {
    // Regeração — nova versão. A anterior fica registrada no histórico.
    existente.versao = proximaVersao(existente.versao)
    existente.titulo = `${input.tipo} — ${objeto}`
    existente.geradoEm = geradoEm
    existente.tamanho = `${tamanhoKB} KB`
    existente.status = "final"
    db.versoes.set(
      chaveVersao,
      empilharVersao(
        db.versoes.get(chaveVersao) ?? [],
        entradaDeHistorico(existente.versao, geradoEm, `${tamanhoKB} KB`),
      ),
    )
    if (processo) processo.atualizadoEm = dataBrasiliaISO()
    return clone(existente)
  }

  const doc: DocumentoGerado = {
    id: `DOC-${ANO_SERIE}-${String(++db.seqDocumento).padStart(4, "0")}`,
    prefeituraId: processo?.prefeituraId ?? escopoPrefeituras()?.[0] ?? "PREF-001",
    processoId: input.processoId,
    titulo: `${input.tipo} — ${objeto}`,
    tipo: input.tipo,
    formato: meta.formato,
    geradoEm,
    tamanho: `${tamanhoKB} KB`,
    status: "final",
    versao: 1,
  }
  db.documentos.unshift(doc)
  db.versoes.set(chaveVersao, [entradaDeHistorico(1, geradoEm, `${tamanhoKB} KB`)])

  // Indicadores da tela de Documentos e do dashboard acompanham a nova geração.
  db.resumoDocumentos.total += 1
  db.resumoDocumentos.esteMes += 1
  db.resumoDocumentos.armazenamentoMB = Math.round((db.resumoDocumentos.armazenamentoMB + tamanhoKB / 1024) * 10) / 10
  db.estatisticas.documentosGerados += 1
  db.estatisticas.documentosSemana += 1
  if (input.tipo === "ETP") db.estatisticas.etpsConcluidos += 1

  // Reflete a conclusão no processo de origem.
  if (processo) {
    if (input.tipo === "ETP") processo.etpStatus = "Completo"
    if (input.tipo === "TR") processo.trStatus = "Completo"
    processo.atualizadoEm = dataBrasiliaISO()
  }
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

export async function getUsuarios(prefeituraId?: string): Promise<Usuario[]> {
  return listarUsuariosNaApi(prefeituraId)
}

export interface NovoUsuarioInput {
  nome: string
  cpf: string
  email: string
  cargo: string
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
    usuario.primeiroNome = usuario.nome.split(" ")[0] ?? usuario.nome
    usuario.iniciais = iniciaisDe(usuario.nome)
  }
  if (input.email != null) usuario.email = input.email.trim()
  if (input.cargo != null) usuario.cargo = input.cargo.trim()
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
