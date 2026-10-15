"use client"

import { useState } from "react"

import { Button, SectionBlock, Tag } from "@/components/ui"
import { IconBuilding, IconPencil, IconPlus, IconTrash } from "@/components/ui/icons"
import { FormularioDaSecretaria } from "@/components/configuracoes/formulario-da-secretaria"
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import {
  useAtualizarSecretaria,
  useConfigTenant,
  useCriarSecretaria,
  useRemoverSecretaria,
  useSessao,
} from "@/lib/api/hooks"
import { fichaParaSalvar, nadaMudou, pendenciasDaFicha, type FichaEmEdicao } from "@/lib/secretarias/ficha"
import type { Secretaria } from "@/lib/types"

/** Um dado da ficha no cartão; o que falta aparece como falta, e não como espaço vazio. */
function Dado({ rotulo, valor, className = "" }: { rotulo: string; valor: string | null; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="text-2xs font-semibold tracking-caps text-text-muted uppercase">{rotulo}</dt>
      <dd className={`m-0 truncate text-sm ${valor ? "text-text-2" : "text-text-muted italic"}`} title={valor ?? undefined}>
        {valor ?? "Não informado"}
      </dd>
    </div>
  )
}

/**
 * Uma secretaria da lista, com a ficha à vista.
 *
 * <p>Mostrar a ficha no próprio cartão é o que deixa ver, sem abrir nada, qual
 * secretaria ainda sairia com o DFD incompleto.
 */
function CartaoDaSecretaria({
  secretaria,
  pendente,
  onEditar,
  onRemover,
}: {
  secretaria: Secretaria
  /** A desativação em andamento. */
  pendente: boolean
  onEditar: () => void
  onRemover: () => void
}) {
  const [confirmando, setConfirmando] = useState(false)
  const { ficha } = secretaria
  const completa = pendenciasDaFicha(ficha).length === 0
  const tituloId = `secretaria-${secretaria.id}`
  const secretario = ficha.secretario
    ? [ficha.secretario, ficha.cpfDoSecretario && `CPF ${ficha.cpfDoSecretario}`].filter(Boolean).join(" · ")
    : null

  return (
    <article aria-labelledby={tituloId} className="rounded-card border border-border bg-surface p-4">
      <header className="flex flex-wrap items-start gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-tint-royal-bg text-royal">
          <IconBuilding size={15} />
        </span>
        <div className="flex min-w-48 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1 pt-1">
          <h4 id={tituloId} className="m-0 text-base leading-snug font-semibold text-text-1">
            {secretaria.nome}
          </h4>
          {completa ? <Tag tone="success">Ficha Completa</Tag> : <Tag tone="warning">Ficha Incompleta</Tag>}
        </div>
        {!confirmando && (
          <div className="ml-auto flex items-center gap-1.5">
            <Button variant="secondary" size="sm" icon={<IconPencil size={13} />} onClick={onEditar}>
              {completa ? "Editar" : "Completar Ficha"}
            </Button>
            <button
              type="button"
              aria-label={`Remover ${secretaria.nome}`}
              title="Remover"
              onClick={() => setConfirmando(true)}
              className="flex size-8 cursor-pointer items-center justify-center rounded-md text-text-muted transition-colors hover:bg-tint-danger-bg hover:text-danger"
            >
              <IconTrash size={14} />
            </button>
          </div>
        )}
      </header>

      <dl className="m-0 mt-3 grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3 lg:pl-11">
        <Dado rotulo="E-mail institucional" valor={ficha.email} />
        <Dado rotulo="UG" valor={ficha.ug} />
        <Dado rotulo="Endereço" valor={ficha.endereco} className="sm:col-span-2 lg:col-span-1" />
        <Dado rotulo="Secretário" valor={secretario} />
        <Dado rotulo="Decreto de nomeação" valor={ficha.decretoDeNomeacao} className="lg:col-span-2" />
      </dl>

      {confirmando && (
        <div className="mt-3 flex flex-wrap items-center justify-end gap-2 rounded-md bg-tint-danger-bg px-3 py-2">
          <span className="mr-auto text-sm text-text-2">
            Desativar esta secretaria? Ela deixa de aparecer em novos processos.
          </span>
          <Button variant="secondary" size="sm" onClick={() => setConfirmando(false)}>
            Manter
          </Button>
          <Button variant="danger-soft" size="sm" disabled={pendente} onClick={onRemover}>
            {pendente ? "Desativando..." : "Desativar"}
          </Button>
        </div>
      )}
    </article>
  )
}

type Modo = { tipo: "lista" } | { tipo: "nova" } | { tipo: "editando"; id: string }

/**
 * Secretarias do órgão.
 *
 * <p>É o cadastro que alimenta a Secretaria Requisitante do processo — sem ele o
 * wizard de novo processo não tem o que oferecer, e é para cá que ele aponta.
 * Cada secretaria nasce já com a ficha que o DFD usa, e se edita no mesmo
 * formulário, no lugar do próprio cartão.
 */
