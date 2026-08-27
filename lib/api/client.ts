// Guarda explícita: o "banco" em memória abaixo é estado mutável de módulo e só
// pode viver no browser. Se algum RSC importar isto (ex.: prefetch no servidor),
// o build falha em vez de vazar estado entre requests/usuários.
import "client-only"

import { parecerDFDBase } from "@/lib/mocks/fixtures"
import {
  impactoTrocaModalidade,
  motivoDaTrocaDeModalidade,
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
  trocarPropriaSenha as trocarSenhaNaApi,
} from "@/lib/api/auth-client"
import {
  criarDepartamento as criarDepartamentoNaApi,
  atualizarEntidade as atualizarEntidadeNaApi,
  criarEntidade as criarEntidadeNaApi,
  atualizarUsuario as atualizarUsuarioNaApi,
  criarUsuario as criarUsuarioNaApi,
  desativarDepartamento as desativarDepartamentoNaApi,
  renomearDepartamento as renomearDepartamentoNaApi,
  desativarEntidade as desativarEntidadeNaApi,
  desativarUsuario as desativarUsuarioNaApi,
  listarEntidades as listarEntidadesNaApi,
  listarUsuarios as listarUsuariosNaApi,
  obterTenant as obterTenantNaApi,
} from "@/lib/api/access-client"
import {
  acervoDoNome,
  resumoDoAcervo,
} from "@/lib/api/generation-client"
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
  estatisticasDeProcesso,
  trilhaDoProcesso,
} from "@/lib/api/procurement-client"
import {
  citarNaSecao,
  declararPrevisao,
  importarPlano,
  baixarPlano,
  planoVigente,
  planosDoOrgao,
  verificacaoDoProcesso,
} from "@/lib/api/pca-client"
import { baixarArquivo, gerarArquivos } from "@/lib/api/generation-client"
import { dataHoraBrasiliaISO } from "@/lib/format"
import type {
  DocumentoGerado,
  EstatisticasDashboard,
  EventoDoProcesso,
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
  TipoEntidade,
  Usuario,
  VersaoDocumento,
} from "@/lib/types"

/**
 * Fachada de dados do GeraDocs. Autenticação e recuperação usam a API Spring;
 * os módulos ainda não implementados no backend permanecem em memória sem
 * alterar as assinaturas consumidas pelas telas e hooks.
 */

const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T


function delay(ms = 350 + Math.random() * 350): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/* ── Estado em memória ─────────────────────────────────────────────────────── */

/**
 * O que sobrou do "banco" do protótipo: o parecer do DFD, e mais nada.
 *
 * Até 26/08/2026 este objeto ainda guardava processos, documentos, versões,
 * corpos, estatísticas, resumo do acervo e a sessão. **Nada disso era lido**: as
 * telas passaram a perguntar ao servidor entre os Blocos 9 e 12, e as escritas
 * continuaram aqui, alimentando um estado que ninguém consultava. Estado morto
 * não é inofensivo — o próximo a ler este arquivo acredita nele.
 *
 * O parecer fica porque é o único ainda declarado como sintético
 * (`DADOS_SINTETICOS.parecerDfd`), e sai quando o modelo entrar (12.2). A tela
 * diz isso a quem lê.
 */
const db = {
  pareceresDFD: new Map<string, ParecerDFD>(),
}

export async function login(identificador: string, senha: string): Promise<Sessao> {
  const sessao = await autenticar(identificador, senha)
  return clone(sessao)
}

export async function logout(): Promise<void> {
  await encerrarSessao()
}

