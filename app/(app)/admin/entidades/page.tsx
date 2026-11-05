"use client";

import { useState } from "react";

import { Button, Dropdown, FormField, Input, Tag, Toggle } from "@/components/ui";
import { IconBan, IconBuilding, IconPencil, IconPlus } from "@/components/ui/icons";
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/estados";
import { Th } from "@/components/shared/tabela";
import { useToast } from "@/components/shared/providers";
import {
  useAtualizarLimiteDeUsuarios,
  useCriarEntidade,
  useEntidades,
  useRemoverEntidade,
  useUsuarios,
} from "@/lib/api/hooks";
import { erroLimiteDeUsuarios, limiteDeUsuariosAtingido } from "@/lib/dominio/entidade";
import { TIPO_ENTIDADE_LABEL, type Tenant, type TipoEntidade } from "@/lib/types";
import { erroNomeInstitucional } from "@/lib/validacao/campos";

const TIPOS = Object.entries(TIPO_ENTIDADE_LABEL).map(([value, label]) => ({ value, label }));

/**
 * Entidades clientes da plataforma.
 *
 * <p>Entidade, e não prefeitura: quem contrata o GeraDocs também pode ser uma
 * câmara, uma autarquia ou um consórcio, e uma tela que só sabe dizer
 * "prefeitura" obriga metade dos clientes a se reconhecer no nome errado.
 *
 * <p>O cadastro pede **o nome e o tipo**, e nada mais. Secretarias, timbre e PCA
 * são configuração de quem opera a entidade, e quem os conhece é o coordenador
 * dela — pedi-los aqui seria pedir ao administrador da plataforma que
 * adivinhasse.
 *
 * <p>O tipo não é enfeite: sem ele o servidor grava toda entidade como
 * `PREFEITURA`, e a câmara cadastrada aqui viraria prefeitura no banco.
 *
 * <p>O **limite de usuários** é o plano contratado (ADR-060 do back-end): só o
 * administrador da plataforma o define e o altera, e ele vale para todo
 * cadastro naquela entidade — o do coordenador e o daqui.
 */
