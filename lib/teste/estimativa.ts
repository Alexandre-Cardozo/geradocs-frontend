import { HttpResponse, http } from "msw"

import { processoApi } from "@/lib/teste/fixtures-api"
import { urlDaApi } from "@/lib/teste/handlers"
import { servidor } from "@/lib/teste/servidor-msw"

/**
 * O processo que guarda a estimativa de valor (ADR-051 do back-end): o `PUT`
 * grava, e a leitura seguinte devolve o que foi gravado.
 *
 * @returns os corpos de cada `PUT`, na ordem — para o teste conferir o que a
 *          tela mandou gravar
 */
export function comEstimativaQueGrava(
  inicial: Record<string, unknown> = {},
  processo: Record<string, unknown> = {},
) {
  let estimativa: Record<string, unknown> = inicial
  const gravadas: Array<Record<string, unknown>> = []
  servidor.use(
    http.get(`${urlDaApi}/procurement-processes/:id`, () =>
      HttpResponse.json({ ...processoApi, ...processo, ...estimativa }),
    ),
    http.put(`${urlDaApi}/procurement-processes/:id/price-estimation`, async ({ request }) => {
      const corpo = (await request.json()) as { method: string | null; source: string | null }
      gravadas.push(corpo)
      estimativa = { priceEstimationMethod: corpo.method, priceResearchSource: corpo.source }
      return HttpResponse.json({ ...processoApi, ...processo, ...estimativa })
    }),
  )
  return gravadas
}
