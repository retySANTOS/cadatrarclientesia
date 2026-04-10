import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, ShoppingBag, Package, DollarSign, ArrowUpDown } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface Organizacao { id: string; nome: string; }
interface GrupoProduto { id: string; nome: string; organizacao_id: string; }

interface ProdutoRow {
  nome_produto: string;
  grupo: string | null;
  total_quantidade: number;
  total_receita: number;
}

type SortKey = 'nome_produto' | 'grupo' | 'total_quantidade' | 'total_receita' | 'participacao';

export default function RelatorioProdutos() {
  const { user } = useAuth();

  // Org selector
  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organizacao | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgOpen, setOrgOpen] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  // Filters
  const [periodo, setPeriodo] = useState('7');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [horaInicio, setHoraInicio] = useState('00:00');
  const [horaFim, setHoraFim] = useState('23:59');
  const [grupoFiltro, setGrupoFiltro] = useState('todos');
  const [grupos, setGrupos] = useState<GrupoProduto[]>([]);

  // Data
  const [rawData, setRawData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchProduto, setSearchProduto] = useState('');

  // Sort
  const [sortKey, setSortKey] = useState<SortKey>('total_quantidade');
  const [sortAsc, setSortAsc] = useState(false);

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

  // Load grupos when org changes
  useEffect(() => {
    if (!selectedOrg) { setGrupos([]); return; }
    supabase.from('grupos_produtos').select('id, nome, organizacao_id').eq('organizacao_id', selectedOrg.id).order('nome')
      .then(({ data }) => setGrupos((data as GrupoProduto[]) ?? []));
  }, [selectedOrg]);

  const filteredOrgs = useMemo(
    () => orgSearch.length > 0 ? orgs.filter(o => o.nome?.toLowerCase().includes(orgSearch.toLowerCase())) : orgs,
    [orgSearch, orgs],
  );

  // Compute date range from periodo
  const getDateRange = () => {
    if (periodo === 'custom') return { start: dataInicio, end: dataFim };
    const days = Number(periodo);
    const now = new Date();
    const start = format(subDays(now, days === 0 ? 0 : days), 'yyyy-MM-dd');
    const end = format(now, 'yyyy-MM-dd');
    return { start, end };
  };

  const handleBuscar = async () => {
    if (!selectedOrg) { toast.error('Selecione uma organização'); return; }
    const { start, end } = getDateRange();
    if (!start || !end) { toast.error('Informe o período'); return; }

    setLoading(true);
    const { data, error } = await supabase.rpc('buscar_relatorio_produtos', {
      p_org_id: selectedOrg.id,
      p_data_inicio: start,
      p_data_fim: end,
      p_hora_inicio: horaInicio,
      p_hora_fim: horaFim,
      p_grupo: grupoFiltro === 'todos' ? null : grupoFiltro,
    });
    if (error) { toast.error('Erro ao buscar dados: ' + error.message); setLoading(false); return; }
    setRawData(data ?? []);
    setLoading(false);
  };

  const handleLimpar = () => {
    setPeriodo('7');
    setDataInicio('');
    setDataFim('');
    setHoraInicio('00:00');
    setHoraFim('23:59');
    setGrupoFiltro('todos');
    setSearchProduto('');
    setRawData([]);
  };

  // Aggregate by nome_produto
  const aggregated = useMemo(() => {
    const map = new Map<string, ProdutoRow>();
    for (const row of rawData) {
      const key = row.nome_produto as string;
      const existing = map.get(key);
      if (existing) {
        existing.total_quantidade += Number(row.total_quantidade ?? 0);
        existing.total_receita += Number(row.total_receita ?? 0);
      } else {
        map.set(key, {
          nome_produto: key,
          grupo: row.grupo ?? null,
          total_quantidade: Number(row.total_quantidade ?? 0),
          total_receita: Number(row.total_receita ?? 0),
        });
      }
    }
    return Array.from(map.values());
  }, [rawData]);

  // Metrics
  const totalItens = aggregated.reduce((s, r) => s + r.total_quantidade, 0);
  const totalReceita = aggregated.reduce((s, r) => s + r.total_receita, 0);
  const totalProdutos = aggregated.length;

  // Filter + sort
  const displayData = useMemo(() => {
    let list = aggregated;
    if (searchProduto) {
      const q = searchProduto.toLowerCase();
      list = list.filter(r => r.nome_produto.toLowerCase().includes(q));
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'nome_produto') cmp = a.nome_produto.localeCompare(b.nome_produto);
      else if (sortKey === 'grupo') cmp = (a.grupo ?? '').localeCompare(b.grupo ?? '');
      else if (sortKey === 'total_quantidade') cmp = a.total_quantidade - b.total_quantidade;
      else if (sortKey === 'total_receita') cmp = a.total_receita - b.total_receita;
      else if (sortKey === 'participacao') cmp = (totalReceita ? a.total_receita / totalReceita : 0) - (totalReceita ? b.total_receita / totalReceita : 0);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [aggregated, searchProduto, sortKey, sortAsc, totalReceita]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(false); }
  };

  const SortHeader = ({ label, field }: { label: string; field: SortKey }) => (
    <button className="flex items-center gap-1 hover:text-slate-800 transition-colors" onClick={() => toggleSort(field)}>
      {label}
      <ArrowUpDown className={cn('h-3 w-3', sortKey === field ? 'text-blue-600' : 'text-slate-300')} />
    </button>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Produtos vendidos</h1>
          <p className="text-sm text-slate-500">Análise detalhada por item</p>
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
          <div className="text-center text-slate-400 py-16">Selecione uma organização para ver o relatório</div>
        ) : (
          <>
            {/* Filters */}
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Período</label>
                <Select value={periodo} onValueChange={v => setPeriodo(v)}>
                  <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Hoje</SelectItem>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="custom">Personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {periodo === 'custom' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">De</label>
                    <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="w-40" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-500">Até</label>
                    <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="w-40" />
                  </div>
                </>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Hora início</label>
                <Input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} className="w-32" />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Hora fim</label>
                <Input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} className="w-32" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-500">Grupo</label>
                <Select value={grupoFiltro} onValueChange={setGrupoFiltro}>
                  <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os grupos</SelectItem>
                    {grupos.map(g => <SelectItem key={g.id} value={g.nome}>{g.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleBuscar} className="gap-2">
                <Search className="h-4 w-4" /> Buscar
              </Button>
              <Button variant="ghost" size="sm" className="text-xs text-blue-600" onClick={handleLimpar}>
                Limpar
              </Button>
            </div>

            {/* Metrics cards */}
            {rawData.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="shadow-sm border-slate-100">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="rounded-lg bg-blue-100 p-3"><Package className="h-5 w-5 text-blue-600" /></div>
                    <div>
                      <p className="text-sm text-slate-500">Total de itens vendidos</p>
                      <p className="text-2xl font-bold text-slate-800">{totalItens.toLocaleString('pt-BR')}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-100">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="rounded-lg bg-emerald-100 p-3"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
                    <div>
                      <p className="text-sm text-slate-500">Receita total</p>
                      <p className="text-2xl font-bold text-emerald-600">R$ {totalReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="shadow-sm border-slate-100">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="rounded-lg bg-orange-100 p-3"><ShoppingBag className="h-5 w-5 text-orange-600" /></div>
                    <div>
                      <p className="text-sm text-slate-500">Produtos diferentes</p>
                      <p className="text-2xl font-bold text-slate-800">{totalProdutos}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Search + Table */}
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            ) : rawData.length > 0 ? (
              <Card className="shadow-sm border-slate-100">
                <CardContent className="p-0">
                  <div className="p-4 border-b">
                    <div className="relative max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Buscar produto..."
                        value={searchProduto}
                        onChange={e => setSearchProduto(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead><SortHeader label="Produto" field="nome_produto" /></TableHead>
                        <TableHead><SortHeader label="Grupo" field="grupo" /></TableHead>
                        <TableHead className="text-right"><SortHeader label="Qtd" field="total_quantidade" /></TableHead>
                        <TableHead className="text-right"><SortHeader label="Receita" field="total_receita" /></TableHead>
                        <TableHead className="w-48"><SortHeader label="Participação" field="participacao" /></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {displayData.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-slate-400 py-8">Nenhum produto encontrado</TableCell>
                        </TableRow>
                      ) : displayData.map((row, idx) => {
                        const perc = totalReceita > 0 ? (row.total_receita / totalReceita * 100) : 0;
                        return (
                          <TableRow key={row.nome_produto}>
                            <TableCell className="text-slate-400 font-medium">{idx + 1}</TableCell>
                            <TableCell className="font-medium text-slate-800">{row.nome_produto}</TableCell>
                            <TableCell>
                              <Badge variant="secondary" className={cn('text-xs', !row.grupo && 'bg-slate-200 text-slate-500')}>
                                {row.grupo || 'Sem grupo'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right font-medium">{row.total_quantidade.toLocaleString('pt-BR')}</TableCell>
                            <TableCell className="text-right font-medium text-emerald-600">
                              R$ {row.total_receita.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={perc} className="h-2 flex-1" />
                                <span className="text-xs text-slate-500 w-12 text-right">{perc.toFixed(1)}%</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ) : null}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
