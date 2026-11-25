/**
 * O roteiro do onboarding da GovPri (§130): as perguntas, as opções e o que a
 * Pri fala em cada etapa. Os códigos das opções são os mesmos do back-end
 * (ADR-082 do back-end); os rótulos são o que a tela mostra.
 *
 * As perguntas foram escolhidas pelo que a equipe comercial precisa para
 * identificar e priorizar o lead: o órgão e onde ele fica, o papel da pessoa
 * (quem decide), o tamanho da operação (equipe, volume, unidades: a
 * abrangência se virar cliente), como trabalha hoje, o que dói e a urgência.
 */

export type TipoDeOrgao =
  | "PREFEITURA"
  | "CAMARA"
  | "AUTARQUIA"
  | "CONSORCIO"
  | "GOVERNO_ESTADUAL"
  | "OUTRO_PUBLICO"
  | "PRIVADO"
export type Papel =
  | "GESTOR_MAXIMO"
  | "COORDENACAO_COMPRAS"
  | "AGENTE_CONTRATACAO"
  | "AREA_REQUISITANTE"
  | "JURIDICO"
  | "CONTROLE_INTERNO"
  | "OUTRO"
export type Equipe = "SO_EU" | "DE_2_A_5" | "DE_6_A_15" | "DE_16_A_40" | "MAIS_DE_40"
export type Volume = "ATE_50" | "DE_51_A_200" | "DE_201_A_500" | "MAIS_DE_500" | "NAO_SEI"
export type Unidades = "ATE_3" | "DE_4_A_10" | "DE_11_A_20" | "MAIS_DE_20"
export type Rotina =
  | "WORD_E_MODELOS"
  | "PROCESSOS_ANTERIORES"
  | "MODELOS_OFICIAIS"
  | "OUTRO_SISTEMA"
  | "CONSULTORIA"
  | "IA_GENERICA"
  | "SEM_PADRAO"
export type Dor = "TEMPO_ETP_TR" | "RETRABALHO" | "APONTAMENTOS" | "POUCA_GENTE" | "FALTA_DE_PADRAO" | "PRAZOS"
export type Prazo = "AGORA" | "TRES_MESES" | "ESTE_ANO" | "CONHECER"

export type Opcao<T extends string> = { valor: T; rotulo: string; detalhe?: string }

export const ORGAOS: Opcao<TipoDeOrgao>[] = [
  { valor: "PREFEITURA", rotulo: "Prefeitura" },
  { valor: "CAMARA", rotulo: "Câmara Municipal" },
  { valor: "AUTARQUIA", rotulo: "Autarquia, fundação ou empresa pública" },
  { valor: "CONSORCIO", rotulo: "Consórcio público" },
  { valor: "GOVERNO_ESTADUAL", rotulo: "Governo do Estado" },
  { valor: "OUTRO_PUBLICO", rotulo: "Outro órgão público" },
  { valor: "PRIVADO", rotulo: "Não sou do setor público", detalhe: "Consultoria, assessoria ou fornecedor" },
]

export const PAPEIS: Opcao<Papel>[] = [
  { valor: "AGENTE_CONTRATACAO", rotulo: "Agente de contratação, pregoeiro(a) ou comissão" },
  { valor: "COORDENACAO_COMPRAS", rotulo: "Coordenação de compras, licitações ou planejamento" },
  { valor: "AREA_REQUISITANTE", rotulo: "Servidor(a) da área que pede a compra" },
  { valor: "GESTOR_MAXIMO", rotulo: "Prefeito(a), secretário(a) ou presidente" },
  { valor: "JURIDICO", rotulo: "Procuradoria ou assessoria jurídica" },
  { valor: "CONTROLE_INTERNO", rotulo: "Controle interno" },
  { valor: "OUTRO", rotulo: "Outro papel" },
]

export const EQUIPES: Opcao<Equipe>[] = [
  { valor: "SO_EU", rotulo: "Só eu" },
  { valor: "DE_2_A_5", rotulo: "2 a 5 pessoas" },
  { valor: "DE_6_A_15", rotulo: "6 a 15 pessoas" },
  { valor: "DE_16_A_40", rotulo: "16 a 40 pessoas" },
  { valor: "MAIS_DE_40", rotulo: "Mais de 40 pessoas" },
]

export const VOLUMES: Opcao<Volume>[] = [
  { valor: "ATE_50", rotulo: "Até 50" },
  { valor: "DE_51_A_200", rotulo: "51 a 200" },
  { valor: "DE_201_A_500", rotulo: "201 a 500" },
  { valor: "MAIS_DE_500", rotulo: "Mais de 500" },
  { valor: "NAO_SEI", rotulo: "Não sei informar" },
]

export const UNIDADES: Opcao<Unidades>[] = [
  { valor: "ATE_3", rotulo: "1 a 3" },
  { valor: "DE_4_A_10", rotulo: "4 a 10" },
  { valor: "DE_11_A_20", rotulo: "11 a 20" },
  { valor: "MAIS_DE_20", rotulo: "Mais de 20" },
]

