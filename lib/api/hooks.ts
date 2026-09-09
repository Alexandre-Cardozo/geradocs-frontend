"use client"

import {
  keepPreviousData,
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query"
import { useEffect, useMemo, useState } from "react"

import {
  enviarBrasao,
  obterBrasao,
  obterTimbre,
  redefinirSenhaDeUsuario,
  removerBrasao,
  revelarCpf,
  salvarTextosDoTimbre,
} from "@/lib/api/access-client"
import {
  enviarFotoDePerfil,
  obterFotoDePerfil,
  removerFotoDePerfil,
} from "@/lib/api/avatar-client"
import { iaDisponivel } from "@/lib/api/ai-client"
import {
  anexarArquivoAoDfd,
  anexarDocumentoDaColeta,
  conferenciaDaDispensa,
  atualizarColeta,
  atualizarDotacao,
  atualizarItensDoDfd,
  declararDotacao,
  listarColetas,
  listarDfds,
  listarDotacoes,
  registrarColeta,
  registrarDfd,
  removerColeta,
  removerDfd,
  removerDotacao,
  type DadosDaColeta,
  type DadosDaDotacao,
  type ItemDoDfd,
} from "@/lib/api/procurement-client"
import * as api from "@/lib/api/client"
import type { ListaProcessosParams } from "@/lib/api/client"
import type { TipoDocumento, Tenant } from "@/lib/types"

/**
 * Hooks de dados — única porta de entrada das views para a camada de API.
 * Nenhuma página importa mocks diretamente.
 */

export const chaves = {
  sessao: ["sessao"] as const,
  estatisticas: ["estatisticas"] as const,
  processos: (params: ListaProcessosParams) => ["processos", params] as const,
  processo: (id: string) => ["processo", id] as const,
  parecerDFD: (id: string) => ["parecer-dfd", id] as const,
  dfds: (id: string) => ["dfds", id] as const,
  dotacoes: (id: string) => ["dotacoes", id] as const,
  coletas: (id: string) => ["coletas", id] as const,
  dispensa: (id: string) => ["conferencia-dispensa", id] as const,
  iaDisponivel: ["ia-disponivel"] as const,
  secoes: (id: string, tipo: TipoDocumento) => ["secoes", id, tipo] as const,
  documentos: ["documentos"] as const,
  resumoDocumentos: ["documentos", "resumo"] as const,
  historicoVersoes: (id: string, tipo: TipoDocumento) => ["versoes", id, tipo] as const,
  tenant: (entidadeId?: string) => ["tenant", entidadeId ?? "sessao"] as const,
  usuarios: (entidadeId?: string, busca = "") => ["usuarios", entidadeId ?? "todos", busca] as const,
  entidades: ["entidades"] as const,
  foto: (usuarioId: string | undefined) => ["foto-de-perfil", usuarioId] as const,
  timbre: (entidadeId: string | undefined) => ["timbre", entidadeId] as const,
  brasao: (entidadeId: string | undefined) => ["brasao", entidadeId] as const,
  trilha: (processoId: string) => ["trilha", processoId] as const,
}

/* ── Sessão / autenticação ─────────────────────────────────────────────────── */

export function useSessao() {
  return useQuery({ queryKey: chaves.sessao, queryFn: api.getSessao, staleTime: Infinity })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { identificador: string; senha: string }) =>
      api.login(input.identificador, input.senha),
    onSuccess: (sessao) => {
      queryClient.setQueryData(chaves.sessao, sessao)
      void queryClient.invalidateQueries() // recarrega tudo no escopo do novo usuário
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.logout(),
    onSuccess: () => {
      queryClient.setQueryData(chaves.sessao, null)
      queryClient.clear()
    },
  })
}

/**
 * Troca a própria senha. É o que libera a sessão no primeiro acesso.
 *
 * <p>Grava a sessão devolvida em vez de invalidá-la: a resposta já traz o
 * usuário sem o marcador, e invalidar faria a tela piscar de volta para a troca
 * antes de a consulta responder.
 */
