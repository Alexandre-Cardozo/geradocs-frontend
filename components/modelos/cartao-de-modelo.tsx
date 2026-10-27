"use client"

import { useState } from "react"

import { Button, InfoBanner, Tag } from "@/components/ui"
import type { MinutaDaAgu, ModeloDoOrgao } from "@/lib/api/modelos-client"

/**
 * Um modelo do órgão na lista (§88): de que minuta parte, a versão, a
 * justificativa e, para o coordenador, a versão seguinte e a desativação.
 */
export function CartaoDeModelo({
  modelo,
  base,
  coordenador,
  desativando,
  onNovaVersao,
  onDesativar,
}: {
  modelo: ModeloDoOrgao
  /** A minuta de base, para o nome; ausente se saiu do catálogo. */
  base?: MinutaDaAgu
  coordenador: boolean
  desativando: boolean
  onNovaVersao: () => void
  onDesativar: () => void
}) {
  const [confirmando, setConfirmando] = useState(false)

  return (
    <article className="flex flex-col gap-2.5 rounded-card border border-border bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="m-0 font-display text-md font-bold text-text-1">{modelo.titulo}</h3>
          <p className="m-0 mt-0.5 text-sm text-text-3">
            {modelo.tipo} · sobre {base ? base.titulo : modelo.codigoDaBase} ({modelo.versaoDaBase}) · versão{" "}
            <span className="font-mono">{modelo.versao}</span> · {modelo.publicadoEm} · {modelo.publicadoPor}
          </p>
        </div>
        <Tag tone={modelo.ativo ? "success" : "neutral"}>{modelo.ativo ? "Ativo" : "Desativado"}</Tag>
      </div>
      {modelo.descricao && <p className="m-0 text-sm text-text-2">{modelo.descricao}</p>}
      <details className="text-sm text-text-3">
        <summary className="cursor-pointer font-semibold text-text-2">Justificativa (Art. 19, § 2º, Lei 14.133/21)</summary>
        <p className="m-0 mt-2 whitespace-pre-line">{modelo.justificativa}</p>
      </details>
      {modelo.baseMaisNova && (
        <InfoBanner tone="warning">
          A AGU publicou a versão {modelo.baseMaisNova.publicadoEm} desta minuta. Este modelo segue a de{" "}
          {modelo.versaoDaBase}.
        </InfoBanner>
      )}
      {coordenador && modelo.ativo && !confirmando && (
        <span className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={onNovaVersao}>
            Nova Versão
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirmando(true)}>
            Desativar
          </Button>
        </span>
      )}
      {confirmando && (
        <InfoBanner tone="warning">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Desativar? Os documentos que já o usam continuam nele.</span>
            <span className="flex gap-2">
              <Button size="sm" onClick={() => !desativando && onDesativar()}>
                {desativando ? "Desativando..." : "Desativar"}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
                Manter
              </Button>
            </span>
          </div>
        </InfoBanner>
      )}
    </article>
  )
}
