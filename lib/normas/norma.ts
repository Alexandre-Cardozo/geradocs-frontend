/**
 * Regras de apresentação e de preenchimento da norma do órgão.
 *
 * O servidor valida de novo e tem a palavra final; aqui a validação existe
 * para dizer o que falta antes do envio, e não depois de subir um arquivo de
 * 10 MB só para ouvir que a ementa está vazia.
 */

import type { DadosDaNorma, Norma } from "@/lib/api/regulation-client"

/** Os formatos que o servidor aceita, para o seletor de arquivo. */
export const FORMATOS_DA_NORMA = ".pdf,.docx,.txt"

/** O mesmo teto do servidor. */
export const TAMANHO_MAXIMO_DA_NORMA = 10 * 1024 * 1024

/** "05/03/2025", a partir de "2025-03-05" — sem passar por fuso horário. */
export function dataDaNorma(iso: string): string {
  const [ano, mes, dia] = iso.split("-")
  return `${dia}/${mes}/${ano}`
}

/** "Decreto nº 10.210, de 05/03/2025" — a forma como a norma é citada. */
export function citacaoDaNorma(norma: Pick<Norma, "rotuloDaEspecie" | "numero" | "publicadaEm">): string {
  let citacao = norma.rotuloDaEspecie
  if (norma.numero) citacao += ` nº ${norma.numero}`
  if (norma.publicadaEm) citacao += `, de ${dataDaNorma(norma.publicadaEm)}`
  return citacao
}

/** Os dados de uma norma existente, prontos para o formulário de correção. */
export function dadosDe(norma: Norma): DadosDaNorma {
  return {
    especie: norma.especie,
    numero: norma.numero ?? "",
    publicadaEm: norma.publicadaEm ?? "",
    ementa: norma.ementa,
    observacao: norma.observacao ?? "",
  }
}

export const DADOS_VAZIOS: DadosDaNorma = {
  especie: "DECREE",
  numero: "",
  publicadaEm: "",
  ementa: "",
  observacao: "",
}

/**
 * O que impede o envio, campo a campo. Vazio quando pode enviar.
 *
 * @param arquivo no cadastro, o arquivo escolhido; na correção, `undefined`
 *                (o arquivo não muda ali)
 */
export function errosDaNorma(
  dados: DadosDaNorma,
  arquivo?: File | null,
): Partial<Record<keyof DadosDaNorma | "arquivo", string>> {
  const erros: Partial<Record<keyof DadosDaNorma | "arquivo", string>> = {}
  const ementa = dados.ementa.trim()
  if (ementa.length < 3) erros.ementa = "Informe a ementa ou o assunto da norma."
  else if (ementa.length > 500) erros.ementa = "A ementa tem no máximo 500 caracteres."
  if (dados.numero.trim().length > 60) erros.numero = "O número tem no máximo 60 caracteres."
  if (dados.observacao.trim().length > 2000) erros.observacao = "A observação tem no máximo 2.000 caracteres."
  if (dados.publicadaEm && dados.publicadaEm < "1900-01-01") erros.publicadaEm = "A data de publicação parece errada."
  if (arquivo === null) erros.arquivo = "Anexe o arquivo da norma (PDF, DOCX ou TXT)."
  else if (arquivo && arquivo.size > TAMANHO_MAXIMO_DA_NORMA) erros.arquivo = "O arquivo precisa ter no máximo 10 MB."
  return erros
}
