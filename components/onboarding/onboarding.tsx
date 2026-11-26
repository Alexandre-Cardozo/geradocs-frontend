"use client"

import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"

import govproLogo from "@/public/govpro-logo-white.svg"

import { GovPri, type AcaoDaPri, type Expressao } from "@/components/mascotes/mascotes"
import { BalaoDaPri, useFalaDaPri, vozDisponivel } from "@/components/onboarding/balao-da-pri"
import { OpcoesMultiplas, OpcoesUnicas } from "@/components/onboarding/opcoes"
import { FormField, Input, ValidationMsg } from "@/components/ui"
import {
  IconArrowRight,
  IconCheck,
  IconChevronLeft,
  IconMail,
  IconMessageCircle,
  IconShield,
  IconVolume,
  IconVolumeX,
  IconX,
} from "@/components/ui/icons"
import { useEnviarLead, useMunicipiosDaUf } from "@/lib/api/hooks"
import { CONTEUDO, EMAIL_CONTATO, EMAIL_DOS_LEADS, WHATSAPP_GOVPRO } from "@/lib/landing/conteudo"
import {
  ANALISE,
  RESPOSTAS_VAZIAS,
  corpoDoEmailReserva,
  duracaoDaAnalise,
  errosDoContato,
  linhasDoResumo,
  mascararTelefone,
  exemploDoNomeDoOrgao,
  origemDe,
  pedeMunicipio,
  type ErrosDoContato,
  type Respostas,
} from "@/lib/onboarding/respostas"
import {
  DORES,
  EQUIPES,
  ETAPAS,
  FASES,
  ORGAOS,
  PAPEIS,
  PRAZOS,
  ROTINAS,
  UFS,
  UNIDADES,
  VOLUMES,
  faseDa,
  perfilDoPapel,
  type Etapa,
} from "@/lib/onboarding/roteiro"

/** Tempo para a pessoa ver a opção marcada antes de a etapa avançar. */
const AVANCO_MS = 280
const CHAVE_DA_VOZ = "govpri-voz"

type Cena = { fala: string; expressao: Expressao; acao: AcaoDaPri }

/** O que a Pri diz e faz em cada etapa. */
function cenaDa(etapa: Etapa, r: Respostas, falhou: boolean): Cena {
  switch (etapa) {
    case "inicio":
      return { fala: "Oi, eu sou a Pri, da GovPro! Vou te mostrar como o GeraDocs ajuda o seu órgão.", expressao: "alegre", acao: "acenar" }
    case "orgao":
      return { fala: "Pra começar, me conta onde você trabalha.", expressao: "sorridente", acao: "ociosa" }
    case "local":
      return { fala: "Cada município tem a sua realidade. Onde fica o seu?", expressao: "sorridente", acao: "ociosa" }
    case "papel":
      return { fala: "Cada pessoa vive a contratação de um jeito. E você?", expressao: "pensativo", acao: "ideia" }
    case "valor":
      return { fala: "Já pensei em quem faz o seu trabalho. Deixa eu te mostrar.", expressao: "animado", acao: "apresentar" }
    case "equipe":
      return { fala: "Agora, o tamanho da operação.", expressao: "sorridente", acao: "ociosa" }
    case "volume":
      return { fala: "E quantas contratações passam por aí?", expressao: "olhando-para-cima", acao: "ociosa" }
    case "unidades":
      return { fala: "Quantas secretarias ou unidades pedem compras?", expressao: "pensativo", acao: "ociosa" }
    case "rotina":
      return { fala: "Me conta como os documentos nascem hoje. Pode marcar mais de uma.", expressao: "sorridente", acao: "ociosa" }
    case "dores":
      return { fala: "E o que mais pesa? Também vale marcar mais de uma.", expressao: "preocupado", acao: "ociosa" }
    case "prazo":
      return { fala: "Quase lá! Quando faria sentido começar?", expressao: "animado", acao: "ociosa" }
    case "contato":
      return { fala: "Por último, como a equipe da GovPro fala com você?", expressao: "sorridente", acao: "tablet" }
    case "analisando":
      return falhou
        ? { fala: "Não consegui enviar agora. Vamos tentar de novo?", expressao: "preocupado", acao: "ociosa" }
        : { fala: "Estou organizando suas respostas para a equipe.", expressao: "pensativo", acao: "notebook" }
    case "enviado": {
      const nome = r.nome.trim().split(/\s+/)[0]
      return { fala: `Pronto${nome ? `, ${nome}` : ""}! Já avisei a equipe da GovPro.`, expressao: "alegre", acao: "acenar" }
    }
  }
}

