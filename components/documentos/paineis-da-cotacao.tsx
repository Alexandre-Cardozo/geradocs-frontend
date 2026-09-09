"use client"

import { useState } from "react"

import { Button, Dropdown, FormField, InfoBanner, Input, MoneyInput, SectionBlock, Tag, Textarea } from "@/components/ui"
import { IconPlus, IconTrash } from "@/components/ui/icons"
import { CaminhosDaSecao } from "@/components/documentos/caminhos-da-secao"
import { DocumentoDaColeta } from "@/components/documentos/documento-da-coleta"
import { CampoDeFonteDePreco } from "@/components/shared/campo-de-fonte-de-preco"
import { InlineSpinner } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import {
  useAtualizarColeta,
  useColetasDoProcesso,
  useConsolidacaoDaDemanda,
  useRegistrarColeta,
  useRemoverColeta,
} from "@/lib/api/hooks"
import type { ColetaDePreco, DadosDaColeta } from "@/lib/api/procurement-client"
import { ehFonteCanonica, FONTES_DE_PRECO } from "@/lib/dominio/fontes-de-preco"
import {
  apurar,
  fontesConsultadas,
  fornecedoresIdentificados,
  metodoDeclarado,
  porItem,
  ROTULO_DO_METODO,
  textoDaAnaliseCritica,
  textoDasFontes,
  textoDaSerie,
  textoDoPrecoDeReferencia,
  type MetodoDeApuracao,
} from "@/lib/dominio/pesquisa-de-precos"
import { formatBRL, parseValorBR } from "@/lib/format"
import type { SecaoDocumento } from "@/lib/types"

/**
 * Os parâmetros prioritários do Art. 23, § 1º — incisos I e II.
 *
 * <p>O Art. 5º, § 1º da IN SEGES/ME nº 65/2021 manda priorizá-los e justificar
 * quando não for possível usá-los. São os quatro primeiros da lista canônica:
 * sistemas oficiais de preços e contratações similares da Administração.
 */
const PRIORITARIAS = new Set(
  FONTES_DE_PRECO.filter((f) => f.fundamento.includes("§ 1º, I") || f.fundamento.includes("§ 1º, II"))
    .map((f) => f.rotulo),
)

interface PropsDoPainel {
  secao: SecaoDocumento
  processoId: string
  rascunho: string
  setRascunho: (v: string) => void
  gerando: boolean
  onGerarComIa: () => void
}

/**
 * Fornecedores e Fontes Consultadas — Cotação, Art. 23, § 1º.
 *
 * <p>A seção era folha em branco enquanto a pesquisa não tinha onde existir.
 * Agora ela lê a série coletada e diz quais fontes foram efetivamente usadas —
 * e avisa quando nenhuma delas é um dos parâmetros prioritários, que é o que o
 * Art. 5º, § 1º da IN manda justificar.
 */
export function PainelDasFontes(props: PropsDoPainel) {
  const coletas = useColetasDoProcesso(props.processoId)

  if (coletas.isPending) {
    return (
      <SectionBlock title={props.secao.titulo} hint={props.secao.hint ?? ""}>
        <InlineSpinner label="Consultando os preços coletados..." />
      </SectionBlock>
    )
  }

  const serie = coletas.data ?? []
  const fontes = fontesConsultadas(serie)
  const fornecedores = fornecedoresIdentificados(serie)
  const usouPrioritaria = fontes.some((f) => PRIORITARIAS.has(f))

  return (
    <SectionBlock title={props.secao.titulo} hint={props.secao.hint ?? ""}>
      <div className="flex flex-col gap-3.5">
        {serie.length === 0 ? (
          <InfoBanner tone="info">
            Nenhum preço coletado ainda. Registre as coletas na seção{" "}
            <strong>Preços Coletados</strong> — as fontes consultadas saem de lá, e não de uma lista
            digitada à parte.
          </InfoBanner>
        ) : (
          <>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
              {fontes.map((fonte) => (
                <li
                  key={fonte}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm"
                >
                  <span className="min-w-0 flex-1 text-text-1">{fonte}</span>
                  <Tag tone={PRIORITARIAS.has(fonte) ? "success" : "info"}>
                    {PRIORITARIAS.has(fonte)
                      ? "Parâmetro prioritário"
                      : ehFonteCanonica(fonte)
                        ? "Parâmetro do Art. 23, § 1º"
                        : "Outra fonte"}
                  </Tag>
                  <span className="text-xs text-text-muted">
                    {serie.filter((c) => c.fonte === fonte).length} preço(s)
                  </span>
                </li>
              ))}
            </ul>
            {!usouPrioritaria && (
              <InfoBanner tone="warning">
                Nenhuma das fontes usadas é um dos parâmetros prioritários — sistemas oficiais de
                preços e contratações similares da Administração. O{" "}
                <strong>Art. 5º, § 1º da IN SEGES/ME nº 65/2021</strong> manda priorizá-los e
                justificar quando não for possível; a justificativa precisa constar desta seção.
              </InfoBanner>
            )}
            {fornecedores.length > 0 && (
              <p className="m-0 text-sm text-text-3">
                Fornecedores identificados: {fornecedores.join("; ")}.
              </p>
            )}
          </>
        )}

        <Textarea
          value={props.rascunho}
          onChange={(e) => props.setRascunho(e.target.value)}
          rows={6}
          placeholder="Preencha o conteúdo desta seção..."
        />
        <CaminhosDaSecao
          gerando={props.gerando}
          onGerarComIa={props.onGerarComIa}
          rascunhoAutomatico={
            serie.length > 0
              ? {
                  rotulo: "Escrever a partir das fontes",
                  onEscrever: () => props.setRascunho(textoDasFontes(serie, usouPrioritaria)),
                }
              : undefined
          }
        />
      </div>
    </SectionBlock>
  )
}

