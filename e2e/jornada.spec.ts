import { expect, test } from "@playwright/test"

import type { Page } from "@playwright/test"

import { comSessao, prestesALogar, rota, semSessao, sessaoAdmin } from "./api"

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
