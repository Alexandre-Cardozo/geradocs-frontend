"use client"

import Link from "next/link"
import { useId, useState } from "react"

import { Button, FormField, InfoBanner, Input, SectionBlock, Textarea } from "@/components/ui"
import { InlineSpinner } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { FORMA_DA_PREVISAO, type AchadoDoPca } from "@/lib/api/pca-client"
import { usePrevisaoNoPca } from "@/lib/api/hooks"
import { formatBRL } from "@/lib/format"
import type { SecaoDocumento, TipoDocumento } from "@/lib/types"

/**
 * Demonstração da Previsão no PCA — Art. 18, § 1º, II, Lei 14.133/21.
 *
 * O inciso pede **demonstração**, e demonstrar é apontar o item. Por isso o
 * painel não se contenta com um "sim, está previsto": ou a plataforma encontrou
 * o item no plano anexado, ou o servidor informa qual é.
 *
 * Item fora do plano **não trava**. Contratação fora do PCA existe e exige
 * justificativa, não bloqueio — e travar transformaria orientação em obstáculo,
 * que é o que fez o fluxo de aprovação sair do produto (§24).
 *
 * A tela distingue "encontrado" de "informado por você". Fundir os dois faria a
 * plataforma parecer ter conferido algo que ninguém conferiu (ADR-019).
 */
