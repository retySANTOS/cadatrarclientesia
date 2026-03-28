import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MessageSquare, Coins, DollarSign, Search } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface Organizacao {
  id: string;
  nome: string;
  slug: string;
  ativado: boolean;
  total_atendimentos?: number;
  total_tokens?: number;
  custo_estimado?: number;
}

export default function Relatorios() {
  const [organizacoes, setOrganizacoes] = useState<Organizacao[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Organizacao | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.from('organizacao').select('*').then(({ data }) => {
      if (data) setOrganizacoes(data);
    });
  }, []);

  const filtered = useMemo(
    () => search.length > 0
      ? organizacoes.filter(o => o.nome?.toLowerCase().includes(search.toLowerCase()))
      : organizacoes,
    [search, organizacoes]
  );

  const metrics = selected
    ? {
        atendimentos: selected.total_atendimentos ?? 0,
        tokens: selected.total_tokens ?? 0,
        custo: selected.custo_estimado ?? 0,
      }
    : {
        atendimentos: organizacoes.reduce((s, o) => s + (o.total_atendimentos ?? 0), 0),
        tokens: organizacoes.reduce((s, o) => s + (o.total_tokens ?? 0), 0),
        custo: organizacoes.reduce((s, o) => s + (o.custo_estimado ?? 0), 0),
      };

  const tableData = selected ? [selected] : filtered;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Consumo IA</h1>
            <p className="text-sm text-slate-500">Relatório de consumo por organização</p>
          </div>
        </div>

        {/* Autocomplete search */}
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
              {filtered.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-400">Nenhum resultado</li>
              )}
              {filtered.map(org => (
                <li
                  key={org.id}
                  className="px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700"
                  onClick={() => { setSelected(org); setSearch(org.nome); setOpen(false); }}
                >
                  {org.nome}
                </li>
              ))}
            </ul>
          </PopoverContent>
        </Popover>

        {selected && (
          <button
            className="text-xs text-blue-600 hover:underline"
            onClick={() => { setSelected(null); setSearch(''); }}
          >
            ← Limpar filtro
          </button>
        )}

        {/* Metric cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-lg bg-blue-100 p-3">
                <MessageSquare className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Atendimentos</p>
                <p className="text-2xl font-bold text-slate-800">{metrics.atendimentos.toLocaleString('pt-BR')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-lg bg-orange-100 p-3">
                <Coins className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Consumo de Tokens</p>
                <p className="text-2xl font-bold text-slate-800">{metrics.tokens.toLocaleString('pt-BR')}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm border-slate-100">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="rounded-lg bg-emerald-100 p-3">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Custo Estimado</p>
                <p className="text-2xl font-bold text-slate-800">R$ {metrics.custo.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Data table */}
        <Card className="shadow-sm border-slate-100">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Organização</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Atendimentos</TableHead>
                <TableHead className="text-right">Tokens</TableHead>
                <TableHead className="text-right">Custo (R$)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tableData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                    Nenhuma organização encontrada
                  </TableCell>
                </TableRow>
              )}
              {tableData.map(org => (
                <TableRow key={org.id}>
                  <TableCell className="font-medium">{org.nome}</TableCell>
                  <TableCell className="text-slate-500">{org.slug}</TableCell>
                  <TableCell className="text-center">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${org.ativado ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                      {org.ativado ? 'Ativo' : 'Inativo'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">{(org.total_atendimentos ?? 0).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right">{(org.total_tokens ?? 0).toLocaleString('pt-BR')}</TableCell>
                  <TableCell className="text-right">{(org.custo_estimado ?? 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </DashboardLayout>
  );
}
