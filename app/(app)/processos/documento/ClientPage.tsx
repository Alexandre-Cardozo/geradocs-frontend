"use client"

import Link from "next/link"
import { notFound, useRouter, useSearchParams } from "next/navigation"
import { useRef, useState } from "react"

import { Button, ProgressBar, SectionBlock, Textarea, ValidationMsg } from "@/components/ui"
import { IconArrowRight, IconCheckCircle, IconCheck, IconHelp, IconSave } from "@/components/ui/icons"
import { PainelATA, PainelDaSecao } from "@/components/documentos/paineis"
import { ErrorState, InlineSpinner, LoadingState } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import {
  useAtualizarSecao,
  useDocumentos,
  useGerarDocumento,
  useGerarSecao,
  useProcesso,
  useSecoes,
} from "@/lib/api/hooks"
import { CATALOGO, porSlug } from "@/lib/documentos"
import { CaminhosDaSecao } from "@/components/documentos/caminhos-da-secao"
import { DispensaDeSecao } from "@/components/documentos/dispensa-de-secao"
import { EtapaFinal } from "@/components/documentos/etapa-final"
import {
  PainelDaAnaliseCritica,
  PainelDasColetas,
  PainelDasFontes,
  PainelDoPrecoDeReferencia,
} from "@/components/documentos/paineis-da-cotacao"
import { PainelDotacao } from "@/components/documentos/painel-dotacao"
import { PainelPca } from "@/components/documentos/painel-pca"
import {
  foiDispensada,
  foiRetificado,
  rotuloDaVersao,
} from "@/lib/dominio"
import { concluidas, progresso } from "@/lib/dominio"
import { type SecaoDocumento, type StatusDocumento } from "@/lib/types"

const statusRail: Record<StatusDocumento, { dot: string; chip: string }> = {
  "Completo": { dot: "bg-success", chip: "bg-tint-success-bg text-tint-success-fg" },
  "Em andamento": { dot: "bg-status-waiting-dot", chip: "bg-tint-royal-bg text-royal-hover" },
  "Em revisão": { dot: "bg-warning", chip: "bg-tint-warning-chip-bg text-tint-warning-fg" },
  "Rejeitado": { dot: "bg-danger", chip: "bg-tint-danger-bg text-tint-danger-fg" },
  "Não iniciado": { dot: "bg-text-muted", chip: "bg-border-soft text-slate-strong" },
}

/**
 * A etapa final na trilha das seções.
 *
 * <p>Não é seção: não tem número, fundamento legal nem entra no progresso. É o
 * lugar do que é do documento inteiro — acrescentar seção, prévia, pendências e
 * a geração —, e que antes morava dentro da última seção da lei (§69).
 */
const ETAPA_FINAL = "__revisao__"

