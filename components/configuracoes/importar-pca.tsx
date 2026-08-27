"use client"

import { useId, useState } from "react"

import { Button, Dropdown, FormField, InfoBanner, SectionBlock, Tag } from "@/components/ui"
import { IconCheck, IconFile, IconUpload } from "@/components/ui/icons"
import { InlineSpinner } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { usePlanosPca } from "@/lib/api/hooks"
import { anoBrasilia, formatData } from "@/lib/format"
import type { PlanoPca } from "@/lib/api/pca-client"

/**
 * O PCA do órgão: anexar, indexar e ver o que ficou procurável.
 *
 * O número que importa é **itens indexados**, e não "arquivo anexado". É ele que
 * separa "guardei o plano" de "a plataforma consegue procurar nele" — e é a
 * busca que a seção do inciso II precisa para demonstrar a previsão.
 *
 * Só CSV, e isso está escrito na tela. Aceitar PDF e dizer "carregado com
 * sucesso" seria a plataforma afirmando ter lido um arquivo que ninguém leu.
 *
 * **Um plano por exercício, e todos ficam.** O PCA de um ano descreve o que o
 * órgão pretende contratar naquele ano (Art. 12, VII, da Lei 14.133/21), e é
 * contra o plano do **exercício do processo** que a previsão é demonstrada.
 * Guardar os anteriores é o que permite gerar de novo, em 2028, o documento de
 * um processo de 2026 e obter a mesma citação.
 */
export function ImportarPca({ anos }: { anos: { value: string; label: string }[] }) {
  const { planos, importar } = usePlanosPca()
  const showToast = useToast()
  const exercicioCorrente = anoBrasilia()
  const [ano, setAno] = useState(String(exercicioCorrente))
  const [arquivo, setArquivo] = useState<{ nome: string; conteudo: string } | null>(null)
  const [erroDeLeitura, setErroDeLeitura] = useState<string | null>(null)
  const motivoId = useId()

  const lista = planos.data ?? []
  const doExercicio = lista.find((p) => p.ano === exercicioCorrente)
  const substituira = lista.find((p) => p.ano === Number(ano))

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
    <div className="flex flex-col gap-5">
      <SectionBlock
        title="Planos anexados"
        hint="Um plano por exercício. Cada processo demonstra a previsão no PCA do ano em que foi aberto — por isso os exercícios anteriores continuam aqui."
      >
        {planos.isPending ? (
          <InlineSpinner label="Consultando os planos do órgão..." />
        ) : lista.length === 0 ? (
          <InfoBanner tone="info">
            Nenhum PCA importado ainda. Enquanto não houver plano, a seção do inciso II depende de o
            servidor informar o item à mão, processo a processo.
          </InfoBanner>
        ) : (
          <div className="flex flex-col gap-2.5">
            {lista.map((plano) => (
              <LinhaDoPlano
                key={plano.ano}
                plano={plano}
                doExercicioCorrente={plano.ano === exercicioCorrente}
              />
            ))}
          </div>
        )}

        {/* O aviso que a tela não dava: ter PCA de 2026 não cobre um processo
            aberto em 2027, e descobrir isso no painel do inciso II, processo a
            processo, é tarde demais. */}
        {!planos.isPending && lista.length > 0 && !doExercicio && (
          <div className="mt-4">
            <InfoBanner tone="warning">
              <div className="font-semibold">
                Não há PCA de {exercicioCorrente} — o exercício corrente.
              </div>
              <p className="m-0 mt-1">
                Os processos abertos este ano demonstram a previsão no plano de{" "}
                {exercicioCorrente}, e não no de {lista[0]?.ano}: o PCA de um exercício descreve o
                que o órgão pretende contratar <strong>naquele</strong> ano. Enquanto ele não for
                importado, cada processo deste ano depende de o servidor informar o item à mão.
              </p>
            </InfoBanner>
          </div>
        )}
      </SectionBlock>

      <SectionBlock
        title="Importar plano"
        hint="Anexe o Plano de Contratações Anual em CSV para que a plataforma possa procurar nele. A busca é o que permite demonstrar a previsão no inciso II do ETP."
      >
        <div className="flex flex-col gap-4">
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
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-[7px] border border-tint-royal-border bg-tint-royal-bg px-3.5 py-1.5 text-sm font-semibold text-royal">
                <IconUpload size={14} strokeWidth={2} />
                {arquivo ? "Trocar arquivo" : "Escolher arquivo CSV"}
              </span>
            </label>
            {arquivo && <span className="text-sm text-text-2">{arquivo.nome}</span>}
          </div>

          {/* Importar de novo o mesmo exercício substitui o plano inteiro. Dizer
              isso antes do clique é o que evita a surpresa de um plano trocado. */}
          {substituira && (
            <InfoBanner tone="warning">
              Já existe um PCA de {ano} ({substituira.arquivo}, {substituira.itensIndexados} itens).
              Importar substitui o plano desse exercício por inteiro.
            </InfoBanner>
          )}

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
    </div>
  )
}

/** Um exercício já importado, com o que dele ficou procurável. */
function LinhaDoPlano({
  plano,
  doExercicioCorrente,
}: {
  plano: PlanoPca
  doExercicioCorrente: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-ice px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-tint-royal-bg text-royal">
        <IconFile size={18} />
      </span>
      <span className="block min-w-0 flex-1">
        <span className="block font-display text-md font-bold text-text-1">PCA {plano.ano}</span>
        <span className="mt-0.5 block truncate text-xs text-text-muted">
          {plano.arquivo} · importado em {formatData(plano.importadoEm)}
        </span>
      </span>
      {/* Itens indexados, e não "arquivo anexado": é o número que diz se a
          plataforma consegue procurar. */}
      <span className="flex items-center gap-1.5 text-sm font-semibold text-text-2">
        <IconCheck size={14} strokeWidth={2.5} />
        {plano.itensIndexados} itens indexados
      </span>
      {doExercicioCorrente && <Tag tone="success">Exercício corrente</Tag>}
    </div>
  )
}
