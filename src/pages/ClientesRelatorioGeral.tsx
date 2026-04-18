import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Organizacao {
  id: string;
  nome: string;
  modulos: Record<string, boolean> | null;
}

interface ClienteRFV {
  whatsapp: string;
  nome_cliente: string;
  total_pedidos: number;
  total_gasto: number;
  gasto_medio: number;
  ultima_compra: string | null;
  dias_desde_ultima: number;
  nota_r: number;
  nota_f: number;
  nota_v: number;
  score_rfv: number;
  status_rfv: string;
}

const STATUS_LIST = [
  { key: 'todos', label: 'Todos', base: 'bg-slate-100 text-slate-700', active: 'bg-slate-700 text-white' },
  { key: 'Campeão', label: 'Campeões', base: 'bg-emerald-100 text-emerald-800', active: 'bg-emerald-700 text-white' },
  { key: 'Fiel', label: 'Fiéis', base: 'bg-green-100 text-green-800', active: 'bg-green-700 text-white' },
  { key: 'Promissor', label: 'Promissores', base: 'bg-blue-100 text-blue-800', active: 'bg-blue-700 text-white' },
  { key: 'Em risco', label: 'Em risco', base: 'bg-amber-100 text-amber-800', active: 'bg-amber-700 text-white' },
  { key: 'Perdido', label: 'Perdidos', base: 'bg-red-100 text-red-800', active: 'bg-red-700 text-white' },
];

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'Campeão': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'Fiel': return 'bg-green-100 text-green-800 border-green-200';
    case 'Promissor': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'Em risco': return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'Perdido': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

const formatWhatsapp = (w: string) => {
  if (!w) return '—';
  if (w.startsWith('55') && (w.length === 12 || w.length === 13)) {
    return w.replace(/(\d{2})(\d{2})(\d{4,5})(\d{4})/, '+$1 ($2) $3-$4');
  }
  return w;
};

export default function ClientesRelatorioGeral() {
  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organizacao | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgOpen, setOrgOpen] = useState(false);

  const [clientes, setClientes] = useState<ClienteRFV[]>([]);
  const [loading, setLoading] = useState(false);
  const [filtroStatus, setFiltroStatus] = useState('todos');
  const [busca, setBusca] = useState('');

  const navigate = useNavigate();

  const filteredOrgs = useMemo(
    () => orgSearch.length > 0 ? orgs.filter(o => o.nome?.toLowerCase().includes(orgSearch.toLowerCase())) : orgs,
    [orgSearch, orgs],
  );

  useEffect(() => {
    supabase.from('organizacao').select('id, nome, modulos').order('nome').then(({ data }) => {
      if (data) {
        const mapped = data.map((d: any) => ({ ...d, modulos: d.modulos as Record<string, boolean> | null }));
        setOrgs(mapped);
        if (mapped.length === 1) {
          setSelectedOrg(mapped[0]);
          setOrgSearch(mapped[0].nome);
        }
      }
    });
  }, []);

  useEffect(() => {
    if (!selectedOrg) return;
    setLoading(true);
    supabase.rpc('calcular_rfv_clientes', { p_org_id: selectedOrg.id }).then(({ data, error }) => {
      if (error) { toast.error('Erro ao carregar clientes'); setLoading(false); return; }
      setClientes((data as ClienteRFV[]) ?? []);
      setLoading(false);
    });
  }, [selectedOrg]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: clientes.length };
    for (const cli of clientes) {
      c[cli.status_rfv] = (c[cli.status_rfv] ?? 0) + 1;
    }
    return c;
  }, [clientes]);

  const filtrados = useMemo(() => {
    return clientes.filter(c => {
      if (filtroStatus !== 'todos' && c.status_rfv !== filtroStatus) return false;
      if (busca && !(c.nome_cliente ?? '').toLowerCase().includes(busca.toLowerCase())) return false;
      return true;
    });
  }, [clientes, filtroStatus, busca]);

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Relatório geral de clientes</h1>
            <p className="text-slate-500 text-sm mt-1">Todos os clientes com classificação RFV automática</p>
          </div>

          {/* Org selector */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <Popover open={orgOpen} onOpenChange={setOrgOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full sm:w-80 justify-between font-normal">
                  {selectedOrg ? selectedOrg.nome : 'Selecione uma organização'}
                  <Search className="h-4 w-4 text-slate-400" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-2" align="start">
                <Input
                  placeholder="Buscar organização..."
                  value={orgSearch}
                  onChange={e => setOrgSearch(e.target.value)}
                  className="mb-2"
                />
                <div className="max-h-48 overflow-auto space-y-0.5">
                  {filteredOrgs.map(o => (
                    <button
                      key={o.id}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded-md text-sm transition-colors hover:bg-blue-50',
                        selectedOrg?.id === o.id && 'bg-blue-50 text-blue-700 font-medium',
                      )}
                      onClick={() => { setSelectedOrg(o); setOrgSearch(o.nome); setOrgOpen(false); }}
                    >
                      {o.nome}
                    </button>
                  ))}
                  {filteredOrgs.length === 0 && (
                    <p className="text-center text-sm text-slate-400 py-4">Nenhuma organização encontrada</p>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {!selectedOrg && (
            <Card><CardContent className="py-12 text-center text-slate-400">Selecione uma organização para visualizar</CardContent></Card>
          )}

          {selectedOrg && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                {/* Pills de status */}
                <div className="flex flex-wrap gap-2">
                  {STATUS_LIST.map(s => {
                    const count = counts[s.key] ?? 0;
                    const isActive = filtroStatus === s.key;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setFiltroStatus(s.key)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                          isActive ? s.active : s.base,
                        )}
                      >
                        {s.label} ({count})
                      </button>
                    );
                  })}
                </div>

                {/* Busca */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Buscar por nome..."
                    value={busca}
                    onChange={e => setBusca(e.target.value)}
                    className="pl-9"
                  />
                </div>

                {/* Tabela */}
                {loading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                  </div>
                ) : filtrados.length === 0 ? (
                  <p className="text-center text-slate-400 py-12">Nenhum cliente encontrado</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Celular</TableHead>
                          <TableHead className="text-center">Compras</TableHead>
                          <TableHead>Última compra</TableHead>
                          <TableHead className="text-right">Gasto médio</TableHead>
                          <TableHead className="text-right">Gasto total</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filtrados.map((c) => (
                          <TableRow key={c.whatsapp}>
                            <TableCell className="font-medium text-slate-800">{c.nome_cliente || '—'}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusBadgeClass(c.status_rfv)}>
                                {c.status_rfv}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-slate-500 text-sm whitespace-nowrap">
                              {formatWhatsapp(c.whatsapp)}
                            </TableCell>
                            <TableCell className="text-center text-slate-600">{c.total_pedidos}</TableCell>
                            <TableCell className="text-slate-600 whitespace-nowrap">
                              {c.ultima_compra ? format(new Date(c.ultima_compra), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
                            </TableCell>
                            <TableCell className="text-right text-slate-600">
                              R$ {Number(c.gasto_medio ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">
                              R$ {Number(c.total_gasto ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                                    onClick={() => navigate('/produtos/dashboard-pedidos', {
                                      state: { filtroWhatsapp: c.whatsapp, filtroNome: c.nome_cliente },
                                    })}
                                  >
                                    <ClipboardList className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Ver pedidos</TooltipContent>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
