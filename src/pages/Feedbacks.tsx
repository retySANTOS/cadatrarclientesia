import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Star, MessageSquare, ThumbsUp, ThumbsDown, Search, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Organizacao { id: string; nome: string; }

interface ResumoFeedback {
  cliente: string;
  slug: string;
  organizacao_id: string;
  total_feedbacks: number;
  media_nota: number;
  total_satisfeitos: number;
  total_neutros: number;
  total_insatisfeitos: number;
  perc_satisfeitos: number;
  perc_insatisfeitos: number;
  notas_5: number;
  notas_4: number;
  notas_3: number;
  notas_2: number;
  notas_1: number;
}

interface FeedbackDetalhado {
  pedido_id: string;
  organizacao_id: string;
  organizacao_nome: string;
  nome_cliente: string;
  whatsapp: string;
  nota_cliente: number;
  feedback_cliente: string;
  feedback_data: string;
  status_pedido: string;
  itens: any;
  valor_total: number;
  hash_pedido: string;
}

function Stars({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(i => (
        <Star
          key={i}
          className={cn(
            i <= Math.round(rating) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-200',
          )}
          style={{ width: size, height: size }}
        />
      ))}
    </div>
  );
}

function notaBadgeColor(nota: number) {
  if (nota >= 4) return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (nota === 3) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-red-100 text-red-700 border-red-200';
}

function barColor(nota: number) {
  if (nota >= 4) return 'bg-emerald-500';
  if (nota === 3) return 'bg-yellow-500';
  return 'bg-red-500';
}

