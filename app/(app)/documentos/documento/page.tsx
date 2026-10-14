import { Suspense } from "react"

import ClientPage from "./ClientPage"

export default function Page() {
  return (
    <Suspense>
      <ClientPage />
    </Suspense>
  )
}
