"use client"

import { useEffect, useRef, useState } from "react"

import { Button, Dropdown, FormField, InfoBanner } from "@/components/ui"
import { CampoDeFonteDePreco } from "@/components/shared/campo-de-fonte-de-preco"
import { useToast } from "@/components/shared/providers"
import {
  useDeclararEstimativa,
  useDocumentos,
  useProcesso,
} from "@/lib/api/hooks"
import {
  divergenciasDaMemoria,
  documentosDaEstimativa,
  enumerar,
  memoriaEmDia,
  resumoDaEstimativa,
} from "@/lib/dominio/estimativa"
import { ehFonteCanonica } from "@/lib/dominio/fontes-de-preco"
import { ROTULO_DO_METODO } from "@/lib/dominio/pesquisa-de-precos"
import type { MetodoDaEstimativa } from "@/lib/types"

/** O tempo sem digitar depois do qual a fonte digitada à mão é gravada. */
const ESPERA_DA_FONTE_LIVRE_MS = 800

/**
 * A forma de cálculo e a fonte da estimativa de valor — do **processo**
 * (ADR-051 do back-end).
 *
 * <p>Aparece nas seções que estimam o valor (ETP, TR e Cotação) e grava ao
 * escolher: antes a escolha só existia como uma linha da memória de cálculo, e
 * se perdia quando a memória era escrita à mão. Trocar aqui troca nos três
 * documentos — e a tela diz isso, para ninguém achar que mexeu só neste.
 *
 * <p>Documento já gerado não muda: cada versão é um retrato. Antes de trocar o
 * método com documento gerado, a tela avisa que ele pede retificação.
 *
 * @param legado o que as memórias já escritas declaram — gravado no processo na
 *               primeira abertura, para a escolha antiga não se perder
 */
export function EstimativaDoProcesso({
  processoId,
  comFonte = true,
  legado,
}: {
  processoId: string
  comFonte?: boolean
  legado?: { metodo?: MetodoDaEstimativa | null; fonte?: string | null }
}) {
  const processo = useProcesso(processoId)
  const documentos = useDocumentos()
  const declarar = useDeclararEstimativa()
  const { mutate } = declarar
  const showToast = useToast()

  const estimativa = processo.data?.estimativa
  const [fonte, setFonte] = useState(estimativa?.fonte ?? "")
  const [fonteSincronizada, setFonteSincronizada] = useState(estimativa?.fonte)
  if (estimativa?.fonte !== fonteSincronizada) {
    setFonteSincronizada(estimativa?.fonte)
    setFonte(estimativa?.fonte ?? "")
  }
  /** O método escolhido que espera a confirmação, quando há documento gerado. */
  const [metodoPendente, setMetodoPendente] = useState<MetodoDaEstimativa | null>(null)

  const aberto = processo.data != null && processo.data.status !== "concluido"

  const gravar = (mudanca: { metodo?: MetodoDaEstimativa; fonte?: string }) => {
    mutate(
      { processoId, metodo: estimativa?.metodo, fonte: estimativa?.fonte, ...mudanca },
      {
        onError: (erro) =>
          showToast(erro instanceof Error ? erro.message : "Não foi possível gravar a estimativa."),
      },
    )
  }

  // A fonte digitada à mão grava quando a pessoa para de digitar — gravar a
  // cada tecla encheria a trilha de fontes pela metade.
  useEffect(() => {
    const digitada = fonte.trim()
    if (!aberto || digitada === "" || digitada === estimativa?.fonte || ehFonteCanonica(digitada)) return
    const espera = setTimeout(() => {
      mutate({ processoId, metodo: estimativa?.metodo, fonte: digitada })
    }, ESPERA_DA_FONTE_LIVRE_MS)
    return () => clearTimeout(espera)
  }, [fonte, aberto, estimativa?.fonte, estimativa?.metodo, processoId, mutate])

  // A escolha antiga, que só existia no texto, vai para o processo uma vez.
  const migrou = useRef(false)
  useEffect(() => {
    if (migrou.current || !aberto) return
    const metodo = estimativa?.metodo ? undefined : (legado?.metodo ?? undefined)
    const fonteAntiga = estimativa?.fonte ? undefined : (legado?.fonte ?? undefined)
    if (!metodo && !fonteAntiga) return
    migrou.current = true
    mutate({
      processoId,
      metodo: estimativa?.metodo ?? metodo,
      fonte: estimativa?.fonte ?? fonteAntiga,
    })
  }, [aberto, estimativa?.metodo, estimativa?.fonte, legado?.metodo, legado?.fonte, processoId, mutate])

  if (processo.isPending || !processo.data) return null

  const alcancados = documentosDaEstimativa(processo.data.documentos)
  const gerados = documentosDaEstimativa(
    (documentos.data ?? [])
      .filter((documento) => documento.processoId === processoId)
      .map((documento) => documento.tipo),
  )

  if (!aberto) {
    return (
      <div className="rounded-lg border border-border bg-ice px-4 py-3 text-sm text-text-3">
        <strong className="text-text-1">Estimativa do processo:</strong>{" "}
        {resumoDaEstimativa(estimativa) ?? "não declarada"}.
      </div>
    )
  }

  const escolherMetodo = (escolha: string) => {
    const metodo = escolha === "" ? undefined : (escolha as MetodoDaEstimativa)
    if (metodo === estimativa?.metodo) return
    if (metodo && gerados.length > 0) {
      setMetodoPendente(metodo)
      return
    }
    gravar({ metodo })
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-ice px-4 py-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-text-1">Estimativa do Processo</span>
        <span className="text-xs text-text-muted">
          {declarar.isPending
            ? "Gravando..."
            : `Vale para ${alcancados.length > 0 ? enumerar(alcancados) : "todo o processo"}`}
        </span>
      </div>
      <div className={`grid grid-cols-1 gap-3 ${comFonte ? "md:grid-cols-2" : ""}`}>
        <FormField
          label="Forma de Cálculo"
          required
          hint="Art. 6º, IN SEGES/ME nº 65/2021."
        >
          <Dropdown
            value={metodoPendente ?? estimativa?.metodo ?? ""}
            onChange={escolherMetodo}
            ariaLabel="Forma de Cálculo"
            options={[
              { value: "", label: "Média (padrão)" },
              ...(Object.keys(ROTULO_DO_METODO) as MetodoDaEstimativa[]).map((metodo) => ({
                value: metodo,
                label: ROTULO_DO_METODO[metodo],
              })),
            ]}
          />
        </FormField>
        {comFonte && (
          <FormField
            label="Fonte de Pesquisa de Preços"
            required
            hint="Art. 23, § 1º, Lei 14.133/21."
          >
            <CampoDeFonteDePreco
              value={fonte}
              onChange={(escolhida) => {
                setFonte(escolhida)
                // Da lista grava na hora; a digitada espera a pessoa parar.
                if (ehFonteCanonica(escolhida)) gravar({ fonte: escolhida })
              }}
            />
          </FormField>
        )}
      </div>

      {metodoPendente && (
        <InfoBanner tone="warning">
          <div className="flex flex-col gap-2">
            <span>
              {enumerar(gerados)} {gerados.length === 1 ? "já foi gerado" : "já foram gerados"} e não
              muda{gerados.length === 1 ? "" : "m"} sozinho{gerados.length === 1 ? "" : "s"}: retifique
              depois da troca.
            </span>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => {
                  gravar({ metodo: metodoPendente })
                  setMetodoPendente(null)
                }}
              >
                Trocar a Forma de Cálculo
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setMetodoPendente(null)}>
                Manter a Atual
              </Button>
            </div>
          </div>
        </InfoBanner>
      )}

    </div>
  )
}

