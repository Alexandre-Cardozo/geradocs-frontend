"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import geradocsLogo from "@/public/geradocs-mark-white.png";
import lahhmLogo from "@/public/lahhm-logo-white.png";

import { Button, FormField, Input, ValidationMsg } from "@/components/ui";
import { IconArrowRight, IconCheckCircle } from "@/components/ui/icons";
import { useLogin, useRecuperarSenha, useSessao } from "@/lib/api/hooks";
import { IDENTIFICADOR, mensagemCredencialRecusada } from "@/lib/auth/identificador";

export default function Login() {
  const router = useRouter();
  const sessao = useSessao();
  const login = useLogin();
  const recuperar = useRecuperarSenha();

  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [modoRecuperar, setModoRecuperar] = useState(false);
  const [emailRecuperar, setEmailRecuperar] = useState("");
  const [recuperado, setRecuperado] = useState(false);

  // Já logado → vai direto para o app (efeito, nunca durante o render).
  const jaLogado = sessao.isSuccess && sessao.data != null;
  useEffect(() => {
    if (jaLogado) router.replace("/");
  }, [jaLogado, router]);

  const entrar = () => {
    setErro("");
    login.mutate(
      { identificador, senha },
      {
        onSuccess: () => router.replace("/"),
        onError: (e) =>
          setErro(e instanceof Error ? e.message : mensagemCredencialRecusada()),
      },
    );
  };

  return (
    <div className="flex min-h-dvh flex-col bg-navy">
      {/* Fundo institucional navy→petroleum (fixo — nunca rola), padrão flat do DS */}
      <div className="pointer-events-none fixed inset-0 gradient-hero" aria-hidden />
      <div
        className="pointer-events-none fixed top-[-18%] left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-royal/10 blur-3xl"
        aria-hidden
      />

      {/* Conteúdo central — marca + card, centralizados no espaço disponível */}
      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 py-4">
        {/* Marca do produto — símbolo + wordmark + tagline entre filetes */}
        <div className="mb-5 flex flex-col items-center text-center">
          <Image
            src={geradocsLogo}
            alt=""
            width={44}
            height={46}
            priority
            className="object-contain"
          />
          <div className="mt-2.5 font-display text-3xl font-extrabold tracking-tight text-on-dark">
            GeraDocs
          </div>
          <div className="mt-2.5 flex items-center gap-3">
            <span className="h-px w-7 bg-on-dark-border" />
            <span className="text-2xs font-semibold tracking-caps-wide text-electric uppercase">
              Contratações Públicas · Lei 14.133/21
            </span>
            <span className="h-px w-7 bg-on-dark-border" />
          </div>
        </div>

        {/* Card de login */}
        <div className="w-full max-w-md rounded-card border border-on-dark-border bg-surface p-6 sm:p-7">
          {!modoRecuperar ? (
            <>
              <h1 className="m-0 mb-4 text-center font-display text-lg font-extrabold tracking-tight text-text-1">
                Acesse sua conta
              </h1>

              <div className="flex flex-col gap-3.5">
                <FormField label={IDENTIFICADOR.rotulo}>
                  <Input
                    value={identificador}
                    onChange={(e) =>
                      setIdentificador(IDENTIFICADOR.formata(e.target.value))
                    }
                    onKeyDown={(e) => e.key === "Enter" && entrar()}
                    placeholder={IDENTIFICADOR.placeholder}
                    inputMode={IDENTIFICADOR.inputMode}
                    autoComplete={IDENTIFICADOR.autoComplete}
                  />
                </FormField>
                <FormField label="Senha">
                  <Input
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && entrar()}
                    type="password"
                    placeholder="Sua senha"
                    autoComplete="current-password"
                  />
                </FormField>

                {erro && <ValidationMsg type="error" msg={erro} />}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setModoRecuperar(true);
                      setErro("");
                      setRecuperado(false);
                    }}
                    className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-royal"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <Button
                  size="lg"
                  className="w-full font-bold"
                  icon={<IconArrowRight size={15} strokeWidth={2.5} />}
                  disabled={
                    login.isPending || identificador.trim() === "" || senha === ""
                  }
                  onClick={entrar}
                >
                  {login.isPending ? "Entrando..." : "Entrar"}
                </Button>
              </div>

            </>
          ) : recuperado ? (
            <div className="flex flex-col items-center py-4 text-center">
              <span className="flex text-success">
                <IconCheckCircle size={40} strokeWidth={2} />
              </span>
              <h1 className="m-0 mt-3 font-display text-lg font-extrabold text-text-1">
                Verifique seu e-mail
              </h1>
              <p className="m-0 mt-1 mb-5 text-sm text-text-3">
                Se houver uma conta associada, enviamos as instruções para
                redefinir a senha.
              </p>
              <Button
                variant="secondary"
                onClick={() => setModoRecuperar(false)}
              >
                Voltar ao login
              </Button>
            </div>
          ) : (
            <>
              <h1 className="m-0 font-display text-lg font-extrabold tracking-tight text-text-1">
                Recuperar senha
              </h1>
              <p className="m-0 mt-1 mb-5 text-sm text-text-3">
                Informe o e-mail cadastrado e enviaremos as instruções de
                redefinição.
              </p>
              <div className="flex flex-col gap-4">
                <FormField label="E-mail">
                  <Input
                    value={emailRecuperar}
                    onChange={(e) => setEmailRecuperar(e.target.value)}
                    type="email"
                    placeholder="seu.email@prefeitura.gov.br"
                    autoComplete="email"
                  />
                </FormField>
                <Button
                  size="lg"
                  className="w-full font-bold"
                  disabled={recuperar.isPending || emailRecuperar.trim() === ""}
                  onClick={() =>
                    recuperar.mutate(emailRecuperar, {
                      onSuccess: () => setRecuperado(true),
                      onError: (e) =>
                        setErro(
                          e instanceof Error
                            ? e.message
                            : "Não foi possível solicitar a recuperação.",
                        ),
                    })
                  }
                >
                  {recuperar.isPending ? "Enviando..." : "Enviar instruções"}
                </Button>
                {erro && <ValidationMsg type="error" msg={erro} />}
                <button
                  type="button"
                  onClick={() => setModoRecuperar(false)}
                  className="cursor-pointer border-0 bg-transparent p-0 text-sm font-semibold text-royal"
                >
                  ← Voltar ao login
                </button>
              </div>
            </>
          )}
        </div>
      </main>

      {/* Rodapé — proporcional, ancorado ao fim da tela */}
      <footer className="relative z-10 flex flex-col items-center gap-1 px-4 pb-5 text-center">
        <div className="flex items-center gap-2 text-sm text-on-dark-55">
          GeraDocs é um produto
          <Image
            src={lahhmLogo}
            alt="LAHHM"
            width={80}
            height={25}
            className="object-contain opacity-90"
          />
        </div>
        <div className="text-xs text-on-dark-40">
          Precisa de ajuda?{" "}
          <a
            href="mailto:contato@lahhm.com.br"
            className="font-medium text-on-dark-55 no-underline hover:text-electric"
          >
            contato@lahhm.com.br
          </a>
        </div>
        <div className="text-xs text-on-dark-30">
          © 2026 LAHHM. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}
