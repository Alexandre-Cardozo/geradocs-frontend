import { DADOS_SINTETICOS, type CampoSintetico } from "@/lib/dominio"

/**
 * Marca um valor que a interface mostra e o back-end ainda não fornece.
 *
 * Deliberadamente discreta e deliberadamente presente: um alerta grande em
 * quatro campos de uma tela de configuração vira ruído e se aprende a ignorar;
 * nenhuma marca faz o servidor jurar que configurou o que a plataforma inventou.
 */
export function MarcaSintetica({ campo }: { campo: CampoSintetico }) {
  const dado = DADOS_SINTETICOS[campo]
  return (
    <span className="mt-1 inline-flex flex-wrap items-baseline gap-1.5 text-2xs text-text-muted">
      <span className="rounded-sm bg-tint-warning-bg px-1.5 py-0.5 font-semibold text-tint-warning-fg">
        Ainda não vem do servidor
      </span>
      <span>
        {dado.origem} Passa a vir do servidor no {dado.saiEm}.
      </span>
    </span>
  )
}
