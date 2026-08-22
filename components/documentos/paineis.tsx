"use client"

import { useState } from "react"

import {
  Button,
  ChoiceCard,
  Dropdown,
  FileUpload,
  FormField,
  InfoBanner,
  Input,
  MoneyInput,
  QuantityInput,
  SectionBlock,
  Textarea,
} from "@/components/ui"
import { IconCheck, IconCheckCircle, IconFileText } from "@/components/ui/icons"
import { InlineSpinner } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { formatBRL, parseValorBR } from "@/lib/format"
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

/** Estimativa das Quantidades — Art. 18, § 1º, IV, Lei 14.133/21. */
function PainelQuantidades({ secao, rascunho, setRascunho }: PainelProps) {
  const [qty, setQty] = useState("150,00")
  const [unidade, setUnidade] = useState("Unidade")
  const [vigencia, setVigencia] = useState("12 meses")

  return (
    <SectionBlock title={secao.titulo} hint={secao.hint ?? ""}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <FormField label="Quantidade Estimada" required>
          <QuantityInput value={qty} onChange={setQty} />
        </FormField>
        <FormField label="Unidade de Medida" required>
          <Dropdown
            value={unidade}
            onChange={setUnidade}
            ariaLabel="Unidade de medida"
            options={["Unidade", "Serviço", "Metro Quadrado", "Licença"].map((o) => ({ value: o, label: o }))}
          />
        </FormField>
        <FormField label="Período de Vigência" required>
          <Dropdown
            value={vigencia}
            onChange={setVigencia}
            ariaLabel="Período de vigência"
            options={["12 meses", "24 meses", "36 meses", "48 meses", "60 meses"].map((o) => ({ value: o, label: o }))}
          />
        </FormField>
      </div>

      <div className="mt-4">
        <FormField
          label="Memória de Cálculo"
          required
          hint="A lei exige a memória de cálculo e os documentos que dão suporte às quantidades."
        >
          <Textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            rows={4}
            placeholder="Ex: Quantidade estimada com base no levantamento realizado junto às 30 unidades escolares da rede municipal. Média de 5 equipamentos por unidade, considerando substituição de equipamentos com mais de 8 anos de uso..."
          />
        </FormField>
      </div>
    </SectionBlock>
  )
}

/** Estimativa do Valor da Contratação — Art. 18, § 1º, VI, Lei 14.133/21. */
function PainelValor({ secao, rascunho, setRascunho }: PainelProps) {
  const [qty, setQty] = useState("150,00")
  const [valorUnit, setValorUnit] = useState("3.233,33")
  const [fonte, setFonte] = useState("painel")
  const [outroTexto, setOutroTexto] = useState("")

  // Total derivado dos campos ao lado (quantidade × valor unitário).
  const valorTotal = parseValorBR(qty) * parseValorBR(valorUnit)

  // Ordem de preferência das fontes de pesquisa de preços (IN SEGES 65/2021, Art. 5º).
  const fontesOpcoes = [
    { key: "pncp", label: "Portal Nacional de Contratações Públicas (PNCP)" },
    { key: "contratos", label: "Contratações similares celebradas por outros entes" },
    { key: "painel", label: "Painel de Preços do Governo Federal (gov.br/compras)" },
    { key: "cotacoes", label: "Pesquisa direta com fornecedores" },
    { key: "outro", label: "Outro" },
  ]

  return (
    <SectionBlock title={secao.titulo} hint={secao.hint ?? ""}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Quantidade" required>
          <QuantityInput value={qty} onChange={setQty} />
        </FormField>
        <FormField label="Valor Unitário Estimado" required>
          <MoneyInput value={valorUnit} onChange={setValorUnit} />
        </FormField>
        <FormField label="Valor Total Estimado">
          <div className="flex w-full items-center rounded-md border border-border bg-ice px-3.25 py-2.5 font-mono text-md font-bold text-petroleum">
            {formatBRL(valorTotal)}
          </div>
        </FormField>
      </div>

      <div className="mt-4">
        <FormField
          label="Fonte de Pesquisa de Preços"
          required
          hint="Ordem de preferência da IN SEGES 65/2021, Art. 5º — a pesquisa direta com fornecedores é a última alternativa."
        >
          <div className="flex flex-col gap-2">
            {fontesOpcoes.map((opt) => (
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
            rows={4}
            placeholder="Ex: Valor de referência apurado pela mediana de 5 preços coletados no PNCP entre 01/06 e 15/06, descartado 1 preço excessivamente elevado..."
          />
        </FormField>
      </div>
    </SectionBlock>
  )
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
