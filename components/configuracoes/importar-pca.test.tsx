import { HttpResponse, http } from "msw"
import { describe, expect, it, vi } from "vitest"

import { ImportarPca } from "@/components/configuracoes/importar-pca"
import { urlDaApi } from "@/lib/teste/handlers"
import { renderizar, screen, userEvent, waitFor } from "@/lib/teste/renderizar"
import { servidor } from "@/lib/teste/servidor-msw"
import { anoBrasilia } from "@/lib/format"

/**
 * Anexar o PCA do órgão.
 *
 * O que a tela promete é o que a plataforma faz: itens **indexados**, e não
 * "arquivo carregado com sucesso". Enquanto só CSV é lido, é isso que a tela
 * aceita — dizer que leu um PDF seria afirmar ter lido o que ninguém leu.
 *
 * Os anos saem de `anoBrasilia()`, e não de constantes: o exercício corrente é o
 * de hoje, e uma suíte que fixa "2026" começa a mentir em 1º de janeiro.
 */
const EXERCICIO = anoBrasilia()
const ANOS = [
  { value: String(EXERCICIO), label: String(EXERCICIO) },
  { value: String(EXERCICIO - 1), label: String(EXERCICIO - 1) },
]

function comPlanos(planos: unknown[]) {
  servidor.use(http.get(`${urlDaApi}/pca-plans`, () => HttpResponse.json(planos)))
}

function semPlano() {
  comPlanos([])
}

function plano(ano: number, itens = 247, arquivoGuardado = true) {
  return {
    year: ano,
    sourceFileName: `pca-${ano}.csv`,
    importedAt: "2026-08-22T12:00:00-03:00",
    indexedItems: itens,
    importedBy: "Maria Costa Andrade",
    fileStored: arquivoGuardado,
  }
}

function arquivoCsv(nome = "pca-2026.csv") {
  return new File(["2026-0142;Papel A4 75 g/m2;RESMA;1.200;28.800,00"], nome, {
    type: "text/csv",
  })
}

