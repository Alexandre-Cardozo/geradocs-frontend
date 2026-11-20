"use client"

import { useEffect, useId, useState } from "react"

import { Button, InfoBanner, Tag, ValidationMsg } from "@/components/ui"
import { IconSparkles } from "@/components/ui/icons"
import { InlineSpinner } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { useClausulasCondicionais, useEstadoDaIa, useSugerirClausulas, useTirarClausulas } from "@/lib/api/hooks"
import {
  idsSugeridosParaTirar,
  ROTULO_DO_VEREDITO,
  saiComAMae,
  type SugestaoDaClausula,
  temClausulaCondicional,
  TOM_DO_VEREDITO,
  totalQueSai,
} from "@/lib/documentos/clausulas-condicionais"
import { semLinhasEmBranco } from "@/lib/dominio/tabela"
import type { TipoDocumento } from "@/lib/types"

/** Quanto esperar depois da última tecla para analisar o texto: a cada letra seria uma chamada. */
const ATRASO_DA_ANALISE_MS = 600

/** O valor só muda depois de `ms` sem novas mudanças. */
function useComAtraso<T>(valor: T, ms: number): T {
  const [atrasado, setAtrasado] = useState(valor)
  useEffect(() => {
    const espera = setTimeout(() => setAtrasado(valor), ms)
    return () => clearTimeout(espera)
  }, [valor, ms])
  return atrasado
}

const SEM_ESCOLHA: ReadonlySet<string> = new Set()

const plural = (n: number, singular: string, plural: string) => `${n} ${n === 1 ? singular : plural}`

/**
 * As cláusulas "(Se for o caso)" da minuta, para o servidor escolher quais tirar (ADR 107; ADR-078 do back-end).
 *
 * <p>A minuta traz dezenas delas, e tirar a que não é o caso é o uso esperado (Art. 19, § 2º, Lei 14.133/21 não
 * pede justificativa para isso). O painel as lista, a IA sugere quais provavelmente não se aplicam, e **quem decide
 * é quem assina**: nada sai sem o clique, e o texto só é gravado quando a pessoa salva a seção. Depois de tirar,
 * dá para desfazer.
 *
 * <p>O painel não aparece na seção sem a marcação.
 */
