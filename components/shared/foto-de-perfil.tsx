"use client"

import Image from "next/image"

import { useFotoDePerfil } from "@/lib/api/hooks"

/**
 * O círculo com o rosto — ou com as iniciais, quando não há foto.
 *
 * <p>Um componente só, usado na barra lateral, no perfil e na ficha do servidor:
 * a foto vem de rota autenticada e precisa virar object URL antes de entrar num
 * `<img>`, e repetir isso em cada tela é como uma delas acaba mostrando iniciais
 * para quem já pôs foto.
 */
export function FotoDePerfil({
  usuarioId,
  iniciais,
  tamanho,
  className = "",
}: {
  usuarioId: string | undefined
  iniciais: string
  /** Lado do círculo em pixels. */
  tamanho: number
  className?: string
}) {
  const { url } = useFotoDePerfil(usuarioId)
  const estilo = { width: tamanho, height: tamanho }

  if (url) {
    return (
      <Image
        src={url}
        alt={`Foto de perfil de ${iniciais}`}
        width={tamanho}
        height={tamanho}
        unoptimized
        style={estilo}
        className={`rounded-full object-cover ${className}`}
      />
    )
  }
  return (
    <span
      style={estilo}
      className={`flex items-center justify-center rounded-full font-bold text-on-dark gradient-user ${className}`}
      // As iniciais são decoração: o nome já está escrito ao lado em toda tela
      // que usa este componente, e lê-lo duas vezes só atrapalha.
      aria-hidden
    >
      {iniciais}
    </span>
  )
}
