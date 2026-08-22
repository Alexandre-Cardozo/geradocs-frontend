/**
 * O que a interface mostra e o back-end ainda não fornece.
 *
 * `tenantDa()` fabrica parte da configuração do órgão porque a API de acesso
 * ainda não a persiste: o timbre, o cabeçalho e o rodapé nascem de um valor
 * padrão, não de uma escolha da prefeitura.
 *
 * O exercício do PCA saiu desta lista em 22/08/2026, no passo 10.5: o ano agora
 * é o do plano importado, e não o do calendário.
 *
 * **Configuração inventada exibida como real é pior que campo vazio.** Campo
 * vazio a pessoa preenche; valor plausível ela confere uma vez, aceita, e o
 * documento sai com um cabeçalho que ninguém decidiu — e que ela vai jurar ter
 * configurado.
 *
 * Esta lista é a fonte única da marcação na tela. Quando um campo passar a vir
 * do servidor, remover a entrada daqui apaga o aviso de todos os lugares — e o
 * teste de guarda-corpo cobra que cada entrada diga em que bloco ela sai.
 */

export type CampoSintetico =
  | "timbrado"
  | "cabecalho"
  | "rodape"
  | "parecerDfd"
  | "indicadores"
  | "acervoDocumento"

export interface DadoSintetico {
  /** Como o campo aparece na tela. */
  rotulo: string
  /** De onde o valor sai hoje, em uma frase. */
  origem: string
  /**
   * Bloco da ordem de implementação em que o campo passa a vir do servidor.
   *
   * O guarda-corpo exige o formato "Bloco N", e é isso que impede a lista de
   * virar permanente. Ele não tem como cobrar que o bloco declarado exista — em
   * 22/08/2026 três campos apontavam para o Bloco 10, que não os entregava, e
   * dois para um Bloco 12 que ainda não estava no plano. Os dois lados foram
   * corrigidos: os rótulos aqui e os passos lá.
   */
  saiEm: string
}

export const DADOS_SINTETICOS: Record<CampoSintetico, DadoSintetico> = {
  timbrado: {
    rotulo: "Timbre ativado",
    origem: "Ligado por padrão — a prefeitura ainda não escolheu.",
    saiEm: "Bloco 11",
  },
  cabecalho: {
    rotulo: "Cabeçalho",
    origem: "Montado do nome e da unidade do órgão, em maiúsculas.",
    saiEm: "Bloco 11",
  },
  rodape: {
    rotulo: "Rodapé",
    origem: "Texto padrão da plataforma, igual para todo órgão.",
    saiEm: "Bloco 11",
  },
  parecerDfd: {
    rotulo: "Parecer do DFD",
    origem: "Achados e nota fixos, iguais para todo processo — nenhum modelo leu este arquivo.",
    saiEm: "Bloco 12",
  },
  indicadores: {
    rotulo: "Indicadores",
    origem: "Contagens de demonstração; não refletem o acervo do órgão.",
    saiEm: "Bloco 12",
  },
  acervoDocumento: {
    rotulo: "Identificador, formato e tamanho do arquivo",
    origem: "Estimados por tipo de documento — o arquivo em si ainda não é gerado.",
    saiEm: "Bloco 11",
  },
}

export const CAMPOS_SINTETICOS = Object.keys(DADOS_SINTETICOS) as CampoSintetico[]