export function useTrocarPropriaSenha() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { atual: string; nova: string }) =>
      api.trocarPropriaSenha(input.atual, input.nova),
    onSuccess: (sessao) => queryClient.setQueryData(chaves.sessao, sessao),
  })
}

export function useRecuperarSenha() {
  return useMutation({ mutationFn: (email: string) => api.recuperarSenha(email) })
}

export function useRedefinirSenha() {
  return useMutation({
    mutationFn: (input: { token: string; senha: string }) => api.resetarSenha(input.token, input.senha),
  })
}

/** Perfil de acesso do usuário logado (ou undefined enquanto carrega/deslogado). */
export function usePerfil() {
  const { data } = useSessao()
  return data?.usuario.perfilAcesso
}

/* ── Foto de perfil ────────────────────────────────────────────────────────── */

/**
 * A foto de uma pessoa, já como URL utilizável em `<img>`.
 *
 * <p>A rota é autenticada, então os bytes vêm por `fetch` e viram um object URL.
 * Ele é revogado quando o cache o descarta: sem isso, cada troca de foto deixaria
 * o blob anterior preso na memória da aba pelo resto da sessão.
 */
export function useFotoDePerfil(usuarioId: string | undefined) {
  const query = useQuery({
    queryKey: chaves.foto(usuarioId),
    queryFn: () => obterFotoDePerfil(usuarioId as string),
    enabled: usuarioId !== undefined,
    staleTime: Infinity,
  })
  const blob = query.data ?? null
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])

  // Revoga o anterior quando a foto muda e ao desmontar: sem isto cada troca
  // deixaria o blob antigo preso na memória da aba pelo resto da sessão.
  useEffect(() => {
    if (!url) return
    return () => URL.revokeObjectURL(url)
  }, [url])

  return { url, carregando: query.isPending && usuarioId !== undefined }
}

export function useEnviarFotoDePerfil(usuarioId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (arquivo: File) => enviarFotoDePerfil(arquivo),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: chaves.foto(usuarioId) }),
  })
}

export function useRemoverFotoDePerfil(usuarioId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => removerFotoDePerfil(),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: chaves.foto(usuarioId) }),
  })
}

/**
 * A administração redefine a senha de um servidor.
 *
 * <p>Não invalida a listagem: nada do que ela mostra mudou. O que muda é a
 * credencial, e ela volta na resposta para ser entregue.
 */
export function useRedefinirSenhaDeServidor() {
  return useMutation({ mutationFn: (id: string) => redefinirSenhaDeUsuario(id) })
}

/**
 * Revela o CPF inteiro de um servidor.
 *
 * <p>Mutação, e não consulta, embora leia: cada revelação vira uma linha de
 * auditoria, e uma consulta seria refeita sozinha ao remontar a tela ou ao
 * voltar o foco da aba — enchendo a trilha de revelações que ninguém pediu.
 */
export function useRevelarCpf() {
  return useMutation({ mutationFn: (id: string) => revelarCpf(id) })
}

/**
 * A trilha do processo, como o servidor a registrou.
 *
 * <p>Encerrar e reabrir mudam a trilha, e por isso invalidam esta chave — sem
 * isso a tela mostraria o processo encerrado com uma trilha que não registra o
 * encerramento.
 */
export function useTrilhaDoProcesso(processoId: string) {
  return useQuery({
    queryKey: chaves.trilha(processoId),
    queryFn: () => api.getTrilha(processoId),
  })
}

export function useEstatisticas() {
  return useQuery({ queryKey: chaves.estatisticas, queryFn: api.getEstatisticas })
}

export function useProcessos(params: ListaProcessosParams = {}) {
  return useQuery({
    queryKey: chaves.processos(params),
    queryFn: () => api.getProcessos(params),
    placeholderData: (anterior) => anterior,
  })
}

export function useProcesso(id: string) {
  return useQuery({
    queryKey: chaves.processo(id),
    queryFn: () => api.getProcesso(id),
    enabled: id !== "",
  })
}

