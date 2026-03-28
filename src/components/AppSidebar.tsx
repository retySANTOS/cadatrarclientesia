import { LayoutDashboard, Building2, Users, LogOut } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import logo from '@/assets/logo_principal.png';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Organizações', url: '/organizacoes', icon: Building2 },
  { title: 'Equipe', url: '/equipe', icon: Users },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const { signOut, user } = useAuth();

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
            {navItems.map((item) => (
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