/**
 * Preços Coletados — Cotação, Art. 23, § 2º.
 *
 * <p>É aqui que a pesquisa acontece: uma linha por preço obtido, que é o que o
 * Art. 3º da IN chama de "série de preços coletados". As demais seções da
 * Cotação — fontes, análise crítica e preço de referência — leem desta série,
 * em vez de pedir que alguém redigite o mesmo número três vezes.
 */
export function PainelDasColetas(props: PropsDoPainel) {
  const coletas = useColetasDoProcesso(props.processoId)
  const [registrando, setRegistrando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)

  if (coletas.isPending) {
    return (
      <SectionBlock title={props.secao.titulo} hint={props.secao.hint ?? ""}>
        <InlineSpinner label="Consultando os preços coletados..." />
      </SectionBlock>
    )
  }
  if (coletas.isError) {
    return (
      <SectionBlock title={props.secao.titulo} hint={props.secao.hint ?? ""}>
        <p className="m-0 text-sm text-danger">Não foi possível listar os preços coletados.</p>
      </SectionBlock>
    )
  }

  const serie = coletas.data
  const itens = porItem(serie)

  return (
    <SectionBlock title={props.secao.titulo} hint={props.secao.hint ?? ""}>
      <div className="flex flex-col gap-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-text-3">
            {serie.length} preço(s) obtido(s) em {itens.length} item(ns).
          </span>
          {!registrando && (
            <Button
              size="sm"
              variant="secondary"
              icon={<IconPlus size={13} strokeWidth={2.5} />}
              onClick={() => setRegistrando(true)}
            >
              Registrar Preço
            </Button>
          )}
        </div>

        {registrando && (
          <FormularioDaColeta
            processoId={props.processoId}
            onPronto={() => setRegistrando(false)}
            onCancelar={() => setRegistrando(false)}
          />
        )}

        {serie.length === 0 ? (
          !registrando && (
            <p className="m-0 rounded-lg border border-dashed border-border bg-surface px-3.5 py-3 text-sm text-text-muted">
              Nenhum preço coletado. É daqui que saem as fontes consultadas, a análise crítica e o
              preço de referência — e, adiante, a estimativa de valor do ETP.
            </p>
          )
        ) : (
          itens.map((item) => (
            <div key={item.item} className="flex flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="m-0 font-display text-sm font-bold text-text-1">{item.item}</h4>
                {item.serieCurta && (
                  <Tag tone="warning">Menos de três preços — Art. 6º, § 5º exige justificativa</Tag>
                )}
              </div>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                {item.coletas.map((coleta) =>
                  editando === coleta.id ? (
                    <li key={coleta.id}>
                      <FormularioDaColeta
                        processoId={props.processoId}
                        coleta={coleta}
                        onPronto={() => setEditando(null)}
                        onCancelar={() => setEditando(null)}
                      />
                    </li>
                  ) : (
                    <LinhaDaColeta
                      key={coleta.id}
                      processoId={props.processoId}
                      coleta={coleta}
                      paraExame={item.paraExame.includes(coleta)}
                      onEditar={() => setEditando(coleta.id)}
                    />
                  ),
                )}
              </ul>
            </div>
          ))
        )}

        <Textarea
          value={props.rascunho}
          onChange={(e) => props.setRascunho(e.target.value)}
          rows={6}
          placeholder="Preencha o conteúdo desta seção..."
        />
        <CaminhosDaSecao
          gerando={props.gerando}
          onGerarComIa={props.onGerarComIa}
          rascunhoAutomatico={
            serie.length > 0
              ? {
                  rotulo: "Escrever a partir da série",
                  onEscrever: () => props.setRascunho(textoDaSerie(itens)),
                }
              : undefined
          }
        />
      </div>
    </SectionBlock>
  )
}

