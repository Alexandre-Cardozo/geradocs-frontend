"use client"

import { useState } from "react"

import { IconDownload } from "@/components/ui/icons"
import { useToast } from "@/components/shared/providers"
import { baixarJuntadaExportada } from "@/lib/api/client"
import type { Juntada } from "@/lib/api/generation-client"
import { formatDataHora } from "@/lib/format"
import { salvarArquivo } from "@/lib/navegador/salvar-arquivo"

/**
 * As juntadas exportadas, com o "baixar de novo" (ADR-049 do back-end).
 *
 * Baixar de novo remonta as mesmas peças, na mesma ordem: os arquivos gerados
 * não mudam, mesmo que o documento tenha ganhado versão nova depois.
 */
export function JuntadasExportadas({ juntadas, vazio }: { juntadas: Juntada[]; vazio: string }) {
  const showToast = useToast()
  const [baixando, setBaixando] = useState<string | null>(null)

  if (juntadas.length === 0) {
    return <p className="m-0 text-sm text-text-muted">{vazio}</p>
  }

  const baixar = async (juntada: Juntada) => {
    setBaixando(juntada.id)
    try {
      const { conteudo, nomeSugerido } = await baixarJuntadaExportada(juntada.id)
      salvarArquivo(conteudo, nomeSugerido ?? juntada.nomeDoArquivo)
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Não foi possível baixar a juntada.")
    } finally {
      setBaixando(null)
    }
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
      {juntadas.map((juntada) => (
        <li
          key={juntada.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border-soft px-3 py-2"
        >
          <span className="min-w-0">
            <span className="block truncate font-mono text-xs text-text-1" title={juntada.nomeDoArquivo}>
              {juntada.nomeDoArquivo}
            </span>
            <span className="block text-xs text-text-muted">
              {formatDataHora(juntada.exportadaEm)} · {juntada.exportadaPor}
            </span>
          </span>
          <button
            type="button"
            disabled={baixando === juntada.id}
            aria-label={`Baixar de novo ${juntada.nomeDoArquivo}`}
            onClick={() => void baixar(juntada)}
            className="flex h-7 cursor-pointer items-center gap-1 rounded-sm border border-border bg-ice px-2 text-xs font-semibold text-royal disabled:opacity-60"
          >
            <IconDownload size={12} strokeWidth={2.5} />
            {baixando === juntada.id ? "Baixando..." : "Baixar de novo"}
          </button>
        </li>
      ))}
    </ul>
  )
}
