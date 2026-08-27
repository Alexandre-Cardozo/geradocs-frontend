"use client"

import { useRef, useState } from "react"

import { Button, Dropdown, FormField, Input, QuantityInput } from "@/components/ui"
import { IconPlus, IconTrash, IconUpload } from "@/components/ui/icons"
import { useToast } from "@/components/shared/providers"
import {
  useAnexarDfdComItens,
  useAtualizarItensDoDfd,
  useConfigTenant,
  useDfdsDoProcesso,
} from "@/lib/api/hooks"
import type { ItemDoDfd } from "@/lib/api/procurement-client"

/** Vale para o DFD que ainda não existe: o formulário registra um novo. */
const NOVO = "novo"

/**
 * Informar os itens de um DFD — o novo ou um que já está no processo.
 *
 * <p>Itens não saem do PDF assinado: ler item de PDF é OCR, e a plataforma não
 * faz — nem deveria adivinhar quantidade em documento que vira edital.
 *
 * <p><b>Todo item pertence a um DFD</b>, e o DFD é escolhido aqui em cima. Antes
 * o formulário só sabia criar: corrigir uma quantidade registrava outro DFD com
 * o mesmo nome, e o processo acumulava linhas iguais que ninguém conseguia
 * distinguir (ADR-036). Escolhendo um DFD já registrado, o que se faz é trocar
 * os itens dele; escolhendo "novo", registra-se o DFD de outra secretaria — que
 * é como nasce a contratação compartilhada.
 */
