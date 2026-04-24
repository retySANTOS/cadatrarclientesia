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
import { Search, ShoppingCart, DollarSign, TrendingUp, Truck, Banknote } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { format, subDays, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Organizacao { id: string; nome: string; }

interface Pedido {
  id: string;
  organizacao_id: string;
  nome_cliente: string;
  whatsapp: string;
  valor_total: number;
  status: string;
  created_at: string;
  taxa_entrega: number;
  itens: string | null;
  valor_subtotal: number;
  endereco_entrega: string;
  forma_pagamento: string;
  cupom_utilizado: string | null;
}

interface ItemPedido {
  nome: string;
  quantidade: number;
  valor_unitario: number;
}

interface TopProduto {
  nome_produto: string;
  total_quantidade: number;
  total_receita: number;
}

function parseItens(itensStr: string | null | any[]): ItemPedido[] {
  if (!itensStr) return [];
  if (Array.isArray(itensStr)) return itensStr;
  try {
    const parsed = JSON.parse(itensStr);
    return Array.isArray(parsed) ? parsed : [];
  } catch { return []; }
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

  // Filtro de cliente vindo de outra página (ex: Top clientes)
  const location = useLocation();
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroNome, setFiltroNome] = useState('');
  const [pedidoSelecionado, setPedidoSelecionado] = useState<Pedido | null>(null);

  useEffect(() => {
    const st = location.state as { filtroWhatsapp?: string; filtroNome?: string } | null;
    if (st?.filtroWhatsapp) {
      setFiltroCliente(st.filtroWhatsapp);
      setFiltroNome(st.filtroNome || '');
      toast.success('Filtrando pedidos de: ' + (st.filtroNome || st.filtroWhatsapp));
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

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

    let pedidosQuery = supabase
      .from('dashboard_pedidos')
      .select('*')
      .eq('organizacao_id', selectedOrg.id)
      .order('created_at', { ascending: false });

    if (!filtroCliente) {
      pedidosQuery = pedidosQuery.gte('created_at', start).lte('created_at', end);
    }
    if (filtroCliente) {
      pedidosQuery = pedidosQuery.eq('whatsapp', filtroCliente);
    }
    const fetchPedidos = pedidosQuery;

    const startDate = start.split('T')[0];
    const endDate = end.split('T')[0];
    let topQuery = supabase
      .from('relatorio_produtos')
      .select('nome_produto, total_quantidade, total_receita, whatsapp')
      .eq('organizacao_id', selectedOrg.id)
      .order('total_quantidade', { ascending: false });

    if (!filtroCliente) {
      topQuery = topQuery.gte('data_pedido', startDate).lte('data_pedido', endDate);
    }
    if (filtroCliente) {
      topQuery = topQuery.eq('whatsapp', filtroCliente);
    }
    const fetchTop = topQuery;

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
  }, [selectedOrg, periodo, filtroCliente]);

  // Metrics — only delivered orders count for revenue
  const pedidosEntregues = pedidos.filter(p => p.status === STATUS_ENTREGUE);
  const totalPedidos = pedidos.length;
  const faturamento = pedidosEntregues.reduce((s, p) => s + Number(p.valor_total ?? 0), 0);
  const ticketMedio = pedidosEntregues.length > 0 ? Math.round((faturamento / pedidosEntregues.length) * 100) / 100 : 0;
  const totalTaxas = pedidosEntregues.reduce((s, p) => s + Number(p.taxa_entrega ?? 0), 0);

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
            {filtroCliente && (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 mb-4">
                <span className="text-sm text-blue-700">
                  Mostrando todos os pedidos de: <strong>{filtroNome || filtroCliente}</strong>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-800 text-xs"
                  onClick={() => { setFiltroCliente(''); setFiltroNome(''); }}
                >
                  Limpar filtro
                </Button>
              </div>
            )}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
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
                    <p className="text-sm text-slate-500">Pedidos entregues</p>
                    <p className="text-2xl font-bold text-purple-600">{pedidosEntregues.length} de {totalPedidos}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="shadow-sm border-slate-100">
                <CardContent className="p-5 flex items-center gap-4">
                  <div className="rounded-lg bg-rose-100 p-3"><Banknote className="h-5 w-5 text-rose-600" /></div>
                  <div>
                    <p className="text-sm text-slate-500">Taxas de entrega</p>
                    <p className="text-2xl font-bold text-rose-600">R$ {totalTaxas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
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
                        <TableRow
                          key={p.id}
                          onClick={() => setPedidoSelecionado(p)}
                          className="cursor-pointer hover:bg-slate-50 transition-colors"
                        >
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

      {/* Dialog de detalhes do pedido */}
      <Dialog open={!!pedidoSelecionado} onOpenChange={(v) => { if (!v) setPedidoSelecionado(null); }}>
        <DialogContent className="max-w-lg w-full h-full sm:h-auto sm:max-h-[90vh] overflow-y-auto p-0 sm:rounded-lg rounded-none">
          {pedidoSelecionado && (() => {
            const itens = parseItens(pedidoSelecionado.itens);
            return (
              <>
                {/* Header com status */}
                <div className="p-5 border-b border-slate-100">
                  <div className="flex items-start justify-between gap-3">
                    <DialogHeader className="text-left space-y-1">
                      <DialogTitle className="text-base text-slate-800">
                        Pedido de {pedidoSelecionado.nome_cliente || 'Cliente'}
                      </DialogTitle>
                      <DialogDescription className="text-xs text-slate-500">
                        {format(new Date(pedidoSelecionado.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </DialogDescription>
                    </DialogHeader>
                    <Badge className={cn('text-xs border shrink-0', statusBadge(pedidoSelecionado.status))}>
                      {pedidoSelecionado.status === 'Seu pedido já foi entregue' ? 'Entregue'
                        : pedidoSelecionado.status === 'Seu pedido saiu para entrega' ? 'Em entrega'
                        : pedidoSelecionado.status === 'Seu pedido está sendo preparado' ? 'Preparando'
                        : pedidoSelecionado.status === 'Pedido aguardando confirmação' ? 'Aguardando'
                        : pedidoSelecionado.status}
                    </Badge>
                  </div>
                </div>

                {/* Itens do pedido */}
                <div className="p-5 border-b border-slate-100">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">Itens do pedido</h4>
                  {itens.length === 0 ? (
                    <p className="text-sm text-slate-400">Sem detalhes dos itens</p>
                  ) : (
                    <div className="space-y-3">
                      {itens.map((item, i) => (
                        <div key={i} className="flex items-start justify-between gap-3 text-sm">
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-slate-800 break-words">{item.nome}</p>
                            <p className="text-xs text-slate-500">
                              {item.quantidade}x R$ {Number(item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                          </div>
                          <p className="font-medium text-slate-700 shrink-0">
                            R$ {(item.quantidade * item.valor_unitario).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Valores */}
                <div className="p-5 border-b border-slate-100">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span>R$ {Number(pedidoSelecionado.valor_subtotal ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Taxa de entrega</span>
                      <span>R$ {Number(pedidoSelecionado.taxa_entrega ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {pedidoSelecionado.cupom_utilizado && (
                      <div className="flex justify-between text-slate-600">
                        <span>Cupom</span>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">{pedidoSelecionado.cupom_utilizado}</Badge>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-slate-100 text-base font-semibold text-slate-800">
                      <span>Total</span>
                      <span className="text-emerald-600">R$ {Number(pedidoSelecionado.valor_total ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>

                {/* Info de entrega e pagamento */}
                <div className="p-5 space-y-4">
                  {pedidoSelecionado.forma_pagamento && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Pagamento</h4>
                      <p className="text-sm text-slate-700">{pedidoSelecionado.forma_pagamento}</p>
                    </div>
                  )}
                  {pedidoSelecionado.endereco_entrega && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Endereço de entrega</h4>
                      <p className="text-sm text-slate-700 whitespace-pre-line">{pedidoSelecionado.endereco_entrega}</p>
                    </div>
                  )}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">WhatsApp</h4>
                    <p className="text-sm text-slate-700">{pedidoSelecionado.whatsapp}</p>
                  </div>
                </div>

                {/* Botão fechar */}
                <div className="p-5 pt-0 sm:hidden">
                  <Button variant="outline" className="w-full" onClick={() => setPedidoSelecionado(null)}>
                    Voltar
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
