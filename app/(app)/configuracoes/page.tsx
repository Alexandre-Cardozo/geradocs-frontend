"use client";

import { useRef, useState } from "react";

import {
  Button,
  Dropdown,
  FormField,
  InfoBanner,
  Input,
  SectionBlock,
  Tag,
  Textarea,
} from "@/components/ui";
import {
  IconFile,
  IconImage,
  IconPlus,
  IconTrash,
  IconUpload,
} from "@/components/ui/icons";
import { EmptyState, ErrorState, LoadingState, SkeletonRows } from "@/components/shared/estados";
import { Th } from "@/components/shared/tabela";
import { useToast } from "@/components/shared/providers";
import {
  useBrasao,
  useConfigTenant,
  useEnviarBrasao,
  useRemoverBrasao,
  useSalvarTextosDoTimbre,
  useTimbre,
  useCriarSecretaria,
  useCriarUsuario,
  useRemoverSecretaria,
  useSessao,
  useUsuarios,
} from "@/lib/api/hooks";
import { formatCPF, validaCPF } from "@/lib/auth/cpf";
import { FORMATOS_DE_BRASAO, TAMANHO_MAXIMO_DO_BRASAO } from "@/lib/api/access-client";
import { ImportarPca } from "@/components/configuracoes/importar-pca";
import { CredenciaisIniciais } from "@/components/admin/credenciais-iniciais";
import { anoBrasilia, dataBrasiliaISO, formatData, formatDataHora, formatarBytes } from "@/lib/format";
import { PERFIL_ACESSO_LABEL, type PerfilAcesso, type Secretaria } from "@/lib/types";

/** Opções de ano do PCA: últimos 3 anos + o ano vigente (Brasília). */
const anoAtual = anoBrasilia();
const anosPCA = Array.from({ length: 4 }, (_, i) => {
  const ano = String(anoAtual - 3 + i);
  return { value: ano, label: ano };
});

const tabs = [
  { key: "identidade", label: "Identidade Visual" },
  { key: "cabecalho", label: "Cabeçalho e Rodapé" },
  { key: "secretarias", label: "Secretarias" },
  { key: "pca", label: "PCA — Plano de Contratações" },
  { key: "usuarios", label: "Usuários e Permissões" },
];


/**
 * Pré-visualização ao vivo do documento timbrado (brasão + cabeçalho + rodapé).
 * Preenche a coluna direita das abas de identidade/cabeçalho e reflete o que está
 * sendo configurado. Reutilizável entre as duas abas.
 */
