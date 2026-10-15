"use client"

import { useId, useState } from "react"

import { Button, FilterTabs, InfoBanner } from "@/components/ui"
import { IconCheck, IconChevronDown, IconDownload } from "@/components/ui/icons"
import { useToast } from "@/components/shared/providers"
import { useExportarJuntada } from "@/lib/api/hooks"
import { CATALOGO } from "@/lib/documentos"
import {
  aindaNaoGerados,
  anexosRepetidos,
  itensDaJuntada,
  mover,
  type FormatoDaJuntada,
} from "@/lib/documentos/juntada"
import { salvarArquivo } from "@/lib/navegador/salvar-arquivo"
import type { DocumentoGerado, TipoDocumento } from "@/lib/types"

/** Botão de ícone para subir ou descer um documento na ordem. */
function Mover({ rotulo, para, disabled, onClick }: { rotulo: string; para: "cima" | "baixo"; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      disabled={disabled}
      onClick={onClick}
      className="flex size-7 cursor-pointer items-center justify-center rounded-sm border border-border bg-surface text-text-3 transition-colors hover:bg-ice hover:text-royal disabled:cursor-not-allowed disabled:opacity-40"
    >
      <span className={`flex ${para === "cima" ? "rotate-180" : ""}`}>
        <IconChevronDown size={14} />
      </span>
    </button>
  )
}

/**
 * A juntada dos documentos do processo (ADR-048 do back-end).
 *
 * <p>Junta, num PDF ou DOCX só, os documentos **já gerados** — nada é gerado de
 * novo: entra o arquivo da geração vigente de cada um, o mesmo que se baixa um
 * a um. Quem monta escolhe quais entram e em que ordem.
 *
 * @param solicitados os documentos do processo, para dizer quais ainda faltam gerar
 * @param gerados     o acervo do órgão; a juntada filtra os deste processo
 */