/** Sessão atual, ou null se ninguém está logado. */
export async function getSessao(): Promise<Sessao | null> {
  const sessao = await obterSessao()
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

/**
 * Os indicadores do painel.
 *
 * Duas chamadas porque são dois assuntos: quantos processos existem e em que
 * estado (contratação), e quantos arquivos foram impressos e quando (acervo).
 * Nenhum módulo do servidor conta pelo outro — a soma é da tela (ADR-025).
 */
export async function getEstatisticas(): Promise<EstatisticasDashboard> {
  const [processos, acervo] = await Promise.all([
    estatisticasDeProcesso(),
    resumoDoAcervo(),
  ])
  return {
    processosAtivos: processos.ativos,
    processosNovosMes: processos.criadosNoMes,
    processosEmElaboracao: processos.iniciados,
    documentosPendentes: processos.documentosPendentes,
    documentosGerados: acervo.total,
    documentosSemana: acervo.ultimosSeteDias,
    etpsConcluidos: acervo.etpsConcluidos,
    taxaConclusao: processos.taxaConclusao,
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


export async function getProcessos(params: ListaProcessosParams = {}): Promise<Paginado<Processo>> {
  return listarProcessos(params)
}

export async function getProcesso(id: string): Promise<Processo> {
  return obterProcesso(id)
}

export async function criarProcesso(input: NovoProcessoInput): Promise<Processo> {
  return criarProcessoReal(input)
}

export interface AtualizarProcessoInput {
  id: string
  secretaria?: string
  objeto?: string
  objetoDemanda?: string
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
 * O motivo da troca de modalidade vai **com** a edição, e não para um registro
 * paralelo: até o 12.1 ele era guardado na memória do navegador, e a trilha do
 * servidor registrava que o processo mudou sem registrar por quê.
 */
export async function atualizarProcesso(input: AtualizarProcessoInput): Promise<Processo> {
  const atual = await obterProcesso(input.id)
  let motivo: string | undefined
  if (input.modalidade !== undefined && input.modalidade !== atual.modalidade) {
    // Contra a lista que o processo tinha, e não contra a que está sendo salva:
    // com a lista nova, o que a tela acabou de remover já não estaria lá, e a
    // trilha registraria "nada removido" exatamente quando algo foi.
    const impacto = impactoTrocaModalidade(
      atual.modalidade,
      input.modalidade,
      atual.documentos,
      await docsGeradosDo(atual.id),
    )
    motivo = motivoDaTrocaDeModalidade(
      atual.modalidade,
      input.modalidade,
      impacto,
      input.justificativaModalidade ?? "",
    )
  }
  return atualizarProcessoReal(atual, {
    objeto: input.objeto,
    objetoDemanda: input.objetoDemanda,
    modalidade: input.modalidade,
    documentos: input.documentos,
    motivo,
  })
}

/** A trilha do processo, como o servidor a registrou (ADR-024). */
export async function getTrilha(processoId: string): Promise<EventoDoProcesso[]> {
  return trilhaDoProcesso(processoId)
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

/**
 * Os documentos que este processo já gerou.
 *
 * <p>Do servidor, e não da memória da aba. Até 26/08/2026 esta função lia o
 * acervo em memória do protótipo: recarregada a página, ela devolvia lista
 * vazia para todo processo real — e a troca de modalidade avisava "nenhum
 * documento gerado é afetado" justamente quando havia documento gerado.
 */
async function docsGeradosDo(processoId: string): Promise<TipoDocumento[]> {
  const acervo = await acervoDoNome()
  return acervo.filter((d) => d.processoId === processoId).map((d) => d.tipo)
}

/**
 * Encerra o processo. A plataforma termina aqui: protocolo, assinatura e
 * aprovação acontecem no sistema de processo administrativo da entidade.
 *
 * Documento pendente **não impede** o encerramento — apenas exige justificativa.
 * A plataforma orienta; quem decide é o servidor.
 */
/**
 * Encerra o processo. A plataforma termina aqui: protocolo, assinatura e
 * aprovação acontecem no sistema de processo administrativo da entidade.
 *
 * Documento pendente **não impede** o encerramento — apenas exige justificativa,
 * e quem cobra isso é o servidor, que sabe o que já foi concluído. Até 22/08/2026
 * esta função procurava o processo nas fixtures: todo processo real caía em
 * "não encontrado", e o botão da tela de detalhe estourava.
 */
export async function encerrarProcesso(processoId: string, justificativa = ""): Promise<Processo> {
  // Sem registro paralelo: o servidor grava o encerramento com a justificativa,
  // e a trilha da tela lê de lá (ADR-024).
  return encerrarProcessoReal(processoId, justificativa)
}

/** Reabre um processo encerrado para retificar documento. */
export async function reabrirProcesso(processoId: string, motivo: string): Promise<Processo> {
  return reabrirProcessoReal(processoId, motivo)
}


/* ── Documentos ────────────────────────────────────────────────────────────── */

/** O acervo do órgão, como o servidor o guarda. */
export async function getDocumentos(): Promise<DocumentoGerado[]> {
  return acervoDoNome()
}

/**
 * Os números acima da lista de Documentos.
 *
 * Contados no banco, e não deduzidos da lista: a lista é o que cabe mostrar, e
 * o acervo é o que existe.
 */
export async function getResumoDocumentos(): Promise<ResumoDocumentos> {
  const resumo = await resumoDoAcervo()
  return {
    total: resumo.total,
    esteMes: resumo.esteMes,
    // O servidor mede em bytes; converter é decisão de apresentação.
    armazenamentoMB: Math.round(resumo.bytesArmazenados / 1024 / 1024),
  }
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

/** O plano do exercício corrente; `null` enquanto não houver um. */
export async function getPlanoPca() {
  return planoVigente()
}

/** Todos os planos do órgão, do exercício mais recente para o mais antigo. */
export async function getPlanosPca() {
  return planosDoOrgao()
}

export async function importarPlanoPca(entrada: { ano: number; arquivo: File }) {
  return importarPlano(entrada)
}

/** Os bytes da planilha importada naquele exercício. */
export async function baixarPlanoPca(ano: number) {
  return baixarPlano(ano)
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

  // O arquivo é impresso pelo servidor, a partir da versão que acabou de ser
  // congelada. Até 23/08/2026 o formato e o tamanho eram constantes por tipo de
  // documento — iguais para todo processo, e sem arquivo nenhum por trás.
  const geracao = await gerarArquivos(input.processoId, input.tipo)
  const geradoEm = geracao.arquivos[0]?.geradoEm ?? dataHoraBrasiliaISO()
  const arquivos = geracao.arquivos.map((arquivo) => ({
    id: arquivo.id,
    formato: arquivo.formato,
    nomeDoArquivo: arquivo.nomeDoArquivo,
    bytes: arquivo.bytes,
    checksum: arquivo.checksum,
  }))

  const doc: DocumentoGerado = {
    // O identificador é o da geração no servidor, e não um contador local: é por
    // ele que se pede o arquivo de volta.
    id: geracao.id,
    entidadeId: processo.entidadeId,
    processoId: input.processoId,
    titulo: tituloComRotuloDeVersao(
      tituloDoDocumento(input.tipo, processo.objeto),
      concluido.versao,
    ),
    tipo: input.tipo,
    geradoEm,
    status: "final",
    versao: concluido.versao,
    arquivos,
  }

  // Nada é gravado aqui. O acervo, o histórico de versões e o corpo congelado
  // são do servidor desde os Blocos 9 e 11, e a tela os recarrega — manter uma
  // cópia local seria um segundo lugar onde a mesma verdade mora, que envelhece
  // na primeira aba que não passar por este caminho.
  return clone(doc)
}

/** Baixa um arquivo gerado, autenticado, e entrega ao navegador. */
export async function baixarArquivoGerado(
  processoId: string,
  tipo: TipoDocumento,
  arquivoId: string,
) {
  return baixarArquivo(processoId, tipo, arquivoId)
}

/* ── Configurações da entidade ───────────────────────────────────────────── */

export async function getConfigTenant(entidadeId: string): Promise<Tenant> {
  return obterTenantNaApi(entidadeId)
}

/**
 * Salva a configuração da entidade.
 *
 * O nome vai para o servidor; o resto — timbre, cabeçalho, rodapé — ainda é
 * fabricado por `tenantDa()` e está marcado como sintético na tela
 * (`lib/dominio/sintetico.ts`). Até 22/08/2026 **tudo** ia para uma fixture: a
 * tela dizia "salvo" e o recarregamento desfazia.
 */
export async function atualizarConfigTenant(patch: Partial<Tenant>, entidadeId: string): Promise<Tenant> {
  const salvo = await atualizarEntidadeNaApi(entidadeId, { nome: patch.nome })
  // Os campos que o servidor não guarda seguem no que a tela mandou, para que a
  // prévia continue mostrando o que a pessoa acabou de escolher nesta sessão.
  return { ...salvo, ...clone(patch), id: salvo.id }
}

/* ── Cadastro de entidades (admin geral) ─────────────────────────────────── */

export async function getEntidades(): Promise<Tenant[]> {
  return listarEntidadesNaApi()
}

export interface NovaEntidadeInput {
  nome: string
  /** O servidor assume `prefeitura` sem este campo — ver `lib/types.ts`. */
  tipo: TipoEntidade
}

export async function criarEntidade(input: NovaEntidadeInput): Promise<Tenant> {
  return criarEntidadeNaApi(input)
}

export async function removerEntidade(id: string): Promise<void> {
  await desativarEntidadeNaApi(id)
}

/* ── Cadastro de usuários (admin geral e coordenador da própria entidade) ── */

/**
 * @param busca trecho de nome ou matrícula; quem filtra é o servidor
 */
export async function getUsuarios(entidadeId?: string, busca?: string): Promise<Usuario[]> {
  return listarUsuariosNaApi(entidadeId, busca)
}

export interface NovoUsuarioInput {
  nome: string
  cpf: string
  email: string
  cargo: string
  matricula?: string
  decretoNomeacao?: string
  perfilAcesso: PerfilAcesso
  entidadeId: string | null
  secretaria?: string
}

/**
 * Cadastra o servidor. A senha vem sorteada do servidor, uma única vez.
 *
 * <p>Até 23/08/2026 quem cadastrava digitava a senha de quem era cadastrado —
 * e ela valia para sempre. Escolher significa saber, e saber a senha de outra
 * pessoa é poder agir como ela.
 */
export async function criarUsuario(input: NovoUsuarioInput) {
  return criarUsuarioNaApi({
    ...input,
    departamentoId: input.secretaria,
  })
}

/** Troca a própria senha — o que libera a sessão no primeiro acesso. */
export async function trocarPropriaSenha(senhaAtual: string, novaSenha: string) {
  return trocarSenhaNaApi(senhaAtual, novaSenha)
}

export interface AtualizarUsuarioInput {
  id: string
  nome?: string
  email?: string
  cargo?: string
  matricula?: string
  decretoNomeacao?: string
  perfilAcesso?: PerfilAcesso
  entidadeId?: string | null
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

export async function criarSecretaria(entidadeId: string, nome: string): Promise<Secretaria> {
  return criarDepartamentoNaApi(entidadeId, nome)
}

export async function renomearSecretaria(
  entidadeId: string,
  secretariaId: string,
  nome: string,
): Promise<Secretaria> {
  return renomearDepartamentoNaApi(entidadeId, secretariaId, nome)
}

export async function removerSecretaria(entidadeId: string, secretariaId: string): Promise<void> {
  await desativarDepartamentoNaApi(entidadeId, secretariaId)
}
