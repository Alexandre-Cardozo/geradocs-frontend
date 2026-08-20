import { HttpResponse, http } from "msw"

import { autenticacao, sessaoServidor } from "@/lib/teste/fixtures-api"

const API = "http://localhost:8080/api/v1"

/** Caminho feliz. Cada teste sobrescreve o que precisa com `servidor.use`. */
export const handlers = [
  http.post(`${API}/auth/login`, () => HttpResponse.json(autenticacao)),
  http.post(`${API}/auth/refresh`, () => HttpResponse.json(autenticacao)),
  http.post(`${API}/auth/logout`, () => new HttpResponse(null, { status: 204 })),
  http.get(`${API}/me`, () => HttpResponse.json(sessaoServidor)),
  http.post(`${API}/auth/password-recovery`, () => new HttpResponse(null, { status: 202 })),
  http.post(`${API}/auth/password-reset`, () => new HttpResponse(null, { status: 204 })),
]

export const urlDaApi = API
