"use client"

import { useId, useState } from "react"

import { Button, InfoBanner, Textarea } from "@/components/ui"
import type { SecaoDocumento, TipoDocumento } from "@/lib/types"

/**
 * Dispensar uma seção dispensável.
 *
 * O Art. 18, § 2º admite deixar de detalhar incisos **mediante justificativa**.
 * Sem registrá-la, a seção em branco simplesmente não entra no documento — e
 * quem lê depois não distingue o inciso que não se aplica daquele que ninguém
 * preencheu. A justificativa vira um parágrafo no lugar da seção, citando o
 * fundamento. Fora do ETP o Art. 18, § 2º não vale: a seção sai como não
 * aplicável, com o fundamento dela.
 *
 * Só aparece em seção dispensável e em branco: dispensar o que é indispensável
 * não é opção do § 2º, e dispensar o que já está escrito seria contradizer o
 * próprio documento.
 */
export function DispensaDeSecao({
  secao,
  tipo = "ETP",
  pendente,
  onDispensar,
  onDesfazer,
}: {
  secao: SecaoDocumento
  /** O documento: só o ETP cita o Art. 18, § 2º. */
  tipo?: TipoDocumento
  pendente: boolean
  onDispensar: (justificativa: string) => void
  onDesfazer: () => void
}) {
  const jaDispensada = (secao.justificativaDispensa ?? "").trim() !== ""
  const [aberto, setAberto] = useState(false)
  const [justificativa, setJustificativa] = useState(secao.justificativaDispensa ?? "")
  const campoId = useId()
  const motivoId = useId()
  const vazia = justificativa.trim() === ""

  if (jaDispensada && !aberto) {
    return (
      <InfoBanner tone="info">
        <div className="font-semibold">Seção dispensada</div>
        <p className="m-0 mt-1">{secao.justificativaDispensa}</p>
        <div className="mt-2.5 flex flex-wrap gap-2.5">
          <Button size="sm" variant="secondary" disabled={pendente} onClick={() => setAberto(true)}>
            Editar justificativa
          </Button>
          <Button size="sm" variant="ghost" disabled={pendente} onClick={onDesfazer}>
            Desfazer dispensa
          </Button>
        </div>
      </InfoBanner>
    )
  }

  if (!aberto) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" disabled={pendente} onClick={() => setAberto(true)}>
          Dispensar esta seção
        </Button>
        <span className="text-sm text-text-muted">
          {tipo === "ETP"
            ? "Dispensável mediante justificativa (Art. 18, § 2º)."
            : "Dispensável mediante justificativa: sai no documento como não aplicável."}
        </span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={campoId} className="text-sm font-semibold text-text-2">
        Por que esta seção é dispensada
      </label>
      <Textarea
        id={campoId}
        value={justificativa}
        onChange={(e) => setJustificativa(e.target.value)}
        rows={3}
        placeholder="Ex: contratação de item único, sem métrica de resultado aplicável."
      />
      <p id={motivoId} className="m-0 text-xs text-text-muted">
        A justificativa entra no documento, citando {secao.fundamentoLegal}.
      </p>
      <div className="flex flex-wrap gap-2.5">
        <Button
          size="sm"
          disabled={pendente || vazia}
          ariaDescribedBy={vazia ? motivoId : undefined}
          onClick={() => {
            onDispensar(justificativa.trim())
            setAberto(false)
          }}
        >
          {pendente ? "Salvando..." : "Registrar dispensa"}
        </Button>
        <Button size="sm" variant="ghost" disabled={pendente} onClick={() => setAberto(false)}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
