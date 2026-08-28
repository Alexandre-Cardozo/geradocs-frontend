"use client"

import Link from "next/link"

import { InfoBanner, SectionBlock, Tag, Textarea } from "@/components/ui"
import { CaminhosDaSecao } from "@/components/documentos/caminhos-da-secao"
import { InlineSpinner } from "@/components/shared/estados"
import { useDotacoesDoProcesso, usePrevisaoNoPca, useProcesso } from "@/lib/api/hooks"
import type { DotacaoOrcamentaria } from "@/lib/api/procurement-client"
import { formatBRL, parseValorBR } from "@/lib/format"
import type { SecaoDocumento } from "@/lib/types"

/**
 * A dotação orçamentária, na seção que a pede.
 *
 * <p>Um painel, três seções: a Adequação Orçamentária do TR (Art. 6º, XXIII,
 * 'j'), a Dotação Orçamentária do Edital (Art. 150) e a cláusula do contrato
 * (Art. 92, VIII). É o mesmo crédito nas três, e escrevê-lo à mão em cada uma é
 * como duas delas passam a discordar.
 *
 * <p>O crédito não é declarado aqui: é declarado no processo, uma vez. Esta tela
 * o mostra, confronta o total com o valor estimado — que é o que a palavra
 * "adequação" significa — e monta o parágrafo.
 *
 * <p><b>No TR a seção tem duas metades.</b> A alínea 'j' pede a dotação
 * <i>e</i> a previsão no PCA vigente; o Art. 150 e o Art. 92, VIII pedem só o
 * crédito. Por isso a verificação do PCA aparece no TR e não no Edital nem no
 * Contrato — mostrar metade da seção e chamá-la de pronta seria pior do que não
 * ajudar.
 */
export function PainelDotacao({
  secao,
  processoId,
  rascunho,
  setRascunho,
  gerando,
  onGerarComIa,
  comPrevisaoNoPca = false,
}: {
  secao: SecaoDocumento
  processoId: string
  rascunho: string
  setRascunho: (v: string) => void
  gerando: boolean
  onGerarComIa: () => void
  /** Só o TR: a alínea 'j' pede a dotação **e** a previsão no PCA vigente. */
  comPrevisaoNoPca?: boolean
}) {
  const dotacoes = useDotacoesDoProcesso(processoId)
  const processo = useProcesso(processoId)
  const { verificacao } = usePrevisaoNoPca(comPrevisaoNoPca ? processoId : "")

  if (dotacoes.isPending || processo.isPending) {
    return (
      <SectionBlock title={secao.titulo} hint={secao.hint ?? ""}>
        <InlineSpinner label="Consultando a dotação orçamentária do processo..." />
      </SectionBlock>
    )
  }

  const creditos = dotacoes.data ?? []
  const total = creditos.reduce((soma, d) => soma + parseValorBR(d.valor), 0)
  const estimado = processo.data?.valorEstimado ?? 0
  const falta = estimado - total
  const pca = comPrevisaoNoPca ? (verificacao.data ?? null) : null
  const previstos = pca?.achados.filter((a) => a.previsto).length ?? 0

  return (
    <SectionBlock title={secao.titulo} hint={secao.hint ?? ""}>
      <div className="flex flex-col gap-3.5">
        {creditos.length === 0 ? (
          <InfoBanner tone="warning">
            Nenhuma dotação declarada neste processo. O <strong>Art. 150 da Lei 14.133/21</strong>{" "}
            não admite contratação sem a indicação dos créditos orçamentários — a ausência é causa
            de nulidade do ato.{" "}
            <Link
              href={`/processos/detalhe?id=${encodeURIComponent(processoId)}`}
              className="font-semibold underline"
            >
              Declare a dotação no processo
            </Link>
            ; ela vale para o TR, o Edital e o Contrato de uma vez.
          </InfoBanner>
        ) : (
          <>
            <TabelaDeCreditos creditos={creditos} />
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-ice px-3.5 py-3">
              <span className="text-sm text-text-3">
                Total dos créditos{" "}
                <strong className="font-mono text-base text-petroleum">{formatBRL(total)}</strong> ·
                valor estimado{" "}
                <strong className="font-mono text-base text-petroleum">
                  {formatBRL(estimado)}
                </strong>
              </span>
              {falta > 0 ? (
                <Tag tone="warning">Faltam {formatBRL(falta)} para cobrir a despesa</Tag>
              ) : (
                <Tag tone="success">A despesa está coberta</Tag>
              )}
            </div>
          </>
        )}

        {pca && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3.5 py-3">
            <span className="text-sm text-text-3">
              Previsão no PCA {pca.exercicio}:{" "}
              <strong className="text-text-1">
                {previstos} de {pca.achados.length}
              </strong>{" "}
              {pca.achados.length === 1 ? "demanda prevista" : "demandas previstas"}
            </span>
            {pca.previsto ? (
              <Tag tone="success">A contratação consta do plano</Tag>
            ) : (
              <Tag tone="warning">Há demanda sem previsão — justifique na seção</Tag>
            )}
          </div>
        )}

        <Textarea
          value={rascunho}
          onChange={(e) => setRascunho(e.target.value)}
          rows={6}
          placeholder="Preencha o conteúdo desta seção..."
        />

        <CaminhosDaSecao
          gerando={gerando}
          onGerarComIa={onGerarComIa}
          rascunhoAutomatico={
            creditos.length > 0
              ? {
                  rotulo: "Escrever a partir dos créditos",
                  onEscrever: () =>
                    setRascunho(
                      textoDaDotacao(creditos, total, estimado, pca?.citacao),
                    ),
                }
              : undefined
          }
        />
      </div>
    </SectionBlock>
  )
}

