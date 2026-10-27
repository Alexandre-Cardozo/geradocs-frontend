"use client"

import { useState } from "react"

import { Button, Dropdown, FormField, Input, Textarea, ValidationMsg } from "@/components/ui"
import { ErrorState, InlineSpinner } from "@/components/shared/estados"
import { useDetalheDoModelo } from "@/lib/api/hooks"
import type { DadosDoModelo, DetalheDoModelo, MinutaDaAgu, ModeloDoOrgao } from "@/lib/api/modelos-client"
import { errosDoModelo, textosAlterados } from "@/lib/modelos/modelo"

/**
 * O formulário do modelo do órgão (§88): a minuta de base, o título, a
 * justificativa e o texto-padrão de cada seção, que começa com o da minuta.
 *
 * <p>Na versão seguinte de um modelo, a base não se troca: trocar de minuta é
 * outro modelo.
 */
export function EditorDeModelo({
  minutas,
  modelo,
  pendente,
  onPublicar,
  onCancelar,
}: {
  minutas: MinutaDaAgu[]
  /** O modelo do órgão de que sai a versão seguinte; ausente, é um modelo novo. */
  modelo?: ModeloDoOrgao
  pendente: boolean
  onPublicar: (base: string, dados: DadosDoModelo) => void
  onCancelar: () => void
}) {
  const [base, setBase] = useState<string | null>(modelo ? modelo.codigoDaBase : null)
  const detalhe = useDetalheDoModelo(modelo ? modelo.codigo : base)

  return (
    <div className="flex flex-col gap-4">
      {!modelo && (
        <FormField label="Minuta da AGU de Base" required>
          <Dropdown
            value={base ?? ""}
            onChange={(valor) => setBase(valor || null)}
            options={[
              { value: "", label: "Escolha a minuta" },
              ...minutas.map((minuta) => ({
                value: minuta.codigo,
                label: `${minuta.tipo} · ${minuta.titulo} (${minuta.publicadoEm})`,
              })),
            ]}
          />
        </FormField>
      )}
      {(modelo || base) && detalhe.isPending && <InlineSpinner label="Carregando a minuta..." />}
      {detalhe.isError && <ErrorState message={detalhe.error?.message} onRetry={() => void detalhe.refetch()} />}
      {detalhe.data && (
        <Formulario
          // Outra base é outro formulário: o texto de uma minuta não serve à outra.
          key={detalhe.data.codigo}
          detalhe={detalhe.data}
          modelo={modelo}
          pendente={pendente}
          onPublicar={(dados) => onPublicar(modelo ? modelo.codigo : detalhe.data.codigo, dados)}
          onCancelar={onCancelar}
        />
      )}
      {!detalhe.data && (
        <div>
          <Button variant="ghost" onClick={onCancelar}>
            Cancelar
          </Button>
        </div>
      )}
    </div>
  )
}

function Formulario({
  detalhe,
  modelo,
  pendente,
  onPublicar,
  onCancelar,
}: {
  detalhe: DetalheDoModelo
  modelo?: ModeloDoOrgao
  pendente: boolean
  onPublicar: (dados: DadosDoModelo) => void
  onCancelar: () => void
}) {
  const [dados, setDados] = useState<DadosDoModelo>({
    titulo: modelo?.titulo ?? "",
    descricao: modelo?.descricao ?? "",
    justificativa: modelo?.justificativa ?? "",
    textos: Object.fromEntries(detalhe.secoes.map((secao) => [secao.codigo, secao.texto])),
  })
  const [tentou, setTentou] = useState(false)
  const erros = errosDoModelo(dados)

  const publicar = () => {
    setTentou(true)
    if (Object.keys(erros).length > 0 || pendente) return
    // Na versão seguinte vai o texto inteiro: o que ficou igual à versão
    // anterior também é escolha do órgão. No modelo novo, só o que mudou da minuta.
    onPublicar({ ...dados, textos: modelo ? dados.textos : textosAlterados(detalhe.secoes, dados.textos) })
  }

  return (
    <div className="flex flex-col gap-4">
      <FormField label="Título" required>
        <Input
          value={dados.titulo}
          onChange={(e) => setDados({ ...dados, titulo: e.target.value })}
          ariaLabel="Título"
          placeholder="Ex.: Edital do Município — Pregão"
        />
        {tentou && erros.titulo && <ValidationMsg type="error" msg={erros.titulo} />}
      </FormField>
      <FormField label="Descrição">
        <Input
          value={dados.descricao}
          onChange={(e) => setDados({ ...dados, descricao: e.target.value })}
          ariaLabel="Descrição"
        />
      </FormField>
      <FormField label="Justificativa (Art. 19, § 2º, Lei 14.133/21)" required>
        <Textarea
          value={dados.justificativa}
          onChange={(e) => setDados({ ...dados, justificativa: e.target.value })}
          rows={3}
          placeholder="Por que o órgão não segue a minuta da AGU como publicada"
        />
        {tentou && erros.justificativa && <ValidationMsg type="error" msg={erros.justificativa} />}
      </FormField>

      <div className="flex flex-col gap-3">
        <h3 className="m-0 font-display text-md font-bold text-text-1">Texto-Padrão das Seções</h3>
        {detalhe.secoes.map((secao) => (
          <FormField
            key={secao.codigo}
            label={`${secao.numero ? `${secao.numero}. ` : ""}${secao.titulo}`}
            hint={secao.fundamentoLegal}
          >
            <Textarea
              value={dados.textos[secao.codigo] ?? ""}
              onChange={(e) => setDados({ ...dados, textos: { ...dados.textos, [secao.codigo]: e.target.value } })}
              rows={4}
            />
          </FormField>
        ))}
      </div>

      <div className="flex flex-wrap justify-end gap-2.5">
        <Button variant="ghost" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button onClick={publicar}>{pendente ? "Publicando..." : modelo ? "Publicar Nova Versão" : "Publicar Modelo"}</Button>
      </div>
    </div>
  )
}
