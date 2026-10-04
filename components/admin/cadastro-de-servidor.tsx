"use client"

import { useId, useState } from "react"

import { Button, Dropdown, FormField, IconLock, Input } from "@/components/ui"
import { formatCPF, validaCPF } from "@/lib/auth/cpf"
import { validaEmail } from "@/lib/auth/email"
import { PERFIL_ACESSO_LABEL, type PerfilAcesso } from "@/lib/types"
import { erroCargo, erroDecreto, erroMatricula, erroNomeDePessoa } from "@/lib/validacao/campos"

/** Os campos do formulário, pelo nome que o contrato dá a cada um. */
export type CampoDoCadastro =
  | "name" | "cpf" | "email" | "jobTitle" | "registrationNumber" | "appointmentDecree" | "profileAccess"

export type RecusasDoCadastro = Partial<Record<CampoDoCadastro | (string & {}), string>>

export interface DadosDoCadastro {
  nome: string
  cpf: string
  email: string
  cargo: string
  matricula: string
  decretoNomeacao: string
  perfilAcesso: PerfilAcesso
  entidadeId: string
}

/**
 * De onde vem a entidade do cadastro.
 *
 * <p>O administrador geral escolhe entre todas. O coordenador só cadastra na
 * própria — o campo continua na tela, travado, para que ele veja onde a pessoa
 * vai entrar em vez de ter de deduzir.
 */
export type EntidadeDoCadastro =
  | { fixa: { id: string; nome: string } }
  | { opcoes: { id: string; nome: string }[] }

/** Referência estável para "nada recusado": um `{}` novo a cada render apagaria o que a pessoa já corrigiu. */
export const SEM_RECUSAS: RecusasDoCadastro = {}

/**
 * O cadastro de um servidor, o mesmo para o administrador e para o coordenador.
 *
 * <p>Eram dois formulários escritos à parte, e o do coordenador perdeu
 * matrícula e decreto de nomeação pelo caminho — o mesmo `POST /users` aceita
 * os dois de qualquer um. Um componente só impede que voltem a divergir.
 *
 * <p>O estado dos campos vive aqui e morre com o painel: cancelar ou cadastrar
 * fecha o painel, e reabrir começa do zero.
 */
