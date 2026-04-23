import { LayoutDashboard, Building2, Users, BarChart3, LogOut, ChevronDown, FileText, Megaphone, PackageSearch, Package, ShoppingBag, UserCheck, Eye, AlertTriangle, Star, BarChart, ClipboardList } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo_principal.png';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useState } from 'react';

const mainItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Organizações', url: '/organizacoes', icon: Building2 },
  { title: 'Equipe', url: '/equipe', icon: Users },
  { title: 'Campanhas', url: '/campanhas', icon: Megaphone },
];

const clienteItems = [
  { title: 'Relatório geral', url: '/clientes/relatorio-geral', icon: ClipboardList },
  { title: 'Visão geral', url: '/clientes/visao-geral', icon: Eye },
  { title: 'Em risco de sumir', url: '/clientes/em-risco', icon: AlertTriangle },
  { title: 'Top clientes', url: '/clientes/top', icon: Star },
  { title: 'Análise avançada', url: '/clientes/analise-avancada', icon: BarChart },
];

const reportItems = [
  { title: 'Consumo IA', url: '/relatorios', icon: FileText },
  { title: 'Consumo Detalhado', url: '/consumo-detalhado', icon: FileText },
  { title: 'Feedbacks', url: '/feedbacks', icon: FileText },
];

const productItems = [
  { title: 'Grupos de produtos', url: '/produtos/grupos-produtos', icon: PackageSearch },
  { title: 'Produtos vendidos', url: '/produtos/relatorio-produtos', icon: ShoppingBag },
  { title: 'Dashboard pedidos', url: '/produtos/dashboard-pedidos', icon: LayoutDashboard },
];

// Shared class strings for the dark theme
// Larger touch targets on mobile (min-h-11 ≈ 44px, Apple HIG recommendation)
const itemBase =
  "relative flex items-center gap-3 rounded-md px-3 py-3 md:py-2.5 min-h-11 md:min-h-0 text-sm text-slate-400 transition-colors hover:bg-slate-900 hover:text-white";
const itemActive =
  "bg-slate-900 text-white font-medium before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-brand-gradient";

const subItemBase =
  "relative flex items-center gap-3 rounded-md px-3 py-2.5 md:py-2 min-h-10 md:min-h-0 text-sm text-slate-500 transition-colors hover:bg-slate-900 hover:text-white";
const subItemActive =
  "bg-slate-900 text-white font-medium before:absolute before:left-0 before:top-1.5 before:bottom-1.5 before:w-[3px] before:rounded-full before:bg-brand-gradient";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { signOut, user } = useAuth();
  const isReportActive = reportItems.some(i => location.pathname === i.url);
  const isProductActive = productItems.some(i => location.pathname === i.url);
  const isClienteActive = clienteItems.some(i => location.pathname === i.url);
  const [reportsOpen, setReportsOpen] = useState(isReportActive);
  const [productsOpen, setProductsOpen] = useState(isProductActive);
  const [clientesOpen, setClientesOpen] = useState(isClienteActive);

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-800 bg-slate-950 [&[data-state]]:bg-slate-950">
      <SidebarContent className="bg-slate-950">
        {!collapsed && (
          <div className="flex justify-center pt-6 pb-4">
            <img src={logo} alt="Proj Sistemas" className="w-28 mx-auto" />
          </div>
        )}
        <SidebarGroup>
          <SidebarMenu>
            {mainItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.url}
                    className={itemBase}
                    activeClassName={itemActive}
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Clientes submenu */}
        <SidebarGroup>
          <Collapsible open={clientesOpen} onOpenChange={setClientesOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={`relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-slate-900 hover:text-white ${
                  isClienteActive ? 'bg-slate-900 text-white font-medium' : 'text-slate-400'
                }`}
              >
                <UserCheck className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">Clientes</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${clientesOpen ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>
            </CollapsibleTrigger>
            {!collapsed && (
              <CollapsibleContent>
                <SidebarMenu className="ml-4 mt-1 border-l border-slate-800 pl-2">
                  {clienteItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={subItemBase}
                          activeClassName={subItemActive}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </CollapsibleContent>
            )}
          </Collapsible>
        </SidebarGroup>

        {/* Produtos submenu */}
        <SidebarGroup>
          <Collapsible open={productsOpen} onOpenChange={setProductsOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={`relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-slate-900 hover:text-white ${
                  isProductActive ? 'bg-slate-900 text-white font-medium' : 'text-slate-400'
                }`}
              >
                <Package className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">Produtos</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${productsOpen ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>
            </CollapsibleTrigger>
            {!collapsed && (
              <CollapsibleContent>
                <SidebarMenu className="ml-4 mt-1 border-l border-slate-800 pl-2">
                  {productItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={subItemBase}
                          activeClassName={subItemActive}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </CollapsibleContent>
            )}
          </Collapsible>
        </SidebarGroup>

        {/* Relatórios submenu */}
        <SidebarGroup>
          <Collapsible open={reportsOpen} onOpenChange={setReportsOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={`relative flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-slate-900 hover:text-white ${
                  isReportActive ? 'bg-slate-900 text-white font-medium' : 'text-slate-400'
                }`}
              >
                <BarChart3 className="h-5 w-5 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left">Relatórios</span>
                    <ChevronDown className={`h-3 w-3 transition-transform ${reportsOpen ? 'rotate-180' : ''}`} />
                  </>
                )}
              </button>
            </CollapsibleTrigger>
            {!collapsed && (
              <CollapsibleContent>
                <SidebarMenu className="ml-4 mt-1 border-l border-slate-800 pl-2">
                  {reportItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className={subItemBase}
                          activeClassName={subItemActive}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </CollapsibleContent>
            )}
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-slate-800 p-3 bg-slate-950">
        {!collapsed && user && (
          <p className="mb-2 truncate text-xs text-slate-500">{user.email}</p>
        )}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className="w-full justify-start gap-2 text-slate-400 hover:bg-slate-900 hover:text-red-400"
          onClick={signOut}
        >
          <LogOut className="h-5 w-5 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
