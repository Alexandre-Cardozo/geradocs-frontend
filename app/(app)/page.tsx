"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { StatCard, StatusBadge } from "@/components/ui";
import {
  IconCheckCircle,
  IconClock,
  IconDownload,
  IconFile,
  IconPlus,
} from "@/components/ui/icons";
import { ErrorState, SkeletonRows } from "@/components/shared/estados";
import { Th } from "@/components/shared/tabela";
import { useEstatisticas, useProcessos, useSessao } from "@/lib/api/hooks";
import { dataPorExtenso, formatBRL, formatData, saudacao } from "@/lib/format";
import PainelAdmin from "@/app/(app)/admin/PainelAdmin";

export default function Dashboard() {
  const router = useRouter();
  const { data: sessao } = useSessao();
  const usuario = sessao?.usuario;
  const estatisticas = useEstatisticas();
  const processos = useProcessos({ porPagina: 5 });

  const recentes = processos.data?.itens ?? [];

  // O admin geral vê um painel de sistema (entidades e servidores), não o fluxo de processos.
  if (usuario?.perfilAcesso === "admin_geral") return <PainelAdmin />;

  return (
    <div className="w-full p-4 sm:p-5 lg:p-7">
      {/* Saudação — data e período do dia no horário de Brasília; nome do servidor logado */}
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 lg:mb-7">
        <div>
          <p className="m-0 mb-1 text-base text-text-3" suppressHydrationWarning>
            {dataPorExtenso()}
          </p>
          <h2 className="m-0 font-display text-3xl font-extrabold tracking-tight text-text-1" suppressHydrationWarning>
            {saudacao()}, {usuario?.primeiroNome ?? "..."}
          </h2>
          {sessao?.entidade && <p className="m-0 mt-0.5 text-sm text-text-muted">{sessao.entidade.nome}</p>}
        </div>
        <Link
          href="/processos/novo"
          className="flex items-center gap-2 rounded-xl bg-royal px-5 py-2.75 text-md font-semibold text-surface no-underline transition-colors hover:bg-royal-hover"
        >
          <IconPlus size={15} strokeWidth={2.5} />
          Novo Processo de Contratação
        </Link>
      </div>

      {/* Stats */}
      {estatisticas.isError ? (
        <div className="mb-6 rounded-card border border-border bg-surface">
          <ErrorState onRetry={() => void estatisticas.refetch()} />
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-1 gap-3 xs:grid-cols-2 lg:mb-6 lg:grid-cols-4 lg:gap-4">
            {estatisticas.isPending ? (
              Array.from({ length: 4 }, (_, i) => (
                <div key={i} aria-hidden className="h-31 rounded-card border border-border bg-surface" />
              ))
            ) : (
              <>
                <StatCard
                  label="Processos Ativos"
                  value={String(estatisticas.data.processosAtivos)}
                  icon={IconFile}
                  tone="royal"
                />
                <StatCard
                  label="Em Elaboração"
                  value={String(estatisticas.data.processosEmElaboracao)}
                  icon={IconClock}
                  tone="warning"
                />
                <StatCard
                  label="Documentos Gerados"
                  value={String(estatisticas.data.documentosGerados)}
                  icon={IconDownload}
                  tone="teal"
                />
                <StatCard
                  label="ETPs Concluídos"
                  value={String(estatisticas.data.etpsConcluidos)}
                  icon={IconCheckCircle}
                  tone="success"
                />
              </>
            )}
          </div>
        </>
      )}

      {/*
        Uma coluna só. "Documentos Pendentes" repetia, em prosa, o número que o
        cartão de estatística já dá, e "Ações Rápidas" levava todas as opções ao
        mesmo lugar que o botão do topo — duas caixas ocupando um terço da tela
        para não dizer nada de novo.
      */}
      {/* Processos recentes */}
      <div className="overflow-hidden rounded-card border border-border bg-surface">
        <div className="flex items-center justify-between border-b border-border-soft px-5 py-4.5">
          <h3 className="m-0 font-display text-lg font-bold text-text-1">Processos Recentes</h3>
          <Link href="/processos" className="text-base font-semibold text-royal no-underline hover:text-royal-hover">
            Ver todos →
          </Link>
        </div>

        {processos.isPending && <SkeletonRows rows={5} />}
        {processos.isError && <ErrorState onRetry={() => void processos.refetch()} />}
        {processos.isSuccess && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr className="bg-ice">
                  {["Processo", "Secretaria", "Valor Est.", "Status", "Data"].map((h) => (
                    <Th key={h} className="border-b border-border-soft">
                      {h}
                    </Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentes.map((p, i) => (
                  <tr
                    key={p.id}
                    onClick={() => router.push(`/processos/detalhe?id=${encodeURIComponent(p.id)}`)}
                    className={`cursor-pointer transition-colors hover:bg-ice ${i < recentes.length - 1 ? "border-b border-ice" : ""}`}
                  >
                    <td className="px-4 py-3.25">
                      <div className="max-w-100 text-base font-semibold break-words text-text-1">{p.objeto}</div>
                      <div className="mt-0.5 font-mono text-xs text-text-muted">{p.numero}</div>
                    </td>
                    <td className="px-4 py-3.25 text-sm text-text-3">{p.secretaria}</td>
                    <td className="px-4 py-3.25 font-mono text-base font-semibold text-petroleum">
                      {formatBRL(p.valorEstimado)}
                    </td>
                    <td className="px-4 py-3.25">
                      <StatusBadge status={p.status} size="sm" />
                    </td>
                    <td className="px-4 py-3.25 text-sm text-text-muted">{formatData(p.atualizadoEm)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
        )}
      </div>
    </div>
  );
}
