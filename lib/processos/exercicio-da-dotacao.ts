import { anoBrasilia } from "@/lib/format"

/** Quantos exercícios antes do atual a lista oferece: o do ano que acabou, para corrigir. */
const ANTES = 1
/** Quantos depois: os quatro anos do plano plurianual, para o contrato que passa de um exercício. */
const DEPOIS = 4

/**
 * Os exercícios que a dotação pode ter, do mais antigo ao mais novo.
 *
 * <p>O exercício é escolhido numa lista, e não digitado: "30906" e "2999" eram
 * erro de teclado que só o servidor recusava, com uma mensagem que não dizia o
 * campo. O ano atual (Brasília) é o padrão; a lista vai do anterior aos quatro
 * seguintes. O exercício já gravado fora dessa faixa continua na lista, para a
 * correção não trocar o ano sem a pessoa pedir.
 */
export function exerciciosDaDotacao(gravado?: number, atual: number = anoBrasilia()): number[] {
  const anos = Array.from({ length: ANTES + 1 + DEPOIS }, (_, i) => atual - ANTES + i)
  if (gravado != null && !anos.includes(gravado)) anos.push(gravado)
  return anos.sort((a, b) => a - b)
}
