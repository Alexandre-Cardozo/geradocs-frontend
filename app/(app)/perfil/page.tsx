"use client"

import { useRef } from "react"

import { Button, InfoBanner, Tag } from "@/components/ui"
import { IconCamera, IconTrash } from "@/components/ui/icons"
import { FotoDePerfil } from "@/components/shared/foto-de-perfil"
import { LoadingState } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { TrocaDeSenha } from "@/components/shared/troca-de-senha"
import {
  useEnviarFotoDePerfil,
  useFotoDePerfil,
  useRemoverFotoDePerfil,
  useSessao,
} from "@/lib/api/hooks"
import { FORMATOS_DE_FOTO, TAMANHO_MAXIMO_DA_FOTO } from "@/lib/api/avatar-client"
import { formatCPF } from "@/lib/auth/cpf"
import { formatarBytes } from "@/lib/format"
import { PERFIL_ACESSO_LABEL } from "@/lib/types"

/**
 * Meu Perfil — o que a plataforma sabe sobre quem está logado.
 *
 * <p>Os dados cadastrais são de leitura: nome, CPF, matrícula e decreto compõem
 * o registro que responde ao controle, e quem os altera é a administração, em
 * Servidores. O que é da pessoa — a foto e a senha — ela muda aqui.
 */
export default function MeuPerfil() {
  const showToast = useToast()
  const sessao = useSessao()
  const usuario = sessao.data?.usuario
  const prefeitura = sessao.data?.prefeitura

  const foto = useFotoDePerfil(usuario?.id)
  const enviar = useEnviarFotoDePerfil(usuario?.id)
  const remover = useRemoverFotoDePerfil(usuario?.id)
  const seletor = useRef<HTMLInputElement>(null)

  if (sessao.isPending || !usuario) return <LoadingState label="Carregando perfil..." />

  const escolher = (arquivo: File) => {
    if (arquivo.size > TAMANHO_MAXIMO_DA_FOTO) {
      // Recusar aqui poupa o envio inteiro de um arquivo que o servidor vai
      // rejeitar — e num escritório de prefeitura a subida não é rápida.
      showToast(
        `A foto tem ${formatarBytes(arquivo.size)} e o limite é ${formatarBytes(TAMANHO_MAXIMO_DA_FOTO)}.`,
      )
      return
    }
    enviar.mutate(arquivo, {
      onSuccess: () => showToast("Foto atualizada."),
      onError: (erro) =>
        showToast(erro instanceof Error ? erro.message : "Não foi possível enviar a foto."),
    })
  }

  return (
    <div className="max-w-content p-4 sm:p-5 lg:p-7">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Coluna 1 — identidade e foto */}
        <div className="flex flex-col items-center rounded-card border border-border bg-surface p-6 text-center">
          <FotoDePerfil usuarioId={usuario.id} iniciais={usuario.iniciais} tamanho={96} className="text-3xl" />

          <input
            ref={seletor}
            type="file"
            accept={FORMATOS_DE_FOTO}
            className="hidden"
            aria-label="Escolher foto de perfil"
            onChange={(e) => {
              const arquivo = e.target.files?.[0]
              // Zera o valor: escolher o mesmo arquivo duas vezes seguidas não
              // dispara `change`, e a segunda tentativa pareceria travada.
              e.target.value = ""
              if (arquivo) escolher(arquivo)
            }}
          />
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              icon={<IconCamera size={14} />}
              disabled={enviar.isPending}
              onClick={() => seletor.current?.click()}
            >
              {enviar.isPending ? "Enviando..." : foto.url ? "Trocar foto" : "Adicionar foto"}
            </Button>
            {foto.url && (
              <Button
                size="sm"
                variant="ghost"
                icon={<IconTrash size={14} />}
                disabled={remover.isPending}
                onClick={() =>
                  remover.mutate(undefined, {
                    onSuccess: () => showToast("Foto removida."),
                  })
                }
              >
                Remover
              </Button>
            )}
          </div>
          <span className="mt-2 text-2xs text-text-muted">
            PNG, JPEG ou WebP, até {formatarBytes(TAMANHO_MAXIMO_DA_FOTO)}.
          </span>

          <div className="mt-4 font-display text-xl font-extrabold tracking-tight text-text-1">
            {usuario.nome}
          </div>
          <div className="mt-1.5">
            <Tag tone="info">{PERFIL_ACESSO_LABEL[usuario.perfilAcesso]}</Tag>
          </div>
          <p className="m-0 mt-2.5 text-sm text-text-3">
            {usuario.cargo || "Sem cargo definido"}
          </p>
          {prefeitura && <p className="m-0 mt-2.5 text-sm text-text-3">{prefeitura.orgao}</p>}
        </div>

        {/* Coluna 2 — cadastro e senha */}
        <div className="flex flex-col gap-5">
          <div className="rounded-card border border-border bg-surface p-6 lg:p-7">
            <h2 className="m-0 mb-1.5 font-display text-md font-bold text-text-1">
              Dados cadastrais
            </h2>
            <p className="m-0 mb-5 text-sm text-text-3">
              Estes dados compõem o registro dos processos que você assina. Quem os altera é a
              administração, em Servidores.
            </p>

            <dl className="m-0 grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
              <Dado rotulo="Nome completo" valor={usuario.nome} />
              <Dado rotulo="CPF" valor={usuario.cpf ? formatCPF(usuario.cpf) : "—"} />
              <Dado rotulo="E-mail" valor={usuario.email} />
              <Dado rotulo="Cargo" valor={usuario.cargo || "—"} />
              <Dado rotulo="Matrícula" valor={usuario.matricula ?? "—"} />
              <Dado rotulo="Decreto de nomeação" valor={usuario.decretoNomeacao ?? "—"} />
              {prefeitura && <Dado rotulo="Órgão" valor={prefeitura.orgao} />}
              {usuario.secretaria && <Dado rotulo="Secretaria" valor={usuario.secretaria} />}
            </dl>
          </div>

          {usuario.precisaTrocarSenha && (
            <InfoBanner tone="warning">
              Sua senha foi gerada pelo sistema e é conhecida por quem cadastrou seu acesso.
              Escolha uma senha só sua abaixo.
            </InfoBanner>
          )}
          <TrocaDeSenha provisoria={usuario.precisaTrocarSenha ?? false} />
        </div>
      </div>
    </div>
  )
}

function Dado({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div>
      <dt className="m-0 text-xs font-semibold text-text-muted">{rotulo}</dt>
      <dd className="m-0 mt-1 text-md text-text-1">{valor}</dd>
    </div>
  )
}
