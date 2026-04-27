import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Building2, Users, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalOrgs: 0, orgsAtivas: 0, totalEquipe: 0 });
  const { user, perfil } = useAuth();

  const firstName = (() => {
    if (perfil?.nome) return perfil.nome.split(' ')[0];
    const local = user?.email?.split('@')[0] ?? '';
    const raw = local.split(/[._-]/)[0] || 'usuário';
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  })();

  useEffect(() => {
    const fetchStats = async () => {
      const [orgsRes, ativasRes, equipeRes] = await Promise.all([
        supabase.from('organizacao').select('id', { count: 'exact', head: true }),
        supabase.from('organizacao').select('id', { count: 'exact', head: true }).eq('ativado', true),
        supabase.from('perfis').select('id', { count: 'exact', head: true }),
      ]);
      setStats({
        totalOrgs: orgsRes.count ?? 0,
        orgsAtivas: ativasRes.count ?? 0,
        totalEquipe: equipeRes.count ?? 0,
      });
    };
    fetchStats();
  }, []);

  const cards = [
    {
      label: 'Total Organizações',
      value: stats.totalOrgs,
      icon: Building2,
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-600',
    },
    {
      label: 'Organizações Ativas',
      value: stats.orgsAtivas,
      icon: CheckCircle,
      iconBg: 'bg-orange-500/10',
      iconColor: 'text-orange-600',
    },
    {
      label: 'Membros da Equipe',
      value: stats.totalEquipe,
      icon: Users,
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-600',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-slate-800">
            Olá, {firstName}! 👋
          </h2>
          <p className="text-sm text-slate-500">
            Bem-vindo de volta — aqui está o resumo da operação.
          </p>
        </div>

        <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <div
              key={c.label}
              className="rounded-xl border border-slate-200/70 shadow-sm bg-white p-5 flex items-center gap-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-default"
            >
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}>
                <c.icon className={`h-6 w-6 ${c.iconColor}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-slate-500">{c.label}</p>
                <p className="text-3xl font-extrabold tabular-nums text-slate-900 leading-tight">
                  {c.value}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
