import "client-only"

import { imagemProtegida, requisicaoProtegida } from "@/lib/api/auth-client"
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
  /** A senha sorteada; só vem na resposta do cadastro. */
  provisionalPassword?: string
  passwordChangeRequired?: boolean
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
    ultimoAcesso: user.lastAccessAt ?? "",
    ativo: user.status === "ACTIVE",
  }
}

/** O perfil como o servidor o nomeia. */
function perfilBackend(perfil: PerfilAcesso): BackendProfile {
  return Object.entries(perfis).find(([, valor]) => valor === perfil)?.[0] as BackendProfile
}

/** A lotação ativa, que é o que a edição precisa reenviar quando não muda. */
function lotacaoDe(user: BackendUser) {
  return user.memberships.find((item) => item.active)
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

/**
 * Renomeia o órgão.
 *
 * <p>Só nome e unidade: são os dois campos que o servidor guarda. Timbre,
 * cabeçalho e rodapé continuam fabricados por `tenantDa()` e marcados como
 * sintéticos na tela — gravá-los aqui daria a impressão de terem sido salvos.
 */
export async function atualizarPrefeitura(
  id: string,
  patch: { orgao?: string; unidade?: string },
): Promise<Tenant> {
  const atual = await requisicaoProtegida<BackendOrganization>(`/organizations/${id}`)
  const organization = await requisicaoProtegida<BackendOrganization>(`/organizations/${id}`, {
    method: "PATCH",
    // A API troca o recurso inteiro: o que não muda é reenviado como está.
    headers: { "If-Match": ifMatch(atual.version) },
    body: JSON.stringify({
      name: patch.orgao?.trim() || atual.name,
      unit: patch.unidade?.trim() ?? atual.unit ?? null,
    }),
  })
  return tenantDa(organization)
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

/**
 * Cadastra o servidor. A senha é sorteada pelo servidor, não escolhida aqui.
 *
 * <p>Volta **uma vez**, para ser entregue a quem foi cadastrado, e o primeiro
 * acesso obriga a troca. Quem cadastra escolher a senha significaria saber a
 * senha de outra pessoa — e poder agir como ela.
 */
export async function criarUsuario(
  input: NovoUsuarioInput,
): Promise<{ usuario: Usuario; senhaProvisoria: string }> {
  const profileAccess = perfilBackend(input.perfilAcesso)
  const user = await requisicaoProtegida<BackendUser>("/users", {
    method: "POST",
    body: JSON.stringify({
      name: input.nome.trim(),
      cpf: input.cpf,
      email: input.email.trim(),
      jobTitle: input.cargo.trim() || null,
      registrationNumber: input.matricula?.trim() || null,
      appointmentDecree: input.decretoNomeacao?.trim() || null,
      profileAccess,
      organizationId: input.perfilAcesso === "admin_geral" ? null : input.prefeituraId,
      departmentId: input.perfilAcesso === "admin_geral" ? null : input.departamentoId ?? null,
    }),
  })
  if (!user.provisionalPassword) {
    // Sem ela não há como entregar o acesso, e o cadastro já foi gravado: dizer
    // isso é melhor que devolver um cadastro que ninguém consegue usar.
    throw new Error(
      "O servidor foi cadastrado, mas a senha provisória não veio na resposta. " +
        "Use a recuperação de senha para liberar o primeiro acesso.",
    )
  }
  return { usuario: usuarioDa(user), senhaProvisoria: user.provisionalPassword }
}


/**
 * Edita o servidor no cadastro.
 *
 * <p>A versão é relida do próprio recurso, como na desativação: o `If-Match` é o
 * que impede duas edições simultâneas de se sobrescreverem em silêncio, e a
 * lista da tela não carrega a versão de cada usuário.
 *
 * <p>A API troca o recurso inteiro, então o que não muda é reenviado como está —
 * um PATCH que omitisse o e-mail o apagaria.
 */
export async function atualizarUsuario(input: {
  id: string
  nome?: string
  email?: string
  cargo?: string
  matricula?: string
  decretoNomeacao?: string
  perfilAcesso?: PerfilAcesso
  prefeituraId?: string | null
  secretaria?: string
}): Promise<Usuario> {
  const atual = await requisicaoProtegida<BackendUser>(`/users/${input.id}`)
  if (atual.version == null) throw new Error("Não foi possível identificar a versão atual do usuário.")
  const perfil = input.perfilAcesso ?? perfis[atual.profileAccess]
  const lotacao = lotacaoDe(atual)
  const user = await requisicaoProtegida<BackendUser>(`/users/${input.id}`, {
    method: "PATCH",
    headers: { "If-Match": ifMatch(atual.version) },
    body: JSON.stringify({
      name: input.nome ?? atual.name,
      email: input.email ?? atual.email,
      jobTitle: input.cargo ?? atual.jobTitle ?? null,
      registrationNumber: input.matricula ?? atual.registrationNumber ?? null,
      appointmentDecree: input.decretoNomeacao ?? atual.appointmentDecree ?? null,
      profileAccess: perfilBackend(perfil),
      organizationId:
        perfil === "admin_geral" ? null : input.prefeituraId ?? lotacao?.organizationId ?? null,
      departmentId:
        perfil === "admin_geral" ? null : input.secretaria ?? lotacao?.departmentId ?? null,
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

/**
 * A administração devolve o acesso de quem perdeu a senha.
 *
 * <p>A senha volta **uma vez**, como no cadastro, e a pessoa retorna ao estado
 * de primeiro acesso: as sessões abertas dela caem e o aviso de troca reaparece
 * (ADR-022). Quem redefine precisa entregar a senha — não há segunda chance de
 * lê-la.
 */
export async function redefinirSenhaDeUsuario(id: string): Promise<string> {
  const resposta = await requisicaoProtegida<{ provisionalPassword?: string }>(
    `/users/${id}/password-reset`,
    { method: "POST" },
  )
  if (!resposta.provisionalPassword) {
    // A senha já foi trocada no servidor a esta altura: dizer isso é melhor do
    // que deixar a pessoa achar que nada aconteceu e tentar de novo.
    throw new Error(
      "A senha foi redefinida, mas não veio na resposta. Redefina novamente para obter uma nova.",
    )
  }
  return resposta.provisionalPassword
}

/**
 * O CPF inteiro de um servidor.
 *
 * <p>A listagem mascara de propósito, e revelar é um pedido à parte: fica
 * registrado na trilha quem revelou, de quem e quando (ADR-023). Não existe
 * caminho que devolva a coluna inteira em claro.
 */
export async function revelarCpf(id: string): Promise<string> {
  const resposta = await requisicaoProtegida<{ cpf?: string }>(`/users/${id}/cpf`)
  if (!resposta.cpf) {
    throw new Error("O servidor não devolveu o CPF.")
  }
  return resposta.cpf
}

/* ── Timbre do órgão (ADR-026) ─────────────────────────────────────────────── */

export interface Timbre {
  temBrasao: boolean
  cabecalho: string
  rodape: string
  /** Sobe a cada alteração; é o que o arquivo gerado registra. */
  versao: number
}

/** Os formatos que o DOCX e o PDF embutem sem conversão. */
export const FORMATOS_DE_BRASAO = "image/png,image/jpeg"

/** 512 KB, o mesmo teto da foto de perfil. */
export const TAMANHO_MAXIMO_DO_BRASAO = 512 * 1024

interface TimbreBackend {
  hasLogo?: boolean
  headerText?: string
  footerText?: string
  version?: number
}

function timbreDe(resposta: TimbreBackend): Timbre {
  return {
    temBrasao: resposta.hasLogo ?? false,
    cabecalho: resposta.headerText ?? "",
    rodape: resposta.footerText ?? "",
    versao: resposta.version ?? 1,
  }
}

export async function obterTimbre(organizationId: string): Promise<Timbre> {
  return timbreDe(
    await requisicaoProtegida<TimbreBackend>(`/organizations/${organizationId}/letterhead`),
  )
}

export async function salvarTextosDoTimbre(
  organizationId: string,
  cabecalho: string,
  rodape: string,
): Promise<Timbre> {
  return timbreDe(
    await requisicaoProtegida<TimbreBackend>(`/organizations/${organizationId}/letterhead`, {
      method: "PUT",
      body: JSON.stringify({ headerText: cabecalho, footerText: rodape }),
    }),
  )
}

export async function enviarBrasao(organizationId: string, arquivo: File): Promise<Timbre> {
  const corpo = new FormData()
  corpo.append("file", arquivo)
  return timbreDe(
    await requisicaoProtegida<TimbreBackend>(`/organizations/${organizationId}/letterhead/logo`, {
      method: "PUT",
      body: corpo,
    }),
  )
}

export async function removerBrasao(organizationId: string): Promise<Timbre> {
  return timbreDe(
    await requisicaoProtegida<TimbreBackend>(`/organizations/${organizationId}/letterhead/logo`, {
      method: "DELETE",
    }),
  )
}

/** @returns os bytes do brasão, ou `null` quando o órgão não cadastrou um */
export async function obterBrasao(organizationId: string): Promise<Blob | null> {
  return imagemProtegida(`/organizations/${organizationId}/letterhead/logo`)
}
