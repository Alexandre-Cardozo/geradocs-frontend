import Link from "next/link"
import type { ReactNode } from "react"

/**
 * Link com a aparência de botão. O `Button` do DS é um `<button>` com `onClick`,
 * e a landing precisa de âncoras de verdade: o pedido de demonstração é um
 * `mailto:` e "Acessar" é uma navegação. Os alvos têm 44px (md) e 48px (lg).
 */
const TAMANHOS = {
  md: "h-11 px-5",
  lg: "h-12 px-6",
} as const

const VARIANTES = {
  primario: "bg-royal text-surface hover:bg-royal-hover",
  "secundario-escuro": "border border-on-dark-20 text-on-dark hover:bg-on-dark-fill-hover",
  "secundario-claro": "border border-border bg-surface text-text-1 hover:bg-ice",
} as const

export function BotaoLink({
  href,
  variante = "primario",
  tamanho = "md",
  className = "",
  children,
}: {
  href: string
  variante?: keyof typeof VARIANTES
  tamanho?: keyof typeof TAMANHOS
  className?: string
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center justify-center gap-2 rounded-md font-body text-landing-body font-semibold whitespace-nowrap no-underline transition-[background-color,transform] duration-150 ease-out active:scale-96 ${TAMANHOS[tamanho]} ${VARIANTES[variante]} ${className}`}
    >
      {children}
    </Link>
  )
}
