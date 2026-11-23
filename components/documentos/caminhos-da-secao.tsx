"use client"

import { useContext, useEffect, useId, useRef, useState } from "react"

import { Button } from "@/components/ui"
import { IconChevronDown, IconChevronRight, IconFileText, IconInfo, IconSparkles } from "@/components/ui/icons"
import type { RascunhoEtpComFontes } from "@/lib/api/authoring-client"
import { IaTrabalhando } from "@/components/shared/ia-magica"
import { useEstadoDaIa } from "@/lib/api/hooks"
import { semLinhasEmBranco } from "@/lib/dominio/tabela"
import { ETAPAS_DA_REDACAO } from "@/lib/dominio/revelacao"
import { FONTES_PADRAO } from "@/lib/documentos/fontes-da-ia"
import { LIMITE_DO_TEXTO_PARA_A_IA, textoGrandeDemaisParaAIa } from "@/lib/documentos/orientacao"
import { formatContagemBR } from "@/lib/format"

import { CampoDeOrientacao, OrientacaoDaIaContexto } from "@/components/documentos/orientacao-da-ia"

/**
 * Um texto que a seção sabe escrever sem consultar a IA (§114): os dados do
 * processo, o texto da minuta, o texto que ficou do modelo anterior.
 *
 * @param rotulo o nome da origem no menu ("Dados do processo")
 * @param botao  o rótulo quando é a única origem ("Preencher com dados do processo")
 * @param dica   de onde vem o texto, dito na dica, depois de "Sem IA:"
 * @param modo   substituir o texto da seção, ou acrescentar ao fim dele
 * @param texto  o texto a escrever, montado na hora do clique
 */
export interface Preenchimento {
  chave: string
  rotulo: string
  botao: string
  dica: string
  modo: "substituir" | "acrescentar"
  texto: () => string
}

/** A origem "dados do processo" de um painel: rótulo e botão iguais em toda seção. */
export function dadosDoProcesso(dica: string, texto: () => string): Preenchimento {
  return {
    chave: "dados",
    rotulo: "Dados do processo",
    botao: "Preencher com dados do processo",
    dica,
    modo: "substituir",
    texto,
  }
}

/**
 * O bloco da IA e do preenchimento da seção.
 *
 * <p>A IA é facilitadora, nunca bloqueadora: sem modelo configurado o botão vem
 * desabilitado **com o motivo escrito antes do clique** (ADR-029), em vez de
 * devolver `503` e fazer o servidor descobrir por erro que o facilitador não
 * existe.
 *
 * <p><b>Tudo o que escreve na seção sem IA fica num lugar só</b> (§114): à
 * esquerda da barra, um botão quando há uma origem, ou "Preencher com" e um
 * menu quando há mais de uma. Nenhuma escrita pede confirmação: o rodapé
 * oferece "Desfazer", que devolve o texto de antes, salvo ou não.
 */
