import "@testing-library/jest-dom/vitest"

import { Blob as NodeBlob, File as NodeFile } from "node:buffer"

import { cleanup } from "@testing-library/react"
import { afterAll, afterEach, beforeAll, vi } from "vitest"

import { servidor } from "@/lib/teste/servidor-msw"

/**
 * `Blob`, `File` e `FormData` do Node, e não os do jsdom.
 *
 * O `fetch` do ambiente é o do Node (undici), e ele reconhece corpo multipart
 * pelas classes dele. Com as do jsdom no lugar, um `FormData` com arquivo não
 * chega a virar requisição: o envio fica pendurado até o teste estourar o
 * tempo. Foi o que aconteceu quando o anexo do DFD passou a levar o arquivo
 * (ADR-028) — e a suíte inteira de JSON continuava verde, porque só o multipart
 * depende disso.
 *
 * `FormData` vai junto, e não sozinha: a do jsdom só aceita um `Blob` do jsdom,
 * e converte qualquer outro para a string `"[object Blob]"`. A parte chegaria ao
 * servidor como texto, sem tipo — e o teste passaria a afirmar algo que o
 * navegador não faz.
 *
 * A `FormData` do Node não está mais acessível por nome — o jsdom tomou o
 * global —, mas continua sendo a que o `Response` devolve. Buscá-la por ali é
 * mais honesto do que instalar uma segunda cópia do `undici`: a cópia do npm é
 * *outra* classe, e o `fetch` embutido não a reconheceria.
 */
const NodeFormData = (await new Response("--x--\r\n", {
  headers: { "content-type": "multipart/form-data; boundary=x" },
}).formData()).constructor as typeof FormData

Object.defineProperties(globalThis, {
  Blob: { value: NodeBlob, writable: true, configurable: true },
  File: { value: NodeFile, writable: true, configurable: true },
  FormData: { value: NodeFormData, writable: true, configurable: true },
})

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
