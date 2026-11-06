"use client"

import { Tag } from "@/components/ui"
import { PilulasDeEscolha } from "@/components/processos/pilulas-de-escolha"
import { useContextosDaContratacao } from "@/lib/api/hooks"
import type { ContextoDaContratacao } from "@/lib/api/contextos-client"

/**
 * Os contextos da contratação, como um campo da capa (ADR-061 do back-end).
 *
 * Complemento, e não destaque: mostra os declarados em etiquetas, ou "Nenhum
 * informado", como a natureza do objeto. A edição é a da capa inteira ("Editar
 * Dados"): ali o campo vira pílulas, nenhuma marcada de antemão, e o "Salvar"
 * da capa grava tudo junto. O que o contexto acrescenta ao ETP fica na dica da
 * pílula, e não em texto na tela.
 *
 * @param marcados   a escolha em edição; só vale com `editando`
 * @param onAlternar marca ou desmarca um contexto na escolha em edição
 */
export function ContextosDaContratacao({
  processoId,
  editando,
  marcados,
  onAlternar,
}: {
  processoId: string
  editando: boolean
  marcados: string[]
  onAlternar: (codigo: string) => void
}) {
  const contextos = useContextosDaContratacao(processoId)

  const rotulo = (
    <dt className="text-2xs font-semibold tracking-caps text-text-muted uppercase">Contextos da Contratação</dt>
  )

  if (contextos.isPending) {
    return (
      <div className="sm:col-span-2 lg:col-span-4">
        {rotulo}
        <dd className="m-0 mt-0.5 text-sm text-text-muted">Carregando...</dd>
      </div>
    )
  }
  if (contextos.isError) {
    return (
      <div className="sm:col-span-2 lg:col-span-4">
        {rotulo}
        <dd className="m-0 mt-0.5 text-sm text-danger">Não foi possível carregar.</dd>
      </div>
    )
  }

  const lista = contextos.data.contextos

  if (editando) {
    return (
      <div className="sm:col-span-2 lg:col-span-4">
        {rotulo}
        <dd className="m-0 mt-1.5">
          <PilulasDeEscolha
            ariaLabel="Contextos da contratação"
            opcoes={lista.map((contexto) => ({ valor: contexto.codigo, rotulo: contexto.titulo, dica: resumo(contexto) }))}
            marcados={marcados}
            onAlternar={onAlternar}
          />
        </dd>
      </div>
    )
  }

  const confirmados = lista.filter((contexto) => contexto.confirmado)
  return (
    <div className="sm:col-span-2 lg:col-span-4">
      {rotulo}
      <dd className="m-0 mt-0.5 flex flex-wrap items-center gap-1.5 text-base text-text-1">
        {confirmados.length === 0 ? (
          <span className="text-text-faint">Nenhum informado</span>
        ) : (
          confirmados.map((contexto) => (
            <span key={contexto.codigo} title={resumo(contexto)}>
              <Tag tone="info">{contexto.titulo}</Tag>
            </span>
          ))
        )}
      </dd>
    </div>
  )
}

/** A dica da pílula: o que é e o que acrescenta ao ETP. */
function resumo(contexto: ContextoDaContratacao): string {
  return [contexto.descricao, `Acrescenta: ${contexto.topicos.map((topico) => topico.titulo).join("; ")}.`].join(
    "\n",
  )
}
