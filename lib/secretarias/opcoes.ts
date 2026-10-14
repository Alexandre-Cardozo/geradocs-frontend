import type { Processo, Secretaria } from "@/lib/types"

/**
 * As secretarias que a capa do processo oferece como requisitante.
 *
 * O valor é o id — é por ele que o servidor troca a secretaria. A atual do
 * processo entra mesmo se tiver sido desativada depois: sem ela, o campo
 * abriria em branco, e salvar outra coisa pareceria a única saída.
 */
export function opcoesDeSecretaria(
  secretarias: Secretaria[],
  processo: Pick<Processo, "secretaria" | "secretariaId">,
): Array<{ value: string; label: string }> {
  const opcoes = secretarias.map((s) => ({ value: s.id, label: s.nome }))
  const atual = processo.secretariaId
  if (atual && !opcoes.some((o) => o.value === atual)) {
    opcoes.unshift({ value: atual, label: `${processo.secretaria} (desativada)` })
  }
  return opcoes
}
