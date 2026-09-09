"use client"

import { useState } from "react"

import { Button, InfoBanner } from "@/components/ui"
import { useToast } from "@/components/shared/providers"
import { formatCPF } from "@/lib/auth/cpf"

/**
 * As credenciais de acesso, mostradas uma única vez.
 *
 * <p>A senha existe fora do hash só neste instante — depois não há como
 * recuperá-la, só redefinir. Por isso o aviso é grande e o caminho de copiar é
 * curto: quem fecha esta caixa sem anotar deixa a pessoa sem acesso.
 *
 * <p>Mostra a <b>chave de acesso</b> junto com a senha porque é o par que a
 * pessoa precisa receber. A primeira versão mostrava só a senha, e quem
 * cadastrava tinha de lembrar sozinho de que se entra com o CPF.
 */
export function CredenciaisIniciais({
  nome,
  chave,
  senha,
  titulo,
  onFechar,
}: {
  nome: string
  /** O que se digita no login — o CPF (ADR-015). */
  chave: string
  senha: string
  titulo: string
  onFechar: () => void
}) {
  const showToast = useToast()
  const [copiado, setCopiado] = useState(false)

  const chaveFormatada = chave.includes("*") ? chave : formatCPF(chave)
  const tudo = `Acesso: ${chaveFormatada}\nSenha: ${senha}`

  const copiar = (texto: string, aviso: string, marcar = false) => {
    void navigator.clipboard.writeText(texto).then(
      () => {
        if (marcar) setCopiado(true)
        showToast(aviso)
      },
      // Sem permissão de área de transferência o texto continua selecionável:
      // falhar em silêncio deixaria a pessoa achando que copiou.
      () => showToast("Não foi possível copiar. Selecione e copie o texto."),
    )
  }

  return (
    <InfoBanner tone="warning">
      <div className="font-semibold">
        {titulo} — {nome}
      </div>
      <p className="m-0 mt-1">
        Entregue estes dados a quem vai usar o acesso. A senha aparece{" "}
        <strong>uma única vez</strong> e não há como recuperá-la depois — só redefinir.
      </p>

      <dl className="m-0 mt-2.5 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1.5">
        <dt className="m-0 text-xs font-semibold">Acesso</dt>
        <dd className="m-0">
          <code className="rounded-sm border border-border bg-surface px-2 py-1 font-mono text-sm text-text-1 select-all">
            {chaveFormatada}
          </code>
        </dd>
        <dt className="m-0 text-xs font-semibold">Senha</dt>
        <dd className="m-0">
          <code className="rounded-sm border border-border bg-surface px-2 py-1 font-mono text-sm text-text-1 select-all">
            {senha}
          </code>
        </dd>
      </dl>

      <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
        <Button size="sm" variant="secondary" onClick={() => copiar(tudo, "Credenciais copiadas.", true)}>
          {copiado ? "Copiadas" : "Copiar acesso e senha"}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => copiar(senha, "Senha copiada.")}>
          Copiar só a senha
        </Button>
        <Button size="sm" variant="ghost" onClick={onFechar}>
          Já anotei
        </Button>
      </div>
    </InfoBanner>
  )
}
