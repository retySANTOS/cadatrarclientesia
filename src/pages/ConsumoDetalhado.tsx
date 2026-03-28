import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, Coins, DollarSign, Search, ArrowUpDown, ExternalLink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

interface Organizacao {
  id: string;
  nome: string;
}

interface ConsumoAvancado {
  organizacao_id: string;
  whatsapp_cliente: string;
  total_atendimentos: number;
  total_tokens: number;
  custo_estimado_reais: number;
}

type SortField = 'total_tokens' | 'total_atendimentos';
type SortDir = 'asc' | 'desc';

export default function ConsumoDetalhado() {
  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organizacao | null>(null);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [dados, setDados] = useState<ConsumoAvancado[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [sortField, setSortField] = useState<SortField>('total_tokens');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => {
    supabase.from('organizacao').select('id, nome').order('nome').then(({ data }) => {
      if (data) setOrgs(data);
      setLoadingOrgs(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedOrg) { setDados([]); return; }
    setLoading(true);
    supabase
      .from('relatorio_consumo_avancado')
      .select('*')
      .eq('organizacao_id', selectedOrg.id)
      .then(({ data }) => {
        if (data) setDados(data as ConsumoAvancado[]);
        setLoading(false);
      });
  }, [selectedOrg]);

  const filteredOrgs = useMemo(
    () => search.length > 0
      ? orgs.filter(o => o.nome?.toLowerCase().includes(search.toLowerCase()))
      : orgs,
    [search, orgs]
  );

  const sorted = useMemo(() => {
    return [...dados].sort((a, b) => {
      const va = a[sortField] ?? 0;
      const vb = b[sortField] ?? 0;
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [dados, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const totalClientes = new Set(dados.map(d => d.whatsapp_cliente)).size;
  const totalTokens = dados.reduce((s, d) => s + (d.total_tokens ?? 0), 0);
  const totalCusto = dados.reduce((s, d) => s + (d.custo_estimado_reais ?? 0), 0);
  const totalAtendimentos = dados.reduce((s, d) => s + (d.total_atendimentos ?? 0), 0);

  const fmtNum = (n: number) => n.toLocaleString('pt-BR');
  const fmtCusto = (n: number) => `R$ ${n.toLocaleString('pt-BR', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`;
  const whatsappLink = (num: string) => `https://wa.me/${num.replace(/\D/g, '')}`;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Consumo Detalhado</h1>
          <p className="text-sm text-slate-500">Relatório avançado de consumo por cliente</p>
        </div>

        {/* Combobox */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar organização..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelectedOrg(null); setOpen(true); }}
                onFocus={() => setOpen(true)}
                className="pl-9"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" onOpenAutoFocus={e => e.preventDefault()}>
            <ul className="max-h-56 overflow-auto py-1">
              {loadingOrgs && <li className="px-3 py-2 text-sm text-slate-400">Carregando...</li>}
              {!loadingOrgs && filteredOrgs.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-400">Nenhum resultado</li>
              )}
              {filteredOrgs.map(org => (
                <li
                  key={org.id}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700"
                  onClick={() => { setSelectedOrg(org); setSearch(org.nome); setOpen(false); }}
                >
                  {org.nome}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        {selectedOrg && (
          <button
            className="text-xs text-blue-600 hover:underline"
            onClick={() => { setSelectedOrg(null); setSearch(''); setDados([]); }}
          >
            ← Limpar filtro
          </button>
        )}

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-lg bg-blue-900 p-3">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total de Clientes</p>
                {loading ? <Skeleton className="h-8 w-20" /> : (
                  <p className="text-2xl font-bold text-slate-800">{fmtNum(totalClientes)}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-lg bg-orange-500 p-3">
                <Coins className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total de Tokens</p>
                {loading ? <Skeleton className="h-8 w-24" /> : (
                  <p className="text-2xl font-bold text-slate-800">{fmtNum(totalTokens)}</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-lg bg-blue-900 p-3">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Custo Total Estimado</p>
                {loading ? <Skeleton className="h-8 w-28" /> : (
                  <p className="text-2xl font-bold text-slate-800">{fmtCusto(totalCusto)}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela */}
        <Card className="shadow-sm border-slate-100">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground" onClick={() => toggleSort('total_atendimentos')}>
                      Atendimentos <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button variant="ghost" size="sm" className="h-auto p-0 font-medium text-muted-foreground hover:text-foreground" onClick={() => toggleSort('total_tokens')}>
                      Tokens <ArrowUpDown className="ml-1 h-3 w-3 inline" />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">Custo (R$)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-400 py-8">
                      {selectedOrg ? 'Nenhum dado encontrado' : 'Selecione uma organização acima'}
                    </TableCell>
                  </TableRow>
                )}
                {sorted.map((item, idx) => (
                  <TableRow key={idx}>
                    <TableCell>
                      <a
                        href={whatsappLink(item.whatsapp_cliente)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        {item.whatsapp_cliente}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </TableCell>
                    <TableCell className="text-right">{fmtNum(item.total_atendimentos ?? 0)}</TableCell>
                    <TableCell className="text-right">{fmtNum(item.total_tokens ?? 0)}</TableCell>
                    <TableCell className="text-right">{fmtCusto(item.custo_estimado_reais ?? 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              {sorted.length > 0 && (
                <TableFooter>
                  <TableRow className="bg-slate-50 font-semibold">
                    <TableCell>TOTAIS</TableCell>
                    <TableCell className="text-right">{fmtNum(totalAtendimentos)}</TableCell>
                    <TableCell className="text-right">{fmtNum(totalTokens)}</TableCell>
                    <TableCell className="text-right">{fmtCusto(totalCusto)}</TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
