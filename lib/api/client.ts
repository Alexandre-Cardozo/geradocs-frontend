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
import {
  calcularIndicadores,
  empilharVersao,
  entradaDeHistorico,
  impactoTrocaModalidade,
  iniciaisDe,
  motivoDaTrocaDeModalidade,
  notaDaVersao,
  numeroDeDocumento,
  numeroDeProcesso,
  primeiroNome,
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
  atualizarPrefeitura as atualizarPrefeituraNaApi,
  criarPrefeitura as criarPrefeituraNaApi,
  atualizarUsuario as atualizarUsuarioNaApi,
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
  acrescentarSecao,
  compararVersoes as compararVersoesNaApi,
  concluirDocumento,
  corpoDaVersaoVigente,
  gerarTextoDaSecao,
  excluirSecao,
  historicoDeVersoes,
  reordenarSecoes,
  salvarSecao,
  versoesComTexto,
} from "@/lib/api/authoring-client"
import {
  atualizarProcessoReal,
  consolidacaoDaDemanda,
  criarProcessoReal,
  encerrarProcessoReal,
  listarProcessos,
  obterProcesso,
  reabrirProcessoReal,
} from "@/lib/api/procurement-client"
import {
  citarNaSecao,
  declararPrevisao,
  importarPlano,
  planoVigente,
  verificacaoDoProcesso,
} from "@/lib/api/pca-client"
import { dataHoraBrasiliaISO } from "@/lib/format"
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

/**
 * A sessão atual, ou erro.
 *
 * Devolve a sessão inteira, e não só o usuário: quem edita o próprio perfil
 * precisa da prefeitura junto, e procurá-la de novo por id abriria caminho para
 * devolver a de outra pessoa.
 */
function exigeSessao(): Sessao {
  if (!db.sessao) throw new Error("Sessão expirada. Faça login novamente.")
  return db.sessao
}

// Semeia o histórico de versões (v1) dos documentos já existentes nas fixtures,
// para que getHistoricoVersoes seja coerente desde o início.
for (const doc of db.documentos) {
  db.versoes.set(`${doc.processoId}:${doc.tipo}`, [
    { versao: doc.versao, geradoEm: doc.geradoEm, tamanho: doc.tamanho, nota: "Geração inicial" },
  ])
}


/* ── Autenticação / sessão ─────────────────────────────────────────────────── */

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
  const { usuario, prefeitura } = exigeSessao()
  usuario.avatarDataUrl = avatarDataUrl
  return { usuario: clone(usuario), prefeitura: clone(prefeitura) }
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
  const { usuario, prefeitura } = exigeSessao()
  if (input.nome != null && input.nome.trim() !== "") {
    usuario.nome = input.nome.trim()
    usuario.primeiroNome = primeiroNome(usuario.nome)
    usuario.iniciais = iniciaisDe(usuario.nome)
  }
  if (input.email != null) usuario.email = input.email.trim()
  if (input.cargo != null) usuario.cargo = input.cargo.trim()
  if (input.secretaria !== undefined) usuario.secretaria = input.secretaria
  if (input.avatarDataUrl !== undefined) usuario.avatarDataUrl = input.avatarDataUrl
  return { usuario: clone(usuario), prefeitura: clone(prefeitura) }
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

function docsGeradosDo(processoId: string): TipoDocumento[] {
  return db.documentos.filter((d) => d.processoId === processoId).map((d) => d.tipo)
}

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

/**
 * Encerra o processo. A plataforma termina aqui: protocolo, assinatura e
 * aprovação acontecem no sistema de processo administrativo da prefeitura.
 *
 * Documento pendente **não impede** o encerramento — apenas exige justificativa.
 * A plataforma orienta; quem decide é o servidor.
 */
/**
 * Encerra o processo. A plataforma termina aqui: protocolo, assinatura e
 * aprovação acontecem no sistema de processo administrativo da prefeitura.
 *
 * Documento pendente **não impede** o encerramento — apenas exige justificativa,
 * e quem cobra isso é o servidor, que sabe o que já foi concluído. Até 22/08/2026
 * esta função procurava o processo nas fixtures: todo processo real caía em
 * "não encontrado", e o botão da tela de detalhe estourava.
 */
export async function encerrarProcesso(processoId: string, justificativa = ""): Promise<Processo> {
  const processo = await encerrarProcessoReal(processoId, justificativa)
  registrarEventoLocal(processoId, "encerramento", motivoDoEncerramento(justificativa))
  return processo
}

