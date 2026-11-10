"use client"

import { useId, useState } from "react"

import { Button, Input } from "@/components/ui"
import { IconPencil, IconPlus, IconTrash, IconX } from "@/components/ui/icons"
import { inserirTabela, problemaDaTabela, substituirTabela, tabelaEmBranco, tabelasDoTexto } from "@/lib/dominio/tabela"

/**
 * O editor de tabela da seção (§101).
 *
 * <p>A tabela continua sendo texto, uma linha por linha da tabela e as células
 * separadas por "|" (ADR-062 do back-end). Quem prefere corrige ali mesmo; quem
 * não quer contar barras abre a tabela aqui, em grade, e o editor devolve ao
 * texto no mesmo formato. Fica numa linha só embaixo do campo, porque é
 * complemento: o campo de texto continua sendo a seção.
 */
export function TabelasDaSecao({ texto, onChange }: { texto: string; onChange: (texto: string) => void }) {
  const tabelas = tabelasDoTexto(texto)
  // `indice` nulo é a tabela nova, que ainda não está no texto.
  const [editando, setEditando] = useState<{ indice: number | null; linhas: string[][] } | null>(null)

  if (editando) {
    return (
      <EditorDeTabela
        linhas={editando.linhas}
        nova={editando.indice === null}
        onCancelar={() => setEditando(null)}
        onSalvar={(linhas) => {
          onChange(
            editando.indice === null ? inserirTabela(texto, linhas) : substituirTabela(texto, editando.indice, linhas),
          )
          setEditando(null)
        }}
        onExcluir={() => {
          if (editando.indice !== null) onChange(substituirTabela(texto, editando.indice, null))
          setEditando(null)
        }}
      />
    )
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
      <span className="font-semibold">Tabelas</span>
      {tabelas.map((tabela, i) => (
        <Button
          key={tabela.inicio}
          size="sm"
          variant="ghost"
          icon={<IconPencil size={13} />}
          title={tabela.linhas[0]?.join(" · ")}
          onClick={() => setEditando({ indice: i, linhas: tabela.linhas.map((linha) => [...linha]) })}
        >
          {`Editar tabela ${i + 1}`}
        </Button>
      ))}
      <Button
        size="sm"
        variant="ghost"
        icon={<IconPlus size={13} />}
        onClick={() => setEditando({ indice: null, linhas: tabelaEmBranco() })}
      >
        Inserir tabela
      </Button>
    </div>
  )
}

/** A grade: cabeçalho e linhas, com acrescentar e tirar linha e coluna. */
function EditorDeTabela({
  linhas: iniciais,
  nova,
  onSalvar,
  onCancelar,
  onExcluir,
}: {
  linhas: string[][]
  nova: boolean
  onSalvar: (linhas: string[][]) => void
  onCancelar: () => void
  onExcluir: () => void
}) {
  const [linhas, setLinhas] = useState(iniciais)
  const [excluindo, setExcluindo] = useState(false)
  const motivoId = useId()
  const colunas = linhas[0]?.length ?? 0
  const problema = problemaDaTabela(linhas)

  const trocar = (l: number, c: number, valor: string) =>
    setLinhas((atuais) => atuais.map((linha, i) => (i === l ? linha.map((cel, j) => (j === c ? valor : cel)) : linha)))
  const maisLinha = () => setLinhas((atuais) => [...atuais, Array<string>(colunas).fill("")])
  const maisColuna = () =>
    setLinhas((atuais) => atuais.map((linha, i) => [...linha, i === 0 ? `Coluna ${linha.length + 1}` : ""]))
  const semLinha = (l: number) => setLinhas((atuais) => atuais.filter((_, i) => i !== l))
  const semColuna = (c: number) => setLinhas((atuais) => atuais.map((linha) => linha.filter((_, j) => j !== c)))

  return (
    <div className="flex flex-col gap-2.5 rounded-lg border border-royal bg-surface p-3">
      <div className="text-sm font-semibold text-text-1">{nova ? "Nova tabela" : "Editar tabela"}</div>
      <div className="overflow-x-auto">
        <table className="border-collapse text-xs">
          <tbody>
            {linhas.map((linha, l) => (
              <tr key={l}>
                {linha.map((celula, c) => (
                  <td key={c} className="min-w-28 p-0.5 align-top">
                    <Input
                      value={celula}
                      onChange={(e) => trocar(l, c, e.target.value)}
                      ariaLabel={l === 0 ? `Cabeçalho da coluna ${c + 1}` : `Linha ${l}, coluna ${c + 1}`}
                      className={l === 0 ? "font-semibold" : ""}
                    />
                  </td>
                ))}
                <td className="p-0.5 align-middle">
                  {l > 0 && linhas.length > 2 && (
                    <Acao rotulo={`Tirar a linha ${l}`} onClick={() => semLinha(l)}>
                      <IconX size={13} />
                    </Acao>
                  )}
                </td>
              </tr>
            ))}
            {colunas > 2 && (
              <tr>
                {linhas[0]?.map((_, c) => (
                  <td key={c} className="p-0.5 text-center">
                    <Acao rotulo={`Tirar a coluna ${c + 1}`} onClick={() => semColuna(c)}>
                      <IconX size={13} />
                    </Acao>
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" icon={<IconPlus size={13} />} onClick={maisLinha}>
          Linha
        </Button>
        <Button size="sm" variant="secondary" icon={<IconPlus size={13} />} onClick={maisColuna}>
          Coluna
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" disabled={problema !== null} ariaDescribedBy={motivoId} onClick={() => onSalvar(linhas)}>
          {nova ? "Inserir no texto" : "Salvar tabela"}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        {!nova &&
          (excluindo ? (
            <>
              <span className="text-xs text-text-3">Tirar a tabela do texto?</span>
              <Button size="sm" variant="danger-soft" onClick={onExcluir}>
                Confirmar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setExcluindo(false)}>
                Manter
              </Button>
            </>
          ) : (
            <Button size="sm" variant="ghost" icon={<IconTrash size={13} />} onClick={() => setExcluindo(true)}>
              Excluir tabela
            </Button>
          ))}
        <p id={motivoId} className={problema ? "m-0 text-xs text-text-muted" : "sr-only"}>
          {problema ?? "A tabela volta ao texto da seção. Salve a seção para gravar."}
        </p>
      </div>
    </div>
  )
}

/** Ação de ícone, com o nome para quem não vê o ícone. */
function Acao({ rotulo, onClick, children }: { rotulo: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      onClick={onClick}
      className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm text-text-3 transition-colors hover:bg-ice hover:text-royal"
    >
      {children}
    </button>
  )
}
