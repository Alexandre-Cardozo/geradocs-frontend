"use client"

import { useId, useState } from "react"

import { Button, Dropdown, FormField, InfoBanner, SectionBlock, Tag } from "@/components/ui"
import { IconCheck, IconFile } from "@/components/ui/icons"
import { InlineSpinner } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { usePlanoPca } from "@/lib/api/hooks"
import { formatData } from "@/lib/format"

/**
 * O PCA do órgão: anexar, indexar e ver o que ficou procurável.
 *
 * O número que importa é **itens indexados**, e não "arquivo anexado". É ele que
 * separa "guardei o plano" de "a plataforma consegue procurar nele" — e é a
 * busca que a seção do inciso II precisa para demonstrar a previsão.
 *
 * Só CSV, e isso está escrito na tela. Aceitar PDF e dizer "carregado com
 * sucesso" seria a plataforma afirmando ter lido um arquivo que ninguém leu.
 */
export function ImportarPca({ anos }: { anos: { value: string; label: string }[] }) {
  const { plano, importar } = usePlanoPca()
  const showToast = useToast()
  const [ano, setAno] = useState(String(new Date().getFullYear()))
  const [arquivo, setArquivo] = useState<{ nome: string; conteudo: string } | null>(null)
  const [erroDeLeitura, setErroDeLeitura] = useState<string | null>(null)
  const motivoId = useId()

  const ler = async (file: File) => {
    setErroDeLeitura(null)
    try {
      setArquivo({ nome: file.name, conteudo: await file.text() })
    } catch {
      setArquivo(null)
      setErroDeLeitura("Não foi possível ler o arquivo escolhido.")
    }
  }

  return (
    <SectionBlock
      title="PCA do exercício"
      hint="Anexe o Plano de Contratações Anual em CSV para que a plataforma possa procurar nele. A busca é o que permite demonstrar a previsão no inciso II do ETP."
    >
      <div className="flex flex-col gap-4">
        {plano.isPending ? (
          <InlineSpinner label="Consultando o plano do órgão..." />
        ) : plano.data ? (
          <>
            <div className="flex items-center gap-3 rounded-xl border border-border bg-ice px-4 py-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-tint-royal-bg text-royal">
                <IconFile size={18} />
              </span>
              <span className="block flex-1">
                <span className="block text-base font-semibold text-text-1">
                  {plano.data.arquivo}
                </span>
                <span className="mt-0.5 block text-xs text-text-muted">
                  PCA {plano.data.ano} · Importado em {formatData(plano.data.importadoEm)}
                </span>
              </span>
              <Tag tone="success">Ativo</Tag>
            </div>
            <InfoBanner tone="success" icon={<IconCheck size={14} strokeWidth={2.5} />}>
              {/* Itens indexados, e não "arquivo anexado": é o número que diz
                  se a plataforma consegue procurar. */}
              <strong>{plano.data.itensIndexados} itens indexados.</strong> A verificação de
              previsão dos processos deste órgão passa a procurar neste plano.
            </InfoBanner>
          </>
        ) : (
          <InfoBanner tone="info">
            Nenhum PCA importado ainda. Enquanto não houver plano, a seção do inciso II depende
            de o servidor informar o item à mão, processo a processo.
          </InfoBanner>
        )}

        <div className="flex flex-wrap items-end gap-4">
          <FormField label="Exercício">
            <Dropdown
              value={ano}
              onChange={setAno}
              options={anos}
              ariaLabel="Exercício do PCA"
              className="w-40"
            />
          </FormField>
          <label className="cursor-pointer">
            <input
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              aria-label="Arquivo CSV do PCA"
              onChange={(e) => {
                const escolhido = e.target.files?.[0]
                if (escolhido) void ler(escolhido)
              }}
            />
            <span className="inline-block cursor-pointer rounded-[7px] border border-tint-royal-border bg-tint-royal-bg px-3.5 py-1.5 text-sm font-semibold text-royal">
              {arquivo ? "Trocar arquivo" : "Escolher arquivo CSV"}
            </span>
          </label>
          {arquivo && <span className="text-sm text-text-2">{arquivo.nome}</span>}
        </div>

        <p className="m-0 text-xs text-text-muted">
          Uma linha por item, separada por ponto e vírgula:{" "}
          <code>código;descrição;unidade;quantidade;valor</code>. PDF e XLSX ainda não são lidos —
          exporte o plano como CSV na planilha ou no PNCP.
        </p>

        {erroDeLeitura && <InfoBanner tone="warning">{erroDeLeitura}</InfoBanner>}
        {importar.isError && (
          <InfoBanner tone="warning">
            {/* A mensagem do servidor aponta a linha do problema; repeti-la é o
                que permite corrigir a planilha em vez de adivinhar. */}
            {importar.error instanceof Error
              ? importar.error.message
              : "Não foi possível importar o plano."}
          </InfoBanner>
        )}

        <div className="flex gap-2.5">
          <p id={motivoId} className="sr-only">
            Escolha o arquivo CSV do PCA para indexar.
          </p>
          <Button
            disabled={!arquivo || importar.isPending}
            ariaDescribedBy={arquivo ? undefined : motivoId}
            onClick={() => {
              if (!arquivo) return
              importar.mutate(
                { ano: Number(ano), arquivo: arquivo.nome, conteudo: arquivo.conteudo },
                {
                  onSuccess: (importado) => {
                    setArquivo(null)
                    showToast(`PCA ${importado.ano} indexado: ${importado.itensIndexados} itens.`)
                  },
                },
              )
            }}
          >
            {importar.isPending ? "Indexando..." : "Importar e indexar"}
          </Button>
        </div>
      </div>
    </SectionBlock>
  )
}
