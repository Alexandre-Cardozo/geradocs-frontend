import { CATALOGO } from "@/lib/documentos";
import type {
  DocumentoGerado,
  EstatisticasDashboard,
  ParecerDFD,
  Processo,
  ResumoDocumentos,
  Tenant,
  TipoDocumento,
  EventoDoProcesso,
  Usuario,
} from "@/lib/types";

/**
 * Fixtures do mock — dados de demonstração.
 * Nunca importe este módulo em componentes: consuma via lib/api + hooks.
 *
 * A estrutura seccional dos documentos não vive aqui: é domínio, e está em
 * `lib/documentos/secoes.ts`. Este módulo guarda apenas o conteúdo já redigido
 * do processo de referência.
 */

/** Ids das prefeituras mockadas. */
export const PREF_SAO_PAULO = "PREF-001";
export const PREF_ECOPORANGA = "PREF-002";

/**
 * Usuários mockados para testar os perfis de acesso. Senha padrão de todos:
 * `geradocs123` (ver `credenciais`). Os CPFs são os atalhos de demonstração.
 */
export const usuarios: Usuario[] = [
  {
    id: "USR-001",
    nome: "Administrador LAHHM",
    primeiroNome: "Administrador",
    iniciais: "AL",
    cpf: "11111111111",
    email: "admin@lahhm.com.br",
    cargo: "Administrador do Sistema",
    perfilAcesso: "admin_geral",
    prefeituraId: null,
    avatarDataUrl: null,
    ultimoAcesso: "2024-07-14T09:10:00",
    ativo: true,
  },
  {
    id: "USR-002",
    nome: "Rafael Nunes",
    primeiroNome: "Rafael",
    iniciais: "RN",
    cpf: "22222222222",
    email: "rafael.nunes@ecoporanga.es.gov.br",
    cargo: "Coordenador de Compras",
    perfilAcesso: "coordenador",
    prefeituraId: PREF_ECOPORANGA,
    secretaria: "Secretaria de Administração",
    avatarDataUrl: null,
    ultimoAcesso: "2024-07-14T08:40:00",
    ativo: true,
  },
  {
    id: "USR-003",
    nome: "Beatriz Amaral",
    primeiroNome: "Beatriz",
    iniciais: "BA",
    cpf: "33333333333",
    email: "beatriz.amaral@ecoporanga.es.gov.br",
    cargo: "Servidora de Compras",
    perfilAcesso: "servidor",
    prefeituraId: PREF_ECOPORANGA,
    secretaria: "Secretaria de Educação",
    avatarDataUrl: null,
    ultimoAcesso: "2024-07-13T16:05:00",
    ativo: true,
  },
  {
    id: "USR-004",
    nome: "Maria Costa",
    primeiroNome: "Maria",
    iniciais: "MC",
    cpf: "44444444444",
    email: "maria.costa@saopaulo.sp.gov.br",
    cargo: "Coordenadora de Compras",
    perfilAcesso: "coordenador",
    prefeituraId: PREF_SAO_PAULO,
    secretaria: "Secretaria de Administração",
    avatarDataUrl: null,
    ultimoAcesso: "2024-07-14T14:22:00",
    ativo: true,
  },
  {
    id: "USR-005",
    nome: "João Silva",
    primeiroNome: "João",
    iniciais: "JS",
    cpf: "55555555555",
    email: "joao.silva@saopaulo.sp.gov.br",
    cargo: "Servidor de Compras",
    perfilAcesso: "servidor",
    prefeituraId: PREF_SAO_PAULO,
    secretaria: "Secretaria de Obras e Infraestrutura",
    avatarDataUrl: null,
    ultimoAcesso: "2024-07-14T11:05:00",
    ativo: true,
  },
];

/** Credenciais mockadas (cpf → senha). Nunca expostas pela API — só o login lê. */
export const credenciais: Record<string, string> = Object.fromEntries(
  usuarios.map((u) => [u.cpf, "geradocs123"]),
);

