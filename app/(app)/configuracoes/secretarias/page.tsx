"use client"

import { useState, type ReactNode } from "react"

import { Button, Input, SectionBlock } from "@/components/ui"
import { IconCheck, IconFile, IconPencil, IconPlus, IconTrash, IconX } from "@/components/ui/icons"
import { EmptyState, ErrorState, LoadingState } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import {
  useConfigTenant,
  useCriarSecretaria,
  useRemoverSecretaria,
  useRenomearSecretaria,
  useSessao,
} from "@/lib/api/hooks"
import type { Secretaria } from "@/lib/types"

/** Botão de ícone das ações da linha — editar, salvar, cancelar, remover. */
function AcaoDaLinha({
  rotulo,
  tom = "neutro",
  disabled,
  onClick,
  children,
}: {
  rotulo: string
  tom?: "neutro" | "perigo" | "confirma"
  disabled?: boolean
  onClick: () => void
  children: ReactNode
}) {
  const cor =
    tom === "perigo"
      ? "text-danger hover:bg-tint-danger-bg"
      : tom === "confirma"
        ? "text-success hover:bg-tint-success-bg"
        : "text-text-3 hover:bg-border-soft"
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-border bg-ice transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${cor}`}
    >
      {children}
    </button>
  )
}

/**
 * Uma secretaria da lista: em leitura, ou em edição do nome.
 *
 * <p>A edição acontece **na própria linha**, e não num diálogo: o que muda é uma
 * palavra do nome, e tirar a pessoa da lista para isso a faria perder de vista o
 * que já existe — que é justamente o que evita cadastrar duas parecidas.
 */
function LinhaDaSecretaria({
  secretaria,
  editando,
  salvando,
  removendo,
  onEditar,
  onCancelar,
  onSalvar,
  onRemover,
}: {
  secretaria: Secretaria
  editando: boolean
  salvando: boolean
  removendo: boolean
  onEditar: () => void
  onCancelar: () => void
  onSalvar: (nome: string) => void
  onRemover: () => void
}) {
  const [nome, setNome] = useState(secretaria.nome)

  if (editando) {
    return (
      <div className="flex min-h-13 items-center gap-2 rounded-md border border-royal bg-surface px-2 py-1">
        <Input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          ariaLabel={`Novo nome de ${secretaria.nome}`}
          autoFocus
          disabled={salvando}
          onKeyDown={(e) => {
            // Enter confirma e Esc desiste — o mesmo par do cadastro logo acima.
            if (e.key === "Enter") onSalvar(nome)
            if (e.key === "Escape") onCancelar()
          }}
        />
        <AcaoDaLinha
          rotulo={`Salvar o nome de ${secretaria.nome}`}
          tom="confirma"
          disabled={salvando || nome.trim() === ""}
          onClick={() => onSalvar(nome)}
        >
          <IconCheck size={14} strokeWidth={2.5} />
        </AcaoDaLinha>
        <AcaoDaLinha rotulo="Cancelar a edição" disabled={salvando} onClick={onCancelar}>
          <IconX size={14} />
        </AcaoDaLinha>
      </div>
    )
  }

  return (
    <div className="flex min-h-13 items-center gap-3 rounded-md border border-border-soft px-3 py-2.5">
      <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-tint-royal-bg text-royal">
        <IconFile size={14} />
      </span>
      <span className="flex-1 truncate text-base font-medium text-text-1">{secretaria.nome}</span>
      <AcaoDaLinha rotulo={`Renomear ${secretaria.nome}`} onClick={onEditar}>
        <IconPencil size={13} />
      </AcaoDaLinha>
      <AcaoDaLinha
        rotulo={`Remover ${secretaria.nome}`}
        tom="perigo"
        disabled={removendo}
        onClick={onRemover}
      >
        <IconTrash size={13} />
      </AcaoDaLinha>
    </div>
  )
}

/**
 * Secretarias do órgão.
 *
 * <p>É o cadastro que alimenta a Secretaria Requisitante do processo — sem ele o
 * wizard de novo processo não tem o que oferecer, e é para cá que ele aponta.
 */
export default function Secretarias() {
  const showToast = useToast()
  const { data: sessao } = useSessao()
  const entidadeId = sessao?.entidade?.id
  const tenant = useConfigTenant(entidadeId)
  const criarSecretaria = useCriarSecretaria(entidadeId)
  const renomearSecretaria = useRenomearSecretaria(entidadeId)
  const removerSecretaria = useRemoverSecretaria(entidadeId)

  const [novaSecretaria, setNovaSecretaria] = useState("")
  const [emEdicao, setEmEdicao] = useState<string | null>(null)

  if (tenant.isPending) {
    return (
      <div className="max-w-content p-4 sm:p-5 lg:p-7">
        <LoadingState label="Carregando as secretarias..." />
      </div>
    )
  }
  if (tenant.isError) {
    return (
      <div className="max-w-content p-4 sm:p-5 lg:p-7">
        <div className="rounded-card border border-border bg-surface">
          <ErrorState onRetry={() => void tenant.refetch()} />
        </div>
      </div>
    )
  }

  const adicionar = () => {
    const nome = novaSecretaria.trim()
    if (nome === "") {
      showToast("Informe o nome da secretaria para adicionar.")
      return
    }
    criarSecretaria.mutate(nome, {
      onSuccess: () => {
        setNovaSecretaria("")
        showToast("Secretaria adicionada.")
      },
      onError: (error) =>
        showToast(
          error instanceof Error ? error.message : "Não foi possível adicionar a secretaria.",
        ),
    })
  }

  const salvarNome = (secretaria: Secretaria, nome: string) => {
    const novo = nome.trim()
    if (novo === "") {
      showToast("O nome da secretaria não pode ficar em branco.")
      return
    }
    // Nome igual não vira requisição: gravar o que não mudou subiria a versão do
    // registro e apareceria na trilha do órgão como uma edição que não houve.
    if (novo === secretaria.nome) {
      setEmEdicao(null)
      return
    }
    renomearSecretaria.mutate(
      { id: secretaria.id, nome: novo },
      {
        onSuccess: () => {
          setEmEdicao(null)
          showToast("Nome atualizado.")
        },
        onError: (error) =>
          showToast(
            error instanceof Error ? error.message : "Não foi possível renomear a secretaria.",
          ),
      },
    )
  }

  const remover = (id: string) => {
    removerSecretaria.mutate(id, {
      onSuccess: () => showToast("Secretaria desativada."),
      onError: (error) =>
        showToast(
          error instanceof Error ? error.message : "Não foi possível desativar a secretaria.",
        ),
    })
  }

  return (
    <div className="max-w-content p-4 sm:p-5 lg:p-7">
      <SectionBlock
        title="Secretarias do Órgão"
        hint="As secretarias cadastradas aqui aparecem como opções de Secretaria Requisitante na criação de novos processos."
      >
        <div className="mb-4 flex flex-wrap gap-2.5">
          <div className="flex-[1_1_220px]">
            <Input
              value={novaSecretaria}
              onChange={(e) => setNovaSecretaria(e.target.value)}
              ariaLabel="Nome da nova secretaria"
              placeholder="Ex: Secretaria de Cultura e Turismo"
              disabled={criarSecretaria.isPending}
              onKeyDown={(e) => {
                // Enter cadastra sem tirar a mão do teclado. Quem prefere o
                // botão chega nele com Tab, e o Enter de lá é o do próprio
                // botão — cadastra do mesmo jeito.
                if (e.key === "Enter") adicionar()
              }}
            />
          </div>
          <Button
            icon={<IconPlus size={14} strokeWidth={2.5} />}
            onClick={adicionar}
            disabled={criarSecretaria.isPending || novaSecretaria.trim() === ""}
            className="h-9.5"
          >
            {criarSecretaria.isPending ? "Adicionando..." : "Adicionar Nova Secretaria"}
          </Button>
        </div>
        {tenant.data.secretarias.length === 0 ? (
          <EmptyState message="Nenhuma secretaria cadastrada neste órgão" />
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {tenant.data.secretarias.map((s) => (
              <LinhaDaSecretaria
                // A chave leva o nome: trocá-lo remonta a linha, e o campo de
                // edição da próxima vez nasce com o valor novo, não com o antigo.
                key={`${s.id}:${s.nome}`}
                secretaria={s}
                editando={emEdicao === s.id}
                salvando={renomearSecretaria.isPending}
                removendo={removerSecretaria.isPending}
                onEditar={() => setEmEdicao(s.id)}
                onCancelar={() => setEmEdicao(null)}
                onSalvar={(nome) => salvarNome(s, nome)}
                onRemover={() => remover(s.id)}
              />
            ))}
          </div>
        )}
      </SectionBlock>
    </div>
  )
}
