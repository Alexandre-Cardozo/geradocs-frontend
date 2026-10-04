"use client"

import { useEffect, useId, useRef, useState } from "react"

import { Button, IconCheck, IconCheckCircle, IconClipboard, IconLock } from "@/components/ui"
import { useToast } from "@/components/shared/providers"
import { formatCPF } from "@/lib/auth/cpf"

/** Quanto tempo o ícone de "copiado" fica no lugar do de copiar. */
const CONFIRMACAO_MS = 2000

type Copiavel = "tudo" | "chave" | "senha"

/**
 * Quebra a senha em blocos de quatro só na tela.
 *
 * <p>A senha vai ser ditada por telefone ou passada para um bilhete, e dezesseis
 * caracteres corridos fazem quem lê perder o lugar. Os blocos são espaçamento,
 * não texto: selecionar e copiar à mão devolve a senha sem espaços.
 */
function blocos(senha: string) {
  return senha.match(/.{1,4}/g) ?? [senha]
}

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
 *
 * <p>A caixa aparece depois que o painel de cadastro fecha, muitas vezes fora da
 * área visível: por isso ela recebe o foco ao montar. E fechar sem ter copiado
 * nada pede uma confirmação — é a única ação da tela que não tem volta.
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
  const tituloId = useId()
  const caixa = useRef<HTMLElement>(null)
  const [recemCopiado, setRecemCopiado] = useState<Copiavel | null>(null)
  const [jaCopiou, setJaCopiou] = useState(false)
  const [confirmandoFechar, setConfirmandoFechar] = useState(false)

  const mascarada = chave.includes("*")
  const chaveFormatada = mascarada ? chave : formatCPF(chave)

  useEffect(() => {
    caixa.current?.focus()
  }, [])

  // Recarregar ou fechar a aba some com a senha do mesmo jeito que "Já anotei".
  useEffect(() => {
    const avisar = (evento: BeforeUnloadEvent) => evento.preventDefault()
    window.addEventListener("beforeunload", avisar)
    return () => window.removeEventListener("beforeunload", avisar)
  }, [])

  useEffect(() => {
    if (!recemCopiado) return
    const volta = setTimeout(() => setRecemCopiado(null), CONFIRMACAO_MS)
    return () => clearTimeout(volta)
  }, [recemCopiado])

  const mensagemPronta = () =>
    [
      `Acesso ao GeraDocs: ${window.location.origin}/login`,
      `Login (CPF): ${chaveFormatada}`,
      `Senha provisória: ${senha}`,
      "No primeiro acesso, o sistema pede para criar uma senha nova.",
    ].join("\n")

  const copiar = (qual: Copiavel, texto: string, aviso: string) => {
    void navigator.clipboard.writeText(texto).then(
      () => {
        setRecemCopiado(qual)
        setJaCopiou(true)
        setConfirmandoFechar(false)
        showToast(aviso)
      },
      // Sem permissão de área de transferência o texto continua selecionável:
      // falhar em silêncio deixaria a pessoa achando que copiou.
      () => showToast("Não foi possível copiar. Selecione e copie o texto."),
    )
  }

  const pedirFechar = () => (jaCopiou ? onFechar() : setConfirmandoFechar(true))

  const botaoCopiar = (qual: Exclude<Copiavel, "tudo">, rotulo: string, texto: string, aviso: string) => (
    <Button
      size="sm"
      variant="ghost"
      className="w-8 shrink-0 px-0!"
      icon={recemCopiado === qual ? <IconCheck size={15} /> : <IconClipboard size={15} />}
      onClick={() => copiar(qual, texto, aviso)}
    >
      <span className="sr-only">{recemCopiado === qual ? `${rotulo} copiado` : `Copiar ${rotulo}`}</span>
    </Button>
  )

  return (
    <section
      ref={caixa}
      tabIndex={-1}
      aria-labelledby={tituloId}
      className="rounded-card border border-border bg-surface p-5 outline-none"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex shrink-0 text-success">
          <IconCheckCircle size={20} />
        </span>
        <div className="min-w-0">
          <h3 id={tituloId} className="m-0 font-display text-md font-bold text-text-1">
            {titulo}
          </h3>
          <p className="m-0 mt-0.5 text-base text-text-3">
            Entregue o login e a senha a <strong className="font-semibold text-text-1">{nome}</strong>.
          </p>
        </div>
      </div>

      <dl className="m-0 mt-4 divide-y divide-border-soft rounded-md border border-border bg-ice">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2.5">
          <dt className="m-0 w-full shrink-0 sm:w-36 text-2xs font-semibold tracking-wider text-text-muted uppercase">
            Login (CPF)
          </dt>
          <dd className="m-0 min-w-0 flex-1 font-mono text-md text-text-1 select-all">{chaveFormatada}</dd>
          {!mascarada && botaoCopiar("chave", "CPF", chaveFormatada, "CPF copiado.")}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2.5">
          <dt className="m-0 w-full shrink-0 sm:w-36 text-2xs font-semibold tracking-wider text-text-muted uppercase">
            Senha provisória
          </dt>
          <dd className="m-0 min-w-0 flex-1">
            <code className="flex flex-wrap gap-x-2 font-mono text-md text-text-1 select-all">
              {blocos(senha).map((bloco, i) => (
                <span key={i}>{bloco}</span>
              ))}
            </code>
          </dd>
          {botaoCopiar("senha", "Senha", senha, "Senha copiada.")}
        </div>
      </dl>

      <p className="m-0 mt-3 flex items-start gap-2 text-sm text-tint-warning-fg">
        <span className="mt-0.5 flex shrink-0">
          <IconLock size={14} />
        </span>
        <span>
          A senha aparece <strong>só agora</strong> — depois de fechar, só dá para redefini-la. No
          primeiro acesso, o sistema pede para {nome.split(" ")[0]} criar uma senha nova.
        </span>
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-border-soft pt-4">
        {confirmandoFechar ? (
          <>
            <p className="m-0 mr-1 text-sm text-text-3">
              Nada foi copiado. Depois de fechar, a senha não aparece de novo. Fechar mesmo assim?
            </p>
            <Button size="sm" variant="secondary" onClick={() => setConfirmandoFechar(false)}>
              Voltar
            </Button>
            <Button size="sm" variant="danger-soft" onClick={onFechar}>
              Fechar sem Copiar
            </Button>
          </>
        ) : (
          <>
            <Button
              size="sm"
              icon={recemCopiado === "tudo" ? <IconCheck size={15} /> : <IconClipboard size={15} />}
              onClick={() => copiar("tudo", mensagemPronta(), "Mensagem com login e senha copiada.")}
            >
              {recemCopiado === "tudo" ? "Mensagem Copiada" : "Copiar Mensagem para Envio"}
            </Button>
            <Button size="sm" variant="secondary" onClick={pedirFechar}>
              Já anotei
            </Button>
          </>
        )}
      </div>
    </section>
  )
}
