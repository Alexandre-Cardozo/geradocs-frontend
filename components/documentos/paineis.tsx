"use client"

import { useState } from "react"

import {
  Button,
  ChoiceCard,
  FileUpload,
  FormField,
  InfoBanner,
  SectionBlock,
  Textarea,
} from "@/components/ui"
import { IconCheck, IconCheckCircle, IconFileText } from "@/components/ui/icons"
import { CaminhosDaSecao } from "@/components/documentos/caminhos-da-secao"
import { InlineSpinner } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { CampoDeFonteDePreco } from "@/components/shared/campo-de-fonte-de-preco"
import { Th } from "@/components/shared/tabela"
import {
  useColetasDoProcesso,
  useConsolidacaoDaDemanda,
  useDfdsDoProcesso,
  useProcesso,
  useSecoes,
} from "@/lib/api/hooks"
import type { DfdAnexado, ItemConsolidado } from "@/lib/api/procurement-client"
import { fonteDeclarada, fundamentoDaFonte, PREFIXO_DA_FONTE } from "@/lib/dominio/fontes-de-preco"
import {
  apurar,
  chaveDoItem,
  metodoDeclarado,
  porItem,
  ROTULO_DO_METODO,
  type MetodoDeApuracao,
} from "@/lib/dominio/pesquisa-de-precos"
import { rotuloDaUnidade } from "@/lib/dominio/unidades"
import { formatBRL, formatNumeroBR, parseValorBR } from "@/lib/format"
import type { ModoATA, PainelSecao, Processo, SecaoDocumento } from "@/lib/types"

/**
 * Painéis especiais do editor de documentos.
 *
 * Uma seção declara qual painel usa em `SecaoDocumento.painel` (ver
 * `lib/documentos/secoes.ts`); o editor genérico só olha esse metadado, e não
 * o título da seção.
 */

interface PainelProps {
  secao: SecaoDocumento
  /** Os painéis leem o que o processo já registrou — itens, DFDs, valor. */
  processoId: string
  /** Conteúdo em edição da seção — os painéis alimentam a memória de cálculo. */
  rascunho: string
  setRascunho: (v: string) => void
  /**
   * A geração por IA da seção.
   *
   * <p>Vem de cima porque é o editor que sabe pedir e receber. O rascunho da
   * plataforma **não substitui** a IA: os dois ficam lado a lado, e o texto já
   * escrito é o que o modelo recebe como base.
   */
  gerando: boolean
  onGerarComIa: () => void
}

/** Renderiza o painel da seção, quando ela tiver um. */
export function PainelDaSecao(props: PainelProps) {
  const painel: PainelSecao | undefined = props.secao.painel
  if (painel === "necessidade") return <PainelNecessidade {...props} />
  if (painel === "quantidades") return <PainelQuantidades {...props} />
  if (painel === "valor") return <PainelValor {...props} />
  return null
}

/**
 * A necessidade pública — ETP, Art. 18, § 1º, I; TR, Art. 6º, XXIII, 'b'.
 *
 * <p>Serve os dois: a fundamentação do TR referencia o ETP e demonstra a mesma
 * necessidade. O painel se rotula pela seção que o hospeda, e por isso cita o
 * fundamento certo em cada documento.
 *
 * <p>A seção pede o <b>problema</b> sob a perspectiva do interesse público, e
 * não a solução pretendida. Nada disso a plataforma sabe: ela sabe o objeto que
 * o processo declarou, quais secretarias formalizaram a demanda e o que cada
 * uma pediu — e é com isso que monta o parágrafo de abertura, deixando entre
 * colchetes exatamente o que só quem conduz o processo pode escrever.
 *
 * <p>Rascunho, e dito como rascunho. Escrever a necessidade por inferência e
 * apresentá-la como pronta seria a plataforma assinando no lugar de quem
 * responde pelo documento.
 */
