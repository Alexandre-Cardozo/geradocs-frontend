import type { AberturaDoDocumento } from "@/lib/api/authoring-client"
import { numeroImpresso, type BlocoDoDocumento } from "@/lib/dominio"

/**
 * O texto que sai no documento.
 *
 * Existe por causa da dispensa de seção: sem ver o resultado, o servidor não tem
 * como saber que a seção que ele deixou em branco vai virar um parágrafo
 * declarando a dispensa — nem que a que ele deixou em branco *sem* justificar
 * simplesmente não vai aparecer.
 */
export function PreviaDoDocumento({
  blocos,
  titulo = "Prévia do documento",
  abertura,
}: {
  blocos: BlocoDoDocumento[]
  titulo?: string
  /** O que sai antes da primeira seção: título por extenso, introdução e objeto (§97). */
  abertura?: AberturaDoDocumento
}) {
  if (blocos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface px-4 py-3.5 text-sm text-text-muted">
        Nenhuma seção preenchida ou dispensada até aqui — o documento sairia vazio.
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="mb-2.5 text-2xs font-semibold tracking-caps text-text-muted uppercase">
        {titulo}
      </div>
      {abertura && <Abertura abertura={abertura} />}
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {blocos.map((bloco) => (
          <li key={bloco.id}>
            <div className="flex flex-wrap items-baseline gap-2">
              {/* O número da minuta, e não o código: o preâmbulo não tem número (§85). */}
              {numeroImpresso(bloco) !== "" && (
                <span className="font-mono text-xs text-text-muted">{numeroImpresso(bloco)}.</span>
              )}
              <span className="text-base font-semibold text-text-1">{bloco.titulo}</span>
              {bloco.dispensada && (
                <span className="rounded-sm bg-tint-royal-bg px-1.5 py-0.5 text-2xs font-semibold text-royal">
                  Dispensada
                </span>
              )}
            </div>
            <p className="m-0 mt-1 text-sm whitespace-pre-line text-text-3">{bloco.texto}</p>
          </li>
        ))}
      </ol>
    </div>
  )
}

/** O início do documento, no desenho do papel: rótulos em negrito, como o órgão os destaca. */
function Abertura({ abertura }: { abertura: AberturaDoDocumento }) {
  return (
    <div className="mb-3 flex flex-col gap-2 border-b border-border-soft pb-3">
      <div className="text-center text-base font-bold text-text-1">{abertura.titulo}</div>
      {abertura.introducao && (
        <div>
          <span className="text-base font-semibold text-text-1">Introdução</span>
          <p className="m-0 mt-1 text-sm text-text-3">{abertura.introducao}</p>
        </div>
      )}
      {abertura.processo && (
        <p className="m-0 text-sm font-bold text-text-1">
          PROCESSO: nº <span className="font-mono">{abertura.processo}</span>
        </p>
      )}
      {abertura.objeto && (
        <p className="m-0 text-sm whitespace-pre-line text-text-3">
          <strong className="text-text-1">OBJETO:</strong> {abertura.objeto}
        </p>
      )}
    </div>
  )
}