export default function EditorDocumento() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const showToast = useToast()
  const processoId = searchParams.get("id") ?? ""
  const tipo = porSlug(searchParams.get("tipo") ?? "")
  if (!tipo) notFound()

  const meta = CATALOGO[tipo]

  const processo = useProcesso(processoId)
  const secoes = useSecoes(processoId, tipo)
  const documentos = useDocumentos()
  const salvar = useAtualizarSecao(processoId, tipo)
  const gerar = useGerarSecao(processoId, tipo)
  const gerarDocumento = useGerarDocumento()

  const documentoGerado = (documentos.data ?? []).find(
    (d) => d.processoId === processoId && d.tipo === tipo,
  )
  const jaGerado = documentoGerado != null

  const [activeSection, setActiveSection] = useState("1")
  const [rascunho, setRascunho] = useState("")
  const [saved, setSaved] = useState(false)
  const secaoAtivaRef = useRef("1")
  /** Para o caminho manual levar o cursor ao campo, em vez de só apontá-lo. */
  const campoDoTexto = useRef<HTMLTextAreaElement>(null)
  const irPara = (id: string) => {
    secaoAtivaRef.current = id
    setActiveSection(id)
  }

  const lista = secoes.data ?? []
  const naEtapaFinal = activeSection === ETAPA_FINAL
  const active: SecaoDocumento | undefined = lista.find((s) => s.id === activeSection)

  const [secaoSincronizada, setSecaoSincronizada] = useState<string | null>(null)
  if (secoes.isSuccess && activeSection !== secaoSincronizada) {
    setSecaoSincronizada(activeSection)
    setRascunho(active?.conteudo ?? "")
  }

  const completedCount = concluidas(lista).length
  const progress = progresso(lista)


  /**
   * Grava a seção; `proxima` diz para onde ir depois.
   *
   * <p>Da última seção o destino é a etapa final, e não outra seção: revisar o
   * documento e gerá-lo é o passo seguinte a escrever a última (§69).
   */
  /**
   * O que o `PUT` da seção grava.
   *
   * <p>Salvar não pode desfazer a dispensa. O `PUT` troca o par (texto,
   * justificativa), e mandar a justificativa vazia apagava a dispensa que a
   * pessoa acabara de registrar — em silêncio, no clique seguinte.
   *
   * <p>Só enquanto o texto continua em branco: escrever na seção **é** desfazer
   * a dispensa, e aí a justificativa some porque a seção passou a ter conteúdo.
   */
  const gravacaoDa = (secao: SecaoDocumento) => ({
    secaoId: secao.id,
    conteudo: rascunho,
    ...(rascunho.trim() === "" && foiDispensada(secao)
      ? { justificativaDispensa: secao.justificativaDispensa }
      : {}),
  })

  /** Há texto na tela que ainda não está gravado na seção. */
  const naoGravado = active != null && rascunho !== (active.conteudo ?? "")

  /**
   * Vai para outra seção guardando antes o que estava escrito.
   *
   * <p>O rascunho da tela é recarregado da seção de destino: sem esta gravação,
   * clicar na trilha ou em "Seção Anterior" descartava em silêncio o que a
   * pessoa tinha acabado de escrever. Guarda como rascunho — nunca "Completo",
   * que é o que só "Salvar e Avançar" declara.
   */
  const trocarSecao = (id: string) => {
    if (active && naoGravado) salvar.mutate(gravacaoDa(active))
    irPara(id)
  }

  const handleSave = (avancar = false, proxima?: string) => {
    if (!active) return
    salvar.mutate(
      {
        ...gravacaoDa(active),
        ...(avancar ? { status: "Completo" as const } : {}),
      },
      {
        onSuccess: () => {
          setSaved(true)
          setTimeout(() => setSaved(false), 2500)
          // `irPara`, e não `trocarSecao`: o que havia na tela acabou de ser
          // gravado, e regravá-lo aqui devolveria a seção ao estado de rascunho.
          if (avancar && proxima) irPara(proxima)
        },
      }
    )
  }

  const handleGerarIA = () => {
    if (!active) return
    const secaoId = active.id
    // O que está na tela vai junto: rascunho montado pela plataforma ou texto
    // escrito à mão. É dele que o modelo parte.
    gerar.mutate(
      { secaoId, rascunho },
      {
        onSuccess: (secaoGerada) => {
          if (secaoAtivaRef.current === secaoId) setRascunho(secaoGerada.conteudo)
        },
      },
    )
  }

  if (processo.isPending || secoes.isPending) {
    return <LoadingState label={`Carregando ${tipo}...`} />
  }
  if (processo.isError || secoes.isError) {
    return (
      <div className="p-4 sm:p-5 lg:p-7">
        <div className="rounded-card border border-border bg-surface">
          <ErrorState
            message={processo.error?.message ?? secoes.error?.message}
            onRetry={() => {
              void processo.refetch()
              void secoes.refetch()
            }}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col lg:h-full lg:flex-row lg:overflow-hidden">
      {/* Rail de seções */}
      <div className="flex w-full shrink-0 flex-col overflow-hidden border-b border-border bg-surface lg:w-70 lg:min-w-70 lg:border-r lg:border-b-0">
        <div className="border-b border-border-soft px-4.5 pt-4.5 pb-3.5">
          <Link
            href={`/processos/detalhe?id=${encodeURIComponent(processoId)}`}
            className="mb-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-text-3 no-underline"
          >
            <span className="rotate-180">
              <IconArrowRight size={12} strokeWidth={2.5} />
            </span>
            Voltar ao Processo
          </Link>
          <div className="mb-3.5">
            {/*
              O número do processo, e não o UUID: é ele que o servidor usa em
              ofício e despacho, e a chave interna não identifica nada para
              gente (§54).
            */}
            <div className="font-mono text-xs text-text-muted">{processo.data.numero}</div>
            <div className="mt-0.5 text-base leading-snug font-bold break-words text-text-1">{processo.data.objeto}</div>
            <div className="mt-0.75 text-xs text-text-3">{processo.data.secretaria}</div>
            {documentoGerado && foiRetificado(documentoGerado.versao) && (
              // O cabeçalho é onde quem está editando descobre que trabalha
              // sobre um documento já retificado — antes de gerar mais uma versão.
              <div className="mt-1.5 inline-flex rounded-sm bg-tint-warning-bg px-1.5 py-0.5 font-mono text-2xs font-semibold text-tint-warning-fg">
                {rotuloDaVersao(documentoGerado.versao)}
              </div>
            )}
          </div>
          <ProgressBar percent={progress} label={`Progresso do ${tipo}`} sub={`${completedCount} de ${lista.length} seções concluídas`} />
        </div>

        {/*
          `relative` nos painéis que rolam: sem isso, o bloco de contenção de um
          filho absoluto é o `main`, e ele é colocado na posição estática que
          tem *dentro do conteúdo rolado* — esticando a rolagem da tela inteira.
        */}
        <div className="relative flex gap-1.5 overflow-x-auto p-2.5 lg:block lg:flex-1 lg:overflow-x-hidden lg:overflow-y-auto">
          {lista.map((s) => {
            const cfg = statusRail[s.status]
            const isActive = activeSection === s.id
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => trocarSecao(s.id)}
                className={`mb-0.5 flex w-60 shrink-0 cursor-pointer items-center gap-2.5 rounded-md p-2.5 text-left transition-colors lg:w-full ${
                  isActive ? "border border-tint-royal-border bg-tint-royal-bg" : "border border-transparent bg-transparent"
                }`}
              >
                <span className={`flex size-5.5 shrink-0 items-center justify-center rounded-sm font-mono text-2xs font-bold ${cfg.chip}`}>
                  {s.status === "Completo" ? (
                    <span className="flex text-success">
                      <IconCheck size={11} strokeWidth={3} />
                    </span>
                  ) : (
                    s.id
                  )}
                </span>
                <span className="block min-w-0 flex-1">
                  <span className={`block text-sm leading-snug ${isActive ? "font-semibold text-royal-hover" : "font-medium text-text-2"}`}>
                    {s.titulo}
                    {s.origem === "servidor" ? (
                      // Distinta de "Opt.": a do servidor não é dispensável pela
                      // lei, é uma seção que ele criou.
                      <span className="ml-1.25 text-2xs font-semibold text-text-muted">Sua</span>
                    ) : foiDispensada(s) ? (
                      // "Dispensada" e não "Opt.": o trilho precisa distinguir a
                      // seção que pode ficar em branco daquela que já foi
                      // dispensada com justificativa registrada.
                      <span className="ml-1.25 text-2xs font-semibold text-royal">Dispensada</span>
                    ) : (
                      !s.obrigatoria && <span className="ml-1.25 text-2xs text-text-muted">Opt.</span>
                    )}
                  </span>
                </span>
                <span className={`size-1.5 shrink-0 rounded-full ${cfg.dot}`} />
              </button>
            )
          })}

          {/*
            A etapa final fecha a trilha. Fica sempre alcançável: revisar o
            documento inteiro não deveria depender de chegar à última seção.
          */}
          {lista.length > 0 && (
            <button
              type="button"
              onClick={() => trocarSecao(ETAPA_FINAL)}
              className={`mb-0.5 mt-1.5 flex w-60 shrink-0 cursor-pointer items-center gap-2.5 rounded-md border-t border-border-soft p-2.5 pt-3 text-left transition-colors lg:w-full ${
                naEtapaFinal
                  ? "border border-tint-royal-border bg-tint-royal-bg"
                  : "border-x border-b border-x-transparent border-b-transparent bg-transparent"
              }`}
            >
              <span className="flex size-5.5 shrink-0 items-center justify-center rounded-sm bg-border-soft text-slate-strong">
                <IconCheckCircle size={12} strokeWidth={2.5} />
              </span>
              <span className="block min-w-0 flex-1">
                <span
                  className={`block text-sm leading-snug ${naEtapaFinal ? "font-semibold text-royal-hover" : "font-medium text-text-2"}`}
                >
                  Revisão e Geração
                  {/* "Etapa" e não um número: ela não é um inciso do documento. */}
                  <span className="ml-1.25 text-2xs text-text-muted">Etapa</span>
                </span>
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Área do formulário */}
      <div className="flex flex-1 flex-col overflow-hidden bg-ice">
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-3.5">
          <div className="min-w-0 flex-[1_1_220px]">
            <div className="mb-0.5 text-xs text-text-muted">
              {naEtapaFinal
                ? `Etapa final · ${meta.titulo}`
                : `Seção ${active?.id} de ${lista.length} · ${active?.fundamentoLegal}`}
            </div>
            <h2 className="m-0 font-display text-panel font-bold text-text-1">
              {naEtapaFinal ? "Revisão e Geração" : active?.titulo}
            </h2>
          </div>
          {/*
            Salvar e Orientações são da seção. Na etapa final não há seção a
            salvar — o que há ali é o documento inteiro, e as ações dele estão
            no próprio bloco.

            "Salvar Rascunho" não repete "Salvar e Avançar": este declara a
            seção **Completo** — é o que conta no progresso e o que libera a
            geração do documento —, aquele guarda o texto sem afirmar que a
            seção está pronta. Chamar os dois de "Salvar" é que fazia parecer
            o mesmo botão duas vezes.
          */}
          {!naEtapaFinal && (
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                icon={<IconHelp size={13} />}
                onClick={() => showToast(active?.hint ?? "Preencha a seção conforme as orientações metodológicas.")}
              >
                Orientações
              </Button>
              <Button
                variant={saved ? "success" : "primary"}
                size="sm"
                icon={saved ? <IconCheck size={13} strokeWidth={3} /> : <IconSave size={13} />}
                disabled={salvar.isPending}
                onClick={() => handleSave()}
              >
                {saved ? "Salvo!" : salvar.isPending ? "Salvando..." : "Salvar Rascunho"}
              </Button>
            </div>
          )}
        </div>

        <div className="relative flex-1 overflow-y-auto p-4 lg:p-6">

          {naEtapaFinal && (
            <EtapaFinal
              processoId={processoId}
              tipo={tipo}
              secoes={lista}
              jaGerado={jaGerado}
              pendente={gerarDocumento.isPending}
              onGerar={(regerar) =>
                gerarDocumento.mutate(
                  { processoId, tipo },
                  {
                    onSuccess: () => {
                      showToast(
                        `${tipo} ${regerar ? "regerado" : "gerado"} e disponível em Documentos.`,
                      )
                      router.push(`/processos/detalhe?id=${encodeURIComponent(processoId)}`)
                    },
                  },
                )
              }
              onVisualizar={() => router.push("/documentos")}
            />
          )}

          {!naEtapaFinal && active?.painel && active.painel !== "ata" ? (
            /*
              O painel recebe a geração: ele é quem sabe montar o rascunho a
              partir do processo, e os dois botões ficam lado a lado lá dentro.
            */
            <PainelDaSecao
              secao={active}
              processoId={processoId}
              rascunho={rascunho}
              setRascunho={setRascunho}
              gerando={gerar.isPending}
              onGerarComIa={handleGerarIA}
            />
          ) : !naEtapaFinal && active ? (
            <SectionBlock title={active.titulo} hint={active.hint ?? ""}>
              {active.status === "Completo" && rascunho === active.conteudo && active.conteudo !== "" ? (
                <div className="flex flex-col gap-3.5">
                  <div className="flex items-start gap-3 rounded-xl border border-tint-success-border bg-tint-success-bg px-4.5 py-4">
                    <span className="mt-px flex shrink-0 text-success">
                      <IconCheckCircle size={18} strokeWidth={2.5} />
                    </span>
                    <div>
                      <div className="text-md font-bold text-tint-success-fg">Seção Concluída</div>
                      <p className="m-0 mt-1 text-base text-tint-success-fg-soft">
                        Esta seção foi preenchida e validada. Edite o conteúdo abaixo para revisar.
                      </p>
                    </div>
                  </div>
                  <Textarea value={rascunho} onChange={(e) => setRascunho(e.target.value)} rows={6} />
                  <ValidationMsg type="ok" msg="Texto suficiente para fundamentar a seção." />
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <Textarea
                    ref={campoDoTexto}
                    value={rascunho}
                    onChange={(e) => setRascunho(e.target.value)}
                    rows={6}
                    placeholder="Preencha o conteúdo desta seção..."
                  />
                  {/*
                    A IA fica **sempre**: sem modelo configurado o botão vem
                    desabilitado com o motivo (ADR-029), e com texto na tela ela
                    parte do que está escrito — sumir depois da primeira linha
                    tirava justamente o caminho de "redija a partir do que eu
                    rascunhei".
                  */}
                  <CaminhosDaSecao gerando={gerar.isPending} onGerarComIa={handleGerarIA} />
                  {rascunho.trim() !== "" && (
                    <ValidationMsg type="ok" msg="Texto suficiente para fundamentar a seção." />
                  )}
                  {gerar.isPending && <InlineSpinner label="Gerando conteúdo da seção... aguarde." />}
                </div>
              )}
            </SectionBlock>
          ) : null}

          {/* Painel de Adesão de ATA — acompanha o Levantamento de Mercado. */}
          {active?.painel === "ata" && <PainelATA />}

          {/*
            As seções da Cotação. A pesquisa de preços é uma só — a série
            coletada —, e as quatro seções leem dela em vez de pedir que alguém
            redigite o mesmo número quatro vezes (IN SEGES/ME nº 65/2021, Art. 3º).
          */}
          {active?.painel === "fontes" && (
            <PainelDasFontes
              secao={active}
              processoId={processoId}
              rascunho={rascunho}
              setRascunho={setRascunho}
              gerando={gerar.isPending}
              onGerarComIa={handleGerarIA}
            />
          )}
          {active?.painel === "coletas" && (
            <PainelDasColetas
              secao={active}
              processoId={processoId}
              rascunho={rascunho}
              setRascunho={setRascunho}
              gerando={gerar.isPending}
              onGerarComIa={handleGerarIA}
            />
          )}
          {active?.painel === "analise" && (
            <PainelDaAnaliseCritica
              secao={active}
              processoId={processoId}
              rascunho={rascunho}
              setRascunho={setRascunho}
              gerando={gerar.isPending}
              onGerarComIa={handleGerarIA}
            />
          )}
          {active?.painel === "referencia" && (
            <PainelDoPrecoDeReferencia
              secao={active}
              processoId={processoId}
              rascunho={rascunho}
              setRascunho={setRascunho}
              gerando={gerar.isPending}
              onGerarComIa={handleGerarIA}
            />
          )}

          {/*
            A dotação orçamentária — TR 'j', Edital (Art. 150) e a cláusula do
            contrato (Art. 92, VIII). O crédito é declarado uma vez, no processo;
            aqui ele é mostrado, confrontado com o valor estimado e escrito.
          */}
          {active?.painel === "dotacao" && (
            <PainelDotacao
              secao={active}
              processoId={processoId}
              rascunho={rascunho}
              setRascunho={setRascunho}
              gerando={gerar.isPending}
              onGerarComIa={handleGerarIA}
              // A alínea 'j' do TR pede a dotação **e** a previsão no PCA; o
              // Art. 150 e o Art. 92, VIII pedem só o crédito.
              comPrevisaoNoPca={tipo === "TR"}
            />
          )}

          {/* Previsão no PCA — acompanha o inciso II. Precisa do processo, e
              por isso não passa pelo despachante genérico de painéis. */}
          {active?.painel === "pca" && (
            <PainelPca
              secao={active}
              processoId={processoId}
              rascunho={rascunho}
              setRascunho={setRascunho}
              gerando={gerar.isPending}
              onGerarComIa={handleGerarIA}
            />
          )}

          {/*
            A dispensa vale para toda seção dispensável, tenha painel ou não. A
            do inciso II tem painel próprio e ficava sem a ação: a lei permite
            dispensá-la (Art. 18, § 2º) e a tela não oferecia o caminho.
          */}
          {active && !active.obrigatoria && rascunho.trim() === "" && (
            <div className="mt-4">
              <DispensaDeSecao
                secao={active}
                pendente={salvar.isPending}
                onDispensar={(justificativa) =>
                  salvar.mutate({
                    secaoId: active.id,
                    conteudo: "",
                    justificativaDispensa: justificativa,
                  })
                }
                onDesfazer={() =>
                  salvar.mutate({ secaoId: active.id, conteudo: "", justificativaDispensa: "" })
                }
              />
            </div>
          )}


          {/*
            A navegação entre seções. Gerar o documento não está mais aqui: ele
            se gera na etapa final, depois de a pessoa ver o todo (§69).
          */}
          <div className="mt-6 flex flex-wrap justify-between gap-2.5">
            <p id="motivo-secao-anterior" className="sr-only">
              Esta é a primeira seção do documento.
            </p>
            <Button
              variant="secondary"
              disabled={activeSection === lista[0]?.id}
              ariaDescribedBy={activeSection === lista[0]?.id ? "motivo-secao-anterior" : undefined}
              onClick={() => {
                if (naEtapaFinal) {
                  const ultima = lista[lista.length - 1]
                  if (ultima) trocarSecao(ultima.id)
                  return
                }
                const idx = lista.findIndex((s) => s.id === activeSection)
                const anterior = lista[idx - 1]
                if (anterior) trocarSecao(anterior.id)
              }}
              className={activeSection === lista[0]?.id ? "opacity-40" : ""}
            >
              ← Seção Anterior
            </Button>
            {!naEtapaFinal && (
              <Button
                disabled={salvar.isPending}
                onClick={() => {
                  const idx = lista.findIndex((s) => s.id === activeSection)
                  // Da última seção o avanço leva à etapa final: é o passo
                  // seguinte, e antes ele simplesmente não existia.
                  handleSave(true, lista[idx + 1]?.id ?? ETAPA_FINAL)
                }}
              >
                Salvar e Avançar →
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
