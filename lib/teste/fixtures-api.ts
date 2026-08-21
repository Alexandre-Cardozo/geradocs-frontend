/**
 * Respostas do backend no formato do contrato Spring — o que `auth-client.ts`
 * consome antes de mapear para o modelo da interface.
 *
 * Quando os tipos gerados do OpenAPI entrarem (Bloco 2), estas fixtures passam a
 * ser tipadas por eles e param de poder divergir do contrato em silêncio.
 */

export const sessaoServidor = {
  user: {
    id: "9f1c1c62-0f1a-4a6e-9a53-2a9f4b7f1a01",
    name: "Maria Costa Andrade",
    cpf: "33333333333",
    email: "maria.costa@ecoporanga.es.gov.br",
    jobTitle: "Servidora de Compras",
    profileAccess: "SERVIDOR" as const,
    status: "ACTIVE" as const,
    lastAccessAt: "2026-08-20T14:30:00-03:00",
  },
  organization: {
    id: "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d",
    name: "Prefeitura Municipal de Ecoporanga",
    unit: "Administração Central",
    status: "ACTIVE" as const,
  },
  activeMembership: {
    organizationId: "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d",
    departmentId: null,
    active: true,
  },
  permissions: ["process:read", "process:write"],
}

export const sessaoAdmin = {
  ...sessaoServidor,
  user: {
    ...sessaoServidor.user,
    id: "0a0b0c0d-0e0f-4a1b-8c2d-3e4f5a6b7c8d",
    name: "Ana Paula Ribeiro",
    profileAccess: "ADMIN_GERAL" as const,
  },
  organization: null,
  activeMembership: null,
}

export const autenticacao = {
  accessToken: "token-de-acesso-1",
  tokenType: "Bearer" as const,
  expiresIn: 600,
  expiresAt: "2026-08-20T14:40:00-03:00",
  session: sessaoServidor,
}

/** Problem Details tal como o backend responde (RFC 7807). */
export function problema(status: number, detail: string, code?: string) {
  return {
    type: `https://geradocs.local/errors/${code ?? "erro"}`,
    title: "Erro",
    status,
    detail,
    ...(code ? { code } : {}),
  }
}
