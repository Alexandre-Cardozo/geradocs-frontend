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
import { CATALOGO, REGRA_MODALIDADE, ordenar, secoesPorTipoBase } from "@/lib/documentos"
import { proximoStatus, transicaoDe } from "@/lib/processos/fluxo"
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
import { dataBrasiliaISO, dataHoraBrasiliaISO } from "@/lib/format"
import type {
  ApontamentoRetificacao,
  DecisaoAprovacao,
  DocumentoGerado,
  EstatisticasDashboard,
  EventoAprovacao,
  ItemAprovacao,
  ItemChecklist,
  NovoProcessoInput,
  ParecerDFD,
  ParecerJuridico,
  PapelUsuario,
  PerfilAcesso,
  Processo,
  ResumoDocumentos,
  SecaoDocumento,
  Secretaria,
  Sessao,
  StatusProcesso,
  Tenant,
  TipoDocumento,
  TransicaoAprovacao,
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
  /** Apontamentos de retificação (por seção) abertos e resolvidos. */
  apontamentos: [] as ApontamentoRetificacao[],
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
  const usuario = usuarioLogado()
  const escopo = usuario?.prefeituraId ?? null
  const meus = escopo ? db.processos.filter((p) => p.prefeituraId === escopo) : db.processos
  const docs = escopo ? db.documentos.filter((d) => d.prefeituraId === escopo) : db.documentos
  const ativos = meus.filter((p) => !["concluido", "rejeitado"].includes(p.status)).length
  const aguardando = meus.filter((p) => p.status === "aguardando").length
  const etps = docs.filter((d) => d.tipo === "ETP").length
  return {
    ...clone(db.estatisticas),
    processosAtivos: ativos,
    aguardandoAprovacao: aguardando,
    documentosGerados: docs.length,
    etpsConcluidos: etps,
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
  const usuario = usuarioLogado()
  return usuario?.prefeituraId ? [usuario.prefeituraId] : null
}

export async function getProcessos(params: ListaProcessosParams = {}): Promise<Paginado<Processo>> {
  await delay()
  const { busca = "", status = "todos", pagina = 1, porPagina = 8 } = params
  const escopo = escopoPrefeituras()
  const filtrados = db.processos.filter((p) => {
    if (escopo && !escopo.includes(p.prefeituraId)) return false
    const matchStatus = status === "todos" || p.status === status
    const q = busca.trim().toLowerCase()
    const matchBusca = q === "" || p.objeto.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    return matchStatus && matchBusca
  })
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / porPagina))
  const inicio = (pagina - 1) * porPagina
  return {
    itens: clone(filtrados.slice(inicio, inicio + porPagina)),
    total: filtrados.length,
    pagina,
    totalPaginas,
  }
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
  await delay(600)
  const autor = exigeSessao()
  if (!autor.prefeituraId) throw new Error("Somente usuários vinculados a uma prefeitura criam processos.")
  const id = `PROC-${ANO_SERIE}-${String(db.seqProcesso++).padStart(3, "0")}`
  const hoje = dataBrasiliaISO()
  const processo: Processo = {
    id,
    prefeituraId: autor.prefeituraId,
    objeto: input.objeto || "Novo Processo de Contratação",
    objetoDemanda: input.objetoDemanda,
    modalidade: input.modalidade,
    secretaria: input.secretaria,
    status: "rascunho",
    valorEstimado: input.valorEstimado ?? 0,
    responsavel: autor.nome,
    criadoEm: hoje,
    atualizadoEm: hoje,
    etpStatus: "Não iniciado",
    trStatus: "Não iniciado",
    documentos: input.documentos,
    fundamentoLegal: input.fundamentoLegal,
    ata: input.ata ?? null,
    fases: input.fases,
    dfdArquivo: input.dfdArquivo ?? null,
    trilha: [],
  }
  db.processos.unshift(processo)
  return clone(processo)
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
  // Esvaziar uma seção antes concluída volta o status para "Não iniciado" —
  // senão o rail e o percentual do documento contariam seção vazia como completa.
  secao.status = input.status ?? (input.conteudo.trim() ? "Completo" : "Não iniciado")
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

