import "client-only"

import { requisicaoPublica } from "@/lib/api/auth-client"
import { paraEnvio, type Respostas } from "@/lib/onboarding/respostas"

/**
 * O onboarding da GovPri (§130): o lead vai para o back-end (ADR-082), que o
 * guarda, classifica e avisa a GovPro por e-mail. Sem sessão.
 */
export async function enviarLead(respostas: Respostas, origem: string): Promise<void> {
  await requisicaoPublica<void>("/public/leads", {
    method: "POST",
    body: JSON.stringify(paraEnvio(respostas, origem)),
  })
}

export type Municipio = { nome: string; codigoIbge: string }

/**
 * Os municípios da UF, da API pública de localidades do IBGE. Escolher da lista
 * leva o código IBGE junto, que identifica o município sem ambiguidade. Se o
 * IBGE não responder, a tela segue aceitando o nome digitado.
 */
export async function municipiosDaUf(uf: string): Promise<Municipio[]> {
  const resposta = await fetch(
    `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${encodeURIComponent(uf)}/municipios?orderBy=nome`,
  )
  if (!resposta.ok) throw new Error("O IBGE não respondeu.")
  const lista = (await resposta.json()) as { id: number; nome: string }[]
  return lista.map((m) => ({ nome: m.nome, codigoIbge: String(m.id) }))
}
