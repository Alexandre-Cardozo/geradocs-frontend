import { readFileSync, readdirSync, statSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { CATALOGO, ORDEM_FLUXO, REGRA_MODALIDADE } from "@/lib/documentos"
import { secoesPorTipoBase } from "@/lib/documentos/secoes"
import { MODALIDADE_LABEL, STATUS_PROCESSO_LABEL, type Modalidade } from "@/lib/types"

const MODALIDADES = Object.keys(MODALIDADE_LABEL) as Modalidade[]

/**
 * A regra vira teste, não boa intenção.
 *
 * As regras abaixo estão escritas em `docs/estilizacao.md`, em `AGENTS.md` e na
 * skill de guarda-corpos. Enquanto viviam só lá, dependiam de alguém lembrar
 * delas na revisão — e revisão cansa. Aqui elas quebram o build.
 *
 * Uma regra que ainda não é executável está no fim do arquivo, declarada como
 * pendência com data, não escondida.
 */

const RAIZ = process.cwd()

function arquivosDe(diretorio: string, extensoes = [".ts", ".tsx"]): string[] {
  const alvo = join(RAIZ, diretorio)
  const encontrados: string[] = []
  const percorrer = (caminho: string) => {
    for (const entrada of readdirSync(caminho)) {
      if (entrada === "node_modules" || entrada.startsWith(".")) continue
      const completo = join(caminho, entrada)
      if (statSync(completo).isDirectory()) percorrer(completo)
      else if (extensoes.some((ext) => entrada.endsWith(ext))) encontrados.push(completo)
    }
  }
  percorrer(alvo)
  return encontrados
}

const codigoDaInterface = [...arquivosDe("app"), ...arquivosDe("components")]
const todoCodigo = [...codigoDaInterface, ...arquivosDe("lib")]
const nome = (caminho: string) => relative(RAIZ, caminho)

describe("1. cor só por token do design system", () => {
  it("nenhum hex fora do @theme de globals.css", () => {
    // A fonte única de cor é o bloco @theme. Um hex solto num componente cria
    // uma cor que o tema não conhece e que ninguém encontra para trocar depois.
    const infratores = todoCodigo
      .filter((arquivo) => /#[0-9a-fA-F]{3,8}\b/.test(readFileSync(arquivo, "utf8")))
      .map(nome)
    expect(infratores).toEqual([])
  })
})

describe("2. o mock não vaza para a interface", () => {
  it("lib/mocks é importado somente pela fachada de dados", () => {
    // O objetivo declarado em docs/estrutura.md é que apagar lib/mocks na
    // integração não quebre tela nenhuma. Um import em componente quebra isso.
    const infratores = todoCodigo
      .filter((arquivo) => !nome(arquivo).startsWith("lib/api/client.ts"))
      .filter((arquivo) => !nome(arquivo).startsWith("lib/teste/"))
      .filter((arquivo) => /from ["']@\/lib\/mocks/.test(readFileSync(arquivo, "utf8")))
      .map(nome)
    expect(infratores).toEqual([])
  })
})

describe("3. zero emoji na interface", () => {
  it("ícones são os de linha de components/ui/icons", () => {
    // `✓`, `✕` e `©` são sinais tipográficos, não emoji: os dois primeiros
    // marcam conformidade com o peso da fonte do design system, e o terceiro é o
    // símbolo de copyright do rodapé. A propriedade Extended_Pictographic os
    // inclui, e é por isso que a regra precisa dizer o que aceita.
    const tipograficosAceitos = /[\u2713\u2715\u00A9]/gu
    const emoji = /\p{Extended_Pictographic}/u
    const infratores = codigoDaInterface
      .filter((arquivo) => emoji.test(readFileSync(arquivo, "utf8").replace(tipograficosAceitos, "")))
      .map(nome)
    expect(infratores).toEqual([])
  })
})

describe("4. catálogo de documentos exaustivo", () => {
  it("todo tipo existe nos três mapas que o descrevem", () => {
    // Um tipo presente no catálogo mas ausente da matriz de modalidade some do
    // wizard sem erro; ausente das seções, abre um editor vazio.
    for (const tipo of ORDEM_FLUXO) {
      expect(CATALOGO[tipo], `CATALOGO: ${tipo}`).toBeDefined()
      expect(secoesPorTipoBase[tipo], `secoesPorTipoBase: ${tipo}`).toBeDefined()
    }
    // A matriz **não** cobre todos os tipos em toda modalidade — e não deve: a
    // contratação direta não gera edital (Art. 72). O que ela não pode é citar
    // tipo que o catálogo desconhece, nem esquecer uma modalidade.
    const modalidadesDeclaradas = Object.keys(REGRA_MODALIDADE) as Modalidade[]
    expect(modalidadesDeclaradas.length, "toda modalidade precisa de regra").toBe(MODALIDADES.length)
    for (const [modalidade, regra] of Object.entries(REGRA_MODALIDADE)) {
      for (const tipo of [...regra.obrigatorios, ...regra.opcionais]) {
        expect(ORDEM_FLUXO, `${modalidade} cita tipo desconhecido: ${tipo}`).toContain(tipo)
      }
    }
  })

  it("nenhum tipo é obrigatório e opcional ao mesmo tempo", () => {
    for (const [modalidade, regra] of Object.entries(REGRA_MODALIDADE)) {
      const repetidos = regra.obrigatorios.filter((tipo) => regra.opcionais.includes(tipo))
      expect(repetidos, modalidade).toEqual([])
    }
  })
})

describe("5. vocabulário de status é normativo", () => {
  it("nenhuma tela mantém a própria lista de rótulos de status", () => {
    // O vocabulário vai encolher quando o fluxo de aprovação sair do produto.
    // Uma cópia local continuaria oferecendo filtro para status inexistente.
    const rotulos = Object.values(STATUS_PROCESSO_LABEL)
    const infratores = codigoDaInterface
      .filter((arquivo) => {
        const conteudo = readFileSync(arquivo, "utf8")
        const citados = rotulos.filter((rotulo) => conteudo.includes(`"${rotulo}"`))
        // Um rótulo isolado pode ser texto legítimo; três ou mais literais é
        // uma lista paralela ao mapa normativo.
        return citados.length >= 3
      })
      .map(nome)
    expect(infratores).toEqual([])
  })
})

describe("6. valor monetário nunca aparece cru", () => {
  it("a formatação passa pelos helpers de lib/format", () => {
    // Intl solto produz espaço estreito e casas variáveis; o documento gerado
    // sai com valor em formato diferente do que a tela mostrou.
    const infratores = codigoDaInterface
      .filter((arquivo) => /toLocaleString\(|new Intl\.NumberFormat/.test(readFileSync(arquivo, "utf8")))
      .map(nome)
    expect(infratores).toEqual([])
  })
})

describe("7. botão desabilitado por regra de negócio explica o que falta", () => {
  /**
   * Termos que significam "a requisição está em voo".
   *
   * Botão desabilitado enquanto salva não precisa de explicação: o próprio
   * rótulo muda para "Salvando..." e o estado dura segundos. O que precisa é o
   * botão travado por algo que a pessoa pode resolver — e que ela não consegue
   * descobrir se o leitor de tela só anuncia "desabilitado".
   */
  const EM_VOO = /\b(\w+\.)?(isPending|isFetching)\b|\bpendente\b/g

  it("nenhum <Button> travado por regra fica sem ariaDescribedBy", () => {
    const infratores: string[] = []
    for (const arquivo of codigoDaInterface.filter((a) => a.endsWith(".tsx"))) {
      const conteudo = readFileSync(arquivo, "utf8")
      for (const abertura of conteudo.matchAll(/<Button\b[^>]*?>/gs)) {
        const bloco = abertura[0]
        const disabled = /disabled=\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/.exec(bloco)
        if (!disabled) continue
        const regraDeNegocio = disabled[1]!.replace(EM_VOO, "").replace(/[\s|&]+/g, "")
        if (regraDeNegocio && !bloco.includes("ariaDescribedBy")) {
          infratores.push(`${nome(arquivo)} — disabled={${disabled[1]!.trim()}}`)
        }
      }
    }

    // A explicação vai em `ariaDescribedBy`, e não em `title`: tooltip não é
    // lida em navegação por teclado, que é exatamente quem fica sem saída.
    expect(infratores, "botões travados sem dizer o que falta").toEqual([])
  })
})