export function CaminhosDaSecao({
  gerando,
  onGerarComIa,
  texto,
  setTexto,
  preenchimentos = [],
}: {
  gerando: boolean
  onGerarComIa: () => void
  /** O texto da seção agora, para acrescentar ao fim e para o "Desfazer". */
  texto?: string
  /** Escreve na seção; sem ele, não há preenchimento a oferecer. */
  setTexto?: (texto: string) => void
  /** As origens que o painel conhece; o editor junta as dele (minuta, modelo anterior). */
  preenchimentos?: Preenchimento[]
}) {
  // O teto da entidade (ADR-064): com modelo configurado e sem teto, a IA
  // também não responde, e o motivo vem escrito antes do clique.
  const estado = useEstadoDaIa()
  // O que a IA lê *nesta* seção: o editor sabe qual está aberta. Fora dele, o
  // mínimo que vale em toda seção.
  const editor = useContext(OrientacaoDaIaContexto)
  const fontes = editor?.fontes ?? FONTES_PADRAO
  // O campo só existe no editor, que é quem guarda a orientação da seção
  // aberta; sem IA disponível, não há a quem orientar.
  const comOrientacao = estado === "disponivel" && editor !== null
  const semModelo = estado === "sem-modelo"
  const semTeto = estado === "sem-teto"
  const origens = setTexto ? [...preenchimentos, ...(editor?.preenchimentos ?? [])] : []
  // A minuta da AGU de uma seção chega a 36 mil caracteres, e a IA recebe até
  // 20 mil (ADR 121): o botão avisa antes, em vez de devolver "campos inválidos".
  const grandeDemais = textoGrandeDemaisParaAIa(texto)

  // Enquanto a resposta não chega, o botão fica desabilitado com o motivo. O
  // contrário (habilitar por otimismo) devolveria o clique que dá erro.
  const motivo =
    estado === "verificando"
      ? "Verificando a IA..."
      : semModelo
        ? "Nenhum modelo de IA configurado nesta instalação."
        : semTeto
          ? "A IA não está liberada para esta entidade. Fale com o administrador da plataforma."
          : grandeDemais
            ? `A IA lê seções de até ${formatContagemBR(LIMITE_DO_TEXTO_PARA_A_IA)} caracteres, e esta tem ${formatContagemBR(texto?.length ?? 0)}. Edite o texto à mão ou tire as alternativas da minuta que não se aplicam.`
            : null
  // De onde a IA tira o rascunho fica na dica do botão (§111): escrito no
  // cartão, repetia o que o próprio botão já diz.
  const dicaDoBotao = `Rascunho com base ${fontes}. Revise antes de salvar.`

  const preencher = (origem: Preenchimento) => {
    if (!setTexto) return
    const anterior = texto ?? ""
    const novo = origem.texto()
    const escrito =
      origem.modo === "acrescentar" && anterior.trim() !== "" ? semLinhasEmBranco(`${anterior}\n${novo}`) : novo
    setTexto(escrito)
    editor?.registrarEscrita?.({ anterior, escrito, rotulo: origem.rotulo })
  }

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl px-4 py-3.5 ${gerando ? "ia-aura" : "border border-border bg-ice"}`}
    >
      {/*
        Sem título nem frase de fontes (§111): o botão "Gerar com IA" já diz o
        que o cartão faz. O cartão só escreve algo quando a IA não pode
        responder, e aí o motivo vem antes do clique (guarda-corpo nº 7).
      */}
      {motivo && (
        <p id="motivo-da-ia" className="m-0 flex flex-wrap items-center gap-2 text-sm text-text-3">
          {(semModelo || semTeto) && (
            <span className="rounded-sm bg-border-soft px-1.5 py-0.5 text-2xs font-semibold text-slate-strong">
              Indisponível
            </span>
          )}
          {motivo}
        </p>
      )}
      {/*
        O bloco é um compositor (§113): a orientação ocupa a largura toda, e
        embaixo dela fica a barra de ações, alinhada às bordas do campo.

        "Gerar com IA" vem primeiro no código e fica à direita (ml-auto): é a
        ação principal, no fim da leitura, e o Tab vai do campo direto a ela.
        O preenchimento sem IA fica à esquerda (order-first).
      */}
      {comOrientacao && <CampoDeOrientacao />}
      <div className="flex flex-wrap items-center gap-2.5">
        <Button
          size="sm"
          variant="dark"
          icon={<IconSparkles size={13} />}
          disabled={estado !== "disponivel" || gerando || grandeDemais}
          // O guarda-corpo nº 7: botão desabilitado sem motivo anunciado é
          // motivo que só existe para quem enxerga a tela.
          ariaDescribedBy={motivo ? "motivo-da-ia" : undefined}
          title={motivo ? undefined : dicaDoBotao}
          className="ml-auto max-xs:w-full"
          onClick={onGerarComIa}
        >
          {gerando ? "Gerando com IA..." : "Gerar com IA"}
        </Button>
        {origens.length === 1 && (
          <Button
            size="sm"
            variant="secondary"
            icon={<IconFileText size={13} />}
            title={`Sem IA: ${origens[0]!.dica}`}
            className="order-first max-xs:w-full [&>svg]:shrink-0"
            onClick={() => preencher(origens[0]!)}
          >
            {origens[0]!.botao}
          </Button>
        )}
        {origens.length > 1 && <MenuDePreenchimento origens={origens} onEscolher={preencher} />}
      </div>
      {/* A IA trabalhando, nas cores da marca (§107): o lugar do antigo "aguarde". */}
      {gerando &&
        (editor?.escrevendo ? (
          <IaTrabalhando rotulo="Escrevendo a seção" moldura={false} />
        ) : (
          <IaTrabalhando etapas={ETAPAS_DA_REDACAO} anuncio="Gerando o rascunho da seção com IA." moldura={false} />
        ))}
      {!gerando && <RodapeDoBloco />}
    </div>
  )
}

/**
 * O menu "Preencher com" (§114), quando a seção tem mais de uma origem.
 *
 * <p>Menu de verdade: abre e fecha no botão, Esc fecha e devolve o foco, o
 * clique fora fecha, e as setas andam entre as opções. Cada opção diz na dica
 * de onde vem o texto e, quando acrescenta em vez de substituir, diz isso no
 * próprio nome.
 */
function MenuDePreenchimento({
  origens,
  onEscolher,
}: {
  origens: Preenchimento[]
  onEscolher: (origem: Preenchimento) => void
}) {
  const [aberto, setAberto] = useState(false)
  const raiz = useRef<HTMLDivElement>(null)
  const gatilho = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!aberto) return
    const fora = (e: MouseEvent) => {
      if (raiz.current && !raiz.current.contains(e.target as Node)) setAberto(false)
    }
    document.addEventListener("mousedown", fora)
    raiz.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus()
    return () => document.removeEventListener("mousedown", fora)
  }, [aberto])

  const teclado = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!aberto) return
    if (e.key === "Escape") {
      e.stopPropagation()
      setAberto(false)
      gatilho.current?.focus()
      return
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return
    e.preventDefault()
    const itens = Array.from(raiz.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])
    const atual = itens.indexOf(document.activeElement as HTMLButtonElement)
    const proximo = e.key === "ArrowDown" ? (atual + 1) % itens.length : (atual - 1 + itens.length) % itens.length
    itens[proximo]?.focus()
  }

  return (
    <div ref={raiz} className="relative order-first max-xs:w-full" onKeyDown={teclado}>
      <button
        ref={gatilho}
        type="button"
        aria-haspopup="menu"
        aria-expanded={aberto}
        aria-controls={menuId}
        onClick={() => setAberto((estava) => !estava)}
        className="inline-flex h-8 cursor-pointer items-center justify-center gap-1.75 rounded-md border border-border bg-surface px-3.5 font-body text-base font-semibold whitespace-nowrap text-text-3 transition-colors hover:bg-ice max-xs:w-full"
      >
        <IconFileText size={13} />
        Preencher com
        <IconChevronDown size={13} />
      </button>
      {aberto && (
        <div
          id={menuId}
          role="menu"
          aria-label="Preencher com"
          className="absolute bottom-full left-0 z-20 mb-1.5 flex min-w-72 flex-col rounded-md border border-border bg-surface py-1 max-xs:w-full"
        >
          {origens.map((origem) => (
            <button
              key={origem.chave}
              type="button"
              role="menuitem"
              title={`Sem IA: ${origem.dica}`}
              onClick={() => {
                setAberto(false)
                onEscolher(origem)
              }}
              className="flex cursor-pointer flex-col gap-0.5 border-0 bg-transparent px-3.5 py-2 text-left hover:bg-ice focus-visible:bg-ice"
            >
              {/* Duas linhas fixas: o nome da origem e o que ela faz com o texto da seção. */}
              <span className="text-base font-semibold text-text-2">{origem.rotulo}</span>
              <span className="text-xs text-text-muted">
                {origem.modo === "acrescentar" ? "Acrescenta ao fim do texto" : "Substitui o texto da seção"}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/**
 * O rodapé do bloco: o que acabou de acontecer e como voltar atrás (§114).
 *
 * <ul>
 *   <li>Logo depois de uma escrita automática (da IA, sem IA ou o rascunho da
 *       IA restaurado ao reabrir a seção), com o texto ainda como ela deixou:
 *       "Desfazer" devolve o texto de antes.</li>
 *   <li>Rascunho da IA já editado: "Descartar rascunho", que volta ao texto
 *       salvo e pede confirmação na própria linha.</li>
 * </ul>
 *
 * <p>Com rascunho da IA, a linha também mostra a base dele (§112).
 */
function RodapeDoBloco() {
  const editor = useContext(OrientacaoDaIaContexto)
  const desfazer = editor?.desfazer
  const rascunho = editor?.rascunhoDaIa
  if (rascunho) {
    return (
      <BaseDoRascunho
        fontes={rascunho.fontes}
        acao={
          desfazer ? (
            <AcaoDoRodape rotulo="Desfazer" onClick={desfazer.onDesfazer} />
          ) : (
            <Descarte pedeConfirmacao={rascunho.pedeConfirmacao} onDescartar={rascunho.onDescartar} />
          )
        }
      />
    )
  }
  if (desfazer) {
    return (
      <LinhaDoRodape>
        <span className="flex items-center gap-1.5">
          <IconInfo size={13} />
          <span>
            <span className="font-semibold text-text-3">Preenchido com:</span> {desfazer.rotulo}
          </span>
        </span>
        <AcaoDoRodape rotulo="Desfazer" onClick={desfazer.onDesfazer} />
      </LinhaDoRodape>
    )
  }
  return null
}

function LinhaDoRodape({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border-soft pt-2.5 text-xs text-text-muted">
      {children}
    </div>
  )
}

/** A ação à direita do rodapé, com o texto alinhado à borda direita do campo. */
function AcaoDoRodape({ rotulo, onClick }: { rotulo: string; onClick: () => void }) {
  return (
    <span className="-mr-3.5 ml-auto">
      <Button size="sm" variant="ghost" onClick={onClick}>
        {rotulo}
      </Button>
    </span>
  )
}

/** "Descartar rascunho", com a confirmação na própria linha quando há o que perder (§114). */
function Descarte({ pedeConfirmacao, onDescartar }: { pedeConfirmacao: boolean; onDescartar: () => void }) {
  const [confirmando, setConfirmando] = useState(false)
  if (confirmando) {
    return (
      <span className="-mr-3.5 ml-auto flex flex-wrap items-center gap-1.5">
        <span className="text-text-3">Voltar ao texto salvo?</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setConfirmando(false)
            onDescartar()
          }}
        >
          Descartar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setConfirmando(false)}>
          Manter
        </Button>
      </span>
    )
  }
  return (
    <AcaoDoRodape
      rotulo="Descartar rascunho"
      onClick={() => (pedeConfirmacao ? setConfirmando(true) : onDescartar())}
    />
  )
}

/** Plural simples para a linha de resumo. */
function contagem(n: number, singular: string, plural: string) {
  return `${n} ${n === 1 ? singular : plural}`
}

/**
 * A base do rascunho da IA, no rodapé do bloco (§112).
 *
 * <p>Era um cartão inteiro, "Revise o Rascunho da IA", aberto abaixo da seção.
 * Agora é uma linha recolhida, em tom neutro, que diz o que a IA recebeu e
 * quantas lacunas ficaram; "Ver detalhes" abre as listas, e a ação ao lado
 * (desfazer ou descartar) continua à mão.
 */
function BaseDoRascunho({ fontes, acao }: { fontes: RascunhoEtpComFontes; acao: React.ReactNode }) {
  const [aberta, setAberta] = useState(false)
  const detalhesId = useId()
  const partes = [
    contagem(fontes.evidence.length, "dado de origem", "dados de origem"),
    ...(fontes.missingFacts.length > 0 ? [contagem(fontes.missingFacts.length, "lacuna", "lacunas")] : []),
    ...(fontes.warnings.length > 0 ? [contagem(fontes.warnings.length, "fonte não integrada", "fontes não integradas")] : []),
  ]

  return (
    <div className="flex flex-col gap-2 border-t border-border-soft pt-2.5 text-xs text-text-muted">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="flex items-center gap-1.5">
          <IconInfo size={13} />
          <span>
            <span className="font-semibold text-text-3">Base do rascunho:</span> {partes.join(" · ")}
          </span>
        </span>
        <button
          type="button"
          aria-expanded={aberta}
          aria-controls={detalhesId}
          onClick={() => setAberta((estava) => !estava)}
          className="flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 font-semibold text-royal"
        >
          {aberta ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
          {aberta ? "Ocultar detalhes" : "Ver detalhes"}
        </button>
        {acao}
      </div>
      {aberta && (
        <div id={detalhesId} className="flex flex-col gap-2 text-text-3">
          <p className="m-0">O que a IA recebeu para escrever. É informativo: não comprova cada frase do rascunho.</p>
          {fontes.warnings.length > 0 && (
            <ListaDaBase titulo="Fontes não integradas" itens={fontes.warnings} />
          )}
          {fontes.missingFacts.length > 0 && <ListaDaBase titulo="Lacunas no DFD" itens={fontes.missingFacts} />}
          {fontes.evidence.length > 0 && (
            <ListaDaBase
              titulo="Dados de origem"
              itens={fontes.evidence.map((item) => `${item.source}: ${item.fact}`)}
            />
          )}
        </div>
      )}
    </div>
  )
}

function ListaDaBase({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <div>
      <div className="font-semibold text-text-2">{titulo}</div>
      <ul className="m-0 mt-0.5 list-disc pl-4">
        {itens.map((item, i) => (
          <li key={`${i}-${item}`}>{item}</li>
        ))}
      </ul>
    </div>
  )
}
