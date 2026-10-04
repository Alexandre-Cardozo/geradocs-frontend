/**
 * Formato de e-mail, conferido antes de enviar.
 *
 * A mesma expressão do back-end (`EmailFormat.FORMATO`): caracteres ASCII, sem
 * ponto no começo, no fim ou repetido antes do `@`, domínio com ao menos um
 * ponto e terminado em letras. "maria@prefeitura" e "1.%34≈ƒ©@gmail.com" não
 * recebem mensagem nenhuma — e a senha provisória vai por e-mail. Quem decide
 * continua sendo o servidor; isto só evita a viagem para ouvir um "não".
 */
const LOCAL = String.raw`[A-Za-z0-9!#$%&'*+/=?^_\`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_\`{|}~-]+)*`
const ROTULO = String.raw`[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?`
const FORMATO = new RegExp(String.raw`^${LOCAL}@${ROTULO}(?:\.${ROTULO})*\.[A-Za-z]{2,}$`)

export function validaEmail(email: string): boolean {
  return FORMATO.test(email.trim())
}