export default function Secretarias() {
  const showToast = useToast()
  const { data: sessao } = useSessao()
  const entidadeId = sessao?.entidade?.id
  const tenant = useConfigTenant(entidadeId)
  const criarSecretaria = useCriarSecretaria(entidadeId)
  const atualizarSecretaria = useAtualizarSecretaria(entidadeId)
  const removerSecretaria = useRemoverSecretaria(entidadeId)
  const [modo, setModo] = useState<Modo>({ tipo: "lista" })

  if (tenant.isPending) {
    return (
      <div className="w-full p-4 sm:p-5 lg:p-7">
        <LoadingState label="Carregando as secretarias..." />
      </div>
    )
  }
  if (tenant.isError) {
    return (
      <div className="w-full p-4 sm:p-5 lg:p-7">
        <div className="rounded-card border border-border bg-surface">
          <ErrorState onRetry={() => void tenant.refetch()} />
        </div>
      </div>
    )
  }

  const secretarias = tenant.data.secretarias
  const incompletas = secretarias.filter((s) => pendenciasDaFicha(s.ficha).length > 0).length
  const voltar = () => setModo({ tipo: "lista" })
  const mensagem = (error: unknown, padrao: string) => (error instanceof Error ? error.message : padrao)

  const cadastrar = (nome: string, ficha: FichaEmEdicao) => {
    criarSecretaria.mutate(
      { nome: nome.trim(), ficha: fichaParaSalvar(ficha) },
      {
        onSuccess: () => {
          voltar()
          showToast("Secretaria cadastrada.")
        },
        onError: (error) => showToast(mensagem(error, "Não foi possível cadastrar a secretaria.")),
      },
    )
  }

  const atualizar = (secretaria: Secretaria, nome: string, ficha: FichaEmEdicao) => {
    if (nadaMudou(secretaria, nome, ficha)) {
      voltar()
      return
    }
    atualizarSecretaria.mutate(
      { id: secretaria.id, nome: nome.trim(), ficha: fichaParaSalvar(ficha) },
      {
        onSuccess: () => {
          voltar()
          showToast("Secretaria atualizada.")
        },
        onError: (error) => showToast(mensagem(error, "Não foi possível salvar a secretaria.")),
      },
    )
  }

  const remover = (id: string) => {
    removerSecretaria.mutate(id, {
      onSuccess: () => showToast("Secretaria desativada."),
      onError: (error) => showToast(mensagem(error, "Não foi possível desativar a secretaria.")),
    })
  }

  const novaSecretaria = (
    <Button icon={<IconPlus size={14} strokeWidth={2.5} />} onClick={() => setModo({ tipo: "nova" })}>
      Nova Secretaria
    </Button>
  )

  return (
    <div className="w-full p-4 sm:p-5 lg:p-7">
      <SectionBlock
        title="Secretarias do Órgão"
        hint="A ficha de cada uma preenche o DFD."
      >
        {modo.tipo !== "nova" && secretarias.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm text-text-3">
              {secretarias.length === 1 ? "1 secretaria" : `${secretarias.length} secretarias`}
              {incompletas > 0 &&
                ` · ${incompletas === 1 ? "1 com ficha incompleta" : `${incompletas} com ficha incompleta`}`}
            </p>
            {novaSecretaria}
          </div>
        )}

        {modo.tipo === "nova" && (
          <div className="mb-4">
            <FormularioDaSecretaria
              outras={secretarias}
              pendente={criarSecretaria.isPending}
              onSalvar={cadastrar}
              onCancelar={voltar}
            />
          </div>
        )}

        {secretarias.length === 0 ? (
          modo.tipo !== "nova" && (
            <EmptyState message="Nenhuma secretaria cadastrada neste órgão" icon={<IconBuilding size={40} strokeWidth={1.5} />}>
              {novaSecretaria}
            </EmptyState>
          )
        ) : (
          <div className="flex flex-col gap-3">
            {secretarias.map((s) =>
              modo.tipo === "editando" && modo.id === s.id ? (
                <div key={s.id}>
                  <FormularioDaSecretaria
                    secretaria={s}
                    outras={secretarias.filter((outra) => outra.id !== s.id)}
                    pendente={atualizarSecretaria.isPending}
                    onSalvar={(nome, ficha) => atualizar(s, nome, ficha)}
                    onCancelar={voltar}
                  />
                </div>
              ) : (
                <CartaoDaSecretaria
                  key={s.id}
                  secretaria={s}
                  pendente={removerSecretaria.isPending}
                  onEditar={() => setModo({ tipo: "editando", id: s.id })}
                  onRemover={() => remover(s.id)}
                />
              ),
            )}
          </div>
        )}
      </SectionBlock>
    </div>
  )
}
