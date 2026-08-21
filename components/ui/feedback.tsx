import type { ComponentType, ReactNode } from "react"

import { IconInfo, type IconProps } from "@/components/ui/icons"
import { STATUS_PROCESSO_LABEL, type StatusDocumento, type StatusProcesso } from "@/lib/types"

/**
 * Estilo do badge por status. **O rótulo não mora aqui**: vem de
 * `STATUS_PROCESSO_LABEL`, que é o vocabulário normativo. Manter uma cópia local
 * faria o badge continuar exibindo status que o domínio deixou de ter.
 */
const statusCfg: Record<StatusProcesso, { pill: string; dot: string }> = {
  rascunho: { pill: "bg-status-draft-bg text-status-draft-fg", dot: "bg-status-draft-dot" },
  em_elaboracao: { pill: "bg-status-review-bg text-status-review-fg", dot: "bg-status-review-dot" },
  concluido: { pill: "bg-status-done-bg text-status-done-fg", dot: "bg-status-done-dot" },
}

export function StatusBadge({ status, size = "md" }: { status: StatusProcesso; size?: "sm" | "md" }) {
  const c = statusCfg[status]
  return (
    <span
      className={`inline-flex items-center gap-1.25 rounded-full font-semibold tracking-badge whitespace-nowrap ${c.pill} ${
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-0.75 text-sm"
      }`}
    >
      <span className={`size-1.25 shrink-0 rounded-full ${c.dot}`} />
      {STATUS_PROCESSO_LABEL[status]}
    </span>
  )
}

/** Pill quadrada para estados de documento (colunas ETP/TR) — vocabulário fixo. */
const docCfg: Record<StatusDocumento, string> = {
  "Completo": "bg-tint-success-bg text-tint-success-fg",
  "Em andamento": "bg-tint-royal-bg text-royal-hover",
  "Em revisão": "bg-tint-warning-chip-bg text-tint-warning-fg",
  "Rejeitado": "bg-tint-danger-bg text-tint-danger-fg",
  "Não iniciado": "bg-border-soft text-slate-strong",
}

export function DocPill({ status, classes }: { status: string; classes?: string }) {
  const cor = classes ?? docCfg[status as StatusDocumento] ?? docCfg["Não iniciado"]
  return (
    <span className={`inline-block rounded-sm px-2 py-0.5 text-xs font-semibold whitespace-nowrap ${cor}`}>
      {status}
    </span>
  )
}

/** Micro tag: Obrigatório / Opcional / Recomendado / Urgente etc. */
const tagTones = {
  info: "bg-tint-royal-bg text-royal-hover",
  success: "bg-tint-success-bg text-tint-success-fg",
  warning: "bg-tint-warning-chip-bg text-tint-warning-fg",
  danger: "bg-tint-danger-bg text-tint-danger-fg",
  violet: "bg-tint-violet-bg text-tint-violet-fg",
  neutral: "bg-border-soft text-slate-strong",
} as const

export function Tag({ children, tone = "info" }: { children: ReactNode; tone?: keyof typeof tagTones }) {
  return (
    <span className={`inline-block rounded-sm px-1.75 py-0.5 text-2xs font-bold whitespace-nowrap ${tagTones[tone]}`}>
      {children}
    </span>
  )
}

/**
 * Paleta dos StatCards — o DS controla o tint do card e a cor/tamanho da marca
 * d'água. O chamador passa só `tone` + o ícone (como componente), então os cards
 * nunca divergem entre telas.
 */
const STAT_TONES = {
  royal: { bg: "bg-tint-royal-bg", icon: "text-royal/15" },
  warning: { bg: "bg-tint-warning-bg", icon: "text-warning-strong/15" },
  teal: { bg: "bg-doc-tr-bg", icon: "text-teal/15" },
  success: { bg: "bg-status-done-bg", icon: "text-green/15" },
  slate: { bg: "bg-ice", icon: "text-slate/15" },
} as const

export type StatTone = keyof typeof STAT_TONES

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "royal",
}: {
  label: string
  value: string
  /** Componente do ícone (não a instância) — o card define o tamanho da marca d'água. */
  icon: ComponentType<IconProps>
  tone?: StatTone
}) {
  const t = STAT_TONES[tone]
  return (
    <div className={`relative flex min-h-31 flex-col overflow-hidden rounded-card border border-border p-5 ${t.bg}`}>
      {/* Ícone de fundo (marca d'água), parcialmente recortado no canto inferior direito */}
      <span className={`pointer-events-none absolute -right-4 -bottom-5 ${t.icon}`} aria-hidden>
        <Icon size={130} strokeWidth={1.5} />
      </span>
      <div className="relative text-base font-medium text-text-3">{label}</div>
      <div className="relative mt-auto pt-4 font-display text-stat leading-none font-extrabold tracking-stat text-text-1">
        {value}
      </div>
    </div>
  )
}

/** Barra de progresso com preenchimento gradiente (uso canônico). */
export function ProgressBar({
  percent,
  label,
  sub,
  barClasses = "h-1.5",
  transition = "width 0.5s",
}: {
  percent: number
  label?: string
  sub?: string
  /** Altura da trilha (ex.: "h-2" para a análise do DFD). */
  barClasses?: string
  transition?: string
}) {
  return (
    <div>
      {label != null && (
        <div className="mb-1.5 flex justify-between">
          <span className="text-sm font-semibold text-text-2">{label}</span>
          <span className="text-sm font-bold text-royal">{Math.round(percent)}%</span>
        </div>
      )}
      <div className={`overflow-hidden rounded-full bg-border-soft ${barClasses}`}>
        <div className="h-full rounded-full gradient-progress" style={{ width: `${percent}%`, transition }} />
      </div>
      {sub && <div className="mt-1.25 text-xs text-text-muted">{sub}</div>}
    </div>
  )
}

/** Mensagem de validação inline sob campos. */
const validationCfg = {
  ok: { classes: "bg-tint-success-bg text-tint-success-fg", icon: "✓" },
  warn: { classes: "bg-tint-warning-bg text-tint-warning-fg", icon: "!" },
  error: { classes: "bg-tint-danger-bg text-tint-danger-fg", icon: "✕" },
} as const

export function ValidationMsg({ type = "ok", msg }: { type?: "ok" | "warn" | "error"; msg: string }) {
  const c = validationCfg[type]
  return (
    <div className={`mt-2.5 flex items-center gap-2 rounded-[7px] px-3 py-2 ${c.classes}`}>
      <span className="text-base font-bold">{c.icon}</span>
      <span className="text-sm font-medium">{msg}</span>
    </div>
  )
}

/** Banner informativo com borda (azul/âmbar/vermelho/verde). */
const bannerTones = {
  info: "bg-tint-royal-bg border-tint-royal-border text-royal-hover",
  warning: "bg-tint-warning-bg border-tint-warning-border text-tint-warning-fg",
  danger: "bg-tint-danger-bg border-tint-danger-border text-tint-danger-fg",
  success: "bg-tint-success-bg border-tint-success-border text-tint-success-fg",
} as const

export function InfoBanner({
  tone = "info",
  children,
  icon,
  className = "",
}: {
  tone?: keyof typeof bannerTones
  children: ReactNode
  icon?: ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-3 ${bannerTones[tone]} ${className}`}>
      <span className="mt-px flex shrink-0">{icon ?? <IconInfo size={16} />}</span>
      <div className="text-base leading-normal">{children}</div>
    </div>
  )
}