export function useCriarProcesso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.criarProcesso,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["processos"] })
      void queryClient.invalidateQueries({ queryKey: chaves.estatisticas })
    },
  })
}

export function useAtualizarProcesso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.AtualizarProcessoInput) => api.atualizarProcesso(input),
    onSuccess: (processo) => {
      queryClient.setQueryData(chaves.processo(processo.id), processo)
      void queryClient.invalidateQueries({ queryKey: ["processos"] })
      // A edição grava o porquê na trilha do servidor.
      void queryClient.invalidateQueries({ queryKey: chaves.trilha(processo.id) })
      // O valor e o inciso são o que a conferência compara: mantê-la velha
      // mostraria um alerta que a edição acabou de resolver.
      void queryClient.invalidateQueries({ queryKey: chaves.dispensa(processo.id) })
    },
  })
}

export function useParecerDFD(processoId: string) {
  return useQuery({
    queryKey: chaves.parecerDFD(processoId),
    queryFn: () => api.getParecerDFD(processoId),
    enabled: processoId !== "",
  })
}

export function useAnalisarDFD(processoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (arquivo: string) => api.analisarDFD(processoId, arquivo),
    onSuccess: (parecer) => {
      queryClient.setQueryData(chaves.parecerDFD(processoId), parecer)
    },
  })
}

/**
 * O documento em elaboração inteiro.
 *
 * <p>Uma consulta só, e duas leituras dela: as seções — que é o que a maior
 * parte da tela usa — e o estado do documento, que o editor precisa para dizer
 * que o rascunho já não é o que a versão gerada guardou (§80). Duas consultas
 * para o mesmo documento seriam duas viagens pela mesma resposta.
 */
export function useDocumentoEmElaboracao(processoId: string, tipo: TipoDocumento) {
  return useQuery({
    queryKey: chaves.secoes(processoId, tipo),
    queryFn: () => api.getDocumento(processoId, tipo),
    enabled: processoId !== "",
  })
}

export function useSecoes(processoId: string, tipo: TipoDocumento) {
  return useQuery({
    queryKey: chaves.secoes(processoId, tipo),
    queryFn: () => api.getDocumento(processoId, tipo),
    enabled: processoId !== "",
    select: (documento) => documento.secoes,
  })
}

export function useAtualizarSecao(processoId: string, tipo: TipoDocumento) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      secaoId: string
      conteudo: string
      status?: import("@/lib/types").StatusDocumento
      justificativaDispensa?: string
    }) => api.atualizarSecao({ processoId, tipo, ...input }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.secoes(processoId, tipo) })
    },
  })
}

export function useGerarSecao(processoId: string, tipo: TipoDocumento) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { secaoId: string; rascunho?: string }) =>
      api.gerarSecao(processoId, tipo, input.secaoId, input.rascunho),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.secoes(processoId, tipo) })
    },
  })
}

/** Invalida tudo que depende do status ou da trilha de um processo. */
function invalidarProcesso(queryClient: ReturnType<typeof useQueryClient>, processoId: string) {
  void queryClient.invalidateQueries({ queryKey: ["processos"] })
  void queryClient.invalidateQueries({ queryKey: chaves.processo(processoId) })
  void queryClient.invalidateQueries({ queryKey: chaves.estatisticas })
  // Encerrar e reabrir viram evento no servidor: sem isto a tela mostraria o
  // processo encerrado com uma trilha que não registra o encerramento.
  void queryClient.invalidateQueries({ queryKey: chaves.trilha(processoId) })
}

export function useEncerrarProcesso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { processoId: string; justificativa?: string }) =>
      api.encerrarProcesso(input.processoId, input.justificativa ?? ""),
    onSuccess: (processo) => invalidarProcesso(queryClient, processo.id),
  })
}

export function useReabrirProcesso() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { processoId: string; motivo: string }) =>
      api.reabrirProcesso(input.processoId, input.motivo),
    onSuccess: (processo) => invalidarProcesso(queryClient, processo.id),
  })
}