export function ItensDoDfd({
  processoId,
  dfdSelecionado,
  onPronto,
  onFechar,
}: {
  processoId: string
  /** O DFD que a linha do cadastro mandou editar; ausente abre em "novo DFD". */
  dfdSelecionado?: string | null
  onPronto: () => void
  /** Ausente quando não há o que fechar — sem itens, o formulário é o passo. */
  onFechar?: () => void
}) {
  const tenant = useConfigTenant()
  const dfds = useDfdsDoProcesso(processoId)
  const registrar = useAnexarDfdComItens(processoId)
  const trocarItens = useAtualizarItensDoDfd(processoId)
  const showToast = useToast()

  const [alvo, setAlvo] = useState(dfdSelecionado ?? NOVO)
  const [secretaria, setSecretaria] = useState("")
  const [identificacao, setIdentificacao] = useState("")
  const [arquivo, setArquivo] = useState<File | null>(null)
  const campoDeArquivo = useRef<HTMLInputElement>(null)
  const [itens, setItens] = useState<ItemDoDfd[]>([{ descricao: "", unidade: "", quantidade: "" }])

  const secretarias = tenant.data?.secretarias ?? []
  const registrados = dfds.data ?? []
  const emEdicao = registrados.find((dfd) => dfd.id === alvo) ?? null

  // Trocar o DFD alvo carrega os itens dele: editar é partir do que está lá, e
  // não de um formulário em branco que apagaria o resto ao salvar.
  const [carregado, setCarregado] = useState<string | null>(null)
  if (emEdicao && carregado !== emEdicao.id) {
    setCarregado(emEdicao.id)
    setItens(
      emEdicao.itens.length > 0 ? emEdicao.itens : [{ descricao: "", unidade: "", quantidade: "" }],
    )
  }

  const preenchidos = itens.filter(
    (item) => item.descricao.trim() !== "" && item.unidade.trim() !== "" && item.quantidade !== "",
  )
  const registrandoNovo = alvo === NOVO
  const impedimento = registrandoNovo
    ? secretaria === ""
      ? "Escolha a secretaria que formalizou este DFD."
      : identificacao.trim() === ""
        ? "Informe o número ou o nome do DFD."
        : null
    : preenchidos.length === 0
      ? "Informe ao menos um item com descrição, unidade e quantidade."
      : null

  const alterar = (indice: number, campo: keyof ItemDoDfd, valor: string) =>
    setItens((atuais) =>
      atuais.map((item, i) => (i === indice ? { ...item, [campo]: valor } : item)),
    )

  const limpar = () => {
    setItens([{ descricao: "", unidade: "", quantidade: "" }])
    setSecretaria("")
    setIdentificacao("")
    setArquivo(null)
    if (campoDeArquivo.current) campoDeArquivo.current.value = ""
  }

  const aviso = (erro: unknown) =>
    showToast(erro instanceof Error ? erro.message : "Não foi possível salvar.")

  const salvar = () => {
    if (registrandoNovo) {
      registrar.mutate(
        {
          secretariaId: secretaria,
          nomeDoArquivo: identificacao.trim(),
          itens: preenchidos,
          arquivo,
        },
        {
          onSuccess: () => {
            showToast(
              preenchidos.length === 0
                ? `${identificacao.trim()} registrado. Informe os itens quando eles chegarem.`
                : `${identificacao.trim()} registrado com ${preenchidos.length} item(ns).`,
            )
            limpar()
            onPronto()
          },
          onError: aviso,
        },
      )
      return
    }
    trocarItens.mutate(
      { dfdId: alvo, itens: preenchidos },
      {
        onSuccess: () => {
          showToast(`${preenchidos.length} item(ns) salvo(s) em ${emEdicao?.nomeDoArquivo ?? ""}.`)
          onPronto()
        },
        onError: aviso,
      },
    )
  }

  const salvando = registrar.isPending || trocarItens.isPending

  return (
    /* Sem moldura própria: é uma seção do cartão da demanda, não outro cartão. */
    <div className="border-t border-border-soft pt-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 font-display text-base font-bold text-text-1">
            {registrandoNovo ? "Registrar DFD" : `Itens de ${emEdicao?.nomeDoArquivo ?? "um DFD"}`}
          </h3>
          <p className="m-0 mt-1 text-sm text-text-3">
            A quantidade que cada secretaria pediu, no DFD em que ela pediu. É daqui que saem a
            consolidação, o painel de quantidades do ETP e a Cotação.
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
          <FormField
            label="DFD destes itens"
            required
            hint="Todo item pertence ao DFD em que a secretaria o pediu."
          >
            <Dropdown
              value={alvo}
              onChange={setAlvo}
              ariaLabel="DFD destes itens"
              options={[
                ...registrados.map((dfd) => ({
                  value: dfd.id,
                  label: `${dfd.nomeDoArquivo} · ${dfd.secretaria}`,
                })),
                { value: NOVO, label: "Registrar um novo DFD..." },
              ]}
            />
          </FormField>
        </div>

        {registrandoNovo ? (
          <>
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
                label="Identificação do DFD"
                required
                hint="Como o processo se refere a ele: nº, ofício ou o nome do arquivo."
              >
                <Input
                  value={identificacao}
                  onChange={(e) => setIdentificacao(e.target.value)}
                  ariaLabel="Identificação do DFD"
                  placeholder="Ex: DFD 003/2026 — Educação"
                />
              </FormField>
            </div>
            <div className="min-w-0 flex-1 basis-64">
              <FormField
                label="Arquivo assinado"
                hint="Opcional — pode ser anexado depois, na própria linha do DFD."
              >
                <div className="flex items-center gap-2.5">
                  <input
                    ref={campoDeArquivo}
                    type="file"
                    accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    aria-label="Arquivo do DFD"
                    onChange={(e) => {
                      const escolhido = e.target.files?.[0] ?? null
                      setArquivo(escolhido)
                      // O nome do arquivo serve de identificação enquanto não
                      // houver outra: é melhor que deixar o campo obrigatório
                      // em branco com o documento já em mãos.
                      if (escolhido && identificacao.trim() === "") {
                        setIdentificacao(escolhido.name)
                      }
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
                    {arquivo ? arquivo.name : "Pode ser anexado depois."}
                  </span>
                </div>
              </FormField>
            </div>
          </>
        ) : (
          <p className="m-0 basis-64 text-sm text-text-3">
            Pedido por <strong className="text-text-1">{emEdicao?.secretaria}</strong>. Salvar troca
            os itens deste DFD — nenhum outro é criado.
          </p>
        )}
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
        <p
          id={`motivo-itens-${processoId}`}
          className={impedimento ? "m-0 text-xs text-text-muted" : "sr-only"}
        >
          {impedimento ?? "Tudo certo para salvar."}
        </p>
        <Button
          size="sm"
          disabled={impedimento !== null || salvando}
          ariaDescribedBy={`motivo-itens-${processoId}`}
          onClick={salvar}
        >
          {salvando
            ? "Salvando..."
            : registrandoNovo
              ? preenchidos.length === 0
                ? "Registrar DFD"
                : "Registrar DFD e itens"
              : "Salvar itens"}
        </Button>
      </div>
    </div>
  )
}
