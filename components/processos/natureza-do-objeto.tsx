"use client"

import { PilulasDeEscolha } from "@/components/processos/pilulas-de-escolha"
import type { TopicoDoContexto } from "@/lib/api/contextos-client"
import { DESCRICAO_DA_NATUREZA, NATUREZA_DO_OBJETO, type NaturezaDoObjeto } from "@/lib/types"

/**
 * A natureza do objeto em pílulas, na mesma forma dos contextos da
 * contratação (ADR-053 e ADR-061 do back-end).
 *
 * Uma só, como rádio, com "Não informada" como opção explícita: nada vem
 * marcado de antemão. A dica diz o que a natureza é, que minuta da AGU ela
 * escolhe e, quando o servidor já disse, os tópicos que ela traz ao ETP.
 */
export function NaturezaDoObjetoEmPilulas({
  valor,
  onChange,
  topicos,
  rotuloVazio = "Não informada",
}: {
  valor: NaturezaDoObjeto | ""
  onChange: (valor: NaturezaDoObjeto | "") => void
  /** Os tópicos que cada natureza traz ao ETP, do catálogo do servidor. */
  topicos?: Partial<Record<NaturezaDoObjeto, TopicoDoContexto[]>>
  rotuloVazio?: string
}) {
  const naturezas = Object.keys(NATUREZA_DO_OBJETO) as NaturezaDoObjeto[]
  return (
    <PilulasDeEscolha
      unica
      ariaLabel="Natureza do Objeto"
      marcados={[valor]}
      onAlternar={(escolhida) => onChange(escolhida as NaturezaDoObjeto | "")}
      opcoes={[
        { valor: "", rotulo: rotuloVazio },
        ...naturezas.map((natureza) => {
          const trazidos = topicos?.[natureza] ?? []
          return {
            valor: natureza,
            rotulo: NATUREZA_DO_OBJETO[natureza],
            dica:
              trazidos.length === 0
                ? DESCRICAO_DA_NATUREZA[natureza]
                : `${DESCRICAO_DA_NATUREZA[natureza]}\nAcrescenta: ${trazidos.map((t) => t.titulo).join("; ")}.`,
          }
        }),
      ]}
    />
  )
}
