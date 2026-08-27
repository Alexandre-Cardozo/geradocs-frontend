"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

import geradocsLogo from "@/public/geradocs-mark-white.png";

import {
  IconBuilding,
  IconClipboardList,
  IconDashboard,
  IconDownload,
  IconFileText,
  IconImage,
  IconLogout,
  IconMoreVertical,
  IconUser,
} from "@/components/ui/icons";
import { FotoDePerfil } from "@/components/shared/foto-de-perfil";
import { useLogout, useSessao } from "@/lib/api/hooks";
import { navPrincipal, navSistema, type IconeNav } from "@/lib/auth/acesso";
import { PERFIL_ACESSO_LABEL, TIPO_ENTIDADE_LABEL } from "@/lib/types";

/** Mapa de chave de ícone (RBAC) → componente. */
const ICONES: Record<IconeNav, ReactNode> = {
  dashboard: <IconDashboard size={18} />,
  processos: <IconFileText size={18} />,
  documentos: <IconDownload size={18} />,
  timbre: <IconImage size={18} />,
  secretarias: <IconBuilding size={18} />,
  pca: <IconClipboardList size={18} />,
  usuarios: <IconUser size={18} />,
  entidades: <IconBuilding size={18} />,
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
  const logout = useLogout();
  const [menuAberto, setMenuAberto] = useState(false);

  const usuario = sessao?.usuario;
  const entidade = sessao?.entidade;
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

      {/* Entidade atual — a da sessão; para o admin geral, o contexto LAHHM */}
      <div className="border-b border-on-dark-border px-5 py-3.5">
        <div className="mb-1.5 text-2xs font-semibold tracking-caps-wide text-on-dark-35 uppercase">
          {perfil === "admin_geral" ? "Contexto" : "Entidade Atual"}
        </div>
        <div className="flex items-center gap-2 rounded-md">
          {entidade?.logoDataUrl ? (
            <Image
              src={entidade.logoDataUrl}
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
              {entidade?.nome ??
                (perfil === "admin_geral" ? "Administração LAHHM" : "—")}
            </span>
            <span className="block text-2xs text-on-dark-40">
              {/* O tipo, e não a unidade administrativa: aquele campo não
                  aparecia em lugar nenhum do produto e saiu do modelo. */}
              {entidade
                ? TIPO_ENTIDADE_LABEL[entidade.tipo]
                : perfil === "admin_geral"
                  ? "Todas as entidades"
                  : ""}
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
            <SectionLabel>Configurações</SectionLabel>
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

      {/* Usuário — o cartão inteiro abre o menu (Meu Perfil / Sair) */}
      <div className="relative border-t border-on-dark-border p-2">
        <button
          type="button"
          onClick={() => setMenuAberto((v) => !v)}
          aria-label="Abrir menu do usuário"
          aria-expanded={menuAberto}
          className={`flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-0 p-1.5 text-left transition-colors ${
            menuAberto ? "bg-on-dark-fill" : "bg-transparent"
          }`}
        >
          <FotoDePerfil
            usuarioId={usuario?.id}
            iniciais={usuario?.iniciais ?? "—"}
            tamanho={36}
            className="shrink-0 text-base"
          />
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

        {menuAberto && (
          <>
            <div
              className="fixed inset-0 z-10"
              aria-hidden
              onClick={() => setMenuAberto(false)}
            />
            <div className="absolute inset-x-2 bottom-full z-20 mb-2 overflow-hidden rounded-xl border border-border bg-surface shadow-knob">
              {/* Cabeçalho — clicável: é onde a pessoa procura os próprios dados */}
              <Link
                href="/perfil"
                onClick={() => {
                  setMenuAberto(false);
                  onNavigate?.();
                }}
                className="block border-b border-border-soft px-3.5 py-3 no-underline transition-colors hover:bg-ice"
              >
                <div className="truncate text-sm font-bold text-text-1">
                  {usuario?.nome}
                </div>
                <div className="truncate text-xs text-text-muted">
                  {usuario?.email}
                </div>
              </Link>
              <div className="p-1">
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
