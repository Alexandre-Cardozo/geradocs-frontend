import { Revelar } from "@/components/landing/revelar"
import { FaixaDaMarca } from "@/components/shared/marca"

/**
 * Abertura de seção da landing: rótulo em caixa alta com a faixa da marca,
 * título `h2` e texto de apoio. `tom` escolhe as cores para fundo claro ou navy.
 */
export function TituloDeSecao({
  rotulo,
  titulo,
  texto,
  tom = "claro",
  centro = false,
  className = "",
}: {
  rotulo?: string
  titulo: string
  texto?: string
  tom?: "claro" | "escuro"
  centro?: boolean
  className?: string
}) {
  const escuro = tom === "escuro"
  return (
    <Revelar className={`flex flex-col gap-4 ${centro ? "items-center text-center" : "items-start"} ${className}`}>
      {rotulo && (
        <div className={`flex flex-col gap-2 ${centro ? "items-center" : "items-start"}`}>
          <p
            className={`m-0 font-marca text-sm font-bold tracking-slogan uppercase ${escuro ? "text-on-dark-65" : "text-royal"}`}
          >
            {rotulo}
          </p>
          <FaixaDaMarca className="w-20" />
        </div>
      )}
      <h2
        className={`m-0 max-w-3xl font-display text-landing-h2 font-extrabold text-balance ${escuro ? "text-on-dark" : "text-text-1"}`}
      >
        {titulo}
      </h2>
      {texto && (
        <p className={`m-0 max-w-2xl text-landing-lead text-pretty ${escuro ? "text-on-dark-65" : "text-text-3"}`}>{texto}</p>
      )}
    </Revelar>
  )
}
