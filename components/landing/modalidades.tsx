"use client"

import { useState } from "react"

import { Revelar } from "@/components/landing/revelar"
import { TituloDeSecao } from "@/components/landing/titulo-de-secao"
import { IconCheck, IconLock } from "@/components/ui/icons"
import { CONTEUDO } from "@/lib/landing/conteudo"
import {
  OPCAO_INICIAL,
  OPCOES_DE_MODALIDADE,
  papeisNaModalidade,
  type OpcaoDeModalidade,
  type PapelNaModalidade,
} from "@/lib/landing/documentos"

const ESTILO: Record<PapelNaModalidade, string> = {
  obrigatorio: "border-royal bg-royal text-on-dark",
  recomendado: "border-tint-royal-border bg-tint-royal-bg text-text-1",
  opcional: "border-dashed border-border bg-surface text-text-2",
  fora: "border-border-soft bg-border-soft text-text-muted line-through",
}

/**
 * Seletor de modalidade (§125): o visitante escolhe a forma de contratar e vê
 * os documentos que o processo recebe. A regra é a do aplicativo (`regraDe`),
 * lida por `papeisNaModalidade`. Sem JavaScript, mostra o pregão.
 */
export function Modalidades() {
  const { modalidades } = CONTEUDO
  const [escolhida, setEscolhida] = useState<OpcaoDeModalidade>(OPCAO_INICIAL)
  const [forma] = escolhida.formas
  const papeis = forma ? papeisNaModalidade(forma.modalidade, forma.forma) : []

  return (
    <section id={modalidades.id} className="bg-surface py-16 lg:py-28">
      <div className="mx-auto max-w-landing px-4 sm:px-6 lg:px-10 xl:px-14">
        <TituloDeSecao rotulo={modalidades.rotulo} titulo={modalidades.titulo} texto={modalidades.texto} />

        <Revelar className="mt-10 rounded-card border border-border bg-ice p-4 sm:p-6">
          <div role="group" aria-label="Forma de contratação" className="flex flex-wrap gap-2">
            {OPCOES_DE_MODALIDADE.map((opcao) => {
              const ativa = opcao.id === escolhida.id
              return (
                <button
                  key={opcao.id}
                  type="button"
                  aria-pressed={ativa}
                  onClick={() => setEscolhida(opcao)}
                  className={`min-h-10 cursor-pointer rounded-full border px-4 py-2 text-md leading-tight font-semibold text-balance transition-colors duration-150 ${
                    ativa ? "border-navy bg-navy text-on-dark" : "border-border bg-surface text-text-2 hover:border-royal hover:text-royal"
                  }`}
                >
                  {opcao.rotulo}
                </button>
              )
            })}
          </div>

          <ol
            aria-live="polite"
            aria-label={`Documentos do processo: ${escolhida.rotulo}`}
            className="m-0 mt-6 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-4"
          >
            {papeis.map((doc, indice) => (
              // A chave leva o papel: o cartão que muda de papel entra de novo, animado; o que não muda fica parado.
              <li
                key={`${doc.tipo}-${doc.papel}`}
                className={`flex animate-landing-entrada items-center gap-3 rounded-md border px-4 py-4 ${ESTILO[doc.papel]}`}
                style={{ animationDelay: `${indice * 40}ms` }}
              >
                <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden>
                  {doc.papel === "obrigatorio" && <IconLock size={14} />}
                  {doc.papel === "recomendado" && <IconCheck size={14} strokeWidth={3} />}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="truncate text-md font-semibold">{doc.titulo}</span>
                  <span className="text-sm">{modalidades.legenda[doc.papel]}</span>
                </span>
              </li>
            ))}
          </ol>
          <p className="m-0 mt-5 text-md text-pretty text-text-3">{modalidades.troca}</p>
        </Revelar>
      </div>
    </section>
  )
}
