"use client"

import type { CSSProperties, ReactNode } from "react"

const buttonSizes = {
  sm: "h-8 px-3.5 text-base",
  md: "h-9 px-4 text-base",
  lg: "h-10 px-5 text-md",
} as const

const buttonVariants = {
  primary: "bg-royal text-surface hover:bg-royal-hover disabled:bg-border disabled:text-text-muted",
  secondary: "bg-surface border border-border text-text-3 hover:bg-ice",
  // O estado desabilitado é o mesmo do `primary`: botão travado que continua
  // com a cor de ação convida o clique que não acontece.
  dark: "bg-navy text-surface disabled:bg-border disabled:text-text-muted",
  success: "bg-success text-surface disabled:bg-border disabled:text-text-muted",
  ghost: "bg-transparent text-royal hover:bg-tint-royal-bg",
  "danger-soft": "bg-tint-danger-bg border-2 border-tint-danger-border-strong text-danger",
} as const

/** Botão de ação — alturas fixas sm 32 · md 36 · lg 40, raio 8, rótulo 13–14/600. */
export function Button({
  variant = "primary",
  size = "md",
  icon,
  children,
  disabled,
  className = "",
  style,
  onClick,
  type = "button",
  title,
  ariaDescribedBy,
}: {
  variant?: keyof typeof buttonVariants
  size?: keyof typeof buttonSizes
  icon?: ReactNode
  children?: ReactNode
  disabled?: boolean
  className?: string
  style?: CSSProperties
  onClick?: () => void
  type?: "button" | "submit"
  title?: string
  /**
   * Id do texto que explica por que o botão está desabilitado.
   *
   * Botão desabilitado por regra de negócio sem isto é um beco: o leitor de tela
   * anuncia "desabilitado" e não diz o que falta fazer. `title` não serve —
   * tooltip não é lida em navegação por teclado.
   */
  ariaDescribedBy?: string
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      title={title}
      aria-describedby={ariaDescribedBy}
      onClick={onClick}
      style={style}
      className={`inline-flex cursor-pointer items-center justify-center gap-1.75 rounded-md font-body font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed ${buttonSizes[size]} ${buttonVariants[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  )
}

const toggleTones = {
  royal: "bg-royal",
  violet: "bg-violet",
} as const

/** Toggle 40×22 com knob branco — única sombra permitida do sistema. */
export function Toggle({
  checked,
  onChange,
  tone = "royal",
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  tone?: keyof typeof toggleTones
  label?: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-5.5 w-10 shrink-0 cursor-pointer rounded-full p-0 transition-colors ${checked ? toggleTones[tone] : "bg-text-faint"}`}
    >
      <span
        className={`absolute top-0.75 size-4 rounded-full bg-surface shadow-knob transition-[left] duration-200 ${checked ? "left-5.25" : "left-0.75"}`}
      />
    </button>
  )
}
