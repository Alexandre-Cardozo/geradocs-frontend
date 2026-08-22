/**
 * Modelo de domínio do GeraDocs — congelado nesta fase (seção 3.1.6 do plano).
 * As assinaturas espelham o que o cliente gerado do OpenAPI do Spring Boot
 * exporá; a troca de mocks por HTTP não deve alterar estes tipos.
 */

/**
 * Vocabulário fixo de status de processo.
 *
 * Três, e não seis: o fluxo de aprovação entre setores acontece no sistema de
 * processo administrativo da prefeitura, não aqui (ADR §24). A plataforma
 * termina quando os documentos estão prontos — `em_revisao`, `aguardando`,
 * `aprovado` e `rejeitado` descreviam etapas que ela não executa mais.
 */
export type StatusProcesso = "rascunho" | "em_elaboracao" | "concluido"

export const STATUS_PROCESSO_LABEL: Record<StatusProcesso, string> = {
  rascunho: "Rascunho",
  em_elaboracao: "Em Elaboração",
  concluido: "Concluído",
}

/** Estados de documento/seção (vocabulário fixo). */
export type StatusDocumento =
  | "Completo"
  | "Em andamento"
  | "Em revisão"
  | "Não iniciado"
  | "Rejeitado"

/** Tags fixas. */
export type TagProcesso = "Obrigatório" | "Opcional" | "Recomendado" | "Urgente"

/**
 * Modalidades de licitação da Lei 14.133/21 (Art. 28) + formas de contratação
 * direta e procedimento auxiliar tratados como opções no wizard.
 */
export type Modalidade =
  | "Pregão Eletrônico"
  | "Concorrência"
  | "Concurso"
  | "Leilão"
  | "Diálogo Competitivo"
  | "Dispensa Art. 75"
  | "Inexigibilidade"
  | "Credenciamento"

/**
 * Rótulo de exibição da modalidade — fonte única usada no wizard de Novo
 * Processo e nos filtros. Difere do valor apenas onde o nome usual não é o valor
 * técnico (ex.: "Dispensa Art. 75" é exibida como "Dispensa de Licitação").
 */
export const MODALIDADE_LABEL: Record<Modalidade, string> = {
  "Pregão Eletrônico": "Pregão Eletrônico",
  "Concorrência": "Concorrência",
  "Concurso": "Concurso",
  "Leilão": "Leilão",
  "Diálogo Competitivo": "Diálogo Competitivo",
  "Dispensa Art. 75": "Dispensa de Licitação",
  "Inexigibilidade": "Inexigibilidade",
  "Credenciamento": "Credenciamento",
}

/** Modo de gestão da Ata de Registro de Preços. */
export type ModoATA = "anexar" | "delegar" | "combinado"

export interface ConfigATA {
  modo: ModoATA
  motivo?: string
  arquivo?: string | null
}

export interface Processo {
  /** Formato PROC-AAAA-NNN. */
  id: string
  /** Prefeitura dona do processo (escopo multi-tenant). */
  prefeituraId: string
  /** Descrição/nomenclatura do processo — identifica-o no painel, listas e documentos. */
  objeto: string
  /** Objeto da demanda (contratação em si) — trabalha junto com o DFD e alimenta o ETP. */
  objetoDemanda?: string
  modalidade: Modalidade
  secretaria: string
  status: StatusProcesso
  /** Valor estimado em centavos não — em reais (number); formatar com formatBRL. */
  valorEstimado: number
  responsavel: string
  criadoEm: string
  atualizadoEm: string
  etpStatus: StatusDocumento
  trStatus: StatusDocumento
  /** Documentos solicitados para o processo (definidos no wizard, editáveis no hub). */
  documentos: Array<TipoDocumento>
  fundamentoLegal?: string
  /** Flags do modo de ATA (anexar / delegar busca à IA / combinado). */
  ata?: ConfigATA | null
  fases: {
    verificacaoDFD: boolean
    retificacao: boolean
  }
  dfdArquivo?: string | null
  urgente?: boolean
  /** Trilha de auditoria das transições de status (fonte única — a fila de aprovações projeta daqui). */
  trilha: EventoDoProcesso[]
}

