"use client"

import { useState } from "react"

import { IconDownload, IconFileText } from "@/components/ui/icons"
import { useToast } from "@/components/shared/providers"
import { baixarDfd } from "@/lib/api/procurement-client"
import { useDfdsDoProcesso } from "@/lib/api/hooks"
import { formatarBytes } from "@/lib/format"

/**
 * Os DFDs anexados ao processo, com a data de cada anexo e o download.
 *
 * Até o 13.2 a plataforma anotava o nome do PDF assinado e descartava os bytes:
 * quem fosse conferir o processo depois não tinha como rebaixá-lo. Anexar de
 * novo **versiona** em vez de substituir (ADR-028) — é o que responde "qual DFD
 * embasou o ETP daquela data".
 *
 * O download passa pela requisição autenticada, e não por uma âncora: `href`
 * direto na rota do arquivo daria 401, e a pessoa veria um download quebrado.
 */
export function DfdsAnexados({ processoId }: { processoId: string }) {
  const dfds = useDfdsDoProcesso(processoId)
  const showToast = useToast()
  const [baixando, setBaixando] = useState<string | null>(null)

  if (dfds.isPending) {
    return <div className="text-sm text-text-muted">Carregando os DFDs anexados...</div>
  }
  if (dfds.isError) {
    return <div className="text-sm text-danger">Não foi possível listar os DFDs anexados.</div>
  }
  if (dfds.data.length === 0) return null

  const baixar = async (id: string, nome: string) => {
    setBaixando(id)
    try {
      const { conteudo, nomeSugerido } = await baixarDfd(processoId, id)
      const endereco = URL.createObjectURL(conteudo)
      const ancora = document.createElement("a")
      ancora.href = endereco
      ancora.download = nomeSugerido ?? nome
      ancora.click()
      // Sem revogar, cada download deixa o arquivo inteiro preso em memória.
      URL.revokeObjectURL(endereco)
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Não foi possível baixar o DFD.")
    } finally {
      setBaixando(null)
    }
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <h3 className="m-0 font-display text-base font-bold text-text-1">DFDs Anexados</h3>
      <p className="m-0 mt-1 mb-4 text-sm text-text-3">
        Cada anexo fica guardado com a data. Um DFD novo não apaga o anterior — é ele que
        mostra o que embasou os documentos gerados até aqui.
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {dfds.data.map((dfd) => (
          <li
            key={dfd.id}
            className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-ice px-3.5 py-2.5"
          >
            <span className="flex text-text-muted">
              <IconFileText size={16} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-sm text-text-1">
                {dfd.nomeDoArquivo}
              </span>
              <span className="block text-xs text-text-3">
                {dfd.secretaria} · anexado em{" "}
                {new Date(dfd.anexadoEm).toLocaleDateString("pt-BR")}
                {dfd.arquivo ? ` · ${formatarBytes(dfd.arquivo.bytes)}` : ""}
              </span>
            </span>
            {dfd.arquivo ? (
              <button
                type="button"
                disabled={baixando === dfd.id}
                aria-label={`Baixar ${dfd.nomeDoArquivo}`}
                onClick={() => void baixar(dfd.id, dfd.nomeDoArquivo)}
                className="flex h-8 cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 text-xs font-semibold text-royal disabled:opacity-60"
              >
                <IconDownload size={13} strokeWidth={2.5} />
                {baixando === dfd.id ? "Baixando..." : "Baixar"}
              </button>
            ) : (
              /*
                Registrado sem arquivo é caso legítimo: o servidor sabia o número
                do DFD e ainda não tinha o PDF em mãos. Dizer isso é melhor do
                que um botão que não faz nada.
              */
              <span className="text-xs text-text-muted">Sem arquivo anexado</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
