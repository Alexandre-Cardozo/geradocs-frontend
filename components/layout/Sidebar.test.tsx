import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import Sidebar from "@/components/layout/Sidebar"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * A barra lateral.
 *
 * <p>O brasão da entidade vem do timbre, que é onde ele é cadastrado. A sessão
 * trazia um `logoDataUrl` que nunca era preenchido: a entidade subia o brasão
 * e a barra continuava com o ícone genérico, sem nada indicando por quê.
 */
const PNG = "image/png"

// A barra usa `usePathname` para marcar o item ativo e `useRouter` no logout:
// sem o roteador do App Router montado, ela nem chega a renderizar.
vi.mock("next/navigation", () => ({
  usePathname: () => "/processos",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))

function comTimbre(temBrasao: boolean) {
  servidor.use(
    http.get(`${urlDaApi}/organizations/:id/letterhead`, () =>
      HttpResponse.json({
        headerText: "PREFEITURA",
        footerText: "Rua Principal, 100",
        hasLogo: temBrasao,
        logoFileName: temBrasao ? "brasao.png" : null,
        version: 0,
      }),
    ),
    http.get(`${urlDaApi}/organizations/:id/letterhead/logo`, () =>
      temBrasao
        ? HttpResponse.arrayBuffer(new Uint8Array([137, 80, 78, 71]).buffer, {
            headers: { "Content-Type": PNG },
          })
        : new HttpResponse(null, { status: 404 }),
    ),
  )
}

describe("barra lateral", () => {
  it("mostra o brasão da entidade quando há um cadastrado", async () => {
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:brasao"), revokeObjectURL: vi.fn() })
    comTimbre(true)
    renderizar(<Sidebar aberta={false} onNavigate={() => {}} />)

    // A imagem é decorativa: o nome da entidade está escrito ao lado, e um
    // texto alternativo repetiria o que o leitor de tela já vai ler.
    await waitFor(() => {
      const brasao = document.querySelector('img[src="blob:brasao"]')
      expect(brasao).not.toBeNull()
      expect(brasao).toHaveAttribute("alt", "")
    })
  })

  it("sem brasão cadastrado, fica o ícone genérico", async () => {
    comTimbre(false)
    renderizar(<Sidebar aberta={false} onNavigate={() => {}} />)

    await screen.findByText("Entidade Atual")
    // Nem erro nem espaço vazio: a entidade pode simplesmente não ter subido
    // o brasão ainda.
    expect(document.querySelector('img[src^="blob:"]')).toBeNull()
  })
})
