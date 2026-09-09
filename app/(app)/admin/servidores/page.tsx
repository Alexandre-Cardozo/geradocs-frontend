"use client"

import { useState } from "react"

import { Button, Dropdown, FormField, InfoBanner, Input, Tag } from "@/components/ui"
import { IconPlus, IconTrash } from "@/components/ui/icons"
import { EmptyState, ErrorState, SkeletonRows } from "@/components/shared/estados"
import { FotoDePerfil } from "@/components/shared/foto-de-perfil"
import { Th } from "@/components/shared/tabela"
import { useToast } from "@/components/shared/providers"
import { CredenciaisIniciais } from "@/components/admin/credenciais-iniciais"
import { FichaDoServidor } from "@/components/admin/ficha-do-servidor"
import { useCriarUsuario, useEntidades, useRemoverUsuario, useUsuarios } from "@/lib/api/hooks"
import { formatCPF, validaCPF } from "@/lib/auth/cpf"
import { formatDataHora } from "@/lib/format"
import { PERFIL_ACESSO_LABEL, type PerfilAcesso, type Usuario } from "@/lib/types"

/** Só os dois perfis de entidade: o admin geral não é listado aqui. */
const perfilTone = (p: PerfilAcesso) => (p === "coordenador" ? "success" : "neutral")

