"use client"

import { useState } from "react"

import { Button } from "@/components/ui"
import { IconClipboard, IconPlus } from "@/components/ui/icons"
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { CartaoDeModelo } from "@/components/modelos/cartao-de-modelo"
import { EditorDeModelo } from "@/components/modelos/editor-de-modelo"
import { useModelosDoOrgao, usePerfil } from "@/lib/api/hooks"
import type { ModeloDoOrgao } from "@/lib/api/modelos-client"

/**
 * Modelos do Órgão (§88; ADR-056 do back-end): a minuta da AGU com o texto que
 * o órgão adotou e a justificativa do Art. 19, § 2º, escrita uma vez.
 *
 * <p>Todo servidor consulta; só o coordenador publica, cria versão e desativa.
 * O modelo ativo aparece na escolha da minuta, ao lado das da AGU.
 */
export default function ModelosDoOrgao() {
  const coordenador = usePerfil() === "coordenador"
  const showToast = useToast()
  const { modelos, publicar, publicarVersao, desativar } = useModelosDoOrgao()
  const [editando, setEditando] = useState<"novo" | ModeloDoOrgao | null>(null)

  const aoFalhar = (erro: unknown) =>
    showToast(erro instanceof Error ? erro.message : "Não foi possível publicar o modelo.")

  return (
    <div className="w-full p-4 sm:p-5 lg:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <p className="m-0 min-w-0 max-w-3xl flex-1 text-md text-text-3">
          Minutas da AGU com o texto-padrão do órgão.
        </p>
        {coordenador && editando == null && (
          <Button icon={<IconPlus size={14} strokeWidth={2.5} />} onClick={() => setEditando("novo")}>
            Novo Modelo
          </Button>
        )}
      </div>

      {editando != null && modelos.data && (
        <div className="mb-5 rounded-card border border-border bg-surface p-5">
          <h2 className="m-0 mb-4 font-display text-lg font-bold text-text-1">
            {editando === "novo" ? "Novo Modelo" : `Nova Versão · ${editando.titulo}`}
          </h2>
          <EditorDeModelo
            minutas={modelos.data.agu}
            {...(editando === "novo" ? {} : { modelo: editando })}
            pendente={publicar.isPending || publicarVersao.isPending}
            onPublicar={(base, dados) =>
              editando === "novo"
                ? publicar.mutate(
                    { base, dados },
                    {
                      onSuccess: () => {
                        setEditando(null)
                        showToast("Modelo publicado.")
                      },
                      onError: aoFalhar,
                    },
                  )
                : publicarVersao.mutate(
                    { codigo: base, dados },
                    {
                      onSuccess: () => {
                        setEditando(null)
                        showToast("Nova versão publicada.")
                      },
                      onError: aoFalhar,
                    },
                  )
            }
            onCancelar={() => setEditando(null)}
          />
        </div>
      )}

      {modelos.isPending ? (
        <LoadingState label="Carregando modelos..." />
      ) : modelos.isError ? (
        <div className="rounded-card border border-border bg-surface">
          <ErrorState message={modelos.error?.message} onRetry={() => void modelos.refetch()} />
        </div>
      ) : modelos.data.doOrgao.length === 0 ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<IconClipboard size={40} strokeWidth={1.5} />}
            message={
              coordenador
                ? "Nenhum modelo do órgão. Os documentos seguem as minutas da AGU."
                : "Nenhum modelo do órgão. Quem publica é o coordenador."
            }
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {modelos.data.doOrgao.map((modelo) => (
            <CartaoDeModelo
              key={modelo.codigo}
              modelo={modelo}
              base={modelos.data.agu.find((minuta) => minuta.codigo === modelo.codigoDaBase)}
              coordenador={coordenador}
              desativando={desativar.isPending}
              onNovaVersao={() => setEditando(modelo)}
              onDesativar={() =>
                desativar.mutate(modelo.codigo, {
                  onSuccess: () => showToast("Modelo desativado."),
                  onError: (erro) =>
                    showToast(erro instanceof Error ? erro.message : "Não foi possível desativar o modelo."),
                })
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}
