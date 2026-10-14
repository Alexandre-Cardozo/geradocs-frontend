/**
 * Quem elaborou o documento e o ato normativo que o embasa (ADR-044 do back-end).
 *
 * O responsável é, por padrão, quem conclui — com os dados do cadastro —, e
 * pode ser outra pessoa (quem redigiu fora da plataforma). O ato só existe no
 * ETP (a portaria) e no Edital (o decreto): escolhido no acervo de normas do
 * órgão ou digitado. Sem ato informado, o servidor mantém o da versão anterior.
 */

import { validaCPF } from "@/lib/auth/cpf"
import type { TipoDocumento } from "@/lib/types"

/** O que vai na conclusão. Ausente, vale o padrão do servidor. */
export interface Elaboracao {
  responsavel?: { nome: string; cpf: string }
  ato?: { normaId: string } | { citacao: string }
}

/** "Portaria" no ETP, "Decreto" no Edital; os outros documentos não citam ato. */
export function rotuloDoAto(tipo: TipoDocumento): "Portaria" | "Decreto" | null {
  if (tipo === "ETP") return "Portaria"
  if (tipo === "Edital") return "Decreto"
  return null
}

/** O CPF como sai no documento: `***.456.789-**`. */
export function cpfMascarado(cpf: string): string {
  const d = cpf.replace(/\D/g, "")
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`
}

export interface EscolhaDaElaboracao {
  /** "eu": quem conclui. "outra": nome e CPF informados. */
  responsavel: "eu" | "outra"
  nome: string
  cpf: string
  /** "padrao": o da versão anterior, ou nenhum. "norma": do acervo. "digitado". */
  ato: "padrao" | "norma" | "digitado"
  normaId: string
  citacao: string
}

export const ESCOLHA_INICIAL: EscolhaDaElaboracao = {
  responsavel: "eu",
  nome: "",
  cpf: "",
  ato: "padrao",
  normaId: "",
  citacao: "",
}

/** O que impede concluir, campo a campo. */
export function errosDaElaboracao(
  escolha: EscolhaDaElaboracao,
): Partial<Record<"nome" | "cpf" | "norma" | "citacao", string>> {
  const erros: Partial<Record<"nome" | "cpf" | "norma" | "citacao", string>> = {}
  if (escolha.responsavel === "outra") {
    if (escolha.nome.trim().length < 3) erros.nome = "Informe o nome completo de quem elaborou."
    if (!validaCPF(escolha.cpf)) erros.cpf = "Informe um CPF válido."
  }
  if (escolha.ato === "norma" && !escolha.normaId) erros.norma = "Escolha a norma no acervo."
  if (escolha.ato === "digitado" && escolha.citacao.trim().length < 3) {
    erros.citacao = "Informe o número e a data do ato."
  }
  return erros
}

/** O que a conclusão envia; o padrão não vai, e o servidor o aplica. */
export function elaboracaoDe(escolha: EscolhaDaElaboracao, tipo: TipoDocumento): Elaboracao {
  const elaboracao: Elaboracao = {}
  if (escolha.responsavel === "outra") {
    elaboracao.responsavel = { nome: escolha.nome.trim(), cpf: escolha.cpf.replace(/\D/g, "") }
  }
  if (rotuloDoAto(tipo) && escolha.ato === "norma") elaboracao.ato = { normaId: escolha.normaId }
  if (rotuloDoAto(tipo) && escolha.ato === "digitado") elaboracao.ato = { citacao: escolha.citacao.trim() }
  return elaboracao
}
