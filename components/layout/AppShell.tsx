"use client"

import { useState, type ReactNode } from "react"

import { AvisoDeSenhaProvisoria } from "@/components/layout/AvisoDeSenhaProvisoria"
import Header from "@/components/layout/Header"
import Sidebar from "@/components/layout/Sidebar"

/**
 * Shell autenticado responsivo: no laptop (≥1024px) a sidebar é fixa de 240px;
 * abaixo disso vira drawer off-canvas aberto pelo hambúrguer do Header,
 * fechado ao navegar ou tocar no backdrop.
 */
export default function AppShell({ children }: { children: ReactNode }) {
  const [sidebarAberta, setSidebarAberta] = useState(false)

  return (
    <div className="flex h-dvh overflow-hidden bg-ice">
      <Sidebar aberta={sidebarAberta} onNavigate={() => setSidebarAberta(false)} />
      {sidebarAberta && (
        <div
          className="fixed inset-0 z-55 bg-navy/50 lg:hidden"
          onClick={() => setSidebarAberta(false)}
          aria-hidden
        />
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header onMenuClick={() => setSidebarAberta(true)} />
        <AvisoDeSenhaProvisoria />
        {/*
          `relative` não é enfeite: `sr-only` é `position: absolute`, e sem um
          ancestral posicionado o bloco de contenção dele vira a página inteira.
          Um aviso de leitor de tela no fim de um formulário longo escapava do
          `main`, esticava o documento e produzia uma segunda barra de rolagem
          com uma faixa branca no fim da página.
        */}
        <main className="relative flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
