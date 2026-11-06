"use client"

import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

import { Button, ChoiceCard, Dropdown, InfoBanner, MoneyInput, ProgressBar, Tag, Textarea } from "@/components/ui"
import {
  IconArrowRight,
  IconCheckCircle,
  IconDownload,
  IconEye,
  IconFile,
  IconFileText,
  IconPlus,
} from "@/components/ui/icons"
import { ErrorState, LoadingState } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import {
  useAtualizarProcesso,
  useConfigTenant,
  useConfirmarContextos,
  useContextosDaContratacao,
  useDocumentos,
  useEncerrarProcesso,
  useParecerDFD,
  useProcesso,
  useSecoes,
  useServidoresDoOrgao,
  useSessao,
} from "@/lib/api/hooks"
import { ConciliacaoDeValores } from "@/components/processos/conciliacao-de-valores"
import { ResumoDaEstimativa } from "@/components/processos/resumo-da-estimativa"
import { ConferenciaDaDispensa } from "@/components/processos/conferencia-da-dispensa"
import { ConsolidacaoDaDemanda } from "@/components/processos/consolidacao-da-demanda"
import { ContextosDaContratacao } from "@/components/processos/contextos-da-contratacao"
import { NaturezaDoObjetoEmPilulas } from "@/components/processos/natureza-do-objeto"
import { DfdsDoProcesso } from "@/components/processos/dfds-do-processo"
import { DotacoesDoProcesso } from "@/components/processos/dotacoes-do-processo"
import { EncerramentoComPendencias } from "@/components/processos/encerramento-com-pendencias"
import { ItensDaDemanda } from "@/components/processos/itens-da-demanda"
import { JuntadaDoProcesso } from "@/components/processos/juntada-do-processo"
import { ProgressoDosObrigatorios } from "@/components/processos/progresso-dos-obrigatorios"
import { TrilhaDoProcesso } from "@/components/processos/trilha-do-processo"
import {
  CATALOGO,
  agruparAnexos,
  documentosDaModalidade,
  ehObrigatorio,
  ordenar,
  pendencias,
} from "@/lib/documentos"
import { rotaDoDocumentoGerado, rotaDosDocumentosDoProcesso } from "@/lib/documentos/rotas"
import {
  documentosPendentes,
  documentosPorFazerSemCobranca,
  houveTroca,
  impactoTrocaModalidade,
  rotuloDaModalidade,
  rotuloDaVersao,
} from "@/lib/dominio"
import { formatBRL, formatDataHora, formatNumeroBR, parseValorBR } from "@/lib/format"
import { opcoesDeSecretaria } from "@/lib/secretarias/opcoes"
import {
  NATUREZA_DO_OBJETO,
  type NaturezaDoObjeto,
  FORMA_DA_DISPENSA,
  FUNDAMENTO_DA_DISPENSA,
  type FundamentoDaDispensa,
  MODALIDADE_LABEL,
  type FormaDaDispensa,
  type Modalidade,
  type Processo,
  STATUS_PROCESSO_LABEL,
  type StatusProcesso,
  type TipoDocumento,
} from "@/lib/types"

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
  const encerrar = useEncerrarProcesso()

  // Seções de cada tipo, para o progresso dos cards. As chamadas são explícitas
  // e em ordem fixa porque hooks não podem ser chamados em laço.
  const secoesPorTipo: Record<TipoDocumento, ReturnType<typeof useSecoes>> = {
    "Cotação": useSecoes(processoId, "Cotação"),
    ETP: useSecoes(processoId, "ETP"),
    Mapa: useSecoes(processoId, "Mapa"),
    TR: useSecoes(processoId, "TR"),
    Edital: useSecoes(processoId, "Edital"),
    Aviso: useSecoes(processoId, "Aviso"),
    Contrato: useSecoes(processoId, "Contrato"),
  }

  const [editando, setEditando] = useState(false)
  // Os tópicos que cada natureza traz ao ETP, para a dica da escolha, e os
  // contextos declarados, que a edição da capa grava junto (ADR-061).
  const contextos = useContextosDaContratacao(processoId)
  const confirmarContextos = useConfirmarContextos(processoId)
  const [contextosEscolhidos, setContextosEscolhidos] = useState<string[]>([])
  const [objeto, setObjeto] = useState("")
  const [objetoDemanda, setObjetoDemanda] = useState("")
  const [secretaria, setSecretaria] = useState("")
  const [responsavel, setResponsavel] = useState("")
  const [valor, setValor] = useState("")
  const [fundamento, setFundamento] = useState<FundamentoDaDispensa | "">("")
  // Quem pode responder pelo processo: os colegas, quem está logado e o atual.
  const servidores = useServidoresDoOrgao(editando)
  const sessao = useSessao()
  const [naturezaDoObjeto, setNaturezaDoObjeto] = useState<NaturezaDoObjeto | "">("")
  // A modalidade em edição; o impacto da troca aparece antes de salvar.
  const [novaModalidade, setNovaModalidade] = useState<Modalidade | null>(null)
  // Na dispensa, a forma (direta ou com disputa) decide os documentos tanto
  // quanto a modalidade — e trocá-la passa pelo mesmo alerta (ADR-046).
  const [novaForma, setNovaForma] = useState<FormaDaDispensa | "">("")
  const [confirmandoEncerramento, setConfirmandoEncerramento] = useState(false)
  const [montandoJuntada, setMontandoJuntada] = useState(false)

  const declarados = (contextos.data?.contextos ?? []).filter((c) => c.confirmado).map((c) => c.codigo)

  /**
   * Abre a edição da capa inteira: um lugar só para mudar o bloco principal,
   * e um "Salvar" que grava tudo junto.
   */
  const abrirEdicao = () => {
    if (!processo.data) return
    setObjeto(processo.data.objeto)
    setObjetoDemanda(processo.data.objetoDemanda ?? "")
    setSecretaria(processo.data.secretariaId ?? "")
    setResponsavel(processo.data.responsavelId ?? "")
    setValor(formatNumeroBR(processo.data.valorEstimado))
    setFundamento(processo.data.fundamentoDaDispensa ?? "")
    setNaturezaDoObjeto(processo.data.naturezaDoObjeto ?? "")
    setNovaModalidade(processo.data.modalidade)
    setNovaForma(processo.data.formaDaDispensa ?? "")
    setContextosEscolhidos(declarados)
    setEditando(true)
  }

  const cancelarEdicao = () => {
    setEditando(false)
    setNovaModalidade(null)
  }

  // Pelo estado atual: cliques seguidos nas pílulas não se perdem.
  const alternarContexto = (codigo: string) =>
    setContextosEscolhidos((atual) =>
      atual.includes(codigo) ? atual.filter((c) => c !== codigo) : [...atual, codigo],
    )

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

  const paraDispensa = novaModalidade === "Dispensa Art. 75"
  const formas = { de: proc.formaDaDispensa, para: paraDispensa && novaForma !== "" ? novaForma : undefined }
  // Sem a forma escolhida, a dispensa ainda não tem regra de documentos para comparar.
  const trocaDefinida = novaModalidade !== null && (!paraDispensa || novaForma !== "")
  const impacto =
    novaModalidade === null || !trocaDefinida
      ? null
      : impactoTrocaModalidade(proc.modalidade, novaModalidade, proc.documentos, tiposGeradosAgora, formas)

  const trocaDeModalidade = novaModalidade !== null && impacto !== null && houveTroca(proc.modalidade, novaModalidade, formas)
  const encerrado = proc.status === "concluido"
  const pendente = atualizar.isPending || confirmarContextos.isPending
  // Moeda em reais, positiva e com duas casas: a máscara do campo já garante o
  // formato, e aqui só falta o maior que zero.
  const valorValido = !editando || parseValorBR(valor) > 0

  /**
   * Grava a capa inteira de uma vez: os dados do processo (com a troca de
   * modalidade, que acrescenta o que a nova exige e não tira nada, ADR-047) e
   * depois os contextos, se mudaram.
   */
  const salvarEdicao = async () => {
    try {
      await atualizar.mutateAsync({
        id: processoId,
        objeto: objeto.trim() || undefined,
        objetoDemanda: objetoDemanda.trim(),
        // A troca de secretaria vai para a trilha; mantida, nem é enviada.
        secretariaId: secretaria && secretaria !== proc.secretariaId ? secretaria : undefined,
        // Como a secretaria: só a troca vai, e para a trilha.
        responsavelId: responsavel && responsavel !== proc.responsavelId ? responsavel : undefined,
        naturezaDoObjeto: naturezaDoObjeto === "" ? null : naturezaDoObjeto,
        valorEstimado: valor,
        // O inciso só existe na dispensa; fora dela, o que estava fica como estava.
        ...(paraDispensa ? { fundamentoDaDispensa: fundamento === "" ? null : fundamento } : {}),
        ...(trocaDeModalidade && novaModalidade && impacto
          ? {
              modalidade: novaModalidade,
              ...(formas.para ? { formaDaDispensa: formas.para } : {}),
              documentos: impacto.documentos,
            }
          : {}),
      })
      const mudaramOsContextos =
        contextosEscolhidos.length !== declarados.length || contextosEscolhidos.some((c) => !declarados.includes(c))
      if (!encerrado && mudaramOsContextos) {
        await confirmarContextos.mutateAsync(contextosEscolhidos)
      }
      setEditando(false)
      showToast(
        trocaDeModalidade && novaModalidade
          ? `Dados do processo atualizados. Modalidade alterada para ${rotuloDaModalidade(novaModalidade, formas.para)}; a troca está na trilha.`
          : "Dados do processo atualizados.",
      )
      setNovaModalidade(null)
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Não foi possível salvar os dados do processo.")
    }
  }

  const adicionarDocumento = (tipo: TipoDocumento) => {
    atualizar.mutate(
      { id: processoId, documentos: ordenar([...proc.documentos, tipo]) },
      { onSuccess: () => showToast(`${CATALOGO[tipo].titulo} adicionado ao processo.`) }
    )
  }

  /**
   * Tira um documento do processo.
   *
   * <p>Entrava e não saía — nem por engano, nem quando o caso deixava de pedi-lo.
   * Enquanto ficava na lista, contava como pendência no encerramento para
   * sempre. O servidor recusa retirar o que já foi concluído, porque aí ele
   * virou peça dos autos, e o obrigatório da modalidade atual, que o
   * encerramento cobraria logo depois (ADR-047); a tela nem oferece nesses
   * casos.
   */
  const retirarDocumento = (tipo: TipoDocumento) => {
    atualizar.mutate(
      { id: processoId, documentos: proc.documentos.filter((t) => t !== tipo) },
      {
        onSuccess: () => showToast(`${CATALOGO[tipo].titulo} retirado do processo.`),
        onError: (erro) =>
          showToast(
            erro instanceof Error ? erro.message : "Não foi possível retirar o documento.",
          ),
      },
    )
  }

  // Encerramento: a plataforma termina quando os documentos estão prontos. O
  // protocolo e a aprovação acontecem no sistema administrativo da entidade.
  // A regra é do domínio, e não uma filtragem repetida aqui: o servidor cobra a
  // mesma coisa ao encerrar, e duas cópias da regra é como elas divergem.
  const pendentes = documentosPendentes(proc, tiposGeradosAgora)
  const semCobranca = documentosPorFazerSemCobranca(proc, tiposGeradosAgora)
  const podeEncerrar = proc.status !== "concluido" && proc.documentos.length > 0

  // Pendência não impede: exige justificativa. A plataforma orienta, não trava.
  const encerrarProcesso = (justificativa: string) => {
    encerrar.mutate(
      { processoId, justificativa },
      {
        onSuccess: () => {
          setConfirmandoEncerramento(false)
          showToast("Processo encerrado. Protocole os documentos no sistema da entidade.")
        },
        onError: (e) => showToast(e instanceof Error ? e.message : "Não foi possível encerrar o processo."),
      },
    )
  }

  // Os documentos que ainda cabem acrescentar — limitados aos cabíveis à
  // modalidade (Dispensa não tem Edital).
  const tiposDisponiveis = documentosDaModalidade(proc.modalidade, proc.formaDaDispensa).filter(
    (t) => !proc.documentos.includes(t),
  )
  const tiposGerados = docsGerados.map((d) => d.tipo)
  const obrigatoriosDaModalidade = proc.documentos.filter((t) => ehObrigatorio(proc.modalidade, t, proc.formaDaDispensa))
  const cartoesDosDocumentos = agruparAnexos(proc.documentos).flatMap((grupo, i) => [
    { tipo: grupo.tipo, numero: `${i + 1}.`, anexo: false },
    ...grupo.anexos.map((anexo, j) => ({ tipo: anexo, numero: `${i + 1}.${j + 1}`, anexo: true })),
  ])
  const dfdVerificado = parecer.data != null

  /**
   * Cartão de um documento do processo.
   *
   * @param anexo apresentado sob o principal — ganha a etiqueta e o fundamento
   *              de anexo
   */
  const cartaoDocumento = (tipo: TipoDocumento, numero: string, anexo = false) => {
    const principal = anexo ? CATALOGO[tipo].anexoDe : undefined
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
    /*
      A dependência é **orientação**, e não trava.

      Antes o cartão bloqueado não tinha botão nenhum: não dava para abrir
      o documento nem para ler o que já estava escrito. Mas o TR se
      fundamenta no ETP e nada impede redigi-lo antes de gerar o ETP — a
      ordem é do fluxo, não da lei —, e travar transformava orientação em
      obstáculo, que é o que fez o fluxo de aprovação sair do produto
      (§24). A etiqueta continua dizendo o que falta (§80).
    */
    const bloqueios = pendencias(tipo, proc.documentos, tiposGerados)
    const dependePendente = bloqueios.length > 0 && !finalizado
    const editorHref = `/processos/documento?id=${encodeURIComponent(processoId)}&tipo=${meta.slug}`

    return (
      <div
        /*
         * Bloqueado muda a superfície, não a opacidade.
         *
         * `opacity-70` no cartão inteiro apagava o texto junto: a 70% os
         * cinzas caem para 3,2:1, abaixo dos 4,5:1 da WCAG AA — e apagava
         * justamente a etiqueta que diz o que falta para desbloquear.
         */
        className={`flex flex-col rounded-card border border-border p-5 ${
          dependePendente ? "bg-ice" : "bg-surface"
        }`}
      >
        <div className="mb-3 flex items-start gap-3">
          <span className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${meta.chip}`}>
            <IconFileText size={18} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="font-display text-md font-bold text-text-1">
              <span className="mr-1.5 font-mono text-xs text-text-muted">{numero}</span>
              {meta.titulo}
              {/*
                O que a modalidade exige leva o asterisco, como campo obrigatório
                de formulário: diz quais contam em "1 de 2 obrigatórios" sem
                crescer o cartão. A legenda fica no cabeçalho do bloco.
              */}
              {ehObrigatorio(proc.modalidade, tipo, proc.formaDaDispensa) && (
                <span
                  className="ml-0.5 text-royal"
                  title={`Obrigatório em ${rotuloDaModalidade(proc.modalidade, proc.formaDaDispensa)}`}
                >
                  <span aria-hidden="true">*</span>
                  <span className="sr-only"> (obrigatório)</span>
                </span>
              )}
            </div>
            <div className="mt-0.5 font-mono text-xs text-text-muted">
              {meta.fundamento}
              {principal && ` · ${principal.fundamento}`}
            </div>
            {principal && (
              <div className="mt-1.5">
                <Tag tone="neutral">Anexo do {principal.tipo}</Tag>
              </div>
            )}
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
          {dependePendente && (
            <Tag tone="warning">
              Fundamenta-se em {bloqueios.map((d) => CATALOGO[d].titulo).join(" e ")}
            </Tag>
          )}
          {finalizado ? (
            <>
              <Button
                size="sm"
                variant="secondary"
                icon={<IconEye size={13} />}
                onClick={() => router.push(rotaDoDocumentoGerado(processoId, tipo))}
              >
                Visualizar Documento
              </Button>
              <Button size="sm" variant="ghost" onClick={() => router.push(editorHref)}>
                Revisar Seções
              </Button>
              {/*
                Leva ao editor, e não a um painel aqui: retificar é mudar o
                texto, e era o que o painel da capa não deixava fazer — pedia a
                natureza e a descrição e gerava a versão nova com as seções como
                estavam, iguais às da anterior (§93).
              */}
              {proc.status !== "concluido" && (
                <Button size="sm" variant="ghost" onClick={() => router.push(`${editorHref}&retificar=1`)}>
                  Retificar
                </Button>
              )}
            </>
          ) : obrigatoriasOk ? (
            <>
              {/*
                Leva à prévia, e não gera na hora.

                Este botão gerava direto: era o mesmo atalho que a §69
                tirou de dentro das seções — "Finalizar e Gerar" sem
                passar pelo que vai sair — sobrevivendo do lado de fora.
                Agora abre o editor já na etapa de Revisão e Geração, que
                é onde o documento inteiro pode ser lido antes (§81).
              */}
              <Button
                size="sm"
                onClick={() => router.push(`${editorHref}&etapa=revisao`)}
              >
                Revisar e Gerar
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
          {/*
            Documento entrava no processo e não saía — nem por engano, e
            enquanto ficasse contava como pendência no encerramento para
            sempre. Concluído não sai: virou peça dos autos (§80).
          */}
          {!finalizado && !ehObrigatorio(proc.modalidade, tipo, proc.formaDaDispensa) && (
            <Button
              size="sm"
              variant="ghost"
              disabled={atualizar.isPending}
              onClick={() => retirarDocumento(tipo)}
            >
              Retirar do processo
            </Button>
          )}
        </div>

      </div>
    )
  }

  return (
    <div className="w-full p-4 sm:p-5 lg:p-7">
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
            {/*
              Só o número e o título no topo: status e modalidade são campos da
              capa, como os outros, e os obrigatórios moram em Documentos do
              Processo, que é do que eles falam.
            */}
            <span className="font-mono text-xs text-text-muted">{proc.numero}</span>
            {!editando && (
              <h1 className="mt-2 mb-0 font-display text-2xl font-extrabold tracking-tight break-words text-text-1">{proc.objeto}</h1>
            )}
          </div>
          {!editando ? (
            <Button variant="secondary" size="sm" icon={<IconFile size={13} />} onClick={abrirEdicao}>
              Editar Dados
            </Button>
          ) : (
            <div className="flex gap-2">
              <p id="motivo-salvar-capa" className="sr-only">
                {!valorValido
                  ? "Informe um valor estimado maior que zero."
                  : "Escolha a forma da dispensa: direta ou com disputa."}
              </p>
              <Button variant="secondary" size="sm" disabled={pendente} onClick={cancelarEdicao}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={pendente || !trocaDefinida || !valorValido}
                ariaDescribedBy={trocaDefinida && valorValido ? undefined : "motivo-salvar-capa"}
                onClick={() => void salvarEdicao()}
              >
                {pendente ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
        </div>

        {/*
          Tudo é campo, em linhas que ocupam a largura toda: primeiro o que se
          lê (status, valor, movimentação), depois o que se escolhe em lista
          (modalidade, secretaria, responsável), e por fim o que se descreve.
        */}
        <div className="mt-4 flex flex-col gap-4">
          {editando && (
            <dl className="m-0">
<Campo rotulo="Descrição do Processo" editando>
              <Textarea
                value={objeto}
                onChange={(e) => setObjeto(e.target.value)}
                rows={2}
                ariaLabel="Descrição do Processo"
              />
            </Campo>
          </dl>
          )}

          <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo rotulo="Status">
              <Tag tone={TOM_DO_STATUS[proc.status]}>{STATUS_PROCESSO_LABEL[proc.status]}</Tag>
            </Campo>
            <Campo rotulo="Valor Estimado" editando={editando}>
              {editando ? (
                <MoneyInput value={valor} onChange={setValor} ariaLabel="Valor estimado" />
              ) : (
                formatBRL(proc.valorEstimado)
              )}
            </Campo>
            <Campo rotulo="Última Movimentação">{formatDataHora(proc.ultimaMovimentacaoEm)}</Campo>
          </dl>

          <dl className="m-0 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Campo rotulo="Modalidade" editando={editando && !encerrado && novaModalidade !== null}>
              {editando && !encerrado && novaModalidade !== null ? (
                <Dropdown
                  value={novaModalidade}
                  onChange={(v) => setNovaModalidade(v as Modalidade)}
                  ariaLabel="Modalidade do processo"
                  options={Object.entries(MODALIDADE_LABEL).map(([value, label]) => ({ value, label }))}
                />
              ) : (
                <Tag tone="info">{rotuloDaModalidade(proc.modalidade, proc.formaDaDispensa)}</Tag>
              )}
            </Campo>
            <Campo rotulo="Secretaria" editando={editando}>
              {editando ? (
                <Dropdown
                  value={secretaria}
                  onChange={setSecretaria}
                  ariaLabel="Secretaria requisitante"
                  options={opcoesDeSecretaria(tenant?.secretarias ?? [], proc)}
                />
              ) : (
                proc.secretaria
              )}
            </Campo>
            <Campo rotulo="Responsável" editando={editando}>
              {editando ? (
                <Dropdown
                  value={responsavel}
                  onChange={setResponsavel}
                  ariaLabel="Responsável pelo processo"
                  options={opcoesDeResponsavel(proc, sessao.data?.usuario, servidores.data ?? [])}
                />
              ) : (
                proc.responsavel
              )}
            </Campo>
          </dl>

          {editando && novaModalidade !== null && paraDispensa && (
            <div role="group" aria-label="Forma da dispensa" className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
              {(Object.keys(FORMA_DA_DISPENSA) as FormaDaDispensa[]).map((chave) => (
                <ChoiceCard
                  key={chave}
                  size="small"
                  title={FORMA_DA_DISPENSA[chave].titulo}
                  desc={FORMA_DA_DISPENSA[chave].descricao}
                  selected={novaForma === chave}
                  onClick={() => setNovaForma(chave)}
                />
              ))}
            </div>
          )}

          {/*
            O inciso do Art. 75 é o que decide se há teto de valor: por valor
            (I e II) a conferência compara com o limite do exercício; nas outras
            hipóteses (emergência, fornecedor exclusivo) não há teto (§77).
          */}
          {(editando ? paraDispensa : proc.modalidade === "Dispensa Art. 75") && (
            <dl className="m-0">
<Campo rotulo="Fundamento da Dispensa" editando={editando}>
              {editando ? (
                <Dropdown
                  value={fundamento}
                  onChange={(v) => setFundamento(v as FundamentoDaDispensa | "")}
                  ariaLabel="Fundamento da Dispensa"
                  options={[
                    { value: "", label: "Não declarado" },
                    ...(Object.keys(FUNDAMENTO_DA_DISPENSA) as FundamentoDaDispensa[]).map((chave) => ({
                      value: chave,
                      label: FUNDAMENTO_DA_DISPENSA[chave],
                    })),
                  ]}
                />
              ) : proc.fundamentoDaDispensa ? (
                <Tag tone="info">{FUNDAMENTO_DA_DISPENSA[proc.fundamentoDaDispensa]}</Tag>
              ) : (
                <span className="text-text-faint">Não declarado</span>
              )}
            </Campo>
          </dl>
          )}

          {/*
            A troca não tira nada (ADR-047): diz o que entra para elaboração e o
            que fica sem estar previsto, e quem não for usar retira depois.
          */}
          {editando && impacto && trocaDeModalidade && (
            <InfoBanner tone="info">
              <ul className="m-0 flex list-disc flex-col gap-1 pl-4">
                <li>
                  {impacto.entram.length > 0 ? (
                    <>
                      <strong>Entram para elaboração:</strong>{" "}
                      {impacto.entram.map((t) => CATALOGO[t].titulo).join(", ")}.
                    </>
                  ) : (
                    "Nenhum documento novo."
                  )}
                </li>
                {impacto.naoPrevistos.length > 0 && (
                  <li>
                    <strong>Continuam, sem serem exigidos:</strong>{" "}
                    {impacto.naoPrevistos.map((t) => CATALOGO[t].titulo).join(", ")}. Retire-os se não forem usados.
                  </li>
                )}
              </ul>
            </InfoBanner>
          )}

          {/*
            A natureza escolhe a minuta da AGU do TR e do Contrato (ADR-053) e
            traz ao ETP os tópicos dela (ADR-061). Em pílulas, como os contextos.
          */}
          <dl className="m-0">
<Campo rotulo="Natureza do Objeto" editando={editando}>
            {editando ? (
              <NaturezaDoObjetoEmPilulas
                valor={naturezaDoObjeto}
                onChange={setNaturezaDoObjeto}
                topicos={contextos.data?.topicosDaNatureza}
              />
            ) : proc.naturezaDoObjeto ? (
              <Tag tone="info">{NATUREZA_DO_OBJETO[proc.naturezaDoObjeto]}</Tag>
            ) : (
              <span className="text-text-faint">Não informada</span>
            )}
          </Campo>
          </dl>

          {/* Os contextos da contratação (ADR-061): campo da capa, como a natureza. */}
          <dl className="m-0">
<ContextosDaContratacao
            processoId={processoId}
            editando={editando && !encerrado}
            marcados={contextosEscolhidos}
            onAlternar={alternarContexto}
          />
          </dl>

          {/* Objeto da Demanda: trabalha junto com o DFD e alimenta o ETP. */}
          <dl className="m-0">
<Campo rotulo="Objeto da Demanda" editando={editando}>
            {editando ? (
              <Textarea
                value={objetoDemanda}
                onChange={(e) => setObjetoDemanda(e.target.value)}
                rows={3}
                ariaLabel="Objeto da Demanda"
                placeholder="Ex: Aquisição de 150 microcomputadores tipo desktop e periféricos para os laboratórios..."
              />
            ) : proc.objetoDemanda ? (
              proc.objetoDemanda
            ) : (
              <span className="text-text-faint">Não informado</span>
            )}
          </Campo>
          </dl>
        </div>

        {/*
          A conferência do valor contra o limite da dispensa. Informa e não
          impede: quem escolhe o fundamento é quem responde pelo processo, e há
          razão que a plataforma não vê (§77).
        */}
        <div className="mt-4">
          <ConferenciaDaDispensa processoId={processoId} />
        </div>

        {/*
          Os três valores do processo têm estatutos diferentes — preliminar do
          DFD (Decreto 10.947/2022, Art. 8º, IV), declarado na abertura e apurado
          na pesquisa (Art. 23) — e eram três números soltos (§75).
        */}
        <ResumoDaEstimativa processo={proc} />
        <ConciliacaoDeValores processoId={processoId} valorDeclarado={proc.valorEstimado} />
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
        </div>
        {/*
          Um cartão só, e não três empilhados. As três partes respondem a uma
          pergunta encadeada — o que foi pedido, de onde veio, e como acrescentar
          —, e separá-las em cartões fazia a tela parecer três assuntos.
        */}
        <div className="flex flex-col gap-5 rounded-card border border-border bg-surface p-5">
          <ConsolidacaoDaDemanda processoId={processoId} />
          {/*
            Duas operações, e não uma. Registrar o DFD é um ato — o documento de
            uma secretaria pode entrar no meio do processo, o de outra depois —, e
            cadastrar item é outro, que declara a qual DFD aquela quantidade
            pertence (ADR-036). A ordem na tela é a ordem dos atos.
          */}
          <DfdsDoProcesso processoId={processoId} />
          <ItensDaDemanda processoId={processoId} />
          {/*
            O crédito que suporta a despesa. Fica aqui, no processo, e não em
            cada documento: ele serve a Adequação Orçamentária do TR, a Dotação
            do Edital e a cláusula do contrato — escrito à mão nas três, ele
            diverge em duas.
          */}
          <DotacoesDoProcesso processoId={processoId} valorEstimado={proc.valorEstimado} />
        </div>
      </div>

      {/* Documentos do processo — na ordem canônica do fluxo de contratação */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <h2 className="m-0 font-display text-lg font-bold text-text-1">Documentos do Processo</h2>
          {/* A dica diz quais são, e cada cartão obrigatório leva o asterisco. */}
          <span
            className="mt-1 inline-flex items-start gap-2.5"
            title={`Obrigatórios nesta modalidade: ${obrigatoriosDaModalidade.map((t) => CATALOGO[t].titulo).join(", ")}.`}
          >
            <ProgressoDosObrigatorios processo={proc} barra />
            {obrigatoriosDaModalidade.length > 0 && (
              <span className="text-xs whitespace-nowrap text-text-muted" aria-hidden="true">
                <span className="text-royal">*</span> obrigatório nesta modalidade
              </span>
            )}
          </span>
        </div>
        {/*
          A juntada só existe com documento gerado: nada é gerado nela (ADR-048).
          E os documentos do processo também moram em Documentos (ADR-049).
        */}
        {docsGerados.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {!montandoJuntada && (
              <Button
                variant="secondary"
                size="sm"
                icon={<IconDownload size={13} />}
                onClick={() => setMontandoJuntada(true)}
              >
                Exportar Juntada
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => router.push(rotaDosDocumentosDoProcesso(processoId))}>
              Ver em Documentos
            </Button>
          </div>
        )}
      </div>

      {montandoJuntada && (
        <JuntadaDoProcesso
          processoId={processoId}
          solicitados={proc.documentos}
          gerados={docsGerados}
          onFechar={() => setMontandoJuntada(false)}
        />
      )}

      {/*
        Um cartão por documento, na ordem do fluxo, cada um com metade da
        linha: o anexo vem logo depois do principal, numerado sob ele (4.1) e
        com a etiqueta "Anexo do Edital", e os cartões de uma linha têm a mesma
        altura, sem buraco entre eles.
      */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {cartoesDosDocumentos.map((cartao) => (
          <div key={cartao.tipo} className="flex flex-col [&>*]:flex-1">
            {cartaoDocumento(cartao.tipo, cartao.numero, cartao.anexo)}
          </div>
        ))}
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
          Nenhum documento no processo. Adicione um acima.
        </InfoBanner>
      )}

      {/* Encerramento — a plataforma entrega os documentos; o protocolo é no GPI */}
      {podeEncerrar && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-card border border-border bg-surface p-5">
          <div className="min-w-0 flex-1">
            <div className="font-display text-md font-bold text-text-1">Encerrar Processo</div>
            <p id="ajuda-encerrar" className="m-0 mt-1 text-sm text-text-3">
              {pendentes.length === 0
                ? "Obrigatórios gerados. Protocole os arquivos no sistema da entidade."
                : `Faltam: ${pendentes.map((t) => CATALOGO[t].titulo).join(", ")}. Encerrar exige justificativa.`}
              {/* O opcional por fazer não é cobrado, mas fica dito: encerrar sem ele é escolha. */}
              {semCobranca.length > 0 &&
                ` Opcionais sem elaborar: ${semCobranca
                  .map((t) => CATALOGO[t].titulo)
                  .join(", ")}.`}
            </p>
          </div>
          <Button
            icon={<IconArrowRight size={14} strokeWidth={2.5} />}
            disabled={encerrar.isPending}
            onClick={() =>
              pendentes.length === 0 ? encerrarProcesso("") : setConfirmandoEncerramento(true)
            }
          >
            {encerrar.isPending ? "Encerrando..." : "Encerrar Processo"}
          </Button>
        </div>
      )}

      {confirmandoEncerramento && pendentes.length > 0 && (
        <EncerramentoComPendencias
          pendentes={pendentes.map((t) => CATALOGO[t].titulo)}
          pendente={encerrar.isPending}
          onConfirmar={encerrarProcesso}
          onCancelar={() => setConfirmandoEncerramento(false)}
        />
      )}

      {proc.status === "concluido" && (
        <InfoBanner tone="success" className="mt-6">
          Processo encerrado.
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
        {/* O cartão é do próprio componente: é ele o alvo do clique que abre. */}
        <TrilhaDoProcesso processoId={processoId} />
      </div>
    </div>
  )
}

/** O tom da etiqueta de status, no formato das outras etiquetas da capa. */
const TOM_DO_STATUS: Record<StatusProcesso, "neutral" | "info" | "violet" | "success"> = {
  rascunho: "neutral",
  em_elaboracao: "info",
  pronto_para_encerrar: "violet",
  concluido: "success",
}

/** Um campo da capa: rótulo e valor, no mesmo desenho para todos. */
function Campo({
  rotulo,
  editando = false,
  children,
}: {
  rotulo: string
  editando?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <dt className="text-2xs font-semibold tracking-caps text-text-muted uppercase">{rotulo}</dt>
      <dd className={`m-0 text-base text-text-1 ${editando ? "mt-1" : "mt-0.5"}`}>{children}</dd>
    </div>
  )
}

/**
 * Quem pode responder pelo processo: o atual, quem está logado e os colegas
 * do órgão, sem repetir. O servidor confere que é servidor ativo do órgão.
 */
function opcoesDeResponsavel(
  processo: Processo,
  eu: { id: string; nome: string } | undefined,
  colegas: { id: string; nome: string }[],
): { value: string; label: string }[] {
  const opcoes = new Map<string, string>()
  if (processo.responsavelId) opcoes.set(processo.responsavelId, processo.responsavel)
  if (eu) opcoes.set(eu.id, eu.nome)
  for (const colega of colegas) opcoes.set(colega.id, colega.nome)
  return [...opcoes].map(([value, label]) => ({ value, label }))
}
