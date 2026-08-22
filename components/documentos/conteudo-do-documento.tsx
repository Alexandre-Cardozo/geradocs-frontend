"use client"

import { PreviaDoDocumento } from "@/components/documentos/previa-do-documento"
import { useCorpoDocumento } from "@/lib/api/hooks"
import type { TipoDocumento } from "@/lib/types"

/**
 * O conteúdo congelado de um documento já gerado.
 *
 * Componente próprio porque o hook precisa do par processo × tipo, e hooks não
 * podem ser chamados dentro do laço da listagem.
 */
export function ConteudoDoDocumento({
  processoId,
  tipo,
}: {
  processoId: string
  tipo: TipoDocumento
}) {
  const corpo = useCorpoDocumento(processoId, tipo)

  if (corpo.isPending) {
    return <div className="text-sm text-text-muted">Carregando o conteúdo...</div>
  }
  if (corpo.isError) {
    return <div className="text-sm text-danger">Não foi possível carregar o conteúdo.</div>
  }
  return <PreviaDoDocumento blocos={corpo.data} titulo="Conteúdo gerado" />
}
