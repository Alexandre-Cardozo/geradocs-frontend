"use client"

import { useId, useState } from "react"

import { Button, InfoBanner, Tag, ValidationMsg } from "@/components/ui"
import { IconSparkles } from "@/components/ui/icons"
import { InlineSpinner } from "@/components/shared/estados"
import type {
  AssuntoDoAchado,
  CompatibilidadeDaAta,
  LeituraDaAta,
  SituacaoDaVigencia,
} from "@/lib/api/ata-client"
import { useEstadoDaIa, useRevisarAta } from "@/lib/api/hooks"
import { ehLimiteDaIa } from "@/lib/api/limite-da-ia"
import { formatData } from "@/lib/format"

const ROTULO_DA_COMPATIBILIDADE: Record<CompatibilidadeDaAta, string> = {
  compativel: "Objeto Compatível",
  parcial: "Objeto Parcialmente Compatível",
  incompativel: "Objeto Incompatível",
  indeterminada: "Compatibilidade Indeterminada",
}

const TOM_DA_COMPATIBILIDADE: Record<CompatibilidadeDaAta, "info" | "warning" | "danger" | "neutral"> = {
  compativel: "info",
  parcial: "warning",
  incompativel: "danger",
  indeterminada: "neutral",
}

const ROTULO_DO_ASSUNTO: Record<AssuntoDoAchado, string> = {
  vigencia: "Vigência",
  objeto: "Objeto",
  itens: "Itens",
  precos: "Preços",
  outro: "Outro Ponto",
}

/** A vigência é conferida pela data no servidor: o texto diz o que a data mostra, sem opinar sobre o resto. */
function textoDaVigencia(situacao: SituacaoDaVigencia, data: string | null): string {
  if (situacao === "vigente") return `A vigência declarada vai até ${formatData(data ?? "")}: ainda não terminou.`
  if (situacao === "vencida") return `A vigência declarada terminou em ${formatData(data ?? "")}: a ATA está vencida.`
  return "Não há data de vigência legível no texto da ATA. Confira a vigência no documento."
}

/**
 * A leitura da ATA anexada na adesão pela IA (ADR 119; ADR-080 do back-end).
 *
 * <p>É apoio à conferência, e não parecer: a IA aponta o que a ATA diz, com o trecho que sustenta cada ponto, e quem
 * decide aderir é o servidor. A vigência é conferida pela data, no servidor. Nada é gravado: a leitura vale para o
 * arquivo que está na tela, e trocar o arquivo a descarta.
 */
export function RevisaoDaAta({ processoId, arquivo }: { processoId: string; arquivo: File | null }) {
  const revisar = useRevisarAta(processoId)
  const estadoDaIa = useEstadoDaIa()
  const motivoId = useId()
  // A leitura guarda o arquivo a que pertence: arquivo trocado, leitura descartada, sem efeito para limpar.
  const [leitura, setLeitura] = useState<{ arquivo: File; dados: LeituraDaAta } | null>(null)
  const atual = leitura && leitura.arquivo === arquivo ? leitura.dados : null

  const motivoDaIa =
    estadoDaIa === "verificando"
      ? "Verificando a IA..."
      : estadoDaIa === "sem-modelo"
        ? "Nenhum modelo de IA configurado nesta instalação."
        : estadoDaIa === "sem-teto"
          ? "A IA não está liberada para esta entidade. Fale com o administrador da plataforma."
          : "A IA lê o texto da ATA e o compara com o objeto e os itens do processo. É apoio à conferência, e não parecer: nada é gravado."
  const iaIndisponivel = estadoDaIa !== "disponivel"

  if (!arquivo) return null

  const pedir = () => revisar.mutate(arquivo, { onSuccess: (dados) => setLeitura({ arquivo, dados }) })
  // O limite do plano abre o aviso próprio (ADR 109): repetir aqui seria dizer a mesma coisa duas vezes.
  const erro = revisar.isError && !ehLimiteDaIa(revisar.error) ? revisar.error : null

  return (
    <div className="mt-2.5 flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          icon={<IconSparkles size={14} />}
          disabled={iaIndisponivel || revisar.isPending}
          ariaDescribedBy={motivoId}
          onClick={pedir}
        >
          {revisar.isPending ? "Lendo a ATA..." : atual ? "Revisar de Novo com IA" : "Revisar a ATA com IA"}
        </Button>
        {revisar.isPending && <InlineSpinner label="Lendo a ATA... aguarde." />}
      </div>
      <p id={motivoId} className="m-0 text-sm text-text-3">
        {motivoDaIa}
      </p>
      {erro && <ValidationMsg type="error" msg={erro.message || "Não foi possível revisar a ATA pela IA."} />}

      {atual && (
        <section aria-label="Leitura da ATA pela IA" className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={TOM_DA_COMPATIBILIDADE[atual.compatibilidade]}>{ROTULO_DA_COMPATIBILIDADE[atual.compatibilidade]}</Tag>
            <span className="text-sm text-text-2">{atual.motivoDaCompatibilidade}</span>
          </div>

          <InfoBanner tone={atual.situacaoDaVigencia === "vencida" ? "danger" : "info"}>
            {textoDaVigencia(atual.situacaoDaVigencia, atual.dataDaVigencia)}
            {atual.vigenciaNaAta && <span className="block text-sm">Como a ATA escreve: {atual.vigenciaNaAta}</span>}
          </InfoBanner>

          <dl className="m-0 grid gap-1 text-sm text-text-2">
            {atual.orgaoGerenciador && (
              <div>
                <dt className="inline font-bold">Órgão gerenciador: </dt>
                <dd className="inline m-0">{atual.orgaoGerenciador}</dd>
              </div>
            )}
            {atual.objetoDaAta && (
              <div>
                <dt className="inline font-bold">Objeto da ATA: </dt>
                <dd className="inline m-0">{atual.objetoDaAta}</dd>
              </div>
            )}
          </dl>

          {atual.achados.length > 0 && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {atual.achados.map((achado, indice) => (
                <li key={indice} className="rounded-md border border-border-soft px-3 py-2">
                  <div className="mb-1 flex items-center gap-2">
                    <Tag tone="neutral">{ROTULO_DO_ASSUNTO[achado.assunto]}</Tag>
                    <span className="text-sm text-text-1">{achado.texto}</span>
                  </div>
                  <blockquote className="m-0 border-l-2 border-border pl-2.5 text-sm text-text-3">{achado.trecho}</blockquote>
                </li>
              ))}
            </ul>
          )}

          {atual.textoCortado && (
            <InfoBanner tone="warning">
              A ATA é longa e só o começo dela foi lido. Confira o restante no documento.
            </InfoBanner>
          )}

          <p className="m-0 text-xs text-text-3">
            Leitura de apoio da IA, com o trecho da ATA que sustenta cada ponto. Não é parecer jurídico: a validade da
            ATA e os limites da adesão (Art. 86 da Lei 14.133/21) são conferidos por quem decide aderir.
          </p>
        </section>
      )}
    </div>
  )
}
