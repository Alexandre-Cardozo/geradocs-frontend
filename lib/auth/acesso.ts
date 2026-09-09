/**
 * Controle de acesso por perfil (RBAC) — fonte única.
 *
 * `rotaPermitida` gate de rota (usado na guarda do shell); `navPrincipal` /
 * `navSistema` a navegação da sidebar por perfil. Ícones ficam como chaves
 * (a Sidebar mapeia para componentes), mantendo este módulo sem React.
 */

import type { PerfilAcesso } from "@/lib/types"

/** Prefixo de rota → perfis que podem acessá-lo. A raiz "/" é liberada a todos. */
const ACESSO_ROTA: Array<{ prefixo: string; perfis: PerfilAcesso[] }> = [
  { prefixo: "/admin", perfis: ["admin_geral"] },
  { prefixo: "/configuracoes", perfis: ["coordenador"] },
  { prefixo: "/processos", perfis: ["servidor", "coordenador"] },
  { prefixo: "/documentos", perfis: ["servidor", "coordenador"] },
  { prefixo: "/perfil", perfis: ["servidor", "coordenador", "admin_geral"] },
]

/** O perfil pode acessar a rota? Casa o prefixo mais específico; raiz é liberada. */
export function rotaPermitida(perfil: PerfilAcesso, pathname: string): boolean {
  const regra = [...ACESSO_ROTA]
    .sort((a, b) => b.prefixo.length - a.prefixo.length)
    .find((r) => pathname === r.prefixo || pathname.startsWith(`${r.prefixo}/`))
  return regra ? regra.perfis.includes(perfil) : true
}

export type IconeNav =
  | "dashboard"
  | "processos"
  | "documentos"
  | "timbre"
  | "secretarias"
  | "pca"
  | "usuarios"
  | "entidades"
  | "servidores"

export interface ItemNav {
  href: string
  label: string
  icone: IconeNav
}

/** Itens da seção "Principal" da sidebar por perfil. */
export function navPrincipal(perfil: PerfilAcesso): ItemNav[] {
  if (perfil === "admin_geral") {
    return [
      { href: "/", label: "Painel do Sistema", icone: "dashboard" },
      { href: "/admin/entidades", label: "Entidades", icone: "entidades" },
      { href: "/admin/servidores", label: "Servidores", icone: "servidores" },
    ]
  }
  return [
    { href: "/", label: "Dashboard", icone: "dashboard" },
    { href: "/processos", label: "Processos", icone: "processos" },
    { href: "/documentos", label: "Documentos", icone: "documentos" },
  ]
}

/**
 * Itens da seção "Configurações" da sidebar por perfil.
 *
 * <p>Eram uma entrada só — `/configuracoes`, com cinco abas dentro. Cada aba
 * tratava de um assunto distinto (o timbre que sai no papel, as secretarias que
 * o processo requisita, o plano de contratações, quem entra no sistema), e
 * empilhá-las numa tela obrigava a caçar a aba certa. Agora cada assunto é uma
 * rota, e o menu diz o que existe sem que seja preciso abrir.
 */
export function navSistema(perfil: PerfilAcesso): ItemNav[] {
  if (perfil === "coordenador") {
    return [
      { href: "/configuracoes/timbre", label: "Timbre", icone: "timbre" },
      { href: "/configuracoes/secretarias", label: "Secretarias", icone: "secretarias" },
      { href: "/configuracoes/pca", label: "PCA", icone: "pca" },
      { href: "/configuracoes/usuarios", label: "Usuários", icone: "usuarios" },
    ]
  }
  return []
}
