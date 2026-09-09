"use client"

import { Button, Tag } from "@/components/ui"
import { useAtualizarProcesso, useColetasDoProcesso, useDfdsDoProcesso } from "@/lib/api/hooks"
import { useToast } from "@/components/shared/providers"
import { apurar, chaveDoItem, porItem } from "@/lib/dominio/pesquisa-de-precos"
import { formatBRL, formatNumeroBR, parseValorBR } from "@/lib/format"

/**
 * Os três valores do processo, lado a lado.
 *
 * <p>Eles têm estatutos jurídicos diferentes e a plataforma os tratava como três
 * números soltos:
 *
 * <ul>
 *   <li>a <b>estimativa preliminar</b> de cada item no DFD — exigida pelo
 *       Decreto 10.947/2022, Art. 8º, IV, "por meio de procedimento
 *       simplificado", e que alimenta o PCA;</li>
 *   <li>o <b>valor declarado na abertura</b> do processo, que é a referência de
 *       planejamento e o único disponível antes dos DFDs;</li>
 *   <li>o <b>valor apurado na pesquisa de preços</b>, que é o valor da
 *       contratação do Art. 23 da Lei 14.133/21.</li>
 * </ul>
 *
 * <p>O valor da abertura era digitado e nunca mais conversava com nada. Agora a
 * divergência fica à vista e há como adotar o número que a demanda mostra — sem
 * trocar sozinho, porque quem responde pelo processo é quem decide qual valor
 * ele declara.
 */
export function ConciliacaoDeValores({
  processoId,
  valorDeclarado,
}: {
  processoId: string
  valorDeclarado: number
}) {
  const dfds = useDfdsDoProcesso(processoId)
  const coletas = useColetasDoProcesso(processoId)
  const atualizar = useAtualizarProcesso()
  const showToast = useToast()

  if (dfds.isPending || coletas.isPending) return null

  const itens = (dfds.data ?? []).flatMap((dfd) => dfd.itens)
  if (itens.length === 0) return null

  const pesquisados = porItem(coletas.data ?? [])
  const apuradoDe = (descricao: string) =>
    pesquisados.find((i) => chaveDoItem(i.item) === chaveDoItem(descricao))

  const preliminar = itens.reduce(
    (soma, item) =>
      soma + parseValorBR(item.quantidade) * parseValorBR(item.valorUnitario ?? "0"),
    0,
  )
  const comPesquisa = itens.filter((item) => apuradoDe(item.descricao) != null)
  const apurado = itens.reduce((soma, item) => {
    const pesquisa = apuradoDe(item.descricao)
    return pesquisa == null
      ? soma
      : soma + parseValorBR(item.quantidade) * apurar(pesquisa, "media")
  }, 0)

  /** O valor que a demanda sustenta hoje: o apurado quando a pesquisa cobre tudo. */
  const sugerido = comPesquisa.length === itens.length ? apurado : preliminar
  const divergente = Math.abs(sugerido - valorDeclarado) >= 0.01

  return (
    <div className="mt-4 flex flex-col gap-2 rounded-xl border border-border bg-ice px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <Valor
          rotulo="Declarado na abertura"
          valor={valorDeclarado}
          detalhe="Referência de planejamento"
        />
        <Valor
          rotulo="Estimativa preliminar dos DFDs"
          valor={preliminar}
          detalhe="Decreto 10.947/2022, Art. 8º, IV"
        />
        <Valor
          rotulo="Apurado na pesquisa"
          valor={apurado}
          detalhe={
            comPesquisa.length === 0
              ? "Nenhum item pesquisado"
              : `${comPesquisa.length} de ${itens.length} ${itens.length === 1 ? "item" : "itens"} · Art. 23`
          }
        />
      </div>
      {divergente && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Tag tone="warning">
            O valor declarado difere em {formatBRL(Math.abs(sugerido - valorDeclarado))} do que a
            demanda sustenta
          </Tag>
          <Button
            size="sm"
            variant="secondary"
            disabled={atualizar.isPending}
            onClick={() =>
              atualizar.mutate(
                { id: processoId, valorEstimado: formatNumeroBR(sugerido) },
                {
                  onSuccess: () => showToast("Valor estimado do processo atualizado."),
                  onError: (erro) =>
                    showToast(
                      erro instanceof Error ? erro.message : "Não foi possível atualizar o valor.",
                    ),
                },
              )
            }
          >
            {atualizar.isPending ? "Atualizando..." : `Adotar ${formatBRL(sugerido)}`}
          </Button>
        </div>
      )}
    </div>
  )
}

function Valor({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string
  valor: number
  detalhe: string
}) {
  return (
    <div className="min-w-0">
      <div className="text-2xs font-semibold tracking-caps text-text-muted uppercase">{rotulo}</div>
      <div className="mt-0.5 font-mono text-base font-bold text-petroleum">{formatBRL(valor)}</div>
      <div className="text-xs text-text-3">{detalhe}</div>
    </div>
  )
}
