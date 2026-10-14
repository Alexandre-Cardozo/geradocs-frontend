import type { Processo } from "@/lib/types"

/**
 * "2 de 3 obrigatórios": quanto dos documentos que a modalidade exige já foi
 * concluído (ADR-050 do back-end). É o que explica o status — Em Elaboração
 * diz que começou; isto diz quanto falta.
 */
export function ProgressoDosObrigatorios({ processo, barra = false }: { processo: Processo; barra?: boolean }) {
  const obrigatorios = processo.obrigatorios
  if (!obrigatorios || obrigatorios.total === 0) return null
  const percentual = Math.round((obrigatorios.concluidos / obrigatorios.total) * 100)
  return (
    <span className="inline-flex min-w-0 flex-col gap-1">
      <span className="text-xs whitespace-nowrap text-text-3">
        {obrigatorios.concluidos} de {obrigatorios.total} {obrigatorios.total === 1 ? "obrigatório" : "obrigatórios"}
      </span>
      {barra && (
        <span
          role="progressbar"
          aria-label="Documentos obrigatórios concluídos"
          aria-valuenow={percentual}
          aria-valuemin={0}
          aria-valuemax={100}
          className="block h-1 w-24 overflow-hidden rounded-full bg-border-soft"
        >
          <span className="block h-full rounded-full bg-royal" style={{ width: `${percentual}%` }} />
        </span>
      )}
    </span>
  )
}
