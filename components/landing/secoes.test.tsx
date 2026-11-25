import { describe, expect, it } from "vitest"

import { render, screen } from "@/lib/teste/renderizar"

import { Compromissos } from "./compromissos"
import { Confianca } from "./confianca"
import { Contador } from "./contador"
import { Contato } from "./contato"
import { Desafio } from "./desafio"
import { Geradocs } from "./geradocs"
import { IaResponsavel } from "./ia-responsavel"
import { Metodo } from "./metodo"
import { Perfis } from "./perfis"
import { Perguntas } from "./perguntas"
import { Produtividade } from "./produtividade"
import { QuemSomos } from "./quem-somos"
import { Solucoes } from "./solucoes"
import { Valores } from "./valores"


describe("seções da página da GovPro", () => {
  it("Quem Somos traz o manifesto inteiro, o público e a ficha", () => {
    const { container } = render(<QuemSomos />)
    expect(container.querySelector("[data-palavra]")?.parentElement).toHaveTextContent(
      "Tecnologia, para nós, é um meio. O fim é uma gestão pública mais eficiente, mais transparente e mais humana.",
    )
    expect(screen.getByRole("list", { name: "Para quem trabalhamos" })).toHaveTextContent("Consórcios Públicos")
    expect(screen.getByText("Planejamento das contratações públicas")).toBeInTheDocument()
  })

  it("Quem Somos traz propósito, missão e visão, sem citar a sede", () => {
    render(<QuemSomos />)
    for (const rotulo of ["Propósito", "Missão", "Visão"]) expect(screen.getByText(rotulo)).toBeInTheDocument()
    expect(screen.queryByText(/Colatina|capixaba/)).toBeNull()
  })

  it("Soluções destaca o GeraDocs e reserva o espaço das próximas", () => {
    render(<Solucoes />)
    expect(screen.getByRole("img", { name: "GeraDocs" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Conhecer o GeraDocs/ })).toHaveAttribute("href", "#geradocs")
    expect(screen.getByRole("heading", { level: 3, name: "Próximas Soluções" })).toBeInTheDocument()
  })

  it("Desafio lista o que está em jogo", () => {
    render(<Desafio />)
    expect(screen.getAllByRole("listitem")).toHaveLength(6)
    expect(screen.getByText("Da boa ideia à entrega")).toBeInTheDocument()
  })

  it("GeraDocs tem o título, o endosso, a demonstração e os cinco números", () => {
    render(<Geradocs />)
    expect(screen.getByRole("heading", { level: 2, name: "A Contratação Pública Bem Planejada Começa Aqui" })).toBeInTheDocument()
    expect(screen.getByRole("img", { name: "GeraDocs, uma solução GovPro" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: /Solicitar Demonstração/ })).toHaveAttribute(
      "href",
      "/onboarding?origem=geradocs",
    )
    expect(screen.getAllByRole("definition")).toHaveLength(5)
  })

  it("o contador entrega o valor final ao servidor e ao leitor de tela", () => {
    const { container } = render(<Contador valor={13} />)
    expect(container.querySelector("[aria-hidden]")).toHaveTextContent("13")
    expect(container.querySelector(".sr-only")).toHaveTextContent("13")
  })

  it("Produtividade apresenta o ganho como estimativa e compara antes e depois", () => {
    render(<Produtividade />)
    expect(screen.getByText(/^Estimativas da GovPro/)).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: "Com o GeraDocs" })).toBeInTheDocument()
    expect(screen.getAllByRole("row")).toHaveLength(9)
  })

  it("IA Responsável traz as seis garantias", () => {
    render(<IaResponsavel />)
    expect(screen.getByRole("heading", { level: 2, name: "A IA Propõe. O Servidor Decide." })).toBeInTheDocument()
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(6)
  })

  it("Confiança cita o fundamento literal e a identificação do documento", () => {
    render(<Confianca />)
    expect(screen.getByText("Art. 75, § 1º")).toBeInTheDocument()
    expect(screen.getByText("Carimbo com código e QR Code")).toBeInTheDocument()
  })

  it("Perfis, Valores, Método e Compromissos trazem as listas da apresentação", () => {
    render(<Perfis />)
    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(4)
    render(<Valores />)
    expect(screen.getByText("Interesse Público em Primeiro Lugar")).toBeInTheDocument()
    render(<Metodo />)
    expect(screen.getByText("Ouvir Antes de Propor")).toBeInTheDocument()
    render(<Compromissos />)
    expect(screen.getByText("O que não prometemos")).toBeInTheDocument()
  })

  it("Perguntas abrem sem JavaScript, em details", () => {
    const { container } = render(<Perguntas />)
    expect(container.querySelectorAll("details")).toHaveLength(7)
  })

  it("Contato pede a demonstração e mostra o e-mail", () => {
    render(<Contato />)
    expect(screen.getByRole("link", { name: "contato@govpro.com.br" })).toHaveAttribute("href", "mailto:contato@govpro.com.br")
    expect(screen.getByRole("link", { name: /Fale com a GovPro/ })).toHaveAttribute("href", "/onboarding?origem=contato")
    expect(screen.getByRole("link", { name: /Solicitar Demonstração/ })).toHaveAttribute("href", "/onboarding?origem=contato-demonstracao")
  })
})
