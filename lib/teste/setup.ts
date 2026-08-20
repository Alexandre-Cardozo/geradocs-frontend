import "@testing-library/jest-dom/vitest"

import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, vi } from "vitest"

import { servidor } from "@/lib/teste/servidor-msw"

// A API de teste é sempre esta; fixá-la evita que um teste dependa do .env local.
process.env.NEXT_PUBLIC_API_URL = "http://localhost:8080/api/v1"

// `onUnhandledRequest: "error"` é deliberado: requisição não declarada em handler
// é defeito de teste, não ruído. Sem isso, um endpoint errado passa despercebido
// e o teste "passa" batendo em lugar nenhum.
beforeAll(() => servidor.listen({ onUnhandledRequest: "error" }))

afterEach(() => {
  servidor.resetHandlers()
  cleanup()
  vi.restoreAllMocks()
})

afterAll(() => servidor.close())