/**
 * O aviso de que a memória de cálculo ficou para trás da estimativa do processo.
 *
 * <p>A memória é o texto que o documento imprime, e a pessoa pode tê-la escrito
 * à mão. Quando ela cita outra fonte ou outro método — ou não cita —, a tela
 * avisa e oferece pôr em dia só essas linhas. Reescrever sozinha apagaria o que
 * a pessoa escreveu.
 */
export function AvisoDaMemoria({
  rascunho,
  setRascunho,
  estimativa,
  comPesquisa,
}: {
  rascunho: string
  setRascunho: (texto: string) => void
  estimativa: { metodo?: MetodoDaEstimativa; fonte?: string } | undefined
  comPesquisa: boolean
}) {
  const showToast = useToast()
  const divergencias = divergenciasDaMemoria(rascunho, estimativa, comPesquisa)
  if (!estimativa || (!divergencias.fonte && !divergencias.metodo)) return null

  const avisos: string[] = []
  if (divergencias.metodo === "diferente") {
    avisos.push("cita outra forma de cálculo")
  }
  if (divergencias.metodo === "ausente") avisos.push("não cita a forma de cálculo")
  if (divergencias.fonte === "diferente") avisos.push("cita outra fonte")
  if (divergencias.fonte === "ausente") avisos.push("não cita a fonte")
  const soAcrescenta = divergencias.metodo !== "diferente" && divergencias.fonte !== "diferente"

  return (
    <div className="mt-4">
      <InfoBanner tone="warning">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>A memória de cálculo {enumerar(avisos)}.</span>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setRascunho(memoriaEmDia(rascunho, estimativa, divergencias))
              showToast("Memória atualizada. Revise e salve a seção.")
            }}
          >
            {soAcrescenta ? "Incluir na Memória" : "Atualizar a Memória"}
          </Button>
        </div>
      </InfoBanner>
    </div>
  )
}
