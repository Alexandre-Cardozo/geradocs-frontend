"use client"

import { useEffect, useState } from "react"

/** Quanto leva cada letra do balão. A frase inteira fica entre 1 e 2 segundos. */
const MS_POR_LETRA = 24

function movimentoReduzido() {
  return typeof window !== "undefined" && (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false)
}

/** A voz do navegador em português, quando existe. Sem ela, a Pri fala só por escrito. */
export function vozDisponivel(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window
}

/**
 * A fala da Pri (§130): o texto aparece letra a letra e, com a voz ligada, é
 * lido em voz alta. `falando` fica verdadeiro enquanto ela escreve ou fala, para
 * a boca da Pri acompanhar.
 */
export function useFalaDaPri(texto: string, comVoz: boolean) {
  // As letras são da frase em que foram contadas: frase nova começa do zero já
  // na renderização, sem esperar um quadro (que o navegador adia em aba sem foco).
  const [contagem, setContagem] = useState({ texto, letras: 0 })
  const letras = contagem.texto === texto ? contagem.letras : 0
  const [lendo, setLendo] = useState(false)

  useEffect(() => {
    if (movimentoReduzido()) {
      const pronto = window.setTimeout(() => setContagem({ texto, letras: texto.length }), 0)
      return () => window.clearTimeout(pronto)
    }
    let atual = 0
    const relogio = window.setInterval(() => {
      atual += 1
      setContagem({ texto, letras: atual })
      if (atual >= texto.length) window.clearInterval(relogio)
    }, MS_POR_LETRA)
    return () => window.clearInterval(relogio)
  }, [texto])

  useEffect(() => {
    if (!comVoz || !vozDisponivel()) return
    const sintese = window.speechSynthesis
    const fala = new SpeechSynthesisUtterance(texto)
    fala.lang = "pt-BR"
    const voz = sintese.getVoices().find((v) => v.lang.toLowerCase().startsWith("pt-br"))
    if (voz) fala.voice = voz
    fala.rate = 1.05
    fala.onstart = () => setLendo(true)
    fala.onend = () => setLendo(false)
    fala.onerror = () => setLendo(false)
    sintese.cancel()
    sintese.speak(fala)
    return () => {
      sintese.cancel()
      setLendo(false)
    }
  }, [texto, comVoz])

  const visivel = texto.slice(0, letras)
  return { visivel, completo: letras >= texto.length, falando: letras < texto.length || lendo }
}

/**
 * O balão de fala ao lado da Pri. O leitor de tela ouve a frase inteira de uma
 * vez (`sr-only`), não letra por letra; o resto da frase fica reservado em
 * transparente, para o balão não mudar de tamanho enquanto ela escreve.
 */
export function BalaoDaPri({ texto, visivel }: { texto: string; visivel: string }) {
  return (
    <div className="relative min-w-0 flex-1 rounded-card border border-on-dark-border bg-on-dark-fill px-4 py-3 text-md leading-snug text-on-dark">
      <p className="sr-only" aria-live="polite">
        {texto}
      </p>
      <p className="m-0" aria-hidden>
        {visivel}
        <span className="text-transparent">{texto.slice(visivel.length)}</span>
      </p>
    </div>
  )
}
