"use client"

import { useState } from "react"

import { IconDownload } from "@/components/ui/icons"
import { useToast } from "@/components/shared/providers"
import { baixarNorma } from "@/lib/api/regulation-client"

/**
 * Baixa uma versão do arquivo da norma.
 *
 * <p>Pela requisição autenticada, e não por âncora: `href` direto na rota daria
 * 401, e a pessoa veria um download quebrado sem explicação.
 */
export function BaixarNorma({
  normaId,
  versao,
  nomeDoArquivo,
}: {
  normaId: string
  versao: number
  nomeDoArquivo: string
}) {
  const showToast = useToast()
  const [baixando, setBaixando] = useState(false)

  const baixar = async () => {
    setBaixando(true)
    try {
      const { conteudo, nomeSugerido } = await baixarNorma(normaId, versao)
      const endereco = URL.createObjectURL(conteudo)
      const ancora = document.createElement("a")
      ancora.href = endereco
      ancora.download = nomeSugerido ?? nomeDoArquivo
      ancora.click()
      // Sem revogar, cada download deixa o arquivo inteiro preso em memória.
      URL.revokeObjectURL(endereco)
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Não foi possível baixar a norma.")
    } finally {
      setBaixando(false)
    }
  }

  return (
    <button
      type="button"
      disabled={baixando}
      aria-label={`Baixar ${nomeDoArquivo}`}
      onClick={() => void baixar()}
      className="flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 text-xs font-semibold text-royal disabled:opacity-60"
    >
      <IconDownload size={13} strokeWidth={2.5} />
      {baixando ? "Baixando..." : "Baixar"}
    </button>
  )
}
