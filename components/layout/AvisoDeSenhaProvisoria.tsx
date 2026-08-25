"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"

import { IconLock } from "@/components/ui/icons"
import { useSessao } from "@/lib/api/hooks"

/**
 * O aviso de que a senha ainda é a que o sistema sorteou.
 *
 * <p>Avisa e não trava (ADR-022). A versão anterior substituía a aplicação
 * inteira por um formulário: quem entrava com a senha entregue não conseguia
 * nem olhar a plataforma antes de escolher uma senha, e quem travava no meio da
 * troca não tinha para onde voltar.
 *
 * <p>A trava também não fechava a janela que dizia fechar — a senha é entregue
 * por fora do sistema, e quem a entregou já a conhece desde antes do primeiro
 * login. O que encurta a janela é a troca acontecer, e para isso o caminho
 * precisa estar a um clique, não no lugar de tudo.
 *
 * <p>"Agora não" vale enquanto a aba estiver aberta. Recarregar traz o aviso de
 * volta, porque a senha continua sendo a de outra pessoa.
 */
export function AvisoDeSenhaProvisoria() {
  const sessao = useSessao()
  const pathname = usePathname()
  const [dispensado, setDispensado] = useState(false)

  const usuario = sessao.data?.usuario
  // Na própria tela de perfil o aviso seria ruído: o formulário de troca já
  // está ali, visível, na mesma página.
  if (!usuario?.precisaTrocarSenha || dispensado || pathname.startsWith("/perfil")) return null

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-tint-warning-border bg-tint-warning-bg px-4 py-2.5 sm:px-5 lg:px-7">
      <span className="flex shrink-0 text-tint-warning-fg">
        <IconLock size={16} />
      </span>
      <p className="m-0 min-w-0 flex-1 text-sm text-tint-warning-fg">
        Sua senha foi gerada pelo sistema e é conhecida por quem cadastrou seu acesso.
        Escolha uma senha só sua.
      </p>
      <div className="flex shrink-0 items-center gap-2">
        <Link
          href="/perfil"
          className="rounded-md border border-tint-warning-border bg-surface px-3 py-1.5 text-sm font-semibold text-tint-warning-fg no-underline transition-colors hover:bg-ice"
        >
          Trocar senha
        </Link>
        <button
          type="button"
          onClick={() => setDispensado(true)}
          className="cursor-pointer rounded-md border-0 bg-transparent px-2 py-1.5 text-sm font-medium text-tint-warning-fg underline"
        >
          Agora não
        </button>
      </div>
    </div>
  )
}
