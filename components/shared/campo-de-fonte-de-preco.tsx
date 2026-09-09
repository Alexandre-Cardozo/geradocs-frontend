"use client"

import { useState } from "react"

import { Dropdown, Input } from "@/components/ui"
import {
  ehFonteCanonica,
  FONTES_DE_PRECO,
  OUTRA_FONTE,
} from "@/lib/dominio/fontes-de-preco"

/**
 * A fonte de pesquisa de preços, escolhida entre os parâmetros da lei.
 *
 * <p>São os cinco do Art. 23, § 1º, da Lei 14.133/21, na ordem de preferência
 * da IN SEGES/ME nº 65/2021 — os dois primeiros prioritários, a pesquisa direta
 * com fornecedores por último, porque a IN manda evitar que ela seja a única
 * fonte. O fundamento de cada uma aparece junto: parafrasear artigo de lei em
 * documento de contratação é defeito, não estilo.
 *
 * <p><b>"Outra" existe de propósito.</b> Contratação municipal tem exceção —
 * cotação de consórcio, tabela estadual —, e recusá-la transformaria orientação
 * em obstáculo. O que a plataforma não faz é inventar o artigo dela.
 */
export function CampoDeFonteDePreco({
  value,
  onChange,
  ariaLabel = "Fonte de pesquisa de preços",
}: {
  value: string
  onChange: (fonte: string) => void
  ariaLabel?: string
}) {
  const canonica = value === "" || ehFonteCanonica(value)
  const [livre, setLivre] = useState(!canonica)

  return (
    <div className="flex flex-col gap-2">
      <Dropdown
        value={livre ? OUTRA_FONTE : value}
        ariaLabel={ariaLabel}
        onChange={(escolha) => {
          if (escolha === OUTRA_FONTE) {
            setLivre(true)
            onChange("")
            return
          }
          setLivre(false)
          onChange(escolha)
        }}
        options={[
          { value: "", label: "Selecione a fonte..." },
          ...FONTES_DE_PRECO.map((fonte) => ({
            value: fonte.rotulo,
            label: `${fonte.rotulo} — ${fonte.fundamento}`,
          })),
          { value: OUTRA_FONTE, label: "Outra (informar)" },
        ]}
      />
      {livre && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          ariaLabel={`${ariaLabel} — informe qual`}
          placeholder="Ex: cotação obtida junto ao consórcio intermunicipal"
        />
      )}
    </div>
  )
}
