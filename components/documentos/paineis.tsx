"use client"

import { useState } from "react"

import {
  Button,
  ChoiceCard,
  FileUpload,
  FormField,
  InfoBanner,
  Input,
  SectionBlock,
  Textarea,
} from "@/components/ui"
import { IconCheck, IconCheckCircle, IconFileText } from "@/components/ui/icons"
import { InlineSpinner } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { Th } from "@/components/shared/tabela"
import { useConsolidacaoDaDemanda, useDfdsDoProcesso, useProcesso } from "@/lib/api/hooks"
import type { ItemConsolidado } from "@/lib/api/procurement-client"
import { rotuloDaUnidade } from "@/lib/dominio/unidades"
import { formatBRL, formatNumeroBR, parseValorBR } from "@/lib/format"
import type { ModoATA, PainelSecao, SecaoDocumento } from "@/lib/types"

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
}

/** Renderiza o painel da seção, quando ela tiver um. */
export function PainelDaSecao(props: PainelProps) {
  const painel: PainelSecao | undefined = props.secao.painel
  if (painel === "quantidades") return <PainelQuantidades {...props} />
  if (painel === "valor") return <PainelValor {...props} />
  return null
}

/**
 * Estimativa das Quantidades — Art. 18, § 1º, IV, Lei 14.133/21.
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
function PainelQuantidades({ secao, processoId, rascunho, setRascunho }: PainelProps) {
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
          <div>
            <Button
              size="sm"
              variant="secondary"
              icon={<IconFileText size={13} />}
              onClick={() => {
                setRascunho(memoriaDasQuantidades(itens))
                showToast("Memória de cálculo preenchida a partir dos DFDs. Revise antes de salvar.")
              }}
            >
              {rascunho.trim() === "" ? "Escrever a memória a partir dos DFDs" : "Refazer a partir dos DFDs"}
            </Button>
          </div>
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
 * Estimativa do Valor da Contratação — Art. 18, § 1º, VI, Lei 14.133/21.
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
function PainelValor({ secao, processoId, rascunho, setRascunho }: PainelProps) {
  const dfds = useDfdsDoProcesso(processoId)
  const processo = useProcesso(processoId)
  const showToast = useToast()
  const [fonte, setFonte] = useState("")
  const [outroTexto, setOutroTexto] = useState("")

  const itens = (dfds.data ?? []).flatMap((dfd) =>
    dfd.itens.map((item) => ({ ...item, dfd: dfd.nomeDoArquivo, secretaria: dfd.secretaria })),
  )
  const precificados = itens.filter((item) => item.valorUnitario)
  const semPreco = itens.filter((item) => !item.valorUnitario)
  const total = precificados.reduce(
    (soma, item) => soma + parseValorBR(item.quantidade) * parseValorBR(item.valorUnitario ?? "0"),
    0,
  )
  const declarado = processo.data?.valorEstimado ?? 0
  const fonteEscolhida = FONTES_DE_PRECO.find((f) => f.key === fonte)

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
              detalhe={`${precificados.length} de ${itens.length} ${itens.length === 1 ? "item" : "itens"} com preço informado`}
            />
            <ValorApurado
              rotulo="Valor declarado na abertura"
              valor={declarado}
              detalhe={
                total === 0 || declarado === 0
                  ? "Sem base de comparação"
                  : `Diferença de ${formatBRL(Math.abs(declarado - total))} (${total > declarado ? "acima" : "abaixo"} do declarado)`
              }
            />
          </div>

          {semPreco.length > 0 && (
            <InfoBanner tone="warning">
              {semPreco.length === 1 ? "Um item ainda não tem" : `${semPreco.length} itens ainda não têm`}{" "}
              preço unitário informado: {semPreco.map((i) => i.descricao).join(", ")}. Enquanto
              faltarem, o total apurado fica abaixo do que a contratação custa.
            </InfoBanner>
          )}

          <div>
            <Button
              size="sm"
              variant="secondary"
              icon={<IconFileText size={13} />}
              disabled={precificados.length === 0}
              onClick={() => {
                setRascunho(
                  memoriaDoValor(precificados, total, declarado, fonteEscolhida?.label ?? outroTexto),
                )
                showToast("Memória de cálculo preenchida a partir dos itens. Revise antes de salvar.")
              }}
            >
              {rascunho.trim() === "" ? "Escrever a memória a partir dos itens" : "Refazer a partir dos itens"}
            </Button>
          </div>
        </div>
      )}

      <div className="mt-4">
        <FormField
          label="Fonte de Pesquisa de Preços"
          hint="Ordem de preferência da IN SEGES 65/2021, Art. 5º — a pesquisa direta com fornecedores é a última alternativa. A escolha entra na memória de cálculo, que é o que a seção guarda."
        >
          <div className="flex flex-col gap-2">
            {FONTES_DE_PRECO.map((opt) => (
              <label key={opt.key} className="flex cursor-pointer items-center gap-2.5 text-base text-text-2">
                <input
                  type="radio"
                  name="fonte-pesquisa-precos"
                  checked={fonte === opt.key}
                  onChange={() => setFonte(opt.key)}
                  className="size-3.75 accent-royal"
                />
                {opt.label}
              </label>
            ))}
          </div>
          {fonte === "outro" && (
            <div className="mt-2.5">
              <Input
                value={outroTexto}
                onChange={(e) => setOutroTexto(e.target.value)}
                placeholder="Informe qual foi o meio utilizado na pesquisa de preços"
              />
            </div>
          )}
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
    </SectionBlock>
  )
}

/** Ordem de preferência das fontes de pesquisa de preços (IN SEGES 65/2021, Art. 5º). */
const FONTES_DE_PRECO = [
  { key: "pncp", label: "Portal Nacional de Contratações Públicas (PNCP)" },
  { key: "contratos", label: "Contratações similares celebradas por outros entes" },
  { key: "painel", label: "Painel de Preços do Governo Federal (gov.br/compras)" },
  { key: "cotacoes", label: "Pesquisa direta com fornecedores" },
  { key: "outro", label: "Outro" },
]

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

/** O rascunho da memória de cálculo a partir dos itens precificados. */
export function memoriaDoValor(
  itens: Array<{ descricao: string; unidade: string; quantidade: string; valorUnitario?: string }>,
  total: number,
  declarado: number,
  fonte: string,
): string {
  const linhas = itens.map((item) => {
    const subtotal = parseValorBR(item.quantidade) * parseValorBR(item.valorUnitario ?? "0")
    return `- ${item.descricao}: ${item.quantidade} ${item.unidade} × R$ ${item.valorUnitario} = ${formatBRL(subtotal)}.`
  })
  const partes = [
    "O valor estimado da contratação resulta dos preços unitários referenciais aplicados às "
      + "quantidades consolidadas dos Documentos de Formalização de Demanda:",
    ...linhas,
    `Valor total estimado: ${formatBRL(total)}.`,
  ]
  partes.push(
    fonte
      ? `Fonte de pesquisa de preços: ${fonte}.`
      : "[Indicar a fonte de pesquisa de preços utilizada, observada a ordem de preferência da "
        + "IN SEGES 65/2021, Art. 5º.]",
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
