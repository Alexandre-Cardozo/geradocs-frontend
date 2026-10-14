"use client"

import { useId, useState, type FormEvent, type ReactNode } from "react"

import { Button, FormField, Input, ValidationMsg } from "@/components/ui"
import { IconBuilding, IconUser } from "@/components/ui/icons"
import { formatCPF } from "@/lib/auth/cpf"
import { emEdicao, erroDoNome, errosDaFicha, type FichaEmEdicao } from "@/lib/secretarias/ficha"
import type { Secretaria } from "@/lib/types"

const FICHA_EM_BRANCO: Secretaria["ficha"] = {
  email: null,
  endereco: null,
  ug: null,
  secretario: null,
  cpfDoSecretario: null,
  decretoDeNomeacao: null,
}

/** Um grupo do formulário, com o que ele alimenta dito logo abaixo do título. */
function Grupo({ icone, titulo, dica, children }: { icone: ReactNode; titulo: string; dica: string; children: ReactNode }) {
  const tituloId = useId()
  return (
    <section aria-labelledby={tituloId} className="border-t border-border-soft pt-4">
      <h5 id={tituloId} className="m-0 flex items-center gap-2 text-base font-bold text-text-1">
        <span className="flex size-6 items-center justify-center rounded-sm bg-tint-royal-bg text-royal">{icone}</span>
        {titulo}
      </h5>
      <p className="m-0 mt-1 mb-3 text-sm text-text-muted">{dica}</p>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  )
}

/**
 * Cadastro e edição da secretaria: o nome e a ficha no mesmo formulário.
 *
 * <p>A ficha (ADR-044 do back-end) é o que o DFD mostra sem que se digite de
 * novo a cada processo. Cadastrar só o nome e voltar depois para completá-la era
 * um passo que se esquecia — aqui ela já vem junto, e continua opcional.
 *
 * <p>O CPF do secretário só existe mascarado na tela — a lista de secretarias é
 * lida por todo servidor —, então o campo serve para informar um CPF novo;
 * deixado em branco, o guardado continua.
 *
 * @param secretaria a que está sendo editada; ausente, é um cadastro
 * @param outras     as demais secretarias do órgão, para apontar nome repetido
 */
export function FormularioDaSecretaria({
  secretaria,
  outras,
  pendente,
  onSalvar,
  onCancelar,
}: {
  secretaria?: Secretaria
  outras: Secretaria[]
  pendente: boolean
  onSalvar: (nome: string, ficha: FichaEmEdicao) => void
  onCancelar: () => void
}) {
  const [nome, setNome] = useState(secretaria?.nome ?? "")
  const [ficha, setFicha] = useState<FichaEmEdicao>(emEdicao(secretaria?.ficha ?? FICHA_EM_BRANCO))
  const [tentou, setTentou] = useState(false)
  const erroNome = erroDoNome(nome, outras)
  const erros = errosDaFicha(ficha)
  const alterar = (campo: keyof FichaEmEdicao, valor: string) => setFicha((f) => ({ ...f, [campo]: valor }))
  const erro = (campo: keyof FichaEmEdicao) =>
    tentou && erros[campo] ? <ValidationMsg type="error" msg={erros[campo]} /> : null
  const cpfGuardado = secretaria?.ficha.cpfDoSecretario

  const salvar = (e: FormEvent) => {
    e.preventDefault()
    setTentou(true)
    if (erroNome === undefined && Object.keys(erros).length === 0) onSalvar(nome, ficha)
  }

  return (
    <form
      onSubmit={salvar}
      onKeyDown={(e) => {
        // Esc desiste de onde estiver o foco, sem precisar caçar o botão.
        if (e.key === "Escape" && !pendente) onCancelar()
      }}
      aria-label={secretaria ? `Editar ${secretaria.nome}` : "Nova secretaria"}
      className="rounded-card border border-royal bg-surface p-5"
      noValidate
    >
      <h4 className="m-0 font-display text-md font-bold text-text-1">
        {secretaria ? "Editar Secretaria" : "Nova Secretaria"}
      </h4>
      <p className="m-0 mt-1 mb-4 text-sm text-text-3">
        Só o nome é obrigatório. Os demais dados aparecem automaticamente no DFD — preencha agora ou depois.
      </p>

      <div className="mb-5">
        <FormField label="Nome da secretaria" required>
          <Input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Secretaria de Cultura e Turismo"
            autoFocus
          />
          {(tentou || nome.trim() !== "") && erroNome && <ValidationMsg type="error" msg={erroNome} />}
        </FormField>
      </div>

      <div className="flex flex-col gap-5">
        <Grupo
          icone={<IconBuilding size={13} />}
          titulo="Contato e Unidade Gestora"
          dica="Identificam a secretaria requisitante no DFD."
        >
          <FormField label="E-mail institucional">
            <Input
              type="email"
              inputMode="email"
              value={ficha.email}
              onChange={(e) => alterar("email", e.target.value)}
              placeholder="Ex.: saude@municipio.es.gov.br"
            />
            {erro("email")}
          </FormField>
          <FormField label="UG (unidade gestora)">
            <Input value={ficha.ug} onChange={(e) => alterar("ug", e.target.value)} placeholder="Ex.: 020101" />
            {erro("ug")}
          </FormField>
          <div className="sm:col-span-2">
            <FormField label="Endereço">
              <Input
                value={ficha.endereco}
                onChange={(e) => alterar("endereco", e.target.value)}
                placeholder="Ex.: Rua Central, 10, Centro"
              />
              {erro("endereco")}
            </FormField>
          </div>
        </Grupo>

        <Grupo
          icone={<IconUser size={13} />}
          titulo="Secretário Responsável"
          dica="Quem assina pela secretaria. O CPF sai mascarado no documento."
        >
          <div className="sm:col-span-2">
            <FormField label="Nome do secretário">
              <Input
                value={ficha.secretario}
                onChange={(e) => alterar("secretario", e.target.value)}
                placeholder="Ex.: Ana Souza"
              />
              {erro("secretario")}
            </FormField>
          </div>
          <FormField label="CPF do secretário">
            <Input
              value={ficha.cpfNovo}
              onChange={(e) => alterar("cpfNovo", formatCPF(e.target.value))}
              inputMode="numeric"
              placeholder={cpfGuardado ? `Atual: ${cpfGuardado} — digite para trocar` : "Ex.: 000.000.000-00"}
            />
            {erro("cpfNovo")}
          </FormField>
          <FormField label="Decreto de nomeação">
            <Input
              value={ficha.decretoDeNomeacao}
              onChange={(e) => alterar("decretoDeNomeacao", e.target.value)}
              placeholder="Ex.: Decreto nº 1.234, de 02/01/2025"
            />
            {erro("decretoDeNomeacao")}
          </FormField>
        </Grupo>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-border-soft pt-4">
        <Button variant="secondary" disabled={pendente} onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : secretaria ? "Salvar Alterações" : "Cadastrar Secretaria"}
        </Button>
      </div>
    </form>
  )
}
