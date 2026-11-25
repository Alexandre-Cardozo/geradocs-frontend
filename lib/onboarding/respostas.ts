import {
  DORES,
  EQUIPES,
  ORGAOS,
  PAPEIS,
  PRAZOS,
  ROTINAS,
  UFS,
  UNIDADES,
  VOLUMES,
  rotuloDe,
  type Dor,
  type Equipe,
  type Papel,
  type Prazo,
  type Rotina,
  type TipoDeOrgao,
  type Unidades,
  type Volume,
} from "@/lib/onboarding/roteiro";

/** As respostas, que vão chegando etapa a etapa (§130). */
export type Respostas = {
  orgao?: TipoDeOrgao;
  uf?: string;
  municipio?: string;
  /** O código IBGE, quando o município veio da lista. */
  codigoIbge?: string;
  papel?: Papel;
  equipe?: Equipe;
  volume?: Volume;
  unidades?: Unidades;
  rotinas: Rotina[];
  dores: Dor[];
  prazo?: Prazo;
  nome: string;
  email: string;
  telefone: string;
  nomeDoOrgao: string;
  setor: string;
  consentimento: boolean;
  /** O campo-armadilha: escondido na tela, só robô o preenche. */
  armadilha: string;
};

export const RESPOSTAS_VAZIAS: Respostas = {
  rotinas: [],
  dores: [],
  nome: "",
  email: "",
  telefone: "",
  nomeDoOrgao: "",
  setor: "",
  consentimento: false,
  armadilha: "",
};

/** O Governo do Estado responde só a UF; os demais, o município também. */
export function pedeMunicipio(orgao: TipoDeOrgao | undefined): boolean {
  return orgao !== "GOVERNO_ESTADUAL";
}

/** Os estados que se escrevem com "de" ou "da"; os demais levam "do". */
const PREPOSICAO_DO_ESTADO: Record<string, string> = {
  AL: "de",
  GO: "de",
  MT: "de",
  MS: "de",
  MG: "de",
  PE: "de",
  RO: "de",
  RR: "de",
  SC: "de",
  SP: "de",
  SE: "de",
  BA: "da",
  PB: "da",
};

/** "do Espírito Santo", "da Bahia", "de Minas Gerais"; vazio se a UF não existe. */
function doEstado(uf: string | undefined): string {
  const estado = UFS.find((u) => u.sigla === uf);
  return estado ? `${PREPOSICAO_DO_ESTADO[estado.sigla] ?? "do"} ${estado.nome}` : "";
}

/**
 * O exemplo do nome do órgão no placeholder do contato, a partir do tipo e do
 * lugar, para todo tipo ter um exemplo como os demais campos. Só exemplo: o
 * campo fica vazio, e quem escreve é a pessoa.
 */
export function exemploDoNomeDoOrgao(r: Pick<Respostas, "orgao" | "municipio" | "uf">): string {
  const cidade = r.municipio?.trim();
  const deCidade = cidade ? ` de ${cidade}` : "";
  const estado = doEstado(r.uf);
  const doLugar = estado ? ` ${estado}` : "";
  switch (r.orgao) {
    case "CAMARA":
      return `Ex.: Câmara Municipal${deCidade}`;
    case "AUTARQUIA":
      return cidade ? `Ex.: SAAE${deCidade}` : "Ex.: Instituto de Previdência";
    case "CONSORCIO":
      return "Ex.: Consórcio Intermunicipal de Saúde";
    case "GOVERNO_ESTADUAL":
      return `Ex.: Casa Civil${doLugar}`;
    case "OUTRO_PUBLICO":
      return `Ex.: Instituto Federal${doLugar}`;
    case "PRIVADO":
      return "Ex.: Silva Consultoria em Licitações";
    default:
      return `Ex.: Prefeitura Municipal${deCidade}`;
  }
}

/** Onde fica: "Colatina/ES", ou só a UF. */
export function localDe(r: Pick<Respostas, "municipio" | "uf">): string {
  const cidade = r.municipio?.trim();
  return cidade ? `${cidade}/${r.uf ?? ""}` : (r.uf ?? "");
}

const INTENCAO: Record<Prazo, string> = {
  AGORA: "Tem processos parados e quer começar agora",
  TRES_MESES: "Quer começar nos próximos 3 meses",
  ESTE_ANO: "Quer começar ainda este ano",
  CONHECER: "Quer conhecer o GeraDocs, por enquanto",
};

/** "No Word…" vira "no Word…": só a primeira letra, para siglas e nomes ficarem como estão. */
function noMeioDaFrase(texto: string): string {
  return texto.charAt(0).toLowerCase() + texto.slice(1);
}

