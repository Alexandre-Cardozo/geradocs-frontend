"use client"

import { useState } from "react"

import { Button, FormField, Input, MoneyInput, Tag } from "@/components/ui"
import { IconPlus, IconTrash } from "@/components/ui/icons"
import { useToast } from "@/components/shared/providers"
import {
  useAtualizarDotacao,
  useDeclararDotacao,
  useDotacoesDoProcesso,
  useRemoverDotacao,
} from "@/lib/api/hooks"
import type { DadosDaDotacao, DotacaoOrcamentaria } from "@/lib/api/procurement-client"
import { formatBRL, parseValorBR } from "@/lib/format"

/**
 * O cadastro de dotação orçamentária do processo.
 *
 * <p>Declarado uma vez aqui, o crédito serve <b>três seções em três
 * documentos</b>: a Adequação Orçamentária do TR (Art. 6º, XXIII, 'j'), a
 * Dotação Orçamentária do Edital (Art. 150) e a cláusula do contrato
 * (Art. 92, VIII). Escrito à mão nas três, ele diverge em duas.
 *
 * <p>Várias por processo, como os DFDs: a despesa de uma contratação
 * compartilhada corre por mais de um programa de trabalho, e a de um contrato
 * plurianual por mais de um exercício.
 */
export function DotacoesDoProcesso({
  processoId,
  valorEstimado,
}: {
  processoId: string
  /** O valor do processo, para a cobertura ser visível — é o que "adequação" significa. */
  valorEstimado: number
}) {
  const dotacoes = useDotacoesDoProcesso(processoId)
  const [declarando, setDeclarando] = useState(false)
  const [editando, setEditando] = useState<string | null>(null)

  if (dotacoes.isPending) {
    return <div className="text-sm text-text-muted">Carregando a dotação orçamentária...</div>
  }
  if (dotacoes.isError) {
    return (
      <div className="text-sm text-danger">Não foi possível listar a dotação orçamentária.</div>
    )
  }

  const total = dotacoes.data.reduce((soma, d) => soma + parseValorBR(d.valor), 0)

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 font-display text-base font-bold text-text-1">
            Dotação orçamentária ({dotacoes.data.length})
          </h3>
          <p className="m-0 mt-1 text-sm text-text-3">
            O crédito que suporta a despesa. Vale para o Termo de Referência, o Edital e o Contrato
            — declare aqui uma vez.
          </p>
        </div>
        {!declarando && (
          <Button
            size="sm"
            variant="secondary"
            icon={<IconPlus size={13} strokeWidth={2.5} />}
            onClick={() => setDeclarando(true)}
          >
            Declarar Dotação
          </Button>
        )}
      </div>

      {declarando && (
        <FormularioDaDotacao
          processoId={processoId}
          onPronto={() => setDeclarando(false)}
          onCancelar={() => setDeclarando(false)}
        />
      )}

      {dotacoes.data.length === 0 ? (
        !declarando && (
          <p className="m-0 rounded-lg border border-dashed border-border bg-surface px-3.5 py-3 text-sm text-text-muted">
            Nenhuma dotação declarada. O Art. 150 da Lei 14.133/21 não admite contratação sem a
            indicação dos créditos orçamentários.
          </p>
        )
      ) : (
        <>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {dotacoes.data.map((dotacao) =>
              editando === dotacao.id ? (
                <li key={dotacao.id} className="list-none">
                  <FormularioDaDotacao
                    processoId={processoId}
                    dotacao={dotacao}
                    onPronto={() => setEditando(null)}
                    onCancelar={() => setEditando(null)}
                  />
                </li>
              ) : (
                <LinhaDaDotacao
                  key={dotacao.id}
                  processoId={processoId}
                  dotacao={dotacao}
                  onEditar={() => setEditando(dotacao.id)}
                />
              ),
            )}
          </ul>
          <Cobertura total={total} valorEstimado={valorEstimado} />
        </>
      )}
    </div>
  )
}

/**
 * O que os créditos cobrem do valor estimado.
 *
 * <p>É isto que faz a palavra "adequação" significar alguma coisa: declarar o
 * crédito e não confrontá-lo com a despesa deixa a seção afirmar adequação que
 * ninguém verificou.
 */
