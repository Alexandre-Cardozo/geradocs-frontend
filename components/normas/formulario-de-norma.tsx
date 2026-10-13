"use client"

import { useState } from "react"

import { Button, Dropdown, FileUpload, FormField, Input, Textarea, ValidationMsg } from "@/components/ui"
import { ESPECIES_DE_NORMA, type DadosDaNorma, type EspecieNorma } from "@/lib/api/regulation-client"
import { FORMATOS_DA_NORMA, errosDaNorma } from "@/lib/normas/norma"

/**
 * Cadastro e correção da norma.
 *
 * <p>No cadastro o arquivo é obrigatório — norma sem o texto publicado não
 * serve à IA nem a quem confere. Na correção ele não aparece: trocar o arquivo
 * é outra ação, que guarda a versão anterior.
 */
export function FormularioDeNorma({
  modo,
  inicial,
  pendente,
  onEnviar,
  onCancelar,
}: {
  modo: "cadastro" | "correcao"
  inicial: DadosDaNorma
  pendente: boolean
  onEnviar: (dados: DadosDaNorma, arquivo: File | null) => void
  onCancelar: () => void
}) {
  const [dados, setDados] = useState<DadosDaNorma>(inicial)
  const [nomeDoArquivo, setNomeDoArquivo] = useState<string | null>(null)
  const [arquivo, setArquivo] = useState<File | null>(null)
  // Os erros aparecem depois da primeira tentativa: apontar campo vazio antes
  // de a pessoa começar a preencher é reclamar do que ela ainda vai fazer.
  const [tentou, setTentou] = useState(false)

  const erros = errosDaNorma(dados, modo === "cadastro" ? arquivo : undefined)
  const temErro = Object.keys(erros).length > 0
  const alterar = (campo: keyof DadosDaNorma, valor: string) => setDados((d) => ({ ...d, [campo]: valor }))

  const enviar = () => {
    setTentou(true)
    if (!temErro) onEnviar(dados, arquivo)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Espécie" required>
          <Dropdown
            value={dados.especie}
            onChange={(v) => alterar("especie", v as EspecieNorma)}
            ariaLabel="Espécie da norma"
            options={Object.entries(ESPECIES_DE_NORMA).map(([value, label]) => ({ value, label }))}
          />
        </FormField>
        <FormField label="Número">
          <Input
            value={dados.numero}
            onChange={(e) => alterar("numero", e.target.value)}
            placeholder="Ex.: 10.210/2025"
          />
          {tentou && erros.numero && <ValidationMsg type="error" msg={erros.numero} />}
        </FormField>
        <FormField label="Data de publicação">
          <Input
            type="date"
            value={dados.publicadaEm}
            onChange={(e) => alterar("publicadaEm", e.target.value)}
            ariaLabel="Data de publicação"
          />
          {tentou && erros.publicadaEm && <ValidationMsg type="error" msg={erros.publicadaEm} />}
        </FormField>
      </div>

      <FormField label="Ementa ou assunto" required>
        <Textarea
          value={dados.ementa}
          onChange={(e) => alterar("ementa", e.target.value)}
          rows={2}
          placeholder="Ex.: Regulamenta a Lei nº 14.133/2021 no âmbito do Município"
        />
        {tentou && erros.ementa && <ValidationMsg type="error" msg={erros.ementa} />}
      </FormField>

      <FormField label="Observação">
        <Textarea
          value={dados.observacao}
          onChange={(e) => alterar("observacao", e.target.value)}
          rows={2}
          placeholder="Opcional. Ex.: aplica-se somente às contratações de obras."
        />
        {tentou && erros.observacao && <ValidationMsg type="error" msg={erros.observacao} />}
      </FormField>

      {modo === "cadastro" && (
        <FormField label="Arquivo da norma" required>
          <FileUpload
            file={nomeDoArquivo}
            onChange={setNomeDoArquivo}
            onArquivo={setArquivo}
            accept={FORMATOS_DA_NORMA}
            placeholder="Clique para selecionar a norma (até 10 MB) ou arraste o arquivo aqui"
          />
          {tentou && erros.arquivo && <ValidationMsg type="error" msg={erros.arquivo} />}
        </FormField>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" disabled={pendente} onClick={onCancelar}>
          Cancelar
        </Button>
        <Button disabled={pendente} onClick={enviar}>
          {pendente ? "Enviando..." : modo === "cadastro" ? "Cadastrar Norma" : "Salvar Alterações"}
        </Button>
      </div>
    </div>
  )
}
