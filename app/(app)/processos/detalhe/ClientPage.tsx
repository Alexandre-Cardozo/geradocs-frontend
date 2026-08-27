"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { Button, Dropdown, FileUpload, InfoBanner, ProgressBar, StatusBadge, Tag, Textarea } from "@/components/ui"
import {
  IconArrowRight,
  IconCheckCircle,
  IconEye,
  IconFile,
  IconFileText,
  IconPencil,
  IconPlus,
} from "@/components/ui/icons"
import { ErrorState, LoadingState } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import {
  useAtualizarProcesso,
  useConfigTenant,
  useDocumentos,
  useEncerrarProcesso,
  useGerarDocumento,
  useParecerDFD,
  useProcesso,
  useSecoes,
} from "@/lib/api/hooks"
import { ConsolidacaoDaDemanda } from "@/components/processos/consolidacao-da-demanda"
import { DfdsAnexados } from "@/components/processos/dfds-anexados"
import { ItensDoDfd } from "@/components/processos/itens-do-dfd"
import { TrilhaDoProcesso } from "@/components/processos/trilha-do-processo"
import { PainelRetificacao } from "@/components/processos/painel-retificacao"
import { AlertaOrientacao } from "@/components/shared/alerta-orientacao"
import { CATALOGO, documentosDaModalidade, ordenar, pendencias } from "@/lib/documentos"
import {
  documentosPendentes,
  impactoTrocaModalidade,
  rotuloDaVersao,
  type Retificacao,
} from "@/lib/dominio"
import { formatBRL, formatData } from "@/lib/format"
import { MODALIDADE_LABEL, type Modalidade, type TipoDocumento } from "@/lib/types"

