import Image from "next/image"

import govproLogo from "@/public/govpro-logo-white.svg"

import { FaixaDaMarca } from "@/components/shared/marca"
import { CONTEUDO, EMAIL_CONTATO } from "@/lib/landing/conteudo"

/**
 * Rodapé da landing. Texto sobre navy só nos tons que passam de 4,5:1
 * (`on-dark-55` ou mais claro).
 */
export function Rodape() {
  const { rodape } = CONTEUDO
  return (
    <footer className="on-dark border-t border-on-dark-border bg-navy">
      <div className="mx-auto flex max-w-landing flex-col items-center gap-3 px-4 py-10 text-center sm:px-6">
        <FaixaDaMarca className="w-64" />
        <div className="mt-3 flex items-center gap-2 text-md text-on-dark-65">
          {rodape.endosso}
          <Image src={govproLogo} alt="GovPro" width={86} height={20} className="h-5 w-auto" />
        </div>
        <div className="text-sm text-on-dark-55">
          {rodape.contato}{" "}
          <a href={`mailto:${EMAIL_CONTATO}`} className="font-medium text-on-dark-65 no-underline hover:text-electric">
            {EMAIL_CONTATO}
          </a>
        </div>
        <div className="text-sm text-on-dark-55">{rodape.copyright}</div>
      </div>
    </footer>
  )
}
