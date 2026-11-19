import { Revelar } from "@/components/landing/revelar"
import { CONTEUDO, DOCUMENTOS_DO_FLUXO } from "@/lib/landing/conteudo"

/**
 * Os seis documentos, na ordem do catálogo, cada um com o acento `doc-*` do
 * tipo. A ordem é dita pelo número do cartão (e pela lista ordenada), sem
 * conectores desenhados. DFD e PCA aparecem à parte, tracejados: entram no
 * processo, mas não são gerados.
 */
export function FluxoGeradocs() {
  const { fluxo } = CONTEUDO
  return (
    <section id={fluxo.id} className="scroll-mt-20 bg-ice py-14 lg:py-24">
      <div className="mx-auto max-w-landing px-4 sm:px-6">
        <Revelar>
          <h2 className="m-0 max-w-2xl font-display text-landing-h2 font-extrabold text-balance text-text-1">
            {fluxo.titulo}
          </h2>
          <p className="m-0 mt-4 max-w-2xl text-landing-lead text-pretty text-text-3">{fluxo.intro}</p>
        </Revelar>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          {fluxo.insumos.map((insumo) => (
            <div key={insumo.titulo} className="rounded-card border border-dashed border-border bg-ice p-5">
              <p className="m-0 text-xs font-semibold tracking-caps text-text-3 uppercase">{insumo.rotulo}</p>
              <p className="m-0 mt-1 font-display text-xl font-bold text-text-1">{insumo.titulo}</p>
              <p className="m-0 mt-2 text-landing-body text-pretty text-text-3">{insumo.texto}</p>
            </div>
          ))}
        </div>

        <ol
          aria-label="Documentos gerados, na ordem do fluxo"
          className="m-0 mt-8 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3"
        >
          {DOCUMENTOS_DO_FLUXO.map((documento, indice) => (
            <li key={documento.tipo}>
              <Revelar atraso={indice * 100} className="flex h-full flex-col gap-3 rounded-card border border-border bg-surface p-5">
                <span
                  className={`inline-flex w-fit items-center rounded-sm px-2 py-1 font-mono text-sm font-bold ${documento.chip}`}
                >
                  {String(indice + 1).padStart(2, "0")}
                </span>
                <h3 className="m-0 font-display text-xl font-bold text-text-1">{documento.titulo}</h3>
                <p className="m-0 font-mono text-sm text-text-3">{documento.fundamento}</p>
              </Revelar>
            </li>
          ))}
        </ol>

        <p className="m-0 mt-6 max-w-2xl text-landing-body text-pretty text-text-3">{fluxo.notaDireta}</p>
        <p className="m-0 mt-2 max-w-2xl text-landing-body text-pretty text-text-3">{fluxo.exportacao}</p>
      </div>
    </section>
  )
}