export function ClausulasCondicionais({
  processoId,
  tipo,
  secaoId,
  texto,
  onTextoChange,
}: {
  processoId: string
  tipo: TipoDocumento
  secaoId: string
  texto: string
  onTextoChange: (texto: string) => void
}) {
  const showToast = useToast()
  const estadoDaIa = useEstadoDaIa()
  const sugerir = useSugerirClausulas(processoId, tipo)
  const tirar = useTirarClausulas(processoId, tipo)
  const motivoDaIaId = useId()
  const motivoDeTirarId = useId()

  // A lista é do texto que o servidor analisou. Enquanto a pessoa digita, ela espera a pausa para não pedir uma
  // análise por letra, e as ações ficam desabilitadas até a lista voltar a ser do texto que está na tela.
  const analisado = useComAtraso(texto, ATRASO_DA_ANALISE_MS)
  const analise = useClausulasCondicionais(processoId, tipo, secaoId, analisado, temClausulaCondicional(analisado))
  const clausulas = analise.data ?? []

  // Escolha e sugestão guardam o texto a que pertencem: os identificadores das cláusulas valem só para aquele texto
  // exato, e com outro texto apontariam para a linha errada. Em vez de zerar num efeito, a seleção que não é do
  // texto analisado agora simplesmente não vale.
  const [selecao, setSelecao] = useState<{
    doTexto: string
    escolhidas: ReadonlySet<string>
    sugestoes: SugestaoDaClausula[] | null
  }>({ doTexto: analisado, escolhidas: SEM_ESCOLHA, sugestoes: null })
  const vale = selecao.doTexto === analisado
  const escolhidas = vale ? selecao.escolhidas : SEM_ESCOLHA
  const sugestoes = vale ? selecao.sugestoes : null
  const mudarSelecao = (mudanca: Partial<{ escolhidas: ReadonlySet<string>; sugestoes: SugestaoDaClausula[] | null }>) =>
    setSelecao({ doTexto: analisado, escolhidas, sugestoes, ...mudanca })

  // O "Desfazer" vale para o texto que saiu da remoção: se a pessoa seguir editando, ele já não restauraria o que
  // ela vê, e não aparece.
  const [removido, setRemovido] = useState<{ textoAntes: string; textoDepois: string; tiradas: number } | null>(null)
  const desfazer = removido && texto === removido.textoDepois ? removido : null

  if (!temClausulaCondicional(texto) && !desfazer) return null

  const emDia = texto === analisado && !analise.isFetching
  const sugestaoDe = (id: string) => sugestoes?.find((s) => s.clausulaId === id)
  const saem = totalQueSai(clausulas, escolhidas)
  const sugeridas = sugestoes ? idsSugeridosParaTirar(sugestoes) : []

  const motivoDaIa =
    estadoDaIa === "verificando"
      ? "Verificando a IA..."
      : estadoDaIa === "sem-modelo"
        ? "Nenhum modelo de IA configurado nesta instalação."
        : estadoDaIa === "teto-esgotado"
          ? "O teto de IA do mês acabou. Fale com o administrador da plataforma."
          : estadoDaIa === "sem-teto"
            ? "A IA não está liberada para esta entidade. Fale com o administrador da plataforma."
            : "A IA lê o objeto, a modalidade, o valor e os itens do DFD, e só sugere: nada sai sem o seu clique."
  const iaIndisponivel = estadoDaIa !== "disponivel"

  const alternar = (id: string) => {
    const novas = new Set(escolhidas)
    if (!novas.delete(id)) novas.add(id)
    mudarSelecao({ escolhidas: novas })
  }

  const pedirSugestao = () =>
    sugerir.mutate(
      { secaoId, texto: analisado },
      {
        onSuccess: (resposta) => {
          mudarSelecao({ sugestoes: resposta })
          if (idsSugeridosParaTirar(resposta).length === 0) {
            showToast("A IA não achou cláusula que claramente não se aplique. Decida pelo texto de cada uma.")
          }
        },
        onError: (erro) =>
          showToast(erro instanceof Error && erro.message ? erro.message : "Não foi possível pedir a sugestão da IA."),
      },
    )

  const tirarEscolhidas = () =>
    tirar.mutate(
      { secaoId, texto: analisado, clausulaIds: [...escolhidas] },
      {
        onSuccess: (novoTexto) => {
          // O editor grava o texto sem linhas em branco (§102).
          const textoDepois = semLinhasEmBranco(novoTexto)
          setRemovido({ textoAntes: texto, textoDepois, tiradas: saem })
          // O que foi escolhido acabou de sair: a escolha e a sugestão não valem mais para o texto novo.
          mudarSelecao({ escolhidas: SEM_ESCOLHA, sugestoes: null })
          onTextoChange(textoDepois)
        },
        onError: (erro) => {
          // O servidor recusa quando o texto mudou depois da análise: a lista nova resolve.
          void analise.refetch()
          showToast(erro instanceof Error && erro.message ? erro.message : "Não foi possível tirar as cláusulas.")
        },
      },
    )

  const desfazerRemocao = () => {
    if (!desfazer) return
    onTextoChange(desfazer.textoAntes)
    setRemovido(null)
  }

  return (
    <section
      aria-labelledby="titulo-das-clausulas-condicionais"
      className="mt-4 flex flex-col gap-3 rounded-card border border-border bg-surface p-4"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3 id="titulo-das-clausulas-condicionais" className="m-0 font-display text-base font-bold text-text-1">
          Cláusulas Condicionais da Minuta
        </h3>
        {clausulas.length > 0 && <Tag tone="info">{plural(clausulas.length, "cláusula", "cláusulas")}</Tag>}
      </div>
      <p className="m-0 text-sm text-text-3">
        A minuta traz cláusulas marcadas com &quot;(Se for o caso)&quot;. Tire as que não se aplicam a esta
        contratação: tirar a cláusula que não é o caso é o uso esperado da minuta e não pede justificativa. O texto só
        é gravado quando você salvar a seção.
      </p>

      {desfazer && (
        <InfoBanner tone="success">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>
              {plural(desfazer.tiradas, "cláusula tirada", "cláusulas tiradas")} do texto. Ele ainda não foi salvo.
            </span>
            <Button size="sm" variant="ghost" onClick={desfazerRemocao}>
              Desfazer
            </Button>
          </span>
        </InfoBanner>
      )}

      {analise.isPending && analise.fetchStatus !== "idle" && (
        <InlineSpinner label="Procurando as cláusulas condicionais..." />
      )}
      {analise.isError && (
        <div className="flex flex-col gap-2">
          <ValidationMsg type="error" msg="Não foi possível listar as cláusulas condicionais." />
          <span>
            <Button size="sm" variant="secondary" onClick={() => void analise.refetch()}>
              Tentar de Novo
            </Button>
          </span>
        </div>
      )}
      {analise.isSuccess && clausulas.length === 0 && (
        <p className="m-0 text-sm text-text-3">Este texto já não tem cláusulas condicionais.</p>
      )}

      {clausulas.length > 0 && (
        <>
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={<IconSparkles size={14} />}
                disabled={iaIndisponivel || !emDia || sugerir.isPending}
                ariaDescribedBy={motivoDaIaId}
                onClick={pedirSugestao}
              >
                {sugerir.isPending ? "Analisando..." : sugestoes ? "Sugerir de Novo com IA" : "Sugerir com IA"}
              </Button>
              {sugeridas.length > 0 && (
                <Button size="sm" variant="ghost" onClick={() => mudarSelecao({ escolhidas: new Set(sugeridas) })}>
                  {`Marcar as Sugeridas (${sugeridas.length})`}
                </Button>
              )}
            </div>
            <p id={motivoDaIaId} className="m-0 text-sm text-text-3">
              {motivoDaIa}
            </p>
          </div>

          {/* Desatualizada (o texto mudou e a lista ainda não voltou): esmaecida, para não parecer que vale. */}
          <ul
            aria-busy={!emDia}
            className={`m-0 flex list-none flex-col gap-2 p-0 transition-opacity ${emDia ? "" : "opacity-60"}`}
          >
            {clausulas.map((clausula) => {
              const sugestao = sugestaoDe(clausula.id)
              const comAMae = saiComAMae(clausula, escolhidas)
              const marcada = escolhidas.has(clausula.id) || comAMae
              const idDaCaixa = `${motivoDeTirarId}-${clausula.id}`
              return (
                <li key={clausula.id} className={clausula.paiId ? "ml-6" : undefined}>
                  <label
                    htmlFor={idDaCaixa}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 ${
                      marcada ? "border-tint-royal-border bg-tint-royal-bg" : "border-border-soft bg-surface"
                    }`}
                  >
                    <input
                      id={idDaCaixa}
                      type="checkbox"
                      className="mt-1 size-4 shrink-0 accent-royal"
                      checked={marcada}
                      disabled={comAMae || !emDia}
                      onChange={() => alternar(clausula.id)}
                    />
                    <span className="flex min-w-0 flex-col gap-1">
                      {/* A prévia já começa pela numeração da minuta ("10.2. (Se for o caso) ..."). */}
                      <span className="text-sm text-text-2">{clausula.previa}</span>
                      <span className="flex flex-wrap items-center gap-1.5">
                        {clausula.alternativa && <Tag tone="info">Alternativa: escolha uma</Tag>}
                        {comAMae && <Tag tone="neutral">Sai junto com a cláusula-mãe</Tag>}
                        {sugestao && <Tag tone={TOM_DO_VEREDITO[sugestao.veredito]}>{ROTULO_DO_VEREDITO[sugestao.veredito]}</Tag>}
                      </span>
                      {sugestao && sugestao.veredito !== "indeterminada" && (
                        <span className="text-sm text-text-3">{sugestao.motivo}</span>
                      )}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          <div className="flex flex-col gap-1.5">
            <span>
              <Button
                size="sm"
                disabled={escolhidas.size === 0 || !emDia || tirar.isPending}
                ariaDescribedBy={motivoDeTirarId}
                onClick={tirarEscolhidas}
              >
                {tirar.isPending ? "Tirando..." : `Tirar ${plural(saem, "Cláusula", "Cláusulas")}`}
              </Button>
            </span>
            <p id={motivoDeTirarId} className="m-0 text-sm text-text-3">
              {!emDia
                ? "Atualizando a lista com o texto atual..."
                : escolhidas.size === 0
                  ? "Marque as cláusulas que não se aplicam a esta contratação."
                  : saem > escolhidas.size
                    ? "Os subitens das cláusulas marcadas saem junto. Você pode desfazer depois."
                    : "Você pode desfazer depois."}
            </p>
          </div>
        </>
      )}
    </section>
  )
}
