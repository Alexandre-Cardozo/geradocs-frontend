"use client"

import { useState } from "react"

import { Button, Dropdown, FormField, Input, Tag } from "@/components/ui"
import { IconPlus } from "@/components/ui/icons"
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/estados"
import { Th } from "@/components/shared/tabela"
import { useToast } from "@/components/shared/providers"
import { CredenciaisIniciais } from "@/components/admin/credenciais-iniciais"
import { useCriarUsuario, useSessao, useUsuarios } from "@/lib/api/hooks"
import { formatCPF, validaCPF } from "@/lib/auth/cpf"
import { formatDataHora } from "@/lib/format"
import { PERFIL_ACESSO_LABEL, type PerfilAcesso } from "@/lib/types"

/**
 * Usuários e permissões do órgão: quem entra e com qual perfil.
 *
 * <p>A senha de primeiro acesso é sorteada pelo servidor e só aparece uma vez —
 * por isso o aviso de credenciais vive fora do painel de cadastro, que fecha no
 * sucesso.
 */
export default function Usuarios() {
  const showToast = useToast()
  const { data: sessao } = useSessao()
  const entidadeId = sessao?.entidade?.id
  const servidores = useUsuarios(entidadeId)
  const criarServidor = useCriarUsuario()

  const [novoServidor, setNovoServidor] = useState(false)
  const [nsNome, setNsNome] = useState("")
  const [nsCpf, setNsCpf] = useState("")
  const [nsEmail, setNsEmail] = useState("")
  const [nsCargo, setNsCargo] = useState("")
  const [nsPerfil, setNsPerfil] = useState<PerfilAcesso>("servidor")
  const [credenciais, setCredenciais] = useState<{
    nome: string
    chave: string
    senha: string
  } | null>(null)

  return (
    <div className="w-full p-4 sm:p-5 lg:p-7">
      {/* Fora do painel de cadastro: ele fecha no sucesso, e o aviso nascia
          desmontado — o servidor era gravado e a senha nunca aparecia. */}
      {credenciais && (
        <div className="mb-4">
          <CredenciaisIniciais
            nome={credenciais.nome}
            chave={credenciais.chave}
            senha={credenciais.senha}
            titulo="Credenciais de primeiro acesso"
            onFechar={() => setCredenciais(null)}
          />
        </div>
      )}
      {novoServidor && (
        <div className="mb-4 rounded-card border border-border bg-surface p-5">
          <h3 className="m-0 mb-4 font-display text-md font-bold text-text-1">
            Adicionar Servidor à Entidade
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nome Completo" required>
              <Input
                value={nsNome}
                onChange={(e) => setNsNome(e.target.value)}
                placeholder="Nome do servidor"
              />
            </FormField>
            <FormField
              label="CPF"
              required
              hint={nsCpf !== "" && !validaCPF(nsCpf) ? "CPF inválido." : undefined}
            >
              <Input
                value={nsCpf}
                onChange={(e) => setNsCpf(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
              />
            </FormField>
            <FormField label="E-mail" required>
              <Input
                value={nsEmail}
                onChange={(e) => setNsEmail(e.target.value)}
                type="email"
                placeholder="email@prefeitura.gov.br"
              />
            </FormField>
            <FormField label="Cargo">
              <Input
                value={nsCargo}
                onChange={(e) => setNsCargo(e.target.value)}
                placeholder="Ex: Servidor de Compras"
              />
            </FormField>
            <FormField label="Perfil de Acesso" required>
              <Dropdown
                value={nsPerfil}
                onChange={(v) => setNsPerfil(v as PerfilAcesso)}
                ariaLabel="Perfil de acesso"
                options={[
                  { value: "servidor", label: PERFIL_ACESSO_LABEL.servidor },
                  { value: "coordenador", label: PERFIL_ACESSO_LABEL.coordenador },
                ]}
              />
            </FormField>
          </div>
          <div className="mt-4 flex gap-2.5">
            <Button variant="secondary" onClick={() => setNovoServidor(false)}>
              Cancelar
            </Button>
            <p id="motivo-criar-servidor-tenant" className="sr-only">
              Nome, CPF válido, e-mail e a entidade são obrigatórios. A senha é sorteada pelo
              sistema e aparece depois de cadastrar.
            </p>
            <Button
              disabled={
                criarServidor.isPending ||
                nsNome.trim() === "" ||
                !validaCPF(nsCpf) ||
                nsEmail.trim() === "" ||
                !entidadeId
              }
              ariaDescribedBy="motivo-criar-servidor-tenant"
              onClick={() =>
                criarServidor.mutate(
                  {
                    nome: nsNome,
                    cpf: nsCpf,
                    email: nsEmail,
                    cargo: nsCargo,
                    perfilAcesso: nsPerfil,
                    entidadeId: entidadeId ?? null,
                  },
                  {
                    onSuccess: (criado) => {
                      setCredenciais({
                        // O CPF digitado, e não o da resposta: o servidor
                        // mascara de propósito, e credencial pela metade não
                        // abre porta nenhuma.
                        nome: criado.usuario.nome,
                        chave: nsCpf,
                        senha: criado.senhaProvisoria,
                      })
                      showToast("Servidor cadastrado.")
                      setNovoServidor(false)
                      setNsNome("")
                      setNsCpf("")
                      setNsEmail("")
                      setNsCargo("")
                      setNsPerfil("servidor")
                    },
                    onError: (e) =>
                      showToast(e instanceof Error ? e.message : "Não foi possível cadastrar."),
                  },
                )
              }
            >
              {criarServidor.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
          <h3 className="m-0 font-display text-lg font-bold text-text-1">
            Servidores da Entidade
          </h3>
          <Button
            size="sm"
            icon={<IconPlus size={13} strokeWidth={2.5} />}
            onClick={() => setNovoServidor((v) => !v)}
          >
            Adicionar Servidor
          </Button>
        </div>
        {servidores.isPending && <SkeletonRows rows={4} />}
        {servidores.isError && <ErrorState onRetry={() => void servidores.refetch()} />}
        {servidores.isSuccess && servidores.data.length === 0 && (
          <EmptyState message="Nenhum servidor vinculado a esta entidade" />
        )}
        {servidores.isSuccess && servidores.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-ice">
                  {["Servidor", "Cargo", "Perfil de Acesso", "Último Acesso"].map((h, i) => (
                    <Th key={h === "" ? `vazio-${i}` : h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {servidores.data.map((u, idx) => (
                  <tr
                    key={u.id}
                    className={idx < servidores.data.length - 1 ? "border-b border-ice" : ""}
                  >
                    <td className="px-4 py-3.25">
                      <div className="flex items-center gap-2.5">
                        <span className="flex size-7.5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-on-dark gradient-user">
                          {u.iniciais}
                        </span>
                        <div>
                          <div className="text-base font-semibold text-text-1">{u.nome}</div>
                          <div className="font-mono text-xs text-text-muted">
                            {u.cpf.includes("*") ? u.cpf : formatCPF(u.cpf)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.25 text-sm text-text-3">{u.cargo}</td>
                    <td className="px-4 py-3.25">
                      <Tag tone={u.perfilAcesso === "coordenador" ? "success" : "neutral"}>
                        {PERFIL_ACESSO_LABEL[u.perfilAcesso]}
                      </Tag>
                    </td>
                    <td className="px-4 py-3.25 text-sm text-text-muted">
                      {u.ultimoAcesso ? formatDataHora(u.ultimoAcesso) : "—"}
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
