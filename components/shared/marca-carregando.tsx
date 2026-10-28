import { useId } from "react"

/*
 * Símbolo do GeraDocs desenhado em varredura circular — o mesmo movimento do GIF
 * de carregamento da marca, mas em SVG: nítido em qualquer tamanho e sem fundo,
 * então serve sobre o ice, o branco e os cards (o GIF traz o fundo pintado).
 * Geometria em grade 100 × 100, idêntica ao símbolo do manual da marca.
 */
const FAIXA =
  "M34 8H58L88 38V94H34A20 20 0 0 1 14 74V28A20 20 0 0 1 34 8Z" +
  "M32 24A2 2 0 0 0 30 26V76A2 2 0 0 0 32 78H72V44.6L51.4 24Z"

/** Proporção da caixa do símbolo (viewBox 84 × 90). */
const PROPORCAO = 90 / 84

export function MarcaCarregando({ tamanho = 48 }: { tamanho?: number }) {
  // O id do React traz caracteres que `url(#...)` não aceita em todo navegador.
  const base = useId().replace(/[^a-zA-Z0-9_-]/g, "")
  const faixa = `marca-faixa-${base}`
  const varredura = `marca-varredura-${base}`

  return (
    <svg
      viewBox="12 6 84 90"
      width={tamanho}
      height={Math.round(tamanho * PROPORCAO)}
      aria-hidden
      focusable="false"
      className="shrink-0"
      data-marca="carregando"
    >
      <defs>
        <clipPath id={faixa}>
          <path fillRule="evenodd" clipRule="evenodd" d={FAIXA} />
        </clipPath>
        <mask id={varredura} maskUnits="userSpaceOnUse" x="0" y="0" width="110" height="110">
          <circle
            cx="54"
            cy="51"
            r="30"
            fill="none"
            stroke="white"
            strokeWidth="60"
            pathLength={100}
            strokeDasharray="100"
            transform="rotate(-90 54 51)"
            className="animate-marca-varredura"
          />
        </mask>
      </defs>
      <g mask={`url(#${varredura})`}>
        <path className="fill-marca-faceta-clara" fillRule="evenodd" d={FAIXA} />
        <g clipPath={`url(#${faixa})`}>
          <path className="fill-marca-faceta-escura" d="M14 70Q16 28 56 24L30 24L30 78Z" />
          <path className="fill-marca-faceta-media" d="M88 62L88 100L0 100L0 94Z" />
        </g>
        <path className="fill-marca-amarelo" d="M65 8H94L79.5 22.5Z" />
        <path className="fill-marca-verde" d="M94 8V37L79.5 22.5Z" />
        <rect className="fill-marca-azul" x="38" y="44" width="25" height="8" rx="4" />
        <rect className="fill-marca-azul" x="38" y="58" width="15" height="8" rx="4" />
      </g>
    </svg>
  )
}