export default function HubProcesso() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const showToast = useToast()
  const processoId = searchParams.get("id") ?? ""

  const processo = useProcesso(processoId)
  const documentos = useDocumentos()
  const parecer = useParecerDFD(processoId)
  const { data: tenant } = useConfigTenant()
  const atualizar = useAtualizarProcesso()
  const gerar = useGerarDocumento()
  const encerrar = useEncerrarProcesso()

  // Seções de cada tipo, para o progresso dos cards. As chamadas são explícitas
  // e em ordem fixa porque hooks não podem ser chamados em laço.
  const secoesPorTipo: Record<TipoDocumento, ReturnType<typeof useSecoes>> = {
    "Cotação": useSecoes(processoId, "Cotação"),
    ETP: useSecoes(processoId, "ETP"),
    Mapa: useSecoes(processoId, "Mapa"),
    TR: useSecoes(processoId, "TR"),
    Edital: useSecoes(processoId, "Edital"),
    Contrato: useSecoes(processoId, "Contrato"),
  }

  const [editando, setEditando] = useState(false)
  const [objeto, setObjeto] = useState("")
  const [objetoDemanda, setObjetoDemanda] = useState("")
  const [secretaria, setSecretaria] = useState("")
  const [dfd, setDfd] = useState<string | null>(null)
  // Modalidade escolhida mas ainda não aplicada: fica pendente enquanto o
  // alerta de impacto está na tela.
  const [novaModalidade, setNovaModalidade] = useState<Modalidade | null>(null)
  // Documento cuja retificação está sendo declarada. Um por vez: retificar dois
  // ao mesmo tempo esconderia qual histórico está sendo lido.
  const [retificando, setRetificando] = useState<TipoDocumento | null>(null)

  const abrirEdicao = () => {
    if (!processo.data) return
    setObjeto(processo.data.objeto)
    setObjetoDemanda(processo.data.objetoDemanda ?? "")
    setSecretaria(processo.data.secretaria)
    setDfd(processo.data.dfdArquivo ?? null)
    setEditando(true)
  }

  const salvarEdicao = () => {
    atualizar.mutate(
      {
        id: processoId,
        objeto: objeto.trim() || undefined,
        objetoDemanda: objetoDemanda.trim(),
        secretaria,
        dfdArquivo: dfd,
      },
      {
        onSuccess: () => {
          setEditando(false)
          showToast("Dados do processo atualizados.")
        },
      }
    )
  }

  if (processo.isPending) return <LoadingState label="Carregando processo..." />
  if (processo.isError || !processo.data) {
    return (
      <div className="p-4 sm:p-5 lg:p-7">
        <div className="rounded-card border border-border bg-surface">
          <ErrorState message={processo.error?.message} onRetry={() => void processo.refetch()} />
        </div>
      </div>
    )
  }

  const proc = processo.data
  const docsGerados = (documentos.data ?? []).filter((d) => d.processoId === processoId)
  const tiposGeradosAgora = docsGerados.map((d) => d.tipo)

  const impacto =
    novaModalidade === null
      ? null
      : impactoTrocaModalidade(proc.modalidade, novaModalidade, proc.documentos, tiposGeradosAgora)

  const aplicarModalidade = (documentos: TipoDocumento[], justificativa?: string) => {
    if (!novaModalidade) return
    atualizar.mutate(
      { id: processoId, modalidade: novaModalidade, documentos, justificativaModalidade: justificativa },
      {
        onSuccess: () => {
          setNovaModalidade(null)
          showToast(`Modalidade alterada para ${MODALIDADE_LABEL[novaModalidade]}. A troca está na trilha.`)
        },
      },
    )
  }

  const adicionarDocumento = (tipo: TipoDocumento) => {
    atualizar.mutate(
      { id: processoId, documentos: ordenar([...proc.documentos, tipo]) },
      { onSuccess: () => showToast(`${CATALOGO[tipo].titulo} adicionado ao processo.`) }
    )
  }

  const gerarDireto = (tipo: TipoDocumento) => {
    gerar.mutate(
      { processoId, tipo },
      { onSuccess: () => showToast(`${tipo} gerado e disponível em Documentos.`) }
    )
  }

  // Encerramento: a plataforma termina quando os documentos estão prontos. O
  // protocolo e a aprovação acontecem no sistema administrativo da entidade.
  // A regra é do domínio, e não uma filtragem repetida aqui: o servidor cobra a
  // mesma coisa ao encerrar, e duas cópias da regra é como elas divergem.
  const pendentes = documentosPendentes(proc, tiposGeradosAgora)
  const podeEncerrar = proc.status !== "concluido" && proc.documentos.length > 0

  const encerrarProcesso = () => {
    // Pendência não impede: exige justificativa. A plataforma orienta, não trava.
    const justificativa =
      pendentes.length === 0
        ? ""
        : (window.prompt(
            `Faltam ${pendentes.length} documento(s): ${pendentes
              .map((t) => CATALOGO[t].titulo)
              .join(", ")}.\n\nInforme a justificativa para encerrar mesmo assim:`,
          ) ?? "")
    if (pendentes.length > 0 && justificativa.trim() === "") return
    encerrar.mutate(
      { processoId, justificativa },
      {
        onSuccess: () => showToast("Processo encerrado. Protocole os documentos no sistema da entidade."),
        onError: (e) => showToast(e instanceof Error ? e.message : "Não foi possível encerrar o processo."),
      },
    )
  }

  // Documentos do processo na ordem canônica do fluxo, e os que ainda cabem
  // acrescentar — limitados aos cabíveis à modalidade (Dispensa não tem Edital).
  const tiposDoProcesso = ordenar(proc.documentos)
  const tiposDisponiveis = documentosDaModalidade(proc.modalidade).filter((t) => !proc.documentos.includes(t))
  const tiposGerados = docsGerados.map((d) => d.tipo)
  const dfdVerificado = parecer.data != null

  return (
    <div className="max-w-content p-4 sm:p-5 lg:p-7">
      <Link href="/processos" className="mb-3 inline-flex items-center gap-1.5 text-sm font-semibold text-text-3 no-underline">
        <span className="rotate-180">
          <IconArrowRight size={13} strokeWidth={2.5} />
        </span>
        Voltar aos Processos
      </Link>

      {/* Cabeçalho do processo */}
      <div className="mb-6 rounded-card border border-border bg-surface p-5 lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="font-mono text-xs text-text-muted">{proc.numero}</span>
              <StatusBadge status={proc.status} size="sm" />
              {/*
                A troca fica **colada na modalidade**, que é o que ela muda, e
                em ícone: como texto azul solto na linha ela competia com o
                "Editar Dados" — dois azuis lado a lado, e o secundário com mais
                palavras que o principal. Aqui ela some de vista sem sair do
                alcance: quem procura trocar a modalidade olha para a modalidade.
              */}
              <span className="inline-flex items-center gap-1">
                <Tag tone="info">{MODALIDADE_LABEL[proc.modalidade]}</Tag>
                {proc.status !== "concluido" && novaModalidade === null && (
                  <button
                    type="button"
                    aria-label="Trocar modalidade"
                    title="Trocar modalidade"
                    onClick={() => setNovaModalidade(proc.modalidade)}
                    className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-border bg-ice text-text-3 transition-colors hover:bg-border-soft hover:text-royal"
                  >
                    <IconPencil size={12} />
                  </button>
                )}
              </span>
            </div>
            {!editando ? (
              <h1 className="mt-2 mb-0 font-display text-2xl font-extrabold tracking-tight break-words text-text-1">{proc.objeto}</h1>
            ) : (
              <div className="mt-3 max-w-xl">
                <label className="mb-1 block text-sm font-semibold text-text-2">Descrição do Processo</label>
                <p className="mb-1.5 text-xs text-text-muted">Nomenclatura que identifica o processo no painel e nas listagens.</p>
                <Textarea value={objeto} onChange={(e) => setObjeto(e.target.value)} rows={2} />
              </div>
            )}
          </div>
          {!editando ? (
            <Button variant="secondary" size="sm" icon={<IconFile size={13} />} onClick={abrirEdicao}>
              Editar Dados
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={() => setEditando(false)}>
                Cancelar
              </Button>
              <Button size="sm" disabled={atualizar.isPending} onClick={salvarEdicao}>
                {atualizar.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
        </div>

        {novaModalidade !== null && (
          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-border bg-ice p-4">
            <div className="max-w-sm">
              <label className="mb-1 block text-sm font-semibold text-text-2">Nova modalidade</label>
              <Dropdown
                value={novaModalidade}
                onChange={(v) => setNovaModalidade(v as Modalidade)}
                ariaLabel="Nova modalidade do processo"
                options={Object.entries(MODALIDADE_LABEL).map(([value, label]) => ({ value, label }))}
              />
            </div>

            {impacto?.exigeJustificativa ? (
              <AlertaOrientacao
                titulo="A troca muda os documentos cabíveis"
                recomendacao={`Ajustar a lista para o que ${MODALIDADE_LABEL[novaModalidade]} comporta.`}
                detalhes={
                  <ul className="m-0 flex list-disc flex-col gap-1 pl-4">
                    {impacto.jaGeradosQueDeixamDeSerCabiveis.length > 0 && (
                      <li>
                        <strong>Já gerado e deixa de ser cabível:</strong>{" "}
                        {impacto.jaGeradosQueDeixamDeSerCabiveis.join(", ")} — o arquivo continua no
                        repositório e passa a contradizer o processo.
                      </li>
                    )}
                    {impacto.deixamDeSerCabiveis.length > 0 && (
                      <li>Deixa de ser cabível: {impacto.deixamDeSerCabiveis.join(", ")}.</li>
                    )}
                    {impacto.passamASerObrigatorios.length > 0 && (
                      <li>Passa a ser obrigatório: {impacto.passamASerObrigatorios.join(", ")}.</li>
                    )}
                  </ul>
                }
                rotuloSeguir="Trocar e ajustar os documentos"
                rotuloDivergir="Trocar e manter a lista"
                placeholderJustificativa="Explique por que a lista de documentos permanece como está."
                pendente={atualizar.isPending}
                onSeguir={() => aplicarModalidade(impacto.documentosSugeridos)}
                onDivergir={(justificativa) => aplicarModalidade(proc.documentos, justificativa)}
                onCancelar={() => setNovaModalidade(null)}
              />
            ) : (
              <div className="flex flex-wrap gap-2.5">
                <p id="motivo-trocar-modalidade" className="sr-only">
                  Escolha uma modalidade diferente da atual.
                </p>
                <Button
                  disabled={atualizar.isPending || novaModalidade === proc.modalidade}
                  ariaDescribedBy="motivo-trocar-modalidade"
                  onClick={() => aplicarModalidade(proc.documentos)}
                >
                  {atualizar.isPending ? "Trocando..." : "Trocar modalidade"}
                </Button>
                <Button variant="ghost" onClick={() => setNovaModalidade(null)}>
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        )}

        <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-2xs font-semibold tracking-caps text-text-muted uppercase">Secretaria</dt>
            {!editando ? (
              <dd className="m-0 mt-0.5 text-base text-text-1">{proc.secretaria}</dd>
            ) : (
              <dd className="m-0 mt-1">
                <Dropdown
                  value={secretaria}
                  onChange={setSecretaria}
                  ariaLabel="Secretaria requisitante"
                  options={(tenant?.secretarias ?? []).map((s) => ({ value: s.nome, label: s.nome }))}
                />
              </dd>
            )}
          </div>
          <div>
            <dt className="text-2xs font-semibold tracking-caps text-text-muted uppercase">Valor Estimado</dt>
            <dd className="m-0 mt-0.5 font-mono text-base font-semibold text-petroleum">{formatBRL(proc.valorEstimado)}</dd>
          </div>
          <div>
            <dt className="text-2xs font-semibold tracking-caps text-text-muted uppercase">Responsável</dt>
            <dd className="m-0 mt-0.5 text-base text-text-1">{proc.responsavel}</dd>
          </div>
          <div>
            <dt className="text-2xs font-semibold tracking-caps text-text-muted uppercase">Atualizado em</dt>
            <dd className="m-0 mt-0.5 text-base text-text-1">{formatData(proc.atualizadoEm)}</dd>
          </div>

          {/* Objeto da Demanda — trabalha junto com o DFD, alimenta o ETP */}
          <div className="sm:col-span-2 lg:col-span-4">
            <dt className="text-2xs font-semibold tracking-caps text-text-muted uppercase">Objeto da Demanda</dt>
            {!editando ? (
              <dd className="m-0 mt-0.5 text-base text-text-1">
                {proc.objetoDemanda ? proc.objetoDemanda : <span className="text-text-faint">Não informado</span>}
              </dd>
            ) : (
              <dd className="m-0 mt-1.5 max-w-2xl">
                <p className="mb-1.5 text-xs text-text-muted">Objeto da contratação em si — trabalha junto com o DFD e alimenta as seções do ETP.</p>
                <Textarea
                  value={objetoDemanda}
                  onChange={(e) => setObjetoDemanda(e.target.value)}
                  rows={3}
                  placeholder="Ex: Aquisição de 150 microcomputadores tipo desktop e periféricos para os laboratórios..."
                />
              </dd>
            )}
          </div>

          <div className="sm:col-span-2 lg:col-span-4">
            <dt className="text-2xs font-semibold tracking-caps text-text-muted uppercase">
              Documento de Formalização de Demanda (DFD)
            </dt>
            {!editando ? (
              <dd className="m-0 mt-0.5 text-base text-text-1">
                {proc.dfdArquivo ? <span className="font-mono text-sm">{proc.dfdArquivo}</span> : <span className="text-text-faint">Não anexado</span>}
              </dd>
            ) : (
              <dd className="m-0 mt-1.5 max-w-xl">
                <FileUpload file={dfd} onChange={setDfd} placeholder="Anexar ou substituir o DFD (PDF ou DOCX)" accept=".pdf,.docx,.doc" />
              </dd>
            )}
          </div>
        </dl>
      </div>

      {/* Fase de verificação do DFD (quando configurada) */}
      {proc.fases.verificacaoDFD && (
        <button
          type="button"
          onClick={() => router.push(`/processos/dfd?id=${encodeURIComponent(processoId)}`)}
          className="mb-4 flex w-full items-center gap-4 rounded-card border border-border bg-surface px-5 py-4 text-left transition-colors hover:bg-ice"
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-tint-royal-bg text-royal">
            <IconFileText size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-md font-bold text-text-1">Verificação do DFD pela IA</span>
            <span className="block text-sm text-text-3">
              {dfdVerificado ? "Parecer emitido — clique para revisar os achados." : "Etapa inicial — analise o DFD antes de elaborar os documentos."}
            </span>
          </span>
          {dfdVerificado ? <Tag tone="success">Concluída</Tag> : <Tag tone="info">Disponível</Tag>}
          <span className="flex text-text-muted">
            <IconArrowRight size={16} strokeWidth={2.5} />
          </span>
        </button>
      )}

      {/*
        Consolidação da demanda — só aparece quando há DFD com itens. É o que
        transforma "três secretarias pediram papel A4" em uma linha de compra, e
        é onde as divergências aparecem antes de virarem edital.
      */}
      <div className="mb-6">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 font-display text-lg font-bold text-text-1">Demanda Consolidada</h2>
          <span className="text-sm text-text-3">
            Alimenta o painel de quantidades do ETP e a Cotação.
          </span>
        </div>
        <div className="flex flex-col gap-4">
          <ConsolidacaoDaDemanda processoId={processoId} dfdAnexado={proc.dfdArquivo} />
          {/*
            Os anexos em si, com data e download. Anexar de novo versiona em vez
            de substituir (ADR-028): é esta lista que responde qual DFD embasou
            os documentos gerados até aqui.
          */}
          <DfdsAnexados processoId={processoId} />
          {/*
            Só quando há DFD registrado: informar item de um DFD que não existe
            seria inventar a origem do pedido.
          */}
          {proc.dfdArquivo && (
            <ItensDoDfd
              processoId={processoId}
              nomeDoArquivo={proc.dfdArquivo}
              onPronto={() => showToast("Consolidação atualizada.")}
            />
          )}
        </div>
      </div>

      {/* Documentos do processo — na ordem canônica do fluxo de contratação */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="m-0 font-display text-lg font-bold text-text-1">Documentos do Processo</h2>
        <span className="text-sm text-text-3">Elabore na ordem indicada — cada etapa fundamenta a seguinte.</span>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {tiposDoProcesso.map((tipo, i) => {
          const meta = CATALOGO[tipo]
          const gerado = docsGerados.find((d) => d.tipo === tipo)
          const finalizado = gerado != null
          const secoesLista = secoesPorTipo[tipo].data ?? []
          const concluidas = secoesLista.filter((s) => s.status === "Completo").length
          const total = secoesLista.length
          const progresso = finalizado ? 100 : total > 0 ? Math.round((concluidas / total) * 100) : 0
          // Só as seções indispensáveis liberam a geração (no ETP, Art. 18, § 2º).
          const obrigatoriasOk =
            total > 0 && secoesLista.filter((s) => s.obrigatoria).every((s) => s.status === "Completo")
          // Dependências ainda não geradas: o TR se fundamenta no ETP, o Edital
          // tem o TR como anexo, e a minuta de contrato vincula-se a ambos.
          const bloqueios = pendencias(tipo, proc.documentos, tiposGerados)
          const bloqueado = bloqueios.length > 0 && !finalizado
          const editorHref = `/processos/documento?id=${encodeURIComponent(processoId)}&tipo=${meta.slug}`

          return (
            <div
              key={tipo}
              /*
               * Bloqueado muda a superfície, não a opacidade.
               *
               * `opacity-70` no cartão inteiro apagava o texto junto: a 70% os
               * cinzas caem para 3,2:1, abaixo dos 4,5:1 da WCAG AA — e apagava
               * justamente a etiqueta que diz o que falta para desbloquear.
               */
              className={`flex flex-col rounded-card border border-border p-5 ${
                bloqueado ? "bg-ice" : "bg-surface"
              }`}
            >
              <div className="mb-3 flex items-start gap-3">
                <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${meta.chip}`}>
                  <IconFileText size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-display text-md font-bold text-text-1">
                    <span className="mr-1.5 font-mono text-xs text-text-muted">{i + 1}.</span>
                    {meta.titulo}
                  </div>
                  <div className="mt-0.5 font-mono text-xs text-text-muted">{meta.fundamento}</div>
                </div>
                {finalizado ? (
                  <span className="flex flex-col items-end">
                    <span className="flex items-center gap-1 text-sm font-semibold text-success">
                      <IconCheckCircle size={15} strokeWidth={2.5} />
                      Finalizado
                    </span>
                    {gerado && (
                      <span
                        className={`mt-0.5 font-mono text-2xs ${
                          gerado.versao > 1 ? "font-semibold text-tint-warning-fg" : "text-text-muted"
                        }`}
                      >
                        {rotuloDaVersao(gerado.versao)}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-sm font-semibold text-text-3">{progresso}%</span>
                )}
              </div>

              <ProgressBar percent={progresso} />


              <div className="mt-4 flex flex-wrap items-center gap-2">
                {bloqueado ? (
                  <Tag tone="warning">
                    Requer {bloqueios.map((d) => CATALOGO[d].titulo).join(" e ")}
                  </Tag>
                ) : finalizado ? (
                  <>
                    <Button size="sm" variant="secondary" icon={<IconEye size={13} />} onClick={() => router.push("/documentos")}>
                      Visualizar Documento
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => router.push(editorHref)}>
                      Revisar Seções
                    </Button>
                    {proc.status !== "concluido" && retificando !== tipo && (
                      <Button size="sm" variant="ghost" onClick={() => setRetificando(tipo)}>
                        Retificar
                      </Button>
                    )}
                  </>
                ) : obrigatoriasOk ? (
                  <>
                    <Button size="sm" disabled={gerar.isPending} onClick={() => gerarDireto(tipo)}>
                      {gerar.isPending ? "Gerando..." : "Gerar Documento"}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => router.push(editorHref)}>
                      Revisar Seções
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    icon={<IconArrowRight size={13} strokeWidth={2.5} />}
                    onClick={() => router.push(editorHref)}
                  >
                    {progresso > 0 ? `Continuar ${tipo}` : `Elaborar ${tipo}`}
                  </Button>
                )}
              </div>

              {retificando === tipo && gerado && (
                <PainelRetificacao
                  processoId={processoId}
                  tipo={tipo}
                  versaoAtual={gerado.versao}
                  pendente={gerar.isPending}
                  onConfirmar={(retificacao: Retificacao) =>
                    gerar.mutate(
                      { processoId, tipo, retificacao },
                      {
                        onSuccess: (doc) => {
                          setRetificando(null)
                          showToast(`${tipo} retificado — ${rotuloDaVersao(doc.versao)}.`)
                        },
                      },
                    )
                  }
                  onCancelar={() => setRetificando(null)}
                />
              )}
            </div>
          )
        })}
      </div>

      {/* Adicionar novos documentos */}
      {tiposDisponiveis.length > 0 && (
        <div className="mt-4 rounded-card border border-dashed border-border bg-surface px-5 py-4">
          <div className="mb-2.5 text-sm font-semibold text-text-2">Adicionar documento ao processo</div>
          <div className="flex flex-wrap gap-2">
            {tiposDisponiveis.map((tipo) => (
              <button
                key={tipo}
                type="button"
                disabled={atualizar.isPending}
                onClick={() => adicionarDocumento(tipo)}
                className="flex items-center gap-1.5 rounded-md border border-border bg-ice px-3 py-1.75 text-sm font-semibold text-text-2 transition-colors hover:bg-surface disabled:opacity-50"
              >
                <IconPlus size={13} strokeWidth={2.5} />
                {CATALOGO[tipo].titulo}
              </button>
            ))}
          </div>
        </div>
      )}

      {proc.documentos.length === 0 && (
        <InfoBanner tone="info" className="mt-4">
          Nenhum documento solicitado para este processo. Adicione um documento acima para começar.
        </InfoBanner>
      )}

      {/* Encerramento — a plataforma entrega os documentos; o protocolo é no GPI */}
      {podeEncerrar && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-surface p-5">
          <div className="min-w-0 flex-1">
            <div className="font-display text-md font-bold text-text-1">Encerrar Processo</div>
            <p id="ajuda-encerrar" className="m-0 mt-1 text-sm text-text-3">
              {pendentes.length === 0
                ? "Todos os documentos foram gerados. Encerre o processo e protocole os arquivos no sistema administrativo da entidade."
                : `Ainda faltam: ${pendentes
                    .map((t) => CATALOGO[t].titulo)
                    .join(", ")}. É possível encerrar assim mesmo, mediante justificativa.`}
            </p>
          </div>
          <Button
            icon={<IconArrowRight size={14} strokeWidth={2.5} />}
            disabled={encerrar.isPending}
            onClick={encerrarProcesso}
          >
            {encerrar.isPending ? "Encerrando..." : "Encerrar Processo"}
          </Button>
        </div>
      )}

      {proc.status === "concluido" && (
        <InfoBanner tone="success" className="mt-6">
          Processo encerrado. Os documentos estão no repositório, prontos para protocolo no sistema
          administrativo da entidade.
        </InfoBanner>
      )}

      {/* Trilha — o que o servidor registrou, e não o que esta aba viu (ADR-024) */}
      <div className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="m-0 font-display text-lg font-bold text-text-1">Trilha do Processo</h2>
          <span className="text-sm text-text-3">
            Registro do que aconteceu, com quem agiu e por quê.
          </span>
        </div>
        <div className="rounded-card border border-border bg-surface p-5">
          <TrilhaDoProcesso processoId={processoId} />
        </div>
      </div>
    </div>
  )
}
