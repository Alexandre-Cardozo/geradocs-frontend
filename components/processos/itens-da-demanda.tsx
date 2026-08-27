"use client"

import { useState } from "react"

import { Button, Dropdown, FormField, Input, QuantityInput } from "@/components/ui"
import { IconCheck, IconPencil, IconPlus, IconTrash, IconX } from "@/components/ui/icons"
import { Th } from "@/components/shared/tabela"
import { useToast } from "@/components/shared/providers"
import { useAtualizarItensDoDfd, useDfdsDoProcesso } from "@/lib/api/hooks"
import type { DfdAnexado, ItemDoDfd } from "@/lib/api/procurement-client"

/** Um item da demanda com o DFD a que ele pertence. */
interface ItemVinculado {
  item: ItemDoDfd
  dfd: DfdAnexado
  /** Posição dentro do DFD — é o que identifica o item na hora de trocá-lo. */
  indice: number
}

/**
 * Os itens da demanda, com o DFD de cada um.
 *
 * <p><b>Cadastrar item é uma operação à parte de registrar o DFD.</b> O item
 * chega depois — às vezes muito depois —, e o que ele precisa declarar é a
 * quantidade e <b>a qual DFD ela pertence</b>: é o documento assinado por aquela
 * secretaria que responde por aquele número (ADR-036).
 *
 * <p>Itens não saem do PDF: ler item de documento assinado é OCR, e a plataforma
 * não adivinha quantidade em papel que vira edital. Eles são informados aqui, e é
 * daqui que saem a consolidação, o painel de quantidades do ETP e a Cotação.
 *
 * <p>A gravação passa pela lista inteira do DFD alvo (`PUT .../items`): a tela
 * monta a lista nova a partir da que está lá e a envia completa, o que mantém
 * a troca atômica por DFD.
 */
