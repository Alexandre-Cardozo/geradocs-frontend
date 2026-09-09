/**
 * A chave de identificação do login, descrita em um só lugar.
 *
 * Rótulo, placeholder, máscara, validação e `autoComplete` ficam juntos porque
 * são a mesma decisão vista de ângulos diferentes: trocar a chave e esquecer o
 * `autoComplete` faz o gerenciador de senhas oferecer o CPF salvo num campo de
 * e-mail. A tela de login não sabe qual é a chave — ela renderiza o descritor.
 *
 * O tipo ativo precisa ser o mesmo que o back-end tem em
 * `geradocs.auth.login-identifier` (ADR-015). Divergindo, o formulário valida
 * uma coisa e o servidor procura outra, e o erro chega como "credencial
 * inválida" sem dizer o porquê.
 */

import { formatCPF, limpaCPF, validaCPF } from "./cpf"

export type TipoIdentificador = "CPF" | "EMAIL" | "REGISTRATION_NUMBER"

export type DescritorIdentificador = {
  readonly tipo: TipoIdentificador
  /** Rótulo do campo — e a palavra que abre a mensagem de credencial recusada. */
  readonly rotulo: string
  readonly placeholder: string
  readonly autoComplete: string
  readonly inputMode: "text" | "numeric" | "email"
  /** Máscara aplicada a cada tecla; identidade quando o formato é livre. */
  readonly formata: (valor: string) => string
  /** O que sai daqui é o que vai para a API. */
  readonly normaliza: (valor: string) => string
  readonly valida: (valor: string) => boolean
  readonly mensagemFormato: string
}

const CPF: DescritorIdentificador = {
  tipo: "CPF",
  rotulo: "CPF",
  placeholder: "000.000.000-00",
  autoComplete: "username",
  inputMode: "numeric",
  formata: formatCPF,
  normaliza: limpaCPF,
  valida: validaCPF,
  mensagemFormato: "Informe um CPF válido.",
}

const EMAIL: DescritorIdentificador = {
  tipo: "EMAIL",
  rotulo: "E-mail",
  placeholder: "seu.email@prefeitura.gov.br",
  autoComplete: "username",
  inputMode: "email",
  formata: (valor) => valor,
  normaliza: (valor) => valor.trim().toLowerCase(),
  // Validação deliberadamente frouxa: o que decide se o e-mail existe é o
  // servidor, e uma regra estrita aqui recusaria endereço institucional legítimo.
  valida: (valor) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor.trim()),
  mensagemFormato: "Informe um e-mail válido.",
}

const MATRICULA: DescritorIdentificador = {
  tipo: "REGISTRATION_NUMBER",
  rotulo: "Matrícula",
  placeholder: "Sua matrícula funcional",
  autoComplete: "username",
  inputMode: "text",
  formata: (valor) => valor,
  // Maiúscula e sem espaços nas pontas: a mesma forma canônica do cadastro e do
  // índice único no banco. Divergindo, quem se cadastrou como MAT-4471 não
  // entraria digitando mat-4471.
  normaliza: (valor) => valor.trim().toUpperCase(),
  // O formato varia por município; inventar máscara aqui recusaria matrícula
  // legítima.
  valida: (valor) => valor.trim().length > 0,
  mensagemFormato: "Informe a matrícula.",
}

export const DESCRITORES: Record<TipoIdentificador, DescritorIdentificador> = {
  CPF,
  EMAIL,
  REGISTRATION_NUMBER: MATRICULA,
}

function tipoConfigurado(): TipoIdentificador {
  const configurado = process.env.NEXT_PUBLIC_LOGIN_IDENTIFIER
  return configurado != null && configurado in DESCRITORES
    ? (configurado as TipoIdentificador)
    : "CPF"
}

/** O descritor em uso nesta instalação. */
export const IDENTIFICADOR: DescritorIdentificador = DESCRITORES[tipoConfigurado()]

/** "CPF ou senha inválida." — o mesmo texto que o back-end devolve no 401. */
export function mensagemCredencialRecusada(
  descritor: DescritorIdentificador = IDENTIFICADOR,
): string {
  return `${descritor.rotulo} ou senha inválida.`
}
