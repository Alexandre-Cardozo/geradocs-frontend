"use client"

import { useState } from "react"

import { Button, FileUpload, InfoBanner, Tag, Textarea, ValidationMsg } from "@/components/ui"
import { useToast } from "@/components/shared/providers"
import { useNormas, useVersoesDaNorma } from "@/lib/api/hooks"
import type { DadosDaNorma, Norma } from "@/lib/api/regulation-client"
import { formatData, formatDataHora, formatarBytes } from "@/lib/format"
import { FORMATOS_DA_NORMA, citacaoDaNorma, dadosDe } from "@/lib/normas/norma"

import { BaixarNorma } from "./baixar-norma"
import { FormularioDeNorma } from "./formulario-de-norma"

type Painel = "nenhum" | "corrigir" | "arquivo" | "revogar" | "excluir"

const mensagem = (erro: unknown, padrao: string) => (erro instanceof Error ? erro.message : padrao)

/**
 * Uma norma do acervo.
 *
 * <p>Todo servidor vê e baixa. As ações de alterar só aparecem para o
 * coordenador — o servidor também as recusaria, mas botão que leva a "acesso
 * negado" é botão que não deveria estar ali.
 */
export function CartaoDeNorma({ norma, coordenador }: { norma: Norma; coordenador: boolean }) {
  const showToast = useToast()
  const { corrigir, trocarArquivo, revogar, restabelecer, excluir } = useNormas()
  const [painel, setPainel] = useState<Painel>("nenhum")
  const [versoesAbertas, setVersoesAbertas] = useState(false)
  const versoes = useVersoesDaNorma(norma.id, versoesAbertas)
  const [texto, setTexto] = useState("")
  const [nomeDoArquivo, setNomeDoArquivo] = useState<string | null>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  const [tentou, setTentou] = useState(false)

  const abrir = (qual: Painel) => {
    setPainel(qual)
    setTexto("")
    setNomeDoArquivo(null)
    setArquivo(null)
    setTentou(false)
  }
  const fechar = () => abrir("nenhum")

  const salvarCorrecao = (dados: DadosDaNorma) =>
    corrigir.mutate(
      { id: norma.id, versao: norma.versao, dados },
      {
        onSuccess: () => {
          fechar()
          showToast("Dados da norma atualizados.")
        },
        onError: (erro) => showToast(mensagem(erro, "Não foi possível salvar as alterações.")),
      },
    )

  const enviarArquivo = () => {
    setTentou(true)
    if (!arquivo) return
    trocarArquivo.mutate(
      { id: norma.id, arquivo },
      {
        onSuccess: (atualizada) => {
          fechar()
          showToast(`Arquivo substituído — versão ${atualizada.arquivo.versao}. A anterior continua guardada.`)
        },
        onError: (erro) => showToast(mensagem(erro, "Não foi possível enviar o arquivo.")),
      },
    )
  }

  const confirmarRevogacao = () =>
    revogar.mutate(
      { id: norma.id, observacao: texto },
      {
        onSuccess: () => {
          fechar()
          showToast("Norma revogada. Ela continua no acervo, marcada como revogada.")
        },
        onError: (erro) => showToast(mensagem(erro, "Não foi possível revogar a norma.")),
      },
    )

  const justificativaCurta = texto.trim().length < 10
  const confirmarExclusao = () => {
    setTentou(true)
    if (justificativaCurta) return
    excluir.mutate(
      { id: norma.id, justificativa: texto.trim() },
      {
        onSuccess: () => showToast("Norma excluída do acervo. O registro fica na trilha."),
        onError: (erro) => showToast(mensagem(erro, "Não foi possível excluir a norma.")),
      },
    )
  }

  return (
    <article
      aria-label={citacaoDaNorma(norma)}
      className={`rounded-card border border-border p-5 ${norma.vigente ? "bg-surface" : "bg-ice"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="m-0 font-display text-md font-bold text-text-1">{citacaoDaNorma(norma)}</h3>
            {norma.vigente ? <Tag tone="success">Vigente</Tag> : <Tag tone="neutral">Revogada</Tag>}
          </div>
          <p className="m-0 mt-1.5 text-base break-words text-text-2">{norma.ementa}</p>
          {norma.observacao && <p className="m-0 mt-1.5 text-sm break-words text-text-3">{norma.observacao}</p>}
          {!norma.vigente && (
            <p className="m-0 mt-1.5 text-sm text-text-3">
              Revogada em {formatData(norma.revogadaEm ?? norma.atualizadaEm)}
              {norma.observacaoDaRevogacao ? ` — ${norma.observacaoDaRevogacao}` : ""}.
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2.5 rounded-md border border-border bg-ice px-3.5 py-2.5">
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-text-2" title={norma.arquivo.nomeDoArquivo}>
          {norma.arquivo.nomeDoArquivo}
        </span>
        <span className="font-mono text-xs text-text-muted">
          {formatarBytes(norma.arquivo.bytes)} · v{norma.arquivo.versao}
        </span>
        <BaixarNorma normaId={norma.id} versao={norma.arquivo.versao} nomeDoArquivo={norma.arquivo.nomeDoArquivo} />
      </div>

      {!norma.arquivo.textoDisponivel && (
        <InfoBanner tone="warning" className="mt-3">
          Arquivo sem texto legível (PDF digitalizado?): a IA não consegue lê-lo.
          {coordenador ? " Envie uma versão com texto." : ""}
        </InfoBanner>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {norma.arquivo.versao > 1 && (
          <Button size="sm" variant="ghost" onClick={() => setVersoesAbertas((v) => !v)}>
            {versoesAbertas ? "Ocultar versões" : `Versões anteriores (${norma.arquivo.versao - 1})`}
          </Button>
        )}
        {coordenador && painel === "nenhum" && (
          <>
            <Button size="sm" variant="ghost" onClick={() => abrir("corrigir")}>
              Editar dados
            </Button>
            <Button size="sm" variant="ghost" onClick={() => abrir("arquivo")}>
              Trocar arquivo
            </Button>
            {norma.vigente ? (
              <Button size="sm" variant="ghost" onClick={() => abrir("revogar")}>
                Revogar
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled={restabelecer.isPending}
                onClick={() =>
                  restabelecer.mutate(norma.id, {
                    onSuccess: () => showToast("Revogação desfeita: a norma voltou a ser vigente."),
                    onError: (erro) => showToast(mensagem(erro, "Não foi possível desfazer a revogação.")),
                  })
                }
              >
                Desfazer revogação
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => abrir("excluir")}>
              Excluir
            </Button>
          </>
        )}
      </div>

      {versoesAbertas && (
        <ul className="m-0 mt-3 flex list-none flex-col gap-2 p-0">
          {(versoes.data ?? [])
            .filter((v) => !v.vigente)
            .map((v) => (
              <li key={v.versao} className="flex flex-wrap items-center gap-2.5 text-sm text-text-3">
                <span className="font-mono text-xs">v{v.versao}</span>
                <span className="min-w-0 flex-1 truncate">{v.nomeDoArquivo}</span>
                <span className="text-xs">enviada em {formatDataHora(v.enviadoEm)}</span>
                <BaixarNorma normaId={norma.id} versao={v.versao} nomeDoArquivo={v.nomeDoArquivo} />
              </li>
            ))}
          {versoes.isPending && <li className="text-sm text-text-muted">Carregando versões...</li>}
        </ul>
      )}

      {painel === "corrigir" && (
        <div className="mt-4 border-t border-border pt-4">
          <FormularioDeNorma
            modo="correcao"
            inicial={dadosDe(norma)}
            pendente={corrigir.isPending}
            onEnviar={(dados) => salvarCorrecao(dados)}
            onCancelar={fechar}
          />
        </div>
      )}

      {painel === "arquivo" && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <p className="m-0 text-sm text-text-3">
            O atual fica guardado como versão {norma.arquivo.versao}.
          </p>
          <FileUpload
            file={nomeDoArquivo}
            onChange={setNomeDoArquivo}
            onArquivo={setArquivo}
            accept={FORMATOS_DA_NORMA}
            placeholder="Clique para selecionar o arquivo novo"
          />
          {tentou && !arquivo && <ValidationMsg type="error" msg="Escolha o arquivo novo." />}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" disabled={trocarArquivo.isPending} onClick={fechar}>
              Cancelar
            </Button>
            <Button disabled={trocarArquivo.isPending} onClick={enviarArquivo}>
              {trocarArquivo.isPending ? "Enviando..." : "Enviar Arquivo"}
            </Button>
          </div>
        </div>
      )}

      {painel === "revogar" && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <p className="m-0 text-sm text-text-3">
            A norma continua no acervo, marcada como revogada.
          </p>
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            placeholder="Opcional. Ex.: revogada pelo Decreto nº 11.002/2026"
          />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" disabled={revogar.isPending} onClick={fechar}>
              Cancelar
            </Button>
            <Button disabled={revogar.isPending} onClick={confirmarRevogacao}>
              {revogar.isPending ? "Revogando..." : "Confirmar Revogação"}
            </Button>
          </div>
        </div>
      )}

      {painel === "excluir" && (
        <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4">
          <p className="m-0 text-sm text-text-3">
            Só para cadastro feito por engano. Se deixou de valer, <strong>revogue</strong>.
          </p>
          <Textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            placeholder="Por que esta norma está sendo excluída?"
          />
          {tentou && justificativaCurta && (
            <ValidationMsg type="error" msg="Explique o motivo em ao menos 10 caracteres." />
          )}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" disabled={excluir.isPending} onClick={fechar}>
              Cancelar
            </Button>
            <Button variant="danger-soft" disabled={excluir.isPending} onClick={confirmarExclusao}>
              {excluir.isPending ? "Excluindo..." : "Excluir Norma"}
            </Button>
          </div>
        </div>
      )}

      <p className="m-0 mt-3 text-xs text-text-muted">Atualizada em {formatDataHora(norma.atualizadaEm)}</p>
    </article>
  )
}
