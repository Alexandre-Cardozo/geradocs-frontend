import { expect, test } from "@playwright/test";

import { comProcessoEDocumento, comSessao, processo, rota } from "./api";

/**
 * A dispensa da seção sobrevive ao salvamento.
 *
 * <p>O `PUT` da seção troca o par (texto, justificativa). Salvar depois de
 * dispensar mandava a justificativa vazia e **apagava a dispensa** — no clique
 * seguinte, em silêncio: a seção voltava a "não iniciada" e o progresso caía.
 * Não aparece em teste de componente: precisa do servidor guardando o que
 * recebeu.
 */
const API = "**/api/v1";

/** O documento como o servidor o guarda, para o `PUT` valer de verdade. */
async function comDocumentoQueGuarda(page: import("@playwright/test").Page) {
  const secoes = new Map<string, { content: string; justification: string | null; status: string | null }>([
    ["1", { content: "", justification: null, status: null }],
    ["3", { content: "", justification: null, status: null }],
    // Uma terceira para a 3 não ser a última: na última o botão é o de gerar.
    ["5", { content: "", justification: null, status: null }],
  ]);
  const documento = () => ({
    id: "5c4d3e2f-1111-4222-8333-444455556666",
    processId: processo.id,
    documentType: "ETP",
    currentVersion: 0,
    finalized: false,
    progress: 0,
    canGenerate: false,
    sections: [...secoes.entries()].map(([code, secao], i) => ({
      sectionCode: code,
      position: i + 1,
      title: `Seção ${code} do ETP`,
      legalBasis: `Art. 18, § 1º, ${code}, Lei 14.133/21`,
      hint: "Demonstre o que a seção pede.",
      // A 3 é dispensável; a 1 é indispensável, e não admite dispensa.
      required: code === "1",
      content: secao.content,
      dispensationJustification: secao.justification,
      resolved: secao.content !== "" || secao.justification !== null,
    })),
    pendingRequiredSections: [],
    silentGaps: [],
    body: [],
  });
  await page.route(`${API}/procurement-processes/*/documents/*`, (rota) => rota.fulfill({ json: documento() }));
  await page.route(`${API}/procurement-processes/*/documents/*/sections/*`, async (rota) => {
    const corpo = rota.request().postDataJSON() as {
      content?: string;
      dispensationJustification?: string | null;
      status?: string;
    };
    const codigo = new URL(rota.request().url()).pathname.split("/").pop() ?? "1";
    secoes.set(codigo, {
      content: corpo.content ?? "",
      justification: corpo.dispensationJustification ?? null,
      // Guardado porque é o que separa os dois botões: só "Salvar e Avançar"
      // declara a seção concluída.
      status: corpo.status ?? null,
    });
    await rota.fulfill({ json: documento() });
  });
  return secoes;
}

async function dispensar(page: import("@playwright/test").Page, tipo = "etp") {
  await page.goto(rota(`/processos/documento?id=${processo.id}&tipo=${tipo}`));
  await page
    .getByRole("button", { name: /Seção 3 do ETP/ })
    .first()
    .click();
  await page.getByRole("button", { name: /Dispensar esta seção/ }).click();
  await page.getByLabel(/Por que esta seção é dispensada/).fill("Não se aplica a esta contratação.");
  await page.getByRole("button", { name: "Registrar dispensa" }).click();
  await expect(page.getByText(/Seção dispensada/)).toBeVisible();
}

