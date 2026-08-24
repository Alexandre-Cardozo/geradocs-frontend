"use client"

import { useState } from "react"

import { Button, InfoBanner } from "@/components/ui"
import { useToast } from "@/components/shared/providers"

/**
 * A senha sorteada, mostrada uma única vez.
 *
 * <p>Ela existe fora do hash só neste instante — depois não há como recuperá-la,
 * só recadastrar ou usar a recuperação por e-mail. Por isso o aviso é grande e o
 * caminho de copiar é curto: quem fecha esta caixa sem anotar perde o acesso da
 * pessoa que acabou de cadastrar.
 */
export function SenhaProvisoria({
  nome,
  senha,
  onFechar,
}: {
  nome: string
  senha: string
  onFechar: () => void
}) {
  const showToast = useToast()
  const [copiada, setCopiada] = useState(false)

  return (
    <InfoBanner tone="warning">
      <div className="font-semibold">Senha provisória de {nome}</div>
      <p className="m-0 mt-1">
        Entregue esta senha a quem foi cadastrado. Ela aparece <strong>uma única vez</strong> e o
        primeiro acesso vai exigir a troca.
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        <code className="rounded-sm border border-border bg-surface px-2.5 py-1.5 font-mono text-md text-text-1 select-all">
          {senha}
        </code>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(senha).then(
              () => {
                setCopiada(true)
                showToast("Senha copiada.")
              },
              // Sem permissão de área de transferência o texto continua
              // selecionável: falhar em silêncio deixaria a pessoa achando que
              // copiou.
              () => showToast("Não foi possível copiar. Selecione e copie o texto."),
            )
          }}
        >
          {copiada ? "Copiada" : "Copiar"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onFechar}>
          Já anotei
        </Button>
      </div>
    </InfoBanner>
  )
}
