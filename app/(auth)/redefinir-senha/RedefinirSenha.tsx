"use client"

import Image from "next/image"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useState } from "react"

import { Button, FormField, Input, ValidationMsg } from "@/components/ui"
import { IconArrowRight, IconCheckCircle } from "@/components/ui/icons"
import { useRedefinirSenha } from "@/lib/api/hooks"
import geradocsLogo from "@/public/geradocs-mark-white.png"
import lahhmLogo from "@/public/lahhm-logo-white.png"

export default function RedefinirSenha() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")?.trim() ?? ""
  const redefinir = useRedefinirSenha()
  const [senha, setSenha] = useState("")
  const [confirmacao, setConfirmacao] = useState("")
  const [erro, setErro] = useState("")
  const [concluido, setConcluido] = useState(false)

  const salvar = () => {
    setErro("")
    if (!token) {
      setErro("O link de redefinição está incompleto. Solicite um novo e-mail.")
      return
    }
    if (senha.length < 12 || senha.length > 72) {
      setErro("A nova senha deve ter entre 12 e 72 caracteres.")
      return
    }
    if (senha !== confirmacao) {
      setErro("A confirmação da senha não confere.")
      return
    }
    redefinir.mutate(
      { token, senha },
      {
        onSuccess: () => setConcluido(true),
        onError: (error) =>
          setErro(
            error instanceof Error
              ? error.message
              : "Não foi possível redefinir a senha.",
          ),
      },
    )
  }

  return (
    <div className="flex min-h-dvh flex-col bg-navy">
      <div className="pointer-events-none fixed inset-0 gradient-hero" aria-hidden />
      <div
        className="pointer-events-none fixed top-[-18%] left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-royal/10 blur-3xl"
        aria-hidden
      />

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-4">
        <div className="mb-5 flex flex-col items-center text-center">
          <Image src={geradocsLogo} alt="" width={44} height={46} priority className="object-contain" />
          <div className="mt-2.5 font-display text-3xl font-extrabold tracking-tight text-on-dark">GeraDocs</div>
          <div className="mt-2.5 flex items-center gap-3">
            <span className="h-px w-7 bg-on-dark-border" />
            <span className="text-2xs font-semibold tracking-caps-wide text-electric uppercase">
              Contratações Públicas · Lei 14.133/21
            </span>
            <span className="h-px w-7 bg-on-dark-border" />
          </div>
        </div>

        <div className="w-full max-w-md rounded-card border border-on-dark-border bg-surface p-6 sm:p-7">
          {concluido ? (
            <div className="flex flex-col items-center py-4 text-center">
              <span className="flex text-success"><IconCheckCircle size={40} strokeWidth={2} /></span>
              <h1 className="m-0 mt-3 font-display text-lg font-extrabold text-text-1">Senha Redefinida</h1>
              <p className="m-0 mt-1 mb-5 text-sm text-text-3">Entre novamente usando sua nova senha.</p>
              <Link href="/login" className="no-underline">
                <Button icon={<IconArrowRight size={15} strokeWidth={2.5} />}>Ir Para o Login</Button>
              </Link>
            </div>
          ) : (
            <>
              <h1 className="m-0 mb-1 text-center font-display text-lg font-extrabold text-text-1">Redefinir Senha</h1>
              <p className="m-0 mb-5 text-center text-sm text-text-3">Crie uma senha com 12 a 72 caracteres.</p>
              <div className="flex flex-col gap-4">
                <FormField label="Nova Senha">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={senha}
                    onChange={(event) => setSenha(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && salvar()}
                  />
                </FormField>
                <FormField label="Confirmar Nova Senha">
                  <Input
                    type="password"
                    autoComplete="new-password"
                    value={confirmacao}
                    onChange={(event) => setConfirmacao(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && salvar()}
                  />
                </FormField>
                {erro && <ValidationMsg type="error" msg={erro} />}
                <p id="motivo-redefinir" className="sr-only">
                  Preencha a nova senha e a confirmação.
                </p>
                <Button
                  size="lg"
                  className="w-full font-bold"
                  disabled={redefinir.isPending || senha === "" || confirmacao === ""}
                  ariaDescribedBy="motivo-redefinir"
                  onClick={salvar}
                >
                  {redefinir.isPending ? "Salvando..." : "Salvar Nova Senha"}
                </Button>
                <Link href="/login" className="text-center text-sm font-semibold text-royal no-underline">
                  ← Voltar ao login
                </Link>
              </div>
            </>
          )}
        </div>
      </main>

      <footer className="relative z-10 flex flex-col items-center gap-1 px-4 pb-5 text-center">
        <div className="flex items-center gap-2 text-sm text-on-dark-55">
          GeraDocs é um produto
          <Image src={lahhmLogo} alt="LAHHM" width={80} height={25} className="object-contain opacity-90" />
        </div>
        <div className="text-xs text-on-dark-30">© 2026 LAHHM. Todos os direitos reservados.</div>
      </footer>
    </div>
  )
}
