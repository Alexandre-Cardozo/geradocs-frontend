"use client"

import { IconImage } from "@/components/ui/icons"
import { dataBrasiliaISO, formatData } from "@/lib/format"

/**
 * Pré-visualização ao vivo do documento timbrado (brasão + cabeçalho + rodapé).
 *
 * Fica ao lado do formulário de timbre: o que se configura ali é o que sai
 * impresso, e ver a folha enquanto se digita é o que dispensa gerar um
 * documento só para conferir.
 */
export function PreviaDoTimbre({
  logoUrl,
  cabecalho,
  rodape,
}: {
  logoUrl: string | null
  cabecalho: string
  rodape: string
}) {
  // Não há chave de "timbrado": órgão sem timbre configurado gera documento sem
  // timbre, e um interruptor que não desliga nada era exatamente a configuração
  // inventada que este passo removeu.
  const timbrado = logoUrl !== null || cabecalho.trim() !== "" || rodape.trim() !== ""
  const rodapeResolvido = rodape
    .replace("{data}", formatData(dataBrasiliaISO()))
    .replace("{numero}", "PROC-2024-090")
    .replace("{pagina}", "1")

  return (
    <div className="lg:sticky lg:top-4">
      <div className="mb-2 text-2xs font-semibold tracking-caps text-text-muted uppercase">
        Pré-visualização do Documento
      </div>
      <div className="rounded-card border border-border bg-ice p-5">
        {/* Folha A4 estilizada */}
        <div className="mx-auto flex aspect-[1/1.414] w-full max-w-70 flex-col rounded-sm border border-border bg-surface p-5">
          {timbrado ? (
            <div className="flex items-start gap-2.5 border-b-2 border-navy pb-2.5">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- object URL de rota autenticada
                <img src={logoUrl} alt="" className="size-8 shrink-0 object-contain" />
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-border-soft text-text-faint">
                  <IconImage size={16} strokeWidth={1.5} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                {cabecalho.split("\n").map((linha, i) => (
                  <div
                    key={i}
                    className={`truncate font-display leading-tight text-text-1 ${i === 0 ? "text-2xs font-bold" : "text-2xs font-medium text-text-3"}`}
                  >
                    {linha || " "}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Corpo simulado */}
          <div className="mt-4 flex flex-1 flex-col gap-2">
            <div className="h-1.5 w-1/3 rounded-full bg-border-soft" />
            <div className="h-1.5 w-full rounded-full bg-border-soft" />
            <div className="h-1.5 w-full rounded-full bg-border-soft" />
            <div className="h-1.5 w-5/6 rounded-full bg-border-soft" />
            <div className="mt-2 h-1.5 w-2/5 rounded-full bg-border-soft" />
            <div className="h-1.5 w-full rounded-full bg-border-soft" />
            <div className="h-1.5 w-11/12 rounded-full bg-border-soft" />
          </div>

          {timbrado && rodape.trim() !== "" ? (
            <div className="mt-3 border-t border-text-faint pt-1.5">
              <div className="truncate text-center text-2xs text-text-muted">{rodapeResolvido}</div>
            </div>
          ) : null}
        </div>
        <p className="mt-3 mb-0 text-center text-xs text-text-muted">
          {timbrado
            ? "Assim o timbre aparecerá nos documentos gerados."
            : "Timbre desativado — documentos sem brasão."}
        </p>
      </div>
    </div>
  )
}