/** O texto do documento como ele saiu na geração. Vazio antes da primeira. */
export function useCorpoDocumento(processoId: string, tipo: TipoDocumento) {
  return useQuery({
    queryKey: ["corpo-documento", processoId, tipo],
    queryFn: () => api.getCorpoDocumento(processoId, tipo),
    enabled: processoId !== "",
  })
}

/**
 * Acrescentar, excluir e reordenar as seções que o servidor cria.
 *
 * As três invalidam as mesmas consultas porque mexem na mesma coisa — a
 * estrutura do documento — e separar as invalidações deixaria a tela mostrando
 * uma estrutura e o corpo de outra.
 */
export function useEstruturaDoDocumento(processoId: string, tipo: TipoDocumento) {
  const queryClient = useQueryClient()
  const invalidar = () => {
    void queryClient.invalidateQueries({ queryKey: chaves.secoes(processoId, tipo) })
    void queryClient.invalidateQueries({ queryKey: ["corpo-documento"] })
  }
  const acrescentar = useMutation({
    mutationFn: (input: { titulo: string; ancora: string; subtopico: boolean }) =>
      api.acrescentarSecaoDoDocumento(processoId, tipo, input.titulo, input.ancora, input.subtopico),
    onSuccess: invalidar,
  })
  const excluir = useMutation({
    mutationFn: (secaoId: string) => api.excluirSecaoDoDocumento(processoId, tipo, secaoId),
    onSuccess: invalidar,
  })
  const reordenar = useMutation({
    mutationFn: (secoesNaOrdem: string[]) =>
      api.reordenarSecoesDoDocumento(processoId, tipo, secoesNaOrdem),
    onSuccess: invalidar,
  })
  return { acrescentar, excluir, reordenar }
}

/** A demanda consolidada dos DFDs do processo. */
export function useConsolidacaoDaDemanda(processoId: string) {
  return useQuery({
    queryKey: ["consolidacao-demanda", processoId],
    queryFn: () => api.getConsolidacaoDaDemanda(processoId),
    enabled: processoId !== "",
  })
}

/**
 * A verificação de previsão no PCA e as duas ações do painel.
 *
 * Marcar recarrega a verificação: informar o item muda o que a tela afirma.
 * A citação **não** é uma ação de servidor — o parágrafo vem pronto na própria
 * verificação, e quem grava é quem assina, depois de ler e ajustar (ADR-039).
 */
export function usePrevisaoNoPca(processoId: string) {
  const queryClient = useQueryClient()
  const chave = ["previsao-pca", processoId]
  const verificacao = useQuery({
    queryKey: chave,
    queryFn: () => api.getVerificacaoPca(processoId),
    enabled: processoId !== "",
  })
  const marcar = useMutation({
    mutationFn: (entrada: { demanda: string; codigo: string; nota?: string }) =>
      api.declararPrevisaoNoPca(processoId, entrada),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chave })
    },
  })
  return { verificacao, marcar }
}

/** O PCA do órgão, na tela de configurações. */
/**
 * Os planos do órgão e a importação de um deles.
 *
 * <p>Planos no plural: o órgão tem um por exercício, e a tela precisa mostrar
 * todos para que se veja **qual exercício está coberto** — é isso que separa
 * "temos PCA" de "temos o PCA do ano em que este processo corre".
 */
export function usePlanosPca() {
  const queryClient = useQueryClient()
  const planos = useQuery({ queryKey: ["planos-pca"], queryFn: () => api.getPlanosPca() })
  const importar = useMutation({
    mutationFn: (entrada: { ano: number; arquivo: File }) => api.importarPlanoPca(entrada),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["planos-pca"] })
      void queryClient.invalidateQueries({ queryKey: ["plano-pca"] })
      void queryClient.invalidateQueries({ queryKey: ["previsao-pca"] })
    },
  })
  return { planos, importar }
}

