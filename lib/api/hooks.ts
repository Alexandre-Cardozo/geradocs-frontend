"use client"

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useState } from "react"

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
  proximoNumero: ["processos", "proximo-numero"] as const,
  parecerDFD: (id: string) => ["parecer-dfd", id] as const,
  secoes: (id: string, tipo: TipoDocumento) => ["secoes", id, tipo] as const,
  documentos: ["documentos"] as const,
  resumoDocumentos: ["documentos", "resumo"] as const,
  historicoVersoes: (id: string, tipo: TipoDocumento) => ["versoes", id, tipo] as const,
  tenant: (prefeituraId?: string) => ["tenant", prefeituraId ?? "sessao"] as const,
  usuarios: (prefeituraId?: string, busca = "") => ["usuarios", prefeituraId ?? "todos", busca] as const,
  prefeituras: ["prefeituras"] as const,
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

export function useAtualizarAvatar() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (avatarDataUrl: string | null) => api.atualizarAvatar(avatarDataUrl),
    onSuccess: (sessao) => queryClient.setQueryData(chaves.sessao, sessao),
  })
}

export function useAtualizarMeuPerfil() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: api.MeuPerfilInput) => api.atualizarMeuPerfil(input),
    onSuccess: (sessao) => queryClient.setQueryData(chaves.sessao, sessao),
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

export function useProximoNumeroProcesso() {
  return useQuery({ queryKey: chaves.proximoNumero, queryFn: api.getProximoNumeroProcesso })
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

/** A demanda consolidada dos DFDs do processo. */
export function useConsolidacaoDaDemanda(processoId: string) {
  return useQuery({
    queryKey: ["consolidacao-demanda", processoId],
    queryFn: () => api.getConsolidacaoDaDemanda(processoId),
    enabled: processoId !== "",
  })
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

/** Config da prefeitura em foco (sem id = a da sessão). */
export function useConfigTenant(prefeituraId?: string) {
  return useQuery({
    queryKey: chaves.tenant(prefeituraId),
    queryFn: () => api.getConfigTenant(prefeituraId),
    enabled: prefeituraId != null,
  })
}

export function useAtualizarConfigTenant(prefeituraId?: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: Partial<Tenant>) => api.atualizarConfigTenant(patch, prefeituraId),
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
