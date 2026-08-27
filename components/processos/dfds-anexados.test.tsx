import { HttpResponse, http } from "msw"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { DfdsAnexados } from "@/components/processos/dfds-anexados"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Os DFDs anexados ao processo.
 *
 * <p>Até o 13.2 a plataforma anotava o nome do PDF assinado e descartava os
 * bytes: quem fosse conferir o processo depois não tinha como rebaixá-lo, e o
 * modelo de IA não teria o que ler. Anexar de novo **versiona** em vez de
 * substituir (ADR-028) — e é a data de cada anexo que responde qual DFD embasou
 * os documentos gerados até ali.
 */
const PROCESSO = "3f2b1a00-1111-4222-8333-444455556666"
const PDF = "application/pdf"

function comDfds(dfds: unknown[]) {
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id/dfds`, () => HttpResponse.json(dfds)),
  )
}

const dfd = (id: string, fileName: string, submittedAt: string, file: unknown) => ({
  id,
  fileName,
  departmentId: "02753761-6201-45f7-a9d9-2a1abf6d4f3c",
  departmentName: "Secretaria de Educação",
  submittedAt,
  items: [],
  file,
})

const criou = vi.fn(() => "blob:dfd")
const revogou = vi.fn()

beforeEach(() => {
  criou.mockClear()
  revogou.mockClear()
  // jsdom não implementa nenhum dos dois.
  Object.assign(URL, { createObjectURL: criou, revokeObjectURL: revogou })
})

describe("DFDs anexados", () => {
  it("mostra cada anexo com a secretaria, a data e o tamanho", async () => {
    comDfds([
      dfd("d-1", "DFD-v1.pdf", "2026-03-10T12:00:00Z", {
        mediaType: PDF,
        byteSize: 2048,
        sha256: "a".repeat(64),
      }),
      dfd("d-2", "DFD-v2.pdf", "2026-05-02T12:00:00Z", {
        mediaType: PDF,
        byteSize: 4096,
        sha256: "b".repeat(64),
      }),
    ])
    renderizar(<DfdsAnexados processoId={PROCESSO} />)

    // Os dois continuam ali: substituir apagaria a resposta a "qual DFD embasou
    // o ETP daquela data".
    expect(await screen.findByText("DFD-v1.pdf")).toBeInTheDocument()
    expect(screen.getByText("DFD-v2.pdf")).toBeInTheDocument()
    expect(screen.getByText(/10\/03\/2026/)).toBeInTheDocument()
    expect(screen.getByText(/2,0 KB/)).toBeInTheDocument()
  })

  it("DFD registrado sem arquivo diz isso, em vez de um botão que não faz nada", async () => {
    comDfds([
      dfd("d-1", "DFD-sem-arquivo.pdf", "2026-03-10T12:00:00Z", null),
      dfd("d-2", "DFD-v2.pdf", "2026-05-02T12:00:00Z", {
        mediaType: PDF,
        byteSize: 4096,
        sha256: "b".repeat(64),
      }),
    ])
    renderizar(<DfdsAnexados processoId={PROCESSO} />)

    // Caso legítimo: o servidor sabia o número do DFD e ainda não tinha o PDF
    // em mãos. Exigi-lo transformaria um facilitador em bloqueio.
    expect(await screen.findByText("Sem arquivo anexado")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /Baixar/ })).toHaveLength(1)
  })

  it("com um anexo só, a lista não aparece: o cabeçalho já o mostra", async () => {
    comDfds([
      dfd("d-1", "DFD-v1.pdf", "2026-03-10T12:00:00Z", {
        mediaType: PDF,
        byteSize: 2048,
        sha256: "a".repeat(64),
      }),
    ])
    const { container } = renderizar(<DfdsAnexados processoId={PROCESSO} />)

    // Repetir a mesma linha logo abaixo do cabeçalho era dizer duas vezes a
    // mesma coisa; é do segundo anexo em diante que a lista responde algo novo.
    await waitFor(() => expect(screen.queryByText(/Carregando/)).not.toBeInTheDocument())
    expect(container).toBeEmptyDOMElement()
  })

  it("sem DFD anexado, não desenha um bloco vazio", async () => {
    comDfds([])
    const { container } = renderizar(<DfdsAnexados processoId={PROCESSO} />)

    await waitFor(() => expect(screen.queryByText(/Carregando/)).not.toBeInTheDocument())
    expect(container).toBeEmptyDOMElement()
  })

  it("a falha do servidor aparece na tela", async () => {
    servidor.use(
      http.get(`${urlDaApi}/procurement-processes/:id/dfds`, () =>
        HttpResponse.json({ status: 500 }, { status: 500 }),
      ),
    )
    renderizar(<DfdsAnexados processoId={PROCESSO} />)

    expect(await screen.findByText(/Não foi possível listar/)).toBeInTheDocument()
  })
})
