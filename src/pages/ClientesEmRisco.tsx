import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Users, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Organizacao {
  id: string;
  nome: string;
  modulos: Record<string, boolean> | null;
}

interface ClienteEmRisco {
  whatsapp: string;
  nome_cliente: string;
  dias_sem_comprar: number;
  total_pedidos: number;
  total_gasto: number;
  ultima_compra: string;
}

export default function ClientesEmRisco() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organizacao | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgOpen, setOrgOpen] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  const [clientes, setClientes] = useState<ClienteEmRisco[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');

  const filteredOrgs = useMemo(
    () => orgSearch.length > 0 ? orgs.filter(o => o.nome?.toLowerCase().includes(orgSearch.toLowerCase())) : orgs,
    [orgSearch, orgs],
  );

  const filteredClientes = useMemo(
    () => busca ? clientes.filter(c => (c.nome_cliente || c.whatsapp).toLowerCase().includes(busca.toLowerCase())) : clientes,
    [clientes, busca],
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
      setLoadingOrgs(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedOrg) return;
    setLoading(true);
    supabase.rpc('buscar_clientes_em_risco', { p_org_id: selectedOrg.id }).then(({ data, error }) => {
      if (error) { toast.error('Erro ao carregar clientes em risco'); setLoading(false); return; }
      setClientes((data as ClienteEmRisco[]) ?? []);
      setLoading(false);
    });
  }, [selectedOrg]);

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Clientes em risco de sumir</h1>
              <p className="text-slate-500 text-sm mt-1">Clientes que não compram há mais de 30 dias.</p>
            </div>
            <Button
              className="gap-2"
              onClick={() => navigate('/campanhas', { state: { publico: 'inativos_30a90', origem: 'clientes_em_risco' } })}
            >
              <Users className="h-4 w-4" /> Criar campanha para esses clientes
            </Button>
          </div>

          {/* Org selector */}
          <div className="flex flex-col sm:flex-row gap-3">
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
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nome..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="pl-9"
                />
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
                ) : filteredClientes.length === 0 ? (
                  <p className="text-center text-slate-400 py-12">Nenhum cliente em risco no momento 🎉</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>WhatsApp</TableHead>
                        <TableHead>Dias sem comprar</TableHead>
                        <TableHead>Total pedidos</TableHead>
                        <TableHead>Total gasto</TableHead>
                        <TableHead>Última compra</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClientes.map((c, i) => (
                        <TableRow key={i}>
                          <TableCell className="font-medium text-slate-700">{c.nome_cliente || '—'}</TableCell>
                          <TableCell className="text-slate-600">
                            {c.whatsapp?.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4') || '—'}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn(
                              'border',
                              c.dias_sem_comprar > 45
                                ? 'bg-red-100 text-red-700 border-red-200'
                                : 'bg-amber-100 text-amber-700 border-amber-200',
                            )}>
                              {c.dias_sem_comprar} dias
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-600">{c.total_pedidos}</TableCell>
                          <TableCell className="text-slate-600">
                            R$ {Number(c.total_gasto ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {c.ultima_compra ? format(new Date(c.ultima_compra), 'dd/MM/yyyy', { locale: ptBR }) : '—'}
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