export interface NovoProcessoInput {
  objeto: string
  objetoDemanda?: string
  modalidade: Modalidade
  secretaria: string
  valorEstimado?: number
  fundamentoLegal?: string
  dfdArquivo?: string | null
  ata?: ConfigATA | null
  documentos: Array<TipoDocumento>
  fases: {
    verificacaoDFD: boolean
    retificacao: boolean
  }
}

/** Painel especial do editor acionado por uma seção (ver components/documentos/paineis.tsx). */
export type PainelSecao = "ata" | "quantidades" | "valor"

/**
 * Seção de um documento gerável (ETP, TR, Cotação, Mapa, Edital, Contrato).
 * A estrutura seccional de cada tipo vive em `lib/documentos/secoes.ts`.
 */
export interface SecaoDocumento {
  /** Ordinal da seção dentro do documento ("1", "2", ...). */
  id: string
  titulo: string
  status: StatusDocumento
  /**
   * Seção indispensável. No ETP são as do Art. 18, § 2º (incisos I, IV, VI, VIII
   * e XIII); as demais são dispensáveis mediante justificativa.
   */
  obrigatoria: boolean
  conteudo: string
  /** Frase de orientação — o usuário sempre sabe o que escrever e por quê. */
  hint: string
  /** Fundamento citado literalmente (ex.: "Art. 18, § 1º, I, Lei 14.133/21"). */
  fundamentoLegal: string
  /**
   * Por que a seção foi dispensada.
   *
   * Só existe em seção dispensável deixada em branco. O Art. 18, § 2º admite
   * dispensar incisos **mediante justificativa** — sem ela, a seção
   * simplesmente sumiria do documento, e quem lê depois não distingue "não se
   * aplica" de "esqueceram".
   */
  justificativaDispensa?: string
  /** Painel especial do editor, quando a seção tem um. */
  painel?: PainelSecao
}

/** Achado do parecer da IA sobre o DFD. */
export interface AchadoDFD {
  tipo: "conformidade" | "alerta"
  severidade: "info" | "recomendacao" | "atencao"
  descricao: string
  /** Fundamentação citada literalmente (ex.: "PCA 2025 — item 47", "Art. 11 do Decreto 7.746/2012"). */
  fundamentacao?: string
}

export interface ParecerDFD {
  processoId: string
  arquivo: string
  analisadoEm: string
  /** Nota 0–100. */
  nota: number
  classificacao: string
  achados: AchadoDFD[]
}

/**
 * Eventos que compõem a trilha do processo.
 *
 * A trilha sobrevive à remoção do fluxo de aprovação (ADR §24) porque é o único
 * registro do que aconteceu **dentro** da plataforma — o sistema de protocolo da
 * prefeitura só registra o que vem depois.
 */
export type EventoProcesso =
  | "criacao"
  | "troca_modalidade"
  | "geracao_documento"
  | "retificacao"
  | "encerramento"
  | "reabertura"

export interface EventoDoProcesso {
  evento: EventoProcesso
  de: StatusProcesso
  para: StatusProcesso
  autor: string
  /** Perfil de quem praticou o evento — para a trilha dizer quem fez o quê. */
  papel: PerfilAcesso
  data: string
  comentario: string
}

/**
 * Documentos geráveis pela plataforma, na ordem canônica do fluxo de contratação.
 * O DFD é insumo (anexo + verificação) e o PCA é contexto do órgão — nenhum dos
 * dois é gerado aqui. Metadados de cada tipo: `lib/documentos/catalogo.ts`.
 */
export type TipoDocumento = "Cotação" | "ETP" | "Mapa" | "TR" | "Edital" | "Contrato"

export interface DocumentoGerado {
  /** Formato DOC-AAAA-NNNN. */
  id: string
  prefeituraId: string
  processoId: string
  titulo: string
  tipo: TipoDocumento
  formato: string
  geradoEm: string
  tamanho: string
  status: "final" | "rascunho"
  /** Versão vigente (1 na primeira geração; incrementa a cada regeração/retificação). */
  versao: number
}