/* ── Fluxo de status: envio, encaminhamento, decisão, conclusão ────────────── */

const PIPELINE: StatusProcesso[] = ["em_revisao", "aguardando", "aprovado", "rejeitado"]

function processoOuErro(processoId: string): Processo {
  const processo = db.processos.find((p) => p.id === processoId)
  if (!processo) throw new Error(`Processo ${processoId} não encontrado`)
  return processo
}

function docsGeradosDo(processoId: string): TipoDocumento[] {
  return db.documentos.filter((d) => d.processoId === processoId).map((d) => d.tipo)
}

/** Documentos obrigatórios da modalidade ainda não gerados — trava o envio. */
function obrigatoriosPendentes(processo: Processo): TipoDocumento[] {
  const gerados = docsGeradosDo(processo.id)
  return REGRA_MODALIDADE[processo.modalidade].obrigatorios
    .filter((t) => processo.documentos.includes(t) && !gerados.includes(t))
}

/**
 * Checklist de conformidade — derivado do estado do processo (não é mais uma
 * fixture). Cada obrigatório gerado, o parecer jurídico (Art. 53) e a
 * verificação do DFD viram itens verificáveis.
 */
function montarChecklist(processo: Processo): ItemChecklist[] {
  const gerados = docsGeradosDo(processo.id)
  const itens: ItemChecklist[] = ordenar(
    REGRA_MODALIDADE[processo.modalidade].obrigatorios.filter((t) => processo.documentos.includes(t))
  ).map((tipo) => ({
    ok: gerados.includes(tipo),
    texto: `${CATALOGO[tipo].titulo} gerado e finalizado`,
  }))
  itens.push({
    ok: processo.parecerJuridico?.favoravel === true,
    texto: "Parecer jurídico favorável (Art. 53, Lei 14.133/21)",
  })
  const semApontamentos = !db.apontamentos.some((a) => a.processoId === processo.id && !a.resolvido)
  itens.push({ ok: semApontamentos, texto: "Nenhum apontamento de retificação pendente" })
  return itens
}

function empurrarTransicao(processo: Processo, evento: EventoAprovacao, papel: PapelUsuario, comentario: string): void {
  const para = proximoStatus(processo.status, evento)
  if (!para) throw new Error(`Transição inválida: ${evento} a partir de ${processo.status}`)
  const transicao: TransicaoAprovacao = {
    evento,
    de: processo.status,
    para,
    autor: usuarioLogado()?.nome ?? "Sistema",
    papel,
    data: dataBrasiliaISO(),
    comentario,
  }
  processo.trilha.push(transicao)
  processo.status = para
  processo.atualizadoEm = dataBrasiliaISO()
}

/** Prazo de análise: 7 dias a partir de hoje (fuso de Brasília). */
function prazoAnalise(): string {
  const d = new Date()
  d.setDate(d.getDate() + 7)
  return dataBrasiliaISO(d)
}

/** Envia o processo para análise: rascunho → em_revisao. Exige os obrigatórios gerados. */
export async function enviarParaAprovacao(processoId: string, comentario: string): Promise<Processo> {
  await delay(500)
  const processo = processoOuErro(processoId)
  if (!transicaoDe(processo.status, "envio")) {
    throw new Error(`O processo não pode ser enviado a partir de "${processo.status}".`)
  }
  const pendentes = obrigatoriosPendentes(processo)
  if (processo.status === "rascunho" && pendentes.length > 0) {
    throw new Error(`Gere os documentos obrigatórios antes de enviar: ${pendentes.join(", ")}.`)
  }
  processo.enviadoEm = dataBrasiliaISO()
  processo.prazo = prazoAnalise()
  empurrarTransicao(processo, "envio", "servidor_compras", comentario || "Documentos concluídos; enviado para análise.")
  return clone(processo)
}

