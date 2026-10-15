"use client"

import { useState } from "react"

import { Button } from "@/components/ui"
import { IconPlus, IconScale } from "@/components/ui/icons"
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { CartaoDeNorma } from "@/components/normas/cartao-de-norma"
import { FormularioDeNorma } from "@/components/normas/formulario-de-norma"
import { useNormas, usePerfil } from "@/lib/api/hooks"
import { DADOS_VAZIOS } from "@/lib/normas/norma"

/**
 * Normas do Órgão: o acervo de regulamentação própria da entidade.
 *
 * <p>A Lei 14.133/21 é a regra geral; o município regulamenta o resto — o
 * decreto do fluxo interno, a portaria que designa o agente de contratação, a
 * instrução que padroniza o ETP. Todo servidor consulta e baixa; só o
 * coordenador cadastra, porque é este acervo que vai dizer à IA o que o órgão
 * regulamentou.
 */
export default function NormasDoOrgao() {
  const perfil = usePerfil()
  const coordenador = perfil === "coordenador"
  const showToast = useToast()
  const { normas, cadastrar } = useNormas()
  const [cadastrando, setCadastrando] = useState(false)

  const vigentes = (normas.data ?? []).filter((n) => n.vigente).length

  return (
    <div className="w-full p-4 sm:p-5 lg:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="m-0 max-w-3xl text-md text-text-3">
            Decretos, portarias e instruções do órgão que regulamentam a Lei nº 14.133/2021.
          </p>
        </div>
        {coordenador && !cadastrando && (
          <Button icon={<IconPlus size={14} strokeWidth={2.5} />} onClick={() => setCadastrando(true)}>
            Cadastrar Norma
          </Button>
        )}
      </div>

      {cadastrando && (
        <div className="mb-5 rounded-card border border-border bg-surface p-5">
          <h2 className="m-0 mb-4 font-display text-lg font-bold text-text-1">Nova Norma</h2>
          <FormularioDeNorma
            modo="cadastro"
            inicial={DADOS_VAZIOS}
            pendente={cadastrar.isPending}
            onEnviar={(dados, arquivo) => {
              if (!arquivo) return
              cadastrar.mutate(
                { dados, arquivo },
                {
                  onSuccess: (norma) => {
                    setCadastrando(false)
                    showToast(
                      norma.arquivo.textoDisponivel
                        ? "Norma cadastrada."
                        : "Norma cadastrada, mas sem texto legível: a IA não vai conseguir lê-la.",
                    )
                  },
                  onError: (erro) =>
                    showToast(erro instanceof Error ? erro.message : "Não foi possível cadastrar a norma."),
                },
              )
            }}
            onCancelar={() => setCadastrando(false)}
          />
        </div>
      )}

      {normas.isPending ? (
        <LoadingState label="Carregando normas..." />
      ) : normas.isError ? (
        <div className="rounded-card border border-border bg-surface">
          <ErrorState message={normas.error?.message} onRetry={() => void normas.refetch()} />
        </div>
      ) : normas.data.length === 0 ? (
        <div className="rounded-card border border-border bg-surface">
          <EmptyState
            icon={<IconScale size={40} strokeWidth={1.5} />}
            message={
              coordenador
                ? "Nenhuma norma cadastrada. Comece pelo decreto que regulamenta a Lei 14.133/21 no município."
                : "Nenhuma norma cadastrada ainda. Quem cadastra é o coordenador do órgão."
            }
          />
        </div>
      ) : (
        <>
          <p className="m-0 mb-3 text-sm text-text-3">
            {normas.data.length} {normas.data.length === 1 ? "norma" : "normas"} · {vigentes}{" "}
            {vigentes === 1 ? "vigente" : "vigentes"}
          </p>
          <div className="flex flex-col gap-3">
            {normas.data.map((norma) => (
              <CartaoDeNorma key={norma.id} norma={norma} coordenador={coordenador} />
            ))}
          </div>
        </>
      )}

    </div>
  )
}