test.describe("dispensa de seção", () => {
  test("continua registrada depois de salvar", async ({ page }) => {
    await comSessao(page);
    await comProcessoEDocumento(page);
    const secoes = await comDocumentoQueGuarda(page);
    await dispensar(page);

    await page.getByRole("button", { name: /Salvar Rascunho/ }).click();
    await expect(page.getByText(/Seção dispensada/)).toBeVisible();

    // No servidor, e não só na tela: recarregar traz a mesma coisa.
    expect(secoes.get("3")?.justification).toBe("Não se aplica a esta contratação.");
  });

  test("continua registrada depois de salvar e avançar", async ({ page }) => {
    await comSessao(page);
    await comProcessoEDocumento(page);
    const secoes = await comDocumentoQueGuarda(page);
    await dispensar(page);

    await page.getByRole("button", { name: /Salvar e Avançar/ }).click();
    await page.waitForTimeout(400);

    expect(secoes.get("3")?.justification).toBe("Não se aplica a esta contratação.");
  });

  /*
    O Contrato entra aqui de propósito. A dispensa, o "Salvar Rascunho", a etapa
    final e a troca de seção moram no editor — que é um só para os seis
    documentos —, mas isso era conclusão de leitura de código, não de teste: toda
    a suíte exercitava o ETP. O Contrato tem três seções dispensáveis (matriz de
    riscos, subcontratação, proteção de dados) e nenhum painel, de modo que o
    caminho genérico vai coberto de verdade.
  */
  test("continua registrada em documento sem painel — o Contrato", async ({ page }) => {
    await comSessao(page);
    await comProcessoEDocumento(page);
    const secoes = await comDocumentoQueGuarda(page);
    await dispensar(page, "contrato");

    await page.getByRole("button", { name: /Salvar Rascunho/ }).click();
    await expect(page.getByText(/Seção dispensada/)).toBeVisible();

    expect(secoes.get("3")?.justification).toBe("Não se aplica a esta contratação.");
  });

  test("escrever na seção desfaz a dispensa — é o que escrever significa", async ({ page }) => {
    await comSessao(page);
    await comProcessoEDocumento(page);
    const secoes = await comDocumentoQueGuarda(page);
    await dispensar(page);

    await page.getByRole("button", { name: /Desfazer dispensa/ }).click();
    await page.getByPlaceholder("Preencha o conteúdo desta seção...").fill("Requisitos técnicos.");
    await page.getByRole("button", { name: /Salvar Rascunho/ }).click();
    await page.waitForTimeout(400);

    expect(secoes.get("3")).toEqual({
      content: "Requisitos técnicos.",
      justification: null,
      status: null,
    });
  });
});

/**
 * Trocar de seção não descarta o que estava escrito.
 *
 * <p>O rascunho da tela é recarregado da seção de destino: sem gravar antes,
 * clicar na trilha apagava em silêncio o parágrafo recém-digitado. Guarda como
 * rascunho — "Completo" é o que só "Salvar e Avançar" declara.
 */
test.describe("troca de seção", () => {
  for (const tipo of ["etp", "contrato"]) {
    test(`guarda o texto que ainda não tinha sido salvo — ${tipo}`, async ({ page }) => {
      await comSessao(page);
      await comProcessoEDocumento(page);
      const secoes = await comDocumentoQueGuarda(page);

      await page.goto(rota(`/processos/documento?id=${processo.id}&tipo=${tipo}`));
      await page
        .getByRole("button", { name: /Seção 3 do ETP/ })
        .first()
        .click();
      await page
        .getByPlaceholder("Preencha o conteúdo desta seção...")
        .fill("Requisitos da contratação, ainda em rascunho.");
      await page
        .getByRole("button", { name: /Seção 5 do ETP/ })
        .first()
        .click();
      await page.waitForTimeout(400);

      expect(secoes.get("3")?.content).toBe("Requisitos da contratação, ainda em rascunho.");
      // Rascunho, e não seção concluída: "Completo" é o que só "Salvar e
      // Avançar" declara — é nisso que os dois botões diferem.
      expect(secoes.get("3")?.status).toBeNull();

      // E volta na tela: é o mesmo texto, não uma seção em branco.
      await page
        .getByRole("button", { name: /Seção 3 do ETP/ })
        .first()
        .click();
      await expect(page.locator("main textarea")).toHaveValue("Requisitos da contratação, ainda em rascunho.");
    });
  }
});
