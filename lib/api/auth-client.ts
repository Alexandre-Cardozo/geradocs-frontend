import "client-only"

import type { components } from "@/lib/api/gerado/v1"
import { IDENTIFICADOR, mensagemCredencialRecusada } from "@/lib/auth/identificador"
import { iniciaisDe, primeiroNome, tipoDaEntidade } from "@/lib/dominio"
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
        // FormData não leva Content-Type nosso: quem escreve o `boundary` é o
        // navegador, e fixar "application/json" aqui quebraria todo envio de arquivo.
        ...(init.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
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
        // FormData não leva Content-Type nosso: quem escreve o `boundary` é o
        // navegador, e fixar "application/json" aqui quebraria todo envio de arquivo.
        ...(init.body && !(init.body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
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

/**
 * Baixa bytes autenticado.
 *
 * Existe porque uma âncora comum não leva o cabeçalho de autorização: apontar o
 * `href` para a rota do arquivo daria 401 e a pessoa veria um download quebrado
 * sem nenhuma explicação. Aqui a resposta vem pela mesma porta das demais, com a
 * mesma renovação de token, e só então é entregue ao navegador.
 */
export async function baixarProtegido(
  path: string,
  permiteRenovar = true,
): Promise<{ conteudo: Blob; nomeSugerido: string | null }> {
  if (!accessToken) await renovarToken()
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique se o backend está em execução.", 0)
  }
  if (response.status === 401 && permiteRenovar) {
    accessToken = null
    await renovarToken()
    return baixarProtegido(path, false)
  }
  if (!response.ok) throw await erroDa(response, "Não foi possível baixar o arquivo.")
  return {
    conteudo: await response.blob(),
    // O nome vem do servidor: ele conhece o número do processo e a versão, e é
    // isso que torna o arquivo recuperável numa pasta de downloads.
    nomeSugerido: nomeNoCabecalho(response.headers.get("Content-Disposition")),
  }
}

/**
 * Busca uma imagem autenticada.
 *
 * Separado de `baixarProtegido` por causa do 404: aqui ele não é erro, é "esta
 * pessoa não pôs foto" — o caso mais comum. Tratá-lo como falha encheria a tela
 * de aviso para um estado normal.
 */
export async function imagemProtegida(
  path: string,
  permiteRenovar = true,
): Promise<Blob | null> {
  if (!accessToken) await renovarToken()
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, {
      credentials: "include",
      headers: { Authorization: `Bearer ${accessToken}` },
    })
  } catch {
    throw new ApiError("Não foi possível conectar ao servidor. Verifique se o backend está em execução.", 0)
  }
  if (response.status === 401 && permiteRenovar) {
    accessToken = null
    await renovarToken()
    return imagemProtegida(path, false)
  }
  // 403 junto com 404: quem não pode ver a foto de outra pessoa vê as iniciais,
  // e não uma mensagem de erro no meio de uma listagem.
  if (response.status === 404 || response.status === 403) return null
  if (!response.ok) throw await erroDa(response, "Não foi possível carregar a foto de perfil.")
  return response.blob()
}

/** O `filename` do `Content-Disposition`, quando o servidor o envia. */
function nomeNoCabecalho(cabecalho: string | null): string | null {
  if (!cabecalho) return null
  const achado = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cabecalho)
  return achado?.[1] ? decodeURIComponent(achado[1]) : null
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
    nome: organization.name ?? "",
    tipo: tipoDaEntidade(organization.entityType),
    secretarias: [],
    timbrado: true,
    cabecalho: (organization.name ?? "").toUpperCase(),
    rodape: "Documento gerado eletronicamente pela plataforma GeraDocs · {data} · Processo nº {numero}",
  }
}

/**
 * Desde 21/08/2026 o contrato declara `required`: o que o servidor sempre envia
 * chega tipado como presente, e os `??` que existiam só para satisfazer o
 * compilador foram embora. Os que sobraram correspondem a campos de fato
 * opcionais — CPF de cadastro pendente, cargo, matrícula, último acesso e a
 * organização do administrador global.
 *
 * A checagem de `user` continua, e não é redundância: um proxy no caminho pode
 * devolver corpo que não corresponde ao contrato, e sessão sem usuário
 * identificado precisa virar erro em vez de seguir com campos vazios.
 */
function mapearSessao(session: BackendSession | undefined): Sessao {
  const user = session?.user
  if (!user?.id || !user.name || !user.email || !user.profileAccess || !user.status) {
    // Faltando qualquer um destes, quem respondeu não foi o servidor do
    // contrato — foi um proxy, uma página de erro ou uma versão incompatível.
    // Preencher com vazio montaria uma sessão que parece válida e não é.
    throw new ApiError("Resposta de sessão incompleta: o servidor não identificou o usuário.", 502)
  }
  const nome = user.name
  const usuario: Usuario = {
    id: user.id,
    nome,
    primeiroNome: primeiroNome(nome),
    iniciais: iniciaisDe(nome),
    cpf: user.cpf ?? "",
    email: user.email,
    cargo: user.jobTitle ?? "",
    // Vinham no contrato e eram descartados aqui: a tela de perfil mostrava "—"
    // para dois campos que o servidor conhece.
    matricula: user.registrationNumber ?? undefined,
    decretoNomeacao: user.appointmentDecree ?? undefined,
    perfilAcesso: perfis[user.profileAccess],
    entidadeId: session?.organization?.id ?? null,
    ultimoAcesso: user.lastAccessAt ?? "",
    precisaTrocarSenha: user.passwordChangeRequired ?? false,
    ativo: user.status === "ACTIVE",
  }
  return { usuario, entidade: tenantDa(session?.organization ?? null) }
}

/**
 * @param identifier o que a pessoa digitou na chave configurada — CPF, e-mail ou
 *                   matrícula, conforme `IDENTIFICADOR` (ADR-015)
 */
export async function autenticar(identifier: string, password: string): Promise<Sessao> {
  try {
    const authentication = await requisicaoPublica<AuthenticationResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        identifier: IDENTIFICADOR.normaliza(identifier),
        password,
        organizationId: null,
      }),
    })
    accessToken = authentication.accessToken
    return mapearSessao(authentication.session)
  } catch (error) {
    // 0 é rede fora do ar e 429 é bloqueio por tentativas: chamar os dois de
    // credencial inválida mandaria a pessoa conferir uma senha que está certa.
    if (error instanceof ApiError && error.status !== 0 && error.status !== 429) {
      throw new ApiError(mensagemCredencialRecusada(), error.status, error.code)
    }
    throw error
  }
}

/**
 * Troca a própria senha e devolve a sessão já liberada.
 *
 * <p>É o caminho do primeiro acesso: a senha sorteada no cadastro é conhecida
 * por quem a entregou, e enquanto ela valer a sessão não faz mais nada.
 */
export async function trocarPropriaSenha(senhaAtual: string, novaSenha: string): Promise<Sessao> {
  return mapearSessao(
    await requisicaoAutenticada<BackendSession>("/auth/password-change", {
      method: "POST",
      body: JSON.stringify({ currentPassword: senhaAtual, newPassword: novaSenha }),
    }),
  )
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
