import { HttpResponse, http } from "msw"
import { describe, expect, it } from "vitest"

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

function plano(ano: number, itens = 247) {
  return {
    year: ano,
    sourceFileName: `pca-${ano}.csv`,
    importedAt: "2026-08-22T12:00:00-03:00",
    indexedItems: itens,
  }
}

function arquivoCsv(nome = "pca-2026.csv") {
  return new File(["2026-0142;Papel A4 75 g/m2;RESMA;1.200;28.800,00"], nome, {
    type: "text/csv",
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
    // "importado em" só existe na linha.
    expect(
      screen.getByText(new RegExp(`pca-${EXERCICIO}\\.csv · importado em`)),
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

  it("importar sobre um exercício que já tem plano avisa antes do clique", async () => {
    comPlanos([plano(EXERCICIO)])
    renderizar(<ImportarPca anos={ANOS} />)

    expect(
      await screen.findByText(new RegExp(`Já existe um PCA de ${EXERCICIO}`)),
    ).toBeInTheDocument()
    expect(screen.getByText(/substitui o plano desse exercício por inteiro/)).toBeInTheDocument()
  })

  it("o botão só libera com arquivo, e diz o que falta enquanto não há", async () => {
    semPlano()
    renderizar(<ImportarPca anos={ANOS} />)

    const importar = await screen.findByRole("button", { name: "Importar e indexar" })
    expect(importar).toBeDisabled()
    expect(importar).toHaveAttribute("aria-describedby")
  })

  it("envia o conteúdo do arquivo, e não só o nome", async () => {
    semPlano()
    let corpo: Record<string, unknown> | undefined
    servidor.use(
      http.post(`${urlDaApi}/pca-plan`, async ({ request }) => {
        corpo = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(plano(EXERCICIO, 1))
      }),
    )
    renderizar(<ImportarPca anos={ANOS} />)

    await userEvent.upload(
      await screen.findByLabelText("Arquivo CSV do PCA"),
      arquivoCsv(),
    )
    await userEvent.click(screen.getByRole("button", { name: "Importar e indexar" }))

    // Mandar só o nome deixaria a plataforma dizendo "indexado" sobre um
    // arquivo que ela nunca leu.
    await waitFor(() =>
      expect(corpo).toEqual({
        year: EXERCICIO,
        fileName: "pca-2026.csv",
        content: "2026-0142;Papel A4 75 g/m2;RESMA;1.200;28.800,00",
      }),
    )
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

    await userEvent.upload(
      await screen.findByLabelText("Arquivo CSV do PCA"),
      arquivoCsv(),
    )
    await userEvent.click(screen.getByRole("button", { name: "Importar e indexar" }))

    // Sem a linha, a pessoa procura sozinha o erro em uma planilha de 400 itens.
    expect(await screen.findByText(/Linha 2/)).toBeInTheDocument()
  })

  it("diz que só lê CSV, em vez de aceitar PDF e mentir que leu", async () => {
    semPlano()
    renderizar(<ImportarPca anos={ANOS} />)

    expect(await screen.findByText(/PDF e XLSX ainda não são lidos/)).toBeInTheDocument()
    expect(screen.getByLabelText("Arquivo CSV do PCA")).toHaveAttribute(
      "accept",
      ".csv,text/csv",
    )
  })
})
