import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import NormasDoOrgao from "@/app/(app)/normas/page"
import { sessaoServidor } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * Normas do Órgão (ADR-043 do back-end).
 *
 * <p>Todo servidor consulta e baixa; só o coordenador cadastra e altera. E o
 * PDF digitalizado precisa ser apontado, porque a IA não o lê.
 */
const decreto = {
  id: "0b4f1c2e-1111-4222-8333-444455556666",
  kind: "DECREE",
  kindLabel: "Decreto",
  number: "10.210",
  publishedOn: "2025-03-05",
  title: "Regulamenta a Lei nº 14.133/2021 no âmbito do Município",
  notes: null,
  status: "IN_FORCE",
  revokedAt: null,
  revocationNote: null,
  currentFile: {
    version: 2,
    fileName: "decreto-10210.pdf",
    mediaType: "application/pdf",
    byteSize: 204_800,
    sha256: "a".repeat(64),
    textAvailable: true,
    textCharacters: 12_000,
    uploadedAt: "2026-10-13T12:00:00Z",
    current: true,
  },
  createdAt: "2026-10-13T12:00:00Z",
  updatedAt: "2026-10-13T12:00:00Z",
  version: 3,
}

function comPerfil(perfil: "SERVIDOR" | "COORDENADOR") {
  servidor.use(
    http.get(`${urlDaApi}/me`, () =>
      HttpResponse.json({ ...sessaoServidor, user: { ...sessaoServidor.user, profileAccess: perfil } }),
    ),
  )
}

function comNormas(normas: unknown[]) {
  servidor.use(http.get(`${urlDaApi}/regulations`, () => HttpResponse.json(normas)))
}

describe("normas do órgão", () => {
  it("o servidor vê a norma e baixa, mas não cadastra nem altera", async () => {
    comPerfil("SERVIDOR")
    comNormas([decreto])
    renderizar(<NormasDoOrgao />)

    expect(await screen.findByRole("heading", { name: "Decreto nº 10.210, de 05/03/2025" })).toBeInTheDocument()
    expect(screen.getByText("Vigente")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Baixar decreto-10210.pdf" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Versões anteriores \(1\)/ })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Cadastrar Norma/ })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Revogar" })).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Excluir" })).not.toBeInTheDocument()
  })

  it("o coordenador tem o cadastro e as ações sobre cada norma", async () => {
    comPerfil("COORDENADOR")
    comNormas([decreto])
    renderizar(<NormasDoOrgao />)

    expect(await screen.findByRole("button", { name: "Revogar" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Editar dados" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Trocar arquivo" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Cadastrar Norma/ })).toBeInTheDocument()
  })

  it("aponta o PDF digitalizado, que a IA não vai conseguir ler", async () => {
    comPerfil("COORDENADOR")
    comNormas([{ ...decreto, currentFile: { ...decreto.currentFile, textAvailable: false, textCharacters: 0 } }])
    renderizar(<NormasDoOrgao />)

    expect(await screen.findByText(/A IA não vai conseguir lê-lo/)).toBeInTheDocument()
    expect(screen.getByText(/Envie a versão com texto/)).toBeInTheDocument()
  })

  it("a revogada continua listada, com a observação", async () => {
    comPerfil("SERVIDOR")
    comNormas([
      { ...decreto, status: "REVOKED", revokedAt: "2026-10-10T12:00:00Z", revocationNote: "Revogada pelo Decreto 11.002/2026" },
    ])
    renderizar(<NormasDoOrgao />)

    expect(await screen.findByText("Revogada")).toBeInTheDocument()
    expect(screen.getByText(/Revogada pelo Decreto 11.002\/2026/)).toBeInTheDocument()
    expect(screen.getByText(/0 vigentes/)).toBeInTheDocument()
  })

  it("sem norma, diz a quem cabe cadastrar", async () => {
    comPerfil("SERVIDOR")
    comNormas([])
    renderizar(<NormasDoOrgao />)

    expect(await screen.findByText(/Quem cadastra é o coordenador do órgão/)).toBeInTheDocument()
  })

  it("o cadastro não envia sem ementa nem arquivo, e diz o que falta", async () => {
    comPerfil("COORDENADOR")
    comNormas([])
    renderizar(<NormasDoOrgao />)

    await userEvent.click(await screen.findByRole("button", { name: /Cadastrar Norma/ }))
    const enviar = screen.getAllByRole("button", { name: "Cadastrar Norma" }).at(-1)
    await userEvent.click(enviar!)

    expect(screen.getByText("Informe a ementa ou o assunto da norma.")).toBeInTheDocument()
    expect(screen.getByText(/Anexe o arquivo da norma/)).toBeInTheDocument()
  })

  it("excluir exige justificativa e lembra que norma que deixou de valer se revoga", async () => {
    comPerfil("COORDENADOR")
    comNormas([decreto])
    renderizar(<NormasDoOrgao />)

    await userEvent.click(await screen.findByRole("button", { name: "Excluir" }))
    expect(screen.getByText(/revogue/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "Excluir Norma" }))
    expect(screen.getByText("Explique o motivo em ao menos 10 caracteres.")).toBeInTheDocument()
  })
})
