"use client"

import { useState } from "react"

import { Button, InfoBanner, Tag } from "@/components/ui"
import { IconDownload, IconEye } from "@/components/ui/icons"
import { EstruturaDoDocumento } from "@/components/documentos/estrutura-do-documento"
import { PreviaDoDocumento } from "@/components/documentos/previa-do-documento"
import {
  corpoDoDocumento,
  dispensadasSemJustificativa,
  obrigatoriasPendentes,
  podeGerar,
} from "@/lib/dominio"
import { CATALOGO } from "@/lib/documentos"
import type { SecaoDocumento, TipoDocumento } from "@/lib/types"

/**
 * A etapa final do documento: revisar o todo e gerar.
 *
 * <p>Estes blocos moravam <b>dentro da última seção</b> — no ETP, o
 * Posicionamento Conclusivo do inciso XIII. A seção da lei carregava o que é do
 * documento inteiro: acrescentar seção, prévia, pendências e o botão de gerar.
 * Três consequências, todas ruins: para olhar o documento era preciso abrir um
 * inciso; escrever a conclusão competia com revisar o todo; e a última seção era
 * a única que não se comportava como seção — sem "Salvar e Avançar", com outro
 * botão no lugar.
 *
 * <p>Agora é uma etapa, e não uma seção: sem número, sem fundamento legal, fora
 * da contagem de progresso — e acessível a qualquer momento, porque revisar o
 * documento inteiro não deveria depender de chegar ao fim dele.
 */
export function EtapaFinal({
  processoId,
  tipo,
  secoes,
  jaGerado,
  pendente,
  onGerar,
  onVisualizar,
}: {
  processoId: string
  tipo: TipoDocumento
  secoes: SecaoDocumento[]
  jaGerado: boolean
  pendente: boolean
  /** `regerar` distingue a primeira geração da substituição da anterior. */
  onGerar: (regerar: boolean) => void
  /** Leva ao acervo, onde o documento gerado é baixado. */
  onVisualizar: () => void
}) {
  const [confirmarRegerar, setConfirmarRegerar] = useState(false)

  const meta = CATALOGO[tipo]
  const pendentes = obrigatoriasPendentes(secoes)
  const pronto = podeGerar(secoes)
  const lacunas = dispensadasSemJustificativa(secoes)
  const opcionaisEmBranco = secoes.some((s) => !s.obrigatoria && s.status !== "Completo")

  return (
    <div className="flex flex-col gap-4">
      {jaGerado && confirmarRegerar && (
        <InfoBanner tone="warning">
          Ao regerar o {tipo}, o documento gerado anteriormente será <strong>substituído</strong>{" "}
          por esta nova versão.
        </InfoBanner>
      )}
      {!jaGerado && !pronto && (
        <InfoBanner tone="warning">
          Conclua as seções obrigatórias para gerar o {meta.titulo}. Faltam:{" "}
          <strong>{pendentes.map((s) => s.titulo).join(", ")}</strong>.
        </InfoBanner>
      )}

      <EstruturaDoDocumento processoId={processoId} tipo={tipo} secoes={secoes} />
      <PreviaDoDocumento blocos={corpoDoDocumento(secoes)} />

      {lacunas.length > 0 && (
        <InfoBanner tone="info">
          Estas seções ficarão de fora do documento sem qualquer registro:{" "}
          <strong>{lacunas.map((s) => s.titulo).join(", ")}</strong>. Dispense-as com justificativa
          para que o documento diga que foram dispensadas — é o que o Art. 18, § 2º pede.
        </InfoBanner>
      )}

      <div className="flex flex-wrap items-center justify-end gap-2.5">
        <p id="motivo-da-geracao" className={pronto ? "sr-only" : "m-0 flex-1 text-xs text-text-muted"}>
          {pronto
            ? "Tudo certo para gerar."
            : "Faltam seções obrigatórias: conclua-as ou dispense as dispensáveis com justificativa."}
        </p>
        {jaGerado ? (
          confirmarRegerar ? (
            <>
              <Button variant="secondary" disabled={pendente} onClick={() => setConfirmarRegerar(false)}>
                Cancelar
              </Button>
              <Button variant="dark" disabled={pendente} onClick={() => onGerar(true)}>
                {pendente ? "Regerando..." : "Confirmar e Regerar"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="secondary" icon={<IconEye size={14} />} onClick={onVisualizar}>
                Visualizar Documento
              </Button>
              <Button variant="dark" onClick={() => setConfirmarRegerar(true)}>
                Regerar {tipo}
              </Button>
            </>
          )
        ) : (
          <Button
            variant="success"
            icon={<IconDownload size={14} strokeWidth={2.5} />}
            disabled={pendente || !pronto}
            // O guarda-corpo nº 7: botão travado sem dizer o que falta é motivo
            // que só existe para quem enxerga a tela.
            ariaDescribedBy="motivo-da-geracao"
            onClick={() => onGerar(false)}
          >
            {pendente ? `Gerando ${tipo}...` : `Finalizar e Gerar ${tipo}`}
          </Button>
        )}
      </div>

      {!jaGerado && pronto && opcionaisEmBranco && (
        <div className="flex justify-end">
          <Tag tone="info">Seções opcionais em branco serão omitidas do documento</Tag>
        </div>
      )}
    </div>
  )
}
