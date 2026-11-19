import type { Metadata } from "next"

import { Cabecalho } from "@/components/landing/cabecalho"
import { Confianca } from "@/components/landing/confianca"
import { Demonstracao } from "@/components/landing/demonstracao"
import { FluxoGeradocs } from "@/components/landing/fluxo-geradocs"
import { Hero } from "@/components/landing/hero"
import { IaSemTravar } from "@/components/landing/ia-sem-travar"
import { Problema } from "@/components/landing/problema"
import { QuemSomos } from "@/components/landing/quem-somos"
import { Rodape } from "@/components/landing/rodape"

/**
 * Landing da GovPro com o GeraDocs em destaque (§109). Fica fora de `(app)` e de
 * `(auth)`: sem sessão, sem barra lateral, sem chamada à API. Componente de
 * servidor — o HTML é estático e o `metadata` é próprio. `title.absolute` ignora o
 * sufixo "Homologação" do layout raiz, que descreve o aplicativo e não esta página.
 */
export const metadata: Metadata = {
  title: { absolute: "GovPro | GeraDocs — Contratações públicas inteligentes" },
  description:
    "A GovPro apresenta o GeraDocs: plataforma que orienta o servidor e gera, com IA revisável, os documentos da fase preparatória da contratação pública sob a Lei 14.133/21.",
}

export default function PaginaLanding() {
  return (
    <div data-landing>
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-3 focus:font-semibold focus:text-text-1"
      >
        Ir para o conteúdo
      </a>
      <Cabecalho />
      <main id="conteudo" tabIndex={-1} className="outline-none">
        <Hero />
        <Problema />
        <FluxoGeradocs />
        <IaSemTravar />
        <Confianca />
        <QuemSomos />
        <Demonstracao />
      </main>
      <Rodape />
    </div>
  )
}
