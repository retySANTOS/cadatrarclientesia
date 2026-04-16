import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Search, Users, AlertCircle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Organizacao {
  id: string;
  nome: string;
  modulos: Record<string, boolean> | null;
}

interface KpisRetencao {
  total_clientes: number;
  clientes_ativos: number;
  clientes_em_risco: number;
  clientes_perdidos: number;
  taxa_retencao: number;
  ltv_medio: number;
  recompra_media_dias: number;
}

interface ClienteEmRisco {
  whatsapp: string;
  nome_cliente: string;
  dias_sem_comprar: number;
  total_pedidos: number;
  total_gasto: number;
  ultima_compra: string;
}

export default function ClientesVisaoGeral() {
  const { user } = useAuth();
  const navigate = useNavigate();

  /* orgs */
  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organizacao | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgOpen, setOrgOpen] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  /* data */
  const [kpis, setKpis] = useState<KpisRetencao | null>(null);
  const [loadingKpis, setLoadingKpis] = useState(false);
  const [clientesRisco, setClientesRisco] = useState<ClienteEmRisco[]>([]);
  const [loadingRisco, setLoadingRisco] = useState(false);

  const filteredOrgs = useMemo(
    () => orgSearch.length > 0 ? orgs.filter(o => o.nome?.toLowerCase().includes(orgSearch.toLowerCase())) : orgs,
    [orgSearch, orgs],
  );

  /* load orgs */
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

  /* load data when org changes */
  useEffect(() => {
    if (!selectedOrg) return;

    setLoadingKpis(true);
    supabase.rpc('kpis_retencao', { p_org_id: selectedOrg.id }).then(({ data, error }) => {
      if (error) { toast.error('Erro ao carregar KPIs'); setLoadingKpis(false); return; }
      const row = Array.isArray(data) ? data[0] : data;
      setKpis(row ?? null);
      setLoadingKpis(false);
    });

    setLoadingRisco(true);
    supabase.rpc('buscar_clientes_em_risco', { p_org_id: selectedOrg.id }).then(({ data, error }) => {
      if (error) { toast.error('Erro ao carregar clientes em risco'); setLoadingRisco(false); return; }
      setClientesRisco((data as ClienteEmRisco[]) ?? []);
      setLoadingRisco(false);
    });
  }, [selectedOrg]);

  const moduloAtivo = selectedOrg?.modulos?.clientes !== false;

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Seus clientes</h1>
            <p className="text-slate-500 text-sm mt-1">
              Entenda a saúde do seu negócio e aja antes de perder clientes.
            </p>
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
          </div>

          {/* Module inactive banner */}
          {selectedOrg && !moduloAtivo && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4">
              <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-700">O módulo de clientes não está ativo para esta organização.</p>
            </div>
          )}

          {!selectedOrg && (
            <Card><CardContent className="py-12 text-center text-slate-400">Selecione uma organização para visualizar</CardContent></Card>
          )}

          {selectedOrg && (
            <div className="space-y-6">
              {/* BLOCO 1 - KPIs */}
              <Card>
                <CardContent className="pt-6">
                  {loadingKpis ? (
                    <div className="space-y-3">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-16 w-32" />
                      <Skeleton className="h-4 w-64" />
                    </div>
                  ) : kpis ? (
                    <div>
                      <p className="text-sm text-slate-400 mb-2">Como está a saúde do seu negócio?</p>
                      <div className="flex items-baseline gap-3 mb-2">
                        <span className="text-5xl font-bold text-slate-800">{Math.round(kpis.taxa_retencao)}%</span>
                        <Badge className={cn(
                          'border',
                          kpis.taxa_retencao >= 50
                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                            : kpis.taxa_retencao >= 30
                              ? 'bg-amber-100 text-amber-700 border-amber-200'
                              : 'bg-red-100 text-red-700 border-red-200',
                        )}>
                          {kpis.taxa_retencao >= 50 ? 'Acima da média' : kpis.taxa_retencao >= 30 ? 'Na média' : 'Abaixo da média'}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        {Math.round(kpis.taxa_retencao)} de cada 100 clientes que pediram voltam a pedir
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-slate-100">
                        <div>
                          <p className="text-xs text-slate-400">Total clientes</p>
                          <p className="text-lg font-semibold text-slate-700">{kpis.total_clientes}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Ativos</p>
                          <p className="text-lg font-semibold text-emerald-600">{kpis.clientes_ativos}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Em risco</p>
                          <p className="text-lg font-semibold text-amber-600">{kpis.clientes_em_risco}</p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-400">Perdidos</p>
                          <p className="text-lg font-semibold text-red-600">{kpis.clientes_perdidos}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-center text-slate-400 py-8">Sem dados disponíveis</p>
                  )}
                </CardContent>
              </Card>

              {/* BLOCO 2 - Clientes em risco */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-800">Quem está prestes a sumir?</h2>
                      <Badge variant="secondary" className="text-xs">{clientesRisco.length}</Badge>
                    </div>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => navigate('/campanhas', { state: { publico: 'inativos_30a90', origem: 'clientes_em_risco' } })}
                    >
                      <Users className="h-4 w-4" /> Mandar campanha
                    </Button>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">
                    Pediram com você antes mas estão há mais de 30 dias sem aparecer.
                  </p>

                  {loadingRisco ? (
                    <div className="space-y-3">
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                      <Skeleton className="h-12 w-full" />
                    </div>
                  ) : clientesRisco.length === 0 ? (
                    <p className="text-center text-slate-400 py-8">Nenhum cliente em risco no momento 🎉</p>
                  ) : (
                    <>
                      <div className="divide-y divide-slate-100">
                        {clientesRisco.slice(0, 5).map((c, i) => (
                          <div key={i} className="flex items-center justify-between py-3">
                            <span className="text-sm font-medium text-slate-700">{c.nome_cliente || c.whatsapp}</span>
                            <span className="text-sm text-slate-400">há {c.dias_sem_comprar} dias</span>
                          </div>
                        ))}
                      </div>
                      {clientesRisco.length > 5 && (
                        <button
                          className="mt-3 text-sm text-blue-600 hover:underline"
                          onClick={() => navigate('/clientes/em-risco')}
                        >
                          Ver todos os {clientesRisco.length} →
                        </button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* BLOCO 3 - Placeholder */}
              <Card>
                <CardContent className="py-12 text-center text-slate-400">
                  Top clientes em breve
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
