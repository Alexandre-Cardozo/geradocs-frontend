import "client-only";

import { requisicaoProtegida } from "@/lib/api/auth-client";

/**
 * Se esta instalação tem assistência de IA.
 *
 * <p>A tela oferecia "Gerar com IA" a todo mundo, e quem clicava descobria por
 * `503` que não havia modelo configurado. Perguntar antes é o que permite
 * desenhar os dois caminhos lado a lado, com o motivo escrito (ADR-029).
 *
 * <p>O servidor não diz **qual** provedor está ativo, e a tela não deve querer
 * saber: ramificar por provedor é o que o registro do back-end existe para
 * impedir. Aqui só cabe a pergunta "há assistência?".
 */
export async function iaDisponivel(): Promise<boolean> {
  const status = await requisicaoProtegida<{ available: boolean }>("/ai/status");
  return status.available;
}
