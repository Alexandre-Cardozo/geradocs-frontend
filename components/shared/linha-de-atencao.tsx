"use client"

import { useId, useState, type ReactNode } from "react"

import { Button } from "@/components/ui"
import { IconCheckCircle, IconChevronDown, IconChevronRight, IconInfo } from "@/components/ui/icons"

/**
 * Os tons da linha, nos tokens do DS. Atenção usa a ardósia dos avisos (§95),
 * e não amarelo; resolvido usa o verde da marca; neutro é só registro.
 */
const TONS = {
  atencao: "border-tint-warning-border bg-tint-warning-bg text-tint-warning-fg",
  resolvido: "border-tint-success-border bg-tint-success-bg text-tint-success-fg",
  neutro: "border-border bg-surface text-text-2",
} as const

/**
 * A linha de atenção da seção (§115).
 *
 * <p>Um padrão só para o que a seção pede além do texto: a justificativa de
 * cláusula da minuta fora do texto (Art. 19, § 2º), a dispensa registrada
 * (Art. 18, § 2º), a memória de cálculo que diverge da estimativa, o item fora
 * do PCA. Cada um era um cartão do seu jeito, com título, parágrafo, lista e
 * campo abertos, e juntos empurravam o texto da seção para baixo.
 *
 * <p>A linha diz o que falta, com o fundamento, numa linha só; as ações ficam
 * à direita. O que é detalhe (a lista das cláusulas, o campo da justificativa)
 * abre na própria linha, a pedido, e fecha de novo.
 */
export function LinhaDeAtencao({
  tom = "atencao",
  children,
  acoes,
  detalhe,
}: {
  tom?: keyof typeof TONS
  /** O que a linha diz, numa frase. */
  children: ReactNode
  /** Botões à direita, quando a ação cabe num clique. */
  acoes?: ReactNode
  /** O que abre na própria linha: o rótulo do botão e o conteúdo. */
  detalhe?: { rotulo: string; rotuloAberto?: string; conteudo: ReactNode; abertoAoMontar?: boolean }
}) {
  const [aberta, setAberta] = useState(detalhe?.abertoAoMontar ?? false)
  const detalheId = useId()
  const Icone = tom === "resolvido" ? IconCheckCircle : IconInfo

  return (
    <div className={`flex flex-col rounded-lg border px-3.5 py-2 text-sm ${TONS[tom]}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex min-w-0 flex-1 items-center gap-2">
          <span className="flex shrink-0">
            <Icone size={15} />
          </span>
          <span className="min-w-0">{children}</span>
        </span>
        {(detalhe || acoes) && (
          // O texto dos botões alinha com a borda direita, e não com o recuo deles.
          <span className="-mr-2.5 flex flex-wrap items-center gap-1">
            {detalhe && (
              <Button
                size="sm"
                variant="ghost"
                icon={aberta ? <IconChevronDown size={13} /> : <IconChevronRight size={13} />}
                ariaExpanded={aberta}
                ariaControls={detalheId}
                onClick={() => setAberta((estava) => !estava)}
              >
                {aberta ? (detalhe.rotuloAberto ?? "Ocultar") : detalhe.rotulo}
              </Button>
            )}
            {acoes}
          </span>
        )}
      </div>
      {detalhe && aberta && (
        <div id={detalheId} className="mt-2 flex flex-col gap-2.5 border-t border-current/15 pt-2.5 text-text-2">
          {detalhe.conteudo}
        </div>
      )}
    </div>
  )
}