/** O "Entendi que você:" da análise: o que a Pri entendeu, em frases curtas. */
export function linhasDoResumo(r: Respostas): string[] {
  const linhas = [`Trabalha em ${rotuloDe(ORGAOS, r.orgao).toLowerCase()} de ${localDe(r)}`];
  if (r.papel) linhas.push(`Atua como ${rotuloDe(PAPEIS, r.papel).toLowerCase()}`);
  if (r.equipe && r.volume) {
    linhas.push(
      `Tem equipe de ${rotuloDe(EQUIPES, r.equipe).toLowerCase()} e ${rotuloDe(VOLUMES, r.volume).toLowerCase()} contratações por ano`,
    );
  }
  const [rotina, ...outrasRotinas] = r.rotinas;
  if (rotina) {
    linhas.push(
      outrasRotinas.length
        ? `Combina ${r.rotinas.length} jeitos de fazer os documentos`
        : `Faz os documentos ${noMeioDaFrase(rotuloDe(ROTINAS, rotina))}`,
    );
  }
  const [dor, ...outrasDores] = r.dores;
  if (dor) {
    const mais = outrasDores.length;
    linhas.push(
      `Quer resolver: ${noMeioDaFrase(rotuloDe(DORES, dor))}${mais ? ` e mais ${mais} ${mais > 1 ? "pontos" : "ponto"}` : ""}`,
    );
  }
  if (r.prazo) linhas.push(INTENCAO[r.prazo]);
  return linhas;
}

/**
 * Quanto a análise dura, no mínimo: uma linha do resumo a cada
 * `ANALISE.porLinhaMs` e, depois da última, tempo para ler tudo com calma.
 */
export const ANALISE = { entradaMs: 400, porLinhaMs: 900, leituraMs: 2500 } as const;

export function duracaoDaAnalise(linhas: number): number {
  return ANALISE.entradaMs + linhas * ANALISE.porLinhaMs + ANALISE.leituraMs;
}

/** Só letras minúsculas, números e hífen, até 60: o mesmo que o back-end aceita. */
export function origemDe(valor: string | null): string {
  const limpa = (valor ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .slice(0, 60);
  return limpa || "direto";
}

/** (27) 99999-0000: a máscara do telefone enquanto se digita. */
export function mascararTelefone(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  const meio = d.length === 11 ? 7 : 6;
  if (d.length <= meio) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, meio)}-${d.slice(meio)}`;
}

export type ErrosDoContato = Partial<Record<"nome" | "email" | "telefone" | "nomeDoOrgao" | "consentimento", string>>;

export function errosDoContato(r: Respostas): ErrosDoContato {
  const erros: ErrosDoContato = {};
  if (!r.nome.trim()) erros.nome = "Informe seu nome.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) erros.email = "Informe um e-mail válido.";
  const digitos = r.telefone.replace(/\D/g, "").length;
  if (digitos < 10 || digitos > 11) erros.telefone = "Informe o telefone com DDD.";
  if (!r.nomeDoOrgao.trim()) erros.nomeDoOrgao = "Informe o nome do órgão.";
  if (!r.consentimento) erros.consentimento = "Para a GovPro falar com você, é preciso concordar.";
  return erros;
}

/** O corpo do envio, no formato do back-end. Só chamado com todas as etapas respondidas. */
export function paraEnvio(r: Respostas, origem: string) {
  return {
    origin: origem,
    organizationType: r.orgao,
    organizationName: r.nomeDoOrgao.trim(),
    uf: r.uf,
    municipality: pedeMunicipio(r.orgao) ? r.municipio?.trim() || null : null,
    ibgeCode: pedeMunicipio(r.orgao) ? (r.codigoIbge ?? null) : null,
    role: r.papel,
    department: r.setor.trim() || null,
    teamSize: r.equipe,
    annualVolume: r.volume,
    requestingUnits: r.unidades,
    currentPractices: r.rotinas,
    pains: r.dores,
    timing: r.prazo,
    contactName: r.nome.trim(),
    contactEmail: r.email.trim(),
    contactPhone: r.telefone.trim(),
    consent: r.consentimento,
    website: r.armadilha || null,
  };
}

/**
 * O plano B quando o envio falha (§130): o mesmo conteúdo num e-mail pronto,
 * com linhas em CRLF, como pede o `mailto:` (RFC 6068).
 */
export function corpoDoEmailReserva(r: Respostas): string {
  return [
    "Olá, equipe GovPro.",
    "",
    "Respondi ao onboarding da GovPri e gostaria de conhecer o GeraDocs:",
    "",
    `Nome: ${r.nome}`,
    `E-mail: ${r.email}`,
    `Telefone: ${r.telefone}`,
    `Órgão: ${r.nomeDoOrgao} (${rotuloDe(ORGAOS, r.orgao)}), ${localDe(r)}`,
    `Setor: ${r.setor || "Não informado"}`,
    `Papel: ${rotuloDe(PAPEIS, r.papel)}`,
    `Equipe de contratações: ${rotuloDe(EQUIPES, r.equipe)}`,
    `Contratações por ano: ${rotuloDe(VOLUMES, r.volume)}`,
    `Unidades que pedem compras: ${rotuloDe(UNIDADES, r.unidades)}`,
    `Como faz hoje: ${r.rotinas.map((x) => rotuloDe(ROTINAS, x)).join("; ")}`,
    `O que mais pesa: ${r.dores.map((d) => rotuloDe(DORES, d)).join("; ") || "Nenhuma marcada"}`,
    `Quando quer começar: ${rotuloDe(PRAZOS, r.prazo)}`,
  ].join("\r\n");
}
