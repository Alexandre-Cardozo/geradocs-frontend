"use client"

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react"

import { Button, ChoiceCard, InfoBanner } from "@/components/ui"
import { InlineSpinner } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { usePreviaDaTroca, useTrocarModelo } from "@/lib/api/hooks"
import { contar, resumoDaTroca } from "@/lib/documentos/troca"
import type { ModeloDeEstrutura, SecaoDocumento, TipoDocumento } from "@/lib/types"

const FOCAVEIS = 'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'

/**
 * A escolha da minuta, antes da primeira seção (§85).
 *
 * <p>Só aparece quando há mais de uma minuta aplicável — com uma só, o servidor
 * já abre o documento nela. Nada vem pré-selecionado: a escolha muda a
 * estrutura inteira do documento.
 */
export function EscolhaDoModelo({
  processoId,
  tipo,
  modelos,
}: {
  processoId: string
  tipo: TipoDocumento
  modelos: ModeloDeEstrutura[]
}) {
  const [escolhido, setEscolhido] = useState<string | null>(null)
  const trocar = useTrocarModelo(processoId, tipo)
  const showToast = useToast()
  const motivoId = useId()

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <h2 className="m-0 font-display text-lg font-bold text-text-1">Modelo do Documento</h2>
        <p className="m-0 mt-1 text-sm text-text-3">
          Há mais de um modelo para este {tipo}. Escolha o que vai estruturar as seções.
        </p>
      </div>
      <div role="radiogroup" aria-label="Minutas da AGU" className="flex flex-col gap-2.5">
        {modelos.map((modelo) => (
          <ChoiceCard
            key={modelo.codigo}
            size="small"
            selected={escolhido === modelo.codigo}
            onClick={() => setEscolhido(modelo.codigo)}
            title={`${modelo.titulo} (${modelo.publicadoEm})`}
            desc={`${modelo.doOrgao ? "Modelo do órgão. " : ""}${modelo.descricao} ${contar(modelo.quantidadeDeSecoes, "seção", "seções")}.`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <p id={motivoId} className={escolhido ? "sr-only" : "m-0 flex-1 text-xs text-text-muted"}>
          {escolhido ? "Minuta escolhida." : "Escolha uma minuta."}
        </p>
        <Button
          disabled={escolhido == null || trocar.isPending}
          ariaDescribedBy={escolhido == null ? motivoId : undefined}
          onClick={() =>
            escolhido &&
            trocar.mutate(escolhido, {
              onError: (erro) =>
                showToast(erro instanceof Error ? erro.message : "Não foi possível aplicar a minuta."),
            })
          }
        >
          {trocar.isPending ? "Aplicando..." : "Usar Esta Minuta"}
        </Button>
      </div>
    </div>
  )
}

/**
 * Trocar a minuta do documento, com a prévia do que acontece com o texto (§85).
 *
 * <p>É modal: o foco entra na janela, não sai dela pelo Tab, Esc fecha e, ao
 * fechar, volta para o botão que a abriu.
 */
export function TrocaDeModelo({
  processoId,
  tipo,
  modelos,
  versaoGerada,
  secoesAtuais,
  secoesDoServidor = 0,
  onFechar,
}: {
  processoId: string
  tipo: TipoDocumento
  modelos: ModeloDeEstrutura[]
  /** A versão já gerada; zero quando o documento ainda não foi gerado. */
  versaoGerada: number
  /** Quantas seções o documento tem hoje, como o trilho as conta (§90). */
  secoesAtuais: number
  /** As criadas pelo servidor: acompanham a troca e entram na conta da minuta nova. */
  secoesDoServidor?: number
  onFechar: () => void
}) {
  const opcoes = modelos.filter((modelo) => !modelo.atual)
  const [escolhido, setEscolhido] = useState<string | null>(opcoes.length === 1 ? (opcoes[0]?.codigo ?? null) : null)
  const previa = usePreviaDaTroca(processoId, tipo, escolhido)
  const trocar = useTrocarModelo(processoId, tipo)
  const showToast = useToast()
  const janela = useRef<HTMLDivElement>(null)
  const tituloId = useId()
  const motivoId = useId()
  const pronta = escolhido != null && previa.data != null
  const destino = opcoes.find((modelo) => modelo.codigo === escolhido)
  const secoesNovas = destino ? destino.quantidadeDeSecoes + secoesDoServidor : 0
  const resumo = previa.data && destino ? resumoDaTroca(previa.data, secoesAtuais, secoesNovas) : null

  useEffect(() => {
    const quemAbriu = document.activeElement instanceof HTMLElement ? document.activeElement : null
    janela.current?.querySelector<HTMLElement>(FOCAVEIS)?.focus()
    return () => quemAbriu?.focus()
  }, [])

  const fechar = () => {
    if (!trocar.isPending) onFechar()
  }

  const teclado = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation()
      fechar()
      return
    }
    if (e.key !== "Tab" || !janela.current) return
    const focaveis = Array.from(janela.current.querySelectorAll<HTMLElement>(FOCAVEIS))
    const primeiro = focaveis[0]
    const ultimo = focaveis[focaveis.length - 1]
    if (e.shiftKey && document.activeElement === primeiro) {
      e.preventDefault()
      ultimo?.focus()
    } else if (!e.shiftKey && document.activeElement === ultimo) {
      e.preventDefault()
      primeiro?.focus()
    }
  }

  const confirmar = () => {
    if (!escolhido) return
    trocar.mutate(escolhido, {
      onSuccess: () => {
        const agora = destino ? ` Agora são ${contar(secoesNovas, "seção", "seções")}.` : ""
        showToast(`Minuta trocada.${agora}${versaoGerada > 0 ? " A próxima geração será a retificação." : ""}`)
        onFechar()
      },
      onError: (erro) => showToast(erro instanceof Error ? erro.message : "Não foi possível trocar a minuta."),
    })
  }

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-navy/50" aria-hidden onClick={fechar} />
      <div
        ref={janela}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        onKeyDown={teclado}
        className="relative flex max-h-full w-full max-w-xl flex-col gap-4 overflow-y-auto rounded-card border border-border bg-surface p-5"
      >
        <h2 id={tituloId} className="m-0 font-display text-md font-bold text-text-1">
          Trocar Modelo
        </h2>

        <div role="radiogroup" aria-label="Minutas da AGU" className="flex flex-col gap-2">
          {opcoes.map((modelo) => (
            <ChoiceCard
              key={modelo.codigo}
              size="small"
              selected={escolhido === modelo.codigo}
              onClick={() => setEscolhido(modelo.codigo)}
              title={`${modelo.titulo} (${modelo.publicadoEm})`}
              desc={`${modelo.doOrgao ? "Modelo do órgão. " : ""}${modelo.descricao} ${contar(modelo.quantidadeDeSecoes, "seção", "seções")}.`}
            />
          ))}
        </div>

        {escolhido && previa.isPending && <InlineSpinner label="Conferindo o texto já escrito..." />}
        {previa.isError && (
          <InfoBanner tone="warning">Não foi possível conferir o texto já escrito.</InfoBanner>
        )}
        {resumo && (
          <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-ice px-4 py-3 text-sm text-text-2">
            <strong className="text-text-1">{resumo.estrutura}</strong>
            <ul className="m-0 flex list-disc flex-col gap-1 pl-4">
              {resumo.destinos.map((linha) => (
                <li key={linha}>{linha}</li>
              ))}
              {resumo.emBranco && <li>{resumo.emBranco}</li>}
            </ul>
            {resumo.guardado && <span className="text-text-3">{resumo.guardado}</span>}
          </div>
        )}
        {versaoGerada > 0 && (
          <InfoBanner tone="warning">
            A versão {versaoGerada} já foi gerada. A próxima geração será a retificação, no novo modelo.
          </InfoBanner>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <p id={motivoId} className={pronta ? "sr-only" : "m-0 flex-1 text-xs text-text-muted"}>
            {pronta ? "Pronto para trocar." : "Escolha a minuta para ver o que acontece com o texto."}
          </p>
          <Button variant="ghost" disabled={trocar.isPending} onClick={fechar}>
            Cancelar
          </Button>
          <Button
            disabled={!pronta || trocar.isPending}
            ariaDescribedBy={pronta ? undefined : motivoId}
            onClick={confirmar}
          >
            {trocar.isPending ? "Trocando..." : "Trocar Modelo"}
          </Button>
        </div>
      </div>
    </div>
  )
}

/**
 * O texto e as notas da minuta, na seção que os tem (§85).
 *
 * <p>O texto nunca entra sozinho: é texto federal (Compras.gov.br, SICAF) que o
 * município adapta. Com algo já escrito, substituir pede confirmação.
 */
export function ApoioDaMinuta({
  secao,
  rascunho,
  setRascunho,
}: {
  secao: SecaoDocumento
  rascunho: string
  setRascunho: (texto: string) => void
}) {
  const [confirmando, setConfirmando] = useState(false)
  const texto = secao.textoDaMinuta
  const notas = secao.notasDaMinuta ?? []
  if (!texto && notas.length === 0) return null

  const usar = () => {
    if (!texto) return
    if (rascunho.trim() === "") {
      setRascunho(texto)
      return
    }
    setConfirmando(true)
  }

  return (
    <div className="flex flex-col gap-2">
      {texto && !confirmando && (
        <div>
          <Button size="sm" variant="secondary" onClick={usar}>
            Usar o Texto da Minuta
          </Button>
        </div>
      )}
      {texto && confirmando && (
        <InfoBanner tone="warning">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span>Substituir o texto atual pelo da minuta?</span>
            <span className="flex gap-2">
              <Button
                size="sm"
                onClick={() => {
                  setRascunho(texto)
                  setConfirmando(false)
                }}
              >
                Substituir
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
                Manter o Atual
              </Button>
            </span>
          </div>
        </InfoBanner>
      )}
      {notas.length > 0 && (
        <details className="rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-3">
          <summary className="cursor-pointer font-semibold text-text-2">Notas da AGU ({notas.length})</summary>
          <ul className="m-0 mt-2 flex list-disc flex-col gap-1.5 pl-4">
            {notas.map((nota) => (
              <li key={nota}>{nota}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

/**
 * O texto guardado de seções que não estão na estrutura atual (§85).
 *
 * <p>É o que a troca de minuta não teve onde pôr. Na seção, aparece só o texto
 * do mesmo assunto, com Inserir nesta Seção; na etapa final, o que não tem seção
 * correspondente, para nada se perder.
 */
export function TextosDeOutroModelo({
  textos,
  titulo = "Textos de Outro Modelo",
  onInserir,
}: {
  textos: { secao: string; titulo: string; texto: string }[]
  titulo?: string
  /** Ausente, o texto fica só para leitura — não há seção aberta onde inserir. */
  onInserir?: (texto: string) => void
}) {
  if (textos.length === 0) return null
  return (
    <details className="mt-4 rounded-card border border-border bg-surface px-4 py-3 text-sm">
      <summary className="cursor-pointer font-semibold text-text-2">
        {titulo} ({textos.length})
      </summary>
      <ul className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
        {textos.map((texto) => (
          <li key={texto.secao} className="flex flex-col gap-1.5 border-t border-border-soft pt-3">
            <span className="font-semibold text-text-1">{texto.titulo}</span>
            <span className={`whitespace-pre-line text-text-3 ${onInserir ? "line-clamp-3" : ""}`}>{texto.texto}</span>
            {onInserir && (
              <span>
                <Button size="sm" variant="ghost" onClick={() => onInserir(texto.texto)}>
                  Inserir nesta Seção
                </Button>
              </span>
            )}
          </li>
        ))}
      </ul>
    </details>
  )
}
