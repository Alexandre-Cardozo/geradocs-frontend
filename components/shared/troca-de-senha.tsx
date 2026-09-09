"use client"

import { useId, useState } from "react"

import { Button, FormField, InfoBanner, Input } from "@/components/ui"
import { useToast } from "@/components/shared/providers"
import { useTrocarPropriaSenha } from "@/lib/api/hooks"

/** O piso do servidor (ADR-022). Repetido aqui para a tela avisar antes da viagem. */
export const MINIMO_DE_CARACTERES = 8

/**
 * Trocar a própria senha.
 *
 * <p>Serve aos dois casos com o mesmo formulário: quem chegou com a senha
 * sorteada e quer uma sua, e quem já tem a sua e resolveu trocá-la. Não há
 * diferença de comportamento entre eles — só o aviso na barra, que some quando
 * a troca acontece.
 */
export function TrocaDeSenha({ provisoria }: { provisoria: boolean }) {
  const trocar = useTrocarPropriaSenha()
  const showToast = useToast()
  const [atual, setAtual] = useState("")
  const [nova, setNova] = useState("")
  const [confirmacao, setConfirmacao] = useState("")
  const motivoId = useId()
  const atualId = useId()
  const novaId = useId()
  const confirmacaoId = useId()

  const impedimento =
    atual === ""
      ? provisoria
        ? "Informe a senha que você recebeu."
        : "Informe sua senha atual."
      : nova.length < MINIMO_DE_CARACTERES
        ? `A nova senha precisa ter ao menos ${MINIMO_DE_CARACTERES} caracteres.`
        : nova === atual
          ? "A nova senha precisa ser diferente da atual."
          : confirmacao !== nova
            ? "A confirmação precisa ser igual à nova senha."
            : null

  const limpar = () => {
    setAtual("")
    setNova("")
    setConfirmacao("")
  }

  return (
    <div className="rounded-card border border-border bg-surface p-6 lg:p-7">
      <h2 className="m-0 font-display text-md font-bold text-text-1">Senha</h2>
      <p className="m-0 mt-1.5 mb-5 text-sm text-text-3">
        {provisoria
          ? "Sua senha atual foi gerada pelo sistema e entregue por quem cadastrou seu acesso. Escolha uma senha só sua."
          : "Trocar a senha encerra apenas a digitação atual: suas sessões abertas continuam valendo."}
      </p>

      <div className="grid max-w-md grid-cols-1 gap-3.5">
        <FormField
          label={provisoria ? "Senha recebida" : "Senha atual"}
          htmlFor={atualId}
          required
        >
          <Input
            id={atualId}
            value={atual}
            onChange={(e) => setAtual(e.target.value)}
            type="password"
            autoComplete="current-password"
          />
        </FormField>
        <FormField
          label="Nova senha"
          htmlFor={novaId}
          required
          hint={`Mínimo de ${MINIMO_DE_CARACTERES} caracteres.`}
        >
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
        <div>
          <Button
            disabled={impedimento !== null || trocar.isPending}
            // Sem isto, quem chega pelo teclado ouve "botão desabilitado" e não
            // descobre o que falta.
            ariaDescribedBy={motivoId}
            onClick={() =>
              trocar.mutate(
                { atual, nova },
                {
                  onSuccess: () => {
                    limpar()
                    showToast("Senha alterada.")
                  },
                },
              )
            }
          >
            {trocar.isPending ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </div>
      </div>
    </div>
  )
}
