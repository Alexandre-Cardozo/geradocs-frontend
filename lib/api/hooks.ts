"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
import { anexarDfdComItens, type ItemDoDfd } from "@/lib/api/procurement-client"
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
  secoes: (id: string, tipo: TipoDocumento) => ["secoes", id, tipo] as const,
  documentos: ["documentos"] as const,
  resumoDocumentos: ["documentos", "resumo"] as const,
  historicoVersoes: (id: string, tipo: TipoDocumento) => ["versoes", id, tipo] as const,
  tenant: (prefeituraId?: string) => ["tenant", prefeituraId ?? "sessao"] as const,
  usuarios: (prefeituraId?: string, busca = "") => ["usuarios", prefeituraId ?? "todos", busca] as const,
  prefeituras: ["prefeituras"] as const,
  foto: (usuarioId: string | undefined) => ["foto-de-perfil", usuarioId] as const,
  timbre: (prefeituraId: string | undefined) => ["timbre", prefeituraId] as const,
  brasao: (prefeituraId: string | undefined) => ["brasao", prefeituraId] as const,
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

export function useSecoes(processoId: string, tipo: TipoDocumento) {
  return useQuery({
    queryKey: chaves.secoes(processoId, tipo),
    queryFn: () => api.getSecoes(processoId, tipo),
    enabled: processoId !== "",
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
    mutationFn: (secaoId: string) => api.gerarSecao(processoId, tipo, secaoId),
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
 * Marcar e citar invalidam a mesma consulta porque mexem na mesma resposta —
 * e citar invalida também as seções, porque grava texto no documento.
 */
export function usePrevisaoNoPca(processoId: string, tipo: TipoDocumento) {
  const queryClient = useQueryClient()
  const chave = ["previsao-pca", processoId]
  const verificacao = useQuery({
    queryKey: chave,
    queryFn: () => api.getVerificacaoPca(processoId),
    enabled: processoId !== "",
  })
  const marcar = useMutation({
    mutationFn: (entrada: { codigo: string; nota?: string }) =>
      api.declararPrevisaoNoPca(processoId, entrada),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chave })
    },
  })
  const citar = useMutation({
    mutationFn: () => api.citarPcaNaSecao(processoId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chave })
      void queryClient.invalidateQueries({ queryKey: chaves.secoes(processoId, tipo) })
      void queryClient.invalidateQueries({ queryKey: ["corpo-documento"] })
    },
  })
  return { verificacao, marcar, citar }
}

/** O PCA do órgão, na tela de configurações. */
export function usePlanoPca() {
  const queryClient = useQueryClient()
  const plano = useQuery({ queryKey: ["plano-pca"], queryFn: () => api.getPlanoPca() })
  const importar = useMutation({
    mutationFn: (entrada: { ano: number; arquivo: string; conteudo: string }) =>
      api.importarPlanoPca(entrada),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["plano-pca"] })
      void queryClient.invalidateQueries({ queryKey: ["previsao-pca"] })
    },
  })
  return { plano, importar }
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
 * Config da prefeitura em foco — sem id, a da sessão.
 *
 * <p>Quem resolve "a da sessão" é este hook, e não a fachada. Antes o `enabled`
 * exigia um id vindo da tela, e as telas que dependem da prefeitura da própria
 * pessoa — o cadastro de processo, o detalhe — chamavam sem id: a consulta
 * nunca saía, e o seletor de secretaria ficava permanentemente vazio sem
 * nenhum erro na tela.
 *
 * <p>O `enabled` continua existindo, agora pelo motivo certo: esperar a sessão
 * chegar. Um administrador geral não tem prefeitura, e para ele não há o que
 * consultar até que uma seja escolhida.
 */
export function useConfigTenant(prefeituraId?: string) {
  const { data: sessao } = useSessao()
  const id = prefeituraId ?? sessao?.prefeitura?.id
  return useQuery({
    queryKey: chaves.tenant(id),
    queryFn: () => api.getConfigTenant(id as string),
    enabled: id != null,
  })
}

export function useAtualizarConfigTenant(prefeituraId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Tenant>) => {
      if (!prefeituraId) throw new Error("Prefeitura não identificada.")
      return api.atualizarConfigTenant(patch, prefeituraId)
    },
    onSuccess: (tenant) => {
      queryClient.setQueryData(chaves.tenant(prefeituraId), tenant)
      void queryClient.invalidateQueries({ queryKey: chaves.prefeituras })
      void queryClient.invalidateQueries({ queryKey: chaves.sessao })
    },
  })
}