export default function Feedbacks() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organizacao | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgOpen, setOrgOpen] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  const [resumo, setResumo] = useState<ResumoFeedback | null>(null);
  const [loadingResumo, setLoadingResumo] = useState(false);

  const [feedbacks, setFeedbacks] = useState<FeedbackDetalhado[]>([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(false);

  const [activeTab, setActiveTab] = useState('resumo');
  const [notaFilter, setNotaFilter] = useState<string>('todas');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  // Load orgs
  useEffect(() => {
    supabase.from('organizacao').select('id, nome').order('nome').then(({ data }) => {
      if (data) {
        setOrgs(data);
        if (data.length === 1) {
          setSelectedOrg(data[0]);
          setOrgSearch(data[0].nome);
        }
      }
      setLoadingOrgs(false);
    });
  }, []);

  // Load resumo
  useEffect(() => {
    if (!selectedOrg) { setResumo(null); return; }
    setLoadingResumo(true);
    supabase.from('resumo_feedbacks').select('*').eq('organizacao_id', selectedOrg.id).single().then(({ data }) => {
      setResumo(data as ResumoFeedback | null);
      setLoadingResumo(false);
    });
  }, [selectedOrg]);

  // Load feedbacks detalhados
  useEffect(() => {
    if (!selectedOrg) { setFeedbacks([]); return; }
    setLoadingFeedbacks(true);
    let query = supabase.from('feedbacks_detalhado').select('*').eq('organizacao_id', selectedOrg.id).order('feedback_data', { ascending: false });
    query.then(({ data }) => {
      setFeedbacks((data as FeedbackDetalhado[]) ?? []);
      setLoadingFeedbacks(false);
    });
  }, [selectedOrg]);

  const filteredOrgs = useMemo(
    () => orgSearch.length > 0 ? orgs.filter(o => o.nome?.toLowerCase().includes(orgSearch.toLowerCase())) : orgs,
    [orgSearch, orgs]
  );

  const filteredFeedbacks = useMemo(() => {
    let list = feedbacks;
    if (notaFilter !== 'todas') {
      list = list.filter(f => f.nota_cliente === Number(notaFilter));
    }
    if (dateFrom) {
      list = list.filter(f => new Date(f.feedback_data) >= dateFrom);
    }
    if (dateTo) {
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      list = list.filter(f => new Date(f.feedback_data) <= end);
    }
    return list;
  }, [feedbacks, notaFilter, dateFrom, dateTo]);

  const handleBarClick = (nota: string) => {
    setNotaFilter(nota);
    setActiveTab('detalhados');
  };

  const notasBars = resumo ? [
    { nota: 5, count: resumo.notas_5 ?? 0 },
    { nota: 4, count: resumo.notas_4 ?? 0 },
    { nota: 3, count: resumo.notas_3 ?? 0 },
    { nota: 2, count: resumo.notas_2 ?? 0 },
    { nota: 1, count: resumo.notas_1 ?? 0 },
  ] : [];

  const maxCount = Math.max(...notasBars.map(n => n.count), 1);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Feedbacks</h1>
          <p className="text-sm text-slate-500">Análise de feedbacks dos clientes</p>
        </div>

        {/* Org selector - show only if more than 1 org */}
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="resumo">Resumo</TabsTrigger>
            <TabsTrigger value="detalhados">Feedbacks detalhados</TabsTrigger>
          </TabsList>

          {/* ======= ABA RESUMO ======= */}
          <TabsContent value="resumo">
            {!selectedOrg ? (
              <div className="text-center text-slate-400 py-16">Selecione uma organização para ver os feedbacks</div>
            ) : loadingResumo ? (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
                </div>
                <Skeleton className="h-48 w-full rounded-lg" />
              </div>
            ) : !resumo ? (
              <div className="text-center text-slate-400 py-16">Nenhum feedback recebido ainda</div>
            ) : (
              <div className="space-y-6 mt-4">
                {/* Cards de métricas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card className="shadow-sm border-slate-100">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="rounded-lg bg-blue-100 p-3"><Star className="h-5 w-5 text-blue-600" /></div>
                      <div>
                        <p className="text-sm text-slate-500">Média geral</p>
                        <div className="flex items-center gap-2">
                          <p className="text-2xl font-bold text-slate-800">{Number(resumo.media_nota ?? 0).toFixed(1)}</p>
                          <Stars rating={Number(resumo.media_nota ?? 0)} size={14} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-slate-100">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="rounded-lg bg-orange-100 p-3"><MessageSquare className="h-5 w-5 text-orange-600" /></div>
                      <div>
                        <p className="text-sm text-slate-500">Total de feedbacks</p>
                        <p className="text-2xl font-bold text-slate-800">{Number(resumo.total_feedbacks ?? 0).toLocaleString('pt-BR')}</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-slate-100">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="rounded-lg bg-emerald-100 p-3"><ThumbsUp className="h-5 w-5 text-emerald-600" /></div>
                      <div>
                        <p className="text-sm text-slate-500">Satisfeitos (4-5)</p>
                        <p className="text-2xl font-bold text-emerald-600">{Number(resumo.perc_satisfeitos ?? 0).toFixed(1)}%</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-slate-100">
                    <CardContent className="p-5 flex items-center gap-4">
                      <div className="rounded-lg bg-red-100 p-3"><ThumbsDown className="h-5 w-5 text-red-600" /></div>
                      <div>
                        <p className="text-sm text-slate-500">Insatisfeitos (1-2)</p>
                        <p className="text-2xl font-bold text-red-600">{Number(resumo.perc_insatisfeitos ?? 0).toFixed(1)}%</p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Distribuição de notas */}
                <Card className="shadow-sm border-slate-100">
                  <CardContent className="p-6">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">Distribuição de notas</h3>
                    <div className="space-y-3">
                      {notasBars.map(({ nota, count }) => (
                        <button
                          key={nota}
                          onClick={() => handleBarClick(String(nota))}
                          className="flex items-center gap-3 w-full group hover:bg-slate-50 rounded-md px-2 py-1 transition-colors"
                        >
                          <span className="text-sm font-medium text-slate-600 w-4 text-right">{nota}</span>
                          <Star className={cn('h-4 w-4', nota >= 4 ? 'fill-yellow-400 text-yellow-400' : nota === 3 ? 'fill-yellow-300 text-yellow-300' : 'fill-slate-300 text-slate-300')} />
                          <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={cn('h-full rounded-full transition-all', barColor(nota))}
                              style={{ width: `${(count / maxCount) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-slate-600 w-10 text-right group-hover:text-blue-700">{count}</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* ======= ABA DETALHADOS ======= */}
          <TabsContent value="detalhados">
            {!selectedOrg ? (
              <div className="text-center text-slate-400 py-16">Selecione uma organização para ver os feedbacks</div>
            ) : (
              <div className="space-y-4 mt-4">
                {/* Filtros */}
                <div className="flex flex-wrap items-end gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Nota</label>
                    <Select value={notaFilter} onValueChange={setNotaFilter}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas</SelectItem>
                        {[5, 4, 3, 2, 1].map(n => (
                          <SelectItem key={n} value={String(n)}>{n} estrela{n > 1 ? 's' : ''}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">De</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-36 justify-start text-left font-normal', !dateFrom && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Início'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Até</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-36 justify-start text-left font-normal', !dateTo && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Fim'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus className="p-3 pointer-events-auto" />
                      </PopoverContent>
                    </Popover>
                  </div>

                  {(notaFilter !== 'todas' || dateFrom || dateTo) && (
                    <Button variant="ghost" size="sm" className="text-xs text-blue-600" onClick={() => { setNotaFilter('todas'); setDateFrom(undefined); setDateTo(undefined); }}>
                      Limpar filtros
                    </Button>
                  )}
                </div>

                {/* Lista de feedbacks */}
                {loadingFeedbacks ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-lg" />)}
                  </div>
                ) : filteredFeedbacks.length === 0 ? (
                  <div className="text-center text-slate-400 py-16">Nenhum feedback recebido ainda</div>
                ) : (
                  <div className="space-y-3">
                    {filteredFeedbacks.map(fb => (
                      <Card key={fb.pedido_id} className="shadow-sm border-slate-100">
                        <CardContent className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className="font-semibold text-slate-800">{fb.nome_cliente || 'Cliente'}</span>
                                <Badge className={cn('text-xs border', notaBadgeColor(fb.nota_cliente))}>
                                  {fb.nota_cliente} ★
                                </Badge>
                                {fb.status_pedido && (
                                  <Badge variant="secondary" className="text-xs">
                                    {fb.status_pedido}
                                  </Badge>
                                )}
                              </div>
                              {fb.feedback_cliente && (
                                <p className="text-sm text-slate-600 mt-1">{fb.feedback_cliente}</p>
                              )}
                              <p className="text-xs text-slate-400 mt-2">
                                {fb.feedback_data ? format(new Date(fb.feedback_data), "dd/MM/yyyy HH:mm", { locale: ptBR }) : '—'}
                              </p>
                            </div>
                            <Stars rating={fb.nota_cliente} size={14} />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
