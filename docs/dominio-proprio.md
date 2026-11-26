# Domínio próprio: govpro.com.br (§128)

O QR do carimbo de todo documento gerado abre `https://govpro.com.br/?documento={código}`. Para ele chegar à página da GovPro, o domínio precisa apontar para o GitHub Pages deste repositório. O build já se ajusta sozinho: o prefixo da publicação vem do `configure-pages` (`/geradocs-frontend` em `github.io`, vazio com domínio próprio).

A ordem importa: configurar o domínio no Pages **antes** do DNS deixa o site fora do ar, porque o `github.io` passa a redirecionar para um domínio que ainda não responde.

## 1. DNS (no registro do domínio)

Domínio raiz `govpro.com.br`:

| Tipo | Nome | Valor |
|------|------|-------|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| AAAA | @ | 2606:50c0:8000::153 |
| AAAA | @ | 2606:50c0:8001::153 |
| AAAA | @ | 2606:50c0:8002::153 |
| AAAA | @ | 2606:50c0:8003::153 |
| CNAME | www | alexandre-cardozo.github.io |

Confirmar com `dig +short govpro.com.br` (os quatro IPs acima) antes de seguir.

Recomendado: verificar o domínio na conta do GitHub (Settings da conta, Pages, Verified domains). Isso impede que outro repositório reivindique o domínio.

## 2. Domínio no Pages

Settings do repositório, Pages, Custom domain: `govpro.com.br`. Ou pelo terminal:

```bash
gh api -X PUT repos/Alexandre-Cardozo/geradocs-frontend/pages -f cname=govpro.com.br
```

Esperar o certificado e marcar **Enforce HTTPS**.

## 3. Publicar de novo

O build precisa rodar com o domínio já configurado, para sair sem o prefixo:

```bash
gh workflow run deploy.yml --repo Alexandre-Cardozo/geradocs-frontend
```

No log do passo "Build with Next.js" deve aparecer `Publicação em govpro.com.br, prefixo ''`. Entre o passo 2 e o fim deste deploy o site fica alguns minutos sem os arquivos estáticos.

## 4. Back-end (variáveis no Render)

- `CORS_ALLOWED_ORIGINS`: incluir `https://govpro.com.br` (e `https://www.govpro.com.br`, se usado).
- `PASSWORD_RESET_FRONTEND_URL`: `https://govpro.com.br/redefinir-senha`.

## 5. Conferir

- `https://govpro.com.br/` abre a página da GovPro; `https://govpro.com.br/?documento=ABCD-1234-EF56` também.
- `https://govpro.com.br/login/` entra no sistema, e `/painel/` abre depois do login.
- `https://alexandre-cardozo.github.io/geradocs-frontend/` redireciona para o domínio.
