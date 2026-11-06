"use client"

/** Uma opção em pílula: o que mostra e, na dica, o que ela significa. */
export interface OpcaoEmPilula {
  valor: string
  rotulo: string
  dica?: string
}

/**
 * Escolha em pílulas, a forma comum da natureza do objeto e dos contextos da
 * contratação na capa e no Novo Processo.
 *
 * `unica` é a natureza: uma só, como rádio. Sem ela é marcar quantas quiser,
 * como caixas de seleção. A explicação de cada opção fica na dica, e não em
 * texto na tela.
 */
export function PilulasDeEscolha({
  opcoes,
  marcados,
  onAlternar,
  ariaLabel,
  unica = false,
  desabilitada = false,
}: {
  opcoes: OpcaoEmPilula[]
  marcados: string[]
  onAlternar: (valor: string) => void
  ariaLabel: string
  unica?: boolean
  desabilitada?: boolean
}) {
  return (
    <div role={unica ? "radiogroup" : "group"} aria-label={ariaLabel} className="flex flex-wrap gap-1.5">
      {opcoes.map((opcao) => {
        const marcada = marcados.includes(opcao.valor)
        return (
          <button
            key={opcao.valor}
            type="button"
            role={unica ? "radio" : "checkbox"}
            aria-checked={marcada}
            disabled={desabilitada}
            title={opcao.dica}
            onClick={() => onAlternar(opcao.valor)}
            className={`cursor-pointer rounded-full border px-3 py-1 text-sm transition-colors disabled:cursor-default ${
              marcada
                ? "border-royal bg-tint-royal-bg font-semibold text-royal-hover"
                : "border-border bg-surface text-text-2 hover:bg-ice"
            }`}
          >
            {opcao.rotulo}
          </button>
        )
      })}
    </div>
  )
}
