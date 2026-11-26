"use client"

import { useEffect, useImperativeHandle, useRef, type Ref } from "react"

import type { AcaoDaPri, AcaoDoBo, Expressao, OpcoesDaAcao } from "@/components/mascotes/catalogo"
import { GovBo as MotorDoBo } from "@/components/mascotes/govbo"
import { GovPri as MotorDaPri, type OpcoesDaPri } from "@/components/mascotes/govpri"

export type { AcaoDaPri, AcaoDoBo, Expressao } from "@/components/mascotes/catalogo"

/** O que um componente pai pode mandar o mascote fazer na hora (ex.: clicar). */
export type ControleDoMascote<Acao extends string> = {
  expressar: (id: Expressao) => boolean
  agir: (id: Acao, opcoes?: OpcoesDaAcao) => boolean
}

type Motor = { pausar(): void; retomar(): void; destruir(): void }

/** Pausa o laço de animação enquanto o mascote está fora da tela. */
function pausarForaDaTela(elemento: Element, motor: Motor): () => void {
  if (typeof IntersectionObserver === "undefined") return () => {}
  const observador = new IntersectionObserver(([registro]) => {
    if (registro?.isIntersecting) motor.retomar()
    else motor.pausar()
  })
  observador.observe(elemento)
  return () => observador.disconnect()
}

type PropsComuns = {
  expressao?: Expressao
  olharCursor?: boolean
  className?: string
}

/**
 * GovBô, o Agente Técnico (§127): a identidade da automação e da IA. Decorativo
 * (`aria-hidden`): o texto ao redor diz o que importa.
 */
export function GovBo({
  expressao = "neutro",
  acao,
  repetir = false,
  sombra = true,
  olharCursor = true,
  className,
  ref,
}: PropsComuns & {
  acao?: AcaoDoBo
  /** A ação recomeça ao terminar (ex.: pular sem parar). */
  repetir?: boolean
  sombra?: boolean
  ref?: Ref<ControleDoMascote<AcaoDoBo>>
}) {
  const caixa = useRef<HTMLDivElement>(null)
  const motor = useRef<MotorDoBo | null>(null)

  useEffect(() => {
    const elemento = caixa.current
    if (!elemento) return
    const bo = new MotorDoBo(elemento, { olharCursor, sombra })
    motor.current = bo
    const soltar = pausarForaDaTela(elemento, bo)
    return () => {
      soltar()
      bo.destruir()
      motor.current = null
    }
  }, [olharCursor, sombra])

  useEffect(() => {
    motor.current?.expressar(expressao)
  }, [expressao])

  useEffect(() => {
    if (acao) motor.current?.agir(acao, { repetir })
  }, [acao, repetir])

  useImperativeHandle(
    ref,
    () => ({
      expressar: (id) => motor.current?.expressar(id) ?? false,
      agir: (id, opcoes) => motor.current?.agir(id, opcoes) ?? false,
    }),
    [],
  )

  return <div ref={caixa} aria-hidden data-mascote="govbo" className={className} />
}

/**
 * GovPri, a Assistente de Relações (§127): a cara humana nos pontos de contato
 * com o cliente. Decorativa, como o GovBô.
 */
export function GovPri({
  expressao = "neutro",
  acao,
  manter = false,
  falando = false,
  corpo = "busto",
  olharCursor = true,
  className,
  ref,
}: PropsComuns & {
  acao?: AcaoDaPri
  /** A pose fica até a próxima ação, mesmo as que voltariam sozinhas (ex.: acenar sem parar). */
  manter?: boolean
  /** A boca alterna fonemas enquanto for verdadeiro. */
  falando?: boolean
  corpo?: OpcoesDaPri["corpo"]
  ref?: Ref<ControleDoMascote<AcaoDaPri>>
}) {
  const caixa = useRef<HTMLDivElement>(null)
  const motor = useRef<MotorDaPri | null>(null)

  useEffect(() => {
    const elemento = caixa.current
    if (!elemento) return
    const pri = new MotorDaPri(elemento, { corpo, olharCursor })
    motor.current = pri
    const soltar = pausarForaDaTela(elemento, pri)
    return () => {
      soltar()
      pri.destruir()
      motor.current = null
    }
  }, [corpo, olharCursor])

  useEffect(() => {
    motor.current?.expressar(expressao)
  }, [expressao])

  useEffect(() => {
    if (acao) motor.current?.agir(acao, { manter })
  }, [acao, manter])

  useEffect(() => {
    motor.current?.falar(falando)
  }, [falando])

  useImperativeHandle(
    ref,
    () => ({
      expressar: (id) => motor.current?.expressar(id) ?? false,
      agir: (id, opcoes) => motor.current?.agir(id, opcoes) ?? false,
    }),
    [],
  )

  return <div ref={caixa} aria-hidden data-mascote="govpri" className={className} />
}