/**
 * A comparação entre duas versões, com a errata.
 *
 * `enabled` só quando há duas versões escolhidas: pedir a comparação antes
 * disso traria um 400 a cada abertura de painel.
 */
export function useComparacaoDeVersoes(
  processoId: string,
  tipo: TipoDocumento,
  de: number | null,
  para: number | null,
) {
  return useQuery({
    queryKey: ["comparacao-versoes", processoId, tipo, de, para],
    queryFn: () => api.compararVersoes(processoId, tipo, de!, para!),
    enabled: processoId !== "" && de != null && para != null,
  })
}

/** As versões com o texto de cada uma, para comparar o que mudou. */
export function useVersoesComTexto(processoId: string, tipo: TipoDocumento) {
  return useQuery({
    queryKey: ["versoes-com-texto", processoId, tipo],
    queryFn: () => api.getVersoesComTexto(processoId, tipo),
    enabled: processoId !== "",
  })
}

export function useHistoricoVersoes(processoId: string, tipo: TipoDocumento) {
  return useQuery({
    queryKey: chaves.historicoVersoes(processoId, tipo),
    queryFn: () => api.getHistoricoVersoes(processoId, tipo),
    enabled: processoId !== "",
  })
}

export function useDocumentos() {
  return useQuery({ queryKey: chaves.documentos, queryFn: api.getDocumentos })
}

export function useResumoDocumentos() {
  return useQuery({ queryKey: chaves.resumoDocumentos, queryFn: api.getResumoDocumentos })
}

export function useGerarDocumento() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.GerarDocumentoInput) => api.gerarDocumento(input),
    onSuccess: (_doc, input) => {
      void queryClient.invalidateQueries({ queryKey: chaves.documentos })
      void queryClient.invalidateQueries({ queryKey: chaves.resumoDocumentos })
      void queryClient.invalidateQueries({ queryKey: chaves.estatisticas })
      void queryClient.invalidateQueries({ queryKey: ["processos"] })
      void queryClient.invalidateQueries({ queryKey: ["secoes"] })
      void queryClient.invalidateQueries({ queryKey: ["versoes"] })
      void queryClient.invalidateQueries({ queryKey: ["corpo-documento"] })
      void queryClient.invalidateQueries({ queryKey: ["versoes-com-texto"] })
      void queryClient.invalidateQueries({ queryKey: chaves.processo(input.processoId) })
    },
  })
}

/**
 * Config da entidade em foco — sem id, a da sessão.
 *
 * <p>Quem resolve "a da sessão" é este hook, e não a fachada. Antes o `enabled`
 * exigia um id vindo da tela, e as telas que dependem da entidade da própria
 * pessoa — o cadastro de processo, o detalhe — chamavam sem id: a consulta
 * nunca saía, e o seletor de secretaria ficava permanentemente vazio sem
 * nenhum erro na tela.
 *
 * <p>O `enabled` continua existindo, agora pelo motivo certo: esperar a sessão
 * chegar. Um administrador geral não tem entidade, e para ele não há o que
 * consultar até que uma seja escolhida.
 */
export function useConfigTenant(entidadeId?: string) {
  const { data: sessao } = useSessao()
  const id = entidadeId ?? sessao?.entidade?.id
  return useQuery({
    queryKey: chaves.tenant(id),
    queryFn: () => api.getConfigTenant(id as string),
    enabled: id != null,
  })
}

export function useAtualizarConfigTenant(entidadeId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Tenant>) => {
      if (!entidadeId) throw new Error("Entidade não identificada.")
      return api.atualizarConfigTenant(patch, entidadeId)
    },
    onSuccess: (tenant) => {
      queryClient.setQueryData(chaves.tenant(entidadeId), tenant)
      void queryClient.invalidateQueries({ queryKey: chaves.entidades })
      void queryClient.invalidateQueries({ queryKey: chaves.sessao })
    },
  })
}

/* ── Cadastros: entidades e usuários ─────────────────────────────────────── */

export function useEntidades() {
  return useQuery({ queryKey: chaves.entidades, queryFn: api.getEntidades })
}

