import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Organizacao {
  id: string;
  nome: string;
  modulos: Record<string, boolean> | null;
}

interface TopCliente {
  posicao: number;
  whatsapp: string;
  nome_cliente: string;
  total_pedidos: number;
  total_gasto: number;
  ticket_medio: number;
}

const posicaoColor = (pos: number) => {
  if (pos === 1) return 'bg-amber-100 text-amber-700';
  if (pos === 2) return 'bg-slate-100 text-slate-600';
  if (pos === 3) return 'bg-orange-100 text-orange-700';
  return 'bg-blue-50 text-blue-600';
};

export default function ClientesTop() {
  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organizacao | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgOpen, setOrgOpen] = useState(false);

  const [periodo, setPeriodo] = useState<number>(90);
  const [limite, setLimite] = useState<number>(10);

  const [clientes, setClientes] = useState<TopCliente[]>([]);
  const [loading, setLoading] = useState(false);
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
    supabase.rpc('buscar_top_clientes', {
      p_org_id: selectedOrg.id,
      p_periodo_dias: periodo,
      p_limite: limite,
    }).then(({ data, error }) => {
      if (error) { toast.error('Erro ao carregar top clientes'); setLoading(false); return; }
      setClientes((data as TopCliente[]) ?? []);
      setLoading(false);
    });
  }, [selectedOrg, periodo, limite]);

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Top clientes</h1>
            <p className="text-slate-500 text-sm mt-1">Ranking dos clientes que mais gastaram.</p>
          </div>

          {/* Org selector + filtros */}
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

            {selectedOrg && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Período:</span>
                  <Select value={String(periodo)} onValueChange={v => setPeriodo(Number(v))}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 dias</SelectItem>
                      <SelectItem value="60">60 dias</SelectItem>
                      <SelectItem value="90">90 dias</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Exibir:</span>
                  <Select value={String(limite)} onValueChange={v => setLimite(Number(v))}>
                    <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">Top 10</SelectItem>
                      <SelectItem value="25">Top 25</SelectItem>
                      <SelectItem value="50">Top 50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          {!selectedOrg && (
            <Card><CardContent className="py-12 text-center text-slate-400">Selecione uma organização para visualizar</CardContent></Card>
          )}

          {selectedOrg && (
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                    <Skeleton className="h-16 w-full" />
                  </div>
                ) : clientes.length === 0 ? (
                  <p className="text-center text-slate-400 py-12">Sem dados de clientes para o período selecionado</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-20">Posição</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>WhatsApp</TableHead>
                        <TableHead className="text-center">Pedidos</TableHead>
                        <TableHead className="text-right">Total gasto</TableHead>
                        <TableHead className="text-right">Ticket médio</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {clientes.map((c) => (
                        <TableRow key={c.posicao}>
                          <TableCell>
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium',
                              posicaoColor(c.posicao),
                            )}>
                              {c.posicao}
                            </div>
                          </TableCell>
                          <TableCell className="font-medium text-slate-800">{c.nome_cliente || '—'}</TableCell>
                          <TableCell className="text-slate-500 text-sm">
                            {c.whatsapp?.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4') || '—'}
                          </TableCell>
                          <TableCell className="text-center text-slate-600">{c.total_pedidos}</TableCell>
                          <TableCell className="text-right text-slate-700 font-medium">
                            R$ {Number(c.total_gasto ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            R$ {Number(c.ticket_medio ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
