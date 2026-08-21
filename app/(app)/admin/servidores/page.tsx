"use client"

import { useState } from "react"

import { Button, Dropdown, FormField, Input, Tag } from "@/components/ui"
import { IconPlus, IconTrash } from "@/components/ui/icons"
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/estados"
import { Th } from "@/components/shared/tabela"
import { useToast } from "@/components/shared/providers"
import { useCriarUsuario, usePrefeituras, useRemoverUsuario, useUsuarios } from "@/lib/api/hooks"
import { formatCPF, validaCPF } from "@/lib/auth/cpf"
import { formatDataHora } from "@/lib/format"
import { PERFIL_ACESSO_LABEL, type PerfilAcesso } from "@/lib/types"

const perfilTone = (p: PerfilAcesso) => (p === "admin_geral" ? "warning" : p === "coordenador" ? "success" : "neutral")

export default function AdminServidores() {
  const showToast = useToast()
  const usuarios = useUsuarios()
  const prefeituras = usePrefeituras()
  const criar = useCriarUsuario()
  const remover = useRemoverUsuario()

  const [novo, setNovo] = useState(false)
  const [nome, setNome] = useState("")
  const [cpf, setCpf] = useState("")
  const [email, setEmail] = useState("")
  const [cargo, setCargo] = useState("")
  const [senha, setSenha] = useState("")
  const [perfil, setPerfil] = useState<PerfilAcesso>("servidor")
  const [prefeituraId, setPrefeituraId] = useState("")

  // Filtros da listagem
  const [filtroPrefeitura, setFiltroPrefeitura] = useState("")
  const [buscaNome, setBuscaNome] = useState("")
  const [filtroFuncao, setFiltroFuncao] = useState("")

  const listaFiltrada = (usuarios.data ?? []).filter((u) => {
    const okPref = filtroPrefeitura === "" || u.prefeituraId === filtroPrefeitura
    const okNome = buscaNome.trim() === "" || u.nome.toLowerCase().includes(buscaNome.trim().toLowerCase())
    const okFuncao = filtroFuncao === "" || u.perfilAcesso === filtroFuncao
    return okPref && okNome && okFuncao
  })

  const cpfValido = validaCPF(cpf)
  const precisaPrefeitura = perfil !== "admin_geral"
  const podeSalvar = nome.trim() !== "" && cpfValido && email.trim() !== "" && senha.length >= 12 && (!precisaPrefeitura || prefeituraId !== "")

  const salvar = () => {
    if (!podeSalvar) return
    criar.mutate(
      { nome, cpf, email, cargo, senha, perfilAcesso: perfil, prefeituraId: precisaPrefeitura ? prefeituraId : null },
      {
        onSuccess: () => {
          showToast("Servidor cadastrado com a senha inicial informada.")
          setNovo(false)
          setNome(""); setCpf(""); setEmail(""); setCargo(""); setSenha(""); setPerfil("servidor"); setPrefeituraId("")
        },
        onError: (e) => showToast(e instanceof Error ? e.message : "Não foi possível cadastrar."),
      }
    )
  }

  const nomePrefeitura = (id: string | null) =>
    id ? prefeituras.data?.find((p) => p.id === id)?.orgao ?? id : "—"

  return (
    <div className="max-w-content p-4 sm:p-5 lg:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-2xl font-extrabold tracking-tight text-text-1">Servidores</h1>
          <p className="m-0 mt-1 text-md text-text-3">Cadastre servidores e vincule-os às prefeituras e perfis de acesso.</p>
        </div>
        <Button icon={<IconPlus size={14} strokeWidth={2.5} />} onClick={() => setNovo((v) => !v)}>
          Novo Servidor
        </Button>
      </div>

      {novo && (
        <div className="mb-5 rounded-card border border-border bg-surface p-5">
          <h2 className="m-0 mb-4 font-display text-md font-bold text-text-1">Cadastrar Servidor</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nome Completo" required>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do servidor" />
            </FormField>
            <FormField label="CPF" required hint={cpf !== "" && !cpfValido ? "CPF inválido." : undefined}>
              <Input value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" />
            </FormField>
            <FormField label="E-mail" required>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@prefeitura.gov.br" />
            </FormField>
            <FormField label="Cargo">
              <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Servidor de Compras" />
            </FormField>
            <FormField label="Senha inicial" required hint="Mínimo de 12 caracteres.">
              <Input value={senha} onChange={(e) => setSenha(e.target.value)} type="password" autoComplete="new-password" />
            </FormField>
            <FormField label="Perfil de Acesso" required>
              <Dropdown
                value={perfil}
                onChange={(v) => setPerfil(v as PerfilAcesso)}
                ariaLabel="Perfil de acesso"
                options={[
                  { value: "servidor", label: PERFIL_ACESSO_LABEL.servidor },
                  { value: "coordenador", label: PERFIL_ACESSO_LABEL.coordenador },
                  { value: "admin_geral", label: PERFIL_ACESSO_LABEL.admin_geral },
                ]}
              />
            </FormField>
            {precisaPrefeitura && (
              <FormField label="Prefeitura" required>
                <Dropdown
                  value={prefeituraId}
                  onChange={setPrefeituraId}
                  ariaLabel="Prefeitura"
                  options={[
                    { value: "", label: "Selecione a prefeitura..." },
                    ...(prefeituras.data ?? []).map((p) => ({ value: p.id, label: p.orgao })),
                  ]}
                />
              </FormField>
            )}
          </div>
          <div className="mt-4 flex gap-2.5">
            <Button variant="secondary" onClick={() => setNovo(false)}>Cancelar</Button>
            <Button disabled={criar.isPending || !podeSalvar} onClick={salvar}>
              {criar.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </div>
      )}

      {/* Filtros da listagem — prefeitura, busca por servidor, função */}
      {usuarios.isSuccess && (usuarios.data.length > 0 || filtroPrefeitura !== "" || buscaNome !== "" || filtroFuncao !== "") && (
        <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <Dropdown
            value={filtroPrefeitura}
            onChange={setFiltroPrefeitura}
            ariaLabel="Filtrar por prefeitura"
            options={[
              { value: "", label: "Todas as prefeituras" },
              ...(prefeituras.data ?? []).map((p) => ({ value: p.id, label: p.orgao })),
            ]}
          />
          <Input
            value={buscaNome}
            onChange={(e) => setBuscaNome(e.target.value)}
            placeholder="Buscar por servidor..."
            className="h-9.5"
          />
          <Dropdown
            value={filtroFuncao}
            onChange={setFiltroFuncao}
            ariaLabel="Filtrar por função"
            options={[
              { value: "", label: "Todas as funções" },
              { value: "coordenador", label: PERFIL_ACESSO_LABEL.coordenador },
              { value: "servidor", label: PERFIL_ACESSO_LABEL.servidor },
            ]}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {usuarios.isPending && <SkeletonRows rows={5} />}
        {usuarios.isError && <ErrorState onRetry={() => void usuarios.refetch()} />}
        {usuarios.isSuccess && usuarios.data.length === 0 && <EmptyState message="Nenhum servidor cadastrado" />}
        {usuarios.isSuccess && usuarios.data.length > 0 && listaFiltrada.length === 0 && (
          <EmptyState message="Nenhum servidor encontrado para os filtros aplicados" />
        )}
        {usuarios.isSuccess && listaFiltrada.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-ice">
                  {["Servidor", "CPF", "Prefeitura", "Perfil", "Último Acesso", ""].map((h, i) => (
                    <Th key={h === "" ? `x-${i}` : h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((u, i) => (
                  <tr key={u.id} className={i < listaFiltrada.length - 1 ? "border-b border-ice" : ""}>
                    <td className="px-4 py-3.25">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-on-dark gradient-user">
                          {u.iniciais}
                        </span>
                        <div>
                          <div className="text-base font-semibold text-text-1">{u.nome}</div>
                          <div className="text-xs text-text-muted">{u.cargo}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.25 font-mono text-sm text-text-3">{u.cpf.includes("*") ? u.cpf : formatCPF(u.cpf)}</td>
                    <td className="px-4 py-3.25 text-sm text-text-3">{nomePrefeitura(u.prefeituraId)}</td>
                    <td className="px-4 py-3.25">
                      <Tag tone={perfilTone(u.perfilAcesso)}>{PERFIL_ACESSO_LABEL[u.perfilAcesso]}</Tag>
                    </td>
                    <td className="px-4 py-3.25 text-sm text-text-3">{u.ultimoAcesso ? formatDataHora(u.ultimoAcesso) : "—"}</td>
                    <td className="px-4 py-3.25">
                      <button
                        type="button"
                        aria-label={`Desativar ${u.nome}`}
                        disabled={remover.isPending}
                        onClick={() => remover.mutate(u.id, {
                          onSuccess: () => showToast(`${u.nome} desativado.`),
                          onError: (error) => showToast(error instanceof Error ? error.message : "Não foi possível desativar o servidor."),
                        })}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-sm border border-border bg-ice text-danger transition-colors hover:bg-tint-danger-bg disabled:opacity-50"
                      >
                        <IconTrash size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