/** Reabre um processo encerrado para retificar documento. */
export async function reabrirProcesso(processoId: string, motivo: string): Promise<Processo> {
  const processo = await reabrirProcessoReal(processoId, motivo)
  registrarEventoLocal(processoId, "reabertura", motivo)
  return processo
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

/** Acrescenta uma seção criada pelo servidor, ancorada em uma do catálogo. */
export async function acrescentarSecaoDoDocumento(
  processoId: string,
  tipo: TipoDocumento,
  titulo: string,
  ancora: string,
  subtopico: boolean,
) {
  return acrescentarSecao(processoId, tipo, titulo, ancora, subtopico)
}

/** Exclui uma seção criada pelo servidor. As do catálogo têm a dispensa. */
export async function excluirSecaoDoDocumento(
  processoId: string,
  tipo: TipoDocumento,
  secaoId: string,
) {
  return excluirSecao(processoId, tipo, secaoId)
}

/** Reordena as seções criadas pelo servidor. As do catálogo seguem a lei. */
export async function reordenarSecoesDoDocumento(
  processoId: string,
  tipo: TipoDocumento,
  secoesNaOrdem: string[],
) {
  return reordenarSecoes(processoId, tipo, secoesNaOrdem)
}

/** A demanda consolidada dos DFDs do processo. */
export async function getConsolidacaoDaDemanda(processoId: string) {
  return consolidacaoDaDemanda(processoId)
}

/** A verificação de previsão no PCA para o processo. */
export async function getVerificacaoPca(processoId: string) {
  return verificacaoDoProcesso(processoId)
}

/** O servidor informa o item do PCA que a busca não encontrou. */
export async function declararPrevisaoNoPca(
  processoId: string,
  entrada: { codigo: string; nota?: string },
) {
  return declararPrevisao(processoId, entrada)
}

/** Escreve a citação do PCA na seção do inciso II do ETP. */
export async function citarPcaNaSecao(processoId: string) {
  return citarNaSecao(processoId)
}

/** O plano vigente do órgão; `null` enquanto nenhum tiver sido anexado. */
export async function getPlanoPca() {
  return planoVigente()
}

export async function importarPlanoPca(entrada: {
  ano: number
  arquivo: string
  conteudo: string
}) {
  return importarPlano(entrada)
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
/**
 * Acrescenta a entrada ao histórico do documento.
 *
 * A primeira geração e a regeração passam pelo mesmo caminho: separá-las daria
 * duas formas de montar a mesma lista, e é assim que uma delas envelhece.
 */
function empilhar(chaveVersao: string, entrada: VersaoDocumento): void {
  db.versoes.set(chaveVersao, empilharVersao(db.versoes.get(chaveVersao) ?? [], entrada))
}

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
    empilhar(
      chaveVersao,
      entradaDeHistorico(existente.versao, geradoEm, `${tamanhoKB} KB`, input.retificacao),
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
  empilhar(chaveVersao, entradaDeHistorico(concluido.versao, geradoEm, `${tamanhoKB} KB`))
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

export async function getConfigTenant(prefeituraId?: string): Promise<Tenant> {
  const id = prefeituraId ?? exigeSessao().usuario.prefeituraId
  if (!id) throw new Error("Selecione uma prefeitura para consultar as configurações.")
  return obterTenantNaApi(id)
}

/**
 * Salva a configuração do órgão.
 *
 * Nome e unidade vão para o servidor; o resto — timbre, cabeçalho, rodapé —
 * ainda é fabricado por `tenantDa()` e está marcado como sintético na tela
 * (`lib/dominio/sintetico.ts`). Até 22/08/2026 **tudo** ia para uma fixture: a
 * tela dizia "salvo" e o recarregamento desfazia.
 */
export async function atualizarConfigTenant(patch: Partial<Tenant>, prefeituraId?: string): Promise<Tenant> {
  const id = prefeituraId ?? exigeSessao().usuario.prefeituraId
  if (!id) throw new Error("Selecione uma prefeitura para salvar as configurações.")
  const salvo = await atualizarPrefeituraNaApi(id, { orgao: patch.orgao, unidade: patch.unidade })
  // Os campos que o servidor não guarda seguem no que a tela mandou, para que a
  // prévia continue mostrando o que a pessoa acabou de escolher nesta sessão.
  return { ...salvo, ...clone(patch), id: salvo.id }
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

/**
 * Edita o servidor no cadastro.
 *
 * Até 22/08/2026 esta função procurava o usuário nas fixtures: a lista já vinha
 * do servidor, então editar qualquer pessoa real caía em "não encontrado".
 * `ativo` não entra aqui — desativar tem caminho próprio, com o motivo que a
 * trilha registra.
 */
export async function atualizarUsuario(input: AtualizarUsuarioInput): Promise<Usuario> {
  return atualizarUsuarioNaApi(input)
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
