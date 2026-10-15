"use client";

import { useRef, useState, type ReactNode } from "react";

import { Button, Dropdown, FormField, Input, Tag, ValidationMsg } from "@/components/ui";
import {
  IconBuilding,
  IconCalendar,
  IconCheck,
  IconFileText,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUpload,
  IconX,
} from "@/components/ui/icons";
import { BaixarDfd } from "@/components/processos/baixar-dfd";
import { ErrorState, LoadingState } from "@/components/shared/estados";
import { useToast } from "@/components/shared/providers";
import {
  useAnexarArquivoAoDfd,
  useAtualizarItensDoDfd,
  useRegistrarDfd,
  useConfigTenant,
  useDfdsDoProcesso,
  useRemoverDfd,
  useVersoesDoArquivoDfd,
} from "@/lib/api/hooks";
import type { DfdAnexado, VersaoDoArquivoDfd } from "@/lib/api/procurement-client";
import { dataBrasiliaISO, formatData, formatarBytes } from "@/lib/format";
import {
  ATALHOS_DE_PRAZO,
  erroDaDataPrevista,
  situacaoDoPrazo,
  somarDias,
} from "@/lib/processos/prazo-do-dfd";
import { pendenciasDaFicha } from "@/lib/secretarias/ficha";

/**
 * O cadastro de DFDs do processo.
 *
 * <p><b>Registrar DFD é uma operação; informar item é outra.</b> São atos de
 * momentos diferentes — o DFD de uma secretaria pode entrar no meio do processo,
 * e o de outra depois —, e o que os liga é o vínculo que a tabela de itens
 * declara, item a item (ADR-036).
 *
 * <p>Vários DFDs por processo é o caso comum: a contratação compartilhada nasce
 * de três secretarias pedindo o mesmo material, cada uma com o seu documento
 * assinado. O arquivo é opcional e pode chegar a qualquer momento — às vezes só
 * no fim (ADR-028).
 */
