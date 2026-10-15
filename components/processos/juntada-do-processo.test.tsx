import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { JuntadaDoProcesso } from "@/components/processos/juntada-do-processo"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor, within } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"
import type { DocumentoGerado, TipoDocumento } from "@/lib/types"

/**
 * A juntada (ADR-048 do back-end): escolher quais documentos gerados entram e
 * em que ordem, e baixar um arquivo só. Nada é gerado de novo.
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"

function gerado(tipo: TipoDocumento, versao: number, formatos: Array<"PDF" | "DOCX">): DocumentoGerado {
  return {
    id: `g-${tipo}`,
    entidadeId: "e",
    processoId: PROCESSO,
    titulo: tipo,
    tipo,
    geradoEm: "2026-10-14T12:00:00Z",
    status: "final",
    versao,
    arquivos: formatos.map((formato) => ({
      id: `${tipo}-${formato}`,
      formato,
      nomeDoArquivo: `${tipo}.${formato.toLowerCase()}`,
      bytes: 1,
      checksum: "a",
    })),
  }
}

const GERADOS = [gerado("Edital", 1, ["PDF"]), gerado("ETP", 2, ["PDF", "DOCX"]), gerado("TR", 1, ["PDF"])]

function renderizarJuntada(onFechar = vi.fn()) {
  renderizar(
    <JuntadaDoProcesso
      processoId={PROCESSO}
      solicitados={["ETP", "TR", "Edital", "Contrato"]}
      gerados={GERADOS}
      onFechar={onFechar}
    />,
  )
  return onFechar
}

const ordemNaTela = () =>
  within(screen.getByRole("list", { name: /Documentos da juntada/ }))
    .getAllByRole("listitem")
    .map((item) => item.textContent ?? "")

describe("juntada dos documentos do processo", () => {
  it("começa com os gerados no formato, na ordem do fluxo, e diz o que falta gerar", () => {
    renderizarJuntada()

    expect(ordemNaTela()[0]).toContain("1.Estudo Técnico Preliminarv2")
    expect(ordemNaTela()[2]).toContain("3.Edital de Licitação")
    expect(screen.getByRole("button", { name: /Baixar Juntada em PDF \(3 documentos\)/ })).toBeEnabled()
    expect(screen.getByText(/Fora da juntada \(não gerados\): Minuta de Contrato/)).toBeInTheDocument()
    // O Edital já traz o TR como anexo: avisa, sem impedir.
    expect(screen.getByText(/O Edital já traz Termo de Referência como anexo/)).toBeInTheDocument()
  })

  it("baixa na ordem escolhida, só com os marcados", async () => {
    let consulta = new URLSearchParams()
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/bundle`, ({ request }) => {
        consulta = new URL(request.url).searchParams
        return HttpResponse.arrayBuffer(new TextEncoder().encode("%PDF").buffer as ArrayBuffer, {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="PROC-2026-000007-JUNTADA.pdf"',
          },
        })
      }),
    )
    const criar = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:juntada")
    const revogar = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {})
    renderizarJuntada()

    await userEvent.click(screen.getByRole("button", { name: "Incluir Termo de Referência na juntada" }))
    expect(screen.queryByText(/O Edital já traz/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Subir Edital de Licitação" }))
    await userEvent.click(screen.getByRole("button", { name: "Subir Edital de Licitação" }))
    expect(ordemNaTela()[0]).toContain("1.Edital de Licitação")
    await userEvent.click(screen.getByRole("button", { name: /Baixar Juntada em PDF \(2 documentos\)/ }))

    await waitFor(() => expect(revogar).toHaveBeenCalledWith("blob:juntada"))
    expect(consulta.get("format")).toBe("PDF")
    expect(consulta.getAll("documents")).toEqual(["EDITAL", "ETP"])
    criar.mockRestore()
    revogar.mockRestore()
  })

  it("no DOCX, o que só foi gerado em PDF fica de fora, dizendo como incluir", async () => {
    renderizarJuntada()

    await userEvent.click(screen.getByRole("button", { name: "DOCX" }))

    expect(screen.getByRole("button", { name: "Incluir Termo de Referência na juntada" })).toBeDisabled()
    expect(screen.getAllByText(/gere o documento em DOCX para incluí-lo/)).toHaveLength(2)
    expect(screen.getByRole("button", { name: /Baixar Juntada em DOCX \(1 documento\)/ })).toBeEnabled()
  })

  it("sem nenhum marcado não baixa, e o erro do servidor vira aviso", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/bundle`, () =>
        HttpResponse.json({ detail: "O PDF de 1. Edital não pôde ser lido." }, { status: 400 }),
      ),
    )
    const fechar = renderizarJuntada()

    await userEvent.click(screen.getByRole("button", { name: "DOCX" }))
    await userEvent.click(screen.getByRole("button", { name: "Incluir Estudo Técnico Preliminar na juntada" }))
    expect(screen.getByRole("button", { name: /Baixar Juntada em DOCX \(0 documentos\)/ })).toBeDisabled()

    await userEvent.click(screen.getByRole("button", { name: "Incluir Estudo Técnico Preliminar na juntada" }))
    await userEvent.click(screen.getByRole("button", { name: /Baixar Juntada em DOCX/ }))
    await waitFor(() => expect(screen.getByRole("button", { name: /Baixar Juntada em DOCX/ })).toBeEnabled())

    await userEvent.click(screen.getByRole("button", { name: "Fechar" }))
    expect(fechar).toHaveBeenCalled()
  })

  it("sem documento gerado, diz o que fazer", () => {
    renderizar(
      <JuntadaDoProcesso processoId={PROCESSO} solicitados={["ETP"]} gerados={[]} onFechar={vi.fn()} />,
    )

    expect(screen.getByText(/Nenhum documento gerado ainda/)).toBeInTheDocument()
  })
})