export function useCriarEntidade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.NovaEntidadeInput) => api.criarEntidade(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: chaves.entidades }),
  })
}

export function useRemoverEntidade() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.removerEntidade(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.entidades })
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] })
    },
  })
}

/**
 * Espera a digitação parar antes de consultar.
 *
 * Sem isso, buscar "MAT-4471" dispararia oito requisições e a lista piscaria a
 * cada tecla — e a última resposta a chegar poderia não ser a do último termo.
 */
function useBuscaAdiada(busca: string, milissegundos = 300): string {
  const [adiada, setAdiada] = useState(busca)
  useEffect(() => {
    const temporizador = setTimeout(() => setAdiada(busca), milissegundos)
    return () => clearTimeout(temporizador)
  }, [busca, milissegundos])
  return adiada
}

/**
 * @param busca trecho de nome ou matrícula, como a pessoa digita
 */
export function useUsuarios(entidadeId?: string, busca = "") {
  const buscaAdiada = useBuscaAdiada(busca)
  return useQuery({
    queryKey: chaves.usuarios(entidadeId, buscaAdiada),
    queryFn: () => api.getUsuarios(entidadeId, buscaAdiada),
    // Sem isto a lista some e volta a cada termo novo, em vez de atualizar.
    placeholderData: keepPreviousData,
  })
}

function invalidarUsuarios(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["usuarios"] })
  void queryClient.invalidateQueries({ queryKey: chaves.entidades })
}

export function useCriarUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.NovoUsuarioInput) => api.criarUsuario(input),
    onSuccess: () => invalidarUsuarios(queryClient),
  })
}

export function useAtualizarUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.AtualizarUsuarioInput) => api.atualizarUsuario(input),
    onSuccess: () => invalidarUsuarios(queryClient),
  })
}

export function useRemoverUsuario() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.removerUsuario(id),
    onSuccess: () => invalidarUsuarios(queryClient),
  })
}

export function useCriarSecretaria(entidadeId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nome: string) => {
      if (!entidadeId) throw new Error("Entidade não identificada.")
      return api.criarSecretaria(entidadeId, nome)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: chaves.tenant(entidadeId) }),
  })
}

/**
 * Renomeia a secretaria.
 *
 * <p>Invalida o tenant, que é de onde a lista vem: a tela mostra o nome novo
 * porque o servidor confirmou, e não porque a tela adiantou.
 */
export function useRenomearSecretaria(entidadeId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: string; nome: string }) => {
      if (!entidadeId) throw new Error("Entidade não identificada.")
      return api.renomearSecretaria(entidadeId, input.id, input.nome)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: chaves.tenant(entidadeId) }),
  })
}

export function useRemoverSecretaria(entidadeId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (secretariaId: string) => {
      if (!entidadeId) throw new Error("Entidade não identificada.")
      return api.removerSecretaria(entidadeId, secretariaId)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: chaves.tenant(entidadeId) }),
  })
}

/* ── Timbre do órgão ───────────────────────────────────────────────────────── */

/**
 * O timbre da entidade: brasão, cabeçalho e rodapé (ADR-026).
 *
 * <p>É o que sai impresso em todo documento do órgão, então a tela de
 * configuração e a prévia leem daqui — e não de um objeto montado no cliente.
 */
export function useTimbre(entidadeId: string | undefined) {
  return useQuery({
    queryKey: chaves.timbre(entidadeId),
    queryFn: () => obterTimbre(entidadeId as string),
    enabled: entidadeId != null,
  })
}

/** O brasão como URL utilizável em `<img>`; a rota é autenticada. */
export function useBrasao(entidadeId: string | undefined, temBrasao: boolean) {
  const query = useQuery({
    queryKey: chaves.brasao(entidadeId),
    queryFn: () => obterBrasao(entidadeId as string),
    enabled: entidadeId != null && temBrasao,
    staleTime: Infinity,
  })
  const blob = query.data ?? null
  const url = useMemo(() => (blob ? URL.createObjectURL(blob) : null), [blob])

  useEffect(() => {
    if (!url) return
    return () => URL.revokeObjectURL(url)
  }, [url])

  return url
}