export function JuntadaDoProcesso({
  processoId,
  solicitados,
  gerados,
  onFechar,
}: {
  processoId: string
  solicitados: TipoDocumento[]
  gerados: DocumentoGerado[]
  onFechar: () => void
}) {
  const showToast = useToast()
  const tituloId = useId()
  const [formato, setFormato] = useState<FormatoDaJuntada>("PDF")
  const itens = itensDaJuntada(gerados, processoId, formato)
  // A ordem começa a do fluxo; tudo o que tem o formato começa marcado.
  const [ordem, setOrdem] = useState<TipoDocumento[]>(() => itens.map((item) => item.tipo))
  const [fora, setFora] = useState<TipoDocumento[]>([])
  const exportar = useExportarJuntada()
  const baixando = exportar.isPending

  const disponivel = (tipo: TipoDocumento) => itens.some((item) => item.tipo === tipo && item.disponivel)
  const selecionados = ordem.filter((tipo) => disponivel(tipo) && !fora.includes(tipo))
  const repetidos = anexosRepetidos(selecionados)
  const faltam = aindaNaoGerados(solicitados, itens)

  const alternar = (tipo: TipoDocumento) =>
    setFora((atual) => (atual.includes(tipo) ? atual.filter((t) => t !== tipo) : [...atual, tipo]))

  const baixar = () =>
    exportar.mutate(
      { processoId, formato, ordem: selecionados },
      {
        // O nome vem do servidor: processo, documentos e versões, na ordem.
        onSuccess: ({ conteudo, nomeSugerido }) => {
          salvarArquivo(conteudo, nomeSugerido ?? `juntada.${formato.toLowerCase()}`)
          showToast(`Juntada em ${formato} exportada. Ela fica registrada em Documentos.`)
        },
        onError: (erro) => showToast(erro instanceof Error ? erro.message : "Não foi possível montar a juntada."),
      },
    )

  return (
    <section aria-labelledby={tituloId} className="mb-4 rounded-card border border-royal bg-surface p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-[1_1_320px]">
          <h3 id={tituloId} className="m-0 font-display text-md font-bold text-text-1">
            Juntada dos Documentos
          </h3>
          <p className="m-0 mt-1 text-sm text-text-3">Os documentos gerados num arquivo só, na ordem escolhida.</p>
        </div>
        <div role="group" aria-label="Formato da juntada">
          <FilterTabs
            options={[
              { key: "PDF", label: "PDF" },
              { key: "DOCX", label: "DOCX" },
            ]}
            active={formato}
            onChange={(chave) => setFormato(chave as FormatoDaJuntada)}
          />
        </div>
      </div>

      {itens.length === 0 ? (
        <p className="m-0 mt-4 rounded-md bg-ice px-3.5 py-3 text-sm text-text-3">
          Nenhum documento gerado ainda.
        </p>
      ) : (
        <ol className="m-0 mt-4 flex list-none flex-col gap-2 p-0" aria-label="Documentos da juntada, na ordem">
          {ordem.map((tipo, i) => {
            const item = itens.find((candidato) => candidato.tipo === tipo)
            if (!item) return null
            const marcado = item.disponivel && !fora.includes(tipo)
            const posicao = selecionados.indexOf(tipo)
            const titulo = CATALOGO[tipo].titulo
            return (
              <li
                key={tipo}
                className={`flex flex-wrap items-center gap-3 rounded-md border px-3.5 py-2.5 ${
                  marcado ? "border-tint-royal-border bg-tint-royal-bg" : "border-border bg-ice"
                }`}
              >
                <button
                  type="button"
                  aria-pressed={marcado}
                  aria-label={`Incluir ${titulo} na juntada`}
                  disabled={!item.disponivel}
                  onClick={() => alternar(tipo)}
                  className="flex min-w-0 flex-1 basis-64 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left disabled:cursor-not-allowed"
                >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-sm border ${
                      marcado ? "border-royal bg-royal text-surface" : "border-border bg-surface"
                    }`}
                  >
                    {marcado && <IconCheck size={12} strokeWidth={3} />}
                  </span>
                  <span className="w-6 shrink-0 font-mono text-sm text-text-muted">{marcado ? `${posicao + 1}.` : "—"}</span>
                  <span className="min-w-0">
                    <span className={`block text-base font-semibold ${item.disponivel ? "text-text-1" : "text-text-muted"}`}>
                      {titulo}
                      <span className="ml-2 font-mono text-xs font-normal text-text-muted">v{item.versao}</span>
                    </span>
                    {!item.disponivel && (
                      <span className="block text-xs text-text-muted">
                        Sem arquivo {formato} na geração vigente — gere o documento em {formato} para incluí-lo.
                      </span>
                    )}
                  </span>
                </button>
                <span className="flex gap-1">
                  <Mover
                    para="cima"
                    rotulo={`Subir ${titulo}`}
                    disabled={i === 0}
                    onClick={() => setOrdem((atual) => mover(atual, tipo, -1))}
                  />
                  <Mover
                    para="baixo"
                    rotulo={`Descer ${titulo}`}
                    disabled={i === ordem.length - 1}
                    onClick={() => setOrdem((atual) => mover(atual, tipo, 1))}
                  />
                </span>
              </li>
            )
          })}
        </ol>
      )}

      {faltam.length > 0 && (
        <p className="m-0 mt-3 text-sm text-text-3">
          Fora da juntada (não gerados): {faltam.map((tipo) => CATALOGO[tipo].titulo).join(", ")}.
        </p>
      )}
      {repetidos.length > 0 && (
        <InfoBanner tone="warning" className="mt-3">
          O Edital já traz {repetidos.map((tipo) => CATALOGO[tipo].titulo).join(" e ")} como anexo: incluí-los
          repete o conteúdo.
        </InfoBanner>
      )}

      <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-border-soft pt-4">
        <p id={`${tituloId}-motivo`} className="sr-only">
          Escolha ao menos um documento gerado no formato {formato}.
        </p>
        <Button variant="ghost" onClick={onFechar}>
          Fechar
        </Button>
        <Button
          icon={<IconDownload size={14} />}
          disabled={baixando || selecionados.length === 0}
          ariaDescribedBy={`${tituloId}-motivo`}
          onClick={baixar}
        >
          {baixando
            ? "Montando a juntada..."
            : `Baixar Juntada em ${formato} (${selecionados.length} ${selecionados.length === 1 ? "documento" : "documentos"})`}
        </Button>
      </div>
    </section>
  )
}
