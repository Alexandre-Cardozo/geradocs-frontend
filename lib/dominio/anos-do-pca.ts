/**
 * Os exercícios que o PCA pode receber na importação (§116).
 *
 * <p>A faixa é fixa, de 2025 a 2050, em ordem crescente. Antes eram o ano
 * vigente e os três anteriores, e o plano do ano seguinte (o de 2027, que o
 * órgão prepara em 2026) não tinha como entrar. O servidor aceita de 2021 a
 * 2100 (`pca_plans_year_ck`), então a faixa daqui cabe nele.
 */
export const PRIMEIRO_ANO_DO_PCA = 2025
export const ULTIMO_ANO_DO_PCA = 2050

export function anosDoPca(): { value: string; label: string }[] {
  return Array.from({ length: ULTIMO_ANO_DO_PCA - PRIMEIRO_ANO_DO_PCA + 1 }, (_, i) => {
    const ano = String(PRIMEIRO_ANO_DO_PCA + i)
    return { value: ano, label: ano }
  })
}