export default function AdminEntidades() {
  const showToast = useToast();
  const entidades = useEntidades();
  const usuarios = useUsuarios();
  const criar = useCriarEntidade();
  const remover = useRemoverEntidade();
  const atualizarLimite = useAtualizarLimiteDeUsuarios();

  const [novo, setNovo] = useState(false);
  const [nome, setNome] = useState("");
  // Texto, e não número: é o que a pessoa digita, e a validação explica o que
  // não serve em vez de engolir em silêncio.
  const [limite, setLimite] = useState("");
  const [editandoLimite, setEditandoLimite] = useState<{ id: string; valor: string } | null>(null);
  const [tipo, setTipo] = useState<TipoEntidade>("prefeitura");
  /*
    A qualificação como agência executiva dobra os limites de dispensa
    (Art. 75, § 2º). Declarada e não deduzida do tipo: nem toda autarquia a tem,
    e presumir que sim liberaria o dobro para quem não tem direito a ele (§78).
  */
  const [agenciaExecutiva, setAgenciaExecutiva] = useState(false);
  const qualificavel = tipo === "autarquia" || tipo === "fundacao";

  const ordenadas = [...(entidades.data ?? [])].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const erroDoNome = erroNomeInstitucional(nome, "O nome da entidade");
  // Vazio não acusa erro antes de a pessoa digitar; o botão só não habilita.
  const erroDoLimite = limite === "" ? undefined : erroLimiteDeUsuarios(limite);
  const podeSalvar =
    nome.trim() !== "" && erroDoNome === undefined && limite !== "" && erroDoLimite === undefined;

  const salvar = () => {
    if (!podeSalvar) return;
    criar.mutate(
      { nome, tipo, agenciaExecutiva: qualificavel && agenciaExecutiva, limiteUsuarios: Number(limite) },
      {
        onSuccess: () => {
          showToast("Entidade cadastrada.");
          setNovo(false);
          setNome("");
          setLimite("");
          setTipo("prefeitura");
          setAgenciaExecutiva(false);
        },
        onError: (e) => showToast(e instanceof Error ? e.message : "Não foi possível cadastrar."),
      },
    );
  };

  const excluir = (id: string, nomeDaEntidade: string) => {
    remover.mutate(id, {
      onSuccess: () => showToast(`${nomeDaEntidade} desativada.`),
      onError: (e) => showToast(e instanceof Error ? e.message : "Não foi possível remover."),
    });
  };

  const servidoresDe = (id: string) => (usuarios.data ?? []).filter((u) => u.entidadeId === id).length;

  const erroDoLimiteEditado = editandoLimite ? erroLimiteDeUsuarios(editandoLimite.valor) : undefined;

  const salvarLimite = () => {
    if (!editandoLimite || erroDoLimiteEditado !== undefined) return;
    atualizarLimite.mutate(
      { id: editandoLimite.id, limiteUsuarios: Number(editandoLimite.valor) },
      {
        onSuccess: (entidade) => {
          showToast(`Limite de ${entidade.nome} atualizado.`);
          setEditandoLimite(null);
        },
        // O servidor recusa limite abaixo dos usuários ativos, e diz quantos são.
        onError: (e) => showToast(e instanceof Error ? e.message : "Não foi possível alterar o limite."),
      },
    );
  };

  const usoDoPlano = (entidade: Tenant) =>
    entidade.limiteUsuarios === undefined
      ? "—"
      : `${entidade.usuariosAtivos ?? 0} de ${entidade.limiteUsuarios}`;

  return (
    <div className="w-full p-4 sm:p-5 lg:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-2xl font-extrabold tracking-tight text-text-1">Entidades</h1>
          <p className="m-0 mt-1 text-md text-text-3">
            Prefeituras, câmaras, autarquias e consórcios clientes.
          </p>
        </div>
        <Button icon={<IconPlus size={14} strokeWidth={2.5} />} onClick={() => setNovo((v) => !v)}>
          Nova Entidade
        </Button>
      </div>

      {novo && (
        <div className="mb-5 rounded-card border border-border bg-surface p-5">
          <h2 className="m-0 mb-4 font-display text-md font-bold text-text-1">Cadastrar Entidade</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_220px_180px]">
            <FormField
              label="Nome da Entidade"
              required
              hint={
                erroDoNome ??
                "O restante o coordenador configura depois."
              }
            >
              <Input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Prefeitura de Vila Velha"
                onKeyDown={(e) => {
                  // Formulário curto: Enter cadastra, como em qualquer outro.
                  // Obrigar o mouse aqui seria atrito sem motivo.
                  if (e.key === "Enter" && podeSalvar && !criar.isPending) salvar();
                }}
              />
            </FormField>
            {/* Perguntado, e não assumido: sem este campo o servidor grava toda
                entidade como prefeitura. */}
            <FormField label="Tipo" required>
              <Dropdown
                value={tipo}
                onChange={(v) => setTipo(v as TipoEntidade)}
                ariaLabel="Tipo da entidade"
                options={TIPOS}
              />
            </FormField>
            {/* O plano contratado: quantos usuários a entidade pode ter ativos. */}
            <FormField label="Limite de Usuários" required hint={erroDoLimite ?? "De 1 a 999, conforme o plano."}>
              <Input
                value={limite}
                onChange={(e) => setLimite(e.target.value.replace(/\D/g, "").slice(0, 3))}
                inputMode="numeric"
                placeholder="Ex: 10"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && podeSalvar && !criar.isPending) salvar();
                }}
              />
            </FormField>
          </div>
          {/*
            Só a autarquia e a fundação podem ser qualificadas: o consórcio já
            dobra pelo próprio tipo, que a lei nomeia sem condição, e prefeitura
            não entra no parágrafo de jeito nenhum.
          */}
          {qualificavel && (
            <div className="mt-4">
              <Toggle
                checked={agenciaExecutiva}
                onChange={setAgenciaExecutiva}
                label="Qualificada como agência executiva"
              />
              <p className="m-0 mt-1 text-xs text-text-3">
                Dobra os limites de dispensa por valor (Art. 75, § 2º).
              </p>
            </div>
          )}
          <div className="mt-4 flex gap-2.5">
            <Button variant="secondary" onClick={() => setNovo(false)}>
              Cancelar
            </Button>
            <p id="motivo-criar-entidade" className="sr-only">
              O nome da entidade é obrigatório e precisa ter letras, sem símbolos como dois-pontos ou sublinhado.
              O limite de usuários é obrigatório, de 1 a 999.
            </p>
            <Button
              disabled={criar.isPending || !podeSalvar}
              ariaDescribedBy="motivo-criar-entidade"
              onClick={salvar}
            >
              {criar.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </div>
      )}


      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {entidades.isPending && <SkeletonRows rows={4} />}
        {entidades.isError && <ErrorState onRetry={() => void entidades.refetch()} />}
        {entidades.isSuccess && entidades.data.length === 0 && <EmptyState message="Nenhuma entidade cadastrada" />}
        {entidades.isSuccess && entidades.data.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-ice">
                  {["Entidade", "Tipo", "Usuários do Plano", ""].map((h, i) => (
                    <Th key={h === "" ? `x-${i}` : h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ordenadas.map((entidade, i) => {
                  const servidores = servidoresDe(entidade.id);
                  /*
                    Entidade com servidor vinculado não é desativada. Ao ser, os
                    servidores dela ficavam apontando para uma entidade fora da
                    listagem — o vínculo aparecia como um identificador cru que
                    não abria nada — e os processos daquele órgão ficavam órfãos.
                    O servidor recusa desde 26/08/2026; aqui o botão nem chega a
                    ser clicável, e diz por quê.
                  */
                  const motivo =
                    servidores > 0
                      ? `${entidade.nome} tem ${servidores} servidor(es) vinculado(s). Desative-os antes.`
                      : `Desativar ${entidade.nome}`;

                  return (
                    <tr key={entidade.id} className={i < ordenadas.length - 1 ? "border-b border-ice" : ""}>
                      <td className="px-4 py-3.25">
                        <div className="flex items-center gap-2.5">
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-tint-royal-bg text-royal">
                            <IconBuilding size={15} />
                          </span>
                          {/* Só o nome: o identificador é assunto do servidor, e
                              ninguém o digita em lugar nenhum do produto. */}
                          <span className="text-base font-semibold text-text-1">{entidade.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.25">
                        <Tag tone="neutral">{TIPO_ENTIDADE_LABEL[entidade.tipo]}</Tag>
                      </td>
                      <td className="px-4 py-3.25 text-sm text-text-3">
                        {editandoLimite?.id === entidade.id ? (
                          <div className="flex items-start gap-2">
                            {/* Abre com o valor selecionado: quem edita digita o
                                número novo, e não um "21" que vira "211". */}
                            <div
                              className="w-24"
                              onFocusCapture={(e) => {
                                if (e.target instanceof HTMLInputElement) e.target.select();
                              }}
                            >
                              <Input
                                value={editandoLimite.valor}
                                onChange={(e) =>
                                  setEditandoLimite({
                                    id: entidade.id,
                                    valor: e.target.value.replace(/\D/g, "").slice(0, 3),
                                  })
                                }
                                inputMode="numeric"
                                ariaLabel={`Limite de usuários de ${entidade.nome}`}
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") salvarLimite();
                                  if (e.key === "Escape") setEditandoLimite(null);
                                }}
                              />
                              <p id={`motivo-limite-${entidade.id}`} className={erroDoLimiteEditado ? "m-0 mt-1 text-xs text-danger" : "sr-only"}>
                                {erroDoLimiteEditado ?? "O limite vai de 1 a 999 e não pode ficar abaixo dos usuários ativos."}
                              </p>
                            </div>
                            <Button
                              size="sm"
                              disabled={atualizarLimite.isPending || erroDoLimiteEditado !== undefined}
                              ariaDescribedBy={`motivo-limite-${entidade.id}`}
                              onClick={salvarLimite}
                            >
                              {atualizarLimite.isPending ? "Salvando..." : "Salvar"}
                            </Button>
                            <Button size="sm" variant="secondary" onClick={() => setEditandoLimite(null)}>
                              Cancelar
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className={limiteDeUsuariosAtingido(entidade) ? "font-semibold text-text-1" : ""}>
                              {usoDoPlano(entidade)}
                            </span>
                            {limiteDeUsuariosAtingido(entidade) && <Tag tone="neutral">Limite atingido</Tag>}
                            <button
                              type="button"
                              aria-label={`Alterar o limite de usuários de ${entidade.nome}`}
                              title="Alterar o limite de usuários"
                              onClick={() =>
                                setEditandoLimite({ id: entidade.id, valor: String(entidade.limiteUsuarios ?? "") })
                              }
                              className="flex size-7 cursor-pointer items-center justify-center rounded-sm border border-border bg-surface text-text-3 transition-colors hover:bg-ice hover:text-text-1"
                            >
                              <IconPencil size={13} />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.25">
                        <button
                          type="button"
                          aria-label={motivo}
                          title={motivo}
                          disabled={remover.isPending || servidores > 0}
                          onClick={() => excluir(entidade.id, entidade.nome)}
                          // Rótulo escrito, não lixeira: desativar não apaga a
                          // entidade nem o que ela produziu.
                          className="flex h-7 cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 text-sm font-semibold whitespace-nowrap text-text-3 transition-colors hover:border-tint-danger-border-strong hover:bg-tint-danger-bg hover:text-danger disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border disabled:hover:bg-surface disabled:hover:text-text-3"
                        >
                          <IconBan size={13} />
                          Desativar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
