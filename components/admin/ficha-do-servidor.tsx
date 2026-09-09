"use client"

import { useState } from "react"

import { Button, Tag } from "@/components/ui"
import { IconEye, IconEyeOff, IconLock, IconX } from "@/components/ui/icons"
import { FotoDePerfil } from "@/components/shared/foto-de-perfil"
import { useToast } from "@/components/shared/providers"
import { CredenciaisIniciais } from "@/components/admin/credenciais-iniciais"
import { useRedefinirSenhaDeServidor, useRevelarCpf } from "@/lib/api/hooks"
import { formatCPF } from "@/lib/auth/cpf"
import { formatDataHora } from "@/lib/format"
import { PERFIL_ACESSO_LABEL, type Usuario } from "@/lib/types"

/**
 * A ficha de um servidor, aberta a partir da listagem.
 *
 * <p>Existe por causa da senha: quem administra precisa devolver o acesso de
 * quem esqueceu a dela, e sem isto o único caminho era a recuperação por
 * e-mail — que a instalação mínima não tem (ADR-022).
 *
 * <p>Não edita nada. A edição do cadastro tem lugar próprio, e misturar as duas
 * coisas faria a redefinição de senha ficar a um clique de distância de um
 * "Salvar" que a pessoa não pretendia dar.
 */
export function FichaDoServidor({
  servidor,
  entidade,
  onFechar,
}: {
  servidor: Usuario
  entidade: string
  onFechar: () => void
}) {
  const redefinir = useRedefinirSenhaDeServidor()
  const revelar = useRevelarCpf()
  const showToast = useToast()
  const [novaSenha, setNovaSenha] = useState<string | null>(null)
  const [confirmando, setConfirmando] = useState(false)
  // O CPF inteiro é da ficha, e não do campo: as credenciais de acesso precisam
  // dele para serem entregáveis, e é o mesmo número — pedi-lo duas vezes geraria
  // duas linhas de auditoria para uma revelação só.
  const [cpfInteiro, setCpfInteiro] = useState<string | null>(null)
  const [mostrandoCpf, setMostrandoCpf] = useState(false)

  const cpfMascarado = servidor.cpf.includes("*") ? servidor.cpf : formatCPF(servidor.cpf)

  /** Revela o CPF, ou reaproveita o que já foi revelado nesta ficha. */
  const comCpfInteiro = (aoTer: (cpf: string) => void) => {
    if (cpfInteiro) {
      aoTer(cpfInteiro)
      return
    }
    revelar.mutate(servidor.id, {
      onSuccess: (cpf) => {
        setCpfInteiro(cpf)
        aoTer(cpf)
      },
      onError: (erro) =>
        showToast(erro instanceof Error ? erro.message : "Não foi possível ver o CPF."),
    })
  }

  return (
    <div className="mb-5 rounded-card border border-border bg-surface p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <FotoDePerfil
            usuarioId={servidor.id}
            iniciais={servidor.iniciais}
            tamanho={48}
            className="shrink-0 text-md"
          />
          <div className="min-w-0">
            <h2 className="m-0 truncate font-display text-md font-bold text-text-1">
              {servidor.nome}
            </h2>
            <p className="m-0 mt-0.5 text-sm text-text-3">{servidor.cargo || "Sem cargo definido"}</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Fechar ficha do servidor"
          onClick={onFechar}
          className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-border bg-ice text-text-3 transition-colors hover:bg-border-soft"
        >
          <IconX size={14} />
        </button>
      </div>

      <dl className="m-0 mt-5 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0">
          <dt className="m-0 text-xs font-semibold text-text-muted">CPF</dt>
          <dd className="m-0 mt-1 flex items-center gap-2">
            <span className="truncate font-mono text-md text-text-1">
              {mostrandoCpf && cpfInteiro ? formatCPF(cpfInteiro) : cpfMascarado}
            </span>
            <button
              type="button"
              aria-pressed={mostrandoCpf}
              aria-label={
                mostrandoCpf
                  ? `Ocultar o CPF de ${servidor.nome}`
                  : `Ver o CPF completo de ${servidor.nome}`
              }
              disabled={revelar.isPending}
              onClick={() =>
                mostrandoCpf ? setMostrandoCpf(false) : comCpfInteiro(() => setMostrandoCpf(true))
              }
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-border bg-ice text-text-3 transition-colors hover:bg-border-soft disabled:opacity-50"
            >
              {mostrandoCpf ? <IconEyeOff size={13} /> : <IconEye size={13} />}
            </button>
          </dd>
        </div>
        <Campo rotulo="E-mail" valor={servidor.email} />
        <Campo rotulo="Matrícula" valor={servidor.matricula ?? "—"} />
        <Campo rotulo="Decreto de nomeação" valor={servidor.decretoNomeacao ?? "—"} />
        <Campo rotulo="Entidade" valor={entidade} />
        <Campo
          rotulo="Último acesso"
          valor={servidor.ultimoAcesso ? formatDataHora(servidor.ultimoAcesso) : "Nunca acessou"}
        />
        <div>
          <dt className="m-0 text-xs font-semibold text-text-muted">Perfil</dt>
          <dd className="m-0 mt-1">
            <Tag tone={servidor.perfilAcesso === "admin_geral" ? "warning" : "info"}>
              {PERFIL_ACESSO_LABEL[servidor.perfilAcesso]}
            </Tag>
          </dd>
        </div>
        <div>
          <dt className="m-0 text-xs font-semibold text-text-muted">Situação</dt>
          <dd className="m-0 mt-1">
            <Tag tone={servidor.ativo ? "success" : "neutral"}>
              {servidor.ativo ? "Ativo" : "Desativado"}
            </Tag>
          </dd>
        </div>
      </dl>

      {novaSenha && (
        <div className="mt-5">
          <CredenciaisIniciais
            nome={servidor.nome}
            chave={cpfInteiro ?? servidor.cpf}
            senha={novaSenha}
            titulo="Senha redefinida"
            onFechar={() => setNovaSenha(null)}
          />
        </div>
      )}

      <div className="mt-5 border-t border-border-soft pt-4">
        {confirmando ? (
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="m-0 mr-1 text-sm text-text-3">
              A senha atual de {servidor.primeiroNome} deixa de valer e as sessões abertas dela
              caem. Confirmar?
            </p>
            <Button
              size="sm"
              disabled={redefinir.isPending}
              onClick={() =>
                redefinir.mutate(servidor.id, {
                  onSuccess: (senha) => {
                    setNovaSenha(senha)
                    setConfirmando(false)
                    // Sem o CPF inteiro, o que se copia é "***.***.***-74" — e
                    // credencial pela metade não abre porta nenhuma.
                    comCpfInteiro(() => {})
                    showToast("Senha redefinida. Entregue as credenciais.")
                  },
                  onError: (erro) =>
                    showToast(
                      erro instanceof Error ? erro.message : "Não foi possível redefinir a senha.",
                    ),
                })
              }
            >
              {redefinir.isPending ? "Redefinindo..." : "Redefinir senha"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="secondary"
            icon={<IconLock size={14} />}
            onClick={() => setConfirmando(true)}
          >
            Redefinir senha
          </Button>
        )}
      </div>
    </div>
  )
}

function Campo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="m-0 text-xs font-semibold text-text-muted">{rotulo}</dt>
      <dd className="m-0 mt-1 truncate text-md text-text-1">{valor}</dd>
    </div>
  )
}
