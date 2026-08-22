"use client"

import { useId, useState } from "react"

import { Button, ChoiceCard, Textarea } from "@/components/ui"
import { ErrataDoDocumento } from "@/components/documentos/errata-do-documento"
import { VersoesDoDocumento } from "@/components/documentos/versoes-do-documento"
import { useHistoricoVersoes } from "@/lib/api/hooks"
import {
  MOTIVO_RETIFICACAO_EXPLICACAO,
  MOTIVO_RETIFICACAO_LABEL,
  type MotivoRetificacao,
  type Retificacao,
} from "@/lib/dominio"
import type { TipoDocumento } from "@/lib/types"

const MOTIVOS = Object.keys(MOTIVO_RETIFICACAO_LABEL) as MotivoRetificacao[]

/**
 * A porta de entrada da retificação.
 *
 * Retificar não é regerar. Regeração acontece enquanto o documento ainda está
 * sendo elaborado dentro da plataforma; retificação é o que se faz depois que
 * ele saiu — foi anexado ao processo, protocolado, às vezes publicado. Por isso
 * ela exige dizer **o quê** e **de que natureza**: é essa a informação que o
 * controle procura no histórico, e é ela que decide se houve republicação.
 *
 * O histórico aparece junto, e não em outra tela, porque a pergunta que antecede
 * toda retificação é "o que já foi retificado aqui antes?".
 */
export function PainelRetificacao({
  processoId,
  tipo,
  versaoAtual,
  pendente,
  onConfirmar,
  onCancelar,
}: {
  processoId: string
  tipo: TipoDocumento
  versaoAtual: number
  pendente: boolean
  onConfirmar: (retificacao: Retificacao) => void
  onCancelar: () => void
}) {
  const historico = useHistoricoVersoes(processoId, tipo)
  const [motivo, setMotivo] = useState<MotivoRetificacao | null>(null)
  const [detalhe, setDetalhe] = useState("")
  const campoId = useId()
  const motivoId = useId()
  const incompleto = motivo === null || detalhe.trim() === ""

  return (
    <div className="mt-4 flex flex-col gap-4 rounded-xl border border-border bg-ice p-4">
      <div>
        <div className="font-display text-md font-bold text-text-1">
          Retificar — gera a versão {versaoAtual + 1}
        </div>
        <p className="m-0 mt-0.5 text-sm text-text-3">
          A versão atual fica no histórico. O documento novo sai marcado como
          RETIFICADO, no título e na listagem.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {MOTIVOS.map((opcao) => (
          <ChoiceCard
            key={opcao}
            size="small"
            selected={motivo === opcao}
            onClick={() => setMotivo(opcao)}
            title={MOTIVO_RETIFICACAO_LABEL[opcao]}
            desc={MOTIVO_RETIFICACAO_EXPLICACAO[opcao]}
          />
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={campoId} className="text-sm font-semibold text-text-2">
          O que está sendo retificado
        </label>
        <Textarea
          id={campoId}
          value={detalhe}
          onChange={(e) => setDetalhe(e.target.value)}
          rows={3}
          placeholder="Ex: o valor estimado da seção 5 constava como R$ 150.000,00 e o correto é R$ 105.000,00."
        />
      </div>

      {historico.isSuccess && historico.data.length > 0 && (
        <div>
          <div className="mb-1.5 text-2xs font-semibold tracking-caps text-text-muted uppercase">
            Histórico deste documento
          </div>
          {/*
            Com o texto de cada versão: a pergunta que antecede toda retificação
            não é só "o que já foi retificado", é "o que estava escrito antes".
          */}
          <VersoesDoDocumento processoId={processoId} tipo={tipo} />
        </div>
      )}

      {historico.isSuccess && historico.data.length > 1 && (
        <div>
          <div className="mb-1.5 text-2xs font-semibold tracking-caps text-text-muted uppercase">
            Errata — facultativa
          </div>
          {/*
            Oferecida, não imposta: obrigar a gerar errata transformaria correção
            de digitação em ato administrativo.
          */}
          <ErrataDoDocumento processoId={processoId} tipo={tipo} />
        </div>
      )}

      <p id={motivoId} className="m-0 text-xs text-text-muted">
        Escolha a natureza da retificação e descreva o que está sendo corrigido.
      </p>
      <div className="flex flex-wrap gap-2.5">
        <Button
          size="sm"
          disabled={pendente || incompleto}
          ariaDescribedBy={incompleto ? motivoId : undefined}
          onClick={() => motivo && onConfirmar({ motivo, detalhe: detalhe.trim() })}
        >
          {pendente ? "Retificando..." : `Retificar e gerar v${versaoAtual + 1}`}
        </Button>
        <Button size="sm" variant="ghost" disabled={pendente} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
