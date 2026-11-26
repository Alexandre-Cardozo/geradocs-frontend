import Image from "next/image"
import type { ReactNode } from "react"

import marca from "@/design_system/assets/geradocs-mark.svg"

import { CATALOGO } from "@/lib/documentos"
import { CONTEUDO } from "@/lib/landing/conteudo"
import type { DocumentoDaVitrine, ExtraDaVitrine, MioloDaFolha } from "@/lib/landing/documentos"

const { documentos, poucosCliques } = CONTEUDO

/** Uma linha de texto desenhada. */
function Linha({ largura = 100, forte = false }: { largura?: number; forte?: boolean }) {
  return <span className={`block h-1 rounded-full ${forte ? "bg-text-faint" : "bg-border"}`} style={{ width: `${largura}%` }} />
}

function Paragrafo({ linhas = [100, 96, 88] }: { linhas?: number[] }) {
  return (
    <span className="flex flex-col gap-1">
      {linhas.map((l, i) => (
        <Linha key={i} largura={l} />
      ))}
    </span>
  )
}

const ROMANOS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII"]
/** Incisos indispensáveis do Art. 18, § 2º. */
const INDISPENSAVEIS = new Set(["I", "IV", "VI", "VIII", "XIII"])

const MIOLOS: Record<MioloDaFolha, () => ReactNode> = {
  precos: () => (
    <span className="flex flex-col gap-1.5">
      {["Painel de Preços", "Contratações similares", "Sítio eletrônico", "Fornecedor"].map((fonte, i) => (
        <span key={fonte} className="grid grid-cols-[1fr_2fr] items-center gap-2">
          <span className="truncate text-2xs text-text-muted">{fonte}</span>
          <span className="block h-1.5 rounded-full bg-doc-cotacao/30" style={{ width: `${[62, 78, 55, 70][i]}%` }} />
        </span>
      ))}
      <span className="mt-2 grid grid-cols-3 gap-1 text-center text-2xs font-semibold">
        <span className="rounded-xs bg-border-soft py-1 text-text-3">Menor</span>
        <span className="rounded-xs bg-border-soft py-1 text-text-3">Média</span>
        <span className="rounded-xs bg-doc-cotacao py-1 text-on-dark">Mediana</span>
      </span>
      <Paragrafo linhas={[100, 84]} />
    </span>
  ),
  incisos: () => (
    <span className="grid grid-cols-2 gap-x-3 gap-y-1">
      {ROMANOS.map((r) => (
        <span key={r} className="flex items-center gap-1.5">
          <span
            className={`w-5 shrink-0 font-mono text-2xs font-bold ${INDISPENSAVEIS.has(r) ? "text-doc-etp" : "text-text-muted"}`}
          >
            {r}
          </span>
          <Linha largura={INDISPENSAVEIS.has(r) ? 90 : 70} forte={INDISPENSAVEIS.has(r)} />
        </span>
      ))}
    </span>
  ),
  matriz: () => (
    <span className="flex gap-2">
      <span className="text-2xs text-text-muted [writing-mode:vertical-rl] rotate-180">Probabilidade</span>
      <span className="flex flex-1 flex-col gap-1">
        <span className="grid grid-cols-3 gap-1">
          {[40, 70, 100, 15, 40, 70, 5, 15, 40].map((nivel, i) => (
            <span
              key={i}
              className={`aspect-[3/2] rounded-xs ${
                nivel === 100
                  ? "bg-doc-mapa"
                  : nivel === 70
                    ? "bg-doc-mapa/70"
                    : nivel === 40
                      ? "bg-doc-mapa/40"
                      : nivel === 15
                        ? "bg-doc-mapa/15"
                        : "bg-doc-mapa/5"
              }`}
            />
          ))}
        </span>
        <span className="text-center text-2xs text-text-muted">Impacto</span>
        <Paragrafo linhas={[100, 76]} />
      </span>
    </span>
  ),
  alineas: () => (
    <span className="flex flex-col gap-1">
      {"abcdefghij".split("").map((letra, i) => (
        <span key={letra} className="flex items-center gap-1.5">
          <span className="w-3 font-mono text-2xs font-bold text-doc-tr">{letra})</span>
          <Linha largura={[88, 72, 94, 66, 80, 90, 70, 84, 76, 60][i]} />
        </span>
      ))}
    </span>
  ),
  anexos: () => (
    <span className="flex flex-col gap-2">
      <Paragrafo linhas={[100, 92, 96, 70]} />
      <Paragrafo linhas={[94, 88]} />
      {["Anexo I · Termo de Referência", "Anexo II · Minuta de Contrato"].map((anexo) => (
        <span key={anexo} className="rounded-xs border border-doc-edital/30 bg-doc-edital-bg px-1.5 py-1 text-2xs font-semibold text-doc-edital">
          {anexo}
        </span>
      ))}
    </span>
  ),
  clausulas: () => (
    <span className="flex flex-col gap-1.5">
      {["Primeira · Do Objeto", "Segunda · Da Vigência", "Terceira · Do Preço", "Quarta · Da Matriz de Riscos"].map((c) => (
        <span key={c} className="flex flex-col gap-1">
          <span className="text-2xs font-bold text-doc-contrato uppercase">Cláusula {c}</span>
          <Paragrafo linhas={[100, 82]} />
        </span>
      ))}
    </span>
  ),
  aviso: () => (
    <span className="flex flex-col gap-2">
      <span className="rounded-xs bg-doc-edital-bg px-2 py-1.5 text-2xs font-semibold text-doc-edital">
        Dispensa com disputa · propostas por no mínimo 3 dias úteis
      </span>
      <Paragrafo linhas={[100, 94, 90, 72]} />
      <Paragrafo linhas={[96, 88, 64]} />
      <Paragrafo linhas={[92, 80]} />
    </span>
  ),
}

