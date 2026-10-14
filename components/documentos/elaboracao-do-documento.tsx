"use client"

import { useState, type ReactNode } from "react"

import { Button, ChoiceCard, Dropdown, FormField, Input, ValidationMsg } from "@/components/ui"
import { IconBuilding, IconClock, IconPencil, IconSearch, IconUser } from "@/components/ui/icons"
import { useNormas, useServidoresDoOrgao, useSessao, useVersoesComTexto } from "@/lib/api/hooks"
import type { ServidorDoOrgao } from "@/lib/api/access-client"
import { formatCPF } from "@/lib/auth/cpf"
import {
  cpfMascarado,
  errosDaElaboracao,
  filtrarServidores,
  rotuloDoAto,
  type EscolhaDaElaboracao,
} from "@/lib/documentos/elaboracao"
import { citacaoDaNorma } from "@/lib/normas/norma"
import type { TipoDocumento } from "@/lib/types"

/** Que espécie de norma vem primeiro na lista: a portaria no ETP, o decreto no Edital. */
const ESPECIE_PREFERIDA: Partial<Record<TipoDocumento, string>> = { ETP: "ORDINANCE", Edital: "DECREE" }

/** Nome e CPF como vão sair no documento — só leitura, porque vêm de um cadastro. */
function DadosDoCadastro({ nome, cpf, acao }: { nome: string; cpf: string; acao?: ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-end">
      <FormField label="Nome">
        <Input value={nome} disabled ariaLabel="Nome de quem elaborou" />
      </FormField>
      <FormField label="CPF">
        <Input value={cpf} disabled ariaLabel="CPF de quem elaborou, mascarado" className="font-mono" />
      </FormField>
      {acao && <div className="sm:pb-0.5">{acao}</div>}
    </div>
  )
}

/** Um colega do órgão, escolhido numa lista com busca (ADR-045 do back-end). */
function EscolhaDoServidor({
  servidorId,
  onEscolher,
  erro,
}: {
  servidorId: string
  onEscolher: (id: string) => void
  erro?: string
}) {
  const servidores = useServidoresDoOrgao(true)
  const [busca, setBusca] = useState("")
  const escolhido = servidores.data?.find((s) => s.id === servidorId)

  if (escolhido) {
    return (
      <DadosDoCadastro
        nome={escolhido.nome}
        cpf={escolhido.cpf}
        acao={
          <Button size="sm" variant="ghost" onClick={() => onEscolher("")}>
            Trocar Servidor
          </Button>
        }
      />
    )
  }

  const lista: ServidorDoOrgao[] = filtrarServidores(servidores.data ?? [], busca)
  return (
    <FormField label="Servidor que elaborou" required>
      <Input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Busque pelo nome, cargo ou matrícula"
        ariaLabel="Buscar servidor do órgão"
      />
      <div
        role="listbox"
        aria-label="Servidores do órgão"
        className="mt-2 max-h-60 overflow-y-auto rounded-md border border-border bg-surface"
      >
        {servidores.isPending ? (
          <p className="m-0 px-3.5 py-3 text-sm text-text-muted" role="status">
            Carregando os servidores...
          </p>
        ) : servidores.isError ? (
          <div className="flex items-center justify-between gap-3 px-3.5 py-3">
            <p className="m-0 text-sm text-danger">Não foi possível carregar os servidores.</p>
            <Button size="sm" variant="secondary" onClick={() => void servidores.refetch()}>
              Tentar Novamente
            </Button>
          </div>
        ) : lista.length === 0 ? (
          <p className="m-0 flex items-center gap-2 px-3.5 py-3 text-sm text-text-muted">
            <IconSearch size={14} />
            {busca.trim()
              ? "Nenhum servidor encontrado com essa busca."
              : "Nenhum outro servidor ativo com CPF no cadastro. Use Pessoa Externa para digitar os dados."}
          </p>
        ) : (
          lista.map((s) => (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => onEscolher(s.id)}
              className="flex w-full cursor-pointer items-center justify-between gap-3 border-0 border-b border-border-soft bg-transparent px-3.5 py-2.5 text-left last:border-b-0 hover:bg-ice"
            >
              <span className="min-w-0">
                <span className="block truncate text-base font-medium text-text-1">{s.nome}</span>
                {(s.cargo || s.matricula) && (
                  <span className="block truncate text-xs text-text-muted">
                    {[s.cargo, s.matricula && `Matrícula ${s.matricula}`].filter(Boolean).join(" · ")}
                  </span>
                )}
              </span>
              <span className="shrink-0 font-mono text-xs text-text-muted">CPF {s.cpf}</span>
            </button>
          ))
        )}
      </div>
      {erro && <ValidationMsg type="error" msg={erro} />}
    </FormField>
  )
}

/**
 * Quem elaborou o documento e, no ETP e no Edital, o ato que o embasa
 * (ADR-044 e ADR-045 do back-end).
 *
 * <p>Sai num bloco ao final do arquivo, com o CPF mascarado — documento de
 * licitação é público. Por padrão é quem conclui; pode ser um colega do órgão,
 * escolhido na lista, ou alguém de fora, com nome e CPF digitados. Nos três
 * casos a tela mostra o nome e o CPF como vão sair.
 */
