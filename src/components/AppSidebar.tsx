import { LayoutDashboard, Building2, Users, BarChart3, LogOut, ChevronDown, FileText, Megaphone, PackageSearch, Package, ShoppingBag } from 'lucide-react';
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

const reportItems = [
  { title: 'Consumo IA', url: '/relatorios', icon: FileText },
  { title: 'Consumo Detalhado', url: '/consumo-detalhado', icon: FileText },
  { title: 'Feedbacks', url: '/feedbacks', icon: FileText },
];

const productItems = [
  { title: 'Grupos de produtos', url: '/grupos-produtos', icon: PackageSearch },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { signOut, user } = useAuth();
  const isReportActive = reportItems.some(i => location.pathname === i.url);
  const isProductActive = productItems.some(i => location.pathname === i.url);
  const [reportsOpen, setReportsOpen] = useState(isReportActive);
  const [productsOpen, setProductsOpen] = useState(isProductActive);

  return (
    <Sidebar collapsible="icon" className="border-r border-slate-200 bg-slate-50 [&[data-state]]:bg-slate-50">
      <SidebarContent className="bg-slate-50">
        {!collapsed && (
          <div className="flex justify-center pt-5 pb-2">
            <img src={logo} alt="Proj Sistemas" className="w-24 mx-auto mb-8" />
          </div>
        )}
        <SidebarGroup>
          <SidebarMenu>
            {mainItems.map((item) => (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.url}
                    className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                    activeClassName="bg-blue-50 text-blue-700 font-medium"
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

        {/* Produtos submenu */}
        <SidebarGroup>
          <Collapsible open={productsOpen} onOpenChange={setProductsOpen}>
            <CollapsibleTrigger asChild>
              <button
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-blue-50 hover:text-blue-700 ${
                  isProductActive ? 'text-blue-700 font-medium' : 'text-slate-600'
                }`}
              >
                <Package className="h-4 w-4 shrink-0" />
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
                <SidebarMenu className="ml-4 mt-1 border-l border-slate-200 pl-2">
                  {productItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className="flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
                          activeClassName="bg-blue-50 text-blue-700 font-medium"
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0" />
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
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors hover:bg-blue-50 hover:text-blue-700 ${
                  isReportActive ? 'text-blue-700 font-medium' : 'text-slate-600'
                }`}
              >
                <BarChart3 className="h-4 w-4 shrink-0" />
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
                <SidebarMenu className="ml-4 mt-1 border-l border-slate-200 pl-2">
                  {reportItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url}
                          className="flex items-center gap-3 rounded-md px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
                          activeClassName="bg-blue-50 text-blue-700 font-medium"
                        >
                          <item.icon className="h-3.5 w-3.5 shrink-0" />
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

      <SidebarFooter className="border-t border-slate-200 p-3 bg-slate-50">
        {!collapsed && user && (
          <p className="mb-2 truncate text-xs text-slate-400">{user.email}</p>
        )}
        <Button
          variant="ghost"
          size={collapsed ? 'icon' : 'sm'}
          className="w-full justify-start gap-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700"
          onClick={signOut}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
