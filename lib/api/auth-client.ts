import "client-only"

import type { components } from "@/lib/api/gerado/v1"
import { iniciaisDe, primeiroNome } from "@/lib/dominio"
import type { PerfilAcesso, Sessao, Tenant, Usuario } from "@/lib/types"

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1").replace(/\/$/, "")

interface ApiProblem {
  detail?: string
  title?: string
  code?: string
}

/**
 * A forma do payload vem do contrato gerado (`npm run tipos`), não da mão: a
 * integração de autenticação nasceu com 252 linhas de DTO digitado, e um contrato
 * escrito à mão só diverge do servidor em produção.
 *
 * O **mapeamento** abaixo continua manual de propósito — é camada anticorrupção,
 * o lugar onde o vocabulário do backend vira o vocabulário da interface.
 */
type Schemas = components["schemas"]

type BackendOrganization = Schemas["OrganizationResponse"]
type BackendSession = Schemas["SessionResponse"]
type AuthenticationResponse = Schemas["AuthenticationResponse"]

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message)
    this.name = "ApiError"
  }
}

let accessToken: string | null = null
let refreshEmAndamento: Promise<AuthenticationResponse> | null = null

async function problemaDa(response: Response): Promise<ApiProblem> {
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.includes("application/problem+json") && !contentType.includes("application/json")) return {}
  try {
    return (await response.json()) as ApiProblem
  } catch {
    return {}
  }
}

async function erroDa(response: Response, fallback: string): Promise<ApiError> {
  const problema = await problemaDa(response)
  return new ApiError(problema.detail ?? problema.title ?? fallback, response.status, problema.code)
}

async function requisicaoPublica<T>(path: string, init: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique se o backend está em execução.", 0)
  }
  if (!response.ok) throw await erroDa(response, "Não foi possível concluir a solicitação.")
  if (response.status === 204 || response.status === 202) return undefined as T
  return (await response.json()) as T
}

async function renovarToken(): Promise<AuthenticationResponse> {
  if (!refreshEmAndamento) {
    refreshEmAndamento = requisicaoPublica<AuthenticationResponse>("/auth/refresh", { method: "POST" })
      .then((authentication) => {
        accessToken = authentication.accessToken ?? null
        return authentication
      })
      .finally(() => {
        refreshEmAndamento = null
      })
  }
  return refreshEmAndamento
}

async function requisicaoAutenticada<T>(path: string, init: RequestInit = {}, permiteRenovar = true): Promise<T> {
  if (!accessToken) await renovarToken()
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    })
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique se o backend está em execução.", 0)
  }
  if (response.status === 401 && permiteRenovar) {
    accessToken = null
    await renovarToken()
    return requisicaoAutenticada<T>(path, init, false)
  }
  if (!response.ok) throw await erroDa(response, "Não foi possível concluir a solicitação.")
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

/** Requisição autenticada reutilizável para módulos já migrados ao Spring Boot. */
export async function requisicaoProtegida<T>(path: string, init: RequestInit = {}): Promise<T> {
  return requisicaoAutenticada<T>(path, init)
}

type PerfilBackend = NonNullable<NonNullable<BackendSession["user"]>["profileAccess"]>

const perfis: Record<PerfilBackend, PerfilAcesso> = {
  ADMIN_GERAL: "admin_geral",
  COORDENADOR: "coordenador",
  SERVIDOR: "servidor",
}

function tenantDa(organization: BackendOrganization | null | undefined): Tenant | null {
  if (!organization?.id) return null
  return {
    id: organization.id,
    orgao: organization.name ?? "",
    unidade: organization.unit ?? "",
    secretarias: [],
    logoArquivo: null,
    logoDataUrl: null,
    timbrado: true,
    cabecalho: `${(organization.name ?? "").toUpperCase()}\n${organization.unit ?? ""}`,
    rodape: "Documento gerado eletronicamente pela plataforma GeraDocs · {data} · Processo nº {numero}",
    pca: { ano: String(new Date().getFullYear()), arquivo: null, itensIndexados: 0 },
  }
}

/**
 * O contrato gerado declara **todo** campo como opcional, porque os DTOs de
 * resposta do backend não anunciam obrigatoriedade na especificação. Enquanto
 * for assim, o mapeamento decide explicitamente o que fazer com a ausência em
 * vez de fingir que ela não existe.
 *
 * A correção está registrada como pendência do contrato: quando a spec passar a
 * declarar `required`, estes `??` viram type error e somem — que é o sinal certo.
 */
function mapearSessao(session: BackendSession): Sessao {
  const user = session.user
  if (!user?.id || !user.name) {
    throw new ApiError("Resposta de sessão incompleta: o servidor não identificou o usuário.", 502)
  }
  const nome = user.name
  const usuario: Usuario = {
    id: user.id,
    nome,
    primeiroNome: primeiroNome(nome),
    iniciais: iniciaisDe(nome),
    cpf: user.cpf ?? "",
    email: user.email ?? "",
    cargo: user.jobTitle ?? "",
    perfilAcesso: perfis[user.profileAccess ?? "SERVIDOR"] ?? "servidor",
    prefeituraId: session.organization?.id ?? null,
    avatarDataUrl: null,
    ultimoAcesso: user.lastAccessAt ?? "",
    ativo: user.status === "ACTIVE",
  }
  return { usuario, prefeitura: tenantDa(session.organization ?? null) }
}

export async function autenticar(cpf: string, password: string): Promise<Sessao> {
  try {
    const authentication = await requisicaoPublica<AuthenticationResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ cpf, password, organizationId: null }),
    })
    accessToken = authentication.accessToken ?? null
    return mapearSessao(authentication.session ?? {})
  } catch (error) {
    if (error instanceof ApiError && error.status !== 0 && error.status !== 429) {
      throw new ApiError("CPF ou senha inválidos.", error.status, error.code)
    }
    throw error
  }
}

export async function obterSessao(): Promise<Sessao | null> {
  try {
    if (!accessToken) await renovarToken()
    return mapearSessao(await requisicaoAutenticada<BackendSession>("/me"))
  } catch (error) {
    if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
      accessToken = null
      return null
    }
    throw error
  }
}

export async function encerrarSessao(): Promise<void> {
  try {
    await requisicaoAutenticada<void>("/auth/logout", { method: "POST" })
  } catch (error) {
    if (!(error instanceof ApiError) || (error.status !== 401 && error.status !== 403)) throw error
  } finally {
    accessToken = null
  }
}

export async function solicitarRedefinicao(email: string): Promise<void> {
  await requisicaoPublica<void>("/auth/password-recovery", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

export async function redefinirSenha(token: string, password: string): Promise<void> {
  await requisicaoPublica<void>("/auth/password-reset", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  })
}