function arquivoXlsx(nome = "pca-2026.xlsx") {
  return new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], nome, {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

describe("importar o PCA do órgão", () => {
  it("sem plano, diz o que isso custa em vez de fingir que há um", async () => {
    semPlano()
    renderizar(<ImportarPca anos={ANOS} />)

    expect(await screen.findByText(/Nenhum PCA importado ainda/)).toBeInTheDocument()
    expect(screen.getByText(/informar o item à mão/)).toBeInTheDocument()
  })

  it("mostra o plano pelo número que importa: itens indexados", async () => {
    comPlanos([plano(EXERCICIO)])
    renderizar(<ImportarPca anos={ANOS} />)

    expect(await screen.findByText("247 itens indexados")).toBeInTheDocument()
    // O nome do arquivo aparece na linha do plano e no aviso de substituição;
    // "importado por … em" com o nome de quem importou só existe na linha.
    expect(
      screen.getByText(new RegExp(`pca-${EXERCICIO}\\.csv · importado por Maria Costa Andrade em`)),
    ).toBeInTheDocument()
    expect(screen.getByText("Exercício corrente")).toBeInTheDocument()
  })

  it("lista um plano por exercício, do mais recente ao mais antigo", async () => {
    comPlanos([plano(EXERCICIO), plano(EXERCICIO - 1, 180)])
    renderizar(<ImportarPca anos={ANOS} />)

    expect(await screen.findByText(`PCA ${EXERCICIO}`)).toBeInTheDocument()
    expect(screen.getByText(`PCA ${EXERCICIO - 1}`)).toBeInTheDocument()
    // Só o do ano corrente leva a marca: os anteriores continuam valendo para os
    // processos daqueles anos, e não para os de hoje.
    expect(screen.getAllByText("Exercício corrente")).toHaveLength(1)
  })

  it("com plano só de exercício anterior, avisa que o ano corrente está descoberto", async () => {
    comPlanos([plano(EXERCICIO - 1)])
    renderizar(<ImportarPca anos={ANOS} />)

    // O PCA de um exercício descreve o que o órgão pretende contratar naquele
    // ano: ter o do ano passado não cobre um processo aberto hoje, e descobrir
    // isso processo a processo, no painel do inciso II, é tarde demais.
    expect(
      await screen.findByText(new RegExp(`Não há PCA de ${EXERCICIO}`)),
    ).toBeInTheDocument()
  })

  it("importar sobre um exercício que já tem plano avisa antes do clique, e diz que fica registrado", async () => {
    comPlanos([plano(EXERCICIO)])
    renderizar(<ImportarPca anos={ANOS} />)

    expect(
      await screen.findByText(new RegExp(`Já existe um PCA de ${EXERCICIO}`)),
    ).toBeInTheDocument()
    expect(screen.getByText(/substitui o plano desse exercício por inteiro/)).toBeInTheDocument()
    // Substituir é permitido; o que não pode é ser silencioso.
    expect(screen.getByText(/trilha do órgão com o arquivo que saiu e o que entrou/))
      .toBeInTheDocument()
  })

  it("o botão só libera com arquivo, e diz o que falta enquanto não há", async () => {
    semPlano()
    renderizar(<ImportarPca anos={ANOS} />)

    const importar = await screen.findByRole("button", { name: "Importar e indexar" })
    expect(importar).toBeDisabled()
    expect(importar).toHaveAttribute("aria-describedby")
  })

  it("envia o arquivo como veio, e o exercício na consulta", async () => {
    semPlano()
    let enviado: File | null = null
    let exercicio: string | null = null
    servidor.use(
      http.post(`${urlDaApi}/pca-plan`, async ({ request }) => {
        exercicio = new URL(request.url).searchParams.get("year")
        enviado = (await request.formData()).get("file") as File
        return HttpResponse.json(plano(EXERCICIO, 1))
      }),
    )
    renderizar(<ImportarPca anos={ANOS} />)

    await userEvent.upload(await screen.findByLabelText("Planilha do PCA"), arquivoCsv())
    await userEvent.click(screen.getByRole("button", { name: "Importar e indexar" }))

    // Mandar só o nome deixaria a plataforma dizendo "indexado" sobre um arquivo
    // que ela nunca leu; ler o conteúdo aqui quebraria o XLSX, que é binário.
    await waitFor(() => expect(exercicio).toBe(String(EXERCICIO)))
    expect(enviado).not.toBeNull()
    expect((enviado as unknown as File).name).toBe("pca-2026.csv")
  })

  it("aceita XLSX, que é como a planilha costuma existir no órgão", async () => {
    semPlano()
    let enviado: File | null = null
    servidor.use(
      http.post(`${urlDaApi}/pca-plan`, async ({ request }) => {
        enviado = (await request.formData()).get("file") as File
        return HttpResponse.json({ ...plano(EXERCICIO, 1), sourceFileName: "pca-2026.xlsx" })
      }),
    )
    renderizar(<ImportarPca anos={ANOS} />)

    await userEvent.upload(await screen.findByLabelText("Planilha do PCA"), arquivoXlsx())
    await userEvent.click(screen.getByRole("button", { name: "Importar e indexar" }))

    await waitFor(() => expect(enviado).not.toBeNull())
    expect((enviado as unknown as File).name).toBe("pca-2026.xlsx")
  })

  it("o plano importado pode ser baixado", async () => {
    comPlanos([plano(EXERCICIO)])
    let pediu = false
    servidor.use(
      http.get(`${urlDaApi}/pca-plans/:ano/file`, () => {
        pediu = true
        return HttpResponse.text("2026-0142;Papel A4", {
          headers: { "Content-Type": "text/csv" },
        })
      }),
    )
    Object.assign(URL, { createObjectURL: vi.fn(() => "blob:pca"), revokeObjectURL: vi.fn() })
    renderizar(<ImportarPca anos={ANOS} />)

    await userEvent.click(await screen.findByRole("button", { name: /Baixar/ }))

    // Guardar o arquivo é o que permite conferir depois o que foi importado.
    await waitFor(() => expect(pediu).toBe(true))
  })

  it("plano sem arquivo guardado não oferece download", async () => {
    // Importado antes de a plataforma guardar a planilha: oferecer o download
    // prometeria um arquivo que não existe.
    comPlanos([plano(EXERCICIO, 247, false)])
    renderizar(<ImportarPca anos={ANOS} />)

    expect(await screen.findByText("Arquivo não guardado")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: /Baixar/ })).not.toBeInTheDocument()
  })

  it("arquivo recusado mostra a linha do problema, e não “formato inválido”", async () => {
    semPlano()
    servidor.use(
      http.post(`${urlDaApi}/pca-plan`, () =>
        HttpResponse.json(
          { detail: "Linha 2: esperado \"código;descrição;unidade;quantidade;valor\"." },
          { status: 400 },
        ),
      ),
    )
    renderizar(<ImportarPca anos={ANOS} />)

    await userEvent.upload(await screen.findByLabelText("Planilha do PCA"), arquivoCsv())
    await userEvent.click(screen.getByRole("button", { name: "Importar e indexar" }))

    // Sem a linha, a pessoa procura sozinha o erro em uma planilha de 400 itens.
    expect(await screen.findByText(/Linha 2/)).toBeInTheDocument()
  })

  it("diz o que lê, em vez de aceitar PDF e mentir que leu", async () => {
    semPlano()
    renderizar(<ImportarPca anos={ANOS} />)

    // A leitura é pelo cabeçalho: o plano municipal chega como planilha de
    // planejamento, e não na ordem de colunas que a plataforma inventaria.
    expect(await screen.findByText(/cabeçalho da primeira aba/)).toBeInTheDocument()
    expect(screen.getByText(/PDF não é lido/)).toBeInTheDocument()
    expect(screen.getByLabelText("Planilha do PCA").getAttribute("accept"))
      .toContain(".xlsx")
  })
})
