import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut } from 'lucide-react';
import logoCp from '@/assets/logo_cp.png';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut } = useAuth();
  const initial = user?.email?.charAt(0).toUpperCase() ?? 'U';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-slate-200 px-6 bg-white">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <img src={logoCp} alt="CP" className="h-8 w-auto" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 outline-none">
                  <div className="w-10 h-10 rounded-full bg-brand-gradient text-white flex items-center justify-center font-semibold text-sm shadow-sm">
                    {initial}
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 text-xs text-muted-foreground truncate">{user?.email}</div>
                <DropdownMenuItem onClick={signOut} className="gap-2 text-red-600 cursor-pointer">
                  <LogOut className="h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 p-8 overflow-auto">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
