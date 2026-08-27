"use client"

import { IconFileText } from "@/components/ui/icons"
import { BaixarDfd } from "@/components/processos/baixar-dfd"
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
 * <p><b>A lista aparece a partir do segundo anexo.</b> Com um DFD só, o
 * cabeçalho do processo já o mostra — com nome e download —, e repetir a mesma
 * linha logo abaixo era dizer duas vezes a mesma coisa. É quando há dois que a
 * lista responde o que o cabeçalho não responde: qual secretaria mandou o quê,
 * e quando.
 */
export function DfdsAnexados({ processoId }: { processoId: string }) {
  const dfds = useDfdsDoProcesso(processoId)

  if (dfds.isPending) {
    return <div className="text-sm text-text-muted">Carregando os DFDs anexados...</div>
  }
  if (dfds.isError) {
    return <div className="text-sm text-danger">Não foi possível listar os DFDs anexados.</div>
  }
  if (dfds.data.length < 2) return null

  return (
    /* Sem moldura própria: é uma seção do cartão da demanda, não outro cartão. */
    <div className="border-t border-border-soft pt-4">
      <h3 className="m-0 font-display text-base font-bold text-text-1">
        DFDs anexados ({dfds.data.length})
      </h3>
      <p className="m-0 mt-1 mb-3 text-sm text-text-3">
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
              <BaixarDfd
                processoId={processoId}
                dfdId={dfd.id}
                nomeDoArquivo={dfd.nomeDoArquivo}
              />
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
