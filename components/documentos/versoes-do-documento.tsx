"use client"

import { useState } from "react"

import { PreviaDoDocumento } from "@/components/documentos/previa-do-documento"
import { Button } from "@/components/ui"
import { useVersoesComTexto } from "@/lib/api/hooks"
import { formatDataHora } from "@/lib/format"
import type { TipoDocumento } from "@/lib/types"

/**
 * O histórico com o texto de cada versão.
 *
 * Versionar o metadado do arquivo respondia "quantas vezes isto foi gerado".
 * Versionar o texto responde "o que mudou" — que é a pergunta que a auditoria
 * faz e que a errata precisa responder.
 *
 * O hash aparece porque é ele que transforma a versão de cópia guardada em
 * prova: sem ele, atestar que o texto não foi alterado depende de confiar em
 * quem administra o banco.
 */
export function VersoesDoDocumento({
  processoId,
  tipo,
}: {
  processoId: string
  tipo: TipoDocumento
}) {
  const versoes = useVersoesComTexto(processoId, tipo)
  const [aberta, setAberta] = useState<number | null>(null)

  if (versoes.isPending) {
    return <div className="text-sm text-text-muted">Carregando o histórico...</div>
  }
  if (versoes.isError) {
    return <div className="text-sm text-danger">Não foi possível carregar o histórico.</div>
  }
  if (versoes.data.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-3.5 text-sm text-text-muted">
        Este documento ainda não foi gerado — não há versão para mostrar.
      </div>
    )
  }

  return (
    <ol className="m-0 flex list-none flex-col gap-2.5 p-0">
      {versoes.data.map((versao) => (
        <li key={versao.versao} className="rounded-xl border border-border bg-surface p-3.5">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-mono text-xs font-semibold text-royal">v{versao.versao}</span>
            <span className="text-sm text-text-2">{versao.nota}</span>
            <span className="text-xs text-text-muted">{formatDataHora(versao.geradoEm)}</span>
          </div>
          <div className="mt-1 font-mono text-2xs break-all text-text-muted">
            SHA-256 {versao.hash}
          </div>
          <div className="mt-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAberta(aberta === versao.versao ? null : versao.versao)}
            >
              {aberta === versao.versao ? "Ocultar o texto" : "Ver o texto desta versão"}
            </Button>
          </div>
          {aberta === versao.versao && (
            <div className="mt-2.5">
              <PreviaDoDocumento blocos={versao.corpo} titulo={`Texto da v${versao.versao}`} />
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}