/**
 * A folha impressa, no padrão de todo arquivo que o GeraDocs gera (§125):
 * timbre da entidade, tipo, número do processo, título e objeto, o miolo de quem
 * a usa, e a identificação do GeraDocs: marca d'água ao centro, tarja na margem
 * direita e carimbo com QR Code no pé. Decorativa: o nome vem na legenda.
 */
function FolhaPadrao({ rotulo, chip, titulo, children }: { rotulo: string; chip: string; titulo: string; children: ReactNode }) {
  return (
    <div
      aria-hidden
      className="relative flex aspect-[210/297] w-full flex-col overflow-hidden rounded-xs border border-border bg-surface py-[8%] pr-[12%] pl-[8%] select-none"
    >
      <Image src={marca} alt="" width={160} height={160} className="absolute top-1/2 left-1/2 w-1/2 -translate-1/2 opacity-5" />

      {/* Tarja na margem direita, em todas as folhas. */}
      <span className="absolute inset-y-0 right-0 flex w-[7%] flex-col items-center border-l border-border-soft bg-ice">
        <span className="h-1/4 w-full bg-marca-azul" />
        <span className="h-[4%] w-full bg-marca-amarelo" />
        <span className="h-[4%] w-full bg-marca-verde" />
        <span className="mt-2 text-2xs font-semibold whitespace-nowrap text-text-muted [writing-mode:vertical-rl]">
          {documentos.tarja}
        </span>
      </span>

      {/* Timbre da entidade. */}
      <span className="relative flex items-center gap-2 border-b border-border pb-2">
        <span className="size-5 shrink-0 rounded-full border border-text-faint" />
        <span className="flex flex-1 flex-col gap-1">
          <span className="text-2xs font-bold tracking-caps text-text-3 uppercase">{documentos.timbre}</span>
          <Linha largura={60} />
        </span>
      </span>

      <span className="relative mt-3 flex items-center justify-between gap-2">
        <span className={`rounded-xs px-1.5 py-0.5 font-mono text-2xs font-bold ${chip}`}>{rotulo}</span>
        <span className="font-mono text-2xs text-text-muted">{poucosCliques.exemplo.processo}</span>
      </span>
      <span className="relative mt-1.5 text-xs leading-tight font-extrabold text-text-1 uppercase">{titulo}</span>
      <span className="relative mt-2 rounded-xs bg-border-soft px-1.5 py-1 text-2xs text-text-2">
        <b>OBJETO:</b> {poucosCliques.exemplo.objeto}
      </span>

      <span className="relative mt-3 flex-1">{children}</span>

      {/* Carimbo com o código de verificação e o QR Code. */}
      <span className="relative mt-2 flex items-center gap-2 rounded-xs border border-border bg-surface p-1.5">
        <span className="grid size-6 shrink-0 grid-cols-4 gap-px">
          {Array.from({ length: 16 }, (_, i) => (
            <span key={i} className={[1, 2, 6, 9, 11, 12].includes(i) ? "bg-surface" : "bg-navy"} />
          ))}
        </span>
        <span className="flex flex-col">
          <span className="text-2xs font-semibold text-text-2">Elaborado com GeraDocs</span>
          <span className="font-mono text-2xs text-text-muted">Código de verificação</span>
        </span>
      </span>
    </div>
  )
}

