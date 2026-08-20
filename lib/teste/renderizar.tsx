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

export * from "@testing-library/react"
export { default as userEvent } from "@testing-library/user-event"
