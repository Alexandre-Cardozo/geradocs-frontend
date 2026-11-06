"use client"

import { useState } from "react"

import { Button } from "@/components/ui"
import { IconPlus } from "@/components/ui/icons"
import { useToast } from "@/components/shared/providers"
import { useEstruturaDoDocumento } from "@/lib/api/hooks"
import type { TopicoExigido } from "@/lib/api/authoring-client"
import type { SecaoDocumento, TipoDocumento } from "@/lib/types"

/**
 * Os subtópicos dos contextos da contratação que o servidor tirou do documento
 * (ADR-061 do back-end), numa linha só, para restaurar.
 *
 * O subtópico do contexto marcado entra sozinho; este bloco só aparece quando
 * alguém exclui um deles, e some quando não há o que restaurar. O tópico volta
 * como subtópico da seção de origem, com fundamento e orientação, e o
 * fundamento fica na dica do botão.
 */
export function TopicosDoContexto({
  processoId,
  tipo,
  topicos,
  secoes,
}: {
  processoId: string
  tipo: TipoDocumento
  topicos: TopicoExigido[]
  /** Para dizer, na dica, em que seção o subtópico volta. */
  secoes: SecaoDocumento[]
}) {
  const { incluirTopico } = useEstruturaDoDocumento(processoId, tipo)
  const showToast = useToast()
  const [escolhendo, setEscolhendo] = useState(false)
  const [incluindoTodos, setIncluindoTodos] = useState(false)

  const pendentes = topicos.filter((topico) => topico.secao === undefined)
  if (pendentes.length === 0) return null

  const pendente = incluirTopico.isPending || incluindoTodos
  const avisar = (erro: unknown) =>
    showToast(erro instanceof Error ? erro.message : "Não foi possível restaurar o subtópico.")
  const destino = (ancora: string) => secoes.find((secao) => secao.id === ancora)?.titulo ?? `Seção ${ancora}`

  const incluirTodos = async () => {
    setIncluindoTodos(true)
    try {
      // Um de cada vez: cada restauração numera o subtópico pela âncora.
      for (const topico of pendentes) {
        await incluirTopico.mutateAsync(topico.codigo)
      }
      setEscolhendo(false)
    } catch (erro) {
      avisar(erro)
    } finally {
      setIncluindoTodos(false)
    }
  }

  return (
    <section
      aria-label="Subtópicos removidos do contexto da contratação"
      className="flex flex-col gap-2 rounded-lg border border-border bg-surface px-3.5 py-2.5"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="min-w-0 flex-1 text-sm text-text-2">
          {pendentes.length === 1
            ? "1 subtópico do contexto da contratação foi removido."
            : `${pendentes.length} subtópicos do contexto da contratação foram removidos.`}
        </span>
        <Button size="sm" variant="ghost" onClick={() => setEscolhendo(!escolhendo)}>
          {escolhendo ? "Fechar" : "Escolher"}
        </Button>
        <Button size="sm" variant="secondary" disabled={pendente} onClick={() => void incluirTodos()}>
          {incluindoTodos ? "Restaurando..." : pendentes.length === 1 ? "Restaurar" : "Restaurar todos"}
        </Button>
      </div>
      {escolhendo && (
        <ul className="m-0 flex list-none flex-wrap gap-1.5 p-0">
          {pendentes.map((topico) => (
            <li key={topico.codigo}>
              <button
                type="button"
                disabled={pendente}
                title={`${topico.fundamentoLegal} · volta em ${destino(topico.ancora)}`}
                onClick={() => incluirTopico.mutate(topico.codigo, { onError: avisar })}
                className="flex cursor-pointer items-center gap-1 rounded-full border border-border bg-ice px-2.5 py-1 text-xs text-text-2 transition-colors hover:bg-border-soft disabled:cursor-default disabled:opacity-60"
              >
                <IconPlus size={11} strokeWidth={2.5} />
                {topico.titulo}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