export function PainelPca({
  secao,
  processoId,
  tipo,
}: {
  secao: SecaoDocumento
  processoId: string
  tipo: TipoDocumento
}) {
  const { verificacao, marcar, citar } = usePrevisaoNoPca(processoId, tipo)
  const showToast = useToast()
  const [marcando, setMarcando] = useState(false)
  const [codigo, setCodigo] = useState("")
  const [nota, setNota] = useState("")
  const codigoId = useId()
  const notaId = useId()
  const motivoId = useId()

  const codigoVazio = codigo.trim() === ""

  if (verificacao.isPending) {
    return (
      <SectionBlock title={secao.titulo} hint={secao.hint ?? ""}>
        <InlineSpinner label="Consultando o Plano de Contratações Anual..." />
      </SectionBlock>
    )
  }
  if (verificacao.isError) {
    return (
      <SectionBlock title={secao.titulo} hint={secao.hint ?? ""}>
        <InfoBanner tone="warning">
          Não foi possível consultar o PCA agora. Você pode escrever a seção mesmo assim.
        </InfoBanner>
      </SectionBlock>
    )
  }

  const dados = verificacao.data
  const semPrevisao = dados.achados.filter((achado) => !achado.previsto)

  return (
    <SectionBlock title={secao.titulo} hint={secao.hint ?? ""}>
      <div className="flex flex-col gap-4">
        {dados.plano ? (
          <p className="m-0 text-sm text-text-muted">
            Confrontado com o <strong>PCA {dados.plano.ano}</strong> ({dados.plano.arquivo}),{" "}
            {dados.plano.itensIndexados} itens indexados.
          </p>
        ) : (
          <InfoBanner tone="info">
            <div className="font-semibold">Nenhum PCA anexado a este órgão.</div>
            <p className="m-0 mt-1">
              Sem o plano, a plataforma não tem onde procurar.{" "}
              <Link href="/configuracoes" className="underline">
                Anexe o PCA em Configurações
              </Link>{" "}
              ou informe abaixo o item em que a contratação está prevista.
            </p>
          </InfoBanner>
        )}

        {dados.achados.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {dados.achados.map((achado) => (
              <li
                key={achado.demanda}
                className="rounded-xl border border-border bg-surface px-4 py-3"
              >
                <ItemDoPca achado={achado} />
              </li>
            ))}
          </ul>
        )}

        {semPrevisao.length > 0 && (
          <InfoBanner tone="warning">
            <div className="font-semibold">
              {semPrevisao.length === 1
                ? "Um item não consta do plano."
                : `${semPrevisao.length} itens não constam do plano.`}
            </div>
            <p className="m-0 mt-1">
              Isso não impede a contratação, e a plataforma não vai travar aqui. O que o Art. 18,
              § 1º, II pede é que a seção diga isso e justifique — a citação abaixo já deixa o
              espaço da justificativa aberto, entre colchetes.
            </p>
          </InfoBanner>
        )}

        {marcando ? (
          <div className="flex flex-col gap-3">
            <FormField label="Item do PCA" htmlFor={codigoId} required>
              <Input
                id={codigoId}
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                placeholder="2026-0142"
              />
            </FormField>
            <FormField label="Onde você conferiu (opcional)" htmlFor={notaId}>
              <Textarea
                id={notaId}
                value={nota}
                onChange={(e) => setNota(e.target.value)}
                placeholder="Ex.: consultado no portal da transparência do município."
                rows={2}
              />
            </FormField>
            <p id={motivoId} className="m-0 text-xs text-text-muted">
              {codigoVazio
                ? "Informe o item do plano: “está no PCA” sem dizer onde não demonstra a previsão."
                : "A plataforma registra que esta previsão foi informada por você, e não conferida por ela."}
            </p>
            <div className="flex flex-wrap gap-2.5">
              <Button
                disabled={marcar.isPending || codigoVazio}
                ariaDescribedBy={motivoId}
                onClick={() =>
                  marcar.mutate(
                    { codigo: codigo.trim(), nota },
                    {
                      onSuccess: () => {
                        setMarcando(false)
                        showToast("Previsão informada e registrada como sua.")
                      },
                    },
                  )
                }
              >
                Registrar item informado
              </Button>
              <Button variant="ghost" disabled={marcar.isPending} onClick={() => setMarcando(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            <Button
              disabled={!dados.citavel || citar.isPending}
              ariaDescribedBy={dados.citavel ? undefined : motivoId}
              onClick={() =>
                citar.mutate(undefined, {
                  onSuccess: () => showToast("Previsão citada na seção."),
                })
              }
            >
              Citar na seção
            </Button>
            <Button variant="secondary" onClick={() => setMarcando(true)}>
              {dados.notaDeclarada || dados.achados.some((a) => a.forma === "DECLARADA")
                ? "Corrigir o item informado"
                : "Informar o item do PCA"}
            </Button>
            {!dados.citavel && (
              <p id={motivoId} className="m-0 self-center text-xs text-text-muted">
                Não há item a citar: informe o item do plano ou escreva a justificativa da
                contratação não prevista.
              </p>
            )}
          </div>
        )}

        {dados.notaDeclarada && (
          <p className="m-0 text-xs text-text-muted">
            Sua anotação: <em>{dados.notaDeclarada}</em>
          </p>
        )}

        {dados.citacao && (
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-text-2">
              O que vai para a seção
            </span>
            {/* Ler antes de gravar: é texto que entra em processo administrativo. */}
            <pre className="m-0 whitespace-pre-wrap rounded-xl border border-dashed border-border bg-surface px-4 py-3 font-sans text-sm text-text-2">
              {dados.citacao}
            </pre>
          </div>
        )}
      </div>
    </SectionBlock>
  )
}

function ItemDoPca({ achado }: { achado: AchadoDoPca }) {
  if (!achado.previsto || !achado.forma) {
    return (
      <>
        <div className="font-semibold text-text-2">{achado.demanda}</div>
        <p className="m-0 mt-0.5 text-sm text-text-muted">Não encontrado no plano.</p>
      </>
    )
  }
  const forma = FORMA_DA_PREVISAO[achado.forma]
  return (
    <>
      <div className="font-semibold text-text-2">{achado.demanda}</div>
      <p className="m-0 mt-0.5 text-sm text-text-2">
        <strong>{forma.rotulo}</strong> — item {achado.codigo}
        {achado.descricao ? `: ${achado.descricao}` : ""}
        {achado.quantidade != null &&
          ` · ${achado.quantidade}${achado.unidade ? ` ${achado.unidade}` : ""}`}
        {achado.valorEstimado != null && ` · ${formatBRL(achado.valorEstimado)}`}
      </p>
      <p className="m-0 mt-0.5 text-xs text-text-muted">{forma.explicacao}</p>
    </>
  )
}
