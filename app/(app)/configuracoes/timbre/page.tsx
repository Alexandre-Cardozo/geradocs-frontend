"use client"

import { useRef, useState } from "react"

import { Button, SectionBlock, Textarea } from "@/components/ui"
import { IconImage, IconUpload } from "@/components/ui/icons"
import { ErrorState, LoadingState } from "@/components/shared/estados"
import { useToast } from "@/components/shared/providers"
import { PreviaDoTimbre } from "@/components/configuracoes/previa-do-timbre"
import {
  useBrasao,
  useEnviarBrasao,
  useRemoverBrasao,
  useSalvarTextosDoTimbre,
  useSessao,
  useTimbre,
} from "@/lib/api/hooks"
import { FORMATOS_DE_BRASAO, TAMANHO_MAXIMO_DO_BRASAO } from "@/lib/api/access-client"
import { formatarBytes } from "@/lib/format"

/**
 * Timbragem do órgão: brasão, cabeçalho e rodapé (ADR-026).
 *
 * As três coisas saem na mesma folha, e a prévia ao lado mostra a folha inteira
 * — por isso vivem numa tela só, e não em abas que obrigavam a alternar para ver
 * o efeito do que se acabou de digitar.
 */
export default function Timbre() {
  const showToast = useToast()
  const { data: sessao } = useSessao()
  const entidadeId = sessao?.entidade?.id
  const timbre = useTimbre(entidadeId)
  const brasaoUrl = useBrasao(entidadeId, timbre.data?.temBrasao ?? false)
  const salvarTimbre = useSalvarTextosDoTimbre(entidadeId)
  const enviarBrasaoDoNome = useEnviarBrasao(entidadeId)
  const removerBrasaoDoNome = useRemoverBrasao(entidadeId)

  const seletorDeBrasao = useRef<HTMLInputElement>(null)
  const [cabecalho, setCabecalho] = useState("")
  const [rodape, setRodape] = useState("")
  const [timbreSincronizado, setTimbreSincronizado] = useState<number | null>(null)

  // O timbre vem do servidor. Semeia uma vez, e de novo a cada versão nova:
  // salvar sobe a versão, e o formulário precisa refletir o que foi gravado.
  if (timbre.data && timbreSincronizado !== timbre.data.versao) {
    setTimbreSincronizado(timbre.data.versao)
    setCabecalho(timbre.data.cabecalho)
    setRodape(timbre.data.rodape)
  }

  if (timbre.isPending) {
    return (
      <div className="max-w-content p-4 sm:p-5 lg:p-7">
        <LoadingState label="Carregando o timbre..." />
      </div>
    )
  }
  if (timbre.isError) {
    return (
      <div className="max-w-content p-4 sm:p-5 lg:p-7">
        <div className="rounded-card border border-border bg-surface">
          <ErrorState onRetry={() => void timbre.refetch()} />
        </div>
      </div>
    )
  }

  /**
   * O brasão vai para o servidor (ADR-026).
   *
   * <p>Antes ele virava data URL e morria no estado da tela: a entidade
   * "configurava" o timbre, recarregava e ele sumia — e nenhum documento saía
   * com ele.
   */
  const selecionarBrasao = (arquivo: File) => {
    if (arquivo.size > TAMANHO_MAXIMO_DO_BRASAO) {
      showToast(
        `O brasão tem ${formatarBytes(arquivo.size)} e o limite é ${formatarBytes(TAMANHO_MAXIMO_DO_BRASAO)}.`,
      )
      return
    }
    enviarBrasaoDoNome.mutate(arquivo, {
      onSuccess: () => showToast("Brasão atualizado. Ele sairá nos próximos documentos."),
      onError: (erro) =>
        showToast(erro instanceof Error ? erro.message : "Não foi possível enviar o brasão."),
    })
  }

  return (
    <div className="max-w-content p-4 sm:p-5 lg:p-7">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-5">
          <SectionBlock
            title="Logotipo / Brasão da Entidade"
            hint="Sai no cabeçalho de todo documento gerado — DOCX e PDF. PNG ou JPEG, até 512 KB."
          >
            <input
              ref={seletorDeBrasao}
              type="file"
              accept={FORMATOS_DE_BRASAO}
              className="hidden"
              aria-label="Escolher o brasão da entidade"
              onChange={(e) => {
                const arquivo = e.target.files?.[0]
                // Zera: escolher o mesmo arquivo duas vezes não dispara
                // `change`, e a segunda tentativa pareceria travada.
                e.target.value = ""
                if (arquivo) selecionarBrasao(arquivo)
              }}
            />
            {timbre.data.temBrasao ? (
              <div className="flex items-center gap-4">
                <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-border-soft text-text-muted">
                  {brasaoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- object URL de rota autenticada
                    <img
                      src={brasaoUrl}
                      alt="Brasão da entidade"
                      className="size-full object-contain"
                    />
                  ) : (
                    <IconImage size={32} strokeWidth={1.5} />
                  )}
                </div>
                <div>
                  <div className="text-base font-semibold text-text-1">Brasão cadastrado</div>
                  <div className="mt-0.5 text-sm text-text-muted">
                    Sai no cabeçalho de todo documento gerado por este órgão.
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={enviarBrasaoDoNome.isPending}
                      onClick={() => seletorDeBrasao.current?.click()}
                    >
                      {enviarBrasaoDoNome.isPending ? "Enviando..." : "Substituir"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={removerBrasaoDoNome.isPending}
                      onClick={() =>
                        removerBrasaoDoNome.mutate(undefined, {
                          onSuccess: () => showToast("Brasão removido."),
                        })
                      }
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => seletorDeBrasao.current?.click()}
                className="block w-full cursor-pointer border-0 bg-transparent p-0 text-left"
              >
                <div className="rounded-md border-2 border-dashed border-text-faint bg-surface-upload px-5 py-4.5 text-center transition-colors">
                  <span className="mx-auto mb-2 block w-5 text-text-muted">
                    <IconUpload size={20} strokeWidth={1.5} />
                  </span>
                  <p className="m-0 text-base text-text-3">Clique para selecionar o brasão</p>
                  <p className="mt-1 mb-0 text-xs text-text-muted">PNG ou JPEG</p>
                </div>
              </button>
            )}
          </SectionBlock>

          <SectionBlock
            title="Cabeçalho dos Documentos"
            hint="Texto exibido no topo de cada página dos documentos gerados. Use quebras de linha para organizar as informações. Variáveis disponíveis: {processo}, {data}, {secretaria}."
          >
            <Textarea value={cabecalho} onChange={(e) => setCabecalho(e.target.value)} rows={4} />
          </SectionBlock>

          <SectionBlock
            title="Rodapé dos Documentos"
            hint="Texto exibido na parte inferior de cada página. Variáveis disponíveis: {processo}, {data}, {numero}, {pagina}."
          >
            <Textarea value={rodape} onChange={(e) => setRodape(e.target.value)} rows={3} />
          </SectionBlock>

          <div className="flex gap-2.5">
            <Button
              disabled={salvarTimbre.isPending}
              onClick={() =>
                salvarTimbre.mutate(
                  { cabecalho, rodape },
                  {
                    onSuccess: () =>
                      showToast("Cabeçalho e rodapé salvos. Saem nos próximos documentos."),
                    onError: (erro) =>
                      showToast(erro instanceof Error ? erro.message : "Não foi possível salvar."),
                  },
                )
              }
            >
              {salvarTimbre.isPending ? "Salvando..." : "Salvar Cabeçalho e Rodapé"}
            </Button>
          </div>
        </div>

        <PreviaDoTimbre logoUrl={brasaoUrl} cabecalho={cabecalho} rodape={rodape} />
      </div>
    </div>
  )
}
