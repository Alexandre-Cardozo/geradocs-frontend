"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react"

import { FaixaDaMarca } from "@/components/shared/marca"
import { MarcaCarregando } from "@/components/shared/marca-carregando"
import { duracaoDaRevelacao, movimentoReduzido, suavizar, trechoRevelado } from "@/lib/dominio/revelacao"

/** De quanto em quanto tempo a etapa anunciada troca. */
const TROCA_DE_ETAPA_MS = 1800

/**
 * A IA trabalhando (§107): o símbolo da marca se desenhando, a etapa do
 * pedido escrita nas cores da marca e a borda do cartão com as cores correndo.
 *
 * <p>Com `etapas`, a frase troca sozinha ("Lendo o processo", "Redigindo a
 * seção"...), e o leitor de tela ouve só o anúncio fixo, para não ouvir uma
 * frase nova a cada segundo. Com `rotulo`, a frase é uma só e é ela que se
 * anuncia, como na revisão ("Revisando 2 de 5: Objeto").
 */
export function IaTrabalhando({
  etapas,
  rotulo,
  anuncio = "A IA está trabalhando.",
  moldura = true,
}: {
  etapas?: readonly string[]
  rotulo?: string
  anuncio?: string
  /** Sem a borda colorida, quando o cartão em volta já a tem. */
  moldura?: boolean
}) {
  const [indice, setIndice] = useState(0)

  useEffect(() => {
    if (!etapas || etapas.length < 2) return
    const relogio = setInterval(() => setIndice((atual) => (atual + 1) % etapas.length), TROCA_DE_ETAPA_MS)
    return () => clearInterval(relogio)
  }, [etapas])

  const frase = rotulo ?? etapas?.[indice % etapas.length] ?? anuncio

  return (
    <div
      role="status"
      data-ia="trabalhando"
      className={`flex items-center gap-3 rounded-md ${moldura ? "ia-aura px-4 py-3" : "pt-1"}`}
    >
      <MarcaCarregando tamanho={26} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {rotulo !== undefined ? (
          <span className="ia-texto-magico truncate text-base font-semibold">{frase}</span>
        ) : (
          <>
            <span className="sr-only">{anuncio}</span>
            <span key={frase} aria-hidden className="ia-texto-magico animate-ia-surgir truncate text-base font-semibold">
              {frase}
            </span>
          </>
        )}
        <FaixaDaMarca className="w-full max-w-60 opacity-80" />
      </div>
    </div>
  )
}

/** O alvo está numa área que não recebe o texto da IA (a orientação, por exemplo)? */
function foraDaEscrita(alvo: EventTarget): boolean {
  return alvo instanceof Element && alvo.closest("[data-ia-fora-da-escrita]") !== null
}

/** O que a escrita em andamento precisa lembrar entre um quadro e outro. */
interface Escrita {
  alvo: string
  aplicar: (texto: string) => void
  quadro: number
}

/**
 * A escrita do texto da IA no campo (§107).
 *
 * <p>`revelar(alvo, aplicar)` chama `aplicar` com pedaços cada vez maiores do
 * texto, palavra por palavra, até o texto inteiro, em pouco mais de um segundo.
 * Quem chama continua dono do estado: o gancho só decide **quando** cada
 * pedaço entra. Com movimento reduzido, ou fora do navegador, `aplicar` recebe
 * o texto inteiro de uma vez, como sempre foi.
 *
 * <p>Ninguém perde o que digita. `interceptar` vai na área que contém o campo:
 * a primeira tecla, colagem ou clique durante a escrita **completa** o texto (a
 * tecla não é digitada no meio dele), e qualquer outra entrada no campo (o
 * corretor do sistema, um preenchimento automático) **para** a escrita sem
 * sobrescrever o que entrou.
 *
 * <p>O que fica dentro de `[data-ia-fora-da-escrita]` (a orientação à IA, por
 * exemplo) não recebe o texto, e por isso não interfere na escrita: digitar ali
 * nem completa nem para nada.
 *
 * <p>A entrada é ouvida na **borbulha**, e não na captura. Na captura, parar a
 * escrita fazia o React re-renderizar antes de o campo processar a digitação,
 * e o campo controlado voltava ao valor anterior: o que se digitava durante a
 * escrita sumia.
 */