export function CadastroDeServidor({
  titulo,
  entidade,
  salvando,
  recusas,
  onCadastrar,
  onCancelar,
}: {
  titulo: string
  entidade: EntidadeDoCadastro
  salvando: boolean
  /** O que o servidor recusou na última tentativa, campo a campo. */
  recusas: RecusasDoCadastro
  onCadastrar: (dados: DadosDoCadastro) => void
  onCancelar: () => void
}) {
  const motivoId = useId()
  const [nome, setNome] = useState("")
  const [cpf, setCpf] = useState("")
  const [email, setEmail] = useState("")
  const [cargo, setCargo] = useState("")
  const [matricula, setMatricula] = useState("")
  const [decreto, setDecreto] = useState("")
  const [perfil, setPerfil] = useState<PerfilAcesso>("servidor")
  const [entidadeEscolhida, setEntidadeEscolhida] = useState("")

  // Cada recusa some quando a pessoa mexe naquele campo: continuar mostrando-a
  // depois da correção seria mentir. Recusa nova zera o que já foi mexido.
  const [alterados, setAlterados] = useState<ReadonlySet<CampoDoCadastro>>(new Set())
  const [recusasVistas, setRecusasVistas] = useState(recusas)
  if (recusas !== recusasVistas) {
    setRecusasVistas(recusas)
    setAlterados(new Set())
  }
  const recusa = (campo: CampoDoCadastro) => (alterados.has(campo) ? undefined : recusas[campo])
  const alterar = (campo: CampoDoCadastro, set: (v: string) => void) => (valor: string) => {
    set(valor)
    setAlterados((atuais) => new Set(atuais).add(campo))
  }

  const entidadeId = "fixa" in entidade ? entidade.fixa.id : entidadeEscolhida
  const cpfValido = validaCPF(cpf)
  const emailValido = validaEmail(email)
  // O que se vê ao digitar. Tem precedência sobre a recusa do servidor, que é
  // sobre o valor enviado — e o valor já pode ter mudado desde então.
  const errosDoFormato = {
    name: erroNomeDePessoa(nome),
    jobTitle: erroCargo(cargo),
    registrationNumber: erroMatricula(matricula),
    appointmentDecree: erroDecreto(decreto),
  }
  const formatoOk = Object.values(errosDoFormato).every((erro) => erro === undefined)
  // Todo servidor cadastrado pertence a uma entidade: sem ela o cadastro não
  // tem lotação, e o servidor não teria processo nenhum para trabalhar.
  const podeSalvar = nome.trim() !== "" && cpfValido && emailValido && entidadeId !== "" && formatoOk

  const salvar = () => {
    if (!podeSalvar) return
    onCadastrar({
      nome, cpf, email, cargo, matricula, decretoNomeacao: decreto,
      perfilAcesso: perfil,
      entidadeId,
    })
  }

  return (
    <div className="rounded-card border border-border bg-surface p-5">
      <h2 className="m-0 mb-4 font-display text-md font-bold text-text-1">{titulo}</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Nome Completo" required hint={errosDoFormato.name ?? recusa("name")}>
          <Input value={nome} onChange={(e) => alterar("name", setNome)(e.target.value)} placeholder="Nome do servidor" />
        </FormField>
        <FormField label="CPF" required hint={cpf !== "" && !cpfValido ? "CPF inválido." : recusa("cpf")}>
          <Input
            value={cpf}
            onChange={(e) => alterar("cpf", setCpf)(formatCPF(e.target.value))}
            inputMode="numeric"
            placeholder="000.000.000-00"
          />
        </FormField>
        <FormField label="E-mail" required hint={email.trim() !== "" && !emailValido ? "E-mail inválido." : recusa("email")}>
          <Input
            value={email}
            onChange={(e) => alterar("email", setEmail)(e.target.value)}
            type="email"
            inputMode="email"
            placeholder="email@prefeitura.gov.br"
          />
        </FormField>
        <FormField label="Cargo" hint={errosDoFormato.jobTitle ?? recusa("jobTitle")}>
          <Input value={cargo} onChange={(e) => alterar("jobTitle", setCargo)(e.target.value)} placeholder="Ex: Servidor de Compras" />
        </FormField>
        <FormField
          label="Matrícula"
          hint={errosDoFormato.registrationNumber ?? recusa("registrationNumber") ?? "Número funcional no RH. Pode ser a chave de login (ADR-015)."}
        >
          <Input value={matricula} onChange={(e) => alterar("registrationNumber", setMatricula)(e.target.value)} placeholder="Ex: MAT-4471" />
        </FormField>
        <FormField
          label="Decreto de Nomeação"
          hint={errosDoFormato.appointmentDecree ?? recusa("appointmentDecree") ?? "Para comissionados, é o número que a pessoa costuma lembrar."}
        >
          <Input value={decreto} onChange={(e) => alterar("appointmentDecree", setDecreto)(e.target.value)} placeholder="Ex: Decreto 1.234/2026" />
        </FormField>
        <FormField label="Perfil de Acesso" required hint={recusa("profileAccess")}>
          <Dropdown
            value={perfil}
            onChange={(v) => alterar("profileAccess", (p) => setPerfil(p as PerfilAcesso))(v)}
            ariaLabel="Perfil de acesso"
            options={[
              { value: "servidor", label: PERFIL_ACESSO_LABEL.servidor },
              { value: "coordenador", label: PERFIL_ACESSO_LABEL.coordenador },
            ]}
          />
        </FormField>
        {"fixa" in entidade ? (
          <FormField label="Entidade" required hint="Quem você cadastra aqui entra na sua entidade.">
            <div className="relative">
              <Input value={entidade.fixa.nome} disabled className="pr-9" />
              <span className="pointer-events-none absolute top-1/2 right-3 flex -translate-y-1/2 text-text-muted">
                <IconLock size={14} />
              </span>
            </div>
          </FormField>
        ) : (
          <FormField label="Entidade" required>
            <Dropdown
              value={entidadeEscolhida}
              onChange={setEntidadeEscolhida}
              ariaLabel="Entidade"
              options={[
                { value: "", label: "Selecione a entidade..." },
                ...entidade.opcoes.map((e) => ({ value: e.id, label: e.nome })),
              ]}
            />
          </FormField>
        )}
      </div>
      <div className="mt-4 flex gap-2.5">
        <Button variant="secondary" onClick={onCancelar}>Cancelar</Button>
        <p id={motivoId} className="sr-only">
          Nome, CPF válido, e-mail válido e a entidade são obrigatórios, e cada
          campo preenchido precisa estar no formato indicado. A senha é sorteada
          pelo sistema e aparece depois de cadastrar.
        </p>
        <Button disabled={salvando || !podeSalvar} ariaDescribedBy={motivoId} onClick={salvar}>
          {salvando ? "Salvando..." : "Cadastrar"}
        </Button>
      </div>
    </div>
  )
}
