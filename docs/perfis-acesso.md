# Autenticação, multi-entidade e perfis de acesso

Referência do controle de acesso do GeraDocs: quem entra, o que cada um vê e como os dados são isolados por entidade. Quem for mexer em login, navegação ou nas telas de administração lê isto antes.

Autenticação, sessão e administração de acesso são **reais**: o frontend usa a API Spring Boot, com JWT em memória e refresh token em cookie `HttpOnly`. A camada de telas ainda usa `lib/api/client.ts` como fachada, mas organizações, departamentos e usuários são encaminhados para `lib/api/access-client.ts`; somente processos, documentos e demais módulos sem backend continuam mockados.

## Os três perfis de acesso

`PerfilAcesso` (`lib/types.ts`) — distinto de `PapelUsuario` (papel no fluxo de aprovação). Um usuário tem **um** perfil de acesso e atua com papéis de workflow conforme a etapa.

| Perfil | Escopo | Pode |
|---|---|---|
| **Administrador Geral** (`admin_geral`) | Sistema todo (LAHHM) | Cadastrar entidades; criar servidores e vinculá-los a qualquer entidade; visão agregada. Não opera o fluxo de processos. **Não se cadastra pela interface**: a conta nasce com a inicialização do banco, e o perfil não é oferecido no formulário de servidores. |
| **Coordenador** (`coordenador`) | Uma entidade | Tudo de servidor **+** gerir a sua entidade: secretarias, PCA, identidade visual, cabeçalho/rodapé, e cadastrar/ver servidores (com último acesso). |
| **Servidor** (`servidor`) | Uma entidade | Editar o próprio perfil; criar processos e gerar documentos; consultar o fluxo de contratação. |

## Matriz de rotas × perfil (RBAC)

Fonte única: `lib/auth/acesso.ts` (`rotaPermitida`, `navPrincipal`, `navSistema`). A guarda `components/layout/GuardaSessao.tsx` aplica no shell.

| Rota | admin_geral | coordenador | servidor |
|---|:---:|:---:|:---:|
| `/` (dashboard / painel do sistema) | ✅ (painel admin) | ✅ | ✅ |
| `/processos`, `/documentos` | ❌ | ✅ | ✅ |
| `/configuracoes/*` (timbre, secretarias, PCA, usuários) | ❌ | ✅ | ❌ |
| `/admin/entidades`, `/admin/servidores` | ✅ | ❌ | ❌ |
| `/perfil` (Meu Perfil) | ❌¹ | ✅ | ✅ |

¹ O admin geral não tem entidade nem perfil editável de servidor; gerencia-se pela área de Administração.

Rota não permitida → redireciona para `/`. Sem sessão → redireciona para `/login`.

## Modelo multi-entidade

- Cada **entidade é um `Tenant`** (com `id`), com identidade/PCA/secretarias próprias. Entidade é o termo do domínio porque quem contrata o GeraDocs pode ser prefeitura, câmara, autarquia ou consórcio.
- **Cadastrar uma entidade pede o nome e o tipo.** Nada mais: o resto é configuração do coordenador da entidade. A unidade administrativa saiu do modelo do front — não era pedida, não era exibida e não servia a nenhuma tela.
- **Desativar tem guarda dos dois lados.** Entidade com usuário vinculado e servidor com processo em andamento não são desativados; a regra vive no backend (`DeactivateOrganizationUseCase`, `DeactivateUserUseCase`) e a interface a antecipa onde tem como: o botão da entidade nasce desabilitado, e a recusa do servidor aparece na tela com o motivo que veio da API.
- `Processo` e `DocumentoGerado` carregam `entidadeId`. As consultas (`getProcessos`, `getDocumentos`, `getEstatisticas`, `getFilaAprovacoes`) filtram pela entidade da sessão; o **admin geral vê tudo**.
- `criarProcesso` carimba o `entidadeId` e o `responsavel` do usuário logado.

## Login e sessão

- Tela `app/(auth)/login` — fora do `AppShell`, no route group `(auth)`. Login por **CPF + senha**.
- `validaCPF` (`lib/auth/cpf.ts`) confere os dígitos verificadores. Erro de login é **genérico** ("CPF ou senha inválidos") — não revela se o CPF existe.
- O access token JWT fica somente em memória. O refresh token rotativo fica no cookie `HttpOnly`; `useSessao()` renova a sessão e confirma `GET /me` após um reload.
- Recuperação de senha tem resposta genérica e é concluída pelo backend com token de uso único.

## Contas locais

As contas são criadas e mantidas no PostgreSQL do backend. Não há CPFs, senhas padrão ou exceção de validação no frontend. Para testar, use uma conta ativa provisionada no backend ou crie uma pela área administrativa com uma senha inicial de ao menos 12 caracteres.

## Lacunas conhecidas

- A autorização efetiva é aplicada pelo backend; a guarda de rota do frontend é apenas uma melhoria de experiência, não uma barreira de segurança.
- As telas oferecem criação, consulta e desativação. Edição e transferência explícita de vínculo entre organizações ainda precisam de UX própria.
- Processos, documentos, arquivos, identidade visual, cabeçalho/rodapé e PCA aguardam seus contratos e persistência no backend.
