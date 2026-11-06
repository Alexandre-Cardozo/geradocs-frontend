"use client"

import { InfoBanner, Tag } from "@/components/ui"
import { useConferenciaDaDispensa } from "@/lib/api/hooks"
import { formatBRL } from "@/lib/format"

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

  // O inciso se declara em "Editar Dados", com o resto da capa: aqui só se
  // diz que, sem ele, o valor não é conferido.
  if (dados.fundamentoPendente) {
    return (
      <InfoBanner tone="info">
        Declare o inciso do Art. 75 desta dispensa em <strong>Editar Dados</strong>: sem ele, o valor não é
        conferido contra o limite.
      </InfoBanner>
    )
  }

  // Outra hipótese do Art. 75 não tem teto: o campo Fundamento da Dispensa já
  // diz "sem limite de valor", e não há o que conferir.
  if (!dados.aplicavel) return null

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
