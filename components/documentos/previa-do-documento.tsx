import type { BlocoDoDocumento } from "@/lib/dominio"

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
}: {
  blocos: BlocoDoDocumento[]
  titulo?: string
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
      <ol className="m-0 flex list-none flex-col gap-3 p-0">
        {blocos.map((bloco) => (
          <li key={bloco.id}>
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-xs text-text-muted">{bloco.id}.</span>
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
