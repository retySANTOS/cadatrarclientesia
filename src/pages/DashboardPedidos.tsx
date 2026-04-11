import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  ChartContainer, ChartTooltip, ChartTooltipContent,
} from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { Search, ShoppingCart, DollarSign, TrendingUp, Truck } from 'lucide-react';
import { format, subDays, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface Organizacao { id: string; nome: string; }

interface Pedido {
  id: string;
  organizacao_id: string;
  nome_cliente: string;
  valor_total: number;
  status: string;
  created_at: string;
}

interface TopProduto {
  nome_produto: string;
  total_quantidade: number;
  total_receita: number;
}

const PERIODOS = [
  { label: 'Hoje', value: 'hoje' },
  { label: '7 dias', value: '7' },
  { label: '30 dias', value: '30' },
  { label: 'Este mês', value: 'mes' },
] as const;

function getDateRange(periodo: string) {
  const now = new Date();
  let start: Date;
  if (periodo === 'hoje') start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  else if (periodo === '7') start = subDays(now, 7);
  else if (periodo === '30') start = subDays(now, 30);
  else start = startOfMonth(now);
  return {
    start: format(start, 'yyyy-MM-dd\'T\'00:00:00'),
    end: format(now, 'yyyy-MM-dd\'T\'23:59:59'),
  };
}

const STATUS_ENTREGUE = 'Seu pedido já foi entregue';

function statusBadge(status: string) {
  if (status === 'Seu pedido já foi entregue') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'Seu pedido saiu para entrega') return 'bg-amber-100 text-amber-700 border-amber-200';
  if (status === 'Seu pedido está sendo preparado') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (status === 'Pedido aguardando confirmação') return 'bg-slate-100 text-slate-600 border-slate-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

export default function DashboardPedidos() {
  const { user } = useAuth();

  // Org selector
  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organizacao | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgOpen, setOrgOpen] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Period
  const [periodo, setPeriodo] = useState('7');

  // Data
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [topProdutos, setTopProdutos] = useState<TopProduto[]>([]);
  const [loading, setLoading] = useState(false);

  // Load orgs
  useEffect(() => {
    supabase.from('organizacao').select('id, nome').order('nome').then(({ data }) => {
      if (data) {
        setOrgs(data);
        if (data.length === 1) { setSelectedOrg(data[0]); setOrgSearch(data[0].nome); }
      }
      setLoadingOrgs(false);
    });
  }, []);

  const filteredOrgs = useMemo(
    () => orgSearch.length > 0 ? orgs.filter(o => o.nome?.toLowerCase().includes(orgSearch.toLowerCase())) : orgs,
    [orgSearch, orgs],
  );

  // Load data when org or period changes
  useEffect(() => {
    if (!selectedOrg) { setPedidos([]); setTopProdutos([]); return; }
    const { start, end } = getDateRange(periodo);
    setLoading(true);

    const fetchPedidos = supabase
      .from('dashboard_pedidos')
      .select('*')
      .eq('organizacao_id', selectedOrg.id)
      .gte('created_at', start)
      .lte('created_at', end)
      .order('created_at', { ascending: false });

    const startDate = start.split('T')[0];
    const endDate = end.split('T')[0];
    const fetchTop = supabase
      .from('relatorio_produtos')
      .select('nome_produto, total_quantidade, total_receita')
      .eq('organizacao_id', selectedOrg.id)
      .gte('data_pedido', startDate)
      .lte('data_pedido', endDate)
      .order('total_quantidade', { ascending: false });

    Promise.all([fetchPedidos, fetchTop]).then(([resPedidos, resTop]) => {
      setPedidos((resPedidos.data as Pedido[]) ?? []);
      const rawTop = (resTop.data as TopProduto[]) ?? [];
      const agrupado = rawTop.reduce<TopProduto[]>((acc, item) => {
        const existing = acc.find(i => i.nome_produto === item.nome_produto);
        if (existing) {
          existing.total_quantidade += item.total_quantidade;
          existing.total_receita += item.total_receita;
        } else {
          acc.push({ ...item });
        }
        return acc;
      }, []).sort((a, b) => b.total_quantidade - a.total_quantidade).slice(0, 5);
      setTopProdutos(agrupado);
      setLoading(false);
    });
  }, [selectedOrg, periodo]);

  // Metrics — only delivered orders count for revenue
  const pedidosEntregues = pedidos.filter(p => p.status === STATUS_ENTREGUE);
  const totalPedidos = pedidos.length;
  const faturamento = pedidosEntregues.reduce((s, p) => s + Number(p.valor_total ?? 0), 0);
  const ticketMedio = pedidosEntregues.length > 0 ? faturamento / pedidosEntregues.length : 0;
  const taxaEntrega = totalPedidos > 0 ? (pedidosEntregues.length / totalPedidos) * 100 : 0;

  // Chart: faturamento por dia
  const faturamentoPorDia = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of pedidosEntregues) {
      const day = format(new Date(p.created_at), 'dd/MM');
      map.set(day, (map.get(day) ?? 0) + Number(p.valor_total ?? 0));
    }
    return Array.from(map.entries())
      .map(([dia, valor]) => ({ dia, valor }))
      .reverse();
  }, [pedidosEntregues]);

  // Chart: pedidos por hora
  const pedidosPorHora = useMemo(() => {
    const counts = new Map<number, number>();
    for (let h = 11; h <= 23; h++) counts.set(h, 0);
    for (const p of pedidosEntregues) {
      const h = new Date(p.created_at).getHours();
      if (h >= 11 && h <= 23) counts.set(h, (counts.get(h) ?? 0) + 1);
    }
    const arr = Array.from(counts.entries()).map(([hora, qtd]) => ({
      hora: `${hora}h`,
      horaNum: hora,
      qtd,
    }));
    const maxQtd = Math.max(...arr.map(a => a.qtd), 0);
    return arr.map(a => ({ ...a, isPeak: a.qtd === maxQtd && maxQtd > 0 }));
  }, [pedidosEntregues]);

  // Last 10 pedidos
  const ultimos10 = pedidos.slice(0, 10);

  const faturamentoChartConfig = {
    valor: { label: 'Faturamento', color: 'hsl(217, 91%, 60%)' },
  };

  const horaChartConfig = {
    qtd: { label: 'Pedidos', color: 'hsl(215, 20%, 65%)' },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dashboard de pedidos</h1>
          <p className="text-sm text-slate-500">Visão geral de performance</p>
        </div>

        {/* Org selector */}
        {orgs.length > 1 && (
          <Popover open={orgOpen} onOpenChange={setOrgOpen}>
            <PopoverTrigger asChild>
              <div className="relative max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar organização..."
                  value={orgSearch}
                  onChange={e => { setOrgSearch(e.target.value); setSelectedOrg(null); setOrgOpen(true); }}
                  onFocus={() => setOrgOpen(true)}
                  className="pl-9"
                />
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" onOpenAutoFocus={e => e.preventDefault()}>
              <ul className="max-h-56 overflow-auto py-1">
                {loadingOrgs && <li className="px-3 py-2 text-sm text-slate-400">Carregando...</li>}
                {!loadingOrgs && filteredOrgs.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">Nenhum resultado</li>}
                {filteredOrgs.map(org => (
                  <li key={org.id} className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700"
                    onClick={() => { setSelectedOrg(org); setOrgSearch(org.nome); setOrgOpen(false); }}>
                    {org.nome}
                  </li>
                ))}
              </ul>
            </PopoverContent>
          </Popover>
        )}

        {selectedOrg && orgs.length > 1 && (
          <button className="text-xs text-blue-600 hover:underline" onClick={() => { setSelectedOrg(null); setOrgSearch(''); }}>
            ← Limpar filtro
          </button>
        )}

        {!selectedOrg ? (
          <div className="text-center text-slate-400 py-16">Selecione uma organização para ver o dashboard</div>
        ) : loading ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
            </div>
            <Skeleton className="h-64 w-full rounded-lg" />
          </div>
        ) : (
          <>
            {/* Period pills */}
            <div className="flex gap-2">
              {PERIODOS.map(p => (
                <button
                  key={p.value}
                  onClick={() => setPeriodo(p.value)}
                  className={cn(
                    'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
                    periodo === p.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Metric cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="shadow-sm border-slate-100">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="rounded-lg bg-blue-100 p-3"><ShoppingCart className="h-5 w-5 text-blue-600" /></div>
                  <div>
                    <p className="text-sm text-slate-500">Pedidos no período</p>
                    <p className="text-2xl font-bold text-slate-800">{totalPedidos.toLocaleString('pt-BR')}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-slate-100">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="rounded-lg bg-emerald-100 p-3"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
                  <div>
                    <p className="text-sm text-slate-500">Faturamento</p>
                    <p className="text-2xl font-bold text-emerald-600">R$ {faturamento.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-slate-100">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="rounded-lg bg-orange-100 p-3"><TrendingUp className="h-5 w-5 text-orange-600" /></div>
                  <div>
                    <p className="text-sm text-slate-500">Ticket médio</p>
                    <p className="text-2xl font-bold text-slate-800">R$ {ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-slate-100">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="rounded-lg bg-purple-100 p-3"><Truck className="h-5 w-5 text-purple-600" /></div>
                  <div>
                    <p className="text-sm text-slate-500">Taxa de entrega</p>
                    <p className="text-2xl font-bold text-purple-600">{taxaEntrega.toFixed(1)}%</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Faturamento por dia */}
              <Card className="shadow-sm border-slate-100">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Faturamento por dia</h3>
                  {faturamentoPorDia.length === 0 ? (
                    <div className="text-center text-slate-400 py-12 text-sm">Sem dados no período</div>
                  ) : (
                    <ChartContainer config={faturamentoChartConfig} className="h-64 w-full">
                      <BarChart data={faturamentoPorDia}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="dia" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} fontSize={12} tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`} />
                        <ChartTooltip
                          content={<ChartTooltipContent />}
                          formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Faturamento']}
                        />
                        <Bar dataKey="valor" fill="var(--color-valor)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>

              {/* Horário de pico */}
              <Card className="shadow-sm border-slate-100">
                <CardContent className="p-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-4">Horário de pico</h3>
                  {pedidosPorHora.every(h => h.qtd === 0) ? (
                    <div className="text-center text-slate-400 py-12 text-sm">Sem dados no período</div>
                  ) : (
                    <ChartContainer config={horaChartConfig} className="h-64 w-full">
                      <BarChart data={pedidosPorHora}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="hora" tickLine={false} axisLine={false} fontSize={12} />
                        <YAxis tickLine={false} axisLine={false} fontSize={12} allowDecimals={false} />
                        <ChartTooltip
                          content={<ChartTooltipContent />}
                          formatter={(value: number) => [value, 'Pedidos']}
                        />
                        <Bar dataKey="qtd" radius={[4, 4, 0, 0]}>
                          {pedidosPorHora.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.isPeak ? 'hsl(217, 91%, 60%)' : 'hsl(215, 20%, 85%)'}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ChartContainer>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top 5 produtos */}
              <Card className="shadow-sm border-slate-100">
                <CardContent className="p-0">
                  <div className="p-4 border-b">
                    <h3 className="text-sm font-semibold text-slate-700">Top 5 itens mais vendidos</h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead className="text-right">Qtd</TableHead>
                        <TableHead className="text-right">Receita</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {topProdutos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-400 py-8">Sem dados</TableCell>
                        </TableRow>
                      ) : topProdutos.map((p, i) => (
                        <TableRow key={p.nome_produto}>
                          <TableCell className="text-slate-400 font-medium">{i + 1}</TableCell>
                          <TableCell className="font-medium text-slate-800">{p.nome_produto}</TableCell>
                          <TableCell className="text-right font-medium">{Number(p.total_quantidade).toLocaleString('pt-BR')}</TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">
                            R$ {Number(p.total_receita).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Últimos 10 pedidos */}
              <Card className="shadow-sm border-slate-100">
                <CardContent className="p-0">
                  <div className="p-4 border-b">
                    <h3 className="text-sm font-semibold text-slate-700">Últimos 10 pedidos</h3>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data/Hora</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ultimos10.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-slate-400 py-8">Sem pedidos</TableCell>
                        </TableRow>
                      ) : ultimos10.map(p => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium text-slate-800">{p.nome_cliente || 'Cliente'}</TableCell>
                          <TableCell className="text-right font-medium text-emerald-600">
                            R$ {Number(p.valor_total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn('text-xs border', statusBadge(p.status))}>
                             {p.status}
                           </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-slate-500">
                            {format(new Date(p.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