/** Um dos sete tipos de documento, com o miolo do tipo. */
export function Folha({ documento }: { documento: DocumentoDaVitrine }) {
  return (
    <FolhaPadrao rotulo={documento.tipo} chip={documento.chip} titulo={documento.titulo}>
      {MIOLOS[documento.miolo]()}
    </FolhaPadrao>
  )
}

/** Os documentos que a juntada reúne, na ordem dos autos, com a folha em que cada um começa. */
const SUMARIO_DA_JUNTADA = [
  ["Cotação", 1],
  ["ETP", 4],
  ["Mapa", 11],
  ["TR", 13],
  ["Edital", 22],
  ["Contrato", 31],
] as const

/**
 * O que a plataforma gera além dos sete tipos (§125), no mesmo padrão de folha:
 * a juntada, com o sumário dos documentos reunidos, e a errata, com as colunas
 * Onde se lê / Leia-se.
 */
export function FolhaExtra({ extra }: { extra: ExtraDaVitrine }) {
  if (extra.id === "juntada") {
    return (
      <FolhaPadrao rotulo="Juntada" chip="bg-tint-royal-bg text-royal" titulo={extra.titulo}>
        <span className="flex flex-col gap-1.5">
          {SUMARIO_DA_JUNTADA.map(([tipo, pagina]) => (
            <span key={tipo} className="flex items-center gap-1.5">
              <span className={`w-12 shrink-0 rounded-xs px-1 py-0.5 text-center font-mono text-2xs font-bold ${CATALOGO[tipo].chip}`}>
                {tipo}
              </span>
              <span className="flex-1 truncate text-2xs text-text-2">{CATALOGO[tipo].titulo}</span>
              <span className="font-mono text-2xs text-text-muted">fl. {pagina}</span>
            </span>
          ))}
        </span>
      </FolhaPadrao>
    )
  }
  return (
    <FolhaPadrao rotulo="Errata" chip="bg-tint-warning-bg text-tint-warning-fg" titulo={extra.titulo}>
      <span className="grid grid-cols-2 gap-2 text-2xs font-bold text-text-3 uppercase">
        <span>Onde se lê</span>
        <span>Leia-se</span>
      </span>
      {[0, 1, 2].map((i) => (
        <span key={i} className="mt-2 grid grid-cols-2 gap-2 border-t border-border-soft pt-2">
          <span className="flex flex-col gap-1">
            <span className="block h-1 w-full rounded-full bg-tint-danger-border-strong" />
            <span className="block h-1 w-3/4 rounded-full bg-tint-danger-border-strong" />
          </span>
          <span className="flex flex-col gap-1">
            <span className="block h-1 w-full rounded-full bg-tint-success-border" />
            <span className="block h-1 w-2/3 rounded-full bg-tint-success-border" />
          </span>
        </span>
      ))}
      <span className="mt-3 block rounded-xs bg-border-soft px-1.5 py-1 text-2xs text-text-2">
        <b>Retificação:</b> erro material, versão 2
      </span>
    </FolhaPadrao>
  )
}