function PainelNecessidade({
  secao,
  processoId,
  rascunho,
  setRascunho,
  gerando,
  onGerarComIa,
}: PainelProps) {
  const processo = useProcesso(processoId)
  const dfds = useDfdsDoProcesso(processoId)
  const showToast = useToast()

  const registrados = dfds.data ?? []
  const temBase = processo.data != null && registrados.length > 0

  return (
    <SectionBlock title={secao.titulo} hint={secao.hint ?? ""}>
      <div className="flex flex-col gap-3">
        {temBase && (
          <p className="m-0 text-sm text-text-muted">
            O processo já registra o objeto da demanda e{" "}
            {registrados.length === 1
              ? "o DFD de uma secretaria"
              : `os DFDs de ${registrados.length} secretarias`}
            . O rascunho parte daí — o problema a resolver continua sendo seu para escrever.
          </p>
        )}

        <FormField
          label="Descrição da Necessidade"
          required
          hint="O problema sob a perspectiva do interesse público — quem assina responde pelo texto."
        >
          <Textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            rows={10}
            placeholder="Descreva o problema a ser resolvido, e não a solução pretendida..."
          />
        </FormField>

        <CaminhosDaSecao
          gerando={gerando}
          onGerarComIa={onGerarComIa}
          rascunhoAutomatico={
            temBase
              ? {
                  rotulo: rascunho.trim() === "" ? "Escrever o rascunho" : "Refazer o rascunho",
                  onEscrever: () => {
                    setRascunho(rascunhoDaNecessidade(processo.data!, registrados))
                    showToast("Rascunho escrito a partir do processo. Revise antes de salvar.")
                  },
                }
              : undefined
          }
        />
      </div>
    </SectionBlock>
  )
}

/**
 * O rascunho da necessidade a partir do que o processo já registrou.
 *
 * <p>Afirma só o que está registrado — objeto, secretarias requisitantes, itens
 * — e marca entre colchetes o que é juízo: o problema, a consequência de não
 * contratar e o alinhamento com o planejamento da unidade.
 */
export function rascunhoDaNecessidade(processo: Processo, dfds: DfdAnexado[]): string {
  const secretarias = [...new Set(dfds.map((dfd) => dfd.secretaria))]
  const origem =
    secretarias.length === 1
      ? `pela ${secretarias[0]}`
      : `pelas seguintes secretarias requisitantes: ${secretarias.join(", ")}`
  const partes = [
    `A presente contratação tem por objeto ${processo.objetoDemanda ?? processo.objeto}, `
      + `demanda formalizada ${origem} por meio dos respectivos Documentos de Formalização de `
      + "Demanda juntados a este processo.",
    "[Descrever o problema a ser resolvido sob a perspectiva do interesse público — a situação "
      + "atual, o que ela impede ou compromete no serviço prestado, e a consequência de a "
      + "contratação não se realizar.]",
  ]
  const itens = dfds.flatMap((dfd) => dfd.itens.map((item) => item.descricao))
  if (itens.length > 0) {
    partes.push(
      `A necessidade compreende ${itens.length === 1 ? "o item" : "os itens"}: `
        + `${[...new Set(itens)].join("; ")}.`,
    )
  }
  partes.push(
    "[Indicar o alinhamento da contratação com o planejamento da unidade e com os instrumentos "
      + "de planejamento do órgão.]",
  )
  return partes.join("\n\n")
}

/**
 * As quantidades — ETP, Art. 18, § 1º, IV; TR, Art. 6º, XXIII, 'a'.
 *
 * <p>Serve os dois: o objeto do TR se define "com natureza, quantitativos e
 * unidades de medida", que é a mesma consolidação dos DFDs.
 *
 * <p>Os números vêm dos itens que as secretarias pediram nos DFDs, somados pelo
 * servidor. Antes eram três campos com valores fixos do protótipo — 150,00,
 * "Unidade", "12 meses" — que ninguém digitava e nada salvava: a tela exibia
 * quantidade inventada numa peça que vai ao controle.
 *
 * <p>O que a lei pede aqui é a <b>memória de cálculo</b>, e é ela que a seção
 * guarda. A plataforma escreve o rascunho a partir da consolidação — item,
 * quantidade e secretaria de origem —, e quem assina revisa. Sem itens
 * informados, não há o que rascunhar, e a tela diz onde informá-los.
 */
