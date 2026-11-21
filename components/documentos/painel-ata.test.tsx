import { describe, expect, it } from "vitest"

import { PainelATA } from "@/components/documentos/paineis"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"

/**
 * Adesão a ATA: a revisão pela IA ainda não existe no servidor.
 *
 * Antes a tela esperava 2,2 s e mostrava um parecer fixo ("ATA Válida", com órgão e vigência inventados). Um
 * parecer jurídico que ninguém emitiu é pior do que nenhum: a tela diz o que ainda não faz.
 */
describe("painel de adesão a ATA", () => {
  it("anexar a ATA não produz parecer: a tela diz que a revisão pela IA ainda não está disponível", async () => {
    renderizar(<PainelATA />)

    await userEvent.click(screen.getByRole("button", { name: "Configurar ATA" }))
    await userEvent.click(screen.getByText("Anexar ATA para revisão pela IA"))
    const arquivo = new File(["%PDF-1.4"], "ata.pdf", { type: "application/pdf" })
    await userEvent.upload(document.querySelector("input[type=file]") as HTMLInputElement, arquivo)

    expect(await screen.findByRole("note")).toHaveTextContent("A revisão da ATA pela IA ainda não está disponível")
    expect(screen.queryByRole("button", { name: "Enviar para revisão pela IA" })).not.toBeInTheDocument()
    expect(screen.queryByText(/ATA Válida/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Nenhuma irregularidade identificada/)).not.toBeInTheDocument()
  })
})
