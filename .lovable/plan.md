

## Refatoração de Layout Global, Sidebar e Dashboard

Refatoração visual aplicando a identidade do logo **CP** (gradiente laranja → roxo) em toda a navegação principal, com foco em hierarquia, contraste e modernidade.

### 1. Identidade Visual & Logo

- Copiar o logo enviado para `src/assets/logo_cp.png` (substitui referências ao `logo_principal.png` apenas no header e sidebar).
- Adicionar tokens de gradiente da marca em `src/index.css` e `tailwind.config.ts`:
  - `--brand-gradient: linear-gradient(135deg, #F25C29 0%, #2E1A87 100%)` (laranja do "C" → roxo do "P").
  - Utilitários: `bg-brand-gradient`, `text-brand-gradient`, `border-brand-gradient`.
- Substituir o texto **"Proj Sistemas"** no header (`DashboardLayout.tsx`) pelo logo (altura ~32px) ao lado do `SidebarTrigger`.
- Avatar do usuário no header passa a usar `bg-brand-gradient` em vez do laranja sólido.

### 2. Sidebar — tema escuro com destaque gradiente

Arquivo: `src/components/AppSidebar.tsx`

- Background: `bg-slate-950` (com override no `<Sidebar>` e `<SidebarContent>` / `<SidebarFooter>`).
- Borda direita: `border-slate-800`.
- Logo no topo: usa `logo_principal.png` atual em versão maior, centralizado, com mais respiro (`pt-6 pb-4`).
- Itens de menu:
  - Padding aumentado: `px-3 py-2.5` (antes `py-2`), gap `gap-3`.
  - Cor padrão: `text-slate-400`; hover: `text-white bg-slate-900`.
  - Ícones uniformizados em `h-5 w-5` (todos os níveis), `stroke-width` padrão.
  - **Item ativo**: barra lateral esquerda de 3px com `bg-brand-gradient` + fundo `bg-slate-900` + texto branco. Implementado via classe `activeClassName` no `NavLink` com pseudo-elemento ou `border-l-[3px]` com gradiente aplicado via `before:` Tailwind arbitrary.
- Submenus (Clientes / Produtos / Relatórios):
  - Trigger no mesmo estilo dos itens principais.
  - Conteúdo com `border-l border-slate-800` (em vez de slate-200), itens filhos `text-slate-500` → hover `text-white`.
- Footer: e-mail `text-slate-500`, botão "Sair" `text-slate-400 hover:bg-slate-900 hover:text-red-400`.

### 3. Layout Global

Arquivo: `src/components/DashboardLayout.tsx`

- `bg-slate-50` → mantém-se (já é cinza claro positivo).
- Header: mantém `bg-white` + `border-slate-200`, agora exibindo logo em vez de texto.
- `<main>`: `p-8` mantido; conteúdo dos filhos define o gap interno.

### 4. Dashboard — Cards de Métricas

Arquivo: `src/pages/Dashboard.tsx`

- Saudação personalizada acima dos cards:
  - `Olá, {primeiroNome}! 👋` (extrai do `user.email` antes do `@`, capitalizado) em `text-2xl font-bold text-slate-800`.
  - Subtítulo: `Bem-vindo de volta — aqui está o resumo da operação` em `text-sm text-slate-500`.
- Grid: `grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`.
- Cada card:
  - `rounded-xl border border-slate-200/70 shadow-sm bg-white p-5`.
  - **Hover**: `hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-default`.
  - Layout horizontal: ícone à **esquerda** (container `h-12 w-12 rounded-xl` com fundo da cor a 10% — ex. `bg-blue-500/10`, ícone `h-6 w-6 text-blue-600`) + bloco de texto à direita (label `text-sm text-slate-500`, valor `text-3xl font-extrabold tabular-nums text-slate-900`).
- Cores mantidas (azul, laranja, esmeralda) para diferenciar as métricas — alinhadas à paleta do logo (laranja em "Organizações Ativas").

### 5. Detalhes técnicos

```text
Arquivos modificados:
├─ src/assets/logo_cp.png            (novo — copiado do upload)
├─ src/index.css                     (+ utilitário .bg-brand-gradient)
├─ tailwind.config.ts                (+ backgroundImage brand-gradient)
├─ src/components/DashboardLayout.tsx (logo no header, avatar gradiente)
├─ src/components/AppSidebar.tsx     (tema dark + indicador ativo gradiente)
└─ src/pages/Dashboard.tsx           (saudação + cards refatorados)
```

Nenhuma alteração de lógica/dados — apenas estilo, markup e novo asset. Nenhuma dependência nova.