/** Registra o parecer jurídico de controle prévio de legalidade (Art. 53). */
export async function registrarParecerJuridico(
  processoId: string,
  favoravel: boolean,
  comentario: string
): Promise<Processo> {
  await delay(450)
  const processo = processoOuErro(processoId)
  const parecer: ParecerJuridico = { favoravel, autor: usuarioLogado()?.nome ?? "Jurídico", data: dataBrasiliaISO(), comentario }
  processo.parecerJuridico = parecer
  processo.atualizadoEm = dataBrasiliaISO()
  return clone(processo)
}

/** Encaminha ao gestor aprovador: em_revisao → aguardando. Exige parecer jurídico favorável. */
export async function encaminharParaAprovacao(processoId: string, comentario: string): Promise<Processo> {
  await delay(500)
  const processo = processoOuErro(processoId)
  if (proximoStatus(processo.status, "envio") !== "aguardando") {
    throw new Error(`O processo não pode ser encaminhado a partir de "${processo.status}".`)
  }
  if (processo.parecerJuridico?.favoravel !== true) {
    throw new Error("Registre um parecer jurídico favorável (Art. 53) antes de encaminhar ao gestor.")
  }
  empurrarTransicao(processo, "envio", "comissao", comentario || "Documentação conferida; segue para decisão do gestor.")
  return clone(processo)
}

/** Conclui o processo aprovado: aprovado → concluido. */
export async function concluirProcesso(processoId: string, comentario: string): Promise<Processo> {
  await delay(450)
  const processo = processoOuErro(processoId)
  if (proximoStatus(processo.status, "conclusao") !== "concluido") {
    throw new Error(`Só é possível concluir um processo aprovado (atual: "${processo.status}").`)
  }
  empurrarTransicao(processo, "conclusao", "gestor_aprovador", comentario || "Processo homologado e concluído.")
  return clone(processo)
}

/* ── Aprovações ────────────────────────────────────────────────────────────── */

/** Projeta um processo do pipeline em item da fila de aprovação. */
function projetarAprovacao(processo: Processo): ItemAprovacao {
  return {
    processoId: processo.id,
    objeto: processo.objeto,
    documentos: ordenar(processo.documentos),
    secretaria: processo.secretaria,
    responsavel: processo.responsavel,
    valorEstimado: processo.valorEstimado,
    modalidade: processo.modalidade,
    enviadoEm: processo.enviadoEm ?? processo.criadoEm,
    status: processo.status,
    parecerJuridico: processo.parecerJuridico,
    checklist: montarChecklist(processo),
    trilha: processo.trilha,
  }
}

/**
 * Fila de aprovação — derivada dos processos no pipeline. Ordena pelo estágio do
 * fluxo (Aguardando primeiro) e, dentro do estágio, pelo envio mais antigo — quem
 * espera há mais tempo aparece no topo.
 */
export async function getFilaAprovacoes(): Promise<ItemAprovacao[]> {
  await delay()
  const escopo = escopoPrefeituras()
  const ordemStatus: Record<string, number> = { aguardando: 0, em_revisao: 1, aprovado: 2, rejeitado: 3 }
  const itens = db.processos
    .filter((p) => PIPELINE.includes(p.status) && (!escopo || escopo.includes(p.prefeituraId)))
    .map(projetarAprovacao)
    .sort((a, b) => {
      const estagio = (ordemStatus[a.status] ?? 9) - (ordemStatus[b.status] ?? 9)
      if (estagio !== 0) return estagio
      return a.enviadoEm < b.enviadoEm ? -1 : a.enviadoEm > b.enviadoEm ? 1 : 0
    })
  return clone(itens)
}

export interface ApontamentoInput {
  tipo: TipoDocumento
  secaoId?: string
  secaoTitulo?: string
  texto: string
}

export interface DecisaoInput {
  processoId: string
  decisao: DecisaoAprovacao
  comentario: string
  /** Apontamentos por seção — obrigatórios quando a decisão é "retificar". */
  apontamentos?: ApontamentoInput[]
}