export const estatisticas: EstatisticasDashboard = {
  processosAtivos: 24,
  processosNovosMes: 3,
  processosEmElaboracao: 7,
  documentosPendentes: 3,
  documentosGerados: 138,
  documentosSemana: 12,
  etpsConcluidos: 61,
  taxaConclusao: 89,
};

/** Indicadores da tela de Documentos — base do órgão; crescem a cada geração. */
export const resumoDocumentos: ResumoDocumentos = {
  total: 141,
  esteMes: 14,
  armazenamentoMB: 51,
};

/** Atalho para um evento da trilha do processo. */
function t(
  evento: EventoDoProcesso["evento"],
  de: EventoDoProcesso["de"],
  para: EventoDoProcesso["para"],
  autor: string,
  papel: EventoDoProcesso["papel"],
  data: string,
  comentario: string,
): EventoDoProcesso {
  return { evento, de, para, autor, papel, data, comentario };
}

const processosSaoPaulo: Array<Omit<Processo, "prefeituraId">> = [
  {
    id: "PROC-2024-089",
    objeto: "Aquisição de Equipamentos de TI",
    objetoDemanda:
      "Aquisição de 150 microcomputadores tipo desktop e periféricos para modernização dos laboratórios de informática das unidades escolares da rede municipal.",
    documentos: ["Cotação", "ETP", "TR", "Edital"],
    secretaria: "Secretaria de Educação",
    modalidade: "Pregão Eletrônico",
    status: "em_elaboracao",
    valorEstimado: 485000,
    etpStatus: "Completo",
    trStatus: "Completo",
    responsavel: "Maria Costa",
    criadoEm: "2024-07-05",
    atualizadoEm: "2024-07-05",
    fases: { verificacaoDFD: true, retificacao: false },
    dfdArquivo: "DFD-PROC-2024-089.pdf",
    trilha: [
      t("geracao_documento", "rascunho", "em_elaboracao", "Maria Costa", "servidor", "2024-07-05",
        "Documentos concluídos; enviado para análise jurídica e da comissão."),
    ],
  },
  {
    id: "PROC-2024-088",
    objeto: "Contratação de Serviços de Limpeza",
    documentos: ["ETP", "TR", "Edital"],
    secretaria: "Secretaria de Obras",
    modalidade: "Pregão Eletrônico",
    status: "em_elaboracao",
    valorEstimado: 120000,
    etpStatus: "Completo",
    trStatus: "Completo",
    responsavel: "João Silva",
    criadoEm: "2024-07-04",
    atualizadoEm: "2024-07-04",
    fases: { verificacaoDFD: false, retificacao: false },
    urgente: true,
    trilha: [
      t("geracao_documento", "rascunho", "em_elaboracao", "João Silva", "servidor", "2024-07-03",
        "ETP, TR e Edital concluídos; encaminho para análise da comissão."),
      t("geracao_documento", "em_elaboracao", "em_elaboracao", "Comissão de Contratação", "coordenador", "2024-07-04",
        "Documentação conferida e parecer jurídico favorável. Segue para decisão do gestor."),
    ],
  },
  {
    id: "PROC-2024-087",
    objeto: "Fornecimento de Material de Escritório",
    documentos: ["Cotação", "ETP", "TR", "Edital", "Contrato"],
    secretaria: "Administração Central",
    modalidade: "Pregão Eletrônico",
    status: "em_elaboracao",
    valorEstimado: 38500,
    etpStatus: "Completo",
    trStatus: "Completo",
    responsavel: "Ana Oliveira",
    criadoEm: "2024-07-03",
    atualizadoEm: "2024-07-04",
    fases: { verificacaoDFD: false, retificacao: false },
    trilha: [
      t("geracao_documento", "rascunho", "em_elaboracao", "Ana Oliveira", "servidor", "2024-07-03",
        "Instrução completa com Cotação, ETP, TR, Edital e minuta de Contrato."),
      t("geracao_documento", "em_elaboracao", "em_elaboracao", "Comissão de Contratação", "coordenador", "2024-07-04",
        "Conformidade verificada. Encaminhado para aprovação."),
      t("encerramento", "em_elaboracao", "concluido", "Carlos Lima", "coordenador", "2024-07-04",
        "Processo aprovado. Autorizada a abertura da fase externa."),
    ],
  },
  {
    id: "PROC-2024-086",
    objeto: "Serviços de Manutenção Predial",
    documentos: ["ETP", "TR", "Edital"],
    secretaria: "Secretaria de Saúde",
    modalidade: "Concorrência",
    status: "rascunho",
    valorEstimado: 210000,
    etpStatus: "Completo",
    trStatus: "Completo",
    responsavel: "Carlos Lima",
    criadoEm: "2024-07-02",
    atualizadoEm: "2024-07-02",
    fases: { verificacaoDFD: false, retificacao: false },
    trilha: [],
  },
  {
    id: "PROC-2024-085",
    objeto: "Aquisição de Veículos Oficiais",
    documentos: ["ETP", "TR", "Edital"],
    secretaria: "Frota Municipal",
    modalidade: "Pregão Eletrônico",
    status: "concluido",
    valorEstimado: 920000,
    etpStatus: "Completo",
    trStatus: "Completo",
    responsavel: "Maria Costa",
    criadoEm: "2024-07-01",
    atualizadoEm: "2024-07-02",
    fases: { verificacaoDFD: false, retificacao: false },
    trilha: [
      t("geracao_documento", "rascunho", "em_elaboracao", "Maria Costa", "servidor", "2024-07-01",
        "Documentos concluídos; enviado para análise."),
      t("geracao_documento", "em_elaboracao", "em_elaboracao", "Comissão de Contratação", "coordenador", "2024-07-01",
        "Documentação conferida. Segue para decisão do gestor."),
      t("encerramento", "em_elaboracao", "concluido", "Carlos Lima", "coordenador", "2024-07-02",
        "Processo aprovado."),
      t("encerramento", "em_elaboracao", "concluido", "Carlos Lima", "coordenador", "2024-07-02",
        "Contratação homologada e concluída."),
    ],
  },
  {
    id: "PROC-2024-084",
    objeto: "Sistema de Gestão de RH",
    documentos: ["ETP", "TR"],
    secretaria: "Secretaria de Adm.",
    modalidade: "Inexigibilidade",
    status: "em_elaboracao",
    valorEstimado: 750000,
    etpStatus: "Completo",
    trStatus: "Completo",
    responsavel: "Pedro Ramos",
    criadoEm: "2024-06-29",
    atualizadoEm: "2024-07-03",
    fundamentoLegal: "Art. 74, III, 'a', Lei 14.133/21",
    fases: { verificacaoDFD: false, retificacao: false },
    urgente: true,
    trilha: [
      t("geracao_documento", "rascunho", "em_elaboracao", "Pedro Ramos", "servidor", "2024-07-01",
        "Processo instruído para análise jurídica."),
      t("retificacao", "em_elaboracao", "em_elaboracao", "Carlos Lima", "coordenador", "2024-07-02",
        "Solicito retificação: incluir comparativo de preços exigido pelo Art. 23, Lei 14.133/21."),
      t("geracao_documento", "em_elaboracao", "em_elaboracao", "Pedro Ramos", "servidor", "2024-07-03",
        "Retificação atendida; comparativo de preços anexado ao TR."),
    ],
  },
  {
    id: "PROC-2024-083",
    objeto: "Reforma Escola Municipal Centro",
    documentos: ["ETP", "TR", "Edital"],
    secretaria: "Secretaria de Educação",
    modalidade: "Concorrência",
    status: "em_elaboracao",
    valorEstimado: 1200000,
    etpStatus: "Completo",
    trStatus: "Completo",
    responsavel: "Ana Oliveira",
    criadoEm: "2024-06-28",
    atualizadoEm: "2024-07-01",
    fases: { verificacaoDFD: false, retificacao: false },
    trilha: [
      t("geracao_documento", "rascunho", "em_elaboracao", "Ana Oliveira", "servidor", "2024-06-30",
        "ETP, TR e Edital da reforma concluídos conforme levantamento da engenharia."),
      t("geracao_documento", "em_elaboracao", "em_elaboracao", "Comissão de Contratação", "coordenador", "2024-07-01",
        "Checklist integral e parecer jurídico favorável. Encaminhado para aprovação."),
    ],
  },
  {
    id: "PROC-2024-082",
    objeto: "Aquisição de Uniformes Escolares",
    documentos: ["ETP", "TR", "Edital"],
    secretaria: "Secretaria de Educação",
    modalidade: "Pregão Eletrônico",
    status: "rascunho",
    valorEstimado: 95000,
    etpStatus: "Completo",
    trStatus: "Rejeitado",
    responsavel: "João Silva",
    criadoEm: "2024-06-27",
    atualizadoEm: "2024-06-28",
    fases: { verificacaoDFD: false, retificacao: false },
    trilha: [
      t("geracao_documento", "rascunho", "em_elaboracao", "João Silva", "servidor", "2024-06-27",
        "Documentos concluídos; enviado para análise."),
      t("geracao_documento", "em_elaboracao", "em_elaboracao", "Comissão de Contratação", "coordenador", "2024-06-27",
        "Encaminhado para decisão do gestor."),
      t("reabertura", "concluido", "em_elaboracao", "Carlos Lima", "coordenador", "2024-06-28",
        "Rejeitado: estimativa de valor sem pesquisa de preços que a fundamente (Art. 23)."),
    ],
  },
];

