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
    <div className="max-w-content p-4 sm:p-5 lg:p-7">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <ImportarPca anos={anosPCA} />

        <div className="lg:sticky lg:top-4">
          <InfoBanner tone="info">
            O <strong>Plano de Contratações Anual (PCA)</strong> importado aqui é onde a plataforma
            procura ao montar a seção do <strong>inciso II do ETP</strong> (Art. 18, § 1º, II). A
            busca é por código e por termos do item — determinística, para que quem lê a seção possa
            conferir por que aquele item foi apontado.
          </InfoBanner>
        </div>
      </div>
    </div>
  )
}
