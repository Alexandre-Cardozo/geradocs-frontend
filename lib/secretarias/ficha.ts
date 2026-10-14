/**
 * A ficha da secretaria (ADR-044 do back-end): o que o DFD mostra sem que se
 * digite de novo a cada processo.
 *
 * O servidor valida de novo e tem a palavra final; aqui a validação existe para
 * apontar o campo antes do envio.
 */

import type { FichaParaSalvar } from "@/lib/api/access-client"
import { validaCPF } from "@/lib/auth/cpf"
import { validaEmail } from "@/lib/auth/email"
import type { FichaDaSecretaria, Secretaria } from "@/lib/types"
import { erroNomeInstitucional } from "@/lib/validacao/campos"

export interface FichaEmEdicao {
  email: string
  endereco: string
  ug: string
  secretario: string
  /** O CPF digitado agora; vazio mantém o guardado (que só existe mascarado). */
  cpfNovo: string
  decretoDeNomeacao: string
}

export function emEdicao(ficha: FichaDaSecretaria): FichaEmEdicao {
  return {
    email: ficha.email ?? "",
    endereco: ficha.endereco ?? "",
    ug: ficha.ug ?? "",
    secretario: ficha.secretario ?? "",
    cpfNovo: "",
    decretoDeNomeacao: ficha.decretoDeNomeacao ?? "",
  }
}

export function errosDaFicha(ficha: FichaEmEdicao): Partial<Record<keyof FichaEmEdicao, string>> {
  const erros: Partial<Record<keyof FichaEmEdicao, string>> = {}
  if (ficha.email.trim() && !validaEmail(ficha.email.trim())) erros.email = "Informe um e-mail institucional válido."
  if (ficha.endereco.trim().length > 300) erros.endereco = "O endereço tem no máximo 300 caracteres."
  if (ficha.ug.trim().length > 40) erros.ug = "A UG tem no máximo 40 caracteres."
  const secretario = ficha.secretario.trim()
  if (secretario && secretario.length < 3) erros.secretario = "Informe o nome completo do secretário."
  if (ficha.cpfNovo.trim() && !validaCPF(ficha.cpfNovo)) erros.cpfNovo = "CPF inválido."
  if (ficha.decretoDeNomeacao.trim().length > 160) {
    erros.decretoDeNomeacao = "O decreto de nomeação tem no máximo 160 caracteres."
  }
  if (!secretario && (ficha.cpfNovo.trim() || ficha.decretoDeNomeacao.trim())) {
    erros.secretario = "Informe o nome do secretário junto com o CPF e o decreto."
  }
  return erros
}

/** O que falta para o DFD sair com a secretaria completa; vazio quando nada falta. */
export function pendenciasDaFicha(ficha: FichaDaSecretaria): string[] {
  const faltam: string[] = []
  if (!ficha.email) faltam.push("e-mail")
  if (!ficha.endereco) faltam.push("endereço")
  if (!ficha.ug) faltam.push("UG")
  if (!ficha.secretario) faltam.push("secretário")
  return faltam
}

/** O que vai ao servidor. CPF em branco não vai: o servidor mantém o guardado, que a tela só conhece mascarado. */
export function fichaParaSalvar(ficha: FichaEmEdicao): FichaParaSalvar {
  const { cpfNovo, ...resto } = ficha
  const cpf = cpfNovo.trim()
  return cpf ? { ...resto, cpfDoSecretario: cpf } : resto
}

/** Sem acento, caixa e espaço sobrando: "Secretaria de Saúde" e "secretaria  de saude" são a mesma. */
function comparavel(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * O nome é o que aparece como Secretaria Requisitante no processo e no documento.
 *
 * <p>Duas com o mesmo nome deixariam quem abre o processo sem saber qual escolher
 * — por isso a repetição é apontada aqui, antes de virar cadastro.
 *
 * @param outras as secretarias já cadastradas, sem a que está sendo editada
 */
export function erroDoNome(nome: string, outras: Secretaria[]): string | undefined {
  if (nome.trim() === "") return "Informe o nome da secretaria."
  const formato = erroNomeInstitucional(nome, "O nome da secretaria")
  if (formato) return formato
  const repetida = outras.find((s) => comparavel(s.nome) === comparavel(nome))
  return repetida ? `Já existe uma secretaria com este nome: ${repetida.nome}.` : undefined
}

/**
 * Nada mudou: nem o nome, nem a ficha, nem um CPF novo digitado.
 *
 * <p>Gravar o que não mudou subiria a versão do registro e apareceria na trilha
 * do órgão como uma edição que não houve.
 */
export function nadaMudou(secretaria: Secretaria, nome: string, ficha: FichaEmEdicao): boolean {
  const original = emEdicao(secretaria.ficha)
  return (
    nome.trim() === secretaria.nome &&
    (Object.keys(original) as Array<keyof FichaEmEdicao>).every((campo) => ficha[campo].trim() === original[campo])
  )
}
