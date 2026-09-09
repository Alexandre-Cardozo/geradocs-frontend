"use client"

import { useState } from "react"

import { Button, Dropdown, InfoBanner } from "@/components/ui"
import { useComparacaoDeVersoes, useVersoesComTexto } from "@/lib/api/hooks"
import type { TipoDocumento } from "@/lib/types"

/**
 * A errata de uma retificação: "onde se lê / leia-se".
 *
 * **Facultativa**, por decisão da equipe. Nem toda retificação vira errata
 * publicada, e obrigar a gerar uma transformaria correção de digitação em ato
 * administrativo. A plataforma oferece; quem assina decide.
 *
 * O recorte é do servidor: ele cita o período inteiro em que a mudança está,
 * porque a errata precisa localizar o trecho no documento — «onde se lê: 30 /
 * leia-se: 45» não localiza nada.
 */
export function ErrataDoDocumento({
  processoId,
  tipo,
}: {
  processoId: string
  tipo: TipoDocumento
}) {
  const versoes = useVersoesComTexto(processoId, tipo)
  const [de, setDe] = useState<number | null>(null)
  const [para, setPara] = useState<number | null>(null)
  const comparacao = useComparacaoDeVersoes(processoId, tipo, de, para)

  const disponiveis = versoes.data ?? []
  if (disponiveis.length < 2) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-3.5 text-sm text-text-muted">
        A errata compara duas versões — este documento ainda tem só uma.
      </div>
    )
  }

  const opcoes = disponiveis.map((versao) => ({
    value: String(versao.versao),
    label: `v${versao.versao} — ${versao.nota}`,
  }))

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-text-2">Onde se lê (versão)</label>
          <Dropdown
            value={de === null ? "" : String(de)}
            onChange={(v) => setDe(v === "" ? null : Number(v))}
            ariaLabel="Versão de origem da errata"
            options={[{ value: "", label: "Selecione..." }, ...opcoes]}
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-text-2">Leia-se (versão)</label>
          <Dropdown
            value={para === null ? "" : String(para)}
            onChange={(v) => setPara(v === "" ? null : Number(v))}
            ariaLabel="Versão de destino da errata"
            options={[{ value: "", label: "Selecione..." }, ...opcoes]}
          />
        </div>
      </div>

      {comparacao.isSuccess && comparacao.data.errata.length === 0 && (
        <InfoBanner tone="info">
          Nada mudou entre estas duas versões — não há errata a publicar.
        </InfoBanner>
      )}

      {comparacao.isSuccess && comparacao.data.errata.length > 0 && (
        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {comparacao.data.errata.map((entrada) => (
            <li key={entrada.id} className="rounded-xl border border-border bg-surface p-4">
              <div className="text-base font-semibold text-text-1">
                <span className="mr-1.5 font-mono text-xs text-text-muted">{entrada.id}.</span>
                {entrada.titulo}
              </div>
              <dl className="m-0 mt-2 flex flex-col gap-2">
                <div>
                  <dt className="text-2xs font-semibold tracking-caps text-text-muted uppercase">
                    Onde se lê
                  </dt>
                  <dd className="m-0 mt-0.5 text-sm whitespace-pre-line text-text-3">
                    {entrada.ondeSeLe ?? "— (seção acrescentada nesta versão)"}
                  </dd>
                </div>
                <div>
                  <dt className="text-2xs font-semibold tracking-caps text-text-muted uppercase">
                    Leia-se
                  </dt>
                  <dd className="m-0 mt-0.5 text-sm whitespace-pre-line text-text-1">
                    {entrada.leiaSe ?? "— (seção suprimida nesta versão)"}
                  </dd>
                </div>
              </dl>
            </li>
          ))}
        </ol>
      )}

      {comparacao.isError && (
        <div className="text-sm text-danger">Não foi possível comparar as versões.</div>
      )}

      {de !== null && para !== null && comparacao.isPending && (
        <div className="text-sm text-text-muted">Comparando...</div>
      )}

      {(de === null || para === null) && (
        <p className="m-0 text-sm text-text-muted">
          Escolha as duas versões para montar a errata. Ela é facultativa — a
          retificação já está registrada no histórico.
        </p>
      )}

      {comparacao.isSuccess && comparacao.data.errata.length > 0 && (
        <div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setDe(null)
              setPara(null)
            }}
          >
            Limpar comparação
          </Button>
        </div>
      )}
    </div>
  )
}
