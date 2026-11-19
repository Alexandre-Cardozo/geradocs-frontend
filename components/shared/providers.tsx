"use client"

import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react"

import { IconInfo } from "@/components/ui/icons"
import { AvisoDeLimiteDaIa } from "@/components/shared/aviso-de-limite-da-ia"
import { ehLimiteDaIa } from "@/lib/api/limite-da-ia"

/* ── TanStack Query ────────────────────────────────────────────────────────── */

/**
 * O cliente da aplicação. `aoAtingirOLimiteDaIa` é chamado quando qualquer
 * pedido à IA volta com o limite do plano esgotado (§109): os três pontos de
 * IA passam por mutações, e é aqui que o aviso deixa de depender de cada tela
 * lembrar de tratá-lo.
 */
export function makeQueryClient(aoAtingirOLimiteDaIa: () => void = () => undefined) {
  return new QueryClient({
    mutationCache: new MutationCache({
      onError: (erro) => {
        if (ehLimiteDaIa(erro)) aoAtingirOLimiteDaIa()
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  })
}

/* ── Toast (mock de ações indisponíveis nesta fase, confirmações etc.) ─────── */

const ToastContext = createContext<(msg: string) => void>(() => undefined)

export function useToast() {
  return useContext(ToastContext)
}

export function Providers({ children }: { children: ReactNode }) {
  const [limiteDaIa, setLimiteDaIa] = useState(false)
  // O botão não desliga depois do aviso: o clique seguinte abre o aviso de
  // novo, e quando o limite for renovado a IA volta a responder (§109).
  const [queryClient] = useState(() => makeQueryClient(() => setLimiteDaIa(true)))
  const [toast, setToast] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const showToast = useCallback((msg: string) => {
    setToast(msg)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(null), 3200)
  }, [])

  const value = useMemo(() => showToast, [showToast])

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContext.Provider value={value}>
        {children}
        {limiteDaIa && <AvisoDeLimiteDaIa onFechar={() => setLimiteDaIa(false)} />}
        {toast && (
          <div
            role="status"
            className="fixed right-6 bottom-6 z-100 flex items-center gap-2.5 rounded-xl border border-on-dark-border bg-navy px-4.5 py-3 text-base font-medium text-on-dark max-xs:right-4 max-xs:bottom-4 max-xs:left-4"
          >
            <span className="flex text-electric">
              <IconInfo size={16} />
            </span>
            {toast}
          </div>
        )}
      </ToastContext.Provider>
    </QueryClientProvider>
  )
}
