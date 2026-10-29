"use client"

import { Button, Dropdown, InfoBanner, Tag } from "@/components/ui"
import { useToast } from "@/components/shared/providers"
import { useAtualizarProcesso, useConferenciaDaDispensa } from "@/lib/api/hooks"
import { formatBRL } from "@/lib/format"
import { FUNDAMENTO_DA_DISPENSA, type FundamentoDaDispensa } from "@/lib/types"
import { useState } from "react"

/**
 * A conferência do valor contra o limite da dispensa (Art. 75, I e II).
 *
 * <p>Ela <b>informa e não impede</b>. Dispensa fora das hipóteses legais é
 * nulidade do ato e responsabilização de quem lhe deu causa — mas quem escolhe o
 * fundamento é quem responde pelo processo, e há razão que a plataforma não vê.
 * O que ela não pode é calar sobre uma subtração que sabe fazer.
 *
 * <p>Três estados, e não um "ok/não ok": o valor ultrapassa, o inciso ainda não
 * foi declarado, ou o exercício não tem limites cadastrados. Fundi-los faria a
 * pessoa procurar problema de valor onde falta um cadastro.
 */
export function ConferenciaDaDispensa({ processoId }: { processoId: string }) {
  const conferencia = useConferenciaDaDispensa(processoId)

  if (conferencia.isPending || conferencia.isError) return null

  const dados = conferencia.data
  // Fora da dispensa não há o que conferir. O inciso pendente de um pregão não
  // é pendência de coisa nenhuma, e o backend já não o declara.
  if (!dados.ehDispensa) return null

  if (dados.fundamentoPendente) {
    return <DeclararFundamento processoId={processoId} />
  }

  if (!dados.aplicavel) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="info">Dispensa sem limite de valor</Tag>
      </div>
    )
  }

  if (dados.limitePendente) {
    return (
      <InfoBanner tone="info">
        Limites de <strong>{dados.exercicio}</strong> não cadastrados: valor não conferido.
      </InfoBanner>
    )
  }

  /*
    O fracionamento: dez dispensas de vinte mil estouram um limite que nenhuma
    delas estoura sozinha. O Art. 75, § 1º manda somar o exercício, e é isso que
    ninguém vê olhando um processo por vez.
  */
  if (!dados.ultrapassa && dados.totalDoExercicioUltrapassa) {
    return (
      <InfoBanner tone="warning">
        Possível fracionamento: a entidade já dispensou{" "}
        <strong>{formatBRL(dados.totalDoExercicio)}</strong> por este inciso em {dados.exercicio},
        acima do limite de <strong>{formatBRL(dados.limite ?? 0)}</strong> (Art. 75, § 1º).
      </InfoBanner>
    )
  }

  if (!dados.ultrapassa) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Tag tone="success">Valor dentro do limite da dispensa</Tag>
        <span className="text-xs text-text-3">
          {formatBRL(dados.valorEstimado)} de {formatBRL(dados.limite ?? 0)} · {dados.fundamentoLegal}
          {dados.limiteDobrado ? " · em dobro (Art. 75, § 2º)" : ""}
        </span>
      </div>
    )
  }

  return (
    <InfoBanner tone="warning">
      O valor de <strong>{formatBRL(dados.valorEstimado)}</strong> ultrapassa o limite de{" "}
      <strong>{formatBRL(dados.limite ?? 0)}</strong> da dispensa ({dados.fundamentoLegal},{" "}
      {dados.decretoDoLimite}
      {dados.limiteDobrado ? ", em dobro" : ""}). Revise o fundamento ou o valor.
    </InfoBanner>
  )
}

/**
 * A declaração do inciso, quando ela ainda não veio.
 *
 * <p>Fica aqui, e não só no formulário de abertura, porque declarar o fundamento
 * é ato de quem conduz o processo e acontece quando ele souber — exigi-lo na
 * abertura faria inventar fundamento para poder seguir. Sem ele, a conferência
 * do valor simplesmente não acontece, e não acontecer em silêncio é o estado em
 * que a plataforma estava.
 */
function DeclararFundamento({ processoId }: { processoId: string }) {
  const atualizar = useAtualizarProcesso()
  const showToast = useToast()
  const [fundamento, setFundamento] = useState<FundamentoDaDispensa | "">("")

  return (
    <InfoBanner tone="info">
      <div className="flex flex-col gap-2.5">
        <span>Declare o inciso do Art. 75 desta dispensa.</span>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="min-w-[18rem] flex-1">
            <Dropdown
              value={fundamento}
              onChange={(escolha) => setFundamento(escolha as FundamentoDaDispensa | "")}
              ariaLabel="Fundamento da Dispensa"
              options={[
                { value: "", label: "Selecione o fundamento..." },
                ...(Object.keys(FUNDAMENTO_DA_DISPENSA) as FundamentoDaDispensa[]).map(
                  (chave) => ({ value: chave, label: FUNDAMENTO_DA_DISPENSA[chave] }),
                ),
              ]}
            />
          </div>
          <Button
            size="sm"
            disabled={fundamento === "" || atualizar.isPending}
            ariaDescribedBy="motivo-do-fundamento"
            onClick={() =>
              atualizar.mutate(
                { id: processoId, fundamentoDaDispensa: fundamento as FundamentoDaDispensa },
                {
                  onSuccess: () => showToast("Fundamento da dispensa declarado."),
                  onError: (erro) =>
                    showToast(
                      erro instanceof Error
                        ? erro.message
                        : "Não foi possível declarar o fundamento.",
                    ),
                },
              )
            }
          >
            {atualizar.isPending ? "Declarando..." : "Declarar"}
          </Button>
          <p
            id="motivo-do-fundamento"
            className={fundamento === "" ? "m-0 text-xs text-text-muted" : "sr-only"}
          >
            {fundamento === ""
              ? "Escolha o inciso que fundamenta esta dispensa."
              : "Tudo certo para declarar."}
          </p>
        </div>
      </div>
    </InfoBanner>
  )
}