export function DfdsDoProcesso({ processoId }: { processoId: string }) {
  const dfds = useDfdsDoProcesso(processoId);
  const [registrando, setRegistrando] = useState(false);

  if (dfds.isPending) {
    return <LoadingState label="Carregando os DFDs do processo..." />;
  }
  if (dfds.isError) {
    return (
      <ErrorState
        message={dfds.error instanceof Error ? dfds.error.message : undefined}
        onRetry={() => void dfds.refetch()}
      />
    );
  }

  return (
    /* Sem moldura própria: é uma seção do cartão da demanda, não outro cartão. */
    <div>
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="m-0 font-display text-base font-bold text-text-1">DFDs do processo ({dfds.data.length})</h3>
        </div>
        {!registrando && (
          <Button
            size="sm"
            variant="secondary"
            icon={<IconPlus size={13} strokeWidth={2.5} />}
            onClick={() => setRegistrando(true)}
          >
            Registrar DFD
          </Button>
        )}
      </div>

      {registrando && (
        <RegistrarDfd
          processoId={processoId}
          onPronto={() => setRegistrando(false)}
          onCancelar={() => setRegistrando(false)}
        />
      )}

      {dfds.data.length === 0 ? (
        !registrando && (
          <p className="m-0 rounded-lg border border-dashed border-border bg-surface px-3.5 py-3 text-sm text-text-muted">
            Nenhum DFD registrado.
          </p>
        )
      ) : (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {dfds.data.map((dfd) => (
            <LinhaDoDfd key={dfd.id} processoId={processoId} dfd={dfd} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** Registrar um DFD: quem formalizou, como o processo se refere a ele, e o arquivo. */
function RegistrarDfd({
  processoId,
  onPronto,
  onCancelar,
}: {
  processoId: string;
  onPronto: () => void;
  onCancelar: () => void;
}) {
  const tenant = useConfigTenant();
  const registrar = useRegistrarDfd(processoId);
  const showToast = useToast();

  const [secretaria, setSecretaria] = useState("");
  const [identificacao, setIdentificacao] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [dataPrevista, setDataPrevista] = useState("");
  const campoDeArquivo = useRef<HTMLInputElement>(null);

  const secretarias = tenant.data?.secretarias ?? [];
  const impedimento =
    secretaria === ""
      ? "Escolha a secretaria que formalizou este DFD."
      : identificacao.trim() === ""
        ? "Informe o número ou o nome do DFD."
        : null;

  return (
    <div className="mb-3 rounded-lg border border-royal bg-surface p-4">
      {/*
        Grade de quatro colunas, e não flex com `basis`: as colunas têm largura
        fixa e o topo alinhado, então a dica de um campo não empurra os outros
        para baixo — o formulário não muda de forma enquanto é preenchido.
      */}
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="min-w-0">
          <FormField label="Secretaria que formalizou" required>
            <Dropdown
              value={secretaria}
              onChange={setSecretaria}
              ariaLabel="Secretaria que formalizou"
              options={[
                { value: "", label: "Selecione a secretaria..." },
                ...secretarias.map((s) => ({ value: s.id, label: s.nome })),
              ]}
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField label="Identificação do DFD" required hint="Nº, ofício ou o nome do arquivo.">
            <Input
              value={identificacao}
              onChange={(e) => setIdentificacao(e.target.value)}
              ariaLabel="Identificação do DFD"
              placeholder="Ex: DFD 003/2026 — Educação"
            />
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField label="Arquivo assinado" hint="Opcional.">
            <div className="flex items-center gap-2.5">
              <input
                ref={campoDeArquivo}
                type="file"
                accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                aria-label="Arquivo do DFD"
                onChange={(e) => {
                  const escolhido = e.target.files?.[0] ?? null;
                  setArquivo(escolhido);
                  // Com o documento em mãos, o nome dele identifica melhor que
                  // um campo obrigatório em branco.
                  if (escolhido && identificacao.trim() === "") setIdentificacao(escolhido.name);
                }}
                className="sr-only"
              />
              <Button
                size="sm"
                variant="secondary"
                icon={<IconUpload size={14} />}
                onClick={() => campoDeArquivo.current?.click()}
              >
                Escolher arquivo
              </Button>
              <span className="min-w-0 flex-1 truncate text-xs text-text-3">
                {arquivo ? arquivo.name : "Nenhum arquivo."}
              </span>
            </div>
          </FormField>
        </div>
        <div className="min-w-0">
          <FormField label="Data prevista de conclusão">
            <Input
              type="date"
              value={dataPrevista}
              onChange={(e) => setDataPrevista(e.target.value)}
              ariaLabel="Data prevista de conclusão"
            />
            <AtalhosDePrazo onEscolher={setDataPrevista} />
            {erroDaDataPrevista(dataPrevista) && <ValidationMsg type="error" msg={erroDaDataPrevista(dataPrevista)!} />}
          </FormField>
        </div>
      </div>

      {/*
        Os botões vêm primeiro e o motivo ao lado deles: com o texto na frente,
        ele aparecia e sumia empurrando os botões pela linha — e o que estava
        embaixo do ponteiro deixava de estar.
      */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
        <Button
          size="sm"
          disabled={impedimento !== null || registrar.isPending}
          ariaDescribedBy={`motivo-dfd-${processoId}`}
          onClick={() =>
            registrar.mutate(
              // O DFD nasce sem item: informar o que ele pede é a outra
              // operação, e é lá que o vínculo entre item e DFD é declarado.
              { secretariaId: secretaria, identificacao: identificacao.trim(), arquivo, dataPrevista },
              {
                onSuccess: () => {
                  showToast(`${identificacao.trim()} registrado no processo.`);
                  onPronto();
                },
                onError: (erro) =>
                  showToast(erro instanceof Error ? erro.message : "Não foi possível registrar o DFD."),
              },
            )
          }
        >
          {registrar.isPending ? "Registrando..." : "Registrar DFD"}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancelar}>
          Cancelar
        </Button>
        <p id={`motivo-dfd-${processoId}`} className={impedimento ? "m-0 text-xs text-text-muted" : "sr-only"}>
          {impedimento ?? "Tudo certo para registrar."}
        </p>
      </div>
    </div>
  );
}

/** Uma linha do cadastro: o DFD, o arquivo dele e as ações sobre ele. */
function LinhaDoDfd({ processoId, dfd }: { processoId: string; dfd: DfdAnexado }) {
  const [confirmandoRemocao, setConfirmandoRemocao] = useState(false);
  const [historicoAberto, setHistoricoAberto] = useState(false);
  const campoDeArquivo = useRef<HTMLInputElement>(null);
  const anexarArquivo = useAnexarArquivoAoDfd(processoId);
  const remover = useRemoverDfd(processoId);
  const showToast = useToast();

  const enviarArquivo = (arquivo: File | null) => {
    if (!arquivo) return;
    anexarArquivo.mutate(
      { dfdId: dfd.id, arquivo },
      {
        onSuccess: () =>
          showToast(
            dfd.arquivo ? `Arquivo de ${dfd.nomeDoArquivo} substituído.` : `Arquivo anexado a ${dfd.nomeDoArquivo}.`,
          ),
        onError: (erro) => showToast(erro instanceof Error ? erro.message : "Não foi possível anexar o arquivo."),
      },
    );
    // Sem limpar, escolher o mesmo arquivo de novo não dispara `change`.
    if (campoDeArquivo.current) campoDeArquivo.current.value = "";
  };

  return (
    <li className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-ice px-3.5 py-2.5">
      <span className="flex text-text-muted">
        <IconFileText size={16} />
      </span>
      <span className="min-w-0 flex-1 basis-64">
        <span className="block truncate font-mono text-sm text-text-1">{dfd.nomeDoArquivo}</span>
        <span className="block text-xs text-text-3">
          {dfd.secretaria} · {formatData(dfd.anexadoEm)}
          {dfd.arquivo ? ` · ${formatarBytes(dfd.arquivo.bytes)}` : ""}
        </span>
      </span>
      {/*
        Quantos itens estão vinculados a este DFD. "Sem itens" não é pendência:
        o documento pode ser registrado antes de o detalhamento chegar.
      */}
      <Tag tone={dfd.itens.length === 0 ? "warning" : "neutral"}>
        {dfd.itens.length === 0 ? "Sem itens" : `${dfd.itens.length} ${dfd.itens.length === 1 ? "item" : "itens"}`}
      </Tag>
      <input
        ref={campoDeArquivo}
        type="file"
        accept="application/pdf,.pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        aria-label={`Arquivo de ${dfd.nomeDoArquivo}`}
        onChange={(e) => enviarArquivo(e.target.files?.[0] ?? null)}
        className="sr-only"
      />
      <Button
        size="sm"
        variant="secondary"
        icon={<IconUpload size={13} />}
        disabled={anexarArquivo.isPending}
        onClick={() => campoDeArquivo.current?.click()}
      >
        {anexarArquivo.isPending ? "Enviando..." : dfd.arquivo ? "Substituir" : "Anexar arquivo"}
      </Button>
      {dfd.arquivo && <BaixarDfd processoId={processoId} dfdId={dfd.id} nomeDoArquivo={dfd.nomeDoArquivo} />}
      {dfd.arquivo && (
        <Button size="sm" variant="secondary" onClick={() => setHistoricoAberto((aberto) => !aberto)}>
          {historicoAberto ? "Ocultar versões" : "Versões"}
        </Button>
      )}
      {confirmandoRemocao ? (
        /*
          Confirmar na própria linha, e não num diálogo: remover um DFD leva os
          itens vinculados a ele, e a pessoa precisa continuar vendo qual linha
          está prestes a sair.
        */
        <span className="flex items-center gap-2">
          <span className="text-xs text-text-3">Remover o DFD e os {dfd.itens.length} item(ns) dele?</span>
          <Button
            size="sm"
            variant="danger-soft"
            icon={<IconCheck size={13} strokeWidth={2.5} />}
            disabled={remover.isPending}
            onClick={() =>
              remover.mutate(dfd.id, {
                onSuccess: () => showToast(`${dfd.nomeDoArquivo} removido do processo.`),
                onError: (erro) => showToast(erro instanceof Error ? erro.message : "Não foi possível remover o DFD."),
              })
            }
          >
            {remover.isPending ? "Removendo..." : "Confirmar"}
          </Button>
          <Button size="sm" variant="secondary" icon={<IconX size={13} />} onClick={() => setConfirmandoRemocao(false)}>
            Cancelar
          </Button>
        </span>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          icon={<IconTrash size={13} />}
          onClick={() => setConfirmandoRemocao(true)}
        >
          Remover
        </Button>
      )}
      <div className="grid basis-full grid-cols-1 gap-3 border-t border-border pt-2.5 md:grid-cols-[minmax(0,21rem)_minmax(0,1fr)]">
        <DataPrevista processoId={processoId} dfd={dfd} />
        <FichaNoDfd dfd={dfd} />
      </div>
      {historicoAberto && <HistoricoDoArquivo processoId={processoId} dfdId={dfd.id} />}
    </li>
  );
}

/** Rótulo de um bloco de detalhe da linha do DFD. */
function RotuloDoDetalhe({ icone, children }: { icone: ReactNode; children: ReactNode }) {
  return (
    <span className="mb-1 flex items-center gap-1.5 text-2xs font-semibold tracking-caps text-text-muted uppercase">
      {icone}
      {children}
    </span>
  );
}

/** "+30 dias", "+60 dias", "+90 dias": o prazo mais comum sem abrir o calendário. */
function AtalhosDePrazo({ onEscolher, children }: { onEscolher: (iso: string) => void; children?: ReactNode }) {
  const hoje = dataBrasiliaISO();
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
      Hoje
      {ATALHOS_DE_PRAZO.map((dias) => (
        <button
          key={dias}
          type="button"
          onClick={() => onEscolher(somarDias(hoje, dias))}
          className="cursor-pointer rounded-sm border border-border bg-surface px-1.75 py-0.5 text-xs font-semibold text-text-2 hover:border-royal hover:text-royal"
        >
          +{dias} dias
        </button>
      ))}
      {children}
    </span>
  );
}

/**
 * A data prevista de conclusão da contratação, com edição no próprio bloco
 * (ADR-044). Grava pela mesma rota dos itens, reenviando-os como estão.
 *
 * <p>Quanto falta vem ao lado da data: a vencida aparece em vermelho, sem
 * travar nada — DFD registrado depois da data é caso real.
 */
function DataPrevista({ processoId, dfd }: { processoId: string; dfd: DfdAnexado }) {
  const [editando, setEditando] = useState(false);
  const [data, setData] = useState(dfd.dataPrevista ?? "");
  const gravar = useAtualizarItensDoDfd(processoId);
  const showToast = useToast();
  const erro = erroDaDataPrevista(data);

  const salvar = (nova: string | null) =>
    gravar.mutate(
      { dfdId: dfd.id, itens: dfd.itens, dataPrevista: nova },
      {
        onSuccess: () => {
          setEditando(false);
          showToast(nova ? "Data prevista atualizada." : "Data prevista removida.");
        },
        onError: (falha) => showToast(falha instanceof Error ? falha.message : "Não foi possível salvar a data."),
      },
    );

  if (!editando) {
    const situacao = dfd.dataPrevista ? situacaoDoPrazo(dfd.dataPrevista, dataBrasiliaISO()) : null;
    return (
      <div className="min-w-0">
        <RotuloDoDetalhe icone={<IconCalendar size={12} />}>Conclusão prevista</RotuloDoDetalhe>
        <div className="flex flex-wrap items-center gap-2">
          {dfd.dataPrevista && situacao ? (
            <>
              <span className="text-sm font-semibold text-text-1">{formatData(dfd.dataPrevista)}</span>
              <Tag tone={situacao.tom}>{situacao.rotulo}</Tag>
            </>
          ) : (
            <span className="text-sm text-text-muted italic">Não informada</span>
          )}
          <button
            type="button"
            onClick={() => {
              setData(dfd.dataPrevista ?? "");
              setEditando(true);
            }}
            aria-label={`Data prevista de conclusão de ${dfd.nomeDoArquivo}`}
            className="flex cursor-pointer items-center gap-1 rounded-sm border-0 bg-transparent px-1 py-0.5 text-xs font-semibold text-royal hover:bg-tint-royal-bg"
          >
            <IconPencil size={11} />
            {dfd.dataPrevista ? "Alterar" : "Informar"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-w-0">
      <RotuloDoDetalhe icone={<IconCalendar size={12} />}>Conclusão prevista</RotuloDoDetalhe>
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="w-40">
          <Input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            ariaLabel={`Nova data prevista de ${dfd.nomeDoArquivo}`}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Escape") setEditando(false);
              if (e.key === "Enter" && data && !erro) salvar(data);
            }}
          />
        </div>
        <Button size="sm" disabled={gravar.isPending} onClick={() => !erro && salvar(data || null)}>
          {gravar.isPending ? "Salvando..." : "Salvar"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditando(false)}>
          Cancelar
        </Button>
      </div>
      <AtalhosDePrazo onEscolher={setData}>
        {dfd.dataPrevista && (
          <button
            type="button"
            onClick={() => salvar(null)}
            className="ml-1 cursor-pointer border-0 bg-transparent p-0 text-xs text-text-muted underline hover:text-danger"
          >
            Remover a data
          </button>
        )}
      </AtalhosDePrazo>
      {erro && <ValidationMsg type="error" msg={erro} />}
    </div>
  );
}

/**
 * A ficha da secretaria de origem, como o DFD a mostra — sem que se digite de
 * novo a cada processo (ADR-044). O CPF do secretário vem mascarado.
 */
function FichaNoDfd({ dfd }: { dfd: DfdAnexado }) {
  const ficha = dfd.fichaDaSecretaria;
  const faltam = pendenciasDaFicha(ficha);
  const partes = [
    ficha.ug && `UG ${ficha.ug}`,
    ficha.email,
    ficha.endereco,
    ficha.secretario &&
      `Secretário(a): ${ficha.secretario}${ficha.cpfDoSecretario ? ` (CPF ${ficha.cpfDoSecretario})` : ""}${
        ficha.decretoDeNomeacao ? ` — ${ficha.decretoDeNomeacao}` : ""
      }`,
  ].filter(Boolean);
  return (
    <div className="min-w-0 text-xs text-text-3">
      <RotuloDoDetalhe icone={<IconBuilding size={12} />}>Secretaria requisitante</RotuloDoDetalhe>
      {partes.length > 0 && <span className="block leading-normal">{partes.join(" · ")}</span>}
      {faltam.length > 0 && (
        <span className="block text-text-muted">
          Ficha da secretaria sem {faltam.join(", ")} — o coordenador completa em Configurações › Secretarias.
        </span>
      )}
    </div>
  );
}

function HistoricoDoArquivo({ processoId, dfdId }: { processoId: string; dfdId: string }) {
  const versoes = useVersoesDoArquivoDfd(processoId, dfdId, true);

  if (versoes.isPending) return <p className="basis-full m-0 text-xs text-text-muted">Carregando versões...</p>;
  if (versoes.isError) {
    return (
      <div className="basis-full flex items-center gap-2 text-xs text-danger">
        Não foi possível carregar o histórico.
        <Button size="sm" variant="secondary" onClick={() => void versoes.refetch()}>Tentar novamente</Button>
      </div>
    );
  }
  if (versoes.data.length === 0) return <p className="basis-full m-0 text-xs text-text-muted">Nenhuma versão disponível.</p>;

  return (
    <div className="basis-full border-t border-border pt-2">
      <p className="m-0 mb-1 text-xs font-semibold text-text-2">Histórico de arquivos</p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {versoes.data.map((versao) => <LinhaDaVersao key={versao.versao} processoId={processoId} dfdId={dfdId} versao={versao} />)}
      </ul>
    </div>
  );
}

function LinhaDaVersao({ processoId, dfdId, versao }: { processoId: string; dfdId: string; versao: VersaoDoArquivoDfd }) {
  return (
    <li className="flex flex-wrap items-center gap-2 text-xs text-text-3">
      <span className="font-mono text-text-2">v{versao.versao}</span>
      {versao.vigente && <Tag tone="success">Versão vigente</Tag>}
      <span className="min-w-0 flex-1 truncate">{versao.nomeDoArquivo} · {formatarBytes(versao.bytes)} · {formatData(versao.enviadoEm)} · {versao.enviadoPor}</span>
      <BaixarDfd processoId={processoId} dfdId={dfdId} nomeDoArquivo={versao.nomeDoArquivo} versao={versao.versao} />
    </li>
  );
}
