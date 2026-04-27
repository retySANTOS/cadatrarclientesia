import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, UserCog } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import logoCp from '@/assets/logo_cp.png';
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, signOut, perfil, organizacaoId, isAdmin } = useAuth();
  const [orgData, setOrgData] = useState<{ nome: string; logo_url: string } | null>(null);
  useEffect(() => {
    if (!organizacaoId) return;
    supabase.from('organizacao').select('nome, logo_url').eq('id', organizacaoId).single()
      .then(({ data }) => { if (data) setOrgData(data as { nome: string; logo_url: string }); });
  }, [organizacaoId]);
  const initial = ((perfil?.nome ?? user?.email ?? 'U').charAt(0)).toUpperCase();
  const [profileOpen, setProfileOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);

  const handleOpenProfile = () => {
    setNewEmail(user?.email ?? '');
    setNewPassword('');
    setProfileOpen(true);
  };

  const handleSaveProfile = async () => {
    setProfileSaving(true);
    const updates: { email?: string; password?: string } = {};
    if (newEmail && newEmail !== user?.email) updates.email = newEmail;
    if (newPassword.length >= 6) updates.password = newPassword;
    if (Object.keys(updates).length === 0) {
      toast.info('Nenhuma alteração para salvar.');
      setProfileSaving(false);
      return;
    }
    const { error } = await supabase.auth.updateUser(updates);
    if (error) {
      toast.error('Erro ao atualizar: ' + error.message);
    } else {
      if (updates.email) toast.success('Confirmação enviada para o novo e-mail!');
      else toast.success('Senha atualizada com sucesso!');
      setProfileOpen(false);
    }
    setProfileSaving(false);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-slate-50">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center justify-between border-b border-slate-200 px-6 bg-white">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <img src={logoCp} alt="CP" className="h-8 w-auto" />
              <span className="text-sm font-semibold text-slate-700 hidden sm:block">Proj Sistemas</span>
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
                <div className="px-3 py-2 text-xs text-muted-foreground truncate">{perfil?.nome ?? user?.email}</div>
                <DropdownMenuItem onClick={handleOpenProfile} className="gap-2 cursor-pointer">
                  <UserCog className="h-4 w-4" /> Meus Dados
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="gap-2 text-red-600 cursor-pointer">
                  <LogOut className="h-4 w-4" /> Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">{children}</main>
          <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Meus Dados</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="profile-email">E-mail</Label>
                  <Input
                    id="profile-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="Novo e-mail"
                  />
                  <p className="text-xs text-muted-foreground">Uma confirmação será enviada para o novo e-mail.</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-password">Nova senha</Label>
                  <Input
                    id="profile-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setProfileOpen(false)}>Cancelar</Button>
                <Button onClick={handleSaveProfile} disabled={profileSaving}>
                  {profileSaving ? 'Salvando...' : 'Salvar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </SidebarProvider>
  );
}
