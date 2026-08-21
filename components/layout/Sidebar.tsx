"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import geradocsLogo from "@/public/geradocs-mark-white.png";

import {
  IconBuilding,
  IconCamera,
  IconDashboard,
  IconDownload,
  IconFileText,
  IconLogout,
  IconMoreVertical,
  IconSettings,
  IconUser,
} from "@/components/ui/icons";
import {
  useAtualizarAvatar,
  useLogout,
  useSessao,
} from "@/lib/api/hooks";
import { navPrincipal, navSistema, type IconeNav } from "@/lib/auth/acesso";
import { PERFIL_ACESSO_LABEL } from "@/lib/types";

/** Mapa de chave de ícone (RBAC) → componente. */
const ICONES: Record<IconeNav, ReactNode> = {
  dashboard: <IconDashboard size={18} />,
  processos: <IconFileText size={18} />,
  documentos: <IconDownload size={18} />,
  configuracoes: <IconSettings size={18} />,
  prefeituras: <IconBuilding size={18} />,
  servidores: <IconUser size={18} />,
};

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: number;
  /** Prefixos extras que mantêm o item ativo (ex.: /processos/... ). */
  match?: (pathname: string) => boolean;
}

function NavLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`relative mb-0.5 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2.25 text-left text-base no-underline transition-colors ${
        active
          ? "bg-on-dark-active font-semibold text-on-dark"
          : "font-medium text-on-dark-55 hover:bg-on-dark-fill hover:text-on-dark"
      }`}
    >
      {/* Barra ativa 3×20 electric à esquerda */}
      {active && (
        <span className="absolute top-1/2 left-0 h-5 w-0.75 -translate-y-1/2 rounded-r-[3px] bg-electric" />
      )}
      <span className={`flex ${active ? "text-electric" : "text-inherit"}`}>
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {item.badge != null && item.badge > 0 && (
        <span className="min-w-4.5 rounded-full bg-danger px-1.5 py-px text-center text-2xs font-bold text-on-dark">
          {item.badge}
        </span>
      )}
    </Link>
  );
}

function SectionLabel({
  children,
  top,
}: {
  children: ReactNode;
  top?: boolean;
}) {
  return (
    <div
      className={`mb-1 px-2 py-1 text-2xs font-semibold tracking-caps-wide text-on-dark-30 uppercase ${top ? "mt-0" : "mt-4"}`}
    >
      {children}
    </div>
  );
}

