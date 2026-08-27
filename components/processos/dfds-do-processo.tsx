"use client"

import { useRef, useState } from "react"

import { Button, Dropdown, FormField, Input, Tag } from "@/components/ui"
import {
  IconCheck,
  IconFileText,
  IconPlus,
  IconTrash,
  IconUpload,
  IconX,
} from "@/components/ui/icons"
import { BaixarDfd } from "@/components/processos/baixar-dfd"
import { useToast } from "@/components/shared/providers"
import {
  useAnexarArquivoAoDfd,
  useRegistrarDfd,
  useConfigTenant,
  useDfdsDoProcesso,
  useRemoverDfd,
} from "@/lib/api/hooks"
import type { DfdAnexado } from "@/lib/api/procurement-client"
import { formatarBytes } from "@/lib/format"

/**
 * O cadastro de DFDs do processo.
 *
 * <p><b>Registrar DFD é uma operação; informar item é outra.</b> São atos de
 * momentos diferentes — o DFD de uma secretaria pode entrar no meio do processo,
 * e o de outra depois —, e o que os liga é o vínculo que a tabela de itens
 * declara, item a item (ADR-036).
 *
 * <p>Vários DFDs por processo é o caso comum: a contratação compartilhada nasce
 * de três secretarias pedindo o mesmo material, cada uma com o seu documento
 * assinado. O arquivo é opcional e pode chegar a qualquer momento — às vezes só
 * no fim (ADR-028).
 */
export function DfdsDoProcesso({ processoId }: { processoId: string }) {
  const dfds = useDfdsDoProcesso(processoId)
  const [registrando, setRegistrando] = useState(false)

  if (dfds.isPending) {
    return <div className="text-sm text-text-muted">Carregando os DFDs do processo...</div>
  }
  if (dfds.isError) {
    return <div className="text-sm text-danger">Não foi possível listar os DFDs do processo.</div>
  }

  return (
    /* Sem moldura própria: é uma seção do cartão da demanda, não outro cartão. */
    <div className="border-t border-border-soft pt-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 font-display text-base font-bold text-text-1">
            DFDs do processo ({dfds.data.length})
          </h3>
          <p className="m-0 mt-1 text-sm text-text-3">
            Um por secretaria que formalizou a demanda. Podem ser registrados a qualquer momento
            do processo, com ou sem o documento assinado em mãos.
          </p>
        </div>
        {!registrando && (
          <Button
            size="sm"
            variant="secondary"
            icon={<IconPlus size={13} strokeWidth={2.5} />}
            onClick={() => setRegistrando(true)}
          >
            Registrar DFD
          </Button>
        )}
      </div>

      {registrando && (
        <RegistrarDfd
          processoId={processoId}
          onPronto={() => setRegistrando(false)}
          onCancelar={() => setRegistrando(false)}
        />
      )}

      {dfds.data.length === 0 ? (
        !registrando && (
          <p className="m-0 rounded-lg border border-dashed border-border bg-surface px-3.5 py-3 text-sm text-text-muted">
            Nenhum DFD registrado. É o primeiro passo: sem um DFD, não há a que vincular os itens
            da demanda.
          </p>
        )
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {dfds.data.map((dfd) => (
            <LinhaDoDfd key={dfd.id} processoId={processoId} dfd={dfd} />
          ))}
        </ul>
      )}
    </div>
  )
}

