

# Plano: Sistema Completo Proj Sistemas

## Visao Geral

Construir um sistema SaaS com login, dashboard, gestao de organizacoes (bares) e equipe, usando Supabase Auth + RLS + funcao `public.is_admin()` ja existente no banco.

## Estrutura de Arquivos

```text
src/
├── contexts/
│   └── AuthContext.tsx          # Context de autenticacao + perfil + permissoes
├── hooks/
│   └── usePermissions.ts       # Hook para pode_criar/pode_editar/pode_excluir
├── pages/
│   ├── Login.tsx               # Tela de login moderna (dark)
│   ├── Dashboard.tsx           # Resumo com cards
│   ├── Organizacoes.tsx        # Listagem + CRUD de organizacoes
│   └── Equipe.tsx              # Gestao de perfis
├── components/
│   ├── AppSidebar.tsx          # Sidebar dark fixa
│   ├── DashboardLayout.tsx     # Layout wrapper (SidebarProvider + main)
│   ├── ProtectedRoute.tsx      # Redireciona para /login se nao autenticado
│   └── OrganizacaoForm.tsx     # Formulario 17 campos com Tabs
└── App.tsx                     # Rotas atualizadas
```

## Detalhes Tecnicos

### 1. Autenticacao (Login.tsx + AuthContext)
- Tela de login com email/senha usando `supabase.auth.signInWithPassword`
- AuthContext com `onAuthStateChange` (listener ANTES de `getSession`)
- Ao logar, buscar perfil do usuario em `public.perfis` (permissoes) e chamar `public.is_admin()` via RPC para saber se eh admin
- Armazenar no context: `user`, `perfil` (com pode_criar/editar/excluir), `isAdmin`

### 2. Layout Dashboard (DashboardLayout + AppSidebar)
- Sidebar com tema dark fixo (classe `dark` forcada no container da sidebar)
- Itens: Dashboard, Organizacoes, Equipe
- Icones Lucide: LayoutDashboard, Building2, Users
- SidebarTrigger no header para colapsar/expandir
- Usar NavLink para highlight da rota ativa

### 3. Organizacoes (listagem + formulario)
- **Listagem**: Query `select * from organizacoes`
  - Se `isAdmin` = false, filtrar `where created_by = user.id` (feito via RLS no banco, mas tambem no query como fallback)
  - Botoes Novo/Editar/Excluir condicionados a `perfil.pode_criar`, `perfil.pode_editar`, `perfil.pode_excluir`
- **Formulario (OrganizacaoForm.tsx)**: Dialog/Sheet com Tabs (Shadcn)
  - **Aba 1 - Geral**: nome, cnpj, slug (auto-gerado do nome), email, telefone
  - **Aba 2 - Config IA**: prompt (textarea), evo_instancia, link_cardapio, url_cardapio_jina
  - **Aba 3 - Endereco/Status**: logo_url, cidade_estado, endereco_completo, ativado (Switch), ativo (Switch), mensagem_boas_vindas
- Ao salvar: `created_by` = `user.id` automaticamente (insert) 

### 4. Equipe (Equipe.tsx)
- Listar perfis da tabela `public.perfis`
- Exibir nome, email, permissoes (pode_criar/editar/excluir)
- Admin pode editar permissoes; usuario comum so visualiza

### 5. Dashboard (Dashboard.tsx)
- Cards com totais: organizacoes ativas, total equipe, etc.
- Consultas simples ao Supabase

### 6. Rotas (App.tsx)
- `/login` → Login.tsx
- `/` → redirect para `/dashboard`
- `/dashboard` → Dashboard (protegida)
- `/organizacoes` → Organizacoes (protegida)
- `/equipe` → Equipe (protegida)
- ProtectedRoute wrapper redireciona para `/login` se nao autenticado

### 7. Slug Auto-gerado
- Funcao utilitaria `generateSlug(nome)`: lowercase, remove acentos, substitui espacos por hifens

### Premissas
- As tabelas `organizacoes` e `perfis` ja existem no banco Supabase self-hosted
- A funcao `public.is_admin()` ja existe no banco
- RLS ja esta configurado no banco para multi-tenancy