/** Uma coleta na lista, com a marcação de exame quando ela destoa das demais. */
function LinhaDaColeta({
  processoId,
  coleta,
  paraExame,
  onEditar,
}: {
  processoId: string
  coleta: ColetaDePreco
  paraExame: boolean
  onEditar: () => void
}) {
  const [confirmando, setConfirmando] = useState(false)
  const remover = useRemoverColeta(processoId)
  const showToast = useToast()

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-petroleum">
            {formatBRL(parseValorBR(coleta.valorUnitario))}
          </span>
          <span className="text-sm text-text-1">{coleta.fonte}</span>
          {paraExame && <Tag tone="warning">Destoa da mediana — examine</Tag>}
        </div>
        <p className="m-0 mt-0.5 text-xs text-text-3">
          {coleta.coletadoEm.slice(0, 10).split("-").reverse().join("/")}
          {coleta.fornecedor ? ` · ${coleta.fornecedor}` : ""}
          {coleta.documentoDoFornecedor ? ` (${coleta.documentoDoFornecedor})` : ""}
          {coleta.validaAte
            ? ` · válida até ${coleta.validaAte.split("-").reverse().join("/")}`
            : ""}
        </p>
        {/*
          O lastro do preço: o Art. 3º da IN exige os "documentos que lhe dão
          suporte", e o preço de sítio eletrônico só se comprova pela captura da
          página com data e hora visíveis (Art. 5º, III).
        */}
        <div className="mt-2">
          <DocumentoDaColeta processoId={processoId} coleta={coleta} />
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {confirmando ? (
          <>
            <span className="text-xs text-text-muted">Retirar da pesquisa?</span>
            <Button
              size="sm"
              variant="danger-soft"
              disabled={remover.isPending}
              onClick={() =>
                remover.mutate(coleta.id, {
                  onSuccess: () => showToast("Preço retirado da pesquisa."),
                  onError: (erro) =>
                    showToast(
                      erro instanceof Error ? erro.message : "Não foi possível retirar o preço.",
                    ),
                })
              }
            >
              {remover.isPending ? "Retirando..." : "Confirmar"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="secondary" onClick={onEditar}>
              Corrigir
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<IconTrash size={13} />}
              onClick={() => setConfirmando(true)}
            >
              Retirar
            </Button>
          </>
        )}
      </div>
    </li>
  )
}

/** O instante da coleta no formato que o campo `datetime-local` usa. */
function paraCampoLocal(iso: string): string {
  return iso.slice(0, 16)
}

/**
 * Registrar ou corrigir uma coleta.
 *
 * <p>Data <b>e hora</b>: o Art. 5º, III da IN exige a hora de acesso quando o
 * preço vem de mídia especializada ou de sítio eletrônico. CNPJ e validade da
 * proposta ficam opcionais porque dependem da fonte — o Painel de Preços não tem
 * CNPJ de fornecedor, e exigir de todas obrigaria a inventar dado.
 */
