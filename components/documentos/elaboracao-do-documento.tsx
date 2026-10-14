"use client"

import { Button, Dropdown, FormField, Input, ValidationMsg } from "@/components/ui"
import { useNormas, useSessao, useVersoesComTexto } from "@/lib/api/hooks"
import { formatCPF } from "@/lib/auth/cpf"
import {
  cpfMascarado,
  errosDaElaboracao,
  rotuloDoAto,
  type EscolhaDaElaboracao,
} from "@/lib/documentos/elaboracao"
import { citacaoDaNorma } from "@/lib/normas/norma"
import type { TipoDocumento } from "@/lib/types"

/** Que espécie de norma vem primeiro na lista: a portaria no ETP, o decreto no Edital. */
const ESPECIE_PREFERIDA: Partial<Record<TipoDocumento, string>> = { ETP: "ORDINANCE", Edital: "DECREE" }

/**
 * Quem elaborou o documento e, no ETP e no Edital, o ato que o embasa
 * (ADR-044 do back-end).
 *
 * <p>Sai num bloco ao final do arquivo, com o CPF mascarado — documento de
 * licitação é público. Por padrão é quem conclui; pode ser quem redigiu fora da
 * plataforma.
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
  const atoAnterior = versoes.data?.[0]?.atoNormativo ?? null
  const erros = mostrarErros ? errosDaElaboracao(escolha) : {}
  const alterar = (parcial: Partial<EscolhaDaElaboracao>) => onChange({ ...escolha, ...parcial })

  const preferida = ESPECIE_PREFERIDA[tipo]
  const vigentes = (normas.data ?? [])
    .filter((n) => n.vigente)
    .sort((a, b) => Number(b.especie === preferida) - Number(a.especie === preferida))

  const valorDoAto = escolha.ato === "norma" ? `norma:${escolha.normaId}` : escolha.ato

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <h3 className="m-0 mb-1 font-display text-md font-bold text-text-1">Responsável pela Elaboração</h3>
      <p className="m-0 mb-4 text-sm text-text-3">
        Sai ao final do documento, com o CPF mascarado.
      </p>

      {escolha.responsavel === "eu" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border bg-ice px-3.5 py-2.5">
          <span className="text-base text-text-1">
            {sessao?.usuario.nome ?? "Você"}
            {sessao?.usuario.cpf && (
              <span className="ml-2 font-mono text-xs text-text-muted">CPF {cpfMascarado(sessao.usuario.cpf)}</span>
            )}
          </span>
          <Button size="sm" variant="ghost" onClick={() => alterar({ responsavel: "outra" })}>
            Informar outra pessoa
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto] sm:items-start">
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
          <div className="sm:pt-6">
            <Button size="sm" variant="ghost" onClick={() => alterar({ responsavel: "eu", nome: "", cpf: "" })}>
              Usar meus dados
            </Button>
          </div>
        </div>
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