export function ElaboracaoDoDocumento({
  processoId,
  tipo,
  escolha,
  onChange,
  mostrarErros,
}: {
  processoId: string
  tipo: TipoDocumento
  escolha: EscolhaDaElaboracao
  onChange: (escolha: EscolhaDaElaboracao) => void
  mostrarErros: boolean
}) {
  const { data: sessao } = useSessao()
  const rotulo = rotuloDoAto(tipo)
  const { normas } = useNormas()
  const versoes = useVersoesComTexto(processoId, tipo)
  const ultima = versoes.data?.[0]
  const atoAnterior = ultima?.atoNormativo ?? null
  const erros = mostrarErros ? errosDaElaboracao(escolha) : {}
  const alterar = (parcial: Partial<EscolhaDaElaboracao>) => onChange({ ...escolha, ...parcial })

  const preferida = ESPECIE_PREFERIDA[tipo]
  const vigentes = (normas.data ?? [])
    .filter((n) => n.vigente)
    .sort((a, b) => Number(b.especie === preferida) - Number(a.especie === preferida))

  const valorDoAto = escolha.ato === "norma" ? `norma:${escolha.normaId}` : escolha.ato
  const meuCpf = sessao?.usuario.cpf ? cpfMascarado(sessao.usuario.cpf) : ""

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <h3 className="m-0 mb-1 font-display text-md font-bold text-text-1">Responsável pela Elaboração</h3>
      <p className="m-0 mb-4 text-sm text-text-3">Sai ao final do documento, com o CPF mascarado.</p>

      <div role="group" aria-label="Quem elaborou" className="mb-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <ChoiceCard
          size="small"
          icon={<IconUser size={16} />}
          title="Eu Mesmo"
          desc="Seu cadastro"
          selected={escolha.responsavel === "eu"}
          onClick={() => alterar({ responsavel: "eu" })}
        />
        <ChoiceCard
          size="small"
          icon={<IconBuilding size={16} />}
          title="Servidor do Órgão"
          desc="Colega da prefeitura"
          selected={escolha.responsavel === "servidor"}
          onClick={() => alterar({ responsavel: "servidor" })}
        />
        <ChoiceCard
          size="small"
          icon={<IconPencil size={16} />}
          title="Pessoa Externa"
          desc="Nome e CPF digitados"
          selected={escolha.responsavel === "outra"}
          onClick={() => alterar({ responsavel: "outra" })}
        />
      </div>

      {escolha.responsavel === "eu" && (
        <>
          <DadosDoCadastro nome={sessao?.usuario.nome ?? ""} cpf={meuCpf} />
          {sessao && !sessao.usuario.cpf && (
            <ValidationMsg type="warn" msg="Seu cadastro não tem CPF. Peça ao coordenador para completá-lo, ou informe outra pessoa." />
          )}
        </>
      )}

      {escolha.responsavel === "servidor" && (
        <EscolhaDoServidor
          servidorId={escolha.servidorId}
          onEscolher={(id) => alterar({ servidorId: id })}
          erro={erros.servidor}
        />
      )}

      {escolha.responsavel === "outra" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <FormField label="Nome de quem elaborou" required>
            <Input value={escolha.nome} onChange={(e) => alterar({ nome: e.target.value })} placeholder="Ex.: José Pereira" />
            {erros.nome && <ValidationMsg type="error" msg={erros.nome} />}
          </FormField>
          <FormField label="CPF" required>
            <Input
              value={escolha.cpf}
              onChange={(e) => alterar({ cpf: formatCPF(e.target.value) })}
              inputMode="numeric"
              placeholder="000.000.000-00"
              ariaLabel="CPF de quem elaborou"
            />
            {erros.cpf && <ValidationMsg type="error" msg={erros.cpf} />}
          </FormField>
        </div>
      )}

      {ultima?.responsavel && (
        <p className="m-0 mt-3 flex flex-wrap items-center gap-1.5 text-sm text-text-3">
          <IconClock size={13} />
          <span>
            Na versão {ultima.versao} gerada: <strong className="font-semibold text-text-2">{ultima.responsavel.nome}</strong>
            {" · "}
            <span className="font-mono text-xs">CPF {ultima.responsavel.cpf}</span>
          </span>
        </p>
      )}

      {rotulo && (
        <div className="mt-4">
          <FormField label={rotulo}>
            <Dropdown
              value={valorDoAto}
              ariaLabel={rotulo}
              onChange={(valor) =>
                valor.startsWith("norma:")
                  ? alterar({ ato: "norma", normaId: valor.slice("norma:".length) })
                  : alterar({ ato: valor as EscolhaDaElaboracao["ato"] })
              }
              options={[
                { value: "padrao", label: atoAnterior ? `Manter: ${atoAnterior}` : `Sem ${rotulo.toLowerCase()}` },
                ...vigentes.map((n) => ({ value: `norma:${n.id}`, label: `${citacaoDaNorma(n)} — ${n.ementa}` })),
                { value: "digitado", label: `Digitar ${rotulo.toLowerCase()} que não está em Normas do Órgão` },
              ]}
            />
            {erros.norma && <ValidationMsg type="error" msg={erros.norma} />}
          </FormField>
          {escolha.ato === "digitado" && (
            <div className="mt-2">
              <Input
                value={escolha.citacao}
                onChange={(e) => alterar({ citacao: e.target.value })}
                ariaLabel={`${rotulo} digitada`}
                placeholder={`Ex.: ${rotulo} nº 77, de 02/01/2026`}
              />
              {erros.citacao && <ValidationMsg type="error" msg={erros.citacao} />}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
