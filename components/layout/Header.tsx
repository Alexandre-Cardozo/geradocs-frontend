"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import { SearchInput, StatusBadge } from "@/components/ui"
import { IconBell, IconMenu, IconPlus } from "@/components/ui/icons"
import { usePerfil, useProcessos } from "@/lib/api/hooks"

/** Título do header por rota (equivalente ao viewTitles do protótipo). */
function tituloDaRota(pathname: string): string {
  if (pathname === "/") return "Dashboard"
  if (pathname === "/processos") return "Processos de Contratação"
  if (pathname === "/processos/novo") return "Novo Processo"
  if (pathname === "/processos/dfd") return "Verificação do DFD pela IA"
  if (pathname === "/processos/etp") return "Estudo Técnico Preliminar"
  if (pathname === "/processos/documento") return "Editor de Documento"
  if (pathname === "/processos/detalhe") return "Progresso do Processo"
  if (pathname.startsWith("/aprovacoes")) return "Aprovações"
  if (pathname.startsWith("/documentos")) return "Documentos Gerados"
  if (pathname.startsWith("/configuracoes/timbre")) return "Timbre dos Documentos"
  if (pathname.startsWith("/configuracoes/secretarias")) return "Secretarias do Órgão"
  if (pathname.startsWith("/configuracoes/pca")) return "PCA — Plano de Contratações"
  if (pathname.startsWith("/configuracoes/usuarios")) return "Usuários e Permissões"
  if (pathname.startsWith("/configuracoes")) return "Configurações da Entidade"
  if (pathname.startsWith("/admin/entidades")) return "Entidades"
  if (pathname.startsWith("/admin/servidores")) return "Servidores"
  if (pathname.startsWith("/perfil")) return "Meu Perfil"
  return "GeraDocs"
}

/**
 * Busca global — autocomplete de processos por objeto ou número. Selecionar um
 * resultado abre o processo; Enter abre a lista filtrada em /processos.
 */
function BuscaGlobal() {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [aberto, setAberto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const termo = q.trim()
  const { data } = useProcessos({ busca: termo, porPagina: 6 })
  const resultados = termo ? (data?.itens ?? []) : []

  useEffect(() => {
    if (!aberto) return
    const aoClicarFora = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener("pointerdown", aoClicarFora)
    return () => document.removeEventListener("pointerdown", aoClicarFora)
  }, [aberto])

  const irPara = (id: string) => {
    setAberto(false)
    setQ("")
    router.push(`/processos/detalhe?id=${encodeURIComponent(id)}`)
  }

  return (
    <div ref={ref} className="relative">
      <SearchInput
        placeholder="Buscar processo por objeto ou número..."
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setAberto(true)
        }}
        onFocus={() => setAberto(true)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && termo) {
            setAberto(false)
            router.push("/processos")
          } else if (e.key === "Escape") {
            setAberto(false)
          }
        }}
        kbd="⌘K"
      />

      {aberto && termo !== "" && (
        <div className="absolute right-0 z-50 mt-1 w-80 overflow-hidden rounded-md border border-border bg-surface py-1 shadow-md">
          {resultados.length > 0 ? (
            resultados.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => irPara(p.id)}
                className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left transition-colors hover:bg-ice"
              >
                <span className="min-w-0">
                  <span className="block truncate text-base font-medium text-text-1">{p.objeto}</span>
                  <span className="block font-mono text-xs text-text-muted">{p.id}</span>
                </span>
                <StatusBadge status={p.status} size="sm" />
              </button>
            ))
          ) : (
            <div className="px-3 py-3 text-center text-sm text-text-muted">Nenhum processo encontrado</div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const pathname = usePathname()
  const perfil = usePerfil()
  // O admin geral não opera o fluxo de processos: sem busca de processos nem CTA.
  const mostraProcessos = perfil !== "admin_geral"

  return (
    <header className="flex h-15 min-w-0 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 lg:px-7">
      {/* Hambúrguer — abre o drawer da sidebar abaixo de 1024px */}
      <button
        type="button"
        aria-label="Abrir menu de navegação"
        onClick={onMenuClick}
        className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-ice text-text-3 lg:hidden"
      >
        <IconMenu size={18} />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="m-0 truncate font-display text-xl font-bold tracking-heading text-text-1">
          {tituloDaRota(pathname)}
        </h1>
      </div>

      {/* Busca global de processos — oculta em telas estreitas e para o admin */}
      {mostraProcessos && (
        <div className="hidden md:block">
          <BuscaGlobal />
        </div>
      )}

      <button
        type="button"
        aria-label="Notificações"
        className="relative flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-md border border-border bg-ice text-text-3"
      >
        <IconBell size={16} />
        <span className="absolute top-1.75 right-1.75 size-1.75 rounded-full border-2 border-ice bg-danger" />
      </button>

      {/* Ação global — só para quem opera o fluxo de processos */}
      {mostraProcessos && (
        <Link
          href="/processos/novo"
          aria-label="Novo Processo de Contratação"
          className="flex h-9 shrink-0 items-center gap-1.75 rounded-md bg-royal px-3 text-base font-semibold text-surface no-underline transition-colors hover:bg-royal-hover"
        >
          <IconPlus size={14} strokeWidth={2.5} />
          <span className="hidden sm:inline">Novo Processo</span>
        </Link>
      )}
    </header>
  )
}
