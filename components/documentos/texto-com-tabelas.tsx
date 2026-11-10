import { colunaNumerica, linhaTotalizadora, partesDoTexto } from "@/lib/dominio/tabela"

/**
 * O texto da seção com as tabelas desenhadas como tabela (§100).
 *
 * Cada linha é um parágrafo, com o mesmo respiro curto do PDF entre eles; a
 * linha em branco não abre espaço (§102), para os tópicos seguirem um depois
 * do outro como no papel. As linhas com "|" que formam tabela viram `<table>`,
 * no mesmo desenho do PDF: cabeçalho destacado, número à direita e a linha de
 * total em negrito.
 */
export function TextoComTabelas({ texto, className = "" }: { texto: string; className?: string }) {
  const partes = partesDoTexto(texto).filter((parte) => parte.tipo === "tabela" || parte.texto.trim() !== "")
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {partes.map((parte, i) =>
        parte.tipo === "paragrafo" ? (
          <p key={i} className="m-0">
            {parte.texto}
          </p>
        ) : (
          <Tabela key={i} linhas={parte.linhas} />
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
    <div className="overflow-x-auto rounded-md border border-border">
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