/** Processos da Prefeitura de Ecoporanga (segunda prefeitura mockada). */
const processosEcoporanga: Array<Omit<Processo, "prefeituraId">> = [
  {
    id: "PROC-2024-071",
    objeto: "Aquisição de Merenda Escolar",
    objetoDemanda:
      "Aquisição de gêneros alimentícios para a merenda escolar da rede municipal de Ecoporanga pelo período de 12 meses.",
    documentos: ["Cotação", "ETP", "TR", "Edital"],
    secretaria: "Secretaria de Educação",
    modalidade: "Pregão Eletrônico",
    status: "em_elaboracao",
    valorEstimado: 340000,
    etpStatus: "Completo",
    trStatus: "Completo",
    responsavel: "Beatriz Amaral",
    criadoEm: "2024-07-10",
    atualizadoEm: "2024-07-10",
    fases: { verificacaoDFD: true, retificacao: false },
    dfdArquivo: "DFD-PROC-2024-071.pdf",
    trilha: [
      t("geracao_documento", "rascunho", "em_elaboracao", "Beatriz Amaral", "servidor", "2024-07-10",
        "Documentos concluídos; enviado para análise."),
    ],
  },
  {
    id: "PROC-2024-070",
    objeto: "Contratação de Serviços de Transporte Escolar",
    documentos: ["ETP", "TR", "Edital"],
    secretaria: "Secretaria de Educação",
    modalidade: "Pregão Eletrônico",
    status: "rascunho",
    valorEstimado: 610000,
    etpStatus: "Em andamento",
    trStatus: "Não iniciado",
    responsavel: "Beatriz Amaral",
    criadoEm: "2024-07-12",
    atualizadoEm: "2024-07-12",
    fundamentoLegal: "Art. 6º, XXIII, Lei 14.133/21",
    fases: { verificacaoDFD: false, retificacao: false },
    trilha: [],
  },
];