function PainelQuantidades({
  secao,
  processoId,
  rascunho,
  setRascunho,
  gerando,
  onGerarComIa,
}: PainelProps) {
  const consolidacao = useConsolidacaoDaDemanda(processoId)
  const showToast = useToast()

  const itens = consolidacao.data?.itens ?? []

  return (
    <SectionBlock title={secao.titulo} hint={secao.hint ?? ""}>
      {consolidacao.isPending ? (
        <InlineSpinner label="Somando o que as secretarias pediram..." />
      ) : consolidacao.isError ? (
        <InfoBanner tone="warning">
          Não foi possível ler a demanda consolidada agora. Você pode escrever a memória de
          cálculo mesmo assim.
        </InfoBanner>
      ) : itens.length === 0 ? (
        <InfoBanner tone="warning">
          Nenhum item informado nos DFDs deste processo. As quantidades saem de lá — informe-as
          na demanda consolidada do processo, e elas aparecem aqui somadas por secretaria.
        </InfoBanner>
      ) : (
        <div className="flex flex-col gap-3">
          <TabelaDeQuantidades itens={itens} />
        </div>
      )}

      <div className="mt-4">
        <FormField
          label="Memória de Cálculo"
          required
          hint="A lei exige a memória de cálculo e os documentos que lhe dão suporte. O rascunho acima é ponto de partida — quem assina responde pelo texto."
        >
          <Textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            rows={8}
            placeholder="Ex: Quantidade estimada com base no levantamento realizado junto às 30 unidades escolares da rede municipal. Média de 5 equipamentos por unidade, considerando substituição de equipamentos com mais de 8 anos de uso..."
          />
        </FormField>
      </div>

      <div className="mt-4">
        <CaminhosDaSecao
          gerando={gerando}
          onGerarComIa={onGerarComIa}
          rascunhoAutomatico={
            itens.length > 0
              ? {
                  rotulo:
                    rascunho.trim() === ""
                      ? "Escrever a memória a partir dos DFDs"
                      : "Refazer a partir dos DFDs",
                  onEscrever: () => {
                    setRascunho(memoriaDasQuantidades(itens))
                    showToast(
                      "Memória de cálculo preenchida a partir dos DFDs. Revise antes de salvar.",
                    )
                  },
                }
              : undefined
          }
        />
      </div>
    </SectionBlock>
  )
}

