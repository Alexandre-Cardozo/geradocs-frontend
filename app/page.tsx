import type { Metadata } from "next"

import { Abertura } from "@/components/landing/abertura"
import { AncoraAoAbrir } from "@/components/landing/ancora-ao-abrir"
import { Cabecalho } from "@/components/landing/cabecalho"
import { Compromissos } from "@/components/landing/compromissos"
import { Confianca } from "@/components/landing/confianca"
import { Contato } from "@/components/landing/contato"
import { Desafio } from "@/components/landing/desafio"
import { Geradocs } from "@/components/landing/geradocs"
import { IaResponsavel } from "@/components/landing/ia-responsavel"
import { Metodo } from "@/components/landing/metodo"
import { Modalidades } from "@/components/landing/modalidades"
import { Perfis } from "@/components/landing/perfis"
import { Perguntas } from "@/components/landing/perguntas"
import { PoucosCliques } from "@/components/landing/poucos-cliques"
import { Produtividade } from "@/components/landing/produtividade"
import { QuemSomos } from "@/components/landing/quem-somos"
import { RetornoASecao } from "@/components/landing/retorno-a-secao"
import { Rodape } from "@/components/landing/rodape"
import { Solucoes } from "@/components/landing/solucoes"
import { Valores } from "@/components/landing/valores"
import { VitrineDeDocumentos } from "@/components/landing/vitrine-de-documentos"

/**
 * Página da GovPro com o GeraDocs em foco (§123, §125). Fica fora de `(app)` e
 * de `(auth)`: sem sessão, sem barra lateral, sem chamada à API. Componente de
 * servidor, com `metadata` próprio; `title.absolute` ignora o sufixo
 * "Homologação" do layout raiz, que descreve o aplicativo e não esta página.
 *
 * A ordem conta a história: quem é a GovPro, no que acredita, o portfólio, o
 * problema, o GeraDocs em detalhe e, no fim, os valores, os compromissos e o
 * contato.
 */
export const metadata: Metadata = {
  title: { absolute: "GovPro | Inteligência para a Gestão Pública" },
  description:
    "A GovPro desenvolve tecnologia para a Administração Pública. Conheça o GeraDocs: os documentos da fase preparatória da Lei 14.133/21 em poucos cliques, com IA revisável e o timbre da sua entidade.",
  // Como a página aparece quando o link é compartilhado (WhatsApp, e-mail, redes).
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "GovPro",
    title: "GovPro | Inteligência para a Gestão Pública",
    description:
      "Tecnologia para a Administração Pública. Conheça o GeraDocs: os documentos da fase preparatória da Lei 14.133/21 em poucos cliques.",
  },
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
        <Abertura />
        <QuemSomos />
        <Desafio />
        <Solucoes />
        <Geradocs />
        <PoucosCliques />
        <VitrineDeDocumentos />
        <Modalidades />
        <Produtividade />
        <IaResponsavel />
        <Confianca />
        <Perfis />
        <Valores />
        <Metodo />
        <Compromissos />
        <Perguntas />
        <Contato />
        <AncoraAoAbrir />
        <RetornoASecao />
      </main>
      <Rodape />
    </div>
  )
}
