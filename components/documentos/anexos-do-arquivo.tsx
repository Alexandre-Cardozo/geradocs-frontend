"use client"

import { InfoBanner } from "@/components/ui"
import { useDocumentos, useProcesso } from "@/lib/api/hooks"
import { CATALOGO, anexosDoArquivo } from "@/lib/documentos"
import type { TipoDocumento } from "@/lib/types"

/**
 * O que o arquivo do documento leva ao final, antes do clique em gerar.
 *
 * <p>O Edital sai com o TR e a minuta de contrato no próprio arquivo, cada um
 * em folha nova (Art. 18, VI e Art. 25, § 3º). O anexo ainda não gerado fica de
 * fora e a geração não trava — por isso a tela avisa aqui, e não depois que o
 * arquivo já saiu sem ele.
 *
 * <p>Sem nada a dizer — documento sem anexo, ou dados ainda carregando —, não
 * ocupa espaço.
 */
export function AnexosDoArquivo({ processoId, tipo }: { processoId: string; tipo: TipoDocumento }) {
  const processo = useProcesso(processoId)
  const documentos = useDocumentos()

  if (!processo.data || !documentos.data) return null

  const gerados = documentos.data.filter((d) => d.processoId === processoId)
  const { incluidos, faltando } = anexosDoArquivo(tipo, processo.data.documentos, gerados)
  const varios = faltando.length > 1

  return (
    <>
      {incluidos.length > 0 && (
        <InfoBanner tone="info">
          Anexos ao final do {tipo}:{" "}
          <strong>
            {incluidos
              .map((a) => `Anexo ${a.numero} — ${CATALOGO[a.tipo].titulo} (v${a.versao})`)
              .join(" · ")}
          </strong>
          .
        </InfoBanner>
      )}
      {faltando.length > 0 && (
        <InfoBanner tone="warning">
          Fora do arquivo por ainda não {varios ? "terem" : "ter"} versão gerada:{" "}
          <strong>{faltando.map((t) => CATALOGO[t].titulo).join(" e ")}</strong>.
        </InfoBanner>
      )}
    </>
  )
}
