"use client"

import { IconClock } from "@/components/ui/icons"
import { useTrilhaDoProcesso } from "@/lib/api/hooks"
import { formatDataHora } from "@/lib/format"
import { EVENTO_LABEL } from "@/lib/processos/fluxo"

/**
 * O que aconteceu com o processo, na ordem em que aconteceu.
 *
 * <p>Vem do servidor (ADR-024). Até o 12.1 a trilha era um campo de fixture que
 * nenhuma tela mostrava, e o que a interface registrava — troca de modalidade,
 * encerramento — vivia na memória da aba: sumia ao recarregar.
 *
 * <p>Mostra <b>só o que foi registrado</b>. Geração de documento e retificação
 * ainda não são auditadas no servidor e por isso não aparecem: exibi-las a
 * partir do que esta aba viu acontecer é o que fazia a trilha parecer registro
 * sem ser.
 */
export function TrilhaDoProcesso({ processoId }: { processoId: string }) {
  const trilha = useTrilhaDoProcesso(processoId)

  if (trilha.isPending) {
    return <div className="text-sm text-text-muted">Carregando a trilha...</div>
  }
  if (trilha.isError) {
    return <div className="text-sm text-danger">Não foi possível carregar a trilha.</div>
  }
  if (trilha.data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-3.5 text-sm text-text-muted">
        Nenhum evento registrado para este processo.
      </div>
    )
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-0 p-0">
      {trilha.data.map((evento, i) => (
        <li key={`${evento.data}-${evento.evento}-${i}`} className="flex gap-3">
          {/* Marcador e linha: a linha para no último, senão apontaria para o nada. */}
          <div className="flex flex-col items-center">
            <span className="mt-1.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-tint-royal-bg text-royal">
              <IconClock size={13} />
            </span>
            {i < trilha.data.length - 1 && <span className="w-px flex-1 bg-border" />}
          </div>
          <div className="min-w-0 flex-1 pb-4">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <span className="text-base font-semibold text-text-1">
                {EVENTO_LABEL[evento.evento]}
              </span>
              <span className="font-mono text-xs text-text-muted">
                {formatDataHora(evento.data)}
              </span>
            </div>
            <div className="mt-0.5 text-sm text-text-3">
              {evento.autor ?? (
                // Eventos anteriores à gravação do nome. Atribuir a ação a
                // alguém para não deixar o campo vazio seria inventar quem agiu.
                <span className="text-text-faint">Autor não registrado</span>
              )}
            </div>
            {evento.comentario && (
              <p className="m-0 mt-1.5 border-l-2 border-border-soft pl-2.5 text-sm break-words text-text-2">
                {evento.comentario}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
