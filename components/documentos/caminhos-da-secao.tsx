"use client"

import { Button } from "@/components/ui"
import { IconFileText, IconSparkles } from "@/components/ui/icons"
import { useIaDisponivel } from "@/lib/api/hooks"

/**
 * Os atalhos para preencher a seção: o rascunho da plataforma e a IA.
 *
 * <p>A IA é facilitadora, nunca bloqueadora: sem modelo configurado o botão vem
 * desabilitado **com o motivo escrito antes do clique** (ADR-029), em vez de
 * devolver `503` e fazer o servidor descobrir por erro que o facilitador não
 * existe.
 *
 * <p>Havia aqui um segundo cartão, "Escrever à mão", com um botão que só levava
 * o cursor ao campo de texto. O campo está logo acima, aberto e vazio: quem vai
 * escrever já está escrevendo. Um cartão para anunciar o que a tela já permite
 * é instrução, não caminho — e ocupava metade da largura da seção para dizê-lo.
 *
 * <p><b>O rascunho não substitui a IA.</b> Onde a seção tem um rascunho montado
 * a partir do processo, os dois botões ficam lado a lado: um serve a quem não
 * usa o modelo, o outro a quem usa — e o texto já escrito, venha de onde vier,
 * é o que o modelo recebe como base. Some nenhum dos dois depois de escrever:
 * pedir a redação a partir do rascunho é justamente o caminho previsto.
 */
export function CaminhosDaSecao({
  gerando,
  onGerarComIa,
  rascunhoAutomatico,
}: {
  gerando: boolean
  onGerarComIa: () => void
  /** O rascunho que a seção sabe montar a partir do processo, quando há um. */
  rascunhoAutomatico?: { rotulo: string; onEscrever: () => void }
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
      {/*
        Os dois lado a lado: o rascunho serve a quem não usa o modelo, e a IA a
        quem usa. Nenhum some depois de a seção ter texto — pedir a redação a
        partir do rascunho é justamente o caminho previsto.
      */}
      <div className="flex flex-wrap items-center gap-2.5">
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
        {rascunhoAutomatico && (
          <Button
            size="sm"
            variant="secondary"
            icon={<IconFileText size={13} />}
            onClick={rascunhoAutomatico.onEscrever}
          >
            {rascunhoAutomatico.rotulo}
          </Button>
        )}
      </div>
    </div>
  )
}
