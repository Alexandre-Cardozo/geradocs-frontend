import { describe, expect, it } from "vitest";

import {
  RESPOSTAS_VAZIAS,
  corpoDoEmailReserva,
  errosDoContato,
  ANALISE,
  duracaoDaAnalise,
  linhasDoResumo,
  localDe,
  mascararTelefone,
  exemploDoNomeDoOrgao,
  origemDe,
  paraEnvio,
  pedeMunicipio,
  type Respostas,
} from "./respostas";

const COMPLETAS: Respostas = {
  ...RESPOSTAS_VAZIAS,
  orgao: "PREFEITURA",
  uf: "ES",
  municipio: " Colatina ",
  codigoIbge: "3201506",
  papel: "AGENTE_CONTRATACAO",
  equipe: "DE_2_A_5",
  volume: "DE_51_A_200",
  unidades: "DE_4_A_10",
  rotinas: ["WORD_E_MODELOS", "IA_GENERICA"],
  dores: ["TEMPO_ETP_TR", "PRAZOS"],
  prazo: "AGORA",
  nome: " Ana Souza ",
  email: "ana@colatina.es.gov.br",
  telefone: "(27) 99999-0000",
  nomeDoOrgao: "Prefeitura Municipal de Colatina",
  setor: "",
  consentimento: true,
};

