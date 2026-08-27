"use client"

import { InfoBanner } from "@/components/ui"
import { ImportarPca } from "@/components/configuracoes/importar-pca"
import { anoBrasilia } from "@/lib/format"

/** Opções de ano do PCA: últimos 3 anos + o ano vigente (Brasília). */
const anoAtual = anoBrasilia()
const anosPCA = Array.from({ length: 4 }, (_, i) => {
  const ano = String(anoAtual - 3 + i)
  return { value: ano, label: ano }
})

/** O Plano de Contratações Anual do órgão: anexar, indexar e conferir. */
export default function Pca() {
  return (
    /*
      Uma coluna só. A explicação do inciso II ocupava uma faixa de 360px em toda
      a altura da página para dizer quatro linhas que se leem uma vez — e era
      justamente a lista de planos, que cresce a cada exercício, que ficava
      espremida. Ela virou rodapé: continua acessível, e sem tomar a largura de
      quem trabalha aqui todo dia.
    */
    <div className="w-full p-4 sm:p-5 lg:p-7">
      <div className="flex flex-col gap-5">
        <ImportarPca anos={anosPCA} />

        <InfoBanner tone="info">
          O PCA importado aqui é onde a plataforma procura ao montar a seção do{" "}
          <strong>inciso II do ETP</strong> (Art. 18, § 1º, II). A busca é por código e por termos
          do item — determinística, para que quem lê a seção possa conferir por que aquele item foi
          apontado.
        </InfoBanner>
      </div>
    </div>
  )
}
