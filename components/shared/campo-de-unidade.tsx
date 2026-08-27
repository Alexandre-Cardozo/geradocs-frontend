"use client"

import { useState } from "react"

import { Dropdown, Input } from "@/components/ui"
import {
  ehUnidadeCanonica,
  OUTRA_UNIDADE,
  siglaDaUnidade,
  TODAS_AS_UNIDADES,
} from "@/lib/dominio/unidades"

/**
 * A unidade de medida, escolhida da mesma lista em toda a plataforma.
 *
 * <p>Era texto livre no item do DFD e uma lista de quatro opções no painel de
 * quantidades do ETP — duas fontes que não conversavam. O item pedido em "UN"
 * aparecia divergindo do pedido em "Unidade", e a quantidade da secretaria não
 * chegava à seção que a lei manda demonstrar.
 *
 * <p><b>"Outra" existe de propósito.</b> Unidade de contratação municipal tem
 * exceção, e recusá-la transformaria orientação em obstáculo — a plataforma
 * orienta, não trava. O campo livre também aparece sozinho quando o valor
 * gravado não é canônico: há item antigo com "Bloco", e trocá-lo por uma
 * unidade parecida seria reescrever o que a secretaria pediu.
 */
export function CampoDeUnidade({
  value,
  onChange,
  ariaLabel = "Unidade de medida",
}: {
  value: string
  onChange: (unidade: string) => void
  ariaLabel?: string
}) {
  const canonica = value === "" || ehUnidadeCanonica(value)
  const [livre, setLivre] = useState(!canonica)

  const escolhido = livre ? OUTRA_UNIDADE : (siglaDaUnidade(value) ?? "")

  return (
    <div className="flex flex-col gap-2">
      <Dropdown
        value={escolhido}
        ariaLabel={ariaLabel}
        onChange={(escolha) => {
          if (escolha === OUTRA_UNIDADE) {
            setLivre(true)
            onChange("")
            return
          }
          setLivre(false)
          onChange(escolha)
        }}
        options={[
          { value: "", label: "Selecione a unidade..." },
          ...TODAS_AS_UNIDADES.map((u) => ({
            value: u.sigla,
            label: `${u.nome} (${u.sigla})`,
          })),
          { value: OUTRA_UNIDADE, label: "Outra (informar)" },
        ]}
      />
      {livre && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          ariaLabel={`${ariaLabel} — informe qual`}
          placeholder="Ex: BLOCO"
        />
      )}
    </div>
  )
}
