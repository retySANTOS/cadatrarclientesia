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
    { label: 'Total Organizações', value: stats.totalOrgs, icon: Building2, color: 'text-blue-500' },
    { label: 'Organizações Ativas', value: stats.orgsAtivas, icon: CheckCircle, color: 'text-emerald-500' },
    { label: 'Membros da Equipe', value: stats.totalEquipe, icon: Users, color: 'text-amber-500' },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Card key={c.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{c.label}</CardTitle>
                <c.icon className={`h-5 w-5 ${c.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums">{c.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
