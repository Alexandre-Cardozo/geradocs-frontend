"use client"

import { IconCheck } from "@/components/ui/icons"
import type { Opcao } from "@/lib/onboarding/roteiro"

/** O círculo da opção: vazio, ou preenchido com o check quando escolhida (seleção do DS). */
function Marcador({ marcado, quadrado = false }: { marcado: boolean; quadrado?: boolean }) {
  return (
    <span
      aria-hidden
      className={`flex size-6 shrink-0 items-center justify-center border-2 transition-colors duration-150 ${
        quadrado ? "rounded-md" : "rounded-full"
      } ${marcado ? "border-royal bg-royal text-surface" : "border-border bg-surface"}`}
    >
      {marcado && <IconCheck size={13} strokeWidth={3.5} />}
    </span>
  )
}

const CARTAO =
  "flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-card px-4 py-3 text-left transition-colors duration-150"

function estilo(marcado: boolean) {
  return marcado ? "border-2 border-royal bg-tint-royal-bg" : "border border-border bg-ice hover:border-royal"
}

/**
 * Escolha única (§130): tocar já escolhe, e a etapa avança sozinha, como no
 * formato que inspirou o onboarding. Teclado: Tab entre as opções, Enter ou
 * espaço para escolher.
 */
export function OpcoesUnicas<T extends string>({
  opcoes,
  valor,
  rotuladoPor,
  aoEscolher,
}: {
  opcoes: Opcao<T>[]
  valor: T | undefined
  rotuladoPor: string
  aoEscolher: (valor: T) => void
}) {
  return (
    <div role="radiogroup" aria-labelledby={rotuladoPor} className="flex flex-col gap-2.5">
      {opcoes.map((opcao) => {
        const marcado = opcao.valor === valor
        return (
          <button
            key={opcao.valor}
            type="button"
            role="radio"
            aria-checked={marcado}
            onClick={() => aoEscolher(opcao.valor)}
            className={`${CARTAO} ${estilo(marcado)}`}
          >
            <span className="flex flex-col">
              <span className="font-semibold text-text-1">{opcao.rotulo}</span>
              {opcao.detalhe && <span className="text-sm text-text-3">{opcao.detalhe}</span>}
            </span>
            <Marcador marcado={marcado} />
          </button>
        )
      })}
    </div>
  )
}

/** Escolha múltipla: marca e desmarca, e quem avança é o botão Continuar. */
export function OpcoesMultiplas<T extends string>({
  opcoes,
  valores,
  rotuladoPor,
  aoAlternar,
}: {
  opcoes: Opcao<T>[]
  valores: T[]
  rotuladoPor: string
  aoAlternar: (valor: T) => void
}) {
  return (
    <div role="group" aria-labelledby={rotuladoPor} className="flex flex-col gap-2.5">
      {opcoes.map((opcao) => {
        const marcado = valores.includes(opcao.valor)
        return (
          <button
            key={opcao.valor}
            type="button"
            role="checkbox"
            aria-checked={marcado}
            onClick={() => aoAlternar(opcao.valor)}
            className={`${CARTAO} ${estilo(marcado)}`}
          >
            <span className="font-semibold text-text-1">{opcao.rotulo}</span>
            <Marcador marcado={marcado} quadrado />
          </button>
        )
      })}
    </div>
  )
}