export async function decidirAprovacao(input: DecisaoInput): Promise<ItemAprovacao> {
  await delay(500)
  const processo = processoOuErro(input.processoId)
  const evento: EventoAprovacao =
    input.decisao === "aprovar" ? "aprovacao" : input.decisao === "rejeitar" ? "rejeicao" : "retificacao"
  if (!transicaoDe(processo.status, evento)) {
    throw new Error(`Decisão "${input.decisao}" inválida a partir de "${processo.status}".`)
  }
  if (input.decisao === "aprovar" && montarChecklist(processo).some((i) => !i.ok)) {
    throw new Error("O checklist de conformidade precisa estar integralmente atendido para aprovar.")
  }
  // Retificação abre apontamentos por seção — a trilha por seção que o TCU espera.
  if (input.decisao === "retificar") {
    for (const ap of input.apontamentos ?? []) {
      db.apontamentos.unshift({
        id: `APT-${String(++db.seqApontamento).padStart(4, "0")}`,
        processoId: processo.id,
        tipo: ap.tipo,
        secaoId: ap.secaoId,
        secaoTitulo: ap.secaoTitulo,
        texto: ap.texto,
        autor: usuarioLogado()?.nome ?? "Gestor",
        papel: "gestor_aprovador",
        data: dataBrasiliaISO(),
        resolvido: false,
      })
    }
  }
  empurrarTransicao(processo, evento, "gestor_aprovador", input.comentario)
  return clone(projetarAprovacao(processo))
}

/* ── Apontamentos de retificação ───────────────────────────────────────────── */

export async function getApontamentos(processoId: string): Promise<ApontamentoRetificacao[]> {
  await delay()
  return clone(db.apontamentos.filter((a) => a.processoId === processoId))
}

export async function resolverApontamento(id: string): Promise<ApontamentoRetificacao> {
  await delay(350)
  const ap = db.apontamentos.find((a) => a.id === id)
  if (!ap) throw new Error(`Apontamento ${id} não encontrado`)
  ap.resolvido = true
  return clone(ap)
}

/* ── Documentos ────────────────────────────────────────────────────────────── */

export async function getDocumentos(): Promise<DocumentoGerado[]> {
  await delay()
  const escopo = escopoPrefeituras()
  const docs = escopo ? db.documentos.filter((d) => escopo.includes(d.prefeituraId)) : db.documentos
  return clone(docs)
}

export async function getResumoDocumentos(): Promise<ResumoDocumentos> {
  await delay()
  const escopo = escopoPrefeituras()
  if (!escopo) return clone(db.resumoDocumentos)
  const docs = db.documentos.filter((d) => escopo.includes(d.prefeituraId))
  const totalKB = docs.reduce((s, d) => s + (Number.parseInt(d.tamanho, 10) || 0), 0)
  return { total: docs.length, esteMes: docs.length, armazenamentoMB: Math.round((totalKB / 1024) * 10) / 10 }
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
    const apontamentosAbertos = db.apontamentos.filter(
      (a) => a.processoId === input.processoId && a.tipo === input.tipo && !a.resolvido
    )
    existente.versao += 1
    existente.titulo = `${input.tipo} — ${objeto}`
    existente.geradoEm = geradoEm
    existente.tamanho = `${tamanhoKB} KB`
    existente.status = "final"
    const historico = db.versoes.get(chaveVersao) ?? []
    historico.unshift({
      versao: existente.versao,
      geradoEm,
      tamanho: `${tamanhoKB} KB`,
      nota:
        apontamentosAbertos.length > 0
          ? `Retificação: ${apontamentosAbertos.length} apontamento(s) atendido(s)`
          : "Regeração",
    })
    db.versoes.set(chaveVersao, historico)
    // Regeração após retificação resolve os apontamentos abertos daquele documento.
    for (const ap of apontamentosAbertos) ap.resolvido = true
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
  db.versoes.set(chaveVersao, [{ versao: 1, geradoEm, tamanho: `${tamanhoKB} KB`, nota: "Geração inicial" }])

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