export function ItensDaDemanda({ processoId }: { processoId: string }) {
  const dfds = useDfdsDoProcesso(processoId)
  const trocarItens = useAtualizarItensDoDfd(processoId)
  const showToast = useToast()

  const [formularioAberto, setFormularioAberto] = useState(false)
  const [editando, setEditando] = useState<ItemVinculado | null>(null)
  const [removendo, setRemovendo] = useState<string | null>(null)

  if (dfds.isPending || dfds.isError) return null

  const registrados = dfds.data
  const vinculados: ItemVinculado[] = registrados.flatMap((dfd) =>
    dfd.itens.map((item, indice) => ({ item, dfd, indice })),
  )

  const aviso = (erro: unknown) =>
    showToast(erro instanceof Error ? erro.message : "Não foi possível salvar o item.")

  /** Grava a lista nova de um DFD, e a do anterior quando o vínculo mudou. */
  const gravar = (
    destino: DfdAnexado,
    itensDoDestino: ItemDoDfd[],
    origem: DfdAnexado | null,
    itensDaOrigem: ItemDoDfd[],
    mensagem: string,
  ) => {
    trocarItens.mutate(
      { dfdId: destino.id, itens: itensDoDestino },
      {
        onSuccess: () => {
          if (origem && origem.id !== destino.id) {
            // Mudar o vínculo é tirar de um DFD e pôr no outro: sem a segunda
            // gravação o item ficaria contado duas vezes na consolidação.
            trocarItens.mutate(
              { dfdId: origem.id, itens: itensDaOrigem },
              { onSuccess: () => showToast(mensagem), onError: aviso },
            )
            return
          }
          showToast(mensagem)
        },
        onError: aviso,
      },
    )
  }

  const salvar = (dados: ItemDoDfd, destino: DfdAnexado) => {
    const anterior = editando
    if (anterior && anterior.dfd.id === destino.id) {
      gravar(
        destino,
        destino.itens.map((item, i) => (i === anterior.indice ? dados : item)),
        null,
        [],
        `${dados.descricao} atualizado.`,
      )
    } else if (anterior) {
      gravar(
        destino,
        [...destino.itens, dados],
        anterior.dfd,
        anterior.dfd.itens.filter((_, i) => i !== anterior.indice),
        `${dados.descricao} passou para ${destino.nomeDoArquivo}.`,
      )
    } else {
      gravar(
        destino,
        [...destino.itens, dados],
        null,
        [],
        `${dados.descricao} vinculado a ${destino.nomeDoArquivo}.`,
      )
    }
    setFormularioAberto(false)
    setEditando(null)
  }

  const remover = (alvo: ItemVinculado) =>
    trocarItens.mutate(
      { dfdId: alvo.dfd.id, itens: alvo.dfd.itens.filter((_, i) => i !== alvo.indice) },
      {
        onSuccess: () => {
          showToast(`${alvo.item.descricao} removido de ${alvo.dfd.nomeDoArquivo}.`)
          setRemovendo(null)
        },
        onError: aviso,
      },
    )

  return (
    /* Sem moldura própria: é uma seção do cartão da demanda, não outro cartão. */
    <div className="border-t border-border-soft pt-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 font-display text-base font-bold text-text-1">
            Itens da demanda ({vinculados.length})
          </h3>
          <p className="m-0 mt-1 text-sm text-text-3">
            Cada item pertence ao DFD em que a secretaria o pediu. É esse vínculo que responde de
            onde veio cada quantidade da consolidação.
          </p>
        </div>
        {registrados.length > 0 && !formularioAberto && (
          <Button
            size="sm"
            variant="secondary"
            icon={<IconPlus size={13} strokeWidth={2.5} />}
            onClick={() => {
              setEditando(null)
              setFormularioAberto(true)
            }}
          >
            Adicionar item
          </Button>
        )}
      </div>

      {registrados.length === 0 ? (
        /*
          Sem DFD não há a que vincular: um item solto não teria como dizer qual
          secretaria o pediu, que é a pergunta que a consolidação responde.
        */
        <p className="m-0 rounded-lg border border-dashed border-border bg-surface px-3.5 py-3 text-sm text-text-muted">
          Registre um DFD acima para poder cadastrar itens — todo item precisa dizer em qual DFD
          ele foi pedido.
        </p>
      ) : (
        <>
          {formularioAberto && (
            <FormularioDoItem
              key={editando ? `${editando.dfd.id}-${editando.indice}` : "novo"}
              dfds={registrados}
              inicial={editando}
              salvando={trocarItens.isPending}
              onSalvar={salvar}
              onCancelar={() => {
                setFormularioAberto(false)
                setEditando(null)
              }}
            />
          )}

          {vinculados.length === 0 ? (
            <p className="m-0 rounded-lg border border-dashed border-border bg-surface px-3.5 py-3 text-sm text-text-muted">
              Nenhum item cadastrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <Th>Item</Th>
                    <Th>Unidade</Th>
                    <Th>Quantidade</Th>
                    <Th>DFD de origem</Th>
                    <Th> </Th>
                  </tr>
                </thead>
                <tbody>
                  {vinculados.map((vinculado) => {
                    const chave = `${vinculado.dfd.id}-${vinculado.indice}`
                    return (
                      <tr key={chave} className="border-b border-border-soft last:border-b-0">
                        <td className="px-2.5 py-2 font-medium text-text-1">
                          {vinculado.item.descricao}
                        </td>
                        <td className="px-2.5 py-2 font-mono text-xs text-text-3">
                          {vinculado.item.unidade}
                        </td>
                        <td className="px-2.5 py-2 font-mono text-xs text-text-1">
                          {vinculado.item.quantidade}
                        </td>
                        <td className="px-2.5 py-2 text-xs text-text-3">
                          <span className="block font-mono text-text-1">
                            {vinculado.dfd.nomeDoArquivo}
                          </span>
                          {vinculado.dfd.secretaria}
                        </td>
                        <td className="px-2.5 py-2">
                          {removendo === chave ? (
                            <span className="flex flex-wrap items-center justify-end gap-2">
                              <span className="text-xs text-text-3">Remover?</span>
                              <Button
                                size="sm"
                                variant="danger-soft"
                                icon={<IconCheck size={13} strokeWidth={2.5} />}
                                disabled={trocarItens.isPending}
                                onClick={() => remover(vinculado)}
                              >
                                Confirmar
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={<IconX size={13} />}
                                onClick={() => setRemovendo(null)}
                              >
                                Cancelar
                              </Button>
                            </span>
                          ) : (
                            <span className="flex items-center justify-end gap-2">
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={<IconPencil size={13} />}
                                onClick={() => {
                                  setEditando(vinculado)
                                  setFormularioAberto(true)
                                }}
                              >
                                Editar
                              </Button>
                              <Button
                                size="sm"
                                variant="secondary"
                                icon={<IconTrash size={13} />}
                                onClick={() => setRemovendo(chave)}
                              >
                                Remover
                              </Button>
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}

/** O item e o DFD a que ele pertence — os mesmos campos para incluir e editar. */
function FormularioDoItem({
  dfds,
  inicial,
  salvando,
  onSalvar,
  onCancelar,
}: {
  dfds: DfdAnexado[]
  /** O item que está sendo editado; ausente inclui um novo. */
  inicial: ItemVinculado | null
  salvando: boolean
  onSalvar: (item: ItemDoDfd, dfd: DfdAnexado) => void
  onCancelar: () => void
}) {
  const [descricao, setDescricao] = useState(inicial?.item.descricao ?? "")
  const [unidade, setUnidade] = useState(inicial?.item.unidade ?? "")
  const [quantidade, setQuantidade] = useState(inicial?.item.quantidade ?? "")
  // Com um DFD só não há escolha a fazer, e deixar o campo em branco seria
  // pedir à pessoa que confirmasse o óbvio.
  const [dfdId, setDfdId] = useState(inicial?.dfd.id ?? (dfds.length === 1 ? dfds[0]!.id : ""))

  const destino = dfds.find((dfd) => dfd.id === dfdId) ?? null
  const impedimento =
    descricao.trim() === ""
      ? "Informe a descrição do item."
      : unidade.trim() === ""
        ? // Sem unidade não há consolidação possível: somar 10 do que não se sabe
          // se é caixa ou resma produz um número que ninguém pode usar.
          "Informe a unidade de medida."
        : quantidade === ""
          ? "Informe a quantidade."
          : destino === null
            ? "Escolha o DFD em que este item foi pedido."
            : null

  return (
    <div className="mb-3 rounded-lg border border-royal bg-surface p-4">
      <div className="grid grid-cols-1 items-start gap-2.5 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
        <FormField label="Descrição do item" required>
          <Input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex: Papel A4 75 g/m2"
            autoFocus
          />
        </FormField>
        <FormField label="Unidade" required>
          <Input
            value={unidade}
            onChange={(e) => setUnidade(e.target.value)}
            placeholder="Ex: RESMA"
          />
        </FormField>
        <FormField label="Quantidade" required>
          <QuantityInput value={quantidade} onChange={setQuantidade} />
        </FormField>
      </div>

      <div className="mt-2.5 max-w-md">
        <FormField
          label="DFD em que foi pedido"
          required
          hint="É o documento assinado que responde por esta quantidade."
        >
          <Dropdown
            value={dfdId}
            onChange={setDfdId}
            ariaLabel="DFD em que foi pedido"
            options={[
              { value: "", label: "Selecione o DFD..." },
              ...dfds.map((dfd) => ({
                value: dfd.id,
                label: `${dfd.nomeDoArquivo} · ${dfd.secretaria}`,
              })),
            ]}
          />
        </FormField>
      </div>

      {/*
        Os botões vêm primeiro e o motivo ao lado deles: com o texto na frente,
        ele aparecia e sumia empurrando os botões pela linha — e o que estava
        embaixo do ponteiro deixava de estar.
      */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <Button
          size="sm"
          disabled={impedimento !== null || salvando}
          ariaDescribedBy="motivo-item"
          onClick={() =>
            destino &&
            onSalvar(
              { descricao: descricao.trim(), unidade: unidade.trim(), quantidade },
              destino,
            )
          }
        >
          {salvando ? "Salvando..." : inicial ? "Salvar item" : "Adicionar item"}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <p
          id="motivo-item"
          className={impedimento ? "m-0 text-xs text-text-muted" : "sr-only"}
        >
          {impedimento ?? "Tudo certo para salvar."}
        </p>
      </div>
    </div>
  )
}
