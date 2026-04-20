import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Search, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface CohortRow {
  mes_aquisicao: string;
  mes_aquisicao_order: string;
  total_inicial: number;
  mes_offset: number;
  valor: number;
}

export default function ClientesAnaliseAvancada() {
  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organizacao | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgOpen, setOrgOpen] = useState(false);

  const [kpis, setKpis] = useState<KpisRetencao | null>(null);
  const [loading, setLoading] = useState(false);
  const [cohortData, setCohortData] = useState<CohortRow[]>([]);
  const [loadingCohort, setLoadingCohort] = useState(false);
  const [cohortModo, setCohortModo] = useState<'clientes' | 'receita'>('clientes');

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
    supabase.rpc('kpis_retencao', { p_org_id: selectedOrg.id }).then(({ data, error }) => {
      if (error) { toast.error('Erro ao carregar métricas'); setLoading(false); return; }
      const row = Array.isArray(data) ? data[0] : data;
      setKpis(row ?? null);
      setLoading(false);
    });
    setLoadingCohort(true);
    supabase.rpc('calcular_cohort', { p_org_id: selectedOrg.id, p_modo: cohortModo }).then(({ data, error }) => {
      if (error) { setLoadingCohort(false); return; }
      setCohortData((data as CohortRow[]) ?? []);
      setLoadingCohort(false);
    });
  }, [selectedOrg]);

  useEffect(() => {
    if (!selectedOrg) return;
    setLoadingCohort(true);
    supabase.rpc('calcular_cohort', { p_org_id: selectedOrg.id, p_modo: cohortModo }).then(({ data, error }) => {
      if (error) { setLoadingCohort(false); return; }
      setCohortData((data as CohortRow[]) ?? []);
      setLoadingCohort(false);
    });
  }, [cohortModo, selectedOrg]);

  const taxaColor = (taxa: number) => {
    if (taxa >= 50) return 'text-emerald-600';
    if (taxa >= 30) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Análise avançada</h1>
            <p className="text-slate-500 text-sm mt-1">Métricas detalhadas de retenção e comportamento dos clientes.</p>
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

          {!selectedOrg && (
            <Card><CardContent className="py-12 text-center text-slate-400">Selecione uma organização para visualizar</CardContent></Card>
          )}

          {selectedOrg && (
            <div className="space-y-6">
              {/* BLOCO 1 - 4 KPIs */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24 w-full" />)}
                </div>
              ) : kpis ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-slate-50 rounded-lg p-5">
                    <p className="text-sm text-slate-500 mb-1">Retenção D30</p>
                    <p className={cn('text-2xl font-bold', taxaColor(kpis.taxa_retencao))}>
                      {Math.round(kpis.taxa_retencao)}%
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-5">
                    <p className="text-sm text-slate-500 mb-1">LTV médio</p>
                    <p className="text-2xl font-bold text-slate-800">
                      R$ {Number(kpis.ltv_medio ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-5">
                    <p className="text-sm text-slate-500 mb-1">Recompra média</p>
                    <p className="text-2xl font-bold text-slate-800">{kpis.recompra_media_dias ?? 0} dias</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-5">
                    <p className="text-sm text-slate-500 mb-1">Ativos / Perdidos</p>
                    <p className="text-2xl font-bold text-slate-800">
                      {kpis.clientes_ativos} / {kpis.clientes_perdidos}
                    </p>
                  </div>
                </div>
              ) : (
                <Card><CardContent className="py-8 text-center text-slate-400">Sem dados disponíveis</CardContent></Card>
              )}

              {/* BLOCO 2 - Cohort */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-800">Análise de cohort</h2>
                      <p className="text-sm text-slate-400">Retenção mês a mês por safra de clientes.</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCohortModo('clientes')}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                          cohortModo === 'clientes' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        % Retenção
                      </button>
                      <button
                        onClick={() => setCohortModo('receita')}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                          cohortModo === 'receita' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        )}
                      >
                        Receita
                      </button>
                    </div>
                  </div>
                  {loadingCohort ? (
                    <div className="space-y-2">
                      {[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                    </div>
                  ) : cohortData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <BarChart3 className="h-12 w-12 text-slate-300 mb-3" />
                      <p className="text-slate-500">Dados insuficientes para análise de cohort</p>
                      <p className="text-xs text-slate-400 mt-1">Necessário pelo menos 2 meses de histórico</p>
                    </div>
                  ) : (() => {
                    const safras = [...new Set(cohortData.map(r => r.mes_aquisicao))];
                    const maxOffset = Math.max(...cohortData.map(r => r.mes_offset));
                    const offsets = Array.from({ length: maxOffset + 1 }, (_, i) => i);
                    const getCellValue = (safra: string, offset: number) => {
                      const row = cohortData.find(r => r.mes_aquisicao === safra && r.mes_offset === offset);
                      return row ? row.valor : null;
                    };
                    const getCellColor = (valor: number | null, offset: number) => {
                      if (valor === null) return 'bg-slate-50 text-slate-300';
                      if (offset === 0) return 'bg-blue-600 text-white font-semibold';
                      if (cohortModo === 'clientes') {
                        if (valor >= 50) return 'bg-emerald-100 text-emerald-800';
                        if (valor >= 25) return 'bg-amber-100 text-amber-800';
                        return 'bg-red-50 text-red-700';
                      }
                      return 'bg-blue-50 text-blue-800';
                    };
                    return (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr>
                              <th className="text-left py-2 pr-3 text-slate-500 font-medium whitespace-nowrap">Safra</th>
                              <th className="text-center py-2 px-1 text-slate-500 font-medium whitespace-nowrap">Clientes</th>
                              {offsets.map(o => (
                                <th key={o} className="text-center py-2 px-1 text-slate-500 font-medium whitespace-nowrap">
                                  {o === 0 ? 'M+0' : `M+${o}`}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {safras.map(safra => {
                              const totalInicial = cohortData.find(r => r.mes_aquisicao === safra)?.total_inicial ?? 0;
                              return (
                                <tr key={safra} className="border-t border-slate-100">
                                  <td className="py-2 pr-3 text-slate-700 font-medium whitespace-nowrap">{safra}</td>
                                  <td className="py-2 px-1 text-center text-slate-500">{totalInicial}</td>
                                  {offsets.map(o => {
                                    const val = getCellValue(safra, o);
                                    return (
                                      <td key={o} className="py-1 px-0.5">
                                        <div className={cn('rounded text-center py-1 px-1 min-w-[36px]', getCellColor(val, o))}>
                                          {val !== null
                                            ? cohortModo === 'clientes'
                                              ? o === 0 ? totalInicial : `${Math.round(val)}%`
                                              : `R$${Number(val).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`
                                            : '—'}
                                        </div>
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                        <p className="text-xs text-slate-400 mt-3">M+0 = mês de entrada · M+1 = % que voltou no mês seguinte</p>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>


              {/* BLOCO 3 - Insights */}
              {kpis && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
                  <p className="text-sm font-medium text-blue-800 mb-3">Insights automáticos</p>
                  <ul className="text-sm text-blue-700 space-y-2">
                    <li>• Você tem {kpis.total_clientes} clientes cadastrados, {kpis.clientes_ativos} estão ativos</li>
                    {kpis.taxa_retencao >= 50 && (
                      <li>• Sua retenção está saudável — continue assim!</li>
                    )}
                    {kpis.taxa_retencao < 50 && kpis.taxa_retencao > 0 && (
                      <li>• Sua retenção pode melhorar — campanhas de reativação podem ajudar</li>
                    )}
                    {kpis.recompra_media_dias > 0 && (
                      <li>• Seus clientes voltam em média a cada {kpis.recompra_media_dias} dias</li>
                    )}
                    {kpis.clientes_em_risco > 0 && (
                      <li>• {kpis.clientes_em_risco} clientes estão em risco de sumir — veja a lista em "Em risco de sumir"</li>
                    )}
                    {kpis.ltv_medio > 0 && (
                      <li>• Cada cliente gasta em média R$ {Number(kpis.ltv_medio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no total</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}
