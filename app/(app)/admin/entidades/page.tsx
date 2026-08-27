"use client"

import { useState } from "react"

import { Button, Dropdown, FormField, Input, InfoBanner, Tag } from "@/components/ui"
import { IconBuilding, IconPlus, IconTrash } from "@/components/ui/icons"
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/estados"
import { Th } from "@/components/shared/tabela"
import { useToast } from "@/components/shared/providers"
import { useCriarEntidade, useEntidades, useRemoverEntidade, useUsuarios } from "@/lib/api/hooks"
import { TIPO_ENTIDADE_LABEL, type TipoEntidade } from "@/lib/types"

const TIPOS = Object.entries(TIPO_ENTIDADE_LABEL).map(([value, label]) => ({ value, label }))

/**
 * Entidades clientes da plataforma.
 *
 * <p>Entidade, e não prefeitura: quem contrata o GeraDocs também pode ser uma
 * câmara, uma autarquia ou um consórcio, e uma tela que só sabe dizer
 * "prefeitura" obriga metade dos clientes a se reconhecer no nome errado.
 *
 * <p>O cadastro pede **o nome e o tipo**, e nada mais. Secretarias, timbre e PCA
 * são configuração de quem opera a entidade, e quem os conhece é o coordenador
 * dela — pedi-los aqui seria pedir ao administrador da plataforma que
 * adivinhasse.
 *
 * <p>O tipo não é enfeite: sem ele o servidor grava toda entidade como
 * `PREFEITURA`, e a câmara cadastrada aqui viraria prefeitura no banco.
 */
export default function AdminEntidades() {
  const showToast = useToast()
  const entidades = useEntidades()
  const usuarios = useUsuarios()
  const criar = useCriarEntidade()
  const remover = useRemoverEntidade()

  const [novo, setNovo] = useState(false)
  const [nome, setNome] = useState("")
  const [tipo, setTipo] = useState<TipoEntidade>("prefeitura")

  const ordenadas = [...(entidades.data ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))

  const salvar = () => {
    if (nome.trim() === "") return
    criar.mutate(
      { nome, tipo },
      {
        onSuccess: () => {
          showToast("Entidade cadastrada.")
          setNovo(false)
          setNome("")
          setTipo("prefeitura")
        },
        onError: (e) => showToast(e instanceof Error ? e.message : "Não foi possível cadastrar."),
      },
    )
  }

  const excluir = (id: string, nomeDaEntidade: string) => {
    remover.mutate(id, {
      onSuccess: () => showToast(`${nomeDaEntidade} desativada.`),
      onError: (e) => showToast(e instanceof Error ? e.message : "Não foi possível remover."),
    })
  }

  const servidoresDe = (id: string) => (usuarios.data ?? []).filter((u) => u.entidadeId === id).length

  return (
    <div className="max-w-content p-4 sm:p-5 lg:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-2xl font-extrabold tracking-tight text-text-1">Entidades</h1>
          <p className="m-0 mt-1 text-md text-text-3">
            Cadastre as entidades clientes do GeraDocs — prefeituras, câmaras, autarquias e
            consórcios.
          </p>
        </div>
        <Button icon={<IconPlus size={14} strokeWidth={2.5} />} onClick={() => setNovo((v) => !v)}>
          Nova Entidade
        </Button>
      </div>

      {novo && (
        <div className="mb-5 rounded-card border border-border bg-surface p-5">
          <h2 className="m-0 mb-4 font-display text-md font-bold text-text-1">Cadastrar Entidade</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_220px]">
            <FormField
              label="Nome da Entidade"
              required
              hint="É o que a plataforma precisa para criar a entidade. O restante — secretarias, timbre e PCA — o coordenador configura depois."
            >
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Prefeitura de Vila Velha"
                onKeyDown={(e) => {
                  // Formulário curto: Enter cadastra, como em qualquer outro.
                  // Obrigar o mouse aqui seria atrito sem motivo.
                  if (e.key === "Enter" && nome.trim() !== "" && !criar.isPending) salvar()
                }}
              />
            </FormField>
            {/* Perguntado, e não assumido: sem este campo o servidor grava toda
                entidade como prefeitura. */}
            <FormField label="Tipo" required hint="O que a entidade é.">
              <Dropdown
                value={tipo}
                onChange={(v) => setTipo(v as TipoEntidade)}
                ariaLabel="Tipo da entidade"
                options={TIPOS}
              />
            </FormField>
          </div>
          <div className="mt-4 flex gap-2.5">
            <Button variant="secondary" onClick={() => setNovo(false)}>Cancelar</Button>
            <p id="motivo-criar-entidade" className="sr-only">
              O nome da entidade é obrigatório.
            </p>
            <Button
              disabled={criar.isPending || nome.trim() === ""}
              ariaDescribedBy="motivo-criar-entidade"
              onClick={salvar}
            >
              {criar.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </div>
      )}

      <InfoBanner tone="info" className="mb-4">
        Os servidores de cada entidade são cadastrados em <strong>Servidores</strong>. A
        configuração da entidade (timbre, secretarias e PCA) é feita pelo respectivo coordenador em
        Configurações.
      </InfoBanner>

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {entidades.isPending && <SkeletonRows rows={4} />}
        {entidades.isError && <ErrorState onRetry={() => void entidades.refetch()} />}
        {entidades.isSuccess && entidades.data.length === 0 && <EmptyState message="Nenhuma entidade cadastrada" />}
        {entidades.isSuccess && entidades.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-ice">
                  {["Entidade", "Tipo", "Servidores", ""].map((h, i) => (
                    <Th key={h === "" ? `x-${i}` : h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((entidade, i) => {
                  const servidores = servidoresDe(entidade.id)
                  /*
                    Entidade com servidor vinculado não é desativada. Ao ser, os
                    servidores dela ficavam apontando para uma entidade fora da
                    listagem — o vínculo aparecia como um identificador cru que
                    não abria nada — e os processos daquele órgão ficavam órfãos.
                    O servidor recusa desde 26/08/2026; aqui o botão nem chega a
                    ser clicável, e diz por quê.
                  */
                  const motivo =
                    servidores > 0
                      ? `${entidade.nome} tem ${servidores} servidor(es) vinculado(s). Desative-os antes.`
                      : `Desativar ${entidade.nome}`

                  return (
                    <tr key={entidade.id} className={i < ordenadas.length - 1 ? "border-b border-ice" : ""}>
                      <td className="px-4 py-3.25">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-tint-royal-bg text-royal">
                            <IconBuilding size={15} />
                          </span>
                          {/* Só o nome: o identificador é assunto do servidor, e
                              ninguém o digita em lugar nenhum do produto. */}
                          <span className="text-base font-semibold text-text-1">{entidade.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.25">
                        <Tag tone="neutral">{TIPO_ENTIDADE_LABEL[entidade.tipo]}</Tag>
                      </td>
                      <td className="px-4 py-3.25 text-sm text-text-3">{servidores}</td>
                      <td className="px-4 py-3.25">
                        <button
                          type="button"
                          aria-label={motivo}
                          title={motivo}
                          disabled={remover.isPending || servidores > 0}
                          onClick={() => excluir(entidade.id, entidade.nome)}
                          className="flex size-7 cursor-pointer items-center justify-center rounded-sm border border-border bg-ice text-danger transition-colors hover:bg-tint-danger-bg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-ice"
                        >
                          <IconTrash size={13} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
