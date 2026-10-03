#!/usr/bin/env node
/**
 * O gate de dependência vulnerável, com exceções que vencem.
 *
 * `npm audit --audit-level=high` não tem como dizer "este aviso eu já li": um
 * aviso sem versão corrigida reprova toda PR até alguém desligar o gate, e gate
 * desligado ninguém religa. Foi o que o braces trouxe (GHSA-vfj7-8cjw-p6xm, sem
 * correção publicada), por dentro do eslint-config-next.
 *
 * As regras:
 * - O que vai para o navegador (`--omit=dev`) não tem exceção. Aviso alto ou
 *   crítico ali reprova, como antes.
 * - Ferramenta de desenvolvimento pode ter exceção, uma por aviso, em
 *   `auditoria-excecoes.json`, com motivo e data de revisão. Vencida a data, o
 *   aviso volta a reprovar: a exceção é um prazo, não um esquecimento.
 * - Aviso que não está na lista reprova, mesmo em ferramenta de desenvolvimento.
 */
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const NIVEIS_QUE_REPROVAM = new Set(["high", "critical"])
const hoje = new Date().toISOString().slice(0, 10)

function auditar(...argumentos) {
  try {
    return JSON.parse(
      execFileSync("npm", ["audit", "--json", ...argumentos], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "inherit"],
      }),
    )
  } catch (falha) {
    // `npm audit` sai com 1 quando encontra aviso; o relatório vem igual.
    if (falha.stdout) return JSON.parse(falha.stdout)
    throw falha
  }
}

/** Os avisos (GHSA) que fazem um pacote aparecer, seguindo quem depende de quem. */
function avisosDe(nome, vulnerabilidades, visitados = new Set()) {
  if (visitados.has(nome)) return []
  visitados.add(nome)
  return (vulnerabilidades[nome]?.via ?? []).flatMap((origem) =>
    typeof origem === "string"
      ? avisosDe(origem, vulnerabilidades, visitados)
      : [{ id: origem.url.split("/").pop(), titulo: origem.title, pacote: origem.name }],
  )
}

/** Avisos altos e críticos do relatório, um por id. */
function avisosQueReprovam(relatorio) {
  const vulnerabilidades = relatorio.vulnerabilities ?? {}
  const avisos = new Map()
  for (const [nome, vulnerabilidade] of Object.entries(vulnerabilidades)) {
    if (!NIVEIS_QUE_REPROVAM.has(vulnerabilidade.severity)) continue
    for (const aviso of avisosDe(nome, vulnerabilidades)) avisos.set(aviso.id, aviso)
  }
  return [...avisos.values()]
}

const excecoes = new Map(
  JSON.parse(readFileSync(new URL("../auditoria-excecoes.json", import.meta.url), "utf8")).map(
    (excecao) => [excecao.id, excecao],
  ),
)

const reprovacoes = []

for (const aviso of avisosQueReprovam(auditar("--omit=dev"))) {
  reprovacoes.push(`${aviso.id} (${aviso.pacote}) chega ao navegador: ${aviso.titulo}`)
}

const vistos = new Set()
for (const aviso of avisosQueReprovam(auditar())) {
  vistos.add(aviso.id)
  if (reprovacoes.some((linha) => linha.startsWith(aviso.id))) continue
  const excecao = excecoes.get(aviso.id)
  if (!excecao) {
    reprovacoes.push(`${aviso.id} (${aviso.pacote}) sem exceção registrada: ${aviso.titulo}`)
  } else if (excecao.revisarAte < hoje) {
    reprovacoes.push(`${aviso.id} (${aviso.pacote}) com exceção vencida em ${excecao.revisarAte}: reavalie`)
  } else {
    console.log(`Tolerado até ${excecao.revisarAte}: ${aviso.id} (${aviso.pacote}) — ${excecao.motivo}`)
  }
}

for (const id of excecoes.keys()) {
  if (!vistos.has(id)) console.log(`Exceção sem uso: ${id} não aparece mais no audit; pode sair da lista.`)
}

if (reprovacoes.length > 0) {
  for (const linha of reprovacoes) console.error(`::error::${linha}`)
  process.exit(1)
}
console.log("Nenhuma dependência vulnerável sem exceção registrada.")
