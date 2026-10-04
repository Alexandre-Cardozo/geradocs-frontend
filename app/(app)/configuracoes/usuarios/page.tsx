"use client"

import { useState } from "react"

import { Button, Tag } from "@/components/ui"
import { IconPlus } from "@/components/ui/icons"
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/estados"
import { Th } from "@/components/shared/tabela"
import { useToast } from "@/components/shared/providers"
import { CadastroDeServidor, SEM_RECUSAS, type DadosDoCadastro } from "@/components/admin/cadastro-de-servidor"
import { CredenciaisIniciais } from "@/components/admin/credenciais-iniciais"
import { ApiError } from "@/lib/api/auth-client"
import { useCriarUsuario, useSessao, useUsuarios } from "@/lib/api/hooks"
import { formatCPF } from "@/lib/auth/cpf"
import { formatDataHora } from "@/lib/format"
import { PERFIL_ACESSO_LABEL } from "@/lib/types"

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
  const entidade = sessao?.entidade
  const servidores = useUsuarios(entidade?.id)
  const criarServidor = useCriarUsuario()

  const [novoServidor, setNovoServidor] = useState(false)
  const [credenciais, setCredenciais] = useState<{
    nome: string
    chave: string
    senha: string
  } | null>(null)

  const abrirOuFecharCadastro = (aberto: boolean) => {
    // A recusa da tentativa anterior não vale para um painel que reabre vazio.
    criarServidor.reset()
    setNovoServidor(aberto)
  }

  const salvar = (dados: DadosDoCadastro) =>
    criarServidor.mutate(dados, {
      onSuccess: (criado) => {
        setCredenciais({
          // O CPF digitado, e não o da resposta: o servidor mascara de
          // propósito, e credencial pela metade não abre porta nenhuma.
          nome: criado.usuario.nome,
          chave: dados.cpf,
          senha: criado.senhaProvisoria,
        })
        showToast("Servidor cadastrado.")
        setNovoServidor(false)
      },
      onError: (e) => showToast(e instanceof Error ? e.message : "Não foi possível cadastrar."),
    })

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
            titulo="Credenciais de Primeiro Acesso"
            onFechar={() => setCredenciais(null)}
          />
        </div>
      )}
      {novoServidor && (
        <div className="mb-4">
          {/* A mesma ficha de cadastro do administrador, com a entidade travada
              na do coordenador: ele só cadastra na própria. */}
          <CadastroDeServidor
            titulo="Adicionar Servidor à Entidade"
            entidade={{ fixa: { id: entidade?.id ?? "", nome: entidade?.nome ?? "" } }}
            salvando={criarServidor.isPending}
            recusas={criarServidor.error instanceof ApiError ? criarServidor.error.campos : SEM_RECUSAS}
            onCadastrar={salvar}
            onCancelar={() => abrirOuFecharCadastro(false)}
          />
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
            onClick={() => abrirOuFecharCadastro(!novoServidor)}
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
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-ice">
                  {["Servidor", "Matrícula", "Cargo", "Perfil de Acesso", "Último Acesso"].map((h, i) => (
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
                    <td className="px-4 py-3.25 font-mono text-sm text-text-3">{u.matricula ?? "—"}</td>
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
