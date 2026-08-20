import { Suspense } from "react"

import RedefinirSenha from "./RedefinirSenha"

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RedefinirSenha />
    </Suspense>
  )
}