export function useSalvarTextosDoTimbre(entidadeId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { cabecalho: string; rodape: string }) =>
      salvarTextosDoTimbre(entidadeId as string, input.cabecalho, input.rodape),
    onSuccess: (timbre) => queryClient.setQueryData(chaves.timbre(entidadeId), timbre),
  })
}

export function useEnviarBrasao(entidadeId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (arquivo: File) => enviarBrasao(entidadeId as string, arquivo),
    onSuccess: (timbre) => {
      queryClient.setQueryData(chaves.timbre(entidadeId), timbre)
      void queryClient.invalidateQueries({ queryKey: chaves.brasao(entidadeId) })
    },
  })
}

export function useRemoverBrasao(entidadeId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => removerBrasao(entidadeId as string),
    onSuccess: (timbre) => {
      queryClient.setQueryData(chaves.timbre(entidadeId), timbre)
      void queryClient.invalidateQueries({ queryKey: chaves.brasao(entidadeId) })
    },
  })
}

/**
 * Registra um DFD no processo — quem formalizou, como o processo se refere a
 * ele e, quando houver, o arquivo assinado.
 *
 * <p>Recarrega a consolidação: é dela que saem o painel de quantidades do ETP e
 * a Cotação, e mantê-la velha faria a tela mostrar um total que já mudou.
 */
export function useRegistrarDfd(processoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: {
      secretariaId: string
      identificacao: string
      arquivo?: File | null
    }) => registrarDfd(processoId, input.secretariaId, input.identificacao, input.arquivo),
    onSuccess: () => recarregarDemanda(queryClient, processoId),
  })
}

/**
 * O que muda quando o cadastro de DFDs muda.
 *
 * <p>A consolidação sai dos itens dos DFDs, e é dela que saem o painel de
 * quantidades do ETP e a Cotação: mantê-la velha faria a tela mostrar um total
 * que já mudou.
 */
function recarregarDemanda(queryClient: QueryClient, processoId: string) {
  void queryClient.invalidateQueries({ queryKey: ["consolidacao-demanda", processoId] })
  void queryClient.invalidateQueries({ queryKey: chaves.dfds(processoId) })
  void queryClient.invalidateQueries({ queryKey: chaves.processo(processoId) })
}

/**
 * Troca os itens de um DFD já registrado.
 *
 * <p>O item pertence ao DFD, e corrigir uma quantidade não pode custar um DFD
 * novo na listagem — foi assim que o cadastro virou uma pilha de linhas iguais.
 */
export function useAtualizarItensDoDfd(processoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { dfdId: string; itens: ItemDoDfd[] }) =>
      atualizarItensDoDfd(processoId, input.dfdId, input.itens),
    onSuccess: () => recarregarDemanda(queryClient, processoId),
  })
}

/** Guarda o arquivo de um DFD já registrado — ele chega no tempo dele (ADR-036). */
export function useAnexarArquivoAoDfd(processoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { dfdId: string; arquivo: File }) =>
      anexarArquivoAoDfd(processoId, input.dfdId, input.arquivo),
    onSuccess: () => recarregarDemanda(queryClient, processoId),
  })
}

/** Tira um DFD do processo, com os itens e o arquivo dele. */
export function useRemoverDfd(processoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dfdId: string) => removerDfd(processoId, dfdId),
    onSuccess: () => recarregarDemanda(queryClient, processoId),
  })
}

/**
 * Os DFDs anexados ao processo.
 *
 * <p>Anexar de novo versiona em vez de substituir (ADR-028), então a tela mostra
 * uma lista — com a data de cada anexo, que é o que responde "qual DFD embasou
 * o ETP daquela data".
 */
export function useDfdsDoProcesso(processoId: string) {
  return useQuery({
    queryKey: chaves.dfds(processoId),
    queryFn: () => listarDfds(processoId),
  })
}