function TabelaDeCreditos({ creditos }: { creditos: DotacaoOrcamentaria[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-text-muted uppercase">
            <th className="py-2 pr-3 font-semibold">Programa de Trabalho</th>
            <th className="py-2 pr-3 font-semibold">Natureza da Despesa</th>
            <th className="py-2 pr-3 font-semibold">Fonte</th>
            <th className="py-2 pr-3 font-semibold">Exercício</th>
            <th className="py-2 text-right font-semibold">Valor</th>
          </tr>
        </thead>
        <tbody>
          {creditos.map((credito) => (
            <tr key={credito.id} className="border-b border-border-soft">
              <td className="py-2 pr-3 font-mono text-text-1">{credito.programaDeTrabalho}</td>
              <td className="py-2 pr-3 text-text-3">{credito.naturezaDaDespesa}</td>
              <td className="py-2 pr-3 text-text-3">{credito.fonteDeRecurso}</td>
              <td className="py-2 pr-3 font-mono text-text-3">{credito.exercicio}</td>
              <td className="py-2 text-right font-mono font-semibold text-petroleum">
                {formatBRL(parseValorBR(credito.valor))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * O parágrafo da seção, montado dos créditos declarados.
 *
 * <p>Cita cada crédito com a classificação funcional programática e a natureza
 * da despesa, que é o que o Art. 92, VIII exige nome por nome. E quando os
 * créditos não cobrem o valor estimado, deixa a lacuna em colchetes em vez de
 * afirmar adequação que os números não sustentam.
 */
export function textoDaDotacao(
  creditos: DotacaoOrcamentaria[],
  total: number,
  estimado: number,
  /** A citação do PCA, só no TR: a alínea 'j' pede as duas metades. */
  previsaoNoPca?: string,
): string {
  const linhas = creditos.map(
    (c) =>
      `- ${c.unidadeOrcamentaria} · Programa de Trabalho ${c.programaDeTrabalho}`
      + ` · Natureza da Despesa ${c.naturezaDaDespesa} · Fonte ${c.fonteDeRecurso}`
      + `${c.ficha ? ` · Ficha ${c.ficha}` : ""} · Exercício ${c.exercicio}`
      + ` · ${formatBRL(parseValorBR(c.valor))}`,
  )
  const falta = estimado - total
  return [
    "A despesa decorrente desta contratação correrá à conta dos seguintes créditos"
      + " orçamentários, na forma do Art. 92, VIII, da Lei 14.133/21:",
    linhas.join("\n"),
    `Total dos créditos indicados: ${formatBRL(total)}.`
      + ` Valor estimado da contratação: ${formatBRL(estimado)}.`,
    falta > 0
      ? `[Justificar a diferença de ${formatBRL(falta)} entre os créditos indicados e o valor`
        + " estimado, ou declarar os créditos restantes: o Art. 150 da Lei 14.133/21 exige a"
        + " indicação dos créditos para pagamento das parcelas contratuais vincendas no"
        + " exercício.]"
      : "Os créditos indicados suportam integralmente a despesa estimada no exercício.",
    // A outra metade da alínea 'j'. Vazia nos demais documentos, que não a pedem.
    ...(previsaoNoPca ? [previsaoNoPca] : []),
  ].join("\n\n")
}
