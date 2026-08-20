# Setup inicial — front-end GeraDocs

## 1. Dependências

```bash
npm install
```

O script `prepare` ativa os hooks de `.githooks/` automaticamente: varredura de
segredos, ESLint nos arquivos em stage e type-check. A varredura precisa do
gitleaks (`brew install gitleaks`); sem ele o hook avisa e segue, e o CI barra.

## 2. Back-end

A autenticação é real: sem a API no ar, o login não funciona e o app mostra
"Servidor Indisponível". Suba o back-end conforme
[`../../geradocs-backend/docs/SETUP_INICIAL.md`](../../geradocs-backend/docs/SETUP_INICIAL.md).

Só copie o `.env` se a API **não** estiver em `http://localhost:8080/api/v1`:

```bash
cp .env.example .env.local
```

## 3. Rodar

```bash
npm run dev
```

Acesse <http://localhost:3000/GeraDocsFrontend>. O `basePath` existe porque o app
é publicado no GitHub Pages sob esse caminho — a raiz sem ele devolve 404.

Você precisa de uma conta ativa cadastrada no back-end. Não há usuário de
demonstração desde a integração real.

## 4. Verificar antes de commitar

```bash
npm run check     # lint + aderência ao DS + type-check + testes
npm run coverage  # testes com a catraca de cobertura
npm run build     # export estático, como no deploy
```

## 5. Onde continuar

[`../../geradocs-backend/docs/ordem-de-implementacao.md`](../../geradocs-backend/docs/ordem-de-implementacao.md)
— o próximo passo está marcado na tabela de estado da execução.
