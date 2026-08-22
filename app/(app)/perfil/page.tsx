"use client";

import Image from "next/image";
import { useState } from "react";

import { Button, Dropdown, FormField, Input, Tag } from "@/components/ui";
import { IconCamera } from "@/components/ui/icons";
import { LoadingState } from "@/components/shared/estados";
import { useToast } from "@/components/shared/providers";
import {
  useAtualizarAvatar,
  useAtualizarMeuPerfil,
  useSessao,
} from "@/lib/api/hooks";
import { formatCPF } from "@/lib/auth/cpf";
import { PERFIL_ACESSO_LABEL } from "@/lib/types";

export default function MeuPerfil() {
  const showToast = useToast();
  const sessao = useSessao();
  const salvar = useAtualizarMeuPerfil();
  const atualizarAvatar = useAtualizarAvatar();

  const usuario = sessao.data?.usuario;
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("");
  const [secretaria, setSecretaria] = useState("");
  const [sincronizado, setSincronizado] = useState(false);

  // Semeia os campos uma vez, quando a sessão chega.
  if (usuario && !sincronizado) {
    setNome(usuario.nome);
    setEmail(usuario.email);
    setCargo(usuario.cargo);
    setSecretaria(usuario.secretaria ?? "");
    setSincronizado(true);
  }

  if (sessao.isPending || !usuario)
    return <LoadingState label="Carregando perfil..." />;

  const prefeitura = sessao.data?.prefeitura;
  const secretarias = prefeitura?.secretarias ?? [];

  const onFoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = () =>
      atualizarAvatar.mutate(
        typeof reader.result === "string" ? reader.result : null,
      );
    reader.readAsDataURL(file);
  };

  return (
    <div className="max-w-content p-4 sm:p-5 lg:p-7">
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* Coluna 1 — identidade */}
        <div className="flex flex-col items-center rounded-card border border-border bg-surface p-6 text-center">
          <label
            className="group relative size-24 cursor-pointer"
            title="Alterar foto de perfil"
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onFoto(f);
              }}
            />
            {usuario.avatarDataUrl ? (
              <Image
                src={usuario.avatarDataUrl}
                alt="Foto de perfil"
                width={96}
                height={96}
                unoptimized
                className="size-24 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-24 items-center justify-center rounded-full font-display text-3xl font-bold text-on-dark gradient-user">
                {usuario.iniciais}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-navy/45 text-on-dark opacity-0 transition-opacity group-hover:opacity-100">
              <IconCamera size={22} />
            </span>
          </label>
          <span className="mt-2 text-2xs text-text-muted">
            Clique na foto para alterar
          </span>

          <div className="mt-4 font-display text-xl font-extrabold tracking-tight text-text-1">
            {usuario.nome}
          </div>
          <div className="mt-1.5">
            <Tag tone="info">{PERFIL_ACESSO_LABEL[usuario.perfilAcesso]}</Tag>
          </div>
          <p className="m-0 mt-2.5 text-sm text-text-3">
            {usuario.cargo || "Sem cargo definido"}
          </p>
          {prefeitura && (
            <p className="m-0 mt-2.5 text-sm text-text-3">{prefeitura.orgao}</p>
          )}
        </div>

        {/* Coluna 2 — dados editáveis */}
        <div className="rounded-card border border-border bg-surface p-6 lg:p-7">
          <h2 className="m-0 mb-5 font-display text-md font-bold text-text-1">
            Dados de Contato
          </h2>

          <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
            <FormField label="Nome Completo" required>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </FormField>
            <FormField label="CPF">
              <Input value={formatCPF(usuario.cpf)} disabled />
              <p className="mt-1.5 text-xs text-text-muted">
                O CPF não pode ser alterado.
              </p>
            </FormField>
            <FormField label="E-mail" required>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
              />
            </FormField>
            <FormField label="Cargo">
              <Input value={cargo} onChange={(e) => setCargo(e.target.value)} />
            </FormField>
            <FormField label="Matrícula">
              <Input value={usuario.matricula ?? "—"} disabled />
              <p className="mt-1.5 text-xs text-text-muted">
                A matrícula é cadastral e pode ser a chave de login: quem a
                altera é a administração, em Servidores.
              </p>
            </FormField>
            <FormField label="Decreto de Nomeação">
              <Input value={usuario.decretoNomeacao ?? "—"} disabled />
            </FormField>
            <div className="sm:col-span-2">
              <FormField label="Secretaria">
                <Dropdown
                  value={secretaria}
                  onChange={setSecretaria}
                  ariaLabel="Secretaria em que atua"
                  options={[
                    { value: "", label: "Nenhuma" },
                    ...secretarias.map((s) => ({
                      value: s.nome,
                      label: s.nome,
                    })),
                  ]}
                />
              </FormField>
            </div>
          </div>

          <div className="mt-6 flex justify-end border-t border-border-soft pt-5">
            <p id="motivo-salvar-perfil" className="sr-only">
              Nome completo e e-mail são obrigatórios.
            </p>
            <Button
              disabled={
                salvar.isPending || nome.trim() === "" || email.trim() === ""
              }
              ariaDescribedBy="motivo-salvar-perfil"
              onClick={() =>
                salvar.mutate(
                  { nome, email, cargo, secretaria },
                  { onSuccess: () => showToast("Perfil atualizado.") },
                )
              }
            >
              {salvar.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
