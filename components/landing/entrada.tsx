import type { ReactNode } from "react"

/**
 * Entrada escalonada do hero (§121), feita só com CSS: o elemento já nasce com o
 * estado inicial da animação (`both`) e não depende de JavaScript nem de
 * observador — não atrasa o LCP e aparece mesmo se o script falhar.
 * 100ms entre um elemento e o seguinte.
 */
export function Entrada({
  indice,
  className = "",
  children,
}: {
  indice: number
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`animate-landing-entrada ${className}`} style={{ animationDelay: `${indice * 100}ms` }}>
      {children}
    </div>
  )
}
