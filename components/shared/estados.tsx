"use client"

import type { ReactNode } from "react"

import { Button } from "@/components/ui"
import { IconSearch, IconXCircle } from "@/components/ui/icons"

import { MarcaCarregando } from "./marca-carregando"

/** Estados compartilhados de carregamento / erro / vazio das telas. */

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center p-15 text-center text-text-muted" role="status">
      <span className="mb-3 inline-flex">
        <MarcaCarregando tamanho={36} />
      </span>
      <p className="m-0 text-base font-medium">{label}</p>
    </div>
  )
}

/** Skeleton flat de linhas (listas/tabelas). */
export function SkeletonRows({ rows = 5, height = 44 }: { rows?: number; height?: number }) {
  return (
    <div className="flex flex-col gap-2.5 p-5" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          className="rounded-md bg-border-soft"
          style={{ height, opacity: 1 - i * 0.12 }}
        />
      ))}
    </div>
  )
}

/** Feedback inline de operação em andamento (ex.: geração/análise pela IA). */
export function InlineSpinner({ label }: { label: string }) {
  return (
    <div role="status" className="flex items-center gap-2.5 rounded-md bg-tint-royal-bg px-4 py-3">
      <span className="inline-block size-4 shrink-0 animate-spin rounded-full border-2 border-tint-royal-border border-t-royal" />
      <span className="text-base text-royal-hover">{label}</span>
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="p-15 text-center text-text-muted">
      <span className="mb-3 inline-flex text-danger">
        <IconXCircle size={36} strokeWidth={1.5} />
      </span>
      <p className="m-0 text-md font-semibold text-text-1">Não foi possível carregar os dados</p>
      <p className="mt-1 mb-0 text-base">{message ?? "Verifique sua conexão e tente novamente."}</p>
      {onRetry && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" onClick={onRetry}>
            Tentar Novamente
          </Button>
        </div>
      )}
    </div>
  )
}

export function EmptyState({ message, icon, children }: { message: string; icon?: ReactNode; children?: ReactNode }) {
  return (
    <div className="p-15 text-center text-text-muted">
      <span className="mb-3 inline-flex">{icon ?? <IconSearch size={40} strokeWidth={1.5} />}</span>
      <p className="m-0 text-md font-medium">{message}</p>
      {children && <div className="mt-4">{children}</div>}
    </div>
  )
}
