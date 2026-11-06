import { colunaNumerica, linhaTotalizadora, partesDoTexto } from "@/lib/dominio/tabela"

/**
 * O texto da seção com as tabelas desenhadas como tabela (§100).
 *
 * As linhas comuns continuam juntas num parágrafo com as quebras preservadas,
 * como a prévia sempre mostrou; só as linhas com "|" que formam tabela viram
 * `<table>`, no mesmo desenho do PDF: cabeçalho destacado, número à direita e a
 * linha de total em negrito.
 */
export function TextoComTabelas({ texto, className = "" }: { texto: string; className?: string }) {
  const blocos: ({ tipo: "texto"; linhas: string[] } | { tipo: "tabela"; linhas: string[][] })[] = []
  for (const parte of partesDoTexto(texto)) {
    const ultimo = blocos.at(-1)
    if (parte.tipo === "tabela") blocos.push(parte)
    else if (ultimo?.tipo === "texto") ultimo.linhas.push(parte.texto)
    else blocos.push({ tipo: "texto", linhas: [parte.texto] })
  }
  return (
    <div className={className}>
      {blocos.map((bloco, i) =>
        bloco.tipo === "texto" ? (
          <p key={i} className="m-0 whitespace-pre-line">
            {bloco.linhas.join("\n")}
          </p>
        ) : (
          <Tabela key={i} linhas={bloco.linhas} />
        ),
      )}
    </div>
  )
}

function Tabela({ linhas }: { linhas: string[][] }) {
  const [cabecalho = [], ...corpo] = linhas
  const aDireita = cabecalho.map((_, c) => colunaNumerica(linhas, c))
  const alinhar = (c: number) => (aDireita[c] ? "text-right" : "text-left")
  return (
    <div className="my-1.5 overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="bg-ice">
            {cabecalho.map((celula, c) => (
              <th key={c} scope="col" className={`px-2 py-1.5 font-semibold text-text-1 ${alinhar(c)}`}>
                {celula}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {corpo.map((linha, l) => (
            <tr
              key={l}
              className={`border-t border-border-soft ${linhaTotalizadora(linha) ? "font-semibold text-text-1" : ""}`}
            >
              {linha.map((celula, c) => (
                <td key={c} className={`px-2 py-1.5 align-top ${alinhar(c)} ${aDireita[c] ? "font-mono" : ""}`}>
                  {celula}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