/** O que cada secretaria pediu e o total por item. */
function TabelaDeQuantidades({ itens }: { itens: ItemConsolidado[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-ice">
            <Th>Item</Th>
            <Th>Unidade</Th>
            <Th>Origem</Th>
            <Th>Total</Th>
          </tr>
        </thead>
        <tbody>
          {itens.map((item) => (
            <tr key={item.descricao} className="border-t border-border-soft">
              <td className="px-2.5 py-2 font-medium text-text-1">{item.descricao}</td>
              <td className="px-2.5 py-2 text-xs text-text-3">{rotuloDaUnidade(item.unidade)}</td>
              <td className="px-2.5 py-2 text-xs text-text-3">
                {item.porSecretaria
                  .map((o) => `${o.secretaria}: ${formatNumeroBR(o.quantidade)}`)
                  .join(" · ")}
              </td>
              <td className="px-2.5 py-2 font-mono text-xs font-semibold text-text-1">
                {/*
                  Unidades divergentes não somam: mostrar um total ali seria a
                  plataforma afirmando um número que ninguém pode usar.
                */}
                {item.somavel ? formatNumeroBR(item.total) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * O rascunho da memória de cálculo a partir da consolidação.
 *
 * <p>Diz de onde veio cada quantidade — é isso que a lei chama de memória — e
 * deixa entre colchetes o que só quem conduz o processo sabe: o critério que
 * levou àquela quantidade.
 */
export function memoriaDasQuantidades(itens: ItemConsolidado[]): string {
  const linhas = itens.map((item) => {
    const origens = item.porSecretaria
      .map((o) => `${o.secretaria} (${formatNumeroBR(o.quantidade)} ${o.unidade})`)
      .join("; ")
    const total = item.somavel
      ? `${formatNumeroBR(item.total)} ${item.unidade}`
      : "total não somável — as secretarias usaram unidades diferentes"
    return `- ${item.descricao}: ${total}. Origem: ${origens}.`
  })
  return [
    "As quantidades abaixo resultam da consolidação dos Documentos de Formalização de Demanda "
      + "apresentados pelas secretarias requisitantes:",
    ...linhas,
    "[Descrever o critério que fundamenta as quantidades — histórico de consumo, demanda "
      + "projetada, número de unidades atendidas — e os documentos que lhe dão suporte.]",
  ].join("\n\n")
}

/**
 * O valor estimado — ETP, Art. 18, § 1º, VI; TR, Art. 6º, XXIII, 'i'; e o
 * preço de referência da Cotação, Art. 23, caput.
 *
 * <p>Serve os três: é sempre o mesmo total, apurado dos mesmos itens, com a
 * mesma memória de cálculo e a mesma fonte de pesquisa de preços. Ter o painel
 * só no ETP obrigava a redigitar à mão, no TR e na Cotação, número que a
 * plataforma já tinha — e dois números digitados duas vezes divergem.
 *
 * <p>Antes eram três campos fixos do protótipo — 150,00 × R$ 3.233,33 =
 * R$ 484.999,50 — que não vinham do processo, não iam para lugar nenhum e
 * apareciam idênticos em toda contratação. Agora o total é calculado dos itens
 * que as secretarias pediram, item a item, e comparado com o valor que o
 * processo declarou na abertura: a diferença entre os dois é informação, e
 * escondê-la seria deixar a estimativa se contradizer em silêncio.
 *
 * <p>Item sem preço informado não vira zero — entra como pendência, porque zero
 * é um preço e "ninguém estimou" é outra coisa.
 */
function PainelValor({
  secao,
  processoId,
  rascunho,
  setRascunho,
  gerando,
  onGerarComIa,
}: PainelProps) {
  const dfds = useDfdsDoProcesso(processoId)
  const processo = useProcesso(processoId)
  const coletas = useColetasDoProcesso(processoId)
  /*
    O método de apuração é o que a **Cotação** declarou, e não um padrão desta
    tela: se o ETP somasse pela média enquanto a Cotação adotou a mediana, as
    duas peças do mesmo processo apresentariam valores diferentes para a mesma
    contratação. Só se consulta quando a Cotação é um dos documentos escolhidos.
  */
  const temCotacao = processo.data?.documentos.includes("Cotação") ?? false
  const secoesDaCotacao = useSecoes(temCotacao ? processoId : "", "Cotação")
  const metodo =
    metodoDeclarado(
      (secoesDaCotacao.data ?? []).find((secao) => secao.painel === "referencia")?.conteudo
        ?? "",
    ) ?? "media"
  const showToast = useToast()
  /*
    A fonte vive na memória de cálculo, e é de lá que ela volta. Antes era só
    estado da aba: a marcação sumia ao trocar de seção, e a escolha que o
    controle vai procurar no documento não estava em lugar nenhum (§70).
  */
  const declarada = fonteDeclarada(rascunho)
  const [fonte, setFonte] = useState(declarada ?? "")
  const [sincronizada, setSincronizada] = useState(declarada)
  if (declarada !== sincronizada) {
    setSincronizada(declarada)
    if (declarada) setFonte(declarada)
  }

  /*
    O preço vem da pesquisa quando ela existe.

    Antes vinha sempre do `unitPrice` que a secretaria digitou no DFD. Esse
    número é exigido — Decreto 10.947/2022, Art. 8º, IV —, mas a própria norma o
    chama de estimativa **preliminar**, obtida por **procedimento simplificado**,
    e ele serve ao PCA. O valor da contratação é o do Art. 23 e sai da pesquisa
    de preços (§74). Enquanto não houver coleta, a preliminar segue valendo — e a
    tela diz qual das duas está usando, em vez de apresentar as duas como a mesma
    coisa.
  */
  const pesquisados = porItem(coletas.data ?? [])
  const apuradoDe = (descricao: string) =>
    pesquisados.find((i) => chaveDoItem(i.item) === chaveDoItem(descricao))

  const itens = (dfds.data ?? []).flatMap((dfd) =>
    dfd.itens.map((item) => {
      const pesquisa = apuradoDe(item.descricao)
      return {
        ...item,
        dfd: dfd.nomeDoArquivo,
        secretaria: dfd.secretaria,
        /** O preço que vale para este item, e de onde ele veio. */
        precoApurado: pesquisa ? apurar(pesquisa, metodo) : null,
        precosColetados: pesquisa?.precos.length ?? 0,
      }
    }),
  )
  const precoDe = (item: (typeof itens)[number]) =>
    item.precoApurado ?? parseValorBR(item.valorUnitario ?? "0")
  const precificados = itens.filter((item) => item.precoApurado != null || item.valorUnitario)
  const semPreco = itens.filter((item) => item.precoApurado == null && !item.valorUnitario)
  const daPesquisa = itens.filter((item) => item.precoApurado != null)
  const total = precificados.reduce(
    (soma, item) => soma + parseValorBR(item.quantidade) * precoDe(item),
    0,
  )
  const valorDeclarado = processo.data?.valorEstimado ?? 0

  return (
    <SectionBlock title={secao.titulo} hint={secao.hint ?? ""}>
      {dfds.isPending ? (
        <InlineSpinner label="Somando os itens precificados..." />
      ) : itens.length === 0 ? (
        <InfoBanner tone="warning">
          Nenhum item informado nos DFDs deste processo. O valor sai da quantidade e do preço
          unitário de cada item — informe-os na demanda consolidada do processo.
        </InfoBanner>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ValorApurado
              rotulo="Total dos itens precificados"
              valor={total}
              detalhe={
                daPesquisa.length > 0
                  ? `${daPesquisa.length} de ${itens.length} ${itens.length === 1 ? "item" : "itens"} com preço apurado na pesquisa (${ROTULO_DO_METODO[metodo].toLowerCase()})`
                  : `${precificados.length} de ${itens.length} ${itens.length === 1 ? "item" : "itens"} com preço informado`
              }
            />
            <ValorApurado
              rotulo="Valor declarado na abertura"
              valor={valorDeclarado}
              detalhe={
                total === 0 || valorDeclarado === 0
                  ? "Sem base de comparação"
                  : `Diferença de ${formatBRL(Math.abs(valorDeclarado - total))} (${total > valorDeclarado ? "acima" : "abaixo"} do declarado)`
              }
            />
          </div>

          {daPesquisa.length < precificados.length && (
            <InfoBanner tone="info">
              {daPesquisa.length === 0
                ? "Nenhum item tem preço apurado na pesquisa: o total abaixo usa a estimativa preliminar dos DFDs"
                : `${precificados.length - daPesquisa.length} item(ns) ainda usam a estimativa preliminar dos DFDs`}{" "}
              — que o <strong>Decreto 10.947/2022, Art. 8º, IV</strong> define como obtida por
              procedimento simplificado, para o PCA. O valor da contratação é o do{" "}
              <strong>Art. 23 da Lei 14.133/21</strong> e sai da pesquisa de preços: registre as
              coletas na Cotação do processo.
            </InfoBanner>
          )}

          {semPreco.length > 0 && (
            <InfoBanner tone="warning">
              {semPreco.length === 1 ? "Um item ainda não tem" : `${semPreco.length} itens ainda não têm`}{" "}
              preço unitário informado: {semPreco.map((i) => i.descricao).join(", ")}. Enquanto
              faltarem, o total apurado fica abaixo do que a contratação custa.
            </InfoBanner>
          )}

        </div>
      )}

      <div className="mt-4 max-w-3xl">
        <FormField
          label="Fonte de Pesquisa de Preços"
          required
          hint="Os parâmetros do Art. 23, § 1º, Lei 14.133/21, na ordem de preferência da IN SEGES 65/2021 — a pesquisa direta com fornecedores é a última alternativa. A escolha entra na memória de cálculo, que é o que a seção guarda."
        >
          <CampoDeFonteDePreco value={fonte} onChange={setFonte} />
        </FormField>
      </div>

      <div className="mt-4">
        <FormField
          label="Memória de Cálculo"
          required
          hint="Registre como o valor foi apurado, com os preços unitários referenciais e os documentos de suporte."
        >
          <Textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            rows={8}
            placeholder="Ex: Valor de referência apurado pela mediana de 5 preços coletados no PNCP entre 01/06 e 15/06, descartado 1 preço excessivamente elevado..."
          />
        </FormField>
      </div>

      {precificados.length > 0 && fonte.trim() === "" && (
        <p className="mt-4 m-0 text-xs text-text-muted">
          Escolha a fonte de pesquisa de preços para a plataforma escrever a memória de cálculo —
          é ela que diz de onde saiu o preço.
        </p>
      )}

      <div className="mt-4">
        <CaminhosDaSecao
          gerando={gerando}
          onGerarComIa={onGerarComIa}
          rascunhoAutomatico={
            /*
              Sem a fonte não há rascunho a montar: o parágrafo afirma de onde
              saiu o preço, e escrevê-lo sem isso deixaria a lacuna que o
              Art. 23, § 1º não admite.
            */
            precificados.length > 0 && fonte.trim() !== ""
              ? {
                  rotulo:
                    rascunho.trim() === ""
                      ? "Escrever a memória a partir dos itens"
                      : "Refazer a partir dos itens",
                  onEscrever: () => {
                    setRascunho(
                      memoriaDoValor(
                        precificados.map((item) => ({
                          descricao: item.descricao,
                          unidade: item.unidade,
                          quantidade: item.quantidade,
                          valorUnitario: item.valorUnitario,
                          precoApurado: item.precoApurado,
                          precosColetados: item.precosColetados,
                        })),
                        total,
                        valorDeclarado,
                        fonte,
                        metodo,
                      ),
                    )
                    showToast(
                      "Memória de cálculo preenchida a partir dos itens. Revise antes de salvar.",
                    )
                  },
                }
              : undefined
          }
        />
      </div>
    </SectionBlock>
  )
}


/** Um número apurado, com a conta que o produziu logo abaixo. */
function ValorApurado({
  rotulo,
  valor,
  detalhe,
}: {
  rotulo: string
  valor: number
  detalhe: string
}) {
  return (
    <div className="rounded-xl border border-border bg-ice px-4 py-3.5">
      <div className="text-2xs font-semibold tracking-caps text-text-muted uppercase">{rotulo}</div>
      <div className="mt-1 font-mono text-lg font-bold text-petroleum">{formatBRL(valor)}</div>
      <div className="mt-0.5 text-xs text-text-3">{detalhe}</div>
    </div>
  )
}

/**
 * O rascunho da memória de cálculo a partir dos itens precificados.
 *
 * <p>Cada linha diz **de onde veio o preço**: da pesquisa, com quantos preços e
 * por qual método (Art. 6º da IN SEGES/ME nº 65/2021), ou da estimativa
 * preliminar do DFD, que o Decreto 10.947/2022, Art. 8º, IV obtém por
 * procedimento simplificado. Apresentá-las como a mesma coisa faria a memória
 * afirmar uma pesquisa que não houve.
 */
export function memoriaDoValor(
  itens: Array<{
    descricao: string
    unidade: string
    quantidade: string
    valorUnitario?: string
    precoApurado?: number | null
    precosColetados?: number
  }>,
  total: number,
  declarado: number,
  fonte: string,
  metodo: MetodoDeApuracao = "media",
): string {
  const linhas = itens.map((item) => {
    const unitario = item.precoApurado ?? parseValorBR(item.valorUnitario ?? "0")
    const subtotal = parseValorBR(item.quantidade) * unitario
    const origem =
      item.precoApurado != null
        ? ` (${ROTULO_DO_METODO[metodo].toLowerCase()} de ${item.precosColetados} preço(s) coletado(s))`
        : " (estimativa preliminar do DFD)"
    return `- ${item.descricao}: ${item.quantidade} ${item.unidade} × ${formatBRL(unitario)}${origem} = ${formatBRL(subtotal)}.`
  })
  const daPesquisa = itens.filter((item) => item.precoApurado != null).length
  const partes = [
    daPesquisa === itens.length
      ? "O valor estimado da contratação resulta dos preços unitários apurados na pesquisa de"
        + " preços, aplicados às quantidades consolidadas dos Documentos de Formalização de"
        + " Demanda:"
      : "O valor estimado da contratação resulta dos preços unitários referenciais aplicados às "
        + "quantidades consolidadas dos Documentos de Formalização de Demanda:",
    ...linhas,
    `Valor total estimado: ${formatBRL(total)}.`,
    ...(daPesquisa < itens.length
      ? [
          "[Concluir a pesquisa de preços dos itens ainda apoiados na estimativa preliminar do"
            + " DFD: o Art. 8º, IV do Decreto 10.947/2022 a obtém por procedimento simplificado,"
            + " para o plano de contratações, e o valor da contratação é o do Art. 23 da"
            + " Lei 14.133/21.]",
        ]
      : []),
  ]
  // O fundamento vai junto quando a fonte é um dos parâmetros da lei: é o que o
  // controle procura, e citá-lo por extenso é o padrão do documento.
  const fundamento = fundamentoDaFonte(fonte)
  partes.push(
    `${PREFIXO_DA_FONTE} ${fonte}${fundamento ? ` (${fundamento})` : ""}.`,
  )
  if (declarado > 0 && Math.abs(declarado - total) >= 0.01) {
    // A divergência é dito, e não escondida: o valor da abertura consta do
    // processo, e quem lê depois vai comparar os dois de qualquer forma.
    partes.push(
      `O valor declarado na abertura do processo foi de ${formatBRL(declarado)}. `
        + "[Justificar a diferença entre a estimativa apurada e o valor inicialmente declarado.]",
    )
  }
  partes.push(
    "[Anexar os documentos de suporte da pesquisa de preços e registrar eventuais preços "
      + "descartados por excessividade ou inexequibilidade.]",
  )
  return partes.join("\n\n")
}

const modosATA: Array<{ key: ModoATA; label: string; desc: string }> = [
  {
    key: "anexar",
    label: "Anexar ATA para revisão pela IA",
    desc: "Envie a ATA que deseja utilizar. A IA verificará validade, compatibilidade e emitirá parecer.",
  },
  {
    key: "delegar",
    label: "Delegar ao modelo a busca de ATAs válidas",
    desc: "A IA buscará ATAs compatíveis com o objeto. Você visualizará as origens e selecionará a desejada.",
  },
  {
    key: "combinado",
    label: "Anexar ATA e buscar outras opções",
    desc: "A IA revisará sua ATA e também sugerirá alternativas encontradas para comparação.",
  },
]

/**
 * Adesão a Ata de Registro de Preços — acompanha o Levantamento de Mercado
 * (Art. 18, § 1º, V), onde a adesão é avaliada como alternativa de solução.
 */
export function PainelATA() {
  const showToast = useToast()
  const [aberto, setAberto] = useState(false)
  const [ataMode, setATAMode] = useState<ModoATA | "">("")
  const [ataFile, setATAFile] = useState<string | null>(null)
  const [ataReview, setATAReview] = useState<null | "loading" | "done">(null)

  return (
    <div className="mt-5">
      <div className="on-dark flex flex-wrap items-start gap-4 rounded-card px-5 py-4.5 gradient-panel">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-on-dark-electric-chip text-electric">
          <IconFileText size={18} />
        </span>
        <div className="flex-1">
          <div className="mb-1 font-display text-md font-bold text-on-dark">A solução proposta é Adesão de ATA?</div>
          <p className="m-0 text-base text-on-dark-65">
            Se o levantamento de mercado concluir que a solução mais vantajosa é a Adesão a Ata de Registro de Preços,
            configure a ATA aqui para que o modelo possa validar ou encontrar opções adequadas.
          </p>
        </div>
        <Button size="sm" onClick={() => setAberto(!aberto)}>
          {aberto ? "Fechar" : "Configurar ATA"}
        </Button>
      </div>

      {aberto && (
        <div className="mt-2.5 rounded-card border border-border bg-surface px-5.5 py-5">
          <h4 className="m-0 mb-1 font-display text-md font-bold text-text-1">Gestão da Ata de Registro de Preços</h4>
          <p className="m-0 mb-4 text-base text-text-3">Escolha como deseja proceder com a ATA para este processo.</p>

          <div className="mb-4 flex flex-col gap-2">
            {modosATA.map((opt) => (
              <ChoiceCard
                key={opt.key}
                size="small"
                selected={ataMode === opt.key}
                onClick={() => setATAMode(opt.key)}
                title={opt.label}
                desc={opt.desc}
              />
            ))}
          </div>

          {(ataMode === "anexar" || ataMode === "combinado") && (
            <div className="mb-4">
              <FormField label="Anexar ATA" required>
                <div>
                  <FileUpload
                    file={ataFile}
                    onChange={(f) => {
                      setATAFile(f)
                      if (f === null) setATAReview(null)
                    }}
                    placeholder="Clique para selecionar a ATA (PDF ou DOCX)"
                    accept=".pdf,.docx"
                  />
                  {ataFile && ataReview === null && (
                    <div className="mt-2.5">
                      <Button
                        size="sm"
                        onClick={() => {
                          setATAReview("loading")
                          setTimeout(() => setATAReview("done"), 2200)
                        }}
                      >
                        Enviar para revisão pela IA
                      </Button>
                    </div>
                  )}
                  {ataReview === "loading" && (
                    <div className="mt-2.5">
                      <InlineSpinner label="Analisando ATA... aguarde." />
                    </div>
                  )}
                  {ataReview === "done" && (
                    <div className="mt-2.5 rounded-xl border border-tint-success-border bg-tint-success-bg px-4 py-3.5">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="flex text-success">
                          <IconCheckCircle size={16} strokeWidth={2.5} />
                        </span>
                        <span className="text-base font-bold text-tint-success-fg">Parecer da IA — ATA Válida</span>
                      </div>
                      <p className="m-0 text-sm leading-[1.6] text-tint-success-fg-soft">
                        A ATA analisada está vigente, com objeto compatível ao ETP e dentro dos limites legais para
                        adesão (Art. 86 da Lei 14.133/21). Prazo de vigência: 30/11/2025. Órgão gerenciador: Governo do
                        Estado de São Paulo. Nenhuma irregularidade identificada.
                      </p>
                    </div>
                  )}
                </div>
              </FormField>
            </div>
          )}

          {ataMode === "delegar" && (
            <InfoBanner tone="info" icon={<IconCheck size={14} strokeWidth={2.5} />}>
              O modelo realizará a busca de ATAs compatíveis após a confirmação. Os resultados — com origem, órgão
              gerenciador e validade — ficarão disponíveis neste processo para sua seleção.
            </InfoBanner>
          )}

          {ataMode !== "" && (
            <div className="mt-3.5">
              <Button variant="dark" onClick={() => showToast("Configuração da ATA registrada no processo.")}>
                Confirmar configuração da ATA
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