/** Processos de todas as prefeituras, com o prefeituraId carimbado. */
export const processos: Processo[] = [
  ...processosSaoPaulo.map((p) => ({ ...p, prefeituraId: PREF_SAO_PAULO })),
  ...processosEcoporanga.map((p) => ({ ...p, prefeituraId: PREF_ECOPORANGA })),
];

/** Achados do parecer da IA sobre o DFD (protótipo DFDReview). */
export const parecerDFDBase: Omit<ParecerDFD, "processoId" | "arquivo"> = {
  analisadoEm: "2025-07-09T14:38:00",
  nota: 74,
  classificacao: "Adequado com ressalvas",
  achados: [
    {
      tipo: "conformidade",
      severidade: "info",
      descricao:
        "Identificação do demandante completa e assinada pela autoridade competente.",
    },
    {
      tipo: "conformidade",
      severidade: "info",
      descricao:
        "Objeto descrito com clareza e especificidade suficiente para embasamento do ETP.",
    },
    {
      tipo: "conformidade",
      severidade: "info",
      descricao:
        "Justificativa da necessidade alinhada com o planejamento institucional.",
      fundamentacao: "PCA 2025 — item 47",
    },
    {
      tipo: "alerta",
      severidade: "recomendacao",
      descricao:
        "Estimativa de valor ausente. Recomenda-se incluir pesquisa prévia de preços para fortalecer a justificativa.",
    },
    {
      tipo: "alerta",
      severidade: "recomendacao",
      descricao:
        "Prazo de entrega não especificado. Adicionar cronograma ou prazo estimado facilita o preenchimento do TR.",
    },
    {
      tipo: "conformidade",
      severidade: "info",
      descricao: "Critérios de sustentabilidade mencionados.",
      fundamentacao: "Art. 11 do Decreto 7.746/2012",
    },
    {
      tipo: "alerta",
      severidade: "atencao",
      descricao:
        "Ausência de referência ao item do PCA vigente. O ETP pode ser questionado na fase de aprovação.",
    },
  ],
};

