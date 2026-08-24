"use client"

import { useId, useState } from "react"

import { Button, FormField, InfoBanner, Input } from "@/components/ui"
import { useTrocarPropriaSenha } from "@/lib/api/hooks"

/**
 * O primeiro acesso: trocar a senha provisória antes de qualquer outra coisa.
 *
 * <p>Substitui a aplicação inteira em vez de ser mais um aviso na tela. A senha
 * provisória é conhecida por quem a entregou, e trabalhar com ela seria trabalhar
 * com credencial compartilhada — o servidor recusa tudo o mais de qualquer forma,
 * e sem esta tela a pessoa levaria um 403 sem entender o motivo.
 *
 * <p>É a única trava do produto que não "orienta e deixa seguir" (§24), e a
 * diferença é de quem é a decisão: as outras tirariam do servidor uma escolha
 * que é dele; esta impede que <b>outra pessoa</b> aja no lugar dele.
 */
export function TrocaDeSenhaObrigatoria({ nome }: { nome: string }) {
  const trocar = useTrocarPropriaSenha()
  const [atual, setAtual] = useState("")
  const [nova, setNova] = useState("")
  const [confirmacao, setConfirmacao] = useState("")
  const motivoId = useId()
  const atualId = useId()
  const novaId = useId()
  const confirmacaoId = useId()

  const curta = nova.length < 12
  const diferente = confirmacao !== nova
  const repetida = nova !== "" && nova === atual
  const impedimento = atual === ""
    ? "Informe a senha provisória que você recebeu."
    : curta
      ? "A nova senha precisa ter ao menos 12 caracteres."
      : repetida
        ? "A nova senha precisa ser diferente da provisória."
        : diferente
          ? "A confirmação precisa ser igual à nova senha."
          : null

  return (
    <div className="flex min-h-dvh items-center justify-center bg-ice px-4 py-10">
      <div className="w-full max-w-md rounded-card border border-border bg-surface p-6">
        <h1 className="m-0 font-display text-lg font-extrabold text-text-1">
          Defina sua senha
        </h1>
        <p className="mt-1.5 mb-4 text-sm text-text-3">
          {nome}, sua senha atual foi gerada pelo sistema e entregue por quem cadastrou seu acesso.
          Escolha uma senha só sua para continuar.
        </p>

        <div className="flex flex-col gap-3.5">
          <FormField label="Senha provisória" htmlFor={atualId} required>
            <Input
              id={atualId}
              value={atual}
              onChange={(e) => setAtual(e.target.value)}
              type="password"
              autoComplete="current-password"
            />
          </FormField>
          <FormField label="Nova senha" htmlFor={novaId} required hint="Mínimo de 12 caracteres.">
            <Input
              id={novaId}
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </FormField>
          <FormField label="Repita a nova senha" htmlFor={confirmacaoId} required>
            <Input
              id={confirmacaoId}
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              type="password"
              autoComplete="new-password"
            />
          </FormField>

          {trocar.isError && (
            <InfoBanner tone="warning">
              {trocar.error instanceof Error
                ? trocar.error.message
                : "Não foi possível trocar a senha."}
            </InfoBanner>
          )}

          <p id={motivoId} className={impedimento ? "m-0 text-xs text-text-muted" : "sr-only"}>
            {impedimento ?? "Tudo certo para trocar."}
          </p>
          <Button
            disabled={impedimento !== null || trocar.isPending}
            // Sem isto, quem chega pelo teclado ouve "botão desabilitado" e não
            // descobre o que falta.
            ariaDescribedBy={motivoId}
            onClick={() => trocar.mutate({ atual, nova })}
          >
            {trocar.isPending ? "Salvando..." : "Definir senha e entrar"}
          </Button>
        </div>
      </div>
    </div>
  )
}
