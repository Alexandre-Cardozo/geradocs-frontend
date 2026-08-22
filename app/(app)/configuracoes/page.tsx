"use client";

import { useState } from "react";

import {
  Button,
  Dropdown,
  FileUpload,
  FormField,
  InfoBanner,
  Input,
  SectionBlock,
  Tag,
  Textarea,
  Toggle,
} from "@/components/ui";
import {
  IconCheck,
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
  useConfigTenant,
  useCriarSecretaria,
  useCriarUsuario,
  useRemoverSecretaria,
  useSessao,
  useUsuarios,
} from "@/lib/api/hooks";
import { formatCPF, validaCPF } from "@/lib/auth/cpf";
import { anoBrasilia, dataBrasiliaISO, formatData, formatDataHora } from "@/lib/format";
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
  timbrado,
}: {
  logoDataUrl: string | null;
  cabecalho: string;
  rodape: string;
  timbrado: boolean;
}) {
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
  const [nsSenha, setNsSenha] = useState("");
  const [nsPerfil, setNsPerfil] = useState<PerfilAcesso>("servidor");

  // Estado local dos formulários, semeado quando o tenant carrega.
  const [logoFile, setLogoFile] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [timbrado, setTimbrado] = useState(true);
  const [cabecalho, setCabecalho] = useState("");
  const [rodape, setRodape] = useState("");
  const [secretarias, setSecretarias] = useState<Secretaria[]>([]);
  const [novaSecretaria, setNovaSecretaria] = useState("");
  const [pcaFile, setPcaFile] = useState<string | null>(null);
  const [pcaYear, setPcaYear] = useState("2025");
  const [tenantSincronizado, setTenantSincronizado] = useState<string | null>(null);

  // Semeia os formulários quando o tenant carrega (ajuste de estado durante o
  // render, guardado por `seeded` — evita efeito com setState síncrono).
  const versaoLocalDoTenant = tenant.data
    ? `${tenant.data.id}:${tenant.data.secretarias.map((secretaria) => secretaria.id).join("|")}`
    : null;

  if (tenant.data && tenantSincronizado !== versaoLocalDoTenant) {
    setTenantSincronizado(versaoLocalDoTenant);
    setLogoFile(tenant.data.logoArquivo);
    setLogoDataUrl(tenant.data.logoDataUrl);
    setTimbrado(tenant.data.timbrado);
    setCabecalho(tenant.data.cabecalho);
    setRodape(tenant.data.rodape);
    setSecretarias(tenant.data.secretarias);
    setPcaFile(tenant.data.pca.arquivo);
    // Sem PCA importado → abre no ano vigente; com PCA, mostra o ano configurado.
    setPcaYear(
      tenant.data.pca.arquivo ? tenant.data.pca.ano : String(anoAtual),
    );
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

  const salvarTenant = (_patch: unknown, msg: string) => {
    showToast(`${msg} A persistência será habilitada com o módulo de configurações do backend.`);
  };

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

  // Lê o brasão selecionado como data URL para poder exibi-lo (preview, sidebar, timbre).
  const selecionarLogo = (file: File) => {
    setLogoFile(file.name);
    const reader = new FileReader();
    reader.onload = () =>
      setLogoDataUrl(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  };

  const removerLogo = () => {
    setLogoFile(null);
    setLogoDataUrl(null);
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
              hint="O logotipo será inserido no cabeçalho dos documentos timbrados. Formatos aceitos: PNG, SVG, JPG (fundo transparente recomendado)."
            >
              {logoFile ? (
                <div className="flex items-center gap-4">
                  <div className="flex size-20 items-center justify-center overflow-hidden rounded-xl border border-border bg-border-soft text-text-muted">
                    {logoDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- data URL local, sem otimização do next/image
                      <img
                        src={logoDataUrl}
                        alt="Brasão da prefeitura"
                        className="size-full object-contain"
                      />
                    ) : (
                      <IconImage size={32} strokeWidth={1.5} />
                    )}
                  </div>
                  <div>
                    <div className="text-base font-semibold text-text-1">
                      {logoFile}
                    </div>
                    <div className="mt-0.5 text-sm text-text-muted">
                      {logoDataUrl
                        ? "Será exibido na sidebar e no timbre dos documentos"
                        : "PNG · 340 × 340 px · 48 KB"}
                    </div>
                    <div className="mt-2.5 flex gap-2">
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".png,.svg,.jpg,.jpeg"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) selecionarLogo(f);
                          }}
                        />
                        <span className="inline-block cursor-pointer rounded-sm border border-tint-royal-border bg-tint-royal-bg px-3 py-1.25 text-sm font-semibold text-royal">
                          Substituir
                        </span>
                      </label>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={removerLogo}
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <label className="block cursor-pointer">
                  <input
                    type="file"
                    accept=".png,.svg,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) selecionarLogo(f);
                    }}
                  />
                  <div className="rounded-md border-2 border-dashed border-text-faint bg-surface-upload px-5 py-4.5 text-center transition-colors">
                    <span className="mx-auto mb-2 block w-5 text-text-muted">
                      <IconUpload size={20} strokeWidth={1.5} />
                    </span>
                    <p className="m-0 text-base text-text-3">
                      Clique para selecionar ou arraste o logotipo aqui
                    </p>
                    <p className="mt-1 mb-0 text-xs text-text-muted">
                      PNG, SVG, JPG, JPEG
                    </p>
                  </div>
                </label>
              )}
            </SectionBlock>

            <SectionBlock
              title="Documentos Timbrados"
              hint="Quando ativado, todos os documentos gerados incluirão o brasão, o cabeçalho e o rodapé configurados. Caso desativado, os documentos serão gerados sem timbre."
            >
              <div className="flex items-center gap-3.5">
                <Toggle
                  checked={timbrado}
                  onChange={setTimbrado}
                  label="Documentos timbrados"
                />
                <div>
                  <div className="text-base font-semibold text-text-2">
                    {timbrado
                      ? "Documentos timbrados ativados"
                      : "Documentos sem timbre"}
                  </div>
                  <div className="mt-0.5 text-sm text-text-muted">
                    {timbrado
                      ? "ETP, TR, Cotação e demais documentos incluirão o brasão e identificação do órgão."
                      : "Documentos serão gerados com cabeçalho e rodapé em branco."}
                  </div>
                </div>
              </div>

              {timbrado && !logoFile && (
                <InfoBanner tone="warning" className="mt-3.5">
                  Nenhum logotipo configurado. O cabeçalho será gerado apenas
                  com o texto institucional.
                </InfoBanner>
              )}
            </SectionBlock>

            <div className="flex gap-2.5">
              <Button
                onClick={() =>
                  salvarTenant(
                    { logoArquivo: logoFile, logoDataUrl, timbrado },
                    "Configurações de identidade salvas com sucesso.",
                  )
                }
              >
                Salvar Configurações
              </Button>
            </div>
          </div>

          <PreviewDocumento
            logoDataUrl={logoDataUrl}
            cabecalho={cabecalho}
            rodape={rodape}
            timbrado={timbrado}
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
                onClick={() =>
                  salvarTenant(
                    { cabecalho, rodape },
                    "Cabeçalho e rodapé salvos com sucesso.",
                  )
                }
              >
                Salvar Cabeçalho e Rodapé
              </Button>
            </div>
          </div>

          <PreviewDocumento
            logoDataUrl={logoDataUrl}
            cabecalho={cabecalho}
            rodape={rodape}
            timbrado={timbrado}
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
          <div className="flex flex-col gap-5">
            <SectionBlock
              title="PCA do Ano Vigente"
              hint="Anexe o PCA aprovado para o ano corrente. Formatos aceitos: PDF, XLSX, DOCX. O arquivo será utilizado como referência durante a geração dos documentos."
            >
              <div className="mb-4 flex gap-4">
                <FormField label="Ano de Referência">
                  <Dropdown
                    value={pcaYear}
                    onChange={setPcaYear}
                    options={anosPCA}
                    ariaLabel="Ano de referência do PCA"
                    className="w-40"
                  />
                </FormField>
              </div>

              {pcaFile ? (
                <div>
                  <div className="mb-3 flex items-center gap-3 rounded-xl border border-border bg-ice px-4 py-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-tint-royal-bg text-royal">
                      <IconFile size={18} />
                    </span>
                    <span className="block flex-1">
                      <span className="block text-base font-semibold text-text-1">
                        {pcaFile}
                      </span>
                      <span className="mt-0.5 block text-xs text-text-muted">
                        PCA {pcaYear} · Importado em{" "}
                        {formatData(dataBrasiliaISO())}
                      </span>
                    </span>
                    <Tag tone="success">Ativo</Tag>
                  </div>

                  <InfoBanner
                    tone="success"
                    icon={<IconCheck size={14} strokeWidth={2.5} />}
                  >
                    <strong>PCA carregado com sucesso.</strong>{" "}
                    {tenant.data.pca.itensIndexados} itens de contratação
                    indexados. O modelo utilizará este PCA como referência nos
                    processos de {pcaYear}.
                  </InfoBanner>

                  <div className="mt-3 flex gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept=".pdf,.xlsx,.docx"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setPcaFile(f.name);
                        }}
                      />
                      <span className="inline-block cursor-pointer rounded-[7px] border border-tint-royal-border bg-tint-royal-bg px-3.5 py-1.5 text-sm font-semibold text-royal">
                        Substituir arquivo
                      </span>
                    </label>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => setPcaFile(null)}
                    >
                      Remover PCA
                    </Button>
                  </div>
                </div>
              ) : (
                <FileUpload
                  file={null}
                  onChange={setPcaFile}
                  placeholder="Clique para selecionar o PCA ou arraste o arquivo aqui"
                  accept=".pdf,.xlsx,.docx"
                />
              )}
            </SectionBlock>

            <div className="flex gap-2.5">
              <p id="motivo-salvar-pca" className="sr-only">
                Selecione o arquivo do PCA para indexar.
              </p>
              <Button
                disabled={!pcaFile}
                ariaDescribedBy="motivo-salvar-pca"
                onClick={() =>
                  salvarTenant(
                    {
                      pca: {
                        ano: pcaYear,
                        arquivo: pcaFile,
                        itensIndexados: tenant.data.pca.itensIndexados,
                      },
                    },
                    "PCA salvo — o modelo o utilizará como referência.",
                  )
                }
              >
                Salvar PCA
              </Button>
            </div>
          </div>

          <div className="lg:sticky lg:top-4">
            <InfoBanner tone="info">
              O <strong>Plano de Contratações Anual (PCA)</strong> é utilizado
              pelo modelo de IA para validar se o processo em elaboração está
              previsto no planejamento vigente, sugerindo o item correspondente
              e auxiliando no preenchimento do ETP.
            </InfoBanner>
          </div>
        </div>
      )}

      {/* ── Usuários ── */}
      {activeTab === "usuarios" && (
        <div>
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
                <FormField label="Senha inicial" required hint="Mínimo de 12 caracteres.">
                  <Input value={nsSenha} onChange={(e) => setNsSenha(e.target.value)} type="password" autoComplete="new-password" />
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
                  Nome, CPF válido, e-mail, senha com no mínimo 12 caracteres e a
                  prefeitura são obrigatórios.
                </p>
                <Button
                  disabled={criarServidor.isPending || nsNome.trim() === "" || !validaCPF(nsCpf) || nsEmail.trim() === "" || nsSenha.length < 12 || !prefeituraId}
                  ariaDescribedBy="motivo-criar-servidor-tenant"
                  onClick={() =>
                    criarServidor.mutate(
                      { nome: nsNome, cpf: nsCpf, email: nsEmail, cargo: nsCargo, senha: nsSenha, perfilAcesso: nsPerfil, prefeituraId: prefeituraId ?? null },
                      {
                        onSuccess: () => {
                          showToast("Servidor cadastrado com a senha inicial informada.");
                          setNovoServidor(false);
                          setNsNome(""); setNsCpf(""); setNsEmail(""); setNsCargo(""); setNsSenha(""); setNsPerfil("servidor");
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
