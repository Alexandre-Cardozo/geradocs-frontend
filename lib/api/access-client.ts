import "client-only"

import { requisicaoProtegida } from "@/lib/api/auth-client"
import { iniciaisDe, primeiroNome } from "@/lib/dominio"
import type { PerfilAcesso, Secretaria, Tenant, Usuario } from "@/lib/types"

type BackendProfile = "ADMIN_GERAL" | "COORDENADOR" | "SERVIDOR"

interface BackendOrganization {
  id: string
  name: string
  unit: string | null
  status: "ACTIVE" | "INACTIVE"
  version: number
}

interface BackendDepartment {
  id: string
  organizationId: string
  name: string
  acronym: string | null
  active: boolean
  version: number
}

interface BackendMembership {
  organizationId: string
  departmentId: string | null
  active: boolean
}

interface BackendUser {
  id: string
  name: string
  cpf: string
  email: string
  jobTitle: string | null
  registrationNumber: string | null
  appointmentDecree: string | null
  profileAccess: BackendProfile
  status: "PENDING_ACTIVATION" | "ACTIVE" | "INACTIVE"
  memberships: BackendMembership[]
  lastAccessAt: string | null
  version?: number
}

const perfis: Record<BackendProfile, PerfilAcesso> = {
  ADMIN_GERAL: "admin_geral",
  COORDENADOR: "coordenador",
  SERVIDOR: "servidor",
}


/** ETag no formato que o backend espera em If-Match. */
function ifMatch(version: number): string {
  return `"${version}"`
}

function tenantDa(organization: BackendOrganization, secretarias: Secretaria[] = []): Tenant {
  return {
    id: organization.id,
    orgao: organization.name,
    unidade: organization.unit ?? "",
    secretarias,
    logoArquivo: null,
    logoDataUrl: null,
    timbrado: true,
    cabecalho: `${organization.name.toUpperCase()}\n${organization.unit ?? ""}`.trim(),
    rodape: "Documento gerado eletronicamente pela plataforma GeraDocs · {data} · Processo nº {numero}",
  }
}

function usuarioDa(user: BackendUser): Usuario {
  const membership = user.memberships.find((item) => item.active)
  return {
    id: user.id,
    nome: user.name,
    primeiroNome: primeiroNome(user.name),
    iniciais: iniciaisDe(user.name),
    cpf: user.cpf,
    email: user.email,
    cargo: user.jobTitle ?? "",
    matricula: user.registrationNumber ?? undefined,
    decretoNomeacao: user.appointmentDecree ?? undefined,
    perfilAcesso: perfis[user.profileAccess],
    prefeituraId: membership?.organizationId ?? null,
    secretaria: membership?.departmentId ?? undefined,
    avatarDataUrl: null,
    ultimoAcesso: user.lastAccessAt ?? "",
    ativo: user.status === "ACTIVE",
  }
}

function secretariaDa(department: BackendDepartment): Secretaria {
  return { id: department.id, nome: department.name, sigla: department.acronym ?? undefined }
}

export interface NovaPrefeituraInput {
  orgao: string
  unidade: string
}

export interface NovoUsuarioInput {
  nome: string
  cpf: string
  email: string
  cargo: string
  matricula?: string
  decretoNomeacao?: string
  senha: string
  perfilAcesso: PerfilAcesso
  prefeituraId: string | null
  departamentoId?: string | null
}

export async function listarPrefeituras(): Promise<Tenant[]> {
  const organizations = await requisicaoProtegida<BackendOrganization[]>("/organizations")
  return organizations.filter((item) => item.status === "ACTIVE").map((item) => tenantDa(item))
}

export async function criarPrefeitura(input: NovaPrefeituraInput): Promise<Tenant> {
  const organization = await requisicaoProtegida<BackendOrganization>("/organizations", {
    method: "POST",
    body: JSON.stringify({ name: input.orgao.trim(), unit: input.unidade.trim() || null }),
  })
  return tenantDa(organization)
}

export async function desativarPrefeitura(id: string): Promise<void> {
  const organization = await requisicaoProtegida<BackendOrganization>(`/organizations/${id}`)
  await requisicaoProtegida<void>(`/organizations/${id}/deactivate`, {
    method: "POST",
    headers: { "If-Match": ifMatch(organization.version) },
    body: JSON.stringify({ reason: "Desativada pela administração da plataforma." }),
  })
}

export async function obterTenant(id: string): Promise<Tenant> {
  const organizationPromise = requisicaoProtegida<BackendOrganization>(`/organizations/${id}`)
  const departmentsPromise = requisicaoProtegida<BackendDepartment[]>(`/organizations/${id}/departments`)
  const [organization, departments] = await Promise.all([organizationPromise, departmentsPromise])
  return tenantDa(organization, departments.filter((item) => item.active).map(secretariaDa))
}

export async function criarDepartamento(organizationId: string, name: string, acronym = ""): Promise<Secretaria> {
  const department = await requisicaoProtegida<BackendDepartment>(`/organizations/${organizationId}/departments`, {
    method: "POST",
    body: JSON.stringify({ name: name.trim(), acronym: acronym.trim() }),
  })
  return secretariaDa(department)
}

export async function desativarDepartamento(organizationId: string, departmentId: string): Promise<void> {
  const departments = await requisicaoProtegida<BackendDepartment[]>(`/organizations/${organizationId}/departments`)
  const department = departments.find((item) => item.id === departmentId)
  if (!department) throw new Error("Secretaria não encontrada.")
  await requisicaoProtegida<void>(`/organizations/${organizationId}/departments/${departmentId}/deactivate`, {
    method: "POST",
    headers: { "If-Match": ifMatch(department.version) },
    body: JSON.stringify({ reason: "Desativado pela administração da organização." }),
  })
}

/**
 * @param busca trecho de nome ou matrícula; o servidor filtra antes de devolver
 */
export async function listarUsuarios(organizationId?: string, busca?: string): Promise<Usuario[]> {
  const parametros = new URLSearchParams()
  if (organizationId) parametros.set("organizationId", organizationId)
  if (busca != null && busca.trim() !== "") parametros.set("search", busca.trim())
  const query = parametros.size > 0 ? `?${parametros}` : ""
  const users = await requisicaoProtegida<BackendUser[]>(`/users${query}`)
  return users.map(usuarioDa)
}

export async function criarUsuario(input: NovoUsuarioInput): Promise<Usuario> {
  const profileAccess = Object.entries(perfis).find(([, value]) => value === input.perfilAcesso)?.[0] as BackendProfile
  const user = await requisicaoProtegida<BackendUser>("/users", {
    method: "POST",
    body: JSON.stringify({
      name: input.nome.trim(),
      cpf: input.cpf,
      email: input.email.trim(),
      jobTitle: input.cargo.trim() || null,
      registrationNumber: input.matricula?.trim() || null,
      appointmentDecree: input.decretoNomeacao?.trim() || null,
      password: input.senha,
      profileAccess,
      organizationId: input.perfilAcesso === "admin_geral" ? null : input.prefeituraId,
      departmentId: input.perfilAcesso === "admin_geral" ? null : input.departamentoId ?? null,
    }),
  })
  return usuarioDa(user)
}

export async function desativarUsuario(id: string): Promise<void> {
  const user = await requisicaoProtegida<BackendUser>(`/users/${id}`)
  if (user.version == null) throw new Error("Não foi possível identificar a versão atual do usuário.")
  await requisicaoProtegida<void>(`/users/${id}/deactivate`, {
    method: "POST",
    headers: { "If-Match": ifMatch(user.version) },
    body: JSON.stringify({ reason: "Desativado pela administração." }),
  })
}
