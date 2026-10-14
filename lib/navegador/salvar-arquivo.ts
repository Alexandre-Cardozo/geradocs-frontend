/**
 * Entrega ao navegador um arquivo baixado pela requisição autenticada.
 *
 * Uma âncora comum não leva o cabeçalho de autorização, então o arquivo vem
 * como `Blob` e sai por um endereço temporário — revogado logo depois: sem
 * isso, cada download deixa o arquivo inteiro preso em memória.
 */
export function salvarArquivo(conteudo: Blob, nome: string): void {
  const endereco = URL.createObjectURL(conteudo)
  const ancora = document.createElement("a")
  ancora.href = endereco
  ancora.download = nome
  ancora.click()
  URL.revokeObjectURL(endereco)
}
