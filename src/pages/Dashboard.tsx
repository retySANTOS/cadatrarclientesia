import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Users, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const [stats, setStats] = useState({ totalOrgs: 0, orgsAtivas: 0, totalEquipe: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const [orgsRes, ativasRes, equipeRes] = await Promise.all([
        supabase.from('organizacao').select('id', { count: 'exact', head: true }),
        supabase.from('organizacao').select('id', { count: 'exact', head: true }).eq('ativo', true),
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
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      trend: '↑ 2% vs ontem',
    },
    {
      label: 'Organizações Ativas',
      value: stats.orgsAtivas,
      icon: CheckCircle,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      trend: '↑ 1% vs ontem',
    },
    {
      label: 'Membros da Equipe',
      value: stats.totalEquipe,
      icon: Users,
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      trend: '— estável',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-800">Dashboard</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.label} className="shadow-sm border-slate-100 bg-white">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{c.label}</CardTitle>
                <div className={`p-2 rounded-lg ${c.iconBg}`}>
                  <c.icon className={`h-5 w-5 ${c.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums text-slate-800">{c.value}</p>
                <p className="text-xs text-emerald-600 mt-1">{c.trend}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
