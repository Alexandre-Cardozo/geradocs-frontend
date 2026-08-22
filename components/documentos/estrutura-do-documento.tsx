"use client"

import { useId, useState } from "react"

import { Button, Dropdown, Input } from "@/components/ui"
import { useEstruturaDoDocumento } from "@/lib/api/hooks"
import type { SecaoDocumento, TipoDocumento } from "@/lib/types"

/**
 * Acrescentar, excluir e reordenar as seções que o servidor cria (ADR-018).
 *
 * As do catálogo não aparecem aqui: elas traduzem a lei, e reordená-las
 * produziria um ETP com os incisos fora de ordem — um documento que quem conhece
 * a norma lê como errado. Excluí-las também não: seção dispensável tem caminho
 * próprio, a dispensa justificada do Art. 18, § 2º, que **registra** a ausência
 * em vez de apagá-la.
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
  const { acrescentar, excluir, reordenar } = useEstruturaDoDocumento(processoId, tipo)
  const [titulo, setTitulo] = useState("")
  const [ancora, setAncora] = useState("")
  const [subtopico, setSubtopico] = useState(true)
  const tituloId = useId()
  const motivoId = useId()
  const extremoId = useId()

  const doCatalogo = secoes.filter((secao) => secao.origem === "catalogo")
  const doServidor = secoes.filter((secao) => secao.origem === "servidor")
  const incompleto = titulo.trim() === "" || ancora === ""
  const pendente = acrescentar.isPending || excluir.isPending || reordenar.isPending

  const mover = (indice: number, direcao: -1 | 1) => {
    const destino = indice + direcao
    if (destino < 0 || destino >= doServidor.length) return
    const ordem = doServidor.map((secao) => secao.id)
    ;[ordem[indice], ordem[destino]] = [ordem[destino]!, ordem[indice]!]
    reordenar.mutate(ordem)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-ice p-4">
        <div className="font-display text-md font-bold text-text-1">Acrescentar seção</div>
        <p className="m-0 text-sm text-text-3">
          Um ETP às vezes precisa de um assunto que a lei não enumera — memória de
          cálculo, justificativa de fornecedor exclusivo. A seção nova entra
          ancorada em uma do catálogo, para que a numeração legal não mude.
        </p>
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
            <label className="mb-1 block text-sm font-semibold text-text-2">Depois de</label>
            <Dropdown
              value={ancora}
              onChange={setAncora}
              ariaLabel="Seção do catálogo em que a nova se ancora"
              options={[
                { value: "", label: "Selecione a seção..." },
                ...doCatalogo.map((secao) => ({
                  value: secao.id,
                  label: `${secao.id}. ${secao.titulo}`,
                })),
              ]}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
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
          <p id={motivoId} className="m-0 text-xs text-text-muted">
            Informe o título e escolha a seção em que ela se ancora.
          </p>
        </div>
        <div>
          <Button
            size="sm"
            disabled={pendente || incompleto}
            ariaDescribedBy={incompleto ? motivoId : undefined}
            onClick={() =>
              acrescentar.mutate(
                { titulo: titulo.trim(), ancora, subtopico },
                { onSuccess: () => setTitulo("") },
              )
            }
          >
            {acrescentar.isPending ? "Acrescentando..." : "Acrescentar"}
          </Button>
        </div>
      </div>

      {doServidor.length > 0 && (
        <div>
          <div className="mb-1.5 text-2xs font-semibold tracking-caps text-text-muted uppercase">
            Seções que você criou
          </div>
          <p id={extremoId} className="sr-only">
            Esta seção já está no extremo da lista.
          </p>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {doServidor.map((secao, i) => (
              <li
                key={secao.id}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5"
              >
                <span className="font-mono text-xs text-text-muted">{secao.id}</span>
                <span className="min-w-0 flex-1 text-base text-text-1">{secao.titulo}</span>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pendente || i === 0}
                  ariaDescribedBy={i === 0 ? extremoId : undefined}
                  onClick={() => mover(i, -1)}
                >
                  Subir
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pendente || i === doServidor.length - 1}
                  ariaDescribedBy={i === doServidor.length - 1 ? extremoId : undefined}
                  onClick={() => mover(i, 1)}
                >
                  Descer
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pendente}
                  onClick={() => excluir.mutate(secao.id)}
                >
                  Excluir
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
