import Image, { type StaticImageData } from "next/image"

/**
 * Moldura de captura de tela, feita em CSS: borda, raio de 12px e uma barra
 * superior neutra, sem sombra — o sistema é flat. A captura é uma imagem de
 * verdade (`<img>`), com texto alternativo, e não um desenho em HTML.
 */
export function MolduraDeTela({
  src,
  alt,
  prioridade = false,
}: {
  src: StaticImageData
  alt: string
  prioridade?: boolean
}) {
  return (
    <figure className="m-0 overflow-hidden rounded-card border border-border bg-surface">
      <div className="flex h-8 items-center gap-1.5 border-b border-border bg-border-soft px-3" aria-hidden>
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
        <span className="size-2 rounded-full bg-border" />
      </div>
      <Image src={src} alt={alt} priority={prioridade} className="block h-auto w-full" />
    </figure>
  )
}