export const documentos: DocumentoGerado[] = construirDocumentos();

/**
 * Documentos já gerados por processo — montados a partir do catálogo (título,
 * formato e tamanho por tipo). Cada um nasce na versão 1; o histórico de versões
 * cresce quando o documento é regerado/retificado durante a sessão.
 */
function construirDocumentos(): DocumentoGerado[] {
  const processoDe = (pid: string) => processos.find((p) => p.id === pid);
  let seq = 162;
  const docs = (
    pid: string,
    prefeituraId: string,
    tipos: TipoDocumento[],
    geradoEm: string,
    status: DocumentoGerado["status"] = "final",
  ): DocumentoGerado[] =>
    tipos.map((tipo) => ({
      id: `DOC-2024-${String(seq++).padStart(4, "0")}`,
      prefeituraId,
      processoId: pid,
      titulo: `${CATALOGO[tipo].titulo} — ${processoDe(pid)?.objeto ?? "Processo de Contratação"}`,
      tipo,
      geradoEm,
      status,
      versao: 1,
      // Sem arquivo: estes documentos vêm de fixture e nunca passaram pelo
      // impressor. A tela mostra "—" em vez de um tamanho que ninguém mediu.
      arquivos: [],
    }));

  return [
    ...docs("PROC-2024-089", PREF_SAO_PAULO, ["Cotação", "ETP", "TR", "Edital"], "2024-07-05T15:20:00"),
    ...docs("PROC-2024-088", PREF_SAO_PAULO, ["ETP", "TR", "Edital"], "2024-07-04T10:10:00"),
    ...docs("PROC-2024-087", PREF_SAO_PAULO, ["Cotação", "ETP", "TR", "Edital", "Contrato"], "2024-07-04T09:15:00"),
    ...docs("PROC-2024-086", PREF_SAO_PAULO, ["ETP", "TR", "Edital"], "2024-07-02T14:00:00"),
    ...docs("PROC-2024-085", PREF_SAO_PAULO, ["ETP", "TR", "Edital"], "2024-07-01T11:20:00"),
    ...docs("PROC-2024-084", PREF_SAO_PAULO, ["ETP", "TR"], "2024-07-03T16:00:00"),
    ...docs("PROC-2024-083", PREF_SAO_PAULO, ["ETP", "TR", "Edital"], "2024-07-01T09:30:00"),
    ...docs("PROC-2024-082", PREF_SAO_PAULO, ["ETP", "TR"], "2024-06-27T13:00:00"),
    // Prefeitura de Ecoporanga
    ...docs("PROC-2024-071", PREF_ECOPORANGA, ["Cotação", "ETP", "TR", "Edital"], "2024-07-10T10:00:00"),
    // Acervo histórico de São Paulo — processos fora do painel ativo, para a tela de Documentos.
    {
      id: "DOC-2024-0159",
      prefeituraId: PREF_SAO_PAULO,
      processoId: "PROC-2024-079",
      titulo: "ETP — Serviços de Vigilância Armada",
      tipo: "ETP",
      geradoEm: "2024-06-25T09:55:00",
      status: "rascunho",
      versao: 1,
      arquivos: [],
    },
    {
      id: "DOC-2024-0158",
      prefeituraId: PREF_SAO_PAULO,
      processoId: "PROC-2024-078",
      titulo: "Mapa de Riscos — TI 2024",
      tipo: "Mapa",
      geradoEm: "2024-06-24T14:30:00",
      status: "final",
      versao: 1,
      arquivos: [],
    },
  ];
}


