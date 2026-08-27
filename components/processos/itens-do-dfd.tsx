"use client"

import { useRef, useState } from "react"

import { Button, Dropdown, FormField, Input, QuantityInput } from "@/components/ui"
import { IconPlus, IconTrash, IconUpload } from "@/components/ui/icons"
import { useToast } from "@/components/shared/providers"
import { useAnexarDfdComItens, useConfigTenant } from "@/lib/api/hooks"
import type { ItemDoDfd } from "@/lib/api/procurement-client"

/**
 * Informar os itens que a secretaria pediu no DFD.
 *
 * <p>Itens não saem do PDF assinado: ler item de PDF é OCR, e a plataforma não
 * faz — nem deveria adivinhar quantidade em documento que vira edital. Eles são
 * informados aqui, e é deles que saem a consolidação, o painel de quantidades
 * do ETP e a Cotação.
 *
 * <p>Um DFD por secretaria, e não um formulário só: a consolidação existe
 * justamente para somar o que três secretarias pediram separado, e é a
 * secretaria de origem que se pergunta quando os pedidos divergem.
 *
 * <p><b>O arquivo aqui é o DFD *desta* secretaria.</b> O DFD escolhido na
 * abertura já sobe com o processo (ADR-035) e não precisa ser reenviado; este
 * campo existe para a demanda que vem de mais de uma secretaria, em que cada
 * uma tem o seu documento assinado (ADR-028). Parecia campo repetido porque as
 * duas telas diziam "DFD" para coisas diferentes; agora o rótulo diz qual é qual.
 *
 * <p>Continua opcional: há processo em que o servidor sabe o número do DFD e
 * ainda não tem o PDF em mãos, e exigi-lo transformaria um facilitador em
 * bloqueio.
 */
export function ItensDoDfd({
  processoId,
  nomeDoArquivo,
  onPronto,
  onFechar,
}: {
  processoId: string
  /** O DFD já registrado no processo; o item herda o nome dele. */
  nomeDoArquivo: string
  onPronto: () => void
  /** Ausente quando não há o que fechar — sem itens, o formulário é o passo. */
  onFechar?: () => void
}) {
  const tenant = useConfigTenant()
  const anexar = useAnexarDfdComItens(processoId)
  const showToast = useToast()

  const [secretaria, setSecretaria] = useState("")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const campoDeArquivo = useRef<HTMLInputElement>(null)
  const [itens, setItens] = useState<ItemDoDfd[]>([
    { descricao: "", unidade: "", quantidade: "" },
  ])

  const secretarias = tenant.data?.secretarias ?? []
  const preenchidos = itens.filter(
    (item) => item.descricao.trim() !== "" && item.unidade.trim() !== "" && item.quantidade !== "",
  )
  const impedimento =
    secretaria === ""
      ? "Escolha a secretaria que pediu estes itens."
      : preenchidos.length === 0
        ? "Informe ao menos um item com descrição, unidade e quantidade."
        : null

  const alterar = (indice: number, campo: keyof ItemDoDfd, valor: string) =>
    setItens((atuais) =>
      atuais.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)),
    )

  return (
    /* Sem moldura própria: é uma seção do cartão da demanda, não outro cartão. */
    <div className="border-t border-border-soft pt-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 font-display text-base font-bold text-text-1">
            Informar itens do DFD
          </h3>
          <p className="m-0 mt-1 text-sm text-text-3">
            A quantidade que cada secretaria pediu. É daqui que saem a consolidação, o painel de
            quantidades do ETP e a Cotação.
          </p>
        </div>
        {onFechar && (
          <button
            type="button"
            onClick={onFechar}
            className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-text-3"
          >
            Fechar
          </button>
        )}
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1 basis-64">
        <FormField label="Secretaria que pediu" required>
          <Dropdown
            value={secretaria}
            onChange={setSecretaria}
            ariaLabel="Secretaria que pediu"
            options={[
              { value: "", label: "Selecione a secretaria..." },
              ...secretarias.map((s) => ({ value: s.id, label: s.nome })),
            ]}
          />
        </FormField>
        </div>
        <div className="min-w-0 flex-1 basis-64">
          <FormField
            label="Arquivo assinado desta secretaria"
            hint="Opcional, PDF ou DOCX. O DFD enviado na abertura do processo já fica guardado; este é o DFD desta secretaria, quando a demanda vem de mais de uma."
          >
            <div className="flex items-center gap-2.5">
              <input
                ref={campoDeArquivo}
                type="file"
                accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                aria-label="Arquivo do DFD"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
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
                {arquivo ? arquivo.name : "Pode ser anexado depois."}
              </span>
            </div>
          </FormField>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {itens.map((item, indice) => (
          <div
            key={indice}
            className="grid grid-cols-1 gap-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]"
          >
            <FormField label={indice === 0 ? "Descrição do item" : ""}>
              <Input
                value={item.descricao}
                onChange={(e) => alterar(indice, "descricao", e.target.value)}
                placeholder="Ex: Papel A4 75 g/m2"
              />
            </FormField>
            <FormField label={indice === 0 ? "Unidade" : ""}>
              <Input
                value={item.unidade}
                onChange={(e) => alterar(indice, "unidade", e.target.value)}
                placeholder="Ex: RESMA"
              />
            </FormField>
            <FormField label={indice === 0 ? "Quantidade" : ""}>
              <QuantityInput
                value={item.quantidade}
                onChange={(valor) => alterar(indice, "quantidade", valor)}
              />
            </FormField>
            <div className={indice === 0 ? "flex items-end pb-0.5" : "flex items-start"}>
              <button
                type="button"
                aria-label={`Remover item ${indice + 1}`}
                disabled={itens.length === 1}
                onClick={() => setItens((atuais) => atuais.filter((_, i) => i !== indice))}
                className="flex size-9 cursor-pointer items-center justify-center rounded-md border border-border bg-ice text-danger transition-colors hover:bg-tint-danger-bg disabled:opacity-40"
              >
                <IconTrash size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <Button
          size="sm"
          variant="secondary"
          icon={<IconPlus size={14} />}
          onClick={() =>
            setItens((atuais) => [...atuais, { descricao: "", unidade: "", quantidade: "" }])
          }
        >
          Acrescentar item
        </Button>
        <p id={`motivo-itens-${processoId}`} className={impedimento ? "m-0 text-xs text-text-muted" : "sr-only"}>
          {impedimento ?? "Tudo certo para salvar."}
        </p>
        <Button
          size="sm"
          disabled={impedimento !== null || anexar.isPending}
          ariaDescribedBy={`motivo-itens-${processoId}`}
          onClick={() =>
            anexar.mutate(
              { secretariaId: secretaria, nomeDoArquivo: arquivo?.name ?? nomeDoArquivo, itens: preenchidos, arquivo },
              {
                onSuccess: () => {
                  showToast(
                    arquivo
                      ? `${preenchidos.length} item(ns) e o arquivo anexados.`
                      : `${preenchidos.length} item(ns) informado(s).`,
                  )
                  setItens([{ descricao: "", unidade: "", quantidade: "" }])
                  setSecretaria("")
                  setArquivo(null)
                  if (campoDeArquivo.current) campoDeArquivo.current.value = ""
                  onPronto()
                },
                onError: (erro) =>
                  showToast(
                    erro instanceof Error ? erro.message : "Não foi possível salvar os itens.",
                  ),
              },
            )
          }
        >
          {anexar.isPending ? "Salvando..." : "Salvar itens"}
        </Button>
      </div>
    </div>
  )
}
