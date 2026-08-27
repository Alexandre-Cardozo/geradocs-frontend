"use client"

import { useRef, useState } from "react"

import { Button, Tag } from "@/components/ui"
import {
  IconCheck,
  IconChevronDown,
  IconChevronRight,
  IconFileText,
  IconPencil,
  IconTrash,
  IconUpload,
  IconX,
} from "@/components/ui/icons"
import { BaixarDfd } from "@/components/processos/baixar-dfd"
import { useToast } from "@/components/shared/providers"
import { useAnexarArquivoAoDfd, useDfdsDoProcesso, useRemoverDfd } from "@/lib/api/hooks"
import type { DfdAnexado } from "@/lib/api/procurement-client"
import { formatarBytes } from "@/lib/format"

/**
 * O cadastro de DFDs do processo.
 *
 * <p>Vários DFDs num processo só é o caso comum, e não a exceção: a contratação
 * compartilhada nasce de três secretarias pedindo o mesmo material, cada uma com
 * o seu documento assinado. O item pertence ao DFD que o pediu — é dele que a
 * consolidação diz de onde veio cada quantidade.
 *
 * <p>Era uma lista de anexos, e por isso ficou poluída: cada correção de item
 * criava outro DFD, e todos herdavam o nome do arquivo do processo — seis linhas
 * iguais, sem como distinguir, corrigir ou remover nenhuma. Agora é cadastro:
 * cada linha abre, mostra o que aquele DFD pede e tem por onde ser mudada
 * (ADR-036).
 */
export function DfdsDoProcesso({
  processoId,
  onEditarItens,
}: {
  processoId: string
  /** Abre o formulário de itens já apontado para este DFD. */
  onEditarItens: (dfdId: string) => void
}) {
  const dfds = useDfdsDoProcesso(processoId)

  if (dfds.isPending) {
    return <div className="text-sm text-text-muted">Carregando os DFDs do processo...</div>
  }
  if (dfds.isError) {
    return <div className="text-sm text-danger">Não foi possível listar os DFDs do processo.</div>
  }
  if (dfds.data.length === 0) return null

  return (
    /* Sem moldura própria: é uma seção do cartão da demanda, não outro cartão. */
    <div className="border-t border-border-soft pt-4">
      <h3 className="m-0 font-display text-base font-bold text-text-1">
        DFDs do processo ({dfds.data.length})
      </h3>
      <p className="m-0 mt-1 mb-3 text-sm text-text-3">
        Um DFD por secretaria que pediu. Abra para ver os itens daquele DFD, corrigi-los ou
        anexar o documento assinado — que pode chegar a qualquer momento.
      </p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {dfds.data.map((dfd) => (
          <LinhaDoDfd
            key={dfd.id}
            processoId={processoId}
            dfd={dfd}
            onEditarItens={() => onEditarItens(dfd.id)}
          />
        ))}
      </ul>
    </div>
  )
}

