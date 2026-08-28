"use client"

import { useRef, useState } from "react"

import { Button, Tag } from "@/components/ui"
import { IconDownload, IconUpload } from "@/components/ui/icons"
import { useToast } from "@/components/shared/providers"
import { useAnexarDocumentoDaColeta } from "@/lib/api/hooks"
import { baixarDocumentoDaColeta, type ColetaDePreco } from "@/lib/api/procurement-client"
import { formatarBytes } from "@/lib/format"

/**
 * O documento que dá suporte a um preço coletado.
 *
 * <p>O <b>Art. 3º da IN SEGES/ME nº 65/2021</b> exige que a pesquisa contenha a
 * memória de cálculo "e os documentos que lhe dão suporte". Registrar o preço e
 * não guardar de onde ele saiu deixa a pesquisa sem o lastro que o controle vai
 * pedir — e o preço obtido em sítio eletrônico, que o Art. 5º, III admite, só se
 * comprova pela captura da página com data e hora visíveis.
 *
 * <p>A coleta nasce sem: o preço é anotado na hora da consulta, e o comprovante
 * às vezes chega depois. Trocar é permitido, e a trilha nomeia o documento
 * substituído.
 */
export function DocumentoDaColeta({
  processoId,
  coleta,
}: {
  processoId: string
  coleta: ColetaDePreco
}) {
  const anexar = useAnexarDocumentoDaColeta(processoId)
  const showToast = useToast()
  const campo = useRef<HTMLInputElement>(null)
  const [baixando, setBaixando] = useState(false)

  const enviar = (arquivo: File | null) => {
    if (!arquivo) return
    anexar.mutate(
      { coletaId: coleta.id, arquivo },
      {
        onSuccess: () => showToast(`${arquivo.name} anexado ao preço coletado.`),
        onError: (erro) =>
          showToast(
            erro instanceof Error ? erro.message : "Não foi possível anexar o documento.",
          ),
      },
    )
  }

  const baixar = async () => {
    setBaixando(true)
    try {
      const { conteudo, nomeSugerido } = await baixarDocumentoDaColeta(processoId, coleta.id)
      const endereco = URL.createObjectURL(conteudo)
      const ancora = document.createElement("a")
      ancora.href = endereco
      ancora.download = nomeSugerido ?? coleta.documento?.nome ?? "documento"
      ancora.click()
      // Sem revogar, cada download deixa o arquivo inteiro preso em memória.
      URL.revokeObjectURL(endereco)
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Não foi possível baixar o documento.")
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={campo}
        type="file"
        accept="application/pdf,.pdf,.docx,.xlsx,.xls,.csv,image/png,image/jpeg,.png,.jpg,.jpeg"
        aria-label={`Documento de suporte de ${coleta.item} · ${coleta.fonte}`}
        onChange={(e) => enviar(e.target.files?.[0] ?? null)}
        className="sr-only"
      />
      {coleta.documento ? (
        <>
          <Tag tone="success">Com documento de suporte</Tag>
          <span className="max-w-[16rem] truncate text-xs text-text-3">
            {coleta.documento.nome} · {formatarBytes(coleta.documento.bytes)}
          </span>
          <Button
            size="sm"
            variant="secondary"
            icon={<IconDownload size={13} />}
            disabled={baixando}
            onClick={() => void baixar()}
          >
            {baixando ? "Baixando..." : "Baixar"}
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={anexar.isPending}
            onClick={() => campo.current?.click()}
          >
            {anexar.isPending ? "Anexando..." : "Substituir"}
          </Button>
        </>
      ) : (
        <>
          <Tag tone="warning">Sem documento de suporte</Tag>
          <Button
            size="sm"
            variant="secondary"
            icon={<IconUpload size={13} />}
            disabled={anexar.isPending}
            onClick={() => campo.current?.click()}
          >
            {anexar.isPending ? "Anexando..." : "Anexar comprovante"}
          </Button>
        </>
      )}
    </div>
  )
}
