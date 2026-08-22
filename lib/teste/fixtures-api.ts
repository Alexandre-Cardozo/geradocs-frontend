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

/**
 * Um processo de contratação como o back-end o devolve.
 *
 * Usado pelos testes que exercitam fluxos do `client.ts` agora servidos pela
 * API — troca de modalidade, dispensa de seção e retificação.
 */
export const processoApi = {
  id: "3f2b1a00-1111-4222-8333-444455556666",
  processNumber: "PROC-2026-000007",
  organizationId: "1b7c8e10-2d3f-4a5b-8c9d-0e1f2a3b4c5d",
  departmentId: "8a7b6c5d-4e3f-4a2b-9c8d-7e6f5a4b3c2d",
  departmentName: "Secretaria de Administração",
  responsibleUserName: "Maria Costa Andrade",
  objectDescription: "Aquisição de material de expediente",
  demandObject: "Papel A4, canetas e pastas",
  modality: "ELECTRONIC_AUCTION",
  estimatedValue: 485000,
  legalBasis: "Art. 28, I, Lei 14.133/21",
  urgency: false,
  documents: ["ETP", "TR", "EDITAL"],
  dfdFileName: "dfd-2026-014.pdf",
  status: "DRAFT" as const,
  createdAt: "2026-08-20T10:00:00-03:00",
  updatedAt: "2026-08-20T10:30:00-03:00",
  version: 0,
}

/** Uma seção do catálogo, como o back-end a devolve. */
function secaoApi(
  sectionCode: string,
  position: number,
  required: boolean,
  content = "",
  dispensationJustification?: string,
) {
  return {
    sectionCode,
    position,
    title: `Seção ${sectionCode}`,
    legalBasis: `Art. 18, § 1º, ${sectionCode}, Lei 14.133/21`,
    hint: "Demonstre o que a seção pede.",
    required,
    content,
    ...(dispensationJustification ? { dispensationJustification } : {}),
    resolved: content !== "" || dispensationJustification != null,
  }
}

/** O ETP em elaboração: duas indispensáveis e uma dispensável. */
export const documentoApi = {
  id: "5c4d3e2f-1111-4222-8333-444455556666",
  processId: processoApi.id,
  documentType: "ETP",
  currentVersion: 0,
  finalized: false,
  progress: 0,
  canGenerate: false,
  sections: [secaoApi("1", 1, true), secaoApi("2", 2, false), secaoApi("3", 3, true)],
  pendingRequiredSections: ["Seção 1", "Seção 3"],
  silentGaps: ["Seção 2"],
  body: [] as { sectionCode: string; title: string; text: string; dispensed: boolean }[],
}

export { secaoApi }
