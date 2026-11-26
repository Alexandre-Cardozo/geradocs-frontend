import type { ComponentType } from "react"

import {
  IconBell,
  IconBuilding,
  IconCheckCircle,
  IconClipboardList,
  IconFileText,
  IconLock,
  IconMessageCircle,
  IconScale,
  IconUser,
  IconZap,
} from "@/components/ui/icons"
import type { IconeDoItem } from "@/lib/landing/conteudo"

/** Um ícone por item da copy. O `Record` sobre a união garante que nenhum fique sem ícone. */
export const ICONES: Record<IconeDoItem, ComponentType<{ size?: number; strokeWidth?: number }>> = {
  pessoas: IconUser,
  sociedade: IconBuilding,
  inovacao: IconZap,
  lei: IconScale,
  qualidade: IconCheckCircle,
  parceria: IconMessageCircle,
  auditoria: IconClipboardList,
  lgpd: IconLock,
  acesso: IconLock,
  alerta: IconBell,
  versao: IconFileText,
  protocolo: IconBuilding,
}

/** O ícone num quadrado de 40px, decorativo. */
export function IconeDoItemQuadro({ icone, tom = "claro" }: { icone: IconeDoItem; tom?: "claro" | "escuro" }) {
  const Icone = ICONES[icone]
  return (
    <span
      aria-hidden
      className={`flex size-10 shrink-0 items-center justify-center rounded-md ${
        tom === "escuro" ? "bg-on-dark-electric-chip text-electric" : "bg-tint-royal-bg text-royal"
      }`}
    >
      <Icone size={20} />
    </span>
  )
}
