"use client"

import { useState } from "react"

import { IconDownload } from "@/components/ui/icons"
import { useToast } from "@/components/shared/providers"
import { baixarArquivoGerado } from "@/lib/api/client"
import { formatarBytes } from "@/lib/format"
import type { DocumentoGerado } from "@/lib/types"

/**
 * Baixa os arquivos que o servidor imprimiu.
 *
 * Um botão por formato, e não um "Download" genérico: DOCX e PDF são arquivos
 * diferentes, com tamanhos diferentes, e quem vai protocolar sabe qual precisa.
 *
 * O download passa pela requisição autenticada, e não por uma âncora: `href`
 * direto na rota do arquivo daria 401, e a pessoa veria um download quebrado sem
 * nenhuma explicação.
 */
export function BaixarArquivos({ documento }: { documento: DocumentoGerado }) {
  const showToast = useToast()
  const [baixando, setBaixando] = useState<string | null>(null)

  if (documento.arquivos.length === 0) {
    return (
      <span className="text-xs text-text-muted">
        {/* Documento de fixture, anterior à geração real: não há arquivo a baixar. */}
        Sem arquivo
      </span>
    )
  }

  const baixar = async (arquivoId: string, formato: string, nome: string) => {
    setBaixando(arquivoId)
    try {
      const { conteudo, nomeSugerido } = await baixarArquivoGerado(
        documento.processoId,
        documento.tipo,
        arquivoId,
      )
      const endereco = URL.createObjectURL(conteudo)
      const ancora = document.createElement("a")
      ancora.href = endereco
      ancora.download = nomeSugerido ?? nome
      ancora.click()
      // Sem revogar, cada download deixa o arquivo inteiro preso em memória.
      URL.revokeObjectURL(endereco)
    } catch (erro) {
      showToast(
        erro instanceof Error ? erro.message : `Não foi possível baixar o ${formato}.`,
      )
    } finally {
      setBaixando(null)
    }
  }

  return (
    <div className="flex gap-1.5">
      {documento.arquivos.map((arquivo) => (
        <button
          key={arquivo.id}
          type="button"
          disabled={baixando === arquivo.id}
          title={`${arquivo.formato} · ${formatarBytes(arquivo.bytes)}`}
          aria-label={`Baixar ${arquivo.formato} de ${documento.titulo}`}
          onClick={() => void baixar(arquivo.id, arquivo.formato, arquivo.nomeDoArquivo)}
          className="flex h-7 cursor-pointer items-center gap-1 rounded-sm border border-border bg-ice px-1.5 text-2xs font-semibold text-royal disabled:opacity-60"
        >
          <IconDownload size={12} strokeWidth={2.5} />
          {arquivo.formato}
        </button>
      ))}
    </div>
  )
}
