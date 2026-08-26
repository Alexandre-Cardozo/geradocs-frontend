"use client"

import { Button } from "@/components/ui"
import { IconPencil, IconSparkles } from "@/components/ui/icons"
import { useIaDisponivel } from "@/lib/api/hooks"

/**
 * Os dois caminhos para preencher uma seção, lado a lado.
 *
 * Antes havia um só botão — "Gerar com IA" — e escrever à mão era o que sobrava
 * para quem não clicasse. Com o provedor `none`, que é o padrão e o que roda
 * hoje, o clique devolvia `503`: o servidor descobria **por erro** que o
 * facilitador não existe.
 *
 * A regra do produto é a inversa: a IA é facilitadora, nunca bloqueadora, e
 * escrever à mão é o caminho normal — não o plano B. Então os dois aparecem
 * juntos, e quando não há modelo o da IA vem desabilitado **com o motivo
 * escrito antes do clique** (ADR-029).
 */
export function CaminhosDaSecao({
  gerando,
  onEscreverAMao,
  onGerarComIa,
}: {
  gerando: boolean
  /** Leva o cursor para o campo de texto: o caminho manual também é uma ação. */
  onEscreverAMao: () => void
  onGerarComIa: () => void
}) {
  const ia = useIaDisponivel()

  // Enquanto a resposta não chega, o botão fica desabilitado com o motivo. O
  // contrário — habilitar por otimismo — devolveria o clique que dá erro.
  const motivo = ia.isPending
    ? "Verificando se esta instalação tem modelo de IA configurado..."
    : ia.data === true
      ? "A IA redige um rascunho com base no DFD, no PCA e nos dados do processo. Você revisa, corrige e assina — quem responde pelo texto é quem assina."
      : "Esta instalação não tem modelo de IA configurado. Peça a quem administra a plataforma para configurar um; até lá, escrever à mão preenche a seção por inteiro."

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <div className="flex flex-col gap-2 rounded-xl border border-border bg-ice px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="flex text-royal">
            <IconPencil size={14} />
          </span>
          <span className="font-display text-sm font-bold text-text-1">Escrever à mão</span>
        </div>
        <p className="m-0 flex-1 text-sm text-text-3">
          O caminho normal, e completo: a plataforma não exige assistência para nada. O
          painel ao lado indica o que a seção precisa conter.
        </p>
        <div>
          <Button size="sm" variant="secondary" onClick={onEscreverAMao}>
            Escrever agora
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-ice px-4 py-3.5">
        <div className="flex items-center gap-2">
          <span className="flex text-royal">
            <IconSparkles size={14} />
          </span>
          <span className="font-display text-sm font-bold text-text-1">Gerar com IA</span>
          {ia.data === false && (
            <span className="rounded-sm bg-border-soft px-1.5 py-0.5 text-2xs font-semibold text-slate-strong">
              Indisponível
            </span>
          )}
        </div>
        <p id="motivo-da-ia" className="m-0 flex-1 text-sm text-text-3">
          {motivo}
        </p>
        <div>
          <Button
            size="sm"
            variant="dark"
            icon={<IconSparkles size={13} />}
            disabled={ia.data !== true || gerando}
            // O guarda-corpo nº 7: botão desabilitado sem motivo anunciado é
            // motivo que só existe para quem enxerga a tela.
            ariaDescribedBy="motivo-da-ia"
            onClick={onGerarComIa}
          >
            {gerando ? "Gerando com IA..." : "Gerar com IA"}
          </Button>
        </div>
      </div>
    </div>
  )
}