/**
 * As dotações orçamentárias do processo.
 *
 * <p>Uma vez declaradas, servem três seções em três documentos: a Adequação
 * Orçamentária do TR, a Dotação do Edital e a cláusula do contrato. Por isso a
 * consulta é do processo, e não do documento.
 */
export function useDotacoesDoProcesso(processoId: string) {
  return useQuery({
    queryKey: chaves.dotacoes(processoId),
    queryFn: () => listarDotacoes(processoId),
  })
}

export function useDeclararDotacao(processoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dados: DadosDaDotacao) => declararDotacao(processoId, dados),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: chaves.dotacoes(processoId) }),
  })
}

/** Corrige uma dotação já declarada — o mesmo registro, com o crédito certo. */
export function useAtualizarDotacao(processoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { dotacaoId: string; dados: DadosDaDotacao }) =>
      atualizarDotacao(processoId, input.dotacaoId, input.dados),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: chaves.dotacoes(processoId) }),
  })
}

/** Retira uma dotação do processo. */
export function useRemoverDotacao(processoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dotacaoId: string) => removerDotacao(processoId, dotacaoId),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: chaves.dotacoes(processoId) }),
  })
}

/**
 * A conferência do valor contra o limite da dispensa (Art. 75, I e II).
 *
 * <p>Depende do valor do processo e do inciso declarado, e ambos mudam na tela —
 * por isso a chave é do processo e a consulta acompanha as invalidações dele.
 */
export function useConferenciaDaDispensa(processoId: string) {
  return useQuery({
    queryKey: chaves.dispensa(processoId),
    queryFn: () => conferenciaDaDispensa(processoId),
    enabled: processoId !== "",
  })
}

/**
 * Os preços coletados na pesquisa do processo.
 *
 * <p>São a série do Art. 3º da IN SEGES 65/2021: dela saem as seções da Cotação
 * e, adiante, o preço de referência que embasa a estimativa do ETP e do TR. Por
 * isso a consulta é do processo — a pesquisa é uma só, e vários documentos a
 * leem.
 */
export function useColetasDoProcesso(processoId: string) {
  return useQuery({
    queryKey: chaves.coletas(processoId),
    queryFn: () => listarColetas(processoId),
  })
}

function recarregarColetas(queryClient: QueryClient, processoId: string) {
  void queryClient.invalidateQueries({ queryKey: chaves.coletas(processoId) })
}

export function useRegistrarColeta(processoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (dados: DadosDaColeta) => registrarColeta(processoId, dados),
    onSuccess: () => recarregarColetas(queryClient, processoId),
  })
}

/** Corrige uma coleta já registrada — a mesma coleta, com o dado certo. */
export function useAtualizarColeta(processoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { coletaId: string; dados: DadosDaColeta }) =>
      atualizarColeta(processoId, input.coletaId, input.dados),
    onSuccess: () => recarregarColetas(queryClient, processoId),
  })
}

/** Guarda o documento de suporte de uma coleta — ele chega no tempo dele. */
export function useAnexarDocumentoDaColeta(processoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { coletaId: string; arquivo: File }) =>
      anexarDocumentoDaColeta(processoId, input.coletaId, input.arquivo),
    onSuccess: () => recarregarColetas(queryClient, processoId),
  })
}

/** Retira uma coleta da pesquisa. */
export function useRemoverColeta(processoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (coletaId: string) => removerColeta(processoId, coletaId),
    onSuccess: () => recarregarColetas(queryClient, processoId),
  })
}

/**
 * Se esta instalação tem assistência de IA (ADR-029).
 *
 * <p>Não expira: o provedor é configuração de quem hospeda, e não muda enquanto
 * a pessoa preenche um ETP. Perguntar a cada seção seria uma requisição por
 * clique para saber a mesma coisa.
 */
export function useIaDisponivel() {
  return useQuery({
    queryKey: chaves.iaDisponivel,
    queryFn: iaDisponivel,
    staleTime: Infinity,
  })
}