/* ── Cadastros: prefeituras e usuários ─────────────────────────────────────── */

export function usePrefeituras() {
  return useQuery({ queryKey: chaves.prefeituras, queryFn: api.getPrefeituras })
}

export function useCriarPrefeitura() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.NovaPrefeituraInput) => api.criarPrefeitura(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: chaves.prefeituras }),
  })
}

export function useRemoverPrefeitura() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.removerPrefeitura(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: chaves.prefeituras })
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
export function useUsuarios(prefeituraId?: string, busca = "") {
  const buscaAdiada = useBuscaAdiada(busca)
  return useQuery({
    queryKey: chaves.usuarios(prefeituraId, buscaAdiada),
    queryFn: () => api.getUsuarios(prefeituraId, buscaAdiada),
    // Sem isto a lista some e volta a cada termo novo, em vez de atualizar.
    placeholderData: keepPreviousData,
  })
}

function invalidarUsuarios(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: ["usuarios"] })
  void queryClient.invalidateQueries({ queryKey: chaves.prefeituras })
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

export function useCriarSecretaria(prefeituraId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (nome: string) => {
      if (!prefeituraId) throw new Error("Prefeitura não identificada.")
      return api.criarSecretaria(prefeituraId, nome)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: chaves.tenant(prefeituraId) }),
  })
}

export function useRemoverSecretaria(prefeituraId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (secretariaId: string) => {
      if (!prefeituraId) throw new Error("Prefeitura não identificada.")
      return api.removerSecretaria(prefeituraId, secretariaId)
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: chaves.tenant(prefeituraId) }),
  })
}

/* ── Timbre do órgão ───────────────────────────────────────────────────────── */

/**
 * O timbre da prefeitura: brasão, cabeçalho e rodapé (ADR-026).
 *
 * <p>É o que sai impresso em todo documento do órgão, então a tela de
 * configuração e a prévia leem daqui — e não de um objeto montado no cliente.
 */
export function useTimbre(prefeituraId: string | undefined) {
  return useQuery({
    queryKey: chaves.timbre(prefeituraId),
    queryFn: () => obterTimbre(prefeituraId as string),
    enabled: prefeituraId != null,
  })
}

/** O brasão como URL utilizável em `<img>`; a rota é autenticada. */
export function useBrasao(prefeituraId: string | undefined, temBrasao: boolean) {
  const query = useQuery({
    queryKey: chaves.brasao(prefeituraId),
    queryFn: () => obterBrasao(prefeituraId as string),
    enabled: prefeituraId != null && temBrasao,
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

export function useSalvarTextosDoTimbre(prefeituraId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { cabecalho: string; rodape: string }) =>
      salvarTextosDoTimbre(prefeituraId as string, input.cabecalho, input.rodape),
    onSuccess: (timbre) => queryClient.setQueryData(chaves.timbre(prefeituraId), timbre),
  })
}

export function useEnviarBrasao(prefeituraId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (arquivo: File) => enviarBrasao(prefeituraId as string, arquivo),
    onSuccess: (timbre) => {
      queryClient.setQueryData(chaves.timbre(prefeituraId), timbre)
      void queryClient.invalidateQueries({ queryKey: chaves.brasao(prefeituraId) })
    },
  })
}

export function useRemoverBrasao(prefeituraId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => removerBrasao(prefeituraId as string),
    onSuccess: (timbre) => {
      queryClient.setQueryData(chaves.timbre(prefeituraId), timbre)
      void queryClient.invalidateQueries({ queryKey: chaves.brasao(prefeituraId) })
    },
  })
}

/**
 * Informa os itens de um DFD.
 *
 * <p>Recarrega a consolidação: é dela que saem o painel de quantidades do ETP e
 * a Cotação, e mantê-la velha faria a tela mostrar um total que já mudou.
 */
export function useAnexarDfdComItens(processoId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { secretariaId: string; nomeDoArquivo: string; itens: ItemDoDfd[] }) =>
      anexarDfdComItens(processoId, input.secretariaId, input.nomeDoArquivo, input.itens),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["consolidacao-demanda", processoId] })
      void queryClient.invalidateQueries({ queryKey: chaves.processo(processoId) })
    },
  })
}