/** Múltipla escolha: quase todo órgão combina mais de um jeito de fazer. */
export const ROTINAS: Opcao<Rotina>[] = [
  { valor: "WORD_E_MODELOS", rotulo: "No Word ou editor de texto, com modelos próprios" },
  { valor: "PROCESSOS_ANTERIORES", rotulo: "Aproveitando processos anteriores" },
  { valor: "MODELOS_OFICIAIS", rotulo: "Com modelos da AGU, do Tribunal de Contas ou de outros órgãos" },
  { valor: "OUTRO_SISTEMA", rotulo: "Em outro sistema de compras ou de gestão" },
  { valor: "CONSULTORIA", rotulo: "Com consultoria ou assessoria externa" },
  { valor: "IA_GENERICA", rotulo: "Com ferramentas de IA, como o ChatGPT" },
  { valor: "SEM_PADRAO", rotulo: "Sem padrão: cada setor faz do seu jeito" },
]

export const DORES: Opcao<Dor>[] = [
  { valor: "TEMPO_ETP_TR", rotulo: "Tempo para escrever ETP e TR" },
  { valor: "RETRABALHO", rotulo: "Retrabalho e documentos que se contradizem" },
  { valor: "APONTAMENTOS", rotulo: "Apontamentos do controle ou do Tribunal de Contas" },
  { valor: "POUCA_GENTE", rotulo: "Pouca gente para muita demanda" },
  { valor: "FALTA_DE_PADRAO", rotulo: "Falta de padrão entre as secretarias" },
  { valor: "PRAZOS", rotulo: "Prazos de convênios e emendas" },
]

export const PRAZOS: Opcao<Prazo>[] = [
  { valor: "AGORA", rotulo: "Agora: temos processos parados" },
  { valor: "TRES_MESES", rotulo: "Nos próximos 3 meses" },
  { valor: "ESTE_ANO", rotulo: "Ainda este ano" },
  { valor: "CONHECER", rotulo: "Só quero conhecer, por enquanto" },
]

export const UFS: { sigla: string; nome: string }[] = [
  { sigla: "AC", nome: "Acre" },
  { sigla: "AL", nome: "Alagoas" },
  { sigla: "AP", nome: "Amapá" },
  { sigla: "AM", nome: "Amazonas" },
  { sigla: "BA", nome: "Bahia" },
  { sigla: "CE", nome: "Ceará" },
  { sigla: "DF", nome: "Distrito Federal" },
  { sigla: "ES", nome: "Espírito Santo" },
  { sigla: "GO", nome: "Goiás" },
  { sigla: "MA", nome: "Maranhão" },
  { sigla: "MT", nome: "Mato Grosso" },
  { sigla: "MS", nome: "Mato Grosso do Sul" },
  { sigla: "MG", nome: "Minas Gerais" },
  { sigla: "PA", nome: "Pará" },
  { sigla: "PB", nome: "Paraíba" },
  { sigla: "PR", nome: "Paraná" },
  { sigla: "PE", nome: "Pernambuco" },
  { sigla: "PI", nome: "Piauí" },
  { sigla: "RJ", nome: "Rio de Janeiro" },
  { sigla: "RN", nome: "Rio Grande do Norte" },
  { sigla: "RS", nome: "Rio Grande do Sul" },
  { sigla: "RO", nome: "Rondônia" },
  { sigla: "RR", nome: "Roraima" },
  { sigla: "SC", nome: "Santa Catarina" },
  { sigla: "SP", nome: "São Paulo" },
  { sigla: "SE", nome: "Sergipe" },
  { sigla: "TO", nome: "Tocantins" },
]

/** As etapas, na ordem. `fase` agrupa as perguntas nas quatro pílulas do progresso. */
export const ETAPAS = [
  "inicio",
  "orgao",
  "local",
  "papel",
  "valor",
  "equipe",
  "volume",
  "unidades",
  "rotina",
  "dores",
  "prazo",
  "contato",
  "analisando",
  "enviado",
] as const
export type Etapa = (typeof ETAPAS)[number]

export const FASES = ["Seu órgão", "Seu papel", "Sua rotina", "Contato"] as const
const FASE_DA_ETAPA: Partial<Record<Etapa, number>> = {
  orgao: 0,
  local: 0,
  papel: 1,
  valor: 1,
  equipe: 2,
  volume: 2,
  unidades: 2,
  rotina: 2,
  dores: 2,
  prazo: 2,
  contato: 3,
}

/** A fase da etapa (0 a 3), ou `null` nas etapas sem progresso (início, análise e envio). */
export function faseDa(etapa: Etapa): number | null {
  return FASE_DA_ETAPA[etapa] ?? null
}

/**
 * O valor que o GeraDocs entrega a cada papel, com os textos da seção Perfis da
 * página da GovPro (§125): nada inventado.
 */
export function perfilDoPapel(papel: Papel): 0 | 1 | 2 | 3 {
  if (papel === "COORDENACAO_COMPRAS") return 1
  if (papel === "GESTOR_MAXIMO") return 2
  if (papel === "JURIDICO" || papel === "CONTROLE_INTERNO") return 3
  return 0
}

export function rotuloDe<T extends string>(opcoes: Opcao<T>[], valor: T | undefined): string {
  return opcoes.find((o) => o.valor === valor)?.rotulo ?? ""
}
