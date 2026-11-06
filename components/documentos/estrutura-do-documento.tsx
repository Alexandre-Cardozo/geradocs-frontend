"use client"

import { useId, useState } from "react"

import { Button, Dropdown, Input } from "@/components/ui"
import { IconCheck, IconChevronDown, IconPencil, IconPlus, IconTrash, IconX } from "@/components/ui/icons"
import { useToast } from "@/components/shared/providers"
import { useEstruturaDoDocumento } from "@/lib/api/hooks"
import type { SecaoDocumento, TipoDocumento } from "@/lib/types"

/**
 * Acrescentar, renomear, excluir e reordenar as seções que o servidor cria
 * (ADR-018), inclusive os subtópicos vindos do contexto da contratação
 * (ADR-061).
 *
 * As do catálogo não aparecem aqui: elas traduzem a lei. A lista agrupa cada
 * acrescentada sob a seção a que pertence, e subir ou descer vale dentro do
 * grupo, que é onde a ordem existe. O número vem do servidor, pela posição na
 * estrutura: a seção nova depois da 1 é a 2, e as seguintes andam uma casa.
 */
export function EstruturaDoDocumento({
  processoId,
  tipo,
  secoes,
}: {
  processoId: string
  tipo: TipoDocumento
  secoes: SecaoDocumento[]
}) {
  const { acrescentar, renomear, excluir, reordenar } = useEstruturaDoDocumento(processoId, tipo)
  const showToast = useToast()
  const [aberto, setAberto] = useState(false)
  const [titulo, setTitulo] = useState("")
  const [ancora, setAncora] = useState("")
  const [subtopico, setSubtopico] = useState(true)
  const [renomeando, setRenomeando] = useState<{ id: string; titulo: string } | null>(null)
  const tituloId = useId()
  const motivoId = useId()

  const doCatalogo = secoes.filter((secao) => secao.origem === "catalogo")
  const grupos = agrupar(secoes)
  const incompleto = titulo.trim() === "" || ancora === ""
  const pendente = acrescentar.isPending || renomear.isPending || excluir.isPending || reordenar.isPending
  const avisar = (erro: unknown) =>
    showToast(erro instanceof Error ? erro.message : "Não foi possível alterar a estrutura do documento.")

  const salvarTitulo = () => {
    if (renomeando === null) return
    const titulo = renomeando.titulo.trim()
    const atual = secoes.find((secao) => secao.id === renomeando.id)
    if (titulo === "" || titulo === atual?.titulo) {
      setRenomeando(null)
      return
    }
    renomear.mutate({ secaoId: renomeando.id, titulo }, { onSuccess: () => setRenomeando(null), onError: avisar })
  }

  const mover = (grupo: SecaoDocumento[], indice: number, direcao: -1 | 1) => {
    const ordem = grupo.map((secao) => secao.id)
    const destino = indice + direcao
    ;[ordem[indice], ordem[destino]] = [ordem[destino]!, ordem[indice]!]
    reordenar.mutate(ordem, { onError: avisar })
  }

  return (
    <div className="flex flex-col gap-3">
      {grupos.length > 0 && (
        <div>
          <div className="mb-1.5 text-2xs font-semibold tracking-caps text-text-muted uppercase">
            Seções e subtópicos acrescentados
          </div>
          <div className="flex flex-col gap-2">
            {grupos.map(({ ancora: codigo, subtopicos, itens }) => {
              const mae = doCatalogo.find((secao) => secao.id === codigo)
              const nome = mae ? `${mae.numero ?? mae.id}. ${mae.titulo}` : `Seção ${codigo}`
              return (
                <div
                  key={`${codigo}${subtopicos ? "." : "+"}`}
                  className="rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <div className="mb-1 text-xs text-text-muted">{subtopicos ? nome : `Depois de ${nome}`}</div>
                  <ul className="m-0 flex list-none flex-col p-0">
                    {itens.map((secao, i) => (
                      <li key={secao.id} className="flex items-center gap-2 py-1">
                        <span className="w-9 shrink-0 font-mono text-2xs text-text-muted">
                          {secao.numero ?? secao.id}
                        </span>
                        {renomeando?.id === secao.id ? (
                          <>
                            <Input
                              value={renomeando.titulo}
                              onChange={(e) => setRenomeando({ id: secao.id, titulo: e.target.value })}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") salvarTitulo()
                                if (e.key === "Escape") setRenomeando(null)
                              }}
                              ariaLabel={`Novo título de ${secao.titulo}`}
                              autoFocus
                              className="h-8 min-w-0 flex-1 text-sm"
                            />
                            <Acao rotulo="Salvar título" desabilitada={pendente} onClick={salvarTitulo}>
                              <IconCheck size={14} />
                            </Acao>
                            <Acao rotulo="Cancelar edição do título" desabilitada={pendente} onClick={() => setRenomeando(null)}>
                              <IconX size={14} />
                            </Acao>
                          </>
                        ) : (
                          <>
                            <span className="min-w-0 flex-1 text-sm text-text-1">{secao.titulo}</span>
                            <Acao
                              rotulo="Renomear"
                              desabilitada={pendente}
                              onClick={() => setRenomeando({ id: secao.id, titulo: secao.titulo })}
                            >
                              <IconPencil size={13} />
                            </Acao>
                            <Acao rotulo="Subir" desabilitada={pendente || i === 0} onClick={() => mover(itens, i, -1)}>
                              <span className="flex rotate-180">
                                <IconChevronDown size={14} />
                              </span>
                            </Acao>
                            <Acao
                              rotulo="Descer"
                              desabilitada={pendente || i === itens.length - 1}
                              onClick={() => mover(itens, i, 1)}
                            >
                              <IconChevronDown size={14} />
                            </Acao>
                            <Acao
                              rotulo="Excluir"
                              desabilitada={pendente}
                              onClick={() => excluir.mutate(secao.id, { onError: avisar })}
                            >
                              <IconTrash size={13} />
                            </Acao>
                          </>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {!aberto ? (
        <div>
          <Button size="sm" variant="secondary" icon={<IconPlus size={13} />} onClick={() => setAberto(true)}>
            Acrescentar seção
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5 rounded-lg border border-border bg-ice p-3">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <div>
              <label htmlFor={tituloId} className="mb-1 block text-sm font-semibold text-text-2">
                Título
              </label>
              <Input
                id={tituloId}
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                placeholder="Ex: Memória de cálculo do quantitativo"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-text-2">Em</label>
              <Dropdown
                value={ancora}
                onChange={setAncora}
                ariaLabel="Seção do catálogo em que a nova se ancora"
                options={[
                  { value: "", label: "Selecione a seção..." },
                  ...doCatalogo.map((secao) => ({
                    value: secao.id,
                    label: `${secao.numero ?? secao.id}. ${secao.titulo}`,
                  })),
                ]}
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Dropdown
              value={subtopico ? "sub" : "irma"}
              onChange={(v) => setSubtopico(v === "sub")}
              ariaLabel="Tipo da seção nova"
              className="w-56"
              options={[
                { value: "sub", label: "Subtópico da seção escolhida" },
                { value: "irma", label: "Seção nova logo depois dela" },
              ]}
            />
            <p id={motivoId} className="sr-only">
              Informe o título e escolha a seção em que ela se ancora.
            </p>
            <Button
              size="sm"
              disabled={pendente || incompleto}
              ariaDescribedBy={incompleto ? motivoId : undefined}
              onClick={() =>
                acrescentar.mutate(
                  { titulo: titulo.trim(), ancora, subtopico },
                  {
                    onSuccess: () => {
                      setTitulo("")
                      setAberto(false)
                    },
                    onError: avisar,
                  },
                )
              }
            >
              {acrescentar.isPending ? "Acrescentando..." : "Acrescentar"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setAberto(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** Ação de ícone da linha, com o nome para quem não vê o ícone. */
function Acao({
  rotulo,
  desabilitada,
  onClick,
  children,
}: {
  rotulo: string
  desabilitada: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      disabled={desabilitada}
      onClick={onClick}
      className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-text-3 transition-colors hover:bg-ice hover:text-royal disabled:cursor-default disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-text-3"
    >
      {children}
    </button>
  )
}

/**
 * As acrescentadas agrupadas pela seção do catálogo a que pertencem, na ordem
 * do documento. Subtópicos (3.1) e seções novas logo depois (3+1) são grupos
 * diferentes, porque são numerados e ordenados à parte (ADR-018). O subtópico
 * diz a mãe (`secaoPai`); a seção nova tem o código da âncora antes do "+".
 */
function agrupar(secoes: SecaoDocumento[]): { ancora: string; subtopicos: boolean; itens: SecaoDocumento[] }[] {
  const grupos = new Map<string, { ancora: string; subtopicos: boolean; itens: SecaoDocumento[] }>()
  for (const secao of secoes) {
    if (secao.origem !== "servidor") continue
    const subtopicos = secao.secaoPai !== undefined
    const ancora = secao.secaoPai ?? secao.id.split("+")[0]!
    const chave = `${ancora}${subtopicos ? "." : "+"}`
    const grupo = grupos.get(chave) ?? { ancora, subtopicos, itens: [] }
    grupo.itens.push(secao)
    grupos.set(chave, grupo)
  }
  return [...grupos.values()]
}
