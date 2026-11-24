import Link from "next/link"

import { ROTA_PAINEL } from "@/lib/auth/acesso"

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-ice p-7">
      <div className="mb-3 flex size-12 items-center justify-center rounded-card text-surface gradient-brand">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      </div>
      <h1 className="m-0 font-display text-2xl font-extrabold tracking-tight text-text-1">Página Não Encontrada</h1>
      <p className="m-0 max-w-[420px] text-center text-md text-text-3">
        O endereço acessado não existe ou foi movido. Verifique o número do processo ou volte ao início.
      </p>
      {/* A raiz é a página da GovPro (§126): quem chega pelo site volta a ela; quem usa o sistema vai ao painel. */}
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        <Link
          href="/"
          className="inline-flex h-10 items-center rounded-md bg-royal px-5 text-md font-semibold text-surface no-underline transition-colors hover:bg-royal-hover"
        >
          Ir para o Início
        </Link>
        <Link
          href={ROTA_PAINEL}
          className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-5 text-md font-semibold text-text-1 no-underline transition-colors hover:bg-ice"
        >
          Ir para o Painel
        </Link>
      </div>
    </div>
  )
}
