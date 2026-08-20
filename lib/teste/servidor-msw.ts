import { setupServer } from "msw/node"

import { handlers } from "@/lib/teste/handlers"

/** Servidor MSW compartilhado pela suíte. Handlers específicos entram por `servidor.use`. */
export const servidor = setupServer(...handlers)
