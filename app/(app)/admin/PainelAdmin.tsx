"use client"

import Link from "next/link"
import { useState } from "react"

import { StatCard, Tag } from "@/components/ui"
import { IconArrowRight, IconBuilding, IconChevronDown, IconChevronRight, IconUser } from "@/components/ui/icons"
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/estados"
import { useEntidades, useSessao, useUsuarios } from "@/lib/api/hooks"
import { formatDataHora } from "@/lib/format"
import { PERFIL_ACESSO_LABEL, TIPO_ENTIDADE_LABEL, type Usuario } from "@/lib/types"

/**
 * Usuários de uma entidade, abertos no clique da linha.
 *
 * <p>O painel listava o nome e a contagem; para saber *quem* eram os dois
 * servidores era preciso ir a outra tela e filtrar. A lista já está em memória
 * — mostrá-la aqui não custa requisição nenhuma.
 */
function UsuariosDaEntidade({ usuarios }: { usuarios: Usuario[] }) {
  if (usuarios.length === 0) {
    return (
      <div className="border-t border-ice bg-ice px-5 py-4 text-sm text-text-muted">
        Nenhum servidor cadastrado nesta entidade ainda.{" "}
        <Link href="/admin/servidores" className="font-semibold text-royal underline">
          Cadastrar servidor
        </Link>
        .
      </div>
    )
  }

  return (
    <ul className="m-0 flex list-none flex-col gap-2 border-t border-ice bg-ice p-4">
      {usuarios.map((u) => (
        <li
          key={u.id}
          className="flex flex-wrap items-center gap-3 rounded-md border border-border-soft bg-surface px-3.5 py-2.5"
        >
          <span className="flex size-7.5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-on-dark gradient-user">
            {u.iniciais}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-semibold text-text-1">{u.nome}</span>
            <span className="block truncate text-xs text-text-muted">{u.cargo || "—"}</span>
          </span>
          <Tag tone={u.perfilAcesso === "coordenador" ? "success" : "neutral"}>
            {PERFIL_ACESSO_LABEL[u.perfilAcesso]}
          </Tag>
          <span className="text-xs text-text-muted">
            {u.ultimoAcesso ? formatDataHora(u.ultimoAcesso) : "Nunca acessou"}
          </span>
        </li>
      ))}
    </ul>
  )
}

