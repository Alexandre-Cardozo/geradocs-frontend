import { imagemProtegida, requisicaoProtegida } from "@/lib/api/auth-client"

/**
 * A foto de perfil.
 *
 * Ela não viaja no JSON da sessão: um PNG de 300 KB viraria 400 KB de base64 em
 * toda leitura de `/me` (ADR-022). Vem por rota própria, autenticada, e por isso
 * não dá para apontar o `src` de um `<img>` direto para ela — o cabeçalho de
 * autorização não acompanha a tag.
 */

export interface FotoDePerfil {
  mediaType: string
  byteSize: number
  updatedAt: string
}

/** Os formatos que o servidor aceita, para o seletor de arquivo pedir só eles. */
export const FORMATOS_DE_FOTO = "image/png,image/jpeg,image/webp"

/** 512 KB — o mesmo teto do domínio, verificado antes de subir para não gastar a viagem. */
export const TAMANHO_MAXIMO_DA_FOTO = 512 * 1024

export async function enviarFotoDePerfil(arquivo: File): Promise<FotoDePerfil> {
  const corpo = new FormData()
  corpo.append("file", arquivo)
  return requisicaoProtegida<FotoDePerfil>("/me/avatar", { method: "PUT", body: corpo })
}

export async function removerFotoDePerfil(): Promise<void> {
  await requisicaoProtegida<void>("/me/avatar", { method: "DELETE" })
}

/** @returns os bytes, ou `null` quando a pessoa não pôs foto */
export async function obterFotoDePerfil(usuarioId: string): Promise<Blob | null> {
  return imagemProtegida(`/users/${usuarioId}/avatar`)
}