/** Entrada do histórico de versões de um documento (rastreabilidade — não sobrescreve). */
export interface VersaoDocumento {
  versao: number
  geradoEm: string
  tamanho: string
  /** Motivo da versão: "Geração inicial", "Regeração", "Retificação: <apontamento>". */
  nota: string
}

export interface Secretaria {
  id: string
  nome: string
  sigla?: string
}

/**
 * Perfil de acesso — controla o que o usuário pode ver e fazer no sistema.
 *
 * Fonte única desde 21/08/2026: o antigo `PapelUsuario` (comissão, jurídico,
 * gestor aprovador) descrevia posições do fluxo de aprovação entre setores, que
 * saiu do produto. Sem esse fluxo, ele duplicava o perfil de acesso com outro
 * vocabulário — e dois vocabulários para a mesma coisa é como um deles fica
 * errado sem ninguém perceber.
 */
export type PerfilAcesso = "admin_geral" | "coordenador" | "servidor"

export const PERFIL_ACESSO_LABEL: Record<PerfilAcesso, string> = {
  admin_geral: "Administrador Geral",
  coordenador: "Coordenador",
  servidor: "Servidor",
}

/** Dados institucionais de uma prefeitura (tenant). Um tenant = uma prefeitura. */
export interface Tenant {
  /** Formato PREF-NNN. */
  id: string
  orgao: string
  unidade: string
  secretarias: Secretaria[]
  /** Nome do arquivo do logotipo/brasão configurado (metadado exibido). */
  logoArquivo: string | null
  /** Imagem do logotipo/brasão em data URL, para exibição (sidebar, timbre). Null = sem logo. */
  logoDataUrl: string | null
  timbrado: boolean
  cabecalho: string
  rodape: string
  pca: {
    ano: string
    arquivo: string | null
    itensIndexados: number
  }
}

/** Alias documental — o Tenant é a Prefeitura no domínio multi-tenant. */
export type Prefeitura = Tenant

/**
 * Usuário do sistema. A senha nunca trafega aqui — fica só no mapa de
 * credenciais do mock. `prefeituraId` é null apenas para o admin geral (LAHHM).
 */
export interface Usuario {
  /** Formato USR-NNN. */
  id: string
  nome: string
  primeiroNome: string
  iniciais: string
  /** 11 dígitos, sem máscara. */
  cpf: string
  email: string
  cargo: string
  /** Matrícula funcional; pode ser a chave de login (ADR-015). Ausente quando não informada. */
  matricula?: string
  /** Número do decreto de nomeação — o comissionado costuma lembrar dele, não da matrícula. */
  decretoNomeacao?: string
  perfilAcesso: PerfilAcesso
  /** Prefeitura a que pertence. null = admin geral (LAHHM, sem prefeitura). */
  prefeituraId: string | null
  /** Secretaria em que atua (nome). */
  secretaria?: string
  /** Foto de perfil em data URL; null = usa o avatar padrão (iniciais). */
  avatarDataUrl: string | null
  /** Último acesso em ISO; atualizado no login. */
  ultimoAcesso: string
  ativo: boolean
}

/** Sessão do usuário logado — o que a interface consome. */
export interface Sessao {
  usuario: Usuario
  /** Config da prefeitura do usuário; null para o admin geral. */
  prefeitura: Tenant | null
}

export interface EstatisticasDashboard {
  processosAtivos: number
  processosNovosMes: number
  /** Processos que já têm documento em elaboração. */
  processosEmElaboracao: number
  /** Documentos escolhidos no processo que ainda não foram gerados. */
  documentosPendentes: number
  documentosGerados: number
  documentosSemana: number
  etpsConcluidos: number
  taxaConclusao: number
}

/** Indicadores do topo da tela de Documentos Gerados. */
export interface ResumoDocumentos {
  /** Total de documentos armazenados no órgão. */
  total: number
  /** Documentos gerados no mês vigente. */
  esteMes: number
  /** Armazenamento usado, em megabytes. */
  armazenamentoMB: number
}
