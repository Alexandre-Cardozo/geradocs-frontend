"use client"

import Link from "next/link"
import { useId, useState } from "react"

import { Button, FormField, InfoBanner, Input, SectionBlock, Textarea } from "@/components/ui"
import { CaminhosDaSecao } from "@/components/documentos/caminhos-da-secao"
import { InlineSpinner } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { FORMA_DA_PREVISAO, type AchadoDoPca } from "@/lib/api/pca-client"
import { usePrevisaoNoPca } from "@/lib/api/hooks"
import { formatBRL } from "@/lib/format"
import type { SecaoDocumento } from "@/lib/types"

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
  rascunho,
  setRascunho,
  gerando,
  onGerarComIa,
}: {
  secao: SecaoDocumento
  processoId: string
  /** O texto da seção em edição — é ele que "Citar na seção" preenche. */
  rascunho: string
  setRascunho: (v: string) => void
  gerando: boolean
  onGerarComIa: () => void
}) {
  const { verificacao, marcar } = usePrevisaoNoPca(processoId)
  const showToast = useToast()
  // A demanda que está sendo informada; nula quando não há formulário aberto.
  // Era um formulário só por processo, e a declaração valia para qualquer item
  // não encontrado — com todos encontrados, ela não se ligava a nada (ADR-038).
  const [informando, setInformando] = useState<string | null>(null)
  const [codigo, setCodigo] = useState("")
  const [nota, setNota] = useState("")

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
          /*
            O ano é dito porque é ele que resolve: o PCA de um exercício
            descreve o que o órgão pretende contratar naquele ano, e é contra o
            plano do exercício **deste processo** que a previsão se demonstra.
            "Nenhum PCA anexado" mandava procurar um plano que podia até existir,
            só que de outro ano.
          */
          <InfoBanner tone="info">
            <div className="font-semibold">
              Nenhum PCA de {dados.exercicio} anexado a este órgão.
            </div>
            <p className="m-0 mt-1">
              Este processo é do exercício de {dados.exercicio}, e é no plano desse ano que a
              previsão se demonstra.{" "}
              <Link href="/configuracoes/pca" className="underline">
                Anexe o PCA de {dados.exercicio} em Configurações
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
                {informando === achado.demanda ? (
                  <FormularioDaPrevisao
                    codigo={codigo}
                    nota={nota}
                    pendente={marcar.isPending}
                    onCodigo={setCodigo}
                    onNota={setNota}
                    onCancelar={() => setInformando(null)}
                    onRegistrar={() =>
                      marcar.mutate(
                        { demanda: achado.demanda, codigo: codigo.trim(), nota },
                        {
                          onSuccess: () => {
                            setInformando(null)
                            showToast(`Previsão de ${achado.demanda} informada e registrada como sua.`)
                          },
                        },
                      )
                    }
                  />
                ) : (
                  <div className="mt-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setInformando(achado.demanda)
                        setCodigo(achado.forma === "DECLARADA" ? (achado.codigo ?? "") : "")
                        setNota(achado.notaDeclarada ?? "")
                      }}
                    >
                      {/*
                        Item já encontrado no plano não precisa de declaração: a
                        ação existe para corrigir o que a plataforma achou
                        errado, e para informar o que ela não achou.
                      */}
                      {achado.forma === "DECLARADA"
                        ? "Corrigir o item informado"
                        : achado.previsto
                          ? "Informar outro item do plano"
                          : "Informar o item do PCA"}
                    </Button>
                  </div>
                )}
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

        {/*
          O texto da seção, editável. A citação é rascunho: o parágrafo do
          inciso II sai pronto do que a plataforma conferiu, e quem assina
          revisa, ajusta e grava. Antes ela era escrita direto no documento —
          texto de processo administrativo entrando sem ninguém ler (ADR-039).
        */}
        <FormField
          label="O que vai para a seção"
          required
          hint="Revise antes de salvar: é este texto que entra no ETP, e quem assina responde por ele."
        >
          <Textarea
            value={rascunho}
            onChange={(e) => setRascunho(e.target.value)}
            rows={10}
            placeholder="Demonstre a previsão no PCA, ou justifique a contratação não prevista..."
          />
        </FormField>

        <CaminhosDaSecao
          gerando={gerando}
          onGerarComIa={onGerarComIa}
          rascunhoAutomatico={
            dados.citacao
              ? {
                  rotulo: rascunho.trim() === "" ? "Citar na seção" : "Refazer a citação",
                  onEscrever: () => {
                    setRascunho(dados.citacao!)
                    showToast("Citação preenchida. Revise antes de salvar.")
                  },
                }
              : undefined
          }
        />
        {!dados.citavel && (
          <p className="m-0 text-xs text-text-muted">
            Não há item do plano a citar: informe o item na linha da demanda, ou escreva aqui a
            justificativa da contratação não prevista — que é o que o inciso II pede quando ela
            não consta do PCA.
          </p>
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
      {achado.notaDeclarada && (
        <p className="m-0 mt-0.5 text-xs text-text-muted">
          Sua anotação: <em>{achado.notaDeclarada}</em>
        </p>
      )}
    </>
  )
}

/** Informar o item do plano correspondente a uma demanda. */
function FormularioDaPrevisao({
  codigo,
  nota,
  pendente,
  onCodigo,
  onNota,
  onRegistrar,
  onCancelar,
}: {
  codigo: string
  nota: string
  pendente: boolean
  onCodigo: (v: string) => void
  onNota: (v: string) => void
  onRegistrar: () => void
  onCancelar: () => void
}) {
  const codigoId = useId()
  const notaId = useId()
  const motivoId = useId()
  const vazio = codigo.trim() === ""

  return (
    <div className="mt-3 flex flex-col gap-3 border-t border-border-soft pt-3">
      <FormField label="Item do PCA" htmlFor={codigoId} required>
        <Input
          id={codigoId}
          value={codigo}
          onChange={(e) => onCodigo(e.target.value)}
          placeholder="2026-0142"
          autoFocus
        />
      </FormField>
      <FormField label="Onde você conferiu (opcional)" htmlFor={notaId}>
        <Textarea
          id={notaId}
          value={nota}
          onChange={(e) => onNota(e.target.value)}
          placeholder="Ex.: consultado no portal da transparência do município."
          rows={2}
        />
      </FormField>
      <p id={motivoId} className="m-0 text-xs text-text-muted">
        {vazio
          ? "Informe o item do plano: “está no PCA” sem dizer onde não demonstra a previsão."
          : "A plataforma registra que esta previsão foi informada por você, e não conferida por ela."}
      </p>
      <div className="flex flex-wrap gap-2.5">
        <Button size="sm" disabled={pendente || vazio} ariaDescribedBy={motivoId} onClick={onRegistrar}>
          {pendente ? "Registrando..." : "Registrar item informado"}
        </Button>
        <Button size="sm" variant="ghost" disabled={pendente} onClick={onCancelar}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