export function useRevelacaoDaIa() {
  const [escrevendo, setEscrevendo] = useState(false)
  const escrita = useRef<Escrita | null>(null)

  const encerrar = useCallback(() => {
    if (escrita.current) cancelAnimationFrame(escrita.current.quadro)
    escrita.current = null
    setEscrevendo(false)
  }, [])

  /** Para a escrita onde está. O texto fica como estiver. */
  const cancelar = useCallback(() => {
    if (escrita.current) encerrar()
  }, [encerrar])

  /** Termina a escrita na hora, com o texto inteiro. */
  const concluir = useCallback(() => {
    const atual = escrita.current
    if (!atual) return
    encerrar()
    atual.aplicar(atual.alvo)
  }, [encerrar])

  const revelar = useCallback(
    (alvo: string, aplicar: (texto: string) => void) => {
      cancelar()
      if (movimentoReduzido(typeof window === "undefined" ? undefined : window) || alvo === "") {
        aplicar(alvo)
        return
      }
      const duracao = duracaoDaRevelacao(alvo)
      let inicio: number | null = null
      const passo = (agora: number) => {
        const atual = escrita.current
        if (!atual) return
        inicio ??= agora
        const fracao = (agora - inicio) / duracao
        if (fracao >= 1) {
          encerrar()
          aplicar(alvo)
          return
        }
        aplicar(trechoRevelado(alvo, suavizar(fracao)))
        atual.quadro = requestAnimationFrame(passo)
      }
      escrita.current = { alvo, aplicar, quadro: requestAnimationFrame(passo) }
      setEscrevendo(true)
    },
    [cancelar, encerrar],
  )

  useEffect(() => () => {
    if (escrita.current) cancelAnimationFrame(escrita.current.quadro)
  }, [])

  /** Os ouvintes da área que contém o campo; sem escrita, não fazem nada. */
  const interceptar = {
    onKeyDownCapture: (e: KeyboardEvent<HTMLElement>) => {
      if (!escrita.current || foraDaEscrita(e.target)) return
      // Tab e modificadores sozinhos só mudam o foco ou preparam um atalho.
      if (["Tab", "Shift", "Control", "Alt", "Meta"].includes(e.key)) return
      if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) e.preventDefault()
      concluir()
    },
    onPasteCapture: (e: ClipboardEvent<HTMLElement>) => {
      if (!escrita.current || foraDaEscrita(e.target)) return
      e.preventDefault()
      concluir()
    },
    onDropCapture: (e: DragEvent<HTMLElement>) => {
      if (!escrita.current || foraDaEscrita(e.target)) return
      e.preventDefault()
      concluir()
    },
    onPointerDownCapture: () => concluir(),
    onInput: (e: FormEvent<HTMLElement>) => {
      if (!foraDaEscrita(e.target)) cancelar()
    },
  }

  return { escrevendo, revelar, concluir, cancelar, interceptar }
}

/**
 * Um texto da IA que aparece escrito, e não colado (§107): a sugestão de
 * redação do DFD, por exemplo. Só mostra; o texto completo continua com quem
 * chama, e é ele que vai para o campo quando a pessoa escolhe usá-lo.
 */
export function TextoRevelado({ texto, className = "" }: { texto: string; className?: string }) {
  const { revelar, escrevendo, concluir } = useRevelacaoDaIa()
  const [visivel, setVisivel] = useState("")

  useEffect(() => {
    revelar(texto, setVisivel)
  }, [texto, revelar])

  return (
    <p
      className={`${className} ${escrevendo ? "cursor-pointer" : ""}`}
      // Clicar no texto que está sendo escrito mostra o resto na hora.
      onClick={escrevendo ? concluir : undefined}
      aria-busy={escrevendo || undefined}
    >
      {/* O leitor de tela lê o texto inteiro, e não pedaços. */}
      <span aria-hidden={escrevendo || undefined}>{visivel}</span>
      {escrevendo && <span className="sr-only">{texto}</span>}
    </p>
  )
}