function PreviewDocumento({
  logoDataUrl,
  cabecalho,
  rodape,
}: {
  logoDataUrl: string | null;
  cabecalho: string;
  rodape: string;
}) {
  // Não há mais chave de "timbrado": órgão sem timbre configurado gera
  // documento sem timbre, e um interruptor que não desliga nada era exatamente
  // a configuração inventada que este passo remove.
  const timbrado = logoDataUrl !== null || cabecalho.trim() !== "" || rodape.trim() !== "";
  const rodapeResolvido = rodape
    .replace("{data}", formatData(dataBrasiliaISO()))
    .replace("{numero}", "PROC-2024-090")
    .replace("{pagina}", "1");

  return (
    <div className="lg:sticky lg:top-4">
      <div className="mb-2 text-2xs font-semibold tracking-caps text-text-muted uppercase">
        Pré-visualização do Documento
      </div>
      <div className="rounded-card border border-border bg-ice p-5">
        {/* Folha A4 estilizada */}
        <div className="mx-auto flex aspect-[1/1.414] w-full max-w-70 flex-col rounded-sm border border-border bg-surface p-5">
          {timbrado ? (
            <div className="flex items-start gap-2.5 border-b-2 border-navy pb-2.5">
              {logoDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data URL local, sem otimização do next/image
                <img
                  src={logoDataUrl}
                  alt=""
                  className="size-8 shrink-0 object-contain"
                />
              ) : (
                <div className="flex size-8 shrink-0 items-center justify-center rounded-sm bg-border-soft text-text-faint">
                  <IconImage size={16} strokeWidth={1.5} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                {cabecalho.split("\n").map((line, i) => (
                  <div
                    key={i}
                    className={`truncate font-display leading-tight text-text-1 ${i === 0 ? "text-2xs font-bold" : "text-2xs font-medium text-text-3"}`}
                  >
                    {line || " "}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* Corpo simulado */}
          <div className="mt-4 flex flex-1 flex-col gap-2">
            <div className="h-1.5 w-1/3 rounded-full bg-border-soft" />
            <div className="h-1.5 w-full rounded-full bg-border-soft" />
            <div className="h-1.5 w-full rounded-full bg-border-soft" />
            <div className="h-1.5 w-5/6 rounded-full bg-border-soft" />
            <div className="mt-2 h-1.5 w-2/5 rounded-full bg-border-soft" />
            <div className="h-1.5 w-full rounded-full bg-border-soft" />
            <div className="h-1.5 w-11/12 rounded-full bg-border-soft" />
          </div>

          {timbrado && rodape.trim() !== "" ? (
            <div className="mt-3 border-t border-text-faint pt-1.5">
              <div className="truncate text-center text-2xs text-text-muted">
                {rodapeResolvido}
              </div>
            </div>
          ) : null}
        </div>
        <p className="mt-3 mb-0 text-center text-xs text-text-muted">
          {timbrado
            ? "Assim o timbre aparecerá nos documentos gerados."
            : "Timbre desativado — documentos sem brasão."}
        </p>
      </div>
    </div>
  );
}

export default function Configuracoes() {
  const showToast = useToast();
  const { data: sessao } = useSessao();
  const prefeituraId = sessao?.prefeitura?.id;
  const tenant = useConfigTenant(prefeituraId);
  const timbre = useTimbre(prefeituraId);
  const brasaoUrl = useBrasao(prefeituraId, timbre.data?.temBrasao ?? false);
  const salvarTimbre = useSalvarTextosDoTimbre(prefeituraId);
  const enviarBrasaoDoOrgao = useEnviarBrasao(prefeituraId);
  const removerBrasaoDoOrgao = useRemoverBrasao(prefeituraId);
  const servidores = useUsuarios(prefeituraId);
  const criarServidor = useCriarUsuario();
  const criarSecretaria = useCriarSecretaria(prefeituraId);
  const removerSecretaria = useRemoverSecretaria(prefeituraId);

  const [activeTab, setActiveTab] = useState("identidade");

  // Formulário de novo servidor (aba Usuários)
  const [novoServidor, setNovoServidor] = useState(false);
  const [nsNome, setNsNome] = useState("");
  const [nsCpf, setNsCpf] = useState("");
  const [nsEmail, setNsEmail] = useState("");
  const [nsCargo, setNsCargo] = useState("");
  const [credenciais, setCredenciais] = useState<{ nome: string; chave: string; senha: string } | null>(null);
  const [nsPerfil, setNsPerfil] = useState<PerfilAcesso>("servidor");

  // Estado local dos formulários, semeado quando o tenant carrega.
  const [cabecalho, setCabecalho] = useState("");
  const [rodape, setRodape] = useState("");
  const [timbreSincronizado, setTimbreSincronizado] = useState<number | null>(null);
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const seletorDeBrasao = useRef<HTMLInputElement>(null);
  const [novaSecretaria, setNovaSecretaria] = useState("");
  const [tenantSincronizado, setTenantSincronizado] = useState<string | null>(null);

  // Semeia os formulários quando o tenant carrega (ajuste de estado durante o
  // render, guardado por `seeded` — evita efeito com setState síncrono).
  const versaoLocalDoTenant = tenant.data
    ? `${tenant.data.id}:${tenant.data.secretarias.map((secretaria) => secretaria.id).join("|")}`
    : null;

  if (tenant.data && tenantSincronizado !== versaoLocalDoTenant) {
    setTenantSincronizado(versaoLocalDoTenant);
    setSecretarias(tenant.data.secretarias);
  }

  // O timbre vem do servidor (ADR-026). Semeia uma vez, e de novo a cada versão
  // nova: salvar sobe a versão, e o formulário precisa refletir o que foi gravado.
  if (timbre.data && timbreSincronizado !== timbre.data.versao) {
    setTimbreSincronizado(timbre.data.versao);
    setCabecalho(timbre.data.cabecalho);
    setRodape(timbre.data.rodape);
  }

  if (tenant.isPending) {
    return (
      <div className="max-w-settings p-4 sm:p-5 lg:p-7">
        <LoadingState label="Carregando configurações..." />
      </div>
    );
  }
  if (tenant.isError) {
    return (
      <div className="max-w-settings p-4 sm:p-5 lg:p-7">
        <div className="rounded-card border border-border bg-surface">
          <ErrorState onRetry={() => void tenant.refetch()} />
        </div>
      </div>
    );
  }


  const addSecretaria = () => {
    const nome = novaSecretaria.trim();
    if (nome === "") {
      showToast("Informe o nome da secretaria para adicionar.");
      return;
    }
    criarSecretaria.mutate(nome, {
      onSuccess: () => {
        setNovaSecretaria("");
        showToast("Secretaria adicionada.");
      },
      onError: (error) => showToast(error instanceof Error ? error.message : "Não foi possível adicionar a secretaria."),
    });
  };

  const removeSecretaria = (id: string) => {
    removerSecretaria.mutate(id, {
      onSuccess: () => showToast("Secretaria desativada."),
      onError: (error) => showToast(error instanceof Error ? error.message : "Não foi possível desativar a secretaria."),
    });
  };

  /**
   * O brasão vai para o servidor (ADR-026).
   *
   * <p>Antes ele virava data URL e morria no estado da tela: a prefeitura
   * "configurava" o timbre, recarregava e ele sumia — e nenhum documento saía
   * com ele.
   */
  const selecionarBrasao = (arquivo: File) => {
    if (arquivo.size > TAMANHO_MAXIMO_DO_BRASAO) {
      showToast(
        `O brasão tem ${formatarBytes(arquivo.size)} e o limite é ${formatarBytes(TAMANHO_MAXIMO_DO_BRASAO)}.`,
      );
      return;
    }
    enviarBrasaoDoOrgao.mutate(arquivo, {
      onSuccess: () => showToast("Brasão atualizado. Ele sairá nos próximos documentos."),
      onError: (erro) =>
        showToast(erro instanceof Error ? erro.message : "Não foi possível enviar o brasão."),
    });
  };

  return (
    <div className="max-w-content p-4 sm:p-5 lg:p-7">
      {/* Tabs — roláveis só na horizontal (overflow-y-hidden evita a rolagem vertical
          que o CSS impõe quaando só o eixo X é auto) */}
      <div className="mb-7 flex overflow-x-auto overflow-y-hidden border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`-mb-px shrink-0 cursor-pointer border-b-2 border-transparent bg-transparent px-4.5 py-2.25 text-base whitespace-nowrap transition-colors ${
              activeTab === t.key
                ? "border-b-royal font-bold text-royal"
                : "font-medium text-text-3"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Identidade Visual ── */}
      {activeTab === "identidade" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-5">
            <SectionBlock
              title="Logotipo / Brasão da Prefeitura"
              hint="Sai no cabeçalho de todo documento gerado — DOCX e PDF. PNG ou JPEG, até 512 KB."
            >
              <input
                ref={seletorDeBrasao}
                type="file"
                accept={FORMATOS_DE_BRASAO}
                className="hidden"
                aria-label="Escolher o brasão da prefeitura"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  // Zera: escolher o mesmo arquivo duas vezes não dispara
                  // `change`, e a segunda tentativa pareceria travada.
                  e.target.value = "";
                  if (arquivo) selecionarBrasao(arquivo);
                }}
              />
              {timbre.data?.temBrasao ? (
                <div className="flex items-center gap-4">
                  <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-border-soft text-text-muted">
                    {brasaoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- object URL de rota autenticada
                      <img
                        src={brasaoUrl}
                        alt="Brasão da prefeitura"
                        className="size-full object-contain"
                      />
                    ) : (
                      <IconImage size={32} strokeWidth={1.5} />
                    )}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-text-1">
                      Brasão cadastrado
                    </div>
                    <div className="mt-0.5 text-sm text-text-muted">
                      Sai no cabeçalho de todo documento gerado por este órgão.
                    </div>
                    <div className="mt-2.5 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={enviarBrasaoDoOrgao.isPending}
                        onClick={() => seletorDeBrasao.current?.click()}
                      >
                        {enviarBrasaoDoOrgao.isPending ? "Enviando..." : "Substituir"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={removerBrasaoDoOrgao.isPending}
                        onClick={() =>
                          removerBrasaoDoOrgao.mutate(undefined, {
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
                    <p className="m-0 text-base text-text-3">
                      Clique para selecionar o brasão
                    </p>
                    <p className="mt-1 mb-0 text-xs text-text-muted">PNG ou JPEG</p>
                  </div>
                </button>
              )}
            </SectionBlock>

          </div>

          <PreviewDocumento
            logoDataUrl={brasaoUrl}
            cabecalho={cabecalho}
            rodape={rodape}
          />
        </div>
      )}

      {/* ── Cabeçalho e Rodapé ── */}
      {activeTab === "cabecalho" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col gap-5">
            <SectionBlock
              title="Cabeçalho dos Documentos"
              hint="Texto exibido no topo de cada página dos documentos gerados. Use quebras de linha para organizar as informações. Variáveis disponíveis: {processo}, {data}, {secretaria}."
            >
              <Textarea
                value={cabecalho}
                onChange={(e) => setCabecalho(e.target.value)}
                rows={4}
              />
            </SectionBlock>

            <SectionBlock
              title="Rodapé dos Documentos"
              hint="Texto exibido na parte inferior de cada página. Variáveis disponíveis: {processo}, {data}, {numero}, {pagina}."
            >
              <Textarea
                value={rodape}
                onChange={(e) => setRodape(e.target.value)}
                rows={3}
              />
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
                        showToast(
                          erro instanceof Error ? erro.message : "Não foi possível salvar.",
                        ),
                    },
                  )
                }
              >
                {salvarTimbre.isPending ? "Salvando..." : "Salvar Cabeçalho e Rodapé"}
              </Button>
            </div>
          </div>

          <PreviewDocumento
            logoDataUrl={brasaoUrl}
            cabecalho={cabecalho}
            rodape={rodape}
          />
        </div>
      )}

      {/* ── Secretarias (API real) ── */}
      {activeTab === "secretarias" && (
        <SectionBlock
          title="Secretarias do Órgão"
          hint="As secretarias cadastradas aqui aparecem como opções de Secretaria Requisitante na criação de novos processos."
        >
          <div className="mb-4 flex flex-wrap gap-2.5">
            <div className="flex-[1_1_220px]">
              <Input
                value={novaSecretaria}
                onChange={(e) => setNovaSecretaria(e.target.value)}
                placeholder="Ex: Secretaria de Cultura e Turismo"
              />
            </div>
            <Button
              icon={<IconPlus size={14} strokeWidth={2.5} />}
              onClick={addSecretaria}
              disabled={criarSecretaria.isPending || novaSecretaria.trim() === ""}
              className="h-9.5"
            >
              Adicionar Nova Secretaria
            </Button>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {secretarias.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-md border border-border-soft px-3 py-2.5"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-sm bg-tint-royal-bg text-royal">
                  <IconFile size={14} />
                </span>
                <span className="flex-1 truncate text-base font-medium text-text-1">
                  {s.nome}
                </span>
                <button
                  type="button"
                  aria-label={`Remover ${s.nome}`}
                  disabled={removerSecretaria.isPending}
                  onClick={() => removeSecretaria(s.id)}
                  className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-sm border border-border bg-ice text-text-3"
                >
                  <IconTrash size={13} />
                </button>
              </div>
            ))}
          </div>
        </SectionBlock>
      )}

      {/* ── PCA ── */}
      {activeTab === "pca" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
          <ImportarPca anos={anosPCA} />

          <div className="lg:sticky lg:top-4">
            <InfoBanner tone="info">
              O <strong>Plano de Contratações Anual (PCA)</strong> importado aqui é onde a
              plataforma procura ao montar a seção do <strong>inciso II do ETP</strong> (Art. 18,
              § 1º, II). A busca é por código e por termos do item — determinística, para que
              quem lê a seção possa conferir por que aquele item foi apontado.
            </InfoBanner>
          </div>
        </div>
      )}

      {/* ── Usuários ── */}
      {activeTab === "usuarios" && (
        <div>
          {/* Fora do painel de cadastro: ele fecha no sucesso, e o aviso nascia
              desmontado — o servidor era gravado e a senha nunca aparecia. */}
          {credenciais && (
            <div className="mb-4">
              <CredenciaisIniciais
                nome={credenciais.nome}
                chave={credenciais.chave}
                senha={credenciais.senha}
                titulo="Credenciais de primeiro acesso"
                onFechar={() => setCredenciais(null)}
              />
            </div>
          )}
          {novoServidor && (
            <div className="mb-4 rounded-card border border-border bg-surface p-5">
              <h3 className="m-0 mb-4 font-display text-md font-bold text-text-1">Adicionar Servidor à Prefeitura</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Nome Completo" required>
                  <Input value={nsNome} onChange={(e) => setNsNome(e.target.value)} placeholder="Nome do servidor" />
                </FormField>
                <FormField label="CPF" required hint={nsCpf !== "" && !validaCPF(nsCpf) ? "CPF inválido." : undefined}>
                  <Input value={nsCpf} onChange={(e) => setNsCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" />
                </FormField>
                <FormField label="E-mail" required>
                  <Input value={nsEmail} onChange={(e) => setNsEmail(e.target.value)} type="email" placeholder="email@prefeitura.gov.br" />
                </FormField>
                <FormField label="Cargo">
                  <Input value={nsCargo} onChange={(e) => setNsCargo(e.target.value)} placeholder="Ex: Servidor de Compras" />
                </FormField>
                <FormField label="Perfil de Acesso" required>
                  <Dropdown
                    value={nsPerfil}
                    onChange={(v) => setNsPerfil(v as PerfilAcesso)}
                    ariaLabel="Perfil de acesso"
                    options={[
                      { value: "servidor", label: PERFIL_ACESSO_LABEL.servidor },
                      { value: "coordenador", label: PERFIL_ACESSO_LABEL.coordenador },
                    ]}
                  />
                </FormField>
              </div>
              <div className="mt-4 flex gap-2.5">
                <Button variant="secondary" onClick={() => setNovoServidor(false)}>Cancelar</Button>
                <p id="motivo-criar-servidor-tenant" className="sr-only">
                  Nome, CPF válido, e-mail e a prefeitura são obrigatórios. A
                  senha é sorteada pelo sistema e aparece depois de cadastrar.
                </p>
                <Button
                  disabled={criarServidor.isPending || nsNome.trim() === "" || !validaCPF(nsCpf) || nsEmail.trim() === "" || !prefeituraId}
                  ariaDescribedBy="motivo-criar-servidor-tenant"
                  onClick={() =>
                    criarServidor.mutate(
                      { nome: nsNome, cpf: nsCpf, email: nsEmail, cargo: nsCargo, perfilAcesso: nsPerfil, prefeituraId: prefeituraId ?? null },
                      {
                        onSuccess: (criado) => {
                          setCredenciais({
                            // O CPF digitado, e não o da resposta: o servidor
                            // mascara de propósito, e credencial pela metade não
                            // abre porta nenhuma.
                            nome: criado.usuario.nome,
                            chave: nsCpf,
                            senha: criado.senhaProvisoria,
                          });
                          showToast("Servidor cadastrado.");
                          setNovoServidor(false);
                          setNsNome(""); setNsCpf(""); setNsEmail(""); setNsCargo(""); setNsPerfil("servidor");
                        },
                        onError: (e) => showToast(e instanceof Error ? e.message : "Não foi possível cadastrar."),
                      }
                    )
                  }
                >
                  {criarServidor.isPending ? "Salvando..." : "Cadastrar"}
                </Button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-card border border-border bg-surface">
            <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
              <h3 className="m-0 font-display text-lg font-bold text-text-1">Servidores da Prefeitura</h3>
              <Button size="sm" icon={<IconPlus size={13} strokeWidth={2.5} />} onClick={() => setNovoServidor((v) => !v)}>
                Adicionar Servidor
              </Button>
            </div>
            {servidores.isPending && <SkeletonRows rows={4} />}
            {servidores.isError && <ErrorState onRetry={() => void servidores.refetch()} />}
            {servidores.isSuccess && servidores.data.length === 0 && <EmptyState message="Nenhum servidor vinculado a esta prefeitura" />}
            {servidores.isSuccess && servidores.data.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-ice">
                      {["Servidor", "Cargo", "Perfil de Acesso", "Último Acesso"].map((h, i) => (
                        <Th key={h === "" ? `vazio-${i}` : h}>{h}</Th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {servidores.data.map((u, idx) => (
                      <tr key={u.id} className={idx < servidores.data.length - 1 ? "border-b border-ice" : ""}>
                        <td className="px-4 py-3.25">
                          <div className="flex items-center gap-2.5">
                            <span className="flex size-7.5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-on-dark gradient-user">
                              {u.iniciais}
                            </span>
                            <div>
                              <div className="text-base font-semibold text-text-1">{u.nome}</div>
                              <div className="font-mono text-xs text-text-muted">{u.cpf.includes("*") ? u.cpf : formatCPF(u.cpf)}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.25 text-sm text-text-3">{u.cargo}</td>
                        <td className="px-4 py-3.25">
                          <Tag tone={u.perfilAcesso === "coordenador" ? "success" : "neutral"}>
                            {PERFIL_ACESSO_LABEL[u.perfilAcesso]}
                          </Tag>
                        </td>
                        <td className="px-4 py-3.25 text-sm text-text-muted">
                          {u.ultimoAcesso ? formatDataHora(u.ultimoAcesso) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
