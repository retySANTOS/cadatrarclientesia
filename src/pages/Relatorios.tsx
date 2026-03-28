import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, Coins, DollarSign, Search, FileDown, FileSpreadsheet } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { exportToPDF, exportToExcel } from '@/lib/exportUtils';

interface ResumoFaturamento {
  cliente: string;
  total_atendimentos: number;
  total_tokens: number;
  custo_api_reais: number;
}

const columns = [
  { header: 'Organização', key: 'cliente' },
  { header: 'Atendimentos', key: 'total_atendimentos', align: 'right' as const },
  { header: 'Tokens', key: 'total_tokens', align: 'right' as const, format: (v: number) => (v ?? 0).toLocaleString('pt-BR') },
  { header: 'Custo (R$)', key: 'custo_api_reais', align: 'right' as const, format: (v: number) => (v ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) },
];

export default function Relatorios() {
  const [dados, setDados] = useState<ResumoFaturamento[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ResumoFaturamento | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.from('resumo_faturamento').select('*').then(({ data }) => {
      if (data) setDados(data as ResumoFaturamento[]);
    });
  }, []);

  const filtered = useMemo(
    () => search.length > 0
      ? dados.filter(d => d.cliente?.toLowerCase().includes(search.toLowerCase()))
      : dados,
    [search, dados]
  );

  const metrics = selected
    ? { atendimentos: selected.total_atendimentos ?? 0, tokens: selected.total_tokens ?? 0, custo: selected.custo_api_reais ?? 0 }
    : {
        atendimentos: dados.reduce((s, d) => s + (d.total_atendimentos ?? 0), 0),
        tokens: dados.reduce((s, d) => s + (d.total_tokens ?? 0), 0),
        custo: dados.reduce((s, d) => s + (d.custo_api_reais ?? 0), 0),
      };

  const tableData = selected ? [selected] : filtered;

  const handleExport = (type: 'pdf' | 'excel') => {
    const fn = type === 'pdf' ? exportToPDF : exportToExcel;
    fn({ title: 'Consumo IA', columns, data: tableData, fileName: 'consumo-ia' });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Consumo IA</h1>
            <p className="text-sm text-slate-500">Relatório de consumo por organização</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')} className="gap-1.5">
              <FileSpreadsheet className="h-4 w-4" /> Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')} className="gap-1.5">
              <FileDown className="h-4 w-4" /> PDF
            </Button>
          </div>
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Buscar organização..."
                value={search}
                onChange={e => { setSearch(e.target.value); setSelected(null); setOpen(true); }}
                onFocus={() => setOpen(true)}
                className="pl-9"
              />
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" onOpenAutoFocus={e => e.preventDefault()}>
            <ul className="max-h-56 overflow-auto py-1">
              {filtered.length === 0 && <li className="px-3 py-2 text-sm text-slate-400">Nenhum resultado</li>}
              {filtered.map((item, idx) => (
                <li key={idx} className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700"
                  onClick={() => { setSelected(item); setSearch(item.cliente); setOpen(false); }}>
                  {item.cliente}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        {selected && (
          <button className="text-xs text-blue-600 hover:underline" onClick={() => { setSelected(null); setSearch(''); }}>
            ← Limpar filtro
          </button>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-lg bg-blue-100 p-3"><MessageSquare className="h-5 w-5 text-blue-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Total Atendimentos</p>
                <p className="text-2xl font-bold text-slate-800">{metrics.atendimentos.toLocaleString('pt-BR')}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-lg bg-orange-100 p-3"><Coins className="h-5 w-5 text-orange-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Consumo de Tokens</p>
                <p className="text-2xl font-bold text-slate-800">{metrics.tokens.toLocaleString('pt-BR')}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-lg bg-emerald-100 p-3"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
              <div>
                <p className="text-sm text-slate-500">Custo Estimado</p>
                <p className="text-2xl font-bold text-slate-800">R$ {metrics.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-sm border-slate-100">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organização</TableHead>
                <TableHead className="text-right">Atendimentos</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Custo (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center text-slate-400 py-8">Nenhum dado encontrado</TableCell></TableRow>
              )}
              {tableData.map((item, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium">{item.cliente}</TableCell>
                  <TableCell className="text-right">{(item.total_atendimentos ?? 0).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right">{(item.total_tokens ?? 0).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right">{(item.custo_api_reais ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
