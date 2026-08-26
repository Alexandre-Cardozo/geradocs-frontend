import { HttpResponse, http } from "msw"

import { autenticacao, documentoApi, geracaoApi, processoApi, sessaoServidor } from "@/lib/teste/fixtures-api"

const API = "http://localhost:8080/api/v1"

/** Caminho feliz. Cada teste sobrescreve o que precisa com `servidor.use`. */
export const handlers = [
  http.post(`${API}/auth/login`, () => HttpResponse.json(autenticacao)),
  http.post(`${API}/auth/refresh`, () => HttpResponse.json(autenticacao)),
  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${API}/me`, () => HttpResponse.json(sessaoServidor)),
  http.post(`${API}/auth/password-recovery`, () => new HttpResponse(null, { status: 202 })),
  http.post(`${API}/auth/password-reset`, () => new HttpResponse(null, { status: 204 })),

  // Sem modelo de IA, que é o padrão da instalação e o que roda hoje. Um teste
  // que queira o contrário troca este handler — mas o caminho feliz é a
  // plataforma inteira funcionando sem assistência nenhuma (ADR-029).
  http.get(`${API}/ai/status`, () => HttpResponse.json({ available: false })),

  // Processos e elaboração de documento — o caminho feliz. Cada teste
  // sobrescreve o que precisa com `servidor.use`.
  http.get(`${API}/procurement-processes/:id`, () => HttpResponse.json(processoApi)),
  http.patch(`${API}/procurement-processes/:id`, () => HttpResponse.json(processoApi)),
  http.get(`${API}/procurement-processes/:id/documents/:tipo`, () => HttpResponse.json(documentoApi)),
  http.put(
    `${API}/procurement-processes/:id/documents/:tipo/sections/:secao`,
    () => HttpResponse.json(documentoApi),
  ),
  http.post(
    `${API}/procurement-processes/:id/documents/:tipo/sections/:secao/generate`,
    () => HttpResponse.json({ text: "Texto proposto pelo servidor." }),
  ),
  http.post(
    `${API}/procurement-processes/:id/documents/:tipo/finalize`,
    () => HttpResponse.json({ ...documentoApi, finalized: true, currentVersion: 1 }),
  ),
  http.get(`${API}/procurement-processes/:id/documents/:tipo/versions`, () =>
    HttpResponse.json([]),
  ),
  // A impressão do arquivo, desde o 11.1: gerar um documento passa por aqui, e
  // sem a rota toda geração no teste falharia por rota ausente.
  http.post(`${API}/procurement-processes/:id/documents/:tipo/generations`, () =>
    HttpResponse.json(geracaoApi),
  ),
  http.get(`${API}/procurement-processes/:id/documents/:tipo/generations`, () =>
    HttpResponse.json([geracaoApi]),
  ),
]

export const urlDaApi = API
