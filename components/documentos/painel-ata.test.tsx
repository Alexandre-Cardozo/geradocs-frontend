import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

import { PainelATA } from "@/components/documentos/paineis"
import { documentoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"

const PROCESSO = documentoApi.processId

/** A resposta do servidor, com o que a IA leu na ATA; cada teste muda só o que importa para ele. */
function leitura(parte: Record<string, unknown> = {}) {
  return {
    managingBody: "Prefeitura Municipal de Cidade Exemplo",
    validityText: "30/11/2027",
    validityStatus: "VALID",
    validityDate: "2027-11-30",
    ataObject: "registro de preços para aquisição de material de expediente",
    compatibility: "PARTIAL",
    compatibilityReason: "Parte do objeto coincide com o do processo.",
    findings: [
      { kind: "ITEMS", text: "A ATA registra pasta suspensa marmorizada.", quote: "Item 3 - Pasta suspensa marmorizada" },
    ],
    textTruncated: false,
    ...parte,
  }
}

function comServidor(resposta: () => Response | Promise<Response>, ia = true) {
  const pedidos: { arquivo: string | null; tipo: string | null }[] = []
  servidor.use(
    http.get(`${urlDaApi}/ai/status`, () => HttpResponse.json({ available: ia })),
    http.post(`${urlDaApi}/procurement-processes/:id/ata-review`, async ({ request }) => {
      const arquivo = (await request.formData()).get("file") as File | null
      pedidos.push({ arquivo: arquivo?.name ?? null, tipo: request.headers.get("content-type") })
      return resposta()
    }),
  )
  return pedidos
}

async function anexarAta(nome = "ata.pdf") {
  renderizar(<PainelATA processoId={PROCESSO} />)
  await userEvent.click(screen.getByRole("button", { name: "Configurar ATA" }))
  await userEvent.click(screen.getByText("Anexar ATA para revisão pela IA"))
  const arquivo = new File(["%PDF-1.4"], nome, { type: "application/pdf" })
  await userEvent.upload(document.querySelector("input[type=file]") as HTMLInputElement, arquivo)
}

/**
 * Adesão a ATA: a IA lê a ATA anexada (ADR 119), e a tela mostra o que ela leu com o trecho que sustenta cada ponto.
 *
 * Antes a tela esperava 2,2 s e mostrava um parecer fixo ("ATA Válida", com órgão e vigência inventados). A leitura
 * agora vem do servidor, é apoio à conferência e nunca diz que a ATA é válida.
 */
describe("painel de adesão a ATA", () => {
  it("sem arquivo anexado não há botão de revisão", async () => {
    comServidor(() => HttpResponse.json(leitura()))
    renderizar(<PainelATA processoId={PROCESSO} />)
    await userEvent.click(screen.getByRole("button", { name: "Configurar ATA" }))
    await userEvent.click(screen.getByText("Anexar ATA para revisão pela IA"))

    expect(screen.queryByRole("button", { name: /Revisar a ATA com IA/ })).not.toBeInTheDocument()
  })

  it("manda o arquivo ao servidor e mostra a leitura: compatibilidade, vigência pela data, órgão, objeto e trechos", async () => {
    const pedidos = comServidor(() => HttpResponse.json(leitura()))
    await anexarAta()

    await userEvent.click(await screen.findByRole("button", { name: "Revisar a ATA com IA" }))

    expect(await screen.findByText("Objeto Parcialmente Compatível")).toBeInTheDocument()
    expect(screen.getByText("Parte do objeto coincide com o do processo.")).toBeInTheDocument()
    expect(screen.getByText(/A vigência declarada vai até 30\/11\/2027: ainda não terminou\./)).toBeInTheDocument()
    expect(screen.getByText(/Como a ATA escreve: 30\/11\/2027/)).toBeInTheDocument()
    expect(screen.getByText("Prefeitura Municipal de Cidade Exemplo")).toBeInTheDocument()
    expect(screen.getByText("registro de preços para aquisição de material de expediente")).toBeInTheDocument()
    expect(screen.getByText("Itens")).toBeInTheDocument()
    expect(screen.getByText("Item 3 - Pasta suspensa marmorizada")).toBeInTheDocument()
    // É apoio, e não parecer: a tela nunca diz que a ATA é válida.
    expect(screen.getByText(/Não é parecer jurídico/)).toBeInTheDocument()
    expect(screen.queryByText(/ATA Válida/)).not.toBeInTheDocument()
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0]?.arquivo).toBe("ata.pdf")
    expect(pedidos[0]?.tipo).toContain("multipart/form-data")
    expect(screen.getByRole("button", { name: "Revisar de Novo com IA" })).toBeInTheDocument()
  })

  it("ATA vencida pela data aparece como vencida, e vigência sem data legível manda conferir o documento", async () => {
    comServidor(() =>
      HttpResponse.json(leitura({ validityStatus: "EXPIRED", validityDate: "2025-02-28", validityText: "até 28/02/2025" })),
    )
    await anexarAta()
    await userEvent.click(await screen.findByRole("button", { name: "Revisar a ATA com IA" }))
    expect(await screen.findByText(/A vigência declarada terminou em 28\/02\/2025: a ATA está vencida\./)).toBeInTheDocument()

    comServidor(() =>
      HttpResponse.json(leitura({ validityStatus: "UNKNOWN", validityDate: undefined, validityText: undefined })),
    )
    await userEvent.click(screen.getByRole("button", { name: "Revisar de Novo com IA" }))
    expect(await screen.findByText(/Não há data de vigência legível/)).toBeInTheDocument()
    expect(screen.queryByText(/Como a ATA escreve/)).not.toBeInTheDocument()
  })

  it.each([
    ["COMPATIBLE", "Objeto Compatível"],
    ["INCOMPATIBLE", "Objeto Incompatível"],
    ["UNDETERMINED", "Compatibilidade Indeterminada"],
  ])("a conclusão %s aparece como %s", async (conclusao, rotulo) => {
    comServidor(() => HttpResponse.json(leitura({ compatibility: conclusao })))
    await anexarAta()
    await userEvent.click(await screen.findByRole("button", { name: "Revisar a ATA com IA" }))

    expect(await screen.findByText(rotulo)).toBeInTheDocument()
  })

  it("mostra todos os assuntos dos achados, sem órgão nem objeto quando a IA não os apontou, e avisa se a ATA foi cortada", async () => {
    comServidor(() =>
      HttpResponse.json(
        leitura({
          managingBody: undefined,
          ataObject: undefined,
          textTruncated: true,
          findings: [
            { kind: "VALIDITY", text: "a", quote: "trecho de vigência" },
            { kind: "OBJECT", text: "b", quote: "trecho de objeto" },
            { kind: "PRICES", text: "c", quote: "trecho de preços" },
            { kind: "OTHER", text: "d", quote: "trecho de outro" },
          ],
        }),
      ),
    )
    await anexarAta()
    await userEvent.click(await screen.findByRole("button", { name: "Revisar a ATA com IA" }))

    expect(await screen.findByText("Vigência")).toBeInTheDocument()
    expect(screen.getByText("Objeto")).toBeInTheDocument()
    expect(screen.getByText("Preços")).toBeInTheDocument()
    expect(screen.getByText("Outro Ponto")).toBeInTheDocument()
    expect(screen.queryByText(/Órgão gerenciador:/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Objeto da ATA:/)).not.toBeInTheDocument()
    expect(screen.getByText(/só o começo dela foi lido/)).toBeInTheDocument()
  })

  it("ATA sem achados mostra só a conclusão e a vigência", async () => {
    comServidor(() => HttpResponse.json(leitura({ findings: [] })))
    await anexarAta()
    await userEvent.click(await screen.findByRole("button", { name: "Revisar a ATA com IA" }))

    expect(await screen.findByText("Objeto Parcialmente Compatível")).toBeInTheDocument()
    expect(screen.queryByRole("list")).not.toBeInTheDocument()
  })

  it("remover o arquivo descarta a leitura, que valia para ele", async () => {
    comServidor(() => HttpResponse.json(leitura()))
    await anexarAta()
    await userEvent.click(await screen.findByRole("button", { name: "Revisar a ATA com IA" }))
    expect(await screen.findByText("Objeto Parcialmente Compatível")).toBeInTheDocument()

    await userEvent.click(screen.getByRole("button", { name: "Remover arquivo" }))

    expect(screen.queryByText("Objeto Parcialmente Compatível")).not.toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Revisar/ })).not.toBeInTheDocument()
  })

  it("quando o servidor recusa a ATA, a mensagem dele aparece e nenhuma leitura é mostrada", async () => {
    comServidor(() =>
      HttpResponse.json(
        { title: "Regra de negócio inválida", detail: "A ATA não tem texto que a plataforma consiga ler.", code: "BUSINESS_RULE_VIOLATION" },
        { status: 400 },
      ),
    )
    await anexarAta()
    await userEvent.click(await screen.findByRole("button", { name: "Revisar a ATA com IA" }))

    expect(await screen.findByText(/A ATA não tem texto que a plataforma consiga ler\./)).toBeInTheDocument()
    expect(screen.queryByText(/Objeto Compatível|Parcialmente|Incompatível|Indeterminada/)).not.toBeInTheDocument()
  })

  it("com o limite do plano esgotado, a linha de erro não repete o aviso, que abre sozinho (§109)", async () => {
    comServidor(() =>
      HttpResponse.json(
        { title: "Limite", detail: "O orçamento de IA da organização já foi consumido neste período.", code: "AI_BUDGET_EXHAUSTED" },
        { status: 402 },
      ),
    )
    await anexarAta()
    await userEvent.click(await screen.findByRole("button", { name: "Revisar a ATA com IA" }))

    await waitFor(() => expect(screen.getByRole("button", { name: "Revisar a ATA com IA" })).toBeEnabled())
    expect(screen.queryByText(/orçamento de IA da organização já foi consumido/)).not.toBeInTheDocument()
  })

  it("sem IA disponível o botão fica desligado e diz por quê", async () => {
    comServidor(() => HttpResponse.json(leitura()), false)
    await anexarAta()

    const botao = await screen.findByRole("button", { name: "Revisar a ATA com IA" })
    await waitFor(() => expect(botao).toBeDisabled())
    expect(botao).toHaveAccessibleDescription("Nenhum modelo de IA configurado nesta instalação.")
  })
})