describe("respostas do onboarding (§130)", () => {
  it("só o Governo do Estado responde sem município", () => {
    expect(pedeMunicipio("GOVERNO_ESTADUAL")).toBe(false);
    expect(pedeMunicipio("CAMARA")).toBe(true);
    expect(pedeMunicipio(undefined)).toBe(true);
  });

  it("o exemplo do nome do órgão, para o placeholder, segue o tipo e o lugar", () => {
    const lugar = { municipio: "Colatina", uf: "ES" };
    expect(exemploDoNomeDoOrgao({ orgao: "PREFEITURA", ...lugar })).toBe("Ex.: Prefeitura Municipal de Colatina");
    expect(exemploDoNomeDoOrgao({ orgao: "PREFEITURA", municipio: "  ", uf: "ES" })).toBe("Ex.: Prefeitura Municipal");
    expect(exemploDoNomeDoOrgao({})).toBe("Ex.: Prefeitura Municipal");
    expect(exemploDoNomeDoOrgao({ orgao: "CAMARA", ...lugar })).toBe("Ex.: Câmara Municipal de Colatina");
    expect(exemploDoNomeDoOrgao({ orgao: "AUTARQUIA", ...lugar })).toBe("Ex.: SAAE de Colatina");
    expect(exemploDoNomeDoOrgao({ orgao: "AUTARQUIA" })).toBe("Ex.: Instituto de Previdência");
    expect(exemploDoNomeDoOrgao({ orgao: "CONSORCIO", ...lugar })).toBe("Ex.: Consórcio Intermunicipal de Saúde");
    expect(exemploDoNomeDoOrgao({ orgao: "GOVERNO_ESTADUAL", uf: "ES" })).toBe("Ex.: Casa Civil do Espírito Santo");
    expect(exemploDoNomeDoOrgao({ orgao: "GOVERNO_ESTADUAL", uf: "MG" })).toBe("Ex.: Casa Civil de Minas Gerais");
    expect(exemploDoNomeDoOrgao({ orgao: "GOVERNO_ESTADUAL", uf: "XX" })).toBe("Ex.: Casa Civil");
    expect(exemploDoNomeDoOrgao({ orgao: "GOVERNO_ESTADUAL", uf: "BA" })).toBe("Ex.: Casa Civil da Bahia");
    expect(exemploDoNomeDoOrgao({ orgao: "OUTRO_PUBLICO", ...lugar })).toBe("Ex.: Instituto Federal do Espírito Santo");
    expect(exemploDoNomeDoOrgao({ orgao: "PRIVADO", ...lugar })).toBe("Ex.: Silva Consultoria em Licitações");
  });

  it("o local é cidade/UF, ou só a UF", () => {
    expect(localDe({ municipio: "Colatina", uf: "ES" })).toBe("Colatina/ES");
    expect(localDe({ municipio: "Colatina" })).toBe("Colatina/");
    expect(localDe({ uf: "ES" })).toBe("ES");
    expect(localDe({})).toBe("");
  });

  it("o resumo diz o que a Pri entendeu, conforme o que foi respondido", () => {
    expect(linhasDoResumo(COMPLETAS)).toEqual([
      "Trabalha em prefeitura de Colatina/ES",
      "Atua como agente de contratação, pregoeiro(a) ou comissão",
      "Tem equipe de 2 a 5 pessoas e 51 a 200 contratações por ano",
      "Combina 2 jeitos de fazer os documentos",
      "Quer resolver: tempo para escrever ETP e TR e mais 1 ponto",
      "Tem processos parados e quer começar agora",
    ]);
    expect(
      linhasDoResumo({
        ...COMPLETAS,
        rotinas: ["MODELOS_OFICIAIS"],
        dores: ["RETRABALHO", "PRAZOS", "POUCA_GENTE"],
        prazo: "CONHECER",
      }).slice(3),
    ).toEqual([
      "Faz os documentos com modelos da AGU, do Tribunal de Contas ou de outros órgãos",
      "Quer resolver: retrabalho e documentos que se contradizem e mais 2 pontos",
      "Quer conhecer o GeraDocs, por enquanto",
    ]);
    expect(linhasDoResumo({ ...COMPLETAS, dores: ["APONTAMENTOS"] })[4]).toBe(
      "Quer resolver: apontamentos do controle ou do Tribunal de Contas",
    );
    expect(linhasDoResumo({ ...RESPOSTAS_VAZIAS, orgao: "GOVERNO_ESTADUAL", uf: "ES" })).toEqual([
      "Trabalha em governo do estado de ES",
    ]);
  });

  it("a análise dura o bastante para ler cada linha do resumo", () => {
    expect(duracaoDaAnalise(6)).toBe(8300);
    expect(duracaoDaAnalise(1)).toBeGreaterThan(ANALISE.leituraMs);
  });

  it("a origem só aceita o que o back-end aceita", () => {
    expect(origemDe("Instagram_Bio!")).toBe("instagrambio");
    expect(origemDe(null)).toBe("direto");
    expect(origemDe("@@@")).toBe("direto");
    expect(origemDe("a".repeat(80))).toHaveLength(60);
  });

  it("mascara o telefone enquanto se digita", () => {
    expect(mascararTelefone("")).toBe("");
    expect(mascararTelefone("2")).toBe("(2");
    expect(mascararTelefone("2799")).toBe("(27) 99");
    expect(mascararTelefone("2733334444")).toBe("(27) 3333-4444");
    expect(mascararTelefone("27999990000")).toBe("(27) 99999-0000");
    expect(mascararTelefone("27 99999-0000 ramal 2")).toBe("(27) 99999-0000");
  });

  it("aponta o que falta no contato", () => {
    expect(errosDoContato(COMPLETAS)).toEqual({});
    expect(errosDoContato(RESPOSTAS_VAZIAS)).toEqual({
      nome: "Informe seu nome.",
      email: "Informe um e-mail válido.",
      telefone: "Informe o telefone com DDD.",
      nomeDoOrgao: "Informe o nome do órgão.",
      consentimento: "Para a GovPro falar com você, é preciso concordar.",
    });
    expect(errosDoContato({ ...COMPLETAS, telefone: "(27) 99999-00000" }).telefone).toBeDefined();
  });

  it("monta o envio no formato do back-end", () => {
    expect(paraEnvio(COMPLETAS, "instagram")).toEqual({
      origin: "instagram",
      organizationType: "PREFEITURA",
      organizationName: "Prefeitura Municipal de Colatina",
      uf: "ES",
      municipality: "Colatina",
      ibgeCode: "3201506",
      role: "AGENTE_CONTRATACAO",
      department: null,
      teamSize: "DE_2_A_5",
      annualVolume: "DE_51_A_200",
      requestingUnits: "DE_4_A_10",
      currentPractices: ["WORD_E_MODELOS", "IA_GENERICA"],
      pains: ["TEMPO_ETP_TR", "PRAZOS"],
      timing: "AGORA",
      contactName: "Ana Souza",
      contactEmail: "ana@colatina.es.gov.br",
      contactPhone: "(27) 99999-0000",
      consent: true,
      website: null,
    });
    const estado = paraEnvio({ ...COMPLETAS, orgao: "GOVERNO_ESTADUAL", setor: "SEGER", armadilha: "x" }, "direto");
    expect(estado).toMatchObject({ municipality: null, ibgeCode: null, department: "SEGER", website: "x" });
    const semLista = paraEnvio({ ...COMPLETAS, municipio: "  ", codigoIbge: undefined }, "direto");
    expect(semLista).toMatchObject({ municipality: null, ibgeCode: null });
  });

  it("o e-mail reserva traz tudo, com linhas em CRLF", () => {
    const corpo = corpoDoEmailReserva(COMPLETAS);
    expect(corpo.split("\r\n")).toContain("Setor: Não informado");
    expect(corpo).toContain("O que mais pesa: Tempo para escrever ETP e TR; Prazos de convênios e emendas");
    expect(corpoDoEmailReserva({ ...COMPLETAS, dores: [], setor: "Compras" })).toContain(
      "O que mais pesa: Nenhuma marcada",
    );
    expect(corpoDoEmailReserva({ ...COMPLETAS, setor: "Compras" })).toContain("Setor: Compras");
  });
});
