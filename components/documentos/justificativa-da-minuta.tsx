"use client"

import { useState } from "react"

import { Button, FormField, InfoBanner, Tag, Textarea } from "@/components/ui"
import { useToast } from "@/components/shared/providers"
import { useJustificarDesvio, useJustificarModelo } from "@/lib/api/hooks"
import type { SecaoDocumento, TipoDocumento } from "@/lib/types"

const FUNDAMENTO = "Art. 19, § 2º, Lei 14.133/21"

/**
 * Campo de justificativa, com Salvar: o texto salvo aparece no lugar do campo
 * até a pessoa pedir para editar.
 */
function CampoDeJustificativa({
  rotulo,
  salvo,
  pendente,
  onSalvar,
}: {
  rotulo: string
  salvo?: string
  pendente: boolean
  onSalvar: (texto: string, aoSalvar: () => void) => void
}) {
  const [editando, setEditando] = useState(!salvo)
  const [texto, setTexto] = useState(salvo ?? "")

  if (salvo && !editando) {
    return (
      <div className="flex flex-col gap-1.5 text-sm">
        <span className="font-semibold text-text-2">{rotulo}</span>
        <span className="whitespace-pre-line text-text-3">{salvo}</span>
        <span>
          <Button size="sm" variant="ghost" onClick={() => setEditando(true)}>
            Editar Justificativa
          </Button>
        </span>
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-2">
      <FormField label={rotulo}>
        <Textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={3} />
      </FormField>
      <span className="flex gap-2">
        <Button size="sm" onClick={() => !pendente && onSalvar(texto, () => setEditando(texto.trim() === ""))}>
          {pendente ? "Salvando..." : "Salvar Justificativa"}
        </Button>
        {salvo && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setTexto(salvo)
              setEditando(false)
            }}
          >
            Cancelar
          </Button>
        )}
      </span>
    </div>
  )
}

/**
 * A seção que deixa de fora cláusulas da minuta pede a justificativa da
 * alteração (§88; ADR-055 do back-end). Orienta, não trava: o documento se
 * conclui sem ela.
 */
export function JustificativaDoDesvio({
  processoId,
  tipo,
  secao,
}: {
  processoId: string
  tipo: TipoDocumento
  secao: SecaoDocumento
}) {
  const justificar = useJustificarDesvio(processoId, tipo)
  const showToast = useToast()
  const desvio = secao.desvioDaMinuta
  if (!desvio) return null

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-surface px-3.5 py-3">
      <InfoBanner tone={secao.justificativaDoDesvio ? "info" : "warning"}>
        O texto deixa de fora {desvio.faltam.length} de {desvio.clausulas}{" "}
        {desvio.clausulas === 1 ? "cláusula" : "cláusulas"} da minuta.
        {secao.justificativaDoDesvio ? " Alteração justificada." : ` Justifique a alteração (${FUNDAMENTO}).`}
      </InfoBanner>
      <details className="text-sm text-text-3">
        <summary className="cursor-pointer font-semibold text-text-2">Cláusulas Fora do Texto</summary>
        <ul className="m-0 mt-2 flex list-disc flex-col gap-1 pl-4">
          {desvio.faltam.map((clausula) => (
            <li key={clausula}>{clausula}</li>
          ))}
        </ul>
      </details>
      <CampoDeJustificativa
        key={secao.id}
        rotulo="Justificativa da Alteração"
        salvo={secao.justificativaDoDesvio}
        pendente={justificar.isPending}
        onSalvar={(texto, aoSalvar) =>
          justificar.mutate(
            { secaoId: secao.id, texto },
            {
              onSuccess: () => {
                aoSalvar()
                showToast(texto.trim() ? "Justificativa salva." : "Justificativa retirada.")
              },
              onError: (erro) =>
                showToast(erro instanceof Error ? erro.message : "Não foi possível salvar a justificativa."),
            },
          )
        }
      />
    </div>
  )
}

/**
 * Na etapa final: a justificativa do documento que não segue a minuta da AGU
 * e o resumo das seções alteradas (§88).
 */
export function AlteracoesDaMinuta({
  processoId,
  tipo,
  secoes,
  justificativa,
  onAbrirSecao,
}: {
  processoId: string
  tipo: TipoDocumento
  secoes: SecaoDocumento[]
  justificativa: { pedida: boolean; texto?: string; doModelo?: string }
  onAbrirSecao: (id: string) => void
}) {
  const justificar = useJustificarModelo(processoId, tipo)
  const showToast = useToast()
  const alteradas = secoes.filter((secao) => secao.desvioDaMinuta)
  if (!justificativa.pedida && alteradas.length === 0 && !justificativa.doModelo) return null

  return (
    <section className="flex flex-col gap-3 rounded-card border border-border bg-surface p-4">
      <h3 className="m-0 font-display text-md font-bold text-text-1">Minuta da AGU</h3>

      {justificativa.doModelo && (
        <p className="m-0 text-sm text-text-3">
          Modelo do órgão. Justificativa registrada: {justificativa.doModelo}
        </p>
      )}

      {justificativa.pedida && (
        <>
          {!justificativa.texto && (
            <InfoBanner tone="warning">
              Há minuta da AGU para este documento, e ele não a segue. Justifique ({FUNDAMENTO}) ou troque o modelo.
            </InfoBanner>
          )}
          <CampoDeJustificativa
            rotulo="Justificativa de Não Utilização da Minuta"
            salvo={justificativa.texto}
            pendente={justificar.isPending}
            onSalvar={(texto, aoSalvar) =>
              justificar.mutate(texto, {
                onSuccess: () => {
                  aoSalvar()
                  showToast(texto.trim() ? "Justificativa salva." : "Justificativa retirada.")
                },
                onError: (erro) =>
                  showToast(erro instanceof Error ? erro.message : "Não foi possível salvar a justificativa."),
              })
            }
          />
        </>
      )}

      {alteradas.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {alteradas.map((secao) => (
            <li key={secao.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="flex flex-wrap items-center gap-2 text-text-2">
                {secao.titulo}
                <Tag tone={secao.justificativaDoDesvio ? "success" : "warning"}>
                  {secao.justificativaDoDesvio ? "Alteração Justificada" : "Alteração sem Justificativa"}
                </Tag>
              </span>
              <Button size="sm" variant="ghost" onClick={() => onAbrirSecao(secao.id)}>
                Abrir Seção
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
