import "client-only"

import type { PapelUsuario, PerfilAcesso, Sessao, Tenant, Usuario } from "@/lib/types"

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api/v1").replace(/\/$/, "")

interface ApiProblem {
  detail?: string
  title?: string
  code?: string
}

interface BackendOrganization {
  id: string
  name: string
  unit: string
  status: "ACTIVE" | "INACTIVE"
}

interface BackendMembership {
  organizationId: string
  departmentId: string | null
  workflowRoles: string[]
  active: boolean
}

interface BackendSession {
  user: {
    id: string
    name: string
    cpf: string
    email: string
    jobTitle: string
    profileAccess: "ADMIN_GERAL" | "COORDENADOR" | "SERVIDOR"
    status: "PENDING_ACTIVATION" | "ACTIVE" | "INACTIVE"
    lastAccessAt: string | null
  }
  organization: BackendOrganization | null
  activeMembership: BackendMembership | null
  permissions: string[]
}

interface AuthenticationResponse {
  accessToken: string
  tokenType: "Bearer"
  expiresIn: number
  expiresAt: string
  session: BackendSession
}

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
        accessToken = authentication.accessToken
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

const perfis: Record<BackendSession["user"]["profileAccess"], PerfilAcesso> = {
  ADMIN_GERAL: "admin_geral",
  COORDENADOR: "coordenador",
  SERVIDOR: "servidor",
}

const papeis: Partial<Record<string, PapelUsuario>> = {
  SERVIDOR_COMPRAS: "servidor_compras",
  SECRETARIA_DEMANDANTE: "secretaria_demandante",
  COMISSAO: "comissao",
  JURIDICO: "juridico",
  GESTOR_APROVADOR: "gestor_aprovador",
}

function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  return `${partes[0]?.[0] ?? ""}${partes.at(-1)?.[0] ?? ""}`.toUpperCase() || "?"
}

function papelDa(session: BackendSession): PapelUsuario {
  if (session.user.profileAccess === "ADMIN_GERAL") return "admin_lahhm"
  const role = session.activeMembership?.workflowRoles.find((item) => papeis[item])
  return role ? (papeis[role] ?? "servidor_compras") : "servidor_compras"
}

function tenantDa(organization: BackendOrganization | null): Tenant | null {
  if (!organization) return null
  return {
    id: organization.id,
    orgao: organization.name,
    unidade: organization.unit,
    secretarias: [],
    logoArquivo: null,
    logoDataUrl: null,
    timbrado: true,
    cabecalho: `${organization.name.toUpperCase()}\n${organization.unit}`,
    rodape: "Documento gerado eletronicamente pela plataforma GeraDocs · {data} · Processo nº {numero}",
    pca: { ano: String(new Date().getFullYear()), arquivo: null, itensIndexados: 0 },
  }
}

function mapearSessao(session: BackendSession): Sessao {
  const usuario: Usuario = {
    id: session.user.id,
    nome: session.user.name,
    primeiroNome: session.user.name.trim().split(/\s+/)[0] ?? session.user.name,
    iniciais: iniciaisDe(session.user.name),
    cpf: session.user.cpf,
    email: session.user.email,
    cargo: session.user.jobTitle,
    perfilAcesso: perfis[session.user.profileAccess],
    papel: papelDa(session),
    prefeituraId: session.organization?.id ?? null,
    avatarDataUrl: null,
    ultimoAcesso: session.user.lastAccessAt ?? "",
    ativo: session.user.status === "ACTIVE",
  }
  return { usuario, prefeitura: tenantDa(session.organization) }
}

export async function autenticar(cpf: string, password: string): Promise<Sessao> {
  try {
    const authentication = await requisicaoPublica<AuthenticationResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ cpf, password, organizationId: null }),
    })
    accessToken = authentication.accessToken
    return mapearSessao(authentication.session)
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