function Cobertura({ total, valorEstimado }: { total: number; valorEstimado: number }) {
  const falta = valorEstimado - total
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-ice px-3.5 py-3">
      <span className="text-sm text-text-3">
        Total declarado{" "}
        <strong className="font-mono text-base text-petroleum">{formatBRL(total)}</strong> · valor
        estimado do processo{" "}
        <strong className="font-mono text-base text-petroleum">{formatBRL(valorEstimado)}</strong>
      </span>
      {falta > 0 ? (
        <Tag tone="warning">Faltam {formatBRL(falta)} para cobrir a despesa</Tag>
      ) : (
        <Tag tone="success">A despesa está coberta</Tag>
      )}
    </div>
  )
}

const VAZIA: DadosDaDotacao = {
  unidadeOrcamentaria: "",
  programaDeTrabalho: "",
  naturezaDaDespesa: "",
  fonteDeRecurso: "",
  ficha: "",
  exercicio: new Date().getFullYear(),
  valor: "",
}

/**
 * Declarar e corrigir usam o mesmo formulário.
 *
 * <p>É o mesmo crédito: dois formulários divergiriam na primeira mudança, e a
 * correção passaria a pedir campo que a declaração não pede.
 */
function FormularioDaDotacao({
  processoId,
  dotacao,
  onPronto,
  onCancelar,
}: {
  processoId: string
  /** Ausente quando é uma declaração nova. */
  dotacao?: DotacaoOrcamentaria
  onPronto: () => void
  onCancelar: () => void
}) {
  const declarar = useDeclararDotacao(processoId)
  const atualizar = useAtualizarDotacao(processoId)
  const showToast = useToast()

  const [dados, setDados] = useState<DadosDaDotacao>(() =>
    dotacao
      ? {
          unidadeOrcamentaria: dotacao.unidadeOrcamentaria,
          programaDeTrabalho: dotacao.programaDeTrabalho,
          naturezaDaDespesa: dotacao.naturezaDaDespesa,
          fonteDeRecurso: dotacao.fonteDeRecurso,
          ficha: dotacao.ficha ?? "",
          exercicio: dotacao.exercicio,
          valor: dotacao.valor,
        }
      : VAZIA,
  )
  const trocar = (campo: keyof DadosDaDotacao, valor: string | number) =>
    setDados((atual) => ({ ...atual, [campo]: valor }))

  const impedimento =
    dados.unidadeOrcamentaria.trim() === ""
      ? "Informe a unidade orçamentária responsável pelo crédito."
      : dados.programaDeTrabalho.trim() === ""
        ? "Informe o programa de trabalho — é a classificação funcional programática do Art. 92, VIII."
        : dados.naturezaDaDespesa.trim() === ""
          ? "Informe a natureza da despesa — é dela que sai a categoria econômica do Art. 92, VIII."
          : dados.fonteDeRecurso.trim() === ""
            ? "Informe a fonte ou destinação de recurso."
            : parseValorBR(dados.valor) <= 0
              ? "Informe o valor previsto nesta dotação."
              : null

  const pendente = declarar.isPending || atualizar.isPending
  const motivo = `motivo-dotacao-${dotacao?.id ?? "nova"}`

  const gravar = () => {
    const aoFalhar = (erro: unknown) =>
      showToast(erro instanceof Error ? erro.message : "Não foi possível gravar a dotação.")
    if (dotacao) {
      atualizar.mutate(
        { dotacaoId: dotacao.id, dados },
        {
          onSuccess: () => {
            showToast("Dotação corrigida.")
            onPronto()
          },
          onError: aoFalhar,
        },
      )
      return
    }
    declarar.mutate(dados, {
      onSuccess: () => {
        showToast("Dotação declarada no processo.")
        onPronto()
      },
      onError: aoFalhar,
    })
  }

  return (
    <div className="mb-3 rounded-lg border border-royal bg-surface p-4">
      {/*
        Grade de colunas fixas, como o cadastro de DFDs: a dica de um campo não
        empurra os outros, e o formulário não muda de forma enquanto é
        preenchido.
      */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0">
          <FormField label="Unidade Orçamentária" required hint="Órgão ou unidade do crédito.">
            <Input
              value={dados.unidadeOrcamentaria}
              onChange={(e) => trocar("unidadeOrcamentaria", e.target.value)}
              ariaLabel="Unidade Orçamentária"
              placeholder="Ex: 02.01 — Secretaria Municipal de Educação"
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField
            label="Programa de Trabalho"
            required
            hint="A classificação funcional programática."
          >
            <Input
              value={dados.programaDeTrabalho}
              onChange={(e) => trocar("programaDeTrabalho", e.target.value)}
              ariaLabel="Programa de Trabalho"
              placeholder="Ex: 12.361.0004.2.045"
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField label="Natureza da Despesa" required hint="De onde sai a categoria econômica.">
            <Input
              value={dados.naturezaDaDespesa}
              onChange={(e) => trocar("naturezaDaDespesa", e.target.value)}
              ariaLabel="Natureza da Despesa"
              placeholder="Ex: 3.3.90.30.00 — Material de Consumo"
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField label="Fonte de Recurso" required hint="Fonte ou destinação do recurso.">
            <Input
              value={dados.fonteDeRecurso}
              onChange={(e) => trocar("fonteDeRecurso", e.target.value)}
              ariaLabel="Fonte de Recurso"
              placeholder="Ex: 1.500.1001 — Recursos Ordinários"
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField label="Ficha" hint="Opcional — nem todo ente a utiliza.">
            <Input
              value={dados.ficha ?? ""}
              onChange={(e) => trocar("ficha", e.target.value)}
              ariaLabel="Ficha"
              placeholder="Ex: 1245"
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField label="Exercício" required hint="O ano do crédito.">
            <Input
              value={String(dados.exercicio)}
              onChange={(e) => trocar("exercicio", Number(e.target.value.replace(/\D/g, "")) || 0)}
              ariaLabel="Exercício"
              placeholder="Ex: 2026"
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField label="Valor Previsto" required hint="O que este crédito suporta no exercício.">
            <MoneyInput value={dados.valor} onChange={(valor) => trocar("valor", valor)} />
          </FormField>
        </div>
      </div>

      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <Button
          size="sm"
          disabled={impedimento !== null || pendente}
          ariaDescribedBy={motivo}
          onClick={gravar}
        >
          {pendente ? "Gravando..." : dotacao ? "Salvar Correção" : "Declarar Dotação"}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <p id={motivo} className={impedimento ? "m-0 text-xs text-text-muted" : "sr-only"}>
          {impedimento ?? "Tudo certo para gravar."}
        </p>
      </div>
    </div>
  )
}

/** Uma linha do cadastro: o crédito e as ações sobre ele. */
function LinhaDaDotacao({
  processoId,
  dotacao,
  onEditar,
}: {
  processoId: string
  dotacao: DotacaoOrcamentaria
  onEditar: () => void
}) {
  const [confirmando, setConfirmando] = useState(false)
  const remover = useRemoverDotacao(processoId)
  const showToast = useToast()

  return (
    <li className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-sm font-semibold text-petroleum">
            {dotacao.programaDeTrabalho}
          </span>
          <Tag tone="info">Exercício {dotacao.exercicio}</Tag>
          <span className="font-mono text-sm font-semibold text-petroleum">
            {formatBRL(parseValorBR(dotacao.valor))}
          </span>
        </div>
        <p className="m-0 mt-1 text-sm text-text-3">
          {dotacao.unidadeOrcamentaria} · {dotacao.naturezaDaDespesa} · {dotacao.fonteDeRecurso}
          {dotacao.ficha ? ` · ficha ${dotacao.ficha}` : ""}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {confirmando ? (
          <>
            <span className="text-xs text-text-muted">Retirar do processo?</span>
            <Button
              size="sm"
              variant="danger-soft"
              disabled={remover.isPending}
              onClick={() =>
                remover.mutate(dotacao.id, {
                  onSuccess: () => showToast("Dotação retirada do processo."),
                  onError: (erro) =>
                    showToast(
                      erro instanceof Error ? erro.message : "Não foi possível retirar a dotação.",
                    ),
                })
              }
            >
              {remover.isPending ? "Retirando..." : "Confirmar"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmando(false)}>
              Cancelar
            </Button>
          </>
        ) : (
          <>
            <Button size="sm" variant="secondary" onClick={onEditar}>
              Corrigir
            </Button>
            <Button
              size="sm"
              variant="secondary"
              icon={<IconTrash size={13} />}
              onClick={() => setConfirmando(true)}
            >
              Retirar
            </Button>
          </>
        )}
      </div>
    </li>
  )
}
