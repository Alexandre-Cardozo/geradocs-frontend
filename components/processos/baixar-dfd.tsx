"use client"

import { useState } from "react"

import { IconDownload } from "@/components/ui/icons"
import { useToast } from "@/components/shared/providers"
import { baixarDfd } from "@/lib/api/procurement-client"

/**
 * O botão que rebaixa um DFD anexado.
 *
 * <p>Vive fora das duas telas que o usam — o cabeçalho do processo e a lista de
 * anexos — porque o download passa pela requisição autenticada, e não por uma
 * âncora: `href` direto na rota do arquivo daria 401, e a pessoa veria um
 * download quebrado. Duplicar isso em dois lugares seria duplicar a chance de
 * um deles esquecer o `revokeObjectURL` e prender o arquivo inteiro em memória.
 */
export function BaixarDfd({
  processoId,
  dfdId,
  nomeDoArquivo,
  className = "",
}: {
  processoId: string
  dfdId: string
  nomeDoArquivo: string
  className?: string
}) {
  const showToast = useToast()
  const [baixando, setBaixando] = useState(false)

  const baixar = async () => {
    setBaixando(true)
    try {
      const { conteudo, nomeSugerido } = await baixarDfd(processoId, dfdId)
      const endereco = URL.createObjectURL(conteudo)
      const ancora = document.createElement("a")
      ancora.href = endereco
      ancora.download = nomeSugerido ?? nomeDoArquivo
      ancora.click()
      // Sem revogar, cada download deixa o arquivo inteiro preso em memória.
      URL.revokeObjectURL(endereco)
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Não foi possível baixar o DFD.")
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
      className={`flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 text-xs font-semibold text-royal disabled:opacity-60 ${className}`}
    >
      <IconDownload size={13} strokeWidth={2.5} />
      {baixando ? "Baixando..." : "Baixar"}
    </button>
  )
}
