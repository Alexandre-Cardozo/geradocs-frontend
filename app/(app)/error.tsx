"use client"

import { ErrorState } from "@/components/shared/estados"

export default function ErroApp({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="w-full p-4 sm:p-5 lg:p-7">
      <div className="rounded-card border border-border bg-surface">
        <ErrorState message={error.message} onRetry={reset} />
      </div>
    </div>
  )
}
