import Image from "next/image"

import govproLogo from "@/public/govpro-logo-white.svg"

import { FaixaDaMarca } from "@/components/shared/marca"
import { CONTEUDO, ENDERECO, EMAIL_CONTATO, HREF_CONTATO, PRODUTOS } from "@/lib/landing/conteudo"

const LINK = "inline-flex min-h-8 items-center text-md text-on-dark-65 no-underline hover:text-on-dark"

/**
 * Rodapé da GovPro (§125): marca, assinatura, o portfólio lido de `PRODUTOS`,
 * as seções da página e o contato. Texto sobre navy só nos tons que passam de
 * 4,5:1 (`on-dark-55` ou mais claro).
 */
export function Rodape() {
  const { rodape, navegacao } = CONTEUDO
  return (
    <footer className="on-dark border-t border-on-dark-border bg-navy">
      <div className="mx-auto grid max-w-landing gap-10 px-4 py-14 sm:px-6 lg:px-10 xl:px-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div className="flex flex-col items-start gap-4">
          <Image src={govproLogo} alt="GovPro" width={119} height={30} className="h-8 w-auto" />
          <FaixaDaMarca className="w-40" />
          <p className="m-0 font-marca text-sm font-bold tracking-slogan text-on-dark uppercase">{rodape.slogan}</p>
          <p className="m-0 max-w-xs text-md text-pretty text-on-dark-65">{rodape.texto}</p>
        </div>

        <nav aria-label={rodape.solucoes}>
          <p className="m-0 mb-3 text-sm font-semibold tracking-caps text-on-dark-55 uppercase">{rodape.solucoes}</p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {PRODUTOS.map((produto) => (
              <li key={produto.id}>
                <a href={produto.ancora} className={LINK}>
                  {produto.nome}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label={rodape.institucional}>
          <p className="m-0 mb-3 text-sm font-semibold tracking-caps text-on-dark-55 uppercase">{rodape.institucional}</p>
          <ul className="m-0 flex list-none flex-col gap-1 p-0">
            {navegacao.map((item) => (
              <li key={item.id}>
                <a href={`#${item.id}`} className={LINK}>
                  {item.rotulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div>
          <p className="m-0 mb-3 text-sm font-semibold tracking-caps text-on-dark-55 uppercase">{rodape.contato}</p>
          <a href={HREF_CONTATO} className={`${LINK} font-medium text-on-dark`}>
            {EMAIL_CONTATO}
          </a>
          <address className="mt-2 text-md text-pretty text-on-dark-65 not-italic">{ENDERECO}</address>
        </div>
      </div>
      <div className="border-t border-on-dark-border">
        <p className="mx-auto my-0 max-w-landing px-4 py-5 text-sm text-on-dark-55 sm:px-6 lg:px-10 xl:px-14">{rodape.copyright}</p>
      </div>
    </footer>
  )
}
