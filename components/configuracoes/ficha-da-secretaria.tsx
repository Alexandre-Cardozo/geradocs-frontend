"use client"

import { useState } from "react"

import { Button, FormField, Input, ValidationMsg } from "@/components/ui"
import { formatCPF } from "@/lib/auth/cpf"
import { emEdicao, errosDaFicha, type FichaEmEdicao } from "@/lib/secretarias/ficha"
import type { Secretaria } from "@/lib/types"

/**
 * A ficha da secretaria: e-mail institucional, endereço, UG e o secretário
 * (ADR-044 do back-end).
 *
 * <p>É o que o DFD mostra sem que a pessoa digite de novo a cada processo. O
 * CPF do secretário só existe mascarado aqui — a lista de secretarias é lida
 * por todo servidor —, então o campo serve para informar um CPF novo; deixado
 * em branco, o guardado continua.
 */
export function FichaDaSecretariaForm({
  secretaria,
  pendente,
  onSalvar,
  onCancelar,
}: {
  secretaria: Secretaria
  pendente: boolean
  onSalvar: (ficha: FichaEmEdicao) => void
  onCancelar: () => void
}) {
  const [ficha, setFicha] = useState<FichaEmEdicao>(emEdicao(secretaria.ficha))
  const [tentou, setTentou] = useState(false)
  const erros = errosDaFicha(ficha)
  const alterar = (campo: keyof FichaEmEdicao, valor: string) => setFicha((f) => ({ ...f, [campo]: valor }))
  const erro = (campo: keyof FichaEmEdicao) =>
    tentou && erros[campo] ? <ValidationMsg type="error" msg={erros[campo]} /> : null

  const salvar = () => {
    setTentou(true)
    if (Object.keys(erros).length === 0) onSalvar(ficha)
  }

  return (
    <div className="mt-4 rounded-card border border-royal bg-surface p-5">
      <h3 className="m-0 mb-1 font-display text-md font-bold text-text-1">Ficha — {secretaria.nome}</h3>
      <p className="m-0 mb-4 text-sm text-text-3">
        Estes dados aparecem automaticamente no DFD da secretaria. Todos são opcionais.
      </p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="E-mail institucional">
          <Input
            value={ficha.email}
            onChange={(e) => alterar("email", e.target.value)}
            placeholder="Ex.: saude@municipio.es.gov.br"
          />
          {erro("email")}
        </FormField>
        <FormField label="UG (unidade gestora)">
          <Input value={ficha.ug} onChange={(e) => alterar("ug", e.target.value)} placeholder="Ex.: 020101" />
          {erro("ug")}
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Endereço">
            <Input
              value={ficha.endereco}
              onChange={(e) => alterar("endereco", e.target.value)}
              placeholder="Ex.: Rua Central, 10, Centro"
            />
            {erro("endereco")}
          </FormField>
        </div>
        <FormField label="Nome do secretário">
          <Input
            value={ficha.secretario}
            onChange={(e) => alterar("secretario", e.target.value)}
            placeholder="Ex.: Ana Souza"
          />
          {erro("secretario")}
        </FormField>
        <FormField label="CPF do secretário">
          <Input
            value={ficha.cpfNovo}
            onChange={(e) => alterar("cpfNovo", formatCPF(e.target.value))}
            inputMode="numeric"
            placeholder={
              secretaria.ficha.cpfDoSecretario
                ? `Atual: ${secretaria.ficha.cpfDoSecretario} — digite para trocar`
                : "Ex.: 000.000.000-00"
            }
            ariaLabel="CPF do secretário"
          />
          {erro("cpfNovo")}
        </FormField>
        <div className="sm:col-span-2">
          <FormField label="Decreto de nomeação">
            <Input
              value={ficha.decretoDeNomeacao}
              onChange={(e) => alterar("decretoDeNomeacao", e.target.value)}
              placeholder="Ex.: Decreto nº 1.234, de 02/01/2025"
            />
            {erro("decretoDeNomeacao")}
          </FormField>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={pendente} onClick={onCancelar}>
          Cancelar
        </Button>
        <Button disabled={pendente} onClick={salvar}>
          {pendente ? "Salvando..." : "Salvar Ficha"}
        </Button>
      </div>
    </div>
  )
}