/** Uma linha do cadastro: fechada mostra o essencial, aberta mostra o que o DFD pede. */
function LinhaDoDfd({
  processoId,
  dfd,
  onEditarItens,
}: {
  processoId: string
  dfd: DfdAnexado
  onEditarItens: () => void
}) {
  const [aberta, setAberta] = useState(false)
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false)
  const campoDeArquivo = useRef<HTMLInputElement>(null)
  const anexarArquivo = useAnexarArquivoAoDfd(processoId)
  const remover = useRemoverDfd(processoId)
  const showToast = useToast()

  const enviarArquivo = (arquivo: File | null) => {
    if (!arquivo) return
    anexarArquivo.mutate(
      { dfdId: dfd.id, arquivo },
      {
        onSuccess: () =>
          showToast(
            dfd.arquivo
              ? `Arquivo de ${dfd.nomeDoArquivo} substituído.`
              : `Arquivo anexado a ${dfd.nomeDoArquivo}.`,
          ),
        onError: (erro) =>
          showToast(erro instanceof Error ? erro.message : "Não foi possível anexar o arquivo."),
      },
    )
    // Sem limpar, escolher o mesmo arquivo de novo não dispara `change`.
    if (campoDeArquivo.current) campoDeArquivo.current.value = ""
  }

  return (
    <li className="rounded-lg border border-border bg-ice">
      <button
        type="button"
        aria-expanded={aberta}
        onClick={() => setAberta((estava) => !estava)}
        className="flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-3.5 py-2.5 text-left"
      >
        <span className="flex text-text-muted">
          {aberta ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
        </span>
        <span className="flex text-text-muted">
          <IconFileText size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-mono text-sm text-text-1">{dfd.nomeDoArquivo}</span>
          <span className="block text-xs text-text-3">
            {dfd.secretaria} · {new Date(dfd.anexadoEm).toLocaleDateString("pt-BR")}
            {dfd.arquivo ? ` · ${formatarBytes(dfd.arquivo.bytes)}` : ""}
          </span>
        </span>
        {/*
          A contagem vai na linha fechada porque é o que se procura aqui: qual
          DFD trouxe o que. "Sem itens" não é pendência — o DFD pode estar
          registrado antes de o detalhamento chegar.
        */}
        <Tag tone={dfd.itens.length === 0 ? "warning" : "neutral"}>
          {dfd.itens.length === 0
            ? "Sem itens"
            : `${dfd.itens.length} ${dfd.itens.length === 1 ? "item" : "itens"}`}
        </Tag>
        {dfd.arquivo === null && <Tag tone="neutral">Sem arquivo</Tag>}
      </button>

      {aberta && (
        <div className="flex flex-col gap-3 border-t border-border-soft px-3.5 py-3">
          {dfd.itens.length === 0 ? (
            <p className="m-0 text-sm text-text-3">
              Este DFD ainda não tem itens informados — e é dos itens que saem a consolidação,
              o painel de quantidades do ETP e a Cotação.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-1 p-0">
              {dfd.itens.map((item, indice) => (
                <li
                  key={`${item.descricao}-${indice}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border-soft pb-1 text-sm last:border-b-0"
                >
                  <span className="min-w-0 flex-1 text-text-1">{item.descricao}</span>
                  <span className="font-mono text-xs text-text-3">
                    {item.quantidade} {item.unidade}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<IconPencil size={13} />}
              onClick={onEditarItens}
            >
              {dfd.itens.length === 0 ? "Informar itens" : "Editar itens"}
            </Button>
            <input
              ref={campoDeArquivo}
              type="file"
              accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              aria-label={`Arquivo de ${dfd.nomeDoArquivo}`}
              onChange={(e) => enviarArquivo(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            <Button
              size="sm"
              variant="secondary"
              icon={<IconUpload size={13} />}
              disabled={anexarArquivo.isPending}
              onClick={() => campoDeArquivo.current?.click()}
            >
              {anexarArquivo.isPending
                ? "Enviando..."
                : dfd.arquivo
                  ? "Substituir arquivo"
                  : "Anexar arquivo"}
            </Button>
            {dfd.arquivo && (
              <BaixarDfd
                processoId={processoId}
                dfdId={dfd.id}
                nomeDoArquivo={dfd.nomeDoArquivo}
              />
            )}
            <span className="flex-1" />
            {confirmandoRemocao ? (
              /*
                Confirmar na própria linha, e não num diálogo: remover um DFD
                muda a consolidação, e a pessoa precisa continuar vendo qual
                linha está prestes a sair.
              */
              <span className="flex items-center gap-2">
                <span className="text-xs text-text-3">Remover do processo?</span>
                <Button
                  size="sm"
                  variant="danger-soft"
                  icon={<IconCheck size={13} strokeWidth={2.5} />}
                  disabled={remover.isPending}
                  onClick={() =>
                    remover.mutate(dfd.id, {
                      onSuccess: () => showToast(`${dfd.nomeDoArquivo} removido do processo.`),
                      onError: (erro) =>
                        showToast(
                          erro instanceof Error ? erro.message : "Não foi possível remover o DFD.",
                        ),
                    })
                  }
                >
                  {remover.isPending ? "Removendo..." : "Confirmar"}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<IconX size={13} />}
                  onClick={() => setConfirmandoRemocao(false)}
                >
                  Cancelar
                </Button>
              </span>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                icon={<IconTrash size={13} />}
                onClick={() => setConfirmandoRemocao(true)}
              >
                Remover
              </Button>
            )}
          </div>
        </div>
      )}
    </li>
  )
}
