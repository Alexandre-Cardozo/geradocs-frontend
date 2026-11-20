"use client"

import { useState } from "react"

import { Button, ValidationMsg } from "@/components/ui"
import { IconSparkles } from "@/components/ui/icons"
import { ApiError } from "@/lib/api/auth-client"
import { useEstadoDaIa, useMelhorarSituacaoProblema, type EstadoDaIa } from "@/lib/api/hooks"

/** O limite do campo no servidor: a sugestão também precisa caber nele. */
const LIMITE = 2000

/** Por que o botão está desligado, escrito antes do clique (guarda-corpo nº 7). */
function motivoDoEstado(estado: EstadoDaIa): string | null {
  switch (estado) {
    case "verificando":
      return "Verificando a IA..."
    case "sem-modelo":
      return "Nenhum modelo de IA configurado nesta instalação."
    case "teto-esgotado":
      return "O teto de IA do mês acabou. Fale com o administrador da plataforma."
    case "sem-teto":
      return "A IA não está liberada para esta entidade. Fale com o administrador da plataforma."
    case "disponivel":
      return null
  }
}

/**
 * O que a tela diz quando a IA não entrega a sugestão. A recusa do servidor
 * (`AI_GENERATED_DRAFT_REJECTED`) quer dizer que a IA não conseguiu melhorar o texto
 * sem mudar o que ele diz — e a mensagem do servidor, que fala em "rascunho",
 * não ajuda quem escreveu uma situação-problema.
 */
function mensagemDoErro(erro: Error): string {
  if (erro instanceof ApiError && erro.code === "AI_GENERATED_DRAFT_REJECTED") {
    return "Não foi possível melhorar este texto sem mudar o que ele diz. O seu texto foi mantido."
  }
  return erro.message
}

/** Sem espaço de sobra nem diferença de linha: dois textos "iguais" para quem lê. */
const normalizar = (texto: string) => texto.replace(/\s+/g, " ").trim()

/**
 * "Melhorar a redação" da situação-problema do DFD (ADR-072 do back-end).
 *
 * <p>A IA só reescreve o que a pessoa escreveu, com a mesma informação. A tela
 * mostra a sugestão ao lado do que há no campo, e quem escreveu decide: usar,
 * ou descartar. Nada é gravado aqui — o texto só entra no DFD quando a pessoa o
 * salva, como sempre.
 */
export function MelhorarRedacao({
  processoId,
  texto,
  onUsar,
}: {
  processoId: string
  /** O que está escrito no campo agora. */
  texto: string
  /** Põe a sugestão no campo; quem chama continua dono do estado dele. */
  onUsar: (sugestao: string) => void
}) {
  const estado = useEstadoDaIa()
  const melhorar = useMelhorarSituacaoProblema(processoId)
  const [sugestao, setSugestao] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  const motivo = motivoDoEstado(estado)
  const vazio = texto.trim() === ""
  const longo = texto.length > LIMITE
  const idDoMotivo = `motivo-melhorar-${processoId}`
  const bloqueio =
    motivo ?? (vazio ? "Escreva a situação-problema para poder melhorar a redação." : longo ? "O texto passa de 2000 caracteres." : null)

  const pedir = () => {
    // Sem guarda de "já está pedindo": o botão fica desligado enquanto a IA responde.
    setErro(null)
    setSugestao(null)
    melhorar.mutate(texto, {
      onSuccess: (resposta) => setSugestao(resposta),
      onError: (falha) => setErro(mensagemDoErro(falha)),
    })
  }

  const igual = sugestao !== null && normalizar(sugestao) === normalizar(texto)

  return (
    <div className="mt-2 flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          size="sm"
          variant="secondary"
          icon={<IconSparkles size={13} />}
          disabled={bloqueio !== null || melhorar.isPending}
          ariaDescribedBy={idDoMotivo}
          onClick={pedir}
        >
          {melhorar.isPending ? "Melhorando..." : "Melhorar a redação"}
        </Button>
        <span id={idDoMotivo} className="text-xs text-text-3">
          {bloqueio ?? "A IA só melhora a escrita. Você decide o que usar."}
        </span>
      </div>

      {erro && <ValidationMsg type="error" msg={erro} />}

      {sugestao !== null && (
        <div className="flex flex-col gap-2 rounded-xl border border-border bg-ice px-4 py-3.5" role="region" aria-label="Sugestão de redação">
          <span className="text-2xs font-semibold tracking-caps text-text-muted uppercase">Sugestão de redação</span>
          {igual ? (
            <p className="m-0 text-sm text-text-2">A IA não sugeriu mudanças: devolveu o mesmo texto que você escreveu. Isso não quer dizer que ele esteja bem escrito. Se tem gírias ou abreviações, reescreva essas partes e peça de novo.</p>
          ) : (
            <>
              <p className="m-0 text-sm whitespace-pre-wrap text-text-1">{sugestao}</p>
              <p className="m-0 text-xs text-text-3">Confira se nenhum fato mudou antes de usar.</p>
            </>
          )}
          <div className="flex flex-wrap gap-2">
            {!igual && (
              <Button
                size="sm"
                onClick={() => {
                  onUsar(sugestao)
                  setSugestao(null)
                }}
              >
                Usar sugestão
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setSugestao(null)}>
              {igual ? "Fechar" : "Descartar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