function FormularioDaColeta({
  processoId,
  coleta,
  onPronto,
  onCancelar,
}: {
  processoId: string
  coleta?: ColetaDePreco
  onPronto: () => void
  onCancelar: () => void
}) {
  const consolidacao = useConsolidacaoDaDemanda(processoId)
  const registrar = useRegistrarColeta(processoId)
  const atualizar = useAtualizarColeta(processoId)
  const showToast = useToast()

  const [dados, setDados] = useState<DadosDaColeta>(() =>
    coleta
      ? { ...coleta }
      : {
          item: "",
          fonte: "",
          valorUnitario: "",
          coletadoEm: new Date().toISOString().slice(0, 16),
        },
  )
  const trocar = (campo: keyof DadosDaColeta, valor: string) =>
    setDados((atual) => ({ ...atual, [campo]: valor }))

  const itensDaDemanda = consolidacao.data?.itens ?? []
  const pendente = registrar.isPending || atualizar.isPending
  const impedimento =
    dados.item.trim() === ""
      ? "Informe a que item este preço se refere."
      : dados.fonte.trim() === ""
        ? "Escolha a fonte consultada — o Art. 3º da IN exige a caracterização das fontes."
        : parseValorBR(dados.valorUnitario) <= 0
          ? "Informe o preço obtido."
          : dados.coletadoEm.trim() === ""
            ? "Informe a data e a hora da coleta."
            : null
  const motivo = `motivo-coleta-${coleta?.id ?? "nova"}`

  const gravar = () => {
    const corpo = { ...dados, coletadoEm: new Date(dados.coletadoEm).toISOString() }
    const aoFalhar = (erro: unknown) =>
      showToast(erro instanceof Error ? erro.message : "Não foi possível gravar o preço.")
    if (coleta) {
      atualizar.mutate(
        { coletaId: coleta.id, dados: corpo },
        {
          onSuccess: () => {
            showToast("Preço corrigido.")
            onPronto()
          },
          onError: aoFalhar,
        },
      )
      return
    }
    registrar.mutate(corpo, {
      onSuccess: () => {
        showToast("Preço registrado na pesquisa.")
        onPronto()
      },
      onError: aoFalhar,
    })
  }

  return (
    <div className="rounded-lg border border-royal bg-surface p-4">
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2">
        <div className="min-w-0">
          <FormField label="Item Pesquisado" required hint="O item a que este preço se refere.">
            {itensDaDemanda.length > 0 && !coleta ? (
              <Dropdown
                value={dados.item}
                onChange={(valor) => trocar("item", valor)}
                ariaLabel="Item Pesquisado"
                options={[
                  { value: "", label: "Selecione o item..." },
                  ...itensDaDemanda.map((i) => ({ value: i.descricao, label: i.descricao })),
                ]}
              />
            ) : (
              <Input
                value={dados.item}
                onChange={(e) => trocar("item", e.target.value)}
                ariaLabel="Item Pesquisado"
                placeholder="Ex: Papel A4 75 g/m²"
              />
            )}
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField label="Fonte Consultada" required hint="Um dos parâmetros do Art. 23, § 1º.">
            <CampoDeFonteDePreco
              value={dados.fonte}
              onChange={(fonte) => trocar("fonte", fonte)}
              ariaLabel="Fonte Consultada"
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField label="Preço Obtido" required hint="O preço unitário desta fonte.">
            <MoneyInput
              value={dados.valorUnitario}
              onChange={(valor) => trocar("valorUnitario", valor)}
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField
            label="Data e Hora da Coleta"
            required
            hint="A hora é exigida para mídia e sítio eletrônico."
          >
            <Input
              type="datetime-local"
              value={paraCampoLocal(dados.coletadoEm)}
              onChange={(e) => trocar("coletadoEm", e.target.value)}
              ariaLabel="Data e Hora da Coleta"
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField label="Fornecedor ou Origem" hint="Quem deu o preço, quando identificável.">
            <Input
              value={dados.fornecedor ?? ""}
              onChange={(e) => trocar("fornecedor", e.target.value)}
              ariaLabel="Fornecedor ou Origem"
              placeholder="Ex: Papelaria Central Ltda."
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField label="CNPJ ou CPF" hint="Exigido na pesquisa direta com fornecedores.">
            <Input
              value={dados.documentoDoFornecedor ?? ""}
              onChange={(e) => trocar("documentoDoFornecedor", e.target.value)}
              ariaLabel="CNPJ ou CPF"
              placeholder="Ex: 12.345.678/0001-90"
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField label="Proposta Válida Até" hint="Na pesquisa direta com fornecedores.">
            <Input
              type="date"
              value={dados.validaAte ?? ""}
              onChange={(e) => trocar("validaAte", e.target.value)}
              ariaLabel="Proposta Válida Até"
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField label="Observação" hint="O que mais precise constar dos autos.">
            <Input
              value={dados.observacao ?? ""}
              onChange={(e) => trocar("observacao", e.target.value)}
              ariaLabel="Observação"
              placeholder="Ex: frete incluído"
            />
          </FormField>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <Button
          size="sm"
          disabled={impedimento !== null || pendente}
          ariaDescribedBy={motivo}
          onClick={gravar}
        >
          {pendente ? "Gravando..." : coleta ? "Salvar Correção" : "Registrar Preço"}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <p id={motivo} className={impedimento ? "m-0 text-xs text-text-muted" : "sr-only"}>
          {impedimento ?? "Tudo certo para gravar."}
        </p>
      </div>
    </div>
  )
}

