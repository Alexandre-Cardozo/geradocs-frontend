/**
 * O GovBô acompanha cada ação com IA (§129). Este módulo não desenha nada: ele
 * envolve a chamada ao modelo e avisa o palco (components/mascotes/palco-da-ia)
 * de cada momento, na ordem certa:
 *
 *   começou a requisição -> `entrar` (o Bô chega voando e fica pensando)
 *   a resposta chegou    -> espera o mínimo, então `concluir` (ação e confetes)
 *   fim da comemoração   -> a resposta é entregue a quem pediu, que a escreve
 *   logo em seguida      -> `sair` (o Bô vai embora)
 *
 * Quem dita os tempos é o palco, porque é ele que sabe quanto a animação leva
 * (e que encurta tudo com movimento reduzido). Sem palco registrado (testes,
 * telas fora do aplicativo) a chamada passa direto, sem atraso nenhum. Uma ação
 * dentro de outra (a revisão em lote, seção por seção) não chama o Bô de novo:
 * quem acompanha é a de fora.
 */

export type PalcoDaIa = {
  /** Da entrada do Bô até ele poder comemorar, mesmo com resposta imediata. */
  esperaMinimaMs: number
  /** Quanto dura a comemoração antes de a resposta ser entregue. */
  celebracaoMs: number
  entrar: () => void
  concluir: () => void
  falhar: () => void
  sair: () => void
}

let palcoAtual: PalcoDaIa | null = null
let emAndamento = 0

/** Registra o palco que vai mostrar o Bô. Devolve quem o retira. */
export function registrarPalcoDaIa(palco: PalcoDaIa): () => void {
  palcoAtual = palco
  return () => {
    if (palcoAtual === palco) palcoAtual = null
  }
}

const esperar = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms))

/**
 * Faz o `trabalho` com o Bô em cena. `deuCerto` decide, para trabalhos que não
 * lançam erro mesmo quando falham (a revisão em lote junta as falhas), se o Bô
 * comemora ou fica triste.
 */
export async function acompanharIa<T>(
  trabalho: () => Promise<T>,
  { deuCerto = () => true, relogio = () => Date.now() }: { deuCerto?: (resposta: T) => boolean; relogio?: () => number } = {},
): Promise<T> {
  const palco = palcoAtual
  if (!palco || emAndamento > 0) return trabalho()

  emAndamento++
  const inicio = relogio()
  palco.entrar()
  try {
    const resposta = await trabalho()
    if (!deuCerto(resposta)) {
      palco.falhar()
      return resposta
    }
    const falta = palco.esperaMinimaMs - (relogio() - inicio)
    if (falta > 0) await esperar(falta)
    palco.concluir()
    await esperar(palco.celebracaoMs)
    return resposta
  } catch (erro) {
    // O erro não espera a animação: a mensagem aparece na hora, e o Bô sai triste.
    palco.falhar()
    throw erro
  } finally {
    emAndamento--
    palco.sair()
  }
}