export default function Sidebar({
  aberta = false,
  onNavigate,
}: {
  /** Drawer aberto (só tem efeito abaixo de 1024px; no laptop a sidebar é fixa). */
  aberta?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: sessao } = useSessao();
  const atualizarAvatar = useAtualizarAvatar();
  const logout = useLogout();
  const [menuAberto, setMenuAberto] = useState(false);

  const usuario = sessao?.usuario;
  const prefeitura = sessao?.prefeitura;
  const perfil = usuario?.perfilAcesso ?? "servidor";

  const paraItem = (i: { href: string; label: string; icone: IconeNav }): NavItem => ({
    href: i.href,
    label: i.label,
    icon: ICONES[i.icone],
    match: (p) => (i.href === "/" ? p === "/" : p.startsWith(i.href)),
  });

  const navItems: NavItem[] = navPrincipal(perfil).map(paraItem);
  const bottomItems: NavItem[] = navSistema(perfil).map(paraItem);

  const sair = () => {
    setMenuAberto(false);
    logout.mutate(undefined, { onSuccess: () => router.replace("/login") });
  };

  return (
    <aside
      className={`on-dark fixed inset-y-0 left-0 z-60 flex h-full w-60 min-w-60 flex-col overflow-hidden bg-navy transition-transform duration-200 lg:static lg:translate-x-0 lg:transition-none ${
        aberta ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      {/* Logo GeraDocs — marca oficial (sem fundo) */}
      <div className="border-b border-on-dark-border px-5 pt-6 pb-5">
        <div className="flex items-center gap-2.5">
          <Image
            src={geradocsLogo}
            alt="GeraDocs"
            width={34}
            height={36}
            priority
            className="shrink-0 object-contain"
          />
          <div>
            <div className="font-display text-lg font-bold tracking-heading text-on-dark">
              GeraDocs
            </div>
            <div className="mt-px text-2xs font-medium tracking-caps text-on-dark-40 uppercase">
              LAHHM · GOV
            </div>
          </div>
        </div>
      </div>

      {/* Órgão atual — a prefeitura da sessão; para o admin geral, o contexto LAHHM */}
      <div className="border-b border-on-dark-border px-5 py-3.5">
        <div className="mb-1.5 text-2xs font-semibold tracking-caps-wide text-on-dark-35 uppercase">
          {perfil === "admin_geral" ? "Contexto" : "Órgão Atual"}
        </div>
        <div className="flex items-center gap-2 rounded-md">
          {prefeitura?.logoDataUrl ? (
            <Image
              src={prefeitura.logoDataUrl}
              alt=""
              width={22}
              height={22}
              unoptimized
              className="size-5.5 shrink-0 object-contain"
            />
          ) : (
            <span className="flex size-5.5 shrink-0 items-center justify-center rounded-[5px] bg-on-dark-royal-chip text-electric">
              <IconBuilding size={12} strokeWidth={2.5} />
            </span>
          )}
          <span className="block min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-on-dark">
              {prefeitura?.orgao ??
                (perfil === "admin_geral" ? "Administração LAHHM" : "—")}
            </span>
            <span className="block text-2xs text-on-dark-40">
              {prefeitura?.unidade ??
                (perfil === "admin_geral" ? "Todas as prefeituras" : "")}
            </span>
          </span>
        </div>
      </div>

      {/* Navegação */}
      <nav className="flex-1 overflow-y-auto p-3">
        <SectionLabel top>Principal</SectionLabel>
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={item.match ? item.match(pathname) : pathname === item.href}
            onNavigate={onNavigate}
          />
        ))}

        {bottomItems.length > 0 && (
          <>
            <SectionLabel>Sistema</SectionLabel>
            {bottomItems.map((item) => (
              <NavLink
                key={item.href}
                item={item}
                active={
                  item.match ? item.match(pathname) : pathname === item.href
                }
                onNavigate={onNavigate}
              />
            ))}
          </>
        )}
      </nav>

      {/* Usuário — avatar (troca a foto) + linha clicável que abre o menu (Meu Perfil / Sair) */}
      <div className="relative border-t border-on-dark-border p-2">
        <div
          className={`flex items-center gap-2.5 rounded-lg p-1.5 transition-colors ${
            menuAberto ? "bg-on-dark-fill" : ""
          }`}
        >
          <label
            className="group relative size-9 shrink-0 cursor-pointer"
            title="Alterar foto de perfil"
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                const reader = new FileReader();
                reader.onload = () =>
                  atualizarAvatar.mutate(
                    typeof reader.result === "string" ? reader.result : null,
                  );
                reader.readAsDataURL(f);
              }}
            />
            {usuario?.avatarDataUrl ? (
              <Image
                src={usuario.avatarDataUrl}
                alt="Foto de perfil"
                width={36}
                height={36}
                unoptimized
                className="size-9 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-9 items-center justify-center rounded-full text-base font-bold text-on-dark gradient-user">
                {usuario?.iniciais ?? "—"}
              </span>
            )}
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-navy/55 text-on-dark opacity-0 transition-opacity group-hover:opacity-100">
              <IconCamera size={14} />
            </span>
          </label>

          <button
            type="button"
            onClick={() => setMenuAberto((v) => !v)}
            aria-label="Abrir menu do usuário"
            aria-expanded={menuAberto}
            className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-0 bg-transparent p-0 text-left"
          >
            <span className="block min-w-0 flex-1">
              <span className="block truncate text-base font-semibold text-on-dark">
                {usuario?.nome ?? "Carregando..."}
              </span>
              <span className="block truncate text-xs text-on-dark-40">
                {usuario ? PERFIL_ACESSO_LABEL[usuario.perfilAcesso] : ""}
              </span>
            </span>
            <span
              className={`flex shrink-0 transition-colors ${menuAberto ? "text-on-dark" : "text-on-dark-30"}`}
            >
              <IconMoreVertical size={16} />
            </span>
          </button>
        </div>

        {menuAberto && (
          <>
            <div
              className="fixed inset-0 z-10"
              aria-hidden
              onClick={() => setMenuAberto(false)}
            />
            <div className="absolute inset-x-2 bottom-full z-20 mb-2 overflow-hidden rounded-xl border border-border bg-surface shadow-knob">
              {/* Cabeçalho — nome completo + e-mail (o nome trunca na barra) */}
              <div className="border-b border-border-soft px-3.5 py-3">
                <div className="truncate text-sm font-bold text-text-1">
                  {usuario?.nome}
                </div>
                <div className="truncate text-xs text-text-muted">
                  {usuario?.email}
                </div>
              </div>
              <div className="p-1">
                {perfil !== "admin_geral" && (
                  <Link
                    href="/perfil"
                    onClick={() => {
                      setMenuAberto(false);
                      onNavigate?.();
                    }}
                    className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium text-text-2 no-underline transition-colors hover:bg-ice"
                  >
                    <IconUser size={15} /> Meu Perfil
                  </Link>
                )}
                <button
                  type="button"
                  onClick={sair}
                  className="flex w-full cursor-pointer items-center gap-2.5 rounded-md border-0 bg-transparent px-2.5 py-2 text-left text-sm font-semibold text-danger transition-colors hover:bg-tint-danger-bg"
                >
                  <IconLogout size={15} /> Sair da conta
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