/** Painel do administrador geral — visão de sistema (entidades e servidores). */
export default function PainelAdmin() {
  const { data: sessao } = useSessao()
  const entidades = useEntidades()
  const usuarios = useUsuarios()

  const [entidadeAberta, setEntidadeAberta] = useState<string | null>(null)

  const totalEntidades = entidades.data?.length ?? 0
  const lista = usuarios.data ?? []
  // Usuários operacionais das entidades — o admin geral (LAHHM) não entra na contagem.
  const usuariosDeEntidade = lista.filter((u) => u.perfilAcesso !== "admin_geral")
  const totalServidores = usuariosDeEntidade.length
  const coordenadores = usuariosDeEntidade.filter((u) => u.perfilAcesso === "coordenador").length
  const entidadesOrdenadas = [...(entidades.data ?? [])].sort((a, b) =>
    a.nome.localeCompare(b.nome, "pt-BR"),
  )

  return (
    <div className="max-w-content p-4 sm:p-5 lg:p-7">
      <div className="mb-6">
        <p className="m-0 mb-1 text-base text-text-3">Administração do Sistema · LAHHM</p>
        <h2 className="m-0 font-display text-3xl font-extrabold tracking-tight text-text-1">
          Bem-vindo, {sessao?.usuario.primeiroNome ?? "Administrador"}
        </h2>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 xs:grid-cols-3">
        <StatCard label="Entidades" value={String(totalEntidades)} icon={IconBuilding} tone="royal" />
        <StatCard label="Servidores" value={String(totalServidores)} icon={IconUser} tone="success" />
        <StatCard label="Coordenadores" value={String(coordenadores)} icon={IconUser} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Link href="/admin/entidades" className="flex items-center gap-4 rounded-card border border-border bg-surface p-5 no-underline transition-colors hover:bg-ice">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-tint-royal-bg text-royal">
            <IconBuilding size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-md font-bold text-text-1">Entidades</span>
            <span className="block text-sm text-text-3">Cadastrar as entidades clientes do GeraDocs.</span>
          </span>
          <IconArrowRight size={16} strokeWidth={2.5} />
        </Link>
        <Link href="/admin/servidores" className="flex items-center gap-4 rounded-card border border-border bg-surface p-5 no-underline transition-colors hover:bg-ice">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-tint-success-bg text-success">
            <IconUser size={20} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-display text-md font-bold text-text-1">Servidores</span>
            <span className="block text-sm text-text-3">Criar servidores e vinculá-los às entidades.</span>
          </span>
          <IconArrowRight size={16} strokeWidth={2.5} />
        </Link>
      </div>

      {/* Entidades — cada linha abre os usuários cadastrados nela */}
      <div className="mt-6 overflow-hidden rounded-card border border-border bg-surface">
        <div className="border-b border-border-soft px-5 py-4">
          <h3 className="m-0 font-display text-lg font-bold text-text-1">Entidades</h3>
          <p className="m-0 mt-0.5 text-sm text-text-muted">
            Clique numa entidade para ver os servidores cadastrados nela.
          </p>
        </div>
        {entidades.isPending && <SkeletonRows rows={3} />}
        {entidades.isError && <ErrorState onRetry={() => void entidades.refetch()} />}
        {entidades.isSuccess && entidadesOrdenadas.length === 0 && (
          <EmptyState message="Nenhuma entidade cadastrada" />
        )}
        {entidades.isSuccess && entidadesOrdenadas.length > 0 && (
          <div className="divide-y divide-ice">
            {entidadesOrdenadas.map((entidade) => {
              const daEntidade = usuariosDeEntidade.filter((u) => u.entidadeId === entidade.id)
              const aberta = entidadeAberta === entidade.id
              const coordenadoresDela = daEntidade.filter(
                (u) => u.perfilAcesso === "coordenador",
              ).length

              return (
                <div key={entidade.id}>
                  <button
                    type="button"
                    onClick={() => setEntidadeAberta(aberta ? null : entidade.id)}
                    aria-expanded={aberta}
                    className={`flex w-full cursor-pointer items-center gap-3 border-0 px-5 py-3.5 text-left transition-colors hover:bg-ice ${
                      aberta ? "bg-ice" : "bg-transparent"
                    }`}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-tint-royal-bg text-royal">
                      <IconBuilding size={16} />
                    </span>
                    <span className="block min-w-0 flex-1">
                      <span className="block truncate text-base font-semibold text-text-1">
                        {entidade.nome}
                      </span>
                      {/* Resumo da entidade: o que ela é e quem trabalha nela.
                          Secretarias não entram — a listagem de entidades não as
                          traz, e "0 secretaria(s)" seria um número inventado. */}
                      <span className="block truncate text-xs text-text-muted">
                        {TIPO_ENTIDADE_LABEL[entidade.tipo]} · {daEntidade.length} servidor(es) ·{" "}
                        {coordenadoresDela} {PERFIL_ACESSO_LABEL.coordenador.toLowerCase()}(es)
                      </span>
                    </span>
                    <span className="shrink-0 text-text-muted">
                      {aberta ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                    </span>
                  </button>
                  {aberta && (
                    usuarios.isPending ? (
                      <SkeletonRows rows={2} height={36} />
                    ) : (
                      <UsuariosDaEntidade usuarios={daEntidade} />
                    )
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <p className="mt-4 text-xs text-text-muted">
        {totalServidores} usuário(s) nas entidades · {coordenadores}{" "}
        {PERFIL_ACESSO_LABEL.coordenador.toLowerCase()}(es) e {totalServidores - coordenadores}{" "}
        {PERFIL_ACESSO_LABEL.servidor.toLowerCase()}(es).
      </p>
    </div>
  )
}
