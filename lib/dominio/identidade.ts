/**
 * Como o nome de uma pessoa é apresentado na interface.
 *
 * Existia em três cópias — no mock, no cliente de autenticação e no de acesso —
 * e elas **divergiam**: para um nome de uma palavra só, duas devolviam "MM" e a
 * terceira devolvia "M". O mesmo servidor aparecia com avatares diferentes
 * conforme a tela que carregou o dado.
 */

/** Primeiro nome, para saudação e tratamento. */
export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/).filter(Boolean)[0] ?? nome
}

/**
 * Iniciais do avatar: primeira letra do nome e primeira do último sobrenome.
 *
 * Nome de uma palavra só rende **uma** inicial, não a mesma letra repetida —
 * "Madonna" é "M", e não "MM". Nome vazio rende "?", que diz que falta dado, em
 * vez de um avatar em branco.
 */
export function iniciaisDe(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return "?"
  // `partes` já veio filtrada, então primeira e última existem e não são vazias.
  // Encadear `?.` aqui exigiria fallbacks que nenhuma entrada alcança.
  const primeira = partes[0]![0]!
  const ultima = partes.length > 1 ? partes[partes.length - 1]![0]! : ""
  return `${primeira}${ultima}`.toUpperCase()
}