/**
 * O onboarding da GovPri (§130), no formato de perguntas rápidas: a Pri fala no
 * alto, num balão escrito aos poucos (e em voz alta, se a pessoa quiser), e as
 * perguntas ficam num cartão branco com voltar e o progresso em quatro fases.
 * Escolher uma opção já avança. No fim, o lead vai para a GovPro (ADR-082 do
 * back-end); se o envio falhar, o mesmo conteúdo sai num e-mail pronto.
 */
export function Onboarding() {
  const parametros = useSearchParams()
  const origem = origemDe(parametros.get("origem"))
  const [indice, setIndice] = useState(0)
  const [respostas, setRespostas] = useState<Respostas>(RESPOSTAS_VAZIAS)
  const [erros, setErros] = useState<ErrosDoContato>({})
  const [falha, setFalha] = useState<string | null>(null)
  const [tentativa, setTentativa] = useState(0)
  const [comVoz, setComVoz] = useState(false)
  const [podeFalar, setPodeFalar] = useState(false)
  const [lgpdAberto, setLgpdAberto] = useState(false)
  const titulo = useRef<HTMLHeadingElement>(null)
  const primeiraEtapa = useRef(true)
  const enviar = useEnviarLead()
  const idDoTitulo = useId()

  const etapa = ETAPAS[indice] ?? "inicio"
  const cena = cenaDa(etapa, respostas, falha !== null)
  const fala = useFalaDaPri(cena.fala, comVoz)

  // A voz é uma escolha da pessoa e vale para as próximas visitas; só existe se o navegador falar português.
  useEffect(() => {
    const pronto = window.setTimeout(() => {
      setPodeFalar(vozDisponivel())
      try {
        setComVoz(window.localStorage.getItem(CHAVE_DA_VOZ) === "sim")
      } catch {
        /* armazenamento bloqueado: começa sem voz */
      }
    }, 0)
    return () => window.clearTimeout(pronto)
  }, [])

  // A cada etapa o foco vai para a pergunta: quem usa leitor de tela ouve onde está.
  useEffect(() => {
    if (primeiraEtapa.current) {
      primeiraEtapa.current = false
      return
    }
    titulo.current?.focus()
  }, [indice])

  const responder = (mudanca: Partial<Respostas>) => setRespostas((r) => ({ ...r, ...mudanca }))
  const avancar = () => setIndice((i) => Math.min(i + 1, ETAPAS.length - 1))
  const voltar = () => setIndice((i) => Math.max(i - 1, 0))
  const escolherEAvancar = (mudanca: Partial<Respostas>) => {
    responder(mudanca)
    window.setTimeout(avancar, AVANCO_MS)
  }

  const alternarVoz = () => {
    const ligar = !comVoz
    setComVoz(ligar)
    if (!ligar) window.speechSynthesis?.cancel()
    try {
      window.localStorage.setItem(CHAVE_DA_VOZ, ligar ? "sim" : "nao")
    } catch {
      /* sem armazenamento, vale só nesta visita */
    }
  }

  // A análise: as linhas do resumo acendem uma a uma enquanto o lead é enviado.
  const [linhasAcesas, setLinhasAcesas] = useState(0)
  const resumo = useMemo(() => linhasDoResumo(respostas), [respostas])
  const { mutateAsync } = enviar
  useEffect(() => {
    if (etapa !== "analisando") return
    let ativo = true
    const inicio = window.setTimeout(() => {
      setFalha(null)
      setLinhasAcesas(0)
    }, 0)
    // Mesmo com o servidor respondendo na hora, a tela fica o bastante para ler o resumo inteiro.
    let relogio: number | undefined
    const acender = window.setTimeout(() => {
      setLinhasAcesas(1)
      relogio = window.setInterval(() => setLinhasAcesas((n) => n + 1), ANALISE.porLinhaMs)
    }, ANALISE.entradaMs)
    Promise.all([
      mutateAsync({ respostas, origem }),
      new Promise((resolver) => window.setTimeout(resolver, duracaoDaAnalise(resumo.length))),
    ])
      .then(() => {
        if (ativo) setIndice(ETAPAS.indexOf("enviado"))
      })
      .catch((erro: unknown) => {
        if (ativo) setFalha(erro instanceof Error ? erro.message : "Não foi possível enviar agora.")
      })
    return () => {
      ativo = false
      window.clearTimeout(inicio)
      window.clearTimeout(acender)
      window.clearInterval(relogio)
    }
    // `respostas` e `origem` não mudam durante a análise; `tentativa` refaz o envio.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etapa, tentativa, mutateAsync])

  const fase = faseDa(etapa)
  const podeVoltar = indice > 0 && etapa !== "analisando" && etapa !== "enviado"

  return (
    <div className="flex min-h-svh flex-col bg-navy">
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col">
        <header className="on-dark flex items-center justify-between gap-3 px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)]">
          <Link href="/" aria-label="Página da GovPro" className="flex">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={govproLogo.src} alt="GovPro" width={112} height={28} className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-2">
            {podeFalar && (
              <button
                type="button"
                onClick={alternarVoz}
                aria-pressed={comVoz}
                aria-label={comVoz ? "Desligar a voz da Pri" : "Ouvir a Pri"}
                title={comVoz ? "Desligar a voz da Pri" : "Ouvir a Pri"}
                className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-on-dark-border bg-on-dark-fill text-on-dark hover:bg-on-dark-fill-hover"
              >
                {comVoz ? <IconVolume size={16} /> : <IconVolumeX size={16} />}
              </button>
            )}
            <button
              type="button"
              onClick={() => setLgpdAberto(true)}
              className="flex h-9 cursor-pointer items-center gap-2 rounded-full border border-on-dark-border bg-on-dark-fill px-3 text-sm font-semibold text-on-dark hover:bg-on-dark-fill-hover"
            >
              <IconShield size={15} />
              LGPD
            </button>
          </div>
        </header>

        {/*
          A Pri e o balão. A faixa tem altura fixa: não pula de uma pergunta para outra
          quando a fala tem mais ou menos linhas. O cartão de baixo sobe um pouco sobre
          ela, como quem está atrás do balcão.
        */}
        <div className="on-dark flex h-46 shrink-0 items-end gap-3 px-4 pt-4 sm:h-52">
          <GovPri
            expressao={cena.expressao}
            acao={cena.acao}
            manter={etapa === "enviado" || etapa === "inicio"}
            falando={fala.falando}
            className="-mb-5 aspect-[480/496] h-30 shrink-0 min-[360px]:h-38 sm:h-44"
          />
          <div className="mb-8 flex min-w-0 flex-1">
            <BalaoDaPri texto={cena.fala} visivel={fala.visivel} />
          </div>
        </div>

        <main className="relative z-10 flex flex-1 flex-col rounded-t-3xl bg-surface px-5 pt-5 sm:mb-8 sm:rounded-b-3xl pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] text-text-1">
          {(podeVoltar || fase !== null) && (
            <div className="mb-5 flex h-10 items-center justify-between">
              {podeVoltar ? (
                <button
                  type="button"
                  onClick={voltar}
                  aria-label="Voltar para a pergunta anterior"
                  className="flex size-10 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-text-1 hover:bg-ice"
                >
                  <IconChevronLeft size={18} />
                </button>
              ) : (
                <span />
              )}
              {fase !== null && <Progresso fase={fase} />}
            </div>
          )}

          <div key={etapa} className="flex flex-1 animate-landing-entrada flex-col">
            {etapa === "inicio" && (
              <Etapa
                titulo={<>Descubra como o GeraDocs entra na <Destaque>rotina do seu órgão</Destaque></>}
                tituloRef={titulo}
                idDoTitulo={idDoTitulo}
                rodape={<Botao onClick={avancar}>Começar</Botao>}
              >
                <ol className="m-0 mt-6 flex list-none flex-col gap-4 p-0">
                  {[
                    "Responda a perguntas rápidas",
                    "Veja o que muda para quem tem o seu papel",
                    "A equipe da GovPro entra em contato",
                  ].map((texto, i) => (
                    <li key={texto} className="flex items-center gap-4">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-royal font-display font-bold text-on-dark">
                        {i + 1}
                      </span>
                      <span className="text-md font-semibold text-text-1">{texto}</span>
                    </li>
                  ))}
                </ol>
                <p className="m-0 mt-8 border-t border-border-soft pt-5 text-center text-sm text-text-3">
                  Seus dados servem só para a GovPro falar com você sobre o GeraDocs.
                </p>
              </Etapa>
            )}

            {etapa === "orgao" && (
              <Etapa titulo={<>Onde você <Destaque>trabalha</Destaque>?</>} tituloRef={titulo} idDoTitulo={idDoTitulo}>
                <OpcoesUnicas
                  opcoes={ORGAOS}
                  valor={respostas.orgao}
                  rotuladoPor={idDoTitulo}
                  aoEscolher={(orgao) => escolherEAvancar({ orgao })}
                />
              </Etapa>
            )}

            {etapa === "local" && (
              <EtapaDoLocal
                respostas={respostas}
                responder={responder}
                avancar={avancar}
                tituloRef={titulo}
                idDoTitulo={idDoTitulo}
              />
            )}

            {etapa === "papel" && (
              <Etapa titulo={<>Qual é o seu <Destaque>papel</Destaque> nas contratações?</>} tituloRef={titulo} idDoTitulo={idDoTitulo}>
                <OpcoesUnicas opcoes={PAPEIS} valor={respostas.papel} rotuladoPor={idDoTitulo} aoEscolher={(papel) => escolherEAvancar({ papel })} />
              </Etapa>
            )}

            {etapa === "valor" && respostas.papel && (
              <EtapaDoValor papel={respostas.papel} avancar={avancar} tituloRef={titulo} idDoTitulo={idDoTitulo} />
            )}

            {etapa === "equipe" && (
              <Etapa titulo={<>Quantas pessoas trabalham com <Destaque>contratações</Destaque>?</>} tituloRef={titulo} idDoTitulo={idDoTitulo}>
                <OpcoesUnicas opcoes={EQUIPES} valor={respostas.equipe} rotuladoPor={idDoTitulo} aoEscolher={(equipe) => escolherEAvancar({ equipe })} />
              </Etapa>
            )}

            {etapa === "volume" && (
              <Etapa titulo={<>Quantas contratações o órgão faz <Destaque>por ano</Destaque>?</>} tituloRef={titulo} idDoTitulo={idDoTitulo}>
                <OpcoesUnicas opcoes={VOLUMES} valor={respostas.volume} rotuladoPor={idDoTitulo} aoEscolher={(volume) => escolherEAvancar({ volume })} />
              </Etapa>
            )}

            {etapa === "unidades" && (
              <Etapa
                titulo={<>Quantas <Destaque>secretarias ou unidades</Destaque> pedem compras?</>}
                tituloRef={titulo}
                idDoTitulo={idDoTitulo}
              >
                <OpcoesUnicas opcoes={UNIDADES} valor={respostas.unidades} rotuladoPor={idDoTitulo} aoEscolher={(unidades) => escolherEAvancar({ unidades })} />
              </Etapa>
            )}

            {etapa === "rotina" && (
              <Etapa
                titulo={<>Como os documentos são <Destaque>feitos hoje</Destaque>?</>}
                tituloRef={titulo}
                idDoTitulo={idDoTitulo}
                rodape={
                  <Botao onClick={avancar} desabilitado={!respostas.rotinas.length}>
                    Continuar
                  </Botao>
                }
              >
                <OpcoesMultiplas
                  opcoes={ROTINAS}
                  valores={respostas.rotinas}
                  rotuladoPor={idDoTitulo}
                  aoAlternar={(rotina) =>
                    responder({
                      rotinas: respostas.rotinas.includes(rotina)
                        ? respostas.rotinas.filter((x) => x !== rotina)
                        : [...respostas.rotinas, rotina],
                    })
                  }
                />
              </Etapa>
            )}

            {etapa === "dores" && (
              <Etapa
                titulo={<>O que mais <Destaque>pesa</Destaque> hoje?</>}
                tituloRef={titulo}
                idDoTitulo={idDoTitulo}
                rodape={<Botao onClick={avancar}>{respostas.dores.length ? "Continuar" : "Pular"}</Botao>}
              >
                <OpcoesMultiplas
                  opcoes={DORES}
                  valores={respostas.dores}
                  rotuladoPor={idDoTitulo}
                  aoAlternar={(dor) =>
                    responder({
                      dores: respostas.dores.includes(dor) ? respostas.dores.filter((d) => d !== dor) : [...respostas.dores, dor],
                    })
                  }
                />
              </Etapa>
            )}

            {etapa === "prazo" && (
              <Etapa titulo={<>Quando faria sentido <Destaque>começar</Destaque>?</>} tituloRef={titulo} idDoTitulo={idDoTitulo}>
                <OpcoesUnicas
                  opcoes={PRAZOS}
                  valor={respostas.prazo}
                  rotuladoPor={idDoTitulo}
                  aoEscolher={(prazo) => escolherEAvancar({ prazo })}
                />
              </Etapa>
            )}

            {etapa === "contato" && (
              <EtapaDoContato
                respostas={respostas}
                responder={responder}
                erros={erros}
                aoEnviar={() => {
                  const encontrados = errosDoContato(respostas)
                  setErros(encontrados)
                  if (Object.keys(encontrados).length === 0) avancar()
                  return encontrados
                }}
                tituloRef={titulo}
                idDoTitulo={idDoTitulo}
              />
            )}

            {etapa === "analisando" && (
              <EtapaDaAnalise
                resumo={resumo}
                acesas={linhasAcesas}
                falha={falha}
                respostas={respostas}
                tentarDeNovo={() => setTentativa((t) => t + 1)}
                tituloRef={titulo}
                idDoTitulo={idDoTitulo}
              />
            )}

            {etapa === "enviado" && <EtapaEnviada respostas={respostas} tituloRef={titulo} idDoTitulo={idDoTitulo} />}
          </div>
        </main>
      </div>

      {lgpdAberto && <AvisoDaLgpd aoFechar={() => setLgpdAberto(false)} />}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Peças da tela
// ---------------------------------------------------------------------------

function Destaque({ children }: { children: ReactNode }) {
  return <span className="text-royal">{children}</span>
}

/** As quatro fases do progresso: a atual alongada, as feitas cheias, as próximas vazias. */
function Progresso({ fase }: { fase: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Progresso do onboarding"
      aria-valuemin={1}
      aria-valuemax={FASES.length}
      aria-valuenow={fase + 1}
      aria-valuetext={`${FASES[fase]}, ${fase + 1} de ${FASES.length}`}
      className="flex items-center gap-1.5"
    >
      {FASES.map((nome, i) => (
        <span
          key={nome}
          className={`h-2.5 rounded-full transition-[width,background-color] duration-300 ease-landing ${
            i === fase ? "w-9 bg-royal" : i < fase ? "w-2.5 bg-royal" : "w-2.5 bg-border"
          }`}
        />
      ))}
    </div>
  )
}

function Etapa({
  titulo,
  tituloRef,
  idDoTitulo,
  children,
  rodape,
}: {
  titulo: ReactNode
  tituloRef: React.RefObject<HTMLHeadingElement | null>
  idDoTitulo: string
  children: ReactNode
  rodape?: ReactNode
}) {
  return (
    <>
      <h1
        ref={tituloRef}
        id={idDoTitulo}
        tabIndex={-1}
        className="m-0 font-display text-2xl leading-tight font-extrabold text-pretty text-text-1 outline-none"
      >
        {titulo}
      </h1>
      <div className="mt-5 flex-1">{children}</div>
      {rodape && <div className="sticky bottom-0 mt-6 bg-surface pt-2">{rodape}</div>}
    </>
  )
}

function Botao({
  children,
  onClick,
  tipo = "primario",
  desabilitado = false,
}: {
  children: ReactNode
  onClick: () => void
  tipo?: "primario" | "secundario"
  desabilitado?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={desabilitado}
      className={`flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-full text-md font-bold transition-colors duration-150 disabled:cursor-not-allowed disabled:bg-border disabled:text-text-3 ${
        tipo === "primario" ? "bg-navy text-on-dark hover:bg-petroleum" : "border border-border bg-surface text-text-1 hover:bg-ice"
      }`}
    >
      {children}
      {tipo === "primario" && <IconArrowRight size={16} />}
    </button>
  )
}

/** Tira acentos e caixa para a busca do município. */
const semAcento = (t: string) => t.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase()

function EtapaDoLocal({
  respostas,
  responder,
  avancar,
  tituloRef,
  idDoTitulo,
}: {
  respostas: Respostas
  responder: (m: Partial<Respostas>) => void
  avancar: () => void
  tituloRef: React.RefObject<HTMLHeadingElement | null>
  idDoTitulo: string
}) {
  const precisaMunicipio = pedeMunicipio(respostas.orgao)
  const municipios = useMunicipiosDaUf(precisaMunicipio ? respostas.uf : undefined)
  const [aberto, setAberto] = useState(false)
  const busca = semAcento(respostas.municipio ?? "").trim()
  const sugestoes =
    busca.length >= 2 && !respostas.codigoIbge
      ? (municipios.data ?? []).filter((m) => semAcento(m.nome).includes(busca)).slice(0, 6)
      : []
  const pronto = Boolean(respostas.uf) && (!precisaMunicipio || Boolean(respostas.municipio?.trim()))
  const idUf = useId()
  const idMunicipio = useId()
  const idLista = useId()

  return (
    <Etapa
      titulo={precisaMunicipio ? <>Em qual <Destaque>cidade</Destaque>?</> : <>Em qual <Destaque>estado</Destaque>?</>}
      tituloRef={tituloRef}
      idDoTitulo={idDoTitulo}
      rodape={
        <Botao onClick={avancar} desabilitado={!pronto}>
          Continuar
        </Botao>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Estado" htmlFor={idUf}>
          <select
            id={idUf}
            value={respostas.uf ?? ""}
            onChange={(e) => responder({ uf: e.target.value || undefined, municipio: "", codigoIbge: undefined })}
            className="h-12 w-full rounded-md border border-border bg-surface px-3 text-md text-text-1"
          >
            <option value="">Escolha o estado</option>
            {UFS.map((uf) => (
              <option key={uf.sigla} value={uf.sigla}>
                {uf.nome}
              </option>
            ))}
          </select>
        </FormField>

        {precisaMunicipio && respostas.uf && (
          <FormField
            label="Município"
            htmlFor={idMunicipio}
            hint={municipios.isError ? "Não carregamos a lista agora. Digite o nome do município." : undefined}
          >
            <div className="relative">
              <input
                id={idMunicipio}
                role="combobox"
                aria-expanded={aberto && sugestoes.length > 0}
                aria-controls={idLista}
                aria-autocomplete="list"
                autoComplete="off"
                value={respostas.municipio ?? ""}
                placeholder={municipios.isPending ? "Carregando os municípios..." : "Comece a digitar"}
                onFocus={() => setAberto(true)}
                onChange={(e) => {
                  setAberto(true)
                  responder({ municipio: e.target.value, codigoIbge: undefined })
                }}
                className="h-12 w-full rounded-md border border-border bg-surface px-3 text-md text-text-1"
              />
              {respostas.codigoIbge && (
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-success" aria-label="Município da lista do IBGE">
                  <IconCheck size={16} strokeWidth={3} />
                </span>
              )}
              {aberto && sugestoes.length > 0 && (
                <ul id={idLista} role="listbox" className="m-0 mt-1 list-none overflow-hidden rounded-card border border-border bg-surface p-0">
                  {sugestoes.map((m) => (
                    <li key={m.codigoIbge} role="option" aria-selected={false}>
                      <button
                        type="button"
                        onClick={() => {
                          responder({ municipio: m.nome, codigoIbge: m.codigoIbge })
                          setAberto(false)
                        }}
                        className="block w-full cursor-pointer border-0 bg-transparent px-3 py-2.5 text-left text-md text-text-1 hover:bg-ice"
                      >
                        {m.nome}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </FormField>
        )}
      </div>
    </Etapa>
  )
}

function EtapaDoValor({
  papel,
  avancar,
  tituloRef,
  idDoTitulo,
}: {
  papel: NonNullable<Respostas["papel"]>
  avancar: () => void
  tituloRef: React.RefObject<HTMLHeadingElement | null>
  idDoTitulo: string
}) {
  const perfil = CONTEUDO.perfis.itens[perfilDoPapel(papel)]!
  const [modalidades, fase] = [CONTEUDO.geradocs.numeros[1]!, CONTEUDO.geradocs.numeros[0]!]
  return (
    <Etapa
      titulo={<>Para quem é {perfil.rotulo.toLowerCase()}: <Destaque>{perfil.titulo}</Destaque></>}
      tituloRef={tituloRef}
      idDoTitulo={idDoTitulo}
      rodape={<Botao onClick={avancar}>Continuar</Botao>}
    >
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {perfil.lista.map((item) => (
          <li key={item} className="flex items-center gap-3 text-md font-semibold text-text-1">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-surface">
              <IconCheck size={13} strokeWidth={3.5} />
            </span>
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-6 grid grid-cols-2 gap-3">
        {[fase, modalidades].map((n) => (
          <div key={n.rotulo} className="rounded-card border border-border p-4">
            <p className="m-0 font-display text-2xl font-extrabold text-text-1">
              {n.valor}
              {n.sufixo}
            </p>
            <p className="m-0 mt-1 text-sm text-text-3">{n.rotulo}</p>
          </div>
        ))}
      </div>
    </Etapa>
  )
}

function EtapaDoContato({
  respostas,
  responder,
  erros,
  aoEnviar,
  tituloRef,
  idDoTitulo,
}: {
  respostas: Respostas
  responder: (m: Partial<Respostas>) => void
  erros: ErrosDoContato
  aoEnviar: () => ErrosDoContato
  tituloRef: React.RefObject<HTMLHeadingElement | null>
  idDoTitulo: string
}) {
  const ids = { nome: useId(), email: useId(), telefone: useId(), nomeDoOrgao: useId(), setor: useId(), consentimento: useId() }
  // Com erro, o foco vai ao primeiro campo que precisa de correção: no celular, o aviso pode estar fora da tela.
  const enviar = () => {
    const encontrados = aoEnviar()
    const primeiro = (["nome", "email", "telefone", "nomeDoOrgao", "consentimento"] as const).find((campo) => encontrados[campo])
    if (primeiro) document.getElementById(ids[primeiro])?.focus()
  }
  return (
    <Etapa
      titulo={<>Como podemos <Destaque>falar com você</Destaque>?</>}
      tituloRef={tituloRef}
      idDoTitulo={idDoTitulo}
      rodape={<Botao onClick={enviar}>Enviar</Botao>}
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          enviar()
        }}
        className="flex flex-col gap-4"
      >
        <FormField label="Seu nome" htmlFor={ids.nome}>
          <Input id={ids.nome} value={respostas.nome} autoComplete="name" placeholder="Ex.: Maria da Silva" onChange={(e) => responder({ nome: e.target.value })} />
          {erros.nome && <ValidationMsg type="error" msg={erros.nome} />}
        </FormField>
        <FormField label="E-mail" hint="De preferência, o institucional." htmlFor={ids.email}>
          <Input id={ids.email} type="email" inputMode="email" autoComplete="email" placeholder="nome@orgao.gov.br" value={respostas.email} onChange={(e) => responder({ email: e.target.value })} />
          {erros.email && <ValidationMsg type="error" msg={erros.email} />}
        </FormField>
        <FormField label="WhatsApp ou telefone" htmlFor={ids.telefone}>
          <Input
            id={ids.telefone}
            inputMode="numeric"
            autoComplete="tel"
            placeholder="(00) 00000-0000"
            value={respostas.telefone}
            onChange={(e) => responder({ telefone: mascararTelefone(e.target.value) })}
          />
          {erros.telefone && <ValidationMsg type="error" msg={erros.telefone} />}
        </FormField>
        <FormField label="Nome do órgão" htmlFor={ids.nomeDoOrgao}>
          <Input id={ids.nomeDoOrgao} autoComplete="organization" placeholder={exemploDoNomeDoOrgao(respostas)} value={respostas.nomeDoOrgao} onChange={(e) => responder({ nomeDoOrgao: e.target.value })} />
          {erros.nomeDoOrgao && <ValidationMsg type="error" msg={erros.nomeDoOrgao} />}
        </FormField>
        <FormField label="Secretaria ou setor (opcional)" htmlFor={ids.setor}>
          <Input id={ids.setor} placeholder="Ex.: Secretaria de Administração" value={respostas.setor} onChange={(e) => responder({ setor: e.target.value })} />
        </FormField>

        {/* Campo-armadilha: fora da tela e do teclado. Pessoas não o veem; robôs o preenchem. */}
        <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label>
            Site
            <input tabIndex={-1} autoComplete="off" value={respostas.armadilha} onChange={(e) => responder({ armadilha: e.target.value })} name="website" />
          </label>
        </div>

        <div>
          <label htmlFor={ids.consentimento} className="flex cursor-pointer items-start gap-3 text-sm text-text-2">
            <input
              id={ids.consentimento}
              type="checkbox"
              checked={respostas.consentimento}
              onChange={(e) => responder({ consentimento: e.target.checked })}
              className="mt-0.5 size-5 shrink-0 accent-royal"
            />
            Concordo que a GovPro use estes dados para falar comigo sobre o GeraDocs.
          </label>
          {erros.consentimento && <ValidationMsg type="error" msg={erros.consentimento} />}
        </div>
        <button type="submit" className="sr-only">
          Enviar
        </button>
      </form>
    </Etapa>
  )
}

function EtapaDaAnalise({
  resumo,
  acesas,
  falha,
  respostas,
  tentarDeNovo,
  tituloRef,
  idDoTitulo,
}: {
  resumo: string[]
  acesas: number
  falha: string | null
  respostas: Respostas
  tentarDeNovo: () => void
  tituloRef: React.RefObject<HTMLHeadingElement | null>
  idDoTitulo: string
}) {
  if (falha) {
    const assunto = encodeURIComponent("Quero conhecer o GeraDocs")
    const corpo = encodeURIComponent(corpoDoEmailReserva(respostas))
    return (
      <Etapa
        titulo={<>Não consegui <Destaque>enviar agora</Destaque></>}
        tituloRef={tituloRef}
        idDoTitulo={idDoTitulo}
        rodape={
          <div className="flex flex-col gap-2.5">
            <Botao onClick={tentarDeNovo}>Tentar de Novo</Botao>
            <a
              href={`mailto:${EMAIL_DOS_LEADS}?subject=${assunto}&body=${corpo}`}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-full border border-border text-md font-bold text-text-1 no-underline hover:bg-ice"
            >
              <IconMail size={16} />
              Enviar por E-mail
            </a>
          </div>
        }
      >
        <p className="m-0 text-md text-text-3" role="alert">
          {falha} Suas respostas continuam aqui: tente de novo ou mande tudo por e-mail, já escrito.
        </p>
      </Etapa>
    )
  }
  return (
    <Etapa titulo={<>Analisando suas <Destaque>respostas</Destaque></>} tituloRef={tituloRef} idDoTitulo={idDoTitulo}>
      <p className="m-0 text-md text-text-3">Entendi que você:</p>
      <ul className="m-0 mt-4 flex list-none flex-col gap-4 p-0" aria-live="polite">
        {resumo.map((linha, i) => (
          <li
            key={linha}
            className={`flex items-center gap-3 text-md font-semibold transition-opacity duration-300 ${i < acesas ? "opacity-100" : "opacity-0"}`}
          >
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-success text-surface">
              <IconCheck size={13} strokeWidth={3.5} />
            </span>
            {linha}
          </li>
        ))}
      </ul>
      <p className="m-0 mt-8 text-sm text-text-3">Preparando o envio para a equipe da GovPro...</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
        <span
          className="block h-full w-full origin-left animate-onboarding-barra rounded-full bg-royal"
          style={{ animationDuration: `${duracaoDaAnalise(resumo.length)}ms` }}
        />
      </div>
    </Etapa>
  )
}

function EtapaEnviada({
  respostas,
  tituloRef,
  idDoTitulo,
}: {
  respostas: Respostas
  tituloRef: React.RefObject<HTMLHeadingElement | null>
  idDoTitulo: string
}) {
  const mensagem = encodeURIComponent(
    `Olá! Sou ${respostas.nome.trim()}, de ${respostas.nomeDoOrgao.trim()}. Respondi ao onboarding da GovPri e quero conhecer o GeraDocs.`,
  )
  return (
    <Etapa
      titulo={<>Pedido <Destaque>enviado!</Destaque></>}
      tituloRef={tituloRef}
      idDoTitulo={idDoTitulo}
      rodape={
        <div className="flex flex-col gap-2.5">
          {WHATSAPP_GOVPRO && (
            <a
              href={`https://wa.me/${WHATSAPP_GOVPRO}?text=${mensagem}`}
              className="flex h-13 w-full items-center justify-center gap-2 rounded-full bg-success text-md font-bold text-on-dark no-underline"
            >
              <IconMessageCircle size={16} />
              Falar no WhatsApp
            </a>
          )}
          <Link
            href="/"
            className="flex h-13 w-full items-center justify-center rounded-full border border-border text-md font-bold text-text-1 no-underline hover:bg-ice"
          >
            Conhecer a GovPro
          </Link>
        </div>
      }
    >
      <p className="m-0 text-md text-text-3" role="status">
        A equipe da GovPro recebeu suas respostas e vai falar com você pelo e-mail{" "}
        <strong className="text-text-1">{respostas.email.trim()}</strong> ou pelo telefone informado.
      </p>
      <h2 className="m-0 mt-7 text-sm font-bold tracking-wide text-text-3 uppercase">Próximos Passos</h2>
      <ol className="m-0 mt-3 flex list-none flex-col gap-3 p-0">
        {[
          "A equipe da GovPro analisa as suas respostas",
          "Fala com você para combinar a demonstração",
          "Mostra o GeraDocs com o caso do seu órgão",
        ].map((passo, i) => (
          <li key={passo} className="flex items-center gap-3 text-md font-semibold text-text-1">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-tint-royal-bg font-display font-bold text-royal">
              {i + 1}
            </span>
            {passo}
          </li>
        ))}
      </ol>
    </Etapa>
  )
}

function AvisoDaLgpd({ aoFechar }: { aoFechar: () => void }) {
  const fechar = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    fechar.current?.focus()
    const aoTeclar = (e: KeyboardEvent) => {
      if (e.key === "Escape") aoFechar()
    }
    window.addEventListener("keydown", aoTeclar)
    return () => window.removeEventListener("keydown", aoTeclar)
  }, [aoFechar])
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy/60 p-4 sm:items-center" onClick={aoFechar}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-da-lgpd"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-card bg-surface p-6 text-text-1"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="titulo-da-lgpd" className="m-0 flex items-center gap-2 font-display text-xl font-bold">
            <span className="text-royal">
              <IconShield size={20} />
            </span>
            Seus Dados
          </h2>
          <button
            ref={fechar}
            type="button"
            onClick={aoFechar}
            aria-label="Fechar"
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-text-3 hover:bg-ice"
          >
            <IconX size={18} />
          </button>
        </div>
        <ul className="m-0 mt-4 flex list-disc flex-col gap-2 pl-5 text-md text-text-2">
          <li>Usamos suas respostas só para a GovPro falar com você sobre o GeraDocs.</li>
          <li>Elas ficam com a GovPro: não são vendidas nem repassadas.</li>
          <li>Seu IP não é guardado.</li>
          <li>
            Para pedir a exclusão ou tirar dúvidas, escreva para{" "}
            <a href={`mailto:${EMAIL_CONTATO}`} className="font-semibold text-royal">
              {EMAIL_CONTATO}
            </a>
            .
          </li>
        </ul>
      </div>
    </div>
  )
}
