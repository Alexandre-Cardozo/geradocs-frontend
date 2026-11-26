import { cor } from "@/components/mascotes/catalogo"

/**
 * O símbolo GovPro (o "G" com a seta) e o nome, como SVG em texto, para o peito
 * dos mascotes. Geometria do manual da marca (grade 100 x 100), cores dos tokens.
 * `id` evita colisão do recorte entre vários mascotes na mesma página.
 */
const G = "M50 10H94L82 30H50A22 22 0 0 0 41.02 72.08L66 62V94H50A42 42 0 0 1 50 10Z"

export function simboloGovPro(id: string, cx: number, cy: number, tamanho: number): string {
  const s = tamanho / 86
  return `<g transform="translate(${cx} ${cy}) scale(${s}) translate(-51 -52)">
    <clipPath id="${id}-g"><path d="${G}"/></clipPath>
    <path fill="${cor("marca-faceta-clara")}" d="${G}"/>
    <g clip-path="url(#${id}-g)">
      <path fill="${cor("marca-faceta-escura")}" d="M8 52C16 38 34 30 64 30L50 52L41.02 72.08C28 72 15 64 8 52Z"/>
      <path fill="${cor("marca-faceta-media")}" d="M66 62L66 100L0 100L0 88.7Z"/>
    </g>
    <path fill="${cor("marca-amarelo-sombra")}" d="M34 56L48 42L73 56Z"/>
    <path fill="${cor("marca-amarelo")}" d="M48 42H94L73 56Z"/>
    <path fill="${cor("marca-verde")}" d="M73 56L94 42V78Z"/>
    <path fill="${cor("marca-verde-sombra")}" d="M73 56L94 78L73 93Z"/>
  </g>`
}

/** O nome GOVPRO (GovPro na Pri) em Montserrat 800, com a 2ª parte na cor da marca. */
export function nomeGovPro(
  x: number,
  y: number,
  tamanho: number,
  { primeira, segunda, caixa = "alta" }: { primeira: string; segunda: string; caixa?: "alta" | "mista" },
): string {
  const [gov, pro] = caixa === "alta" ? ["GOV", "PRO"] : ["Gov", "Pro"]
  return `<text x="${x}" y="${y}" text-anchor="middle" font-size="${tamanho}" font-weight="800" style="font-family: var(--font-marca)" fill="${primeira}">${gov}<tspan fill="${segunda}">${pro}</tspan></text>`
}
