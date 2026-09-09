"use client"

import { useId, useState } from "react"

import { Button, Dropdown, FormField, InfoBanner, SectionBlock, Tag } from "@/components/ui"
import { IconCheck, IconDownload, IconFile, IconUpload } from "@/components/ui/icons"
import { InlineSpinner } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { usePlanosPca } from "@/lib/api/hooks"
import { baixarPlanoPca } from "@/lib/api/client"
import { anoBrasilia, formatData, formatarBytes } from "@/lib/format"
import type { PlanoPca } from "@/lib/api/pca-client"

/** O que a plataforma lê. O XLS antigo é binário e de outro formato. */
const FORMATOS = ".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

/**
 * O PCA do órgão: anexar, indexar e ver o que ficou procurável.
 *
 * O número que importa é **itens indexados**, e não "arquivo anexado". É ele que
 * separa "guardei o plano" de "a plataforma consegue procurar nele" — e é a
 * busca que a seção do inciso II precisa para demonstrar a previsão.
 *
 * CSV e XLSX — a planilha como ela sai do PNCP, do Excel e do LibreOffice. O
 * que a plataforma não lê está escrito na tela: aceitar PDF e dizer "carregado
 * com sucesso" seria afirmar ter lido um arquivo que ninguém leu.
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
  const [arquivo, setArquivo] = useState<File | null>(null)
  const motivoId = useId()

  const lista = planos.data ?? []
  const doExercicio = lista.find((p) => p.ano === exercicioCorrente)
  const substituira = lista.find((p) => p.ano === Number(ano))

  return (
    <div className="flex flex-col gap-5">
      <SectionBlock
        title="Importar plano"
        hint="Anexe o Plano de Contratações Anual em XLSX ou CSV para que a plataforma possa procurar nele. A busca é o que permite demonstrar a previsão no inciso II do ETP."
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
                accept={FORMATOS}
                className="hidden"
                aria-label="Planilha do PCA"
                onChange={(e) => {
                  const escolhido = e.target.files?.[0]
                  // Zera: escolher o mesmo arquivo duas vezes não dispara
                  // `change`, e a segunda tentativa pareceria travada.
                  e.target.value = ""
                  if (escolhido) setArquivo(escolhido)
                }}
              />
              <span className="inline-flex cursor-pointer items-center gap-2 rounded-[7px] border border-tint-royal-border bg-tint-royal-bg px-3.5 py-1.5 text-sm font-semibold text-royal">
                <IconUpload size={14} strokeWidth={2} />
                {arquivo ? "Trocar planilha" : "Escolher planilha"}
              </span>
            </label>
            {arquivo && (
              <span className="text-sm text-text-2">
                {arquivo.name} · {formatarBytes(arquivo.size)}
              </span>
            )}
          </div>

          {/* Importar de novo o mesmo exercício substitui o plano inteiro. Dizer
              isso antes do clique é o que evita a surpresa de um plano trocado —
              e a troca vai para a trilha do órgão com o que saiu e o que entrou. */}
          {substituira && (
            <InfoBanner tone="warning">
              <div className="font-semibold">Já existe um PCA de {ano}.</div>
              <p className="m-0 mt-1">
                {substituira.arquivo} · {substituira.itensIndexados} itens · importado por{" "}
                {substituira.importadoPor} em {formatData(substituira.importadoEm)}. Importar
                substitui o plano desse exercício por inteiro, e a substituição fica registrada na
                trilha do órgão com o arquivo que saiu e o que entrou.
              </p>
            </InfoBanner>
          )}

          <p className="m-0 text-xs text-text-muted">
            A leitura é pelo <strong>cabeçalho da primeira aba</strong>: a plataforma procura as
            colunas de <code>código</code>, <code>descrição</code> (ou <code>objeto</code>),{" "}
            <code>unidade</code>, <code>quantidade</code> e <code>valor</code> (ou{" "}
            <code>totais</code>), e ignora as demais. Sem cabeçalho reconhecível, valem essas cinco
            colunas nessa ordem — em CSV, separadas por ponto e vírgula. Linha sem objeto, como a de
            totais, não vira contratação. PDF não é lido, e o XLS antigo precisa ser salvo como
            XLSX.
          </p>
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
              Escolha a planilha do PCA para indexar.
            </p>
            <Button
              disabled={!arquivo || importar.isPending}
              ariaDescribedBy={arquivo ? undefined : motivoId}
              onClick={() => {
                if (!arquivo) return
                importar.mutate(
                  { ano: Number(ano), arquivo },
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

    </div>
  )
}

/** Um exercício já importado, com o que dele ficou procurável e o arquivo. */
function LinhaDoPlano({
  plano,
  doExercicioCorrente,
}: {
  plano: PlanoPca
  doExercicioCorrente: boolean
}) {
  const showToast = useToast()
  const [baixando, setBaixando] = useState(false)

  const baixar = async () => {
    setBaixando(true)
    try {
      const { conteudo, nomeSugerido } = await baixarPlanoPca(plano.ano)
      const endereco = URL.createObjectURL(conteudo)
      const ancora = document.createElement("a")
      ancora.href = endereco
      ancora.download = nomeSugerido ?? plano.arquivo
      ancora.click()
      // Sem revogar, cada download deixa o arquivo inteiro preso em memória.
      URL.revokeObjectURL(endereco)
    } catch (erro) {
      showToast(erro instanceof Error ? erro.message : "Não foi possível baixar a planilha.")
    } finally {
      setBaixando(false)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-ice px-4 py-3">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-tint-royal-bg text-royal">
        <IconFile size={18} />
      </span>
      <span className="block min-w-0 flex-[1_1_12rem]">
        <span className="block font-display text-md font-bold text-text-1">PCA {plano.ano}</span>
        {/* Quem importou fica na linha: substituir um plano é ato de gestão, e a
            tela precisa dizer de quem foi sem obrigar a abrir a trilha. */}
        {/* Sem truncar: quem importou e quando é o que responde "de onde veio
            este plano", e meia frase não responde. */}
        <span className="mt-0.5 block text-xs break-words text-text-muted">
          {plano.arquivo} · importado por {plano.importadoPor} em {formatData(plano.importadoEm)}
        </span>
      </span>
      {/* Itens indexados, e não "arquivo anexado": é o número que diz se a
          plataforma consegue procurar. */}
      <span className="flex items-center gap-1.5 text-sm font-semibold text-text-2">
        <IconCheck size={14} strokeWidth={2.5} />
        {plano.itensIndexados} itens indexados
      </span>
      {doExercicioCorrente && <Tag tone="success">Exercício corrente</Tag>}
      {plano.arquivoGuardado ? (
        <Button
          size="sm"
          variant="secondary"
          icon={<IconDownload size={13} />}
          disabled={baixando}
          onClick={() => void baixar()}
        >
          {baixando ? "Baixando..." : "Baixar"}
        </Button>
      ) : (
        // Plano importado antes de a plataforma guardar o arquivo: oferecer o
        // download prometeria um arquivo que não existe.
        <span className="text-xs text-text-muted">Arquivo não guardado</span>
      )}
    </div>
  )
}
