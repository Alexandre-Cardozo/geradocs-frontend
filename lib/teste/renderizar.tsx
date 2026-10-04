import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, type RenderOptions } from "@testing-library/react"
import type { ReactElement, ReactNode } from "react"

/**
 * Renderiza com os provedores que a aplicação usa. `retry: false` é essencial:
 * com o padrão do TanStack Query, um teste de erro esperaria três tentativas e
 * falharia por timeout em vez de falhar pelo motivo certo.
 */
function Provedores({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

export function renderizar(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  return render(ui, { wrapper: Provedores, ...options })
}

/**
 * Acha o texto mesmo quando a tela o parte em vários nós — a senha provisória,
 * por exemplo, aparece em blocos de quatro. Casa com o elemento mais interno
 * cujo texto inteiro é exatamente o procurado.
 */
export function porTextoInteiro(texto: string) {
  return (_: string, elemento: Element | null) =>
    elemento?.textContent === texto &&
    !Array.from(elemento.children).some((filho) => filho.textContent === texto)
}

export * from "@testing-library/react"
export { default as userEvent } from "@testing-library/user-event"
