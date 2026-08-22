import { expect, test } from "@playwright/test"

import type { Page } from "@playwright/test"

import {
  comProcessoEDocumento,
  comSessao,
  prestesALogar,
  processo,
  rota,
  semSessao,
  sessaoAdmin,
} from "./api"

/**
 * O menu aparece em mais de um lugar no DOM (barra fixa no desktop, gaveta no
 * celular, atalhos no painel). Sem escopo, o seletor encontra três elementos e
 * o teste falha por ambiguidade, não por defeito.
 */
const menuLateral = (page: Page) => page.getByRole("navigation").first()

test.describe("guarda de sessão", () => {
  test("sem sessão, qualquer rota do app leva ao login", async ({ page }) => {
    await semSessao(page)

    await page.goto(rota("/processos"))

    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByPlaceholder("000.000.000-00")).toBeVisible()
  })

  test("credencial inválida não revela se a conta existe", async ({ page }) => {
    await semSessao(page)
    await page.goto(rota("/login"))

    await page.getByPlaceholder("000.000.000-00").fill("333.333.333-33")
    await page.getByPlaceholder("Sua senha").fill("senha-errada")
    await page.getByRole("button", { name: "Entrar" }).click()

    // A mensagem é genérica de propósito: dizer "usuário não encontrado"
    // transformaria a tela em oráculo de quem tem conta.
    await expect(page.getByText(/CPF ou senha inválida/i)).toBeVisible()
    await expect(page).toHaveURL(/\/login$/)
  })

  test("com credencial válida, entra e chega ao painel", async ({ page }) => {
    await prestesALogar(page)
    await page.goto(rota("/login"))

    await page.getByPlaceholder("000.000.000-00").fill("333.333.333-33")
    await page.getByPlaceholder("Sua senha").fill("UmaSenhaSegura!2026")
    await page.getByRole("button", { name: "Entrar" }).click()

    await expect(page).not.toHaveURL(/\/login$/)
    await expect(menuLateral(page).getByRole("link", { name: "Processos" })).toBeVisible()
  })

  test("backend fora do ar mostra o motivo, não uma tela quebrada", async ({ page }) => {
    await page.route("**/api/v1/**", (rota) => rota.abort("failed"))

    await page.goto(rota("/"))

    await expect(page.getByText(/Servidor Indisponível|CPF/i).first()).toBeVisible()
  })
})

test.describe("navegação por perfil", () => {
  test("o servidor vê processos e documentos", async ({ page }) => {
    await comSessao(page)

    await page.goto(rota("/"))

    await expect(menuLateral(page).getByRole("link", { name: "Processos" })).toBeVisible()
    await expect(menuLateral(page).getByRole("link", { name: "Documentos" })).toBeVisible()
    await expect(menuLateral(page).getByRole("link", { name: "Prefeituras" })).toHaveCount(0)
  })

  test("o administrador geral vê a área do sistema, não a de processos", async ({ page }) => {
    await comSessao(page, sessaoAdmin)

    await page.goto(rota("/"))

    await expect(menuLateral(page).getByRole("link", { name: "Prefeituras" })).toBeVisible()
    await expect(menuLateral(page).getByRole("link", { name: "Servidores" })).toBeVisible()
    await expect(menuLateral(page).getByRole("link", { name: "Processos" })).toHaveCount(0)
  })

  test("rota fora do perfil devolve para a raiz", async ({ page }) => {
    await comSessao(page)

    await page.goto(rota("/admin/prefeituras"))

    // O RBAC de rota é conveniência de interface — quem barra de verdade é o
    // backend —, mas mostrar a tela e depois falhar seria pior que não mostrar.
    await expect(page).toHaveURL(/GeraDocsFrontend\/?$/)
  })
})

test.describe("recarregar a página não perde a sessão", () => {
  test("a rota profunda continua funcionando depois do reload", async ({ page }) => {
    await comSessao(page)
    await page.goto(rota("/processos"))

    await page.reload()

    // É o reload que prova que a renovação de token funcionou: o access token
    // vive só em memória e some a cada recarga.
    await expect(page).toHaveURL(/\/processos/)
    await expect(menuLateral(page).getByRole("link", { name: "Processos" })).toBeVisible()
  })
})

test.describe("elaboração do ETP", () => {
  /**
   * A jornada que o Bloco 9 destravou: o processo e o documento vivem no
   * servidor, e o que a pessoa escreve sobrevive ao recarregamento.
   *
   * Era a limitação registrada na ADR 22 — criar um processo e perdê-lo ao
   * recarregar a página. Este teste existe para que ela não volte.
   */
  test("o processo aparece na listagem e o ETP abre com o catálogo", async ({ page }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)

    await page.goto(rota("/processos"))

    await expect(page.getByText(processo.objectDescription)).toBeVisible()
  })

  test("o texto escrito no ETP sobrevive ao recarregamento", async ({ page }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)

    await page.goto(
      rota(`/processos/documento?id=${encodeURIComponent(processo.id)}&tipo=etp`),
    )
    const editor = page.getByPlaceholder("Preencha o conteúdo desta seção...")
    await expect(editor).toBeVisible()
    await editor.fill("Necessidade descrita pela secretaria.")
    await page.getByRole("button", { name: /^Salvar$/ }).click()

    await page.reload()

    // É o ponto do bloco: o que foi escrito está no servidor, não na memória do
    // navegador.
    await expect(page.getByText("Necessidade descrita pela secretaria.")).toBeVisible()
  })

  test("o item previsto no PCA é citado na seção do inciso II, e o não previsto só alerta", async ({
    page,
  }) => {
    await comSessao(page)
    await comProcessoEDocumento(page)

    await page.goto(
      rota(`/processos/documento?id=${encodeURIComponent(processo.id)}&tipo=etp`),
    )
    await page.getByRole("button", { name: /Seção 2 do ETP/ }).first().click()

    // O que a plataforma encontrou aparece com o item — demonstrar é apontar.
    await expect(page.getByText(/2026-0142/).first()).toBeVisible()
    await expect(page.getByText(/247 itens indexados/)).toBeVisible()

    // O que não está no plano orienta e deixa seguir: o botão continua ativo.
    await expect(page.getByText(/Um item não consta do plano/)).toBeVisible()
    const citar = page.getByRole("button", { name: "Citar na seção" })
    await expect(citar).toBeEnabled()

    await citar.click()
    await page.reload()
    await page.getByRole("button", { name: /Seção 2 do ETP/ }).first().click()

    // A citação está no documento, e a justificativa do que ficou de fora está
    // visível entre colchetes, em vez de sumir.
    await expect(page.getByText(/Item 2026-0142/).first()).toBeVisible()
    await expect(
      page.getByText(/\[justificar a contratação não prevista no Plano de Contratações Anual\]/),
    ).toBeVisible()
  })
})
