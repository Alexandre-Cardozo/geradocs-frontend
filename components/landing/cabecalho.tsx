"use client"

import Image from "next/image"
import { useEffect, useRef, useState } from "react"

import geradocsLogo from "@/public/geradocs-logo-white.svg"
import govproLogo from "@/public/govpro-logo-white.svg"

import { BotaoLink } from "@/components/landing/botao-link"
import { IconMenu, IconX } from "@/components/ui/icons"
import { CONTEUDO, HREF_DEMONSTRACAO, HREF_ENTRAR } from "@/lib/landing/conteudo"

type Menu = "fechado" | "aberto" | "fechando"

/**
 * Cabeçalho fixo da landing. No topo da página ele é transparente, sobre o céu da
 * abertura (§120), e vira navy ao rolar ou ao abrir o menu. No desktop (lg),
 * âncoras e o pedido de demonstração; abaixo disso, um menu que abre em 250ms e fecha em 150ms (§117). A borda
 * inferior só aparece junto com o fundo. Sobre o navy, o foco é `electric` (`.on-dark`).
 */
export function Cabecalho() {
  const [menu, setMenu] = useState<Menu>("fechado")
  const [rolou, setRolou] = useState(false)
  const botaoDoMenu = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 0)
    window.addEventListener("scroll", aoRolar, { passive: true })
    return () => window.removeEventListener("scroll", aoRolar)
  }, [])

  useEffect(() => {
    if (menu !== "aberto") return
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key !== "Escape") return
      setMenu("fechando")
      // O painel some e levaria o foco junto: devolve ao botão que o abriu.
      botaoDoMenu.current?.focus()
    }
    window.addEventListener("keydown", aoTeclar)
    return () => window.removeEventListener("keydown", aoTeclar)
  }, [menu])

  const aberto = menu === "aberto"
  const fechar = () => setMenu("fechando")

  return (
    <header
      className={`on-dark sticky top-0 z-30 border-b transition-colors duration-200 ease-linear ${
        rolou || menu !== "fechado" ? "border-on-dark-border bg-navy" : "border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 max-w-landing items-center justify-between gap-4 px-4 sm:px-6">
        <div className="flex items-center gap-3">
          <Image src={geradocsLogo} alt="GeraDocs" width={113} height={24} className="h-6 w-auto" />
          <span className="h-4 w-px bg-on-dark-border" aria-hidden />
          <Image src={govproLogo} alt="Uma solução GovPro" width={60} height={14} className="h-3.5 w-auto" />
        </div>

        <nav aria-label="Seções da página" className="hidden items-center gap-6 lg:flex">
          {CONTEUDO.navegacao.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="inline-flex h-11 items-center text-md font-medium text-on-dark-65 no-underline hover:text-on-dark"
            >
              {item.rotulo}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <div className="hidden xl:block">
            <BotaoLink href={HREF_ENTRAR} variante="secundario-escuro">
              {CONTEUDO.hero.ctaSecundario}
            </BotaoLink>
          </div>
          <BotaoLink href={HREF_DEMONSTRACAO}>{CONTEUDO.hero.ctaPrimario}</BotaoLink>
        </div>

        <button
          ref={botaoDoMenu}
          type="button"
          aria-label="Menu"
          aria-expanded={aberto}
          aria-controls={menu === "fechado" ? undefined : "menu-landing"}
          onClick={() => (aberto ? fechar() : setMenu("aberto"))}
          className="inline-flex size-11 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-on-dark lg:hidden"
        >
          {aberto ? <IconX size={22} /> : <IconMenu size={22} />}
        </button>
      </div>

      {menu !== "fechado" && (
        <div
          id="menu-landing"
          onAnimationEnd={() => menu === "fechando" && setMenu("fechado")}
          className={`absolute inset-x-0 top-full max-h-[calc(100dvh-4rem)] origin-top overflow-y-auto overscroll-contain border-b border-on-dark-border bg-navy px-4 pb-5 sm:px-6 lg:hidden ${
            aberto ? "animate-landing-menu-abre" : "animate-landing-menu-fecha"
          }`}
        >
          <nav aria-label="Seções da página (menu)" className="flex flex-col">
            {CONTEUDO.navegacao.map((item) => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={fechar}
                className="inline-flex h-12 items-center text-landing-body font-medium text-on-dark-65 no-underline hover:text-on-dark"
              >
                {item.rotulo}
              </a>
            ))}
          </nav>
          <div className="mt-3 flex flex-col gap-3">
            <BotaoLink href={HREF_DEMONSTRACAO} tamanho="lg">
              {CONTEUDO.hero.ctaPrimario}
            </BotaoLink>
            <BotaoLink href={HREF_ENTRAR} tamanho="lg" variante="secundario-escuro">
              {CONTEUDO.hero.ctaSecundario}
            </BotaoLink>
          </div>
        </div>
      )}
    </header>
  )
}
