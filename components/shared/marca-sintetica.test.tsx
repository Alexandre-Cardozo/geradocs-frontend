import { describe, expect, it } from "vitest"

import { MarcaSintetica } from "@/components/shared/marca-sintetica"
import { CAMPOS_SINTETICOS, DADOS_SINTETICOS } from "@/lib/dominio"
import { renderizar, screen } from "@/lib/teste/renderizar"

describe("marca de dado sintético", () => {
  it.each(CAMPOS_SINTETICOS)("%s mostra a origem e o bloco em que sai", (campo) => {
    renderizar(<MarcaSintetica campo={campo} />)

    expect(screen.getByText("Ainda não vem do servidor")).toBeInTheDocument()
    // O texto sai da declaração, não do componente: quando o campo passar a vir
    // do servidor, apagar a entrada apaga o aviso de todos os lugares.
    expect(screen.getByText(new RegExp(DADOS_SINTETICOS[campo].saiEm))).toBeInTheDocument()
  })
})
