"use client"

import { InfoBanner } from "@/components/ui"
import { Th } from "@/components/shared/tabela"
import { INCONGRUENCIA } from "@/lib/api/procurement-client"
import { useConsolidacaoDaDemanda } from "@/lib/api/hooks"

/**
 * A demanda consolidada de vários DFDs: item × secretaria × total.
 *
 * É o que transforma "três secretarias pediram papel A4" em uma linha de compra.
 * Alimenta o painel de quantidades do ETP e a Cotação — e é aqui que as
 * divergências entre os pedidos aparecem antes de virarem edital.
 *
 * As incongruências são **alerta, não bloqueio**: a divergência pode ser
 * legítima (duas secretarias podem mesmo precisar de prazos diferentes), e
 * travar transformaria orientação em obstáculo. O que a plataforma faz é não
 * deixar passar em silêncio.
 */
export function ConsolidacaoDaDemanda({
  processoId,
  dfdAnexado,
}: {
  processoId: string
  /** Nome do arquivo de DFD registrado no processo, quando há um. */
  dfdAnexado?: string | null
}) {
  const consolidacao = useConsolidacaoDaDemanda(processoId)

  if (consolidacao.isPending) {
    return <div className="text-sm text-text-muted">Consolidando a demanda...</div>
  }
  if (consolidacao.isError) {
    return <div className="text-sm text-danger">Não foi possível consolidar a demanda.</div>
  }
  if (consolidacao.data.itens.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-3.5 text-sm text-text-muted">
        {dfdAnexado ? (
          <>
            {/*
              Dizer "nenhum DFD foi anexado" logo abaixo do nome do arquivo
              anexado é desmentir a própria tela. São dois estados diferentes: o
              arquivo está registrado, e os itens dele é que não foram lidos.
            */}
            {/*
              A frase anterior dizia que a plataforma "guarda o arquivo como
              comprovação", o que soa como se o DFD não servisse para mais nada.
              Ele é a base de todo documento do processo — e será a base da
              geração de texto quando houver modelo. O que falta é outra coisa:
              a lista de itens, que é um dado estruturado.
            */}
            O DFD <span className="font-mono">{dfdAnexado}</span> é a base dos documentos
            deste processo e acompanha tudo o que for gerado nele. O que ainda não foi
            informado são os <strong>itens</strong> — quantidade por secretaria —, e é
            deles que sai esta consolidação, o painel de quantidades do ETP e a Cotação.
            Itens não são lidos de um PDF assinado: precisam ser informados abaixo.
          </>
        ) : (
          "Nenhum DFD foi anexado a este processo."
        )}
      </div>
    )
  }

  const secretarias = [
    ...new Set(
      consolidacao.data.itens.flatMap((item) => item.porSecretaria.map((d) => d.secretaria)),
    ),
  ]

  return (
    <div className="flex flex-col gap-4">
      {consolidacao.data.incongruencias.length > 0 && (
        <div className="flex flex-col gap-2.5">
          {consolidacao.data.incongruencias.map((incongruencia, i) => (
            <InfoBanner key={`${incongruencia.item}-${incongruencia.tipo}-${i}`} tone="warning">
              <div className="font-semibold">
                {INCONGRUENCIA[incongruencia.tipo].rotulo} — {incongruencia.item}
              </div>
              <p className="m-0 mt-1">{INCONGRUENCIA[incongruencia.tipo].consequencia}</p>
              <ul className="m-0 mt-1.5 flex list-disc flex-col gap-0.5 pl-4">
                {incongruencia.valores.map((valor) => (
                  <li key={valor.secretaria}>
                    {/* A origem é o que permite perguntar à secretaria certa. */}
                    <strong>{valor.secretaria}</strong>: {valor.valor}
                  </li>
                ))}
              </ul>
            </InfoBanner>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-border bg-ice">
              <Th>Item</Th>
              {secretarias.map((secretaria) => (
                <Th key={secretaria}>{secretaria}</Th>
              ))}
              <Th>Total</Th>
            </tr>
          </thead>
          <tbody>
            {consolidacao.data.itens.map((item, i) => (
              <tr
                key={item.descricao}
                className={i < consolidacao.data.itens.length - 1 ? "border-b border-ice" : ""}
              >
                <td className="px-4 py-3 text-base font-semibold text-text-1">{item.descricao}</td>
                {secretarias.map((secretaria) => {
                  const pedido = item.porSecretaria.find((d) => d.secretaria === secretaria)
                  return (
                    <td key={secretaria} className="px-4 py-3 font-mono text-sm text-text-3">
                      {pedido ? `${pedido.quantidade} ${pedido.unidade}` : "—"}
                    </td>
                  )
                })}
                <td className="px-4 py-3 font-mono text-sm font-semibold text-text-1">
                  {item.somavel ? (
                    `${item.total} ${item.unidade}`
                  ) : (
                    // O total aparece, mas riscado: some-lo deixaria a pessoa
                    // sem ver o que já foi pedido; mostrá-lo como bom faria a
                    // Cotação sair com um número que ninguém pode usar.
                    <span className="text-tint-warning-fg">
                      <span className="line-through">{item.total}</span> — unidades divergentes
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
