"use client"

import { useState } from "react"

import { Button, ChoiceCard, FormField, Input, Textarea } from "@/components/ui"
import { IconPlus, IconTrash } from "@/components/ui/icons"
import { ErrorState, LoadingState } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import {
  useAlternativasDeMercado,
  useRegistrarAlternativaDeMercado,
  useRemoverAlternativaDeMercado,
} from "@/lib/api/hooks"

const VAZIA = {
  nome: "",
  descricao: "",
  vantagens: "",
  limitacoes: "",
  fonte: "",
  selecionada: false,
}

/** Pesquisa factual da seção 5; a IA só recebe o que foi registrado aqui. */
export function PainelAlternativasMercado({ processoId }: { processoId: string }) {
  const showToast = useToast()
  const query = useAlternativasDeMercado(processoId)
  const registrar = useRegistrarAlternativaDeMercado(processoId)
  const remover = useRemoverAlternativaDeMercado(processoId)
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState(VAZIA)

  if (query.isLoading) return <LoadingState label="Carregando alternativas de mercado..." />
  if (query.isError) return <ErrorState message="Não foi possível carregar o levantamento de mercado." />

  const alternativas = query.data ?? []
  return (
    <section className="mt-4 rounded-card border border-border bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="m-0 font-display text-md font-bold text-text-1">Alternativas Pesquisadas</h3>
          <p className="mb-0 mt-1 text-base text-text-muted">
            Registre somente soluções e fontes efetivamente pesquisadas. Esses dados fundamentam o rascunho da IA.
          </p>
        </div>
        <Button size="sm" variant="secondary" icon={<IconPlus size={14} />} onClick={() => setAberto(!aberto)}>
          {aberto ? "Fechar" : "Adicionar Alternativa"}
        </Button>
      </div>

      {alternativas.length === 0 ? (
        <p className="mt-4 rounded-lg bg-ice p-3 text-sm text-text-muted">
          Nenhuma alternativa cadastrada. A IA indicará essa lacuna em vez de inventar pesquisa de mercado.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {alternativas.map((item) => (
            <div key={item.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-text-1">
                  {item.nome}{item.selecionada ? " · Solução Escolhida" : ""}
                </div>
                <p className="mb-0 mt-1 whitespace-pre-wrap text-sm text-text-2">{item.descricao}</p>
                {item.fonte && <p className="mb-0 mt-1 text-xs text-text-muted">Fonte: {item.fonte}</p>}
              </div>
              <Button
                size="sm"
                variant="ghost"
                icon={<IconTrash size={14} />}
                disabled={remover.isPending}
                onClick={() => remover.mutate(item.id, { onSuccess: () => showToast("Alternativa removida.") })}
              >
                Remover
              </Button>
            </div>
          ))}
        </div>
      )}

      {aberto && (
        <div className="mt-4 grid gap-3 border-t border-border pt-4">
          <FormField label="Nome da alternativa" required>
            <Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex.: compra, locação ou contratação compartilhada" />
          </FormField>
          <FormField label="Descrição da solução" required>
            <Textarea value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} rows={3} />
          </FormField>
          <div className="grid gap-3 md:grid-cols-2">
            <FormField label="Vantagens observadas">
              <Textarea value={form.vantagens} onChange={(e) => setForm({ ...form, vantagens: e.target.value })} rows={2} />
            </FormField>
            <FormField label="Limitações observadas">
              <Textarea value={form.limitacoes} onChange={(e) => setForm({ ...form, limitacoes: e.target.value })} rows={2} />
            </FormField>
          </div>
          <FormField label="Fonte ou referência consultada">
            <Input value={form.fonte} onChange={(e) => setForm({ ...form, fonte: e.target.value })} placeholder="Ex.: contrato similar, consulta a fornecedor ou catálogo público" />
          </FormField>
          <ChoiceCard
            size="small"
            selected={form.selecionada}
            onClick={() => setForm({ ...form, selecionada: !form.selecionada })}
            title="Solução escolhida pela Administração"
            desc="Marque somente após comparar as alternativas. Apenas uma pode ficar selecionada."
          />
          <div>
            <Button
              disabled={registrar.isPending || !form.nome.trim() || !form.descricao.trim()}
              ariaDescribedBy="requisitos-alternativa-mercado"
              onClick={() => registrar.mutate(form, {
                onSuccess: () => {
                  setForm(VAZIA)
                  setAberto(false)
                  showToast("Alternativa registrada no processo.")
                },
                onError: (error) => showToast(error instanceof Error ? error.message : "Não foi possível registrar a alternativa."),
              })}
            >
              {registrar.isPending ? "Registrando..." : "Registrar Alternativa"}
            </Button>
            <p id="requisitos-alternativa-mercado" className="mb-0 mt-1 text-xs text-text-muted">
              Informe o nome e a descrição da solução para registrar.
            </p>
          </div>
        </div>
      )}
    </section>
  )
}