export default function AdminServidores() {
  const showToast = useToast()

  // Filtros da listagem
  const [filtroEntidade, setFiltroEntidade] = useState("")
  const [buscaServidor, setBuscaServidor] = useState("")
  const [filtroFuncao, setFiltroFuncao] = useState("")

  const usuarios = useUsuarios(undefined, buscaServidor)
  const entidades = useEntidades()
  const criar = useCriarUsuario()
  const remover = useRemoverUsuario()

  const [novo, setNovo] = useState(false)
  const [nome, setNome] = useState("")
  const [cpf, setCpf] = useState("")
  const [email, setEmail] = useState("")
  const [cargo, setCargo] = useState("")
  const [matricula, setMatricula] = useState("")
  const [decreto, setDecreto] = useState("")
  const [credenciais, setCredenciais] = useState<{ nome: string; chave: string; senha: string } | null>(null)
  const [fichaAberta, setFichaAberta] = useState<string | null>(null)
  const [perfil, setPerfil] = useState<PerfilAcesso>("servidor")
  const [entidadeId, setEntidadeId] = useState("")

  /**
   * Esta tela é a dos servidores das entidades.
   *
   * <p>O administrador geral da plataforma nasce com o banco (é ele quem está
   * logado aqui) e não pertence a entidade alguma. Listá-lo entre os servidores
   * ofereceria um botão de desativar a única conta capaz de administrar o
   * sistema — e cadastrá-lo de novo não é possível, por isso o perfil também
   * saiu do formulário.
   */
  const servidoresDasEntidades = (usuarios.data ?? []).filter(
    (u) => u.perfilAcesso !== "admin_geral",
  )

  // Nome e matrícula vão ao servidor (ele conhece a matrícula de quem não está
  // na página); entidade e função filtram o que já veio.
  const listaFiltrada = servidoresDasEntidades.filter((u) => {
    const okPref = filtroEntidade === "" || u.entidadeId === filtroEntidade
    const okFuncao = filtroFuncao === "" || u.perfilAcesso === filtroFuncao
    return okPref && okFuncao
  })

  const cpfValido = validaCPF(cpf)
  // Todo servidor cadastrado aqui pertence a uma entidade: sem ela o cadastro
  // não tem lotação, e o servidor não teria processo nenhum para trabalhar.
  const podeSalvar = nome.trim() !== "" && cpfValido && email.trim() !== "" && entidadeId !== ""

  const salvar = () => {
    if (!podeSalvar) return
    criar.mutate(
      {
        nome, cpf, email, cargo, matricula, decretoNomeacao: decreto,
        perfilAcesso: perfil,
        entidadeId,
      },
      {
        onSuccess: (criado) => {
          // A senha volta uma única vez: guardá-la aqui é o que permite
          // mostrá-la para ser entregue. Fica **fora** do painel de cadastro,
          // que fecha na linha seguinte — a primeira versão a mostrava dentro
          // dele, e o aviso nascia desmontado.
          setCredenciais({
            nome: criado.usuario.nome,
            // O CPF que acabou de ser digitado, e não o da resposta: o servidor
            // devolve mascarado de propósito, e "***.***.***-74" não abre porta
            // nenhuma para quem recebe a credencial.
            chave: cpf,
            senha: criado.senhaProvisoria,
          })
          showToast("Servidor cadastrado.")
          setNovo(false)
          setNome(""); setCpf(""); setEmail(""); setCargo(""); setMatricula(""); setDecreto("")
          setPerfil("servidor"); setEntidadeId("")
        },
        onError: (e) => showToast(e instanceof Error ? e.message : "Não foi possível cadastrar."),
      }
    )
  }

  // Da própria listagem: ela já traz tudo o que a ficha mostra, e uma leitura a
  // mais só produziria a chance de as duas divergirem na tela.
  const servidorDaFicha: Usuario | undefined =
    fichaAberta === null ? undefined : listaFiltrada.find((u) => u.id === fichaAberta)

  /**
   * O nome da entidade, nunca o identificador dela.
   *
   * <p>O `?? id` de antes fazia a coluna exibir um UUID sempre que a entidade
   * não estava na listagem — o que acontecia justamente com quem tinha ficado
   * órfão de uma entidade desativada. Mostrar o número não ajudava ninguém:
   * ele não é digitado em lugar nenhum do produto.
   */
  const nomeEntidade = (id: string | null) =>
    (id ? entidades.data?.find((e) => e.id === id)?.nome : null) ?? "—"

  return (
    <div className="w-full p-4 sm:p-5 lg:p-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="m-0 font-display text-2xl font-extrabold tracking-tight text-text-1">Servidores</h1>
          <p className="m-0 mt-1 text-md text-text-3">Cadastre os servidores de cada entidade e defina o perfil de acesso de cada um.</p>
        </div>
        <Button icon={<IconPlus size={14} strokeWidth={2.5} />} onClick={() => setNovo((v) => !v)}>
          Novo Servidor
        </Button>
      </div>

      {credenciais && (
        <div className="mb-5">
          <CredenciaisIniciais
            nome={credenciais.nome}
            chave={credenciais.chave}
            senha={credenciais.senha}
            titulo="Credenciais de primeiro acesso"
            onFechar={() => setCredenciais(null)}
          />
        </div>
      )}

      {/*
        Servidor com processo em andamento não é desativado, e quem sabe disso é
        o servidor: os processos vivem em outro módulo, e esta tela não os
        consulta. O que ela faz é repetir o motivo que veio de lá — "não foi
        possível" deixaria a pessoa sem saber o que fazer a seguir.
      */}
      {remover.isError && (
        <div className="mb-5">
          <InfoBanner tone="warning">
            {remover.error instanceof Error
              ? remover.error.message
              : "Não foi possível desativar o servidor."}
          </InfoBanner>
        </div>
      )}

      {servidorDaFicha && (
        <FichaDoServidor
          servidor={servidorDaFicha}
          entidade={nomeEntidade(servidorDaFicha.entidadeId)}
          onFechar={() => setFichaAberta(null)}
        />
      )}

      {novo && (
        <div className="mb-5 rounded-card border border-border bg-surface p-5">
          <h2 className="m-0 mb-4 font-display text-md font-bold text-text-1">Cadastrar Servidor</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Nome Completo" required>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Nome do servidor" />
            </FormField>
            <FormField label="CPF" required hint={cpf !== "" && !cpfValido ? "CPF inválido." : undefined}>
              <Input value={cpf} onChange={(e) => setCpf(formatCPF(e.target.value))} placeholder="000.000.000-00" />
            </FormField>
            <FormField label="E-mail" required>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" placeholder="email@prefeitura.gov.br" />
            </FormField>
            <FormField label="Cargo">
              <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Servidor de Compras" />
            </FormField>
            <FormField label="Matrícula" hint="Número funcional no RH. Pode ser a chave de login (ADR-015).">
              <Input value={matricula} onChange={(e) => setMatricula(e.target.value)} placeholder="Ex: MAT-4471" />
            </FormField>
            <FormField label="Decreto de Nomeação" hint="Para comissionados, é o número que a pessoa costuma lembrar.">
              <Input value={decreto} onChange={(e) => setDecreto(e.target.value)} placeholder="Ex: Decreto 1.234/2026" />
            </FormField>
            <FormField label="Perfil de Acesso" required>
              <Dropdown
                value={perfil}
                onChange={(v) => setPerfil(v as PerfilAcesso)}
                ariaLabel="Perfil de acesso"
                options={[
                  { value: "servidor", label: PERFIL_ACESSO_LABEL.servidor },
                  { value: "coordenador", label: PERFIL_ACESSO_LABEL.coordenador },
                ]}
              />
            </FormField>
            <FormField label="Entidade" required>
              <Dropdown
                value={entidadeId}
                onChange={setEntidadeId}
                ariaLabel="Entidade"
                options={[
                  { value: "", label: "Selecione a entidade..." },
                  ...(entidades.data ?? []).map((e) => ({ value: e.id, label: e.nome })),
                ]}
              />
            </FormField>
          </div>
          <div className="mt-4 flex gap-2.5">
            <Button variant="secondary" onClick={() => setNovo(false)}>Cancelar</Button>
            <p id="motivo-criar-servidor" className="sr-only">
              Nome, CPF válido, e-mail e a entidade são obrigatórios. A senha é
              sorteada pelo sistema.
            </p>
            <Button
              disabled={criar.isPending || !podeSalvar}
              ariaDescribedBy="motivo-criar-servidor"
              onClick={salvar}
            >
              {criar.isPending ? "Salvando..." : "Cadastrar"}
            </Button>
          </div>
        </div>
      )}

      {/* Filtros da listagem — entidade, busca por servidor, função */}
      {usuarios.isSuccess && (servidoresDasEntidades.length > 0 || filtroEntidade !== "" || buscaServidor !== "" || filtroFuncao !== "") && (
        <div className="mb-3 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <Dropdown
            value={filtroEntidade}
            onChange={setFiltroEntidade}
            ariaLabel="Filtrar por entidade"
            options={[
              { value: "", label: "Todas as entidades" },
              ...(entidades.data ?? []).map((e) => ({ value: e.id, label: e.nome })),
            ]}
          />
          <Input
            value={buscaServidor}
            onChange={(e) => setBuscaServidor(e.target.value)}
            placeholder="Buscar por nome ou matrícula..."
            aria-label="Buscar por nome ou matrícula"
            className="h-9.5"
          />
          <Dropdown
            value={filtroFuncao}
            onChange={setFiltroFuncao}
            ariaLabel="Filtrar por função"
            options={[
              { value: "", label: "Todas as funções" },
              { value: "coordenador", label: PERFIL_ACESSO_LABEL.coordenador },
              { value: "servidor", label: PERFIL_ACESSO_LABEL.servidor },
            ]}
          />
        </div>
      )}

      <div className="overflow-hidden rounded-card border border-border bg-surface">
        {usuarios.isPending && <SkeletonRows rows={5} />}
        {usuarios.isError && <ErrorState onRetry={() => void usuarios.refetch()} />}
        {usuarios.isSuccess && servidoresDasEntidades.length === 0 && <EmptyState message="Nenhum servidor cadastrado" />}
        {usuarios.isSuccess && servidoresDasEntidades.length > 0 && listaFiltrada.length === 0 && (
          <EmptyState message="Nenhum servidor encontrado para os filtros aplicados" />
        )}
        {usuarios.isSuccess && listaFiltrada.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[940px] border-collapse">
              <thead>
                <tr className="border-b border-border bg-ice">
                  {["Servidor", "CPF", "Matrícula", "Entidade", "Perfil", "Último Acesso", ""].map((h, i) => (
                    <Th key={h === "" ? `x-${i}` : h}>{h}</Th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {listaFiltrada.map((u, i) => (
                  <tr
                    key={u.id}
                    // A linha inteira abre a ficha. O nome continua sendo um
                    // botão de verdade — sem ele, quem navega por teclado não
                    // teria como chegar aqui: `<tr>` não recebe foco.
                    onClick={() => setFichaAberta(fichaAberta === u.id ? null : u.id)}
                    className={`cursor-pointer transition-colors hover:bg-ice ${
                      fichaAberta === u.id ? "bg-ice" : ""
                    } ${i < listaFiltrada.length - 1 ? "border-b border-ice" : ""}`}
                  >
                    <td className="px-4 py-3.25">
                      <button
                        type="button"
                        // Sem `onClick` próprio: o clique — inclusive o que vem
                        // do Enter no teclado — sobe para a linha, que trata.
                        // Um handler aqui alternaria a ficha duas vezes.
                        aria-expanded={fichaAberta === u.id}
                        className="flex cursor-pointer items-center gap-2.5 border-0 bg-transparent p-0 text-left"
                      >
                        <FotoDePerfil
                          usuarioId={u.id}
                          iniciais={u.iniciais}
                          tamanho={32}
                          className="shrink-0 text-xs"
                        />
                        <span className="block">
                          <span className="block text-base font-semibold text-text-1">
                            {u.nome}
                          </span>
                          <span className="block text-xs text-text-muted">{u.cargo}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3.25 font-mono text-sm text-text-3">{u.cpf.includes("*") ? u.cpf : formatCPF(u.cpf)}</td>
                    <td className="px-4 py-3.25 font-mono text-sm text-text-3">{u.matricula ?? "—"}</td>
                    <td className="px-4 py-3.25 text-sm text-text-3">{nomeEntidade(u.entidadeId)}</td>
                    <td className="px-4 py-3.25">
                      <Tag tone={perfilTone(u.perfilAcesso)}>{PERFIL_ACESSO_LABEL[u.perfilAcesso]}</Tag>
                    </td>
                    <td className="px-4 py-3.25 text-sm text-text-3">{u.ultimoAcesso ? formatDataHora(u.ultimoAcesso) : "—"}</td>
                    <td className="px-4 py-3.25">
                      <button
                        type="button"
                        aria-label={`Desativar ${u.nome}`}
                        disabled={remover.isPending}
                        onClick={(evento) => {
                          // Sem isto, desativar também abriria a ficha de quem
                          // acabou de ser desativado.
                          evento.stopPropagation()
                          // O erro não vai para o toast: quando a recusa é de
                          // regra — processo em andamento —, ela precisa ficar
                          // legível enquanto a pessoa decide o que fazer, e não
                          // sumir em três segundos.
                          remover.mutate(u.id, {
                            onSuccess: () => showToast(`${u.nome} desativado.`),
                          })
                        }}
                        className="flex size-7 cursor-pointer items-center justify-center rounded-sm border border-border bg-ice text-danger transition-colors hover:bg-tint-danger-bg disabled:opacity-50"
                      >
                        <IconTrash size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