/** Prefeituras mockadas — cada uma é um Tenant (identidade, PCA, secretarias próprias). */
export const prefeituras: Tenant[] = [
  {
    id: PREF_SAO_PAULO,
    orgao: "Prefeitura de São Paulo",
    unidade: "Secretaria de Compras",
    secretarias: [
      { id: "sec-1", nome: "Secretaria de Educação" },
      { id: "sec-2", nome: "Secretaria de Saúde" },
      { id: "sec-3", nome: "Secretaria de Obras e Infraestrutura" },
      { id: "sec-4", nome: "Secretaria de Administração" },
      { id: "sec-5", nome: "Secretaria de Finanças" },
      { id: "sec-6", nome: "Secretaria de Meio Ambiente" },
      { id: "sec-7", nome: "Secretaria de Assistência Social" },
      { id: "sec-8", nome: "Frota Municipal" },
      { id: "sec-9", nome: "Administração Central" },
    ],
    logoArquivo: "brasao-sao-paulo.png",
    // Sem imagem exibível por padrão → a sidebar mostra o ícone padrão do órgão até
    // que o coordenador importe um brasão em Configurações → Identidade Visual.
    logoDataUrl: null,
    timbrado: true,
    cabecalho:
      "PREFEITURA MUNICIPAL DE SÃO PAULO\nSecretaria Municipal de Compras e Contratações",
    rodape:
      "Documento gerado eletronicamente pela plataforma GeraDocs · São Paulo, {data} · Processo nº {numero}",
  },
  {
    id: PREF_ECOPORANGA,
    orgao: "Prefeitura de Ecoporanga",
    unidade: "Secretaria de Administração",
    secretarias: [
      { id: "eco-1", nome: "Secretaria de Educação" },
      { id: "eco-2", nome: "Secretaria de Saúde" },
      { id: "eco-3", nome: "Secretaria de Obras" },
      { id: "eco-4", nome: "Secretaria de Administração" },
      { id: "eco-5", nome: "Secretaria de Agricultura" },
      { id: "eco-6", nome: "Secretaria de Assistência Social" },
    ],
    logoArquivo: null,
    logoDataUrl: null,
    timbrado: true,
    cabecalho:
      "PREFEITURA MUNICIPAL DE ECOPORANGA\nEstado do Espírito Santo · Secretaria de Administração",
    rodape:
      "Documento gerado eletronicamente pela plataforma GeraDocs · Ecoporanga/ES, {data} · Processo nº {numero}",
  },
];