/**
 * Análise Crítica dos Preços Obtidos — Cotação, Art. 6º da IN SEGES 65/2021.
 *
 * <p>O § 4º torna a análise crítica <b>obrigatória</b>. A plataforma faz o
 * retrato — quantos preços, qual a variação, quais destoam — e <b>não decide o
 * descarte</b>: o § 3º exige critério "fundamentado e descrito no processo", e
 * quem o fundamenta é quem responde pelos autos. Sumir com um preço sozinha
 * seria a plataforma assinando no lugar do servidor.
 */
export function PainelDaAnaliseCritica(props: PropsDoPainel) {
  const coletas = useColetasDoProcesso(props.processoId)

  if (coletas.isPending) {
    return (
      <SectionBlock title={props.secao.titulo} hint={props.secao.hint ?? ""}>
        <InlineSpinner label="Consultando os preços coletados..." />
      </SectionBlock>
    )
  }

  const serie = coletas.data ?? []
  const itens = porItem(serie)

  return (
    <SectionBlock title={props.secao.titulo} hint={props.secao.hint ?? ""}>
      <div className="flex flex-col gap-3.5">
        {itens.length === 0 ? (
          <InfoBanner tone="info">
            Nenhum preço coletado ainda. A análise crítica compara os preços obtidos — registre-os
            na seção <strong>Preços Coletados</strong>.
          </InfoBanner>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-muted uppercase">
                    <th className="py-2 pr-3 font-semibold">Item</th>
                    <th className="py-2 pr-3 text-right font-semibold">Preços</th>
                    <th className="py-2 pr-3 text-right font-semibold">Menor</th>
                    <th className="py-2 pr-3 text-right font-semibold">Média</th>
                    <th className="py-2 pr-3 text-right font-semibold">Mediana</th>
                    <th className="py-2 text-right font-semibold">Maior</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => (
                    <tr key={item.item} className="border-b border-border-soft">
                      <td className="py-2 pr-3 text-text-1">{item.item}</td>
                      <td className="py-2 pr-3 text-right font-mono text-text-3">
                        {item.precos.length}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-text-3">
                        {formatBRL(item.menor)}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-text-3">
                        {formatBRL(item.media)}
                      </td>
                      <td className="py-2 pr-3 text-right font-mono text-text-3">
                        {formatBRL(item.mediana)}
                      </td>
                      <td className="py-2 text-right font-mono text-text-3">
                        {formatBRL(item.maior)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {itens.some((i) => i.serieCurta) && (
              <InfoBanner tone="warning">
                Há item com menos de três preços. O <strong>Art. 6º da IN SEGES/ME nº 65/2021</strong>{" "}
                exige que o cálculo incida sobre três ou mais, e o § 5º admite menos apenas mediante
                justificativa do gestor aprovada pela autoridade competente.
              </InfoBanner>
            )}
            {itens.some((i) => i.paraExame.length > 0) && (
              <InfoBanner tone="info">
                Há preços que destoam da mediana. A plataforma <strong>não os descarta</strong>: o
                Art. 6º, § 3º exige critério fundamentado e descrito no processo, e a decisão é de
                quem responde pelos autos. Mantenha-os ou desconsidere-os, dizendo por quê nesta
                seção.
              </InfoBanner>
            )}
          </>
        )}

        <Textarea
          value={props.rascunho}
          onChange={(e) => props.setRascunho(e.target.value)}
          rows={6}
          placeholder="Preencha o conteúdo desta seção..."
        />
        <CaminhosDaSecao
          gerando={props.gerando}
          onGerarComIa={props.onGerarComIa}
          rascunhoAutomatico={
            itens.length > 0
              ? {
                  rotulo: "Escrever a análise",
                  onEscrever: () => props.setRascunho(textoDaAnaliseCritica(itens)),
                }
              : undefined
          }
        />
      </div>
    </SectionBlock>
  )
}

/**
 * Metodologia e Preço de Referência — Cotação, Art. 23, caput.
 *
 * <p>O método é escolha do servidor entre os três que o Art. 6º admite — média,
 * mediana ou menor valor. A plataforma calcula os três e grava o escolhido na
 * memória de cálculo, que é o que o Art. 3º exige que conste da pesquisa.
 */
export function PainelDoPrecoDeReferencia(props: PropsDoPainel) {
  const coletas = useColetasDoProcesso(props.processoId)
  const consolidacao = useConsolidacaoDaDemanda(props.processoId)

  const declarado = metodoDeclarado(props.rascunho)
  const [metodo, setMetodo] = useState<MetodoDeApuracao>(declarado ?? "media")
  const [sincronizado, setSincronizado] = useState(declarado)
  if (declarado !== sincronizado) {
    setSincronizado(declarado)
    if (declarado) setMetodo(declarado)
  }

  if (coletas.isPending) {
    return (
      <SectionBlock title={props.secao.titulo} hint={props.secao.hint ?? ""}>
        <InlineSpinner label="Consultando os preços coletados..." />
      </SectionBlock>
    )
  }

  const itens = porItem(coletas.data ?? [])
  const quantidadePor = (item: string) =>
    (consolidacao.data?.itens ?? []).find(
      (i) => i.descricao.trim().toLowerCase() === item.trim().toLowerCase(),
    )?.total
  const total = itens.reduce((soma, item) => {
    const quantidade = quantidadePor(item.item)
    return quantidade == null ? soma : soma + apurar(item, metodo) * quantidade
  }, 0)

  return (
    <SectionBlock title={props.secao.titulo} hint={props.secao.hint ?? ""}>
      <div className="flex flex-col gap-3.5">
        {itens.length === 0 ? (
          <InfoBanner tone="info">
            Nenhum preço coletado ainda. O preço de referência sai da série da pesquisa — registre
            as coletas na seção <strong>Preços Coletados</strong>.
          </InfoBanner>
        ) : (
          <>
            <FormField
              label="Método de Apuração"
              required
              hint="Os três que o Art. 6º da IN SEGES/ME nº 65/2021 admite."
            >
              <Dropdown
                value={metodo}
                onChange={(escolha) => setMetodo(escolha as MetodoDeApuracao)}
                ariaLabel="Método de Apuração"
                options={(Object.keys(ROTULO_DO_METODO) as MetodoDeApuracao[]).map((m) => ({
                  value: m,
                  label: ROTULO_DO_METODO[m],
                }))}
              />
            </FormField>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-text-muted uppercase">
                    <th className="py-2 pr-3 font-semibold">Item</th>
                    <th className="py-2 pr-3 text-right font-semibold">Preço Apurado</th>
                    <th className="py-2 pr-3 text-right font-semibold">Quantidade</th>
                    <th className="py-2 text-right font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item) => {
                    const unitario = apurar(item, metodo)
                    const quantidade = quantidadePor(item.item)
                    return (
                      <tr key={item.item} className="border-b border-border-soft">
                        <td className="py-2 pr-3 text-text-1">{item.item}</td>
                        <td className="py-2 pr-3 text-right font-mono text-text-3">
                          {formatBRL(unitario)}
                        </td>
                        <td className="py-2 pr-3 text-right font-mono text-text-3">
                          {quantidade ?? "—"}
                        </td>
                        <td className="py-2 text-right font-mono font-semibold text-petroleum">
                          {quantidade == null ? "—" : formatBRL(unitario * quantidade)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-ice px-3.5 py-3">
              <span className="text-sm text-text-3">
                Preço de referência total{" "}
                <strong className="font-mono text-base text-petroleum">{formatBRL(total)}</strong>
              </span>
              <Tag tone="info">
                É este valor que embasa a estimativa do ETP e do TR
              </Tag>
            </div>
          </>
        )}

        <Textarea
          value={props.rascunho}
          onChange={(e) => props.setRascunho(e.target.value)}
          rows={6}
          placeholder="Preencha o conteúdo desta seção..."
        />
        <CaminhosDaSecao
          gerando={props.gerando}
          onGerarComIa={props.onGerarComIa}
          rascunhoAutomatico={
            itens.length > 0
              ? {
                  rotulo: "Escrever a memória de cálculo",
                  onEscrever: () =>
                    props.setRascunho(textoDoPrecoDeReferencia(itens, metodo, quantidadePor)),
                }
              : undefined
          }
        />
      </div>
    </SectionBlock>
  )
}