/** Registrar um DFD: quem formalizou, como o processo se refere a ele, e o arquivo. */
function RegistrarDfd({
  processoId,
  onPronto,
  onCancelar,
}: {
  processoId: string
  onPronto: () => void
  onCancelar: () => void
}) {
  const tenant = useConfigTenant()
  const registrar = useRegistrarDfd(processoId)
  const showToast = useToast()

  const [secretaria, setSecretaria] = useState("")
  const [identificacao, setIdentificacao] = useState("")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const campoDeArquivo = useRef<HTMLInputElement>(null)

  const secretarias = tenant.data?.secretarias ?? []
  const impedimento =
    secretaria === ""
      ? "Escolha a secretaria que formalizou este DFD."
      : identificacao.trim() === ""
        ? "Informe o número ou o nome do DFD."
        : null

  return (
    <div className="mb-3 rounded-lg border border-royal bg-surface p-4">
      {/*
        Grade de três colunas, e não flex com `basis`: as colunas têm largura
        fixa e o topo alinhado, então a dica de um campo não empurra os outros
        para baixo — o formulário não muda de forma enquanto é preenchido.
      */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-3">
        <div className="min-w-0">
          <FormField
            label="Secretaria que formalizou"
            required
            hint="Quem pediu a contratação."
          >
            <Dropdown
              value={secretaria}
              onChange={setSecretaria}
              ariaLabel="Secretaria que formalizou"
              options={[
                { value: "", label: "Selecione a secretaria..." },
                ...secretarias.map((s) => ({ value: s.id, label: s.nome })),
              ]}
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField
            label="Identificação do DFD"
            required
            hint="Nº, ofício ou o nome do arquivo."
          >
            <Input
              value={identificacao}
              onChange={(e) => setIdentificacao(e.target.value)}
              ariaLabel="Identificação do DFD"
              placeholder="Ex: DFD 003/2026 — Educação"
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField label="Arquivo assinado" hint="Opcional — pode ser anexado depois.">
            <div className="flex items-center gap-2.5">
              <input
                ref={campoDeArquivo}
                type="file"
                accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                aria-label="Arquivo do DFD"
                onChange={(e) => {
                  const escolhido = e.target.files?.[0] ?? null
                  setArquivo(escolhido)
                  // Com o documento em mãos, o nome dele identifica melhor que
                  // um campo obrigatório em branco.
                  if (escolhido && identificacao.trim() === "") setIdentificacao(escolhido.name)
                }}
                className="sr-only"
              />
              <Button
                size="sm"
                variant="secondary"
                icon={<IconUpload size={14} />}
                onClick={() => campoDeArquivo.current?.click()}
              >
                Escolher arquivo
              </Button>
              <span className="min-w-0 flex-1 truncate text-xs text-text-3">
                {arquivo ? arquivo.name : "Nenhum arquivo."}
              </span>
            </div>
          </FormField>
        </div>
      </div>

      {/*
        Os botões vêm primeiro e o motivo ao lado deles: com o texto na frente,
        ele aparecia e sumia empurrando os botões pela linha — e o que estava
        embaixo do ponteiro deixava de estar.
      */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <Button
          size="sm"
          disabled={impedimento !== null || registrar.isPending}
          ariaDescribedBy={`motivo-dfd-${processoId}`}
          onClick={() =>
            registrar.mutate(
              // O DFD nasce sem item: informar o que ele pede é a outra
              // operação, e é lá que o vínculo entre item e DFD é declarado.
              { secretariaId: secretaria, identificacao: identificacao.trim(), arquivo },
              {
                onSuccess: () => {
                  showToast(`${identificacao.trim()} registrado no processo.`)
                  onPronto()
                },
                onError: (erro) =>
                  showToast(
                    erro instanceof Error ? erro.message : "Não foi possível registrar o DFD.",
                  ),
              },
            )
          }
        >
          {registrar.isPending ? "Registrando..." : "Registrar DFD"}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <p
          id={`motivo-dfd-${processoId}`}
          className={impedimento ? "m-0 text-xs text-text-muted" : "sr-only"}
        >
          {impedimento ?? "Tudo certo para registrar."}
        </p>
      </div>
    </div>
  )
}

/** Uma linha do cadastro: o DFD, o arquivo dele e as ações sobre ele. */
function LinhaDoDfd({ processoId, dfd }: { processoId: string; dfd: DfdAnexado }) {
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
    <li className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-ice px-3.5 py-2.5">
      <span className="flex text-text-muted">
        <IconFileText size={16} />
      </span>
      <span className="min-w-0 flex-1 basis-64">
        <span className="block truncate font-mono text-sm text-text-1">{dfd.nomeDoArquivo}</span>
        <span className="block text-xs text-text-3">
          {dfd.secretaria} · {new Date(dfd.anexadoEm).toLocaleDateString("pt-BR")}
          {dfd.arquivo ? ` · ${formatarBytes(dfd.arquivo.bytes)}` : ""}
        </span>
      </span>
      {/*
        Quantos itens estão vinculados a este DFD. "Sem itens" não é pendência:
        o documento pode ser registrado antes de o detalhamento chegar.
      */}
      <Tag tone={dfd.itens.length === 0 ? "warning" : "neutral"}>
        {dfd.itens.length === 0
          ? "Sem itens"
          : `${dfd.itens.length} ${dfd.itens.length === 1 ? "item" : "itens"}`}
      </Tag>
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
        {anexarArquivo.isPending ? "Enviando..." : dfd.arquivo ? "Substituir" : "Anexar arquivo"}
      </Button>
      {dfd.arquivo && (
        <BaixarDfd processoId={processoId} dfdId={dfd.id} nomeDoArquivo={dfd.nomeDoArquivo} />
      )}
      {confirmandoRemocao ? (
        /*
          Confirmar na própria linha, e não num diálogo: remover um DFD leva os
          itens vinculados a ele, e a pessoa precisa continuar vendo qual linha
          está prestes a sair.
        */
        <span className="flex items-center gap-2">
          <span className="text-xs text-text-3">
            Remover o DFD e os {dfd.itens.length} item(ns) dele?
          </span>
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
    </li>
  )
}
