import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Upload, Users, ShoppingBag, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface Organizacao { id: string; nome: string; }

interface GplusRow {
  ID_VENDA: number;
  NOME_CLIENTE: string;
  CELULAR: string | number;
  DATA_VENDA: string;
  HORA_VENDA: string;
  PRODUTO: string;
  VALOR_ITEM?: number | string;
  VALOR_VENDA: number;
  VALOR_FINAL: number;
}

interface PedidoImport {
  id_venda: number;
  nome_cliente: string;
  whatsapp: string;
  data_venda: string;
  itens: { nome: string; quantidade: number; valor_unitario: number }[];
  valor_subtotal: number;
  valor_total: number;
  taxa_entrega: number;
}

interface ImportResult {
  clientesNovos: number;
  clientesAtualizados: number;
  pedidosNovos: number;
  pedidosDuplicados: number;
  erros: string[];
}

export default function ImportacaoDados() {
  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [pedidos, setPedidos] = useState<PedidoImport[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload');

  useEffect(() => {
    supabase.from('organizacao').select('id, nome').order('nome').then(({ data }) => {
      setOrgs((data as Organizacao[]) ?? []);
      if (data?.length === 1) setSelectedOrgId(data[0].id);
    });
  }, []);

  const groupPedidos = (data: GplusRow[]): PedidoImport[] => {
    const map = new Map<number, PedidoImport>();
    for (const row of data) {
      const cel = String(row.CELULAR).replace(/\D/g, '');
      const whatsapp = cel.startsWith('55') ? cel : '55' + cel;
      const idVenda = Number(row.ID_VENDA);
      if (!map.has(idVenda)) {
        const dataStr = row.DATA_VENDA ? String(row.DATA_VENDA).split('T')[0] : '';
        const horaStr = row.HORA_VENDA ? String(row.HORA_VENDA).substring(0, 8) : '00:00:00';
        map.set(idVenda, {
          id_venda: idVenda,
          nome_cliente: String(row.NOME_CLIENTE ?? '').trim(),
          whatsapp,
          data_venda: `${dataStr}T${horaStr}`,
          itens: [],
          valor_subtotal: Number(row.VALOR_VENDA) || 0,
          valor_total: Number(row.VALOR_FINAL) || 0,
          taxa_entrega: Number(row.VALOR_FINAL) - Number(row.VALOR_VENDA),
        });
      }
      map.get(idVenda)!.itens.push({
        nome: String(row.PRODUTO ?? '').trim(),
        quantidade: 1,
        valor_unitario: row.VALOR_ITEM !== undefined && row.VALOR_ITEM !== '' ? Number(row.VALOR_ITEM) : 0,
      });
    }
    return Array.from(map.values());
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setResult(null);
    setStep('upload');
    try {
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<GplusRow>(ws, { raw: false, dateNF: 'yyyy-mm-dd' });
      const grouped = groupPedidos(data);
      if (grouped.length === 0) { toast.error('Nenhum dado encontrado no arquivo'); return; }
      setPedidos(grouped);
      setStep('preview');
    } catch {
      toast.error('Erro ao ler arquivo. Verifique se é um export válido do Gplus.');
    }
  };

  const uniqueClientes = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of pedidos) map.set(p.whatsapp, p.nome_cliente);
    return Array.from(map.entries()).map(([whatsapp, nome]) => ({ whatsapp, nome }));
  }, [pedidos]);

  const handleImport = async () => {
    if (!selectedOrgId) { toast.error('Selecione uma organização'); return; }
    setImporting(true);
    const res: ImportResult = { clientesNovos: 0, clientesAtualizados: 0, pedidosNovos: 0, pedidosDuplicados: 0, erros: [] };
    try {
      const { data: existentes } = await supabase.from('usuarios').select('whatsapp').eq('organizacao_id', selectedOrgId);
      const existentesSet = new Set((existentes ?? []).map((u: any) => u.whatsapp));
      for (let i = 0; i < uniqueClientes.length; i += 50) {
        const batch = uniqueClientes.slice(i, i + 50);
        const novos = batch.filter(c => !existentesSet.has(c.whatsapp));
        const existem = batch.filter(c => existentesSet.has(c.whatsapp));
        if (novos.length > 0) {
          const { error } = await supabase.from('usuarios').insert(novos.map(c => ({ Nome: c.nome, whatsapp: c.whatsapp, organizacao_id: selectedOrgId })));
          if (error) res.erros.push(`Clientes: ${error.message}`);
          else res.clientesNovos += novos.length;
        }
        for (const c of existem) {
          await supabase.from('usuarios').update({ Nome: c.nome }).eq('whatsapp', c.whatsapp).eq('organizacao_id', selectedOrgId);
          res.clientesAtualizados++;
        }
      }
      const hashes = pedidos.map(p => `gplus_${p.id_venda}`);
      const { data: existentesP } = await supabase.from('pedidos').select('hash_pedido').eq('organizacao_id', selectedOrgId).in('hash_pedido', hashes);
      const hashesExistentes = new Set((existentesP ?? []).map((p: any) => p.hash_pedido));
      const pedidosNovos = pedidos.filter(p => !hashesExistentes.has(`gplus_${p.id_venda}`)).map(p => ({
        organizacao_id: selectedOrgId,
        whatsapp: p.whatsapp,
        nome_cliente: p.nome_cliente,
        itens: p.itens,
        valor_subtotal: p.valor_subtotal,
        taxa_entrega: p.taxa_entrega,
        valor_total: p.valor_total,
        status_pedido: 'Seu pedido já foi entregue',
        plataforma: 'importado',
        hash_pedido: `gplus_${p.id_venda}`,
        created_at: p.data_venda,
      }));
      res.pedidosDuplicados = pedidos.length - pedidosNovos.length;
      for (let i = 0; i < pedidosNovos.length; i += 50) {
        const { error } = await supabase.from('pedidos').insert(pedidosNovos.slice(i, i + 50));
        if (error) res.erros.push(`Pedidos lote ${i + 1}: ${error.message}`);
        else res.pedidosNovos += pedidosNovos.slice(i, i + 50).length;
      }
    } catch (err: any) {
      res.erros.push(err.message ?? 'Erro inesperado');
    }
    setResult(res);
    setImporting(false);
    setStep('done');
    if (res.erros.length === 0) toast.success('Importação concluída com sucesso!');
    else toast.error(`Importação com ${res.erros.length} erro(s)`);
  };

  const handleReset = () => { setPedidos([]); setResult(null); setStep('upload'); };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Importação de dados</h1>
          <p className="text-sm text-muted-foreground">Importe clientes e pedidos a partir do export do Gplus ToGO</p>
        </div>

        <div className="max-w-md space-y-2">
          <Label>Organização</Label>
          <Select value={selectedOrgId} onValueChange={setSelectedOrgId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma organização" />
            </SelectTrigger>
            <SelectContent>
              {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {step === 'upload' && (
          <Card>
            <CardContent className="space-y-6 p-6">
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center transition-colors hover:bg-muted/50">
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} disabled={!selectedOrgId} />
                <Upload className="mb-4 h-10 w-10 text-muted-foreground" />
                <span className="text-base font-semibold text-foreground">Toque para selecionar o arquivo</span>
                <span className="text-sm text-muted-foreground">Export do Gplus ToGO (.xlsx)</span>
              </label>

              {!selectedOrgId && <p className="text-sm text-destructive">⚠️ Selecione uma organização antes de fazer o upload</p>}

              <div className="rounded-lg border border-border bg-background p-4">
                <h2 className="mb-3 font-semibold text-foreground">Como exportar do Gplus</h2>
                <ol className="list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Acesse o painel do Gplus ToGO</li>
                  <li>Vá em Relatórios → Produtos</li>
                  <li>Selecione o período desejado</li>
                  <li>Clique em Exportar → Excel</li>
                  <li>Faça upload do arquivo aqui</li>
                </ol>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 'preview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-xl bg-primary/10 p-3"><Users className="h-6 w-6 text-primary" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Clientes</p>
                    <p className="text-3xl font-bold text-foreground">{uniqueClientes.length}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="rounded-xl bg-primary/10 p-3"><ShoppingBag className="h-6 w-6 text-primary" /></div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pedidos</p>
                    <p className="text-3xl font-bold text-foreground">{pedidos.length}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardContent className="space-y-4 p-6">
                <h2 className="font-semibold text-foreground">Prévia — primeiros 5 pedidos</h2>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>WhatsApp</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Itens</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pedidos.slice(0, 5).map(p => (
                        <TableRow key={p.id_venda}>
                          <TableCell>{p.nome_cliente}</TableCell>
                          <TableCell>{p.whatsapp}</TableCell>
                          <TableCell>{p.data_venda.split('T')[0].split('-').reverse().join('/')}</TableCell>
                          <TableCell>{p.itens.map(item => item.nome).join(' · ')}</TableCell>
                          <TableCell className="text-right">R$ {p.valor_total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {pedidos.length > 5 && <p className="text-sm text-muted-foreground">+ {pedidos.length - 5} pedidos restantes</p>}
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleReset} disabled={importing}>Cancelar</Button>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Importando...</> : <>Confirmar importação</>}
              </Button>
            </div>
          </div>
        )}

        {step === 'done' && result && (
          <div className="space-y-6">
            <Card>
              <CardContent className="space-y-6 p-6">
                <div className="flex items-center gap-3">
                  {result.erros.length === 0 ? <CheckCircle className="h-7 w-7 text-primary" /> : <AlertCircle className="h-7 w-7 text-destructive" />}
                  <h2 className="text-xl font-bold text-foreground">{result.erros.length === 0 ? 'Importação concluída com sucesso!' : 'Importação concluída com avisos'}</h2>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-2xl font-bold text-foreground">{result.clientesNovos}</p>
                    <p className="text-sm text-muted-foreground">Clientes novos</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-2xl font-bold text-foreground">{result.clientesAtualizados}</p>
                    <p className="text-sm text-muted-foreground">Clientes atualizados</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-2xl font-bold text-foreground">{result.pedidosNovos}</p>
                    <p className="text-sm text-muted-foreground">Pedidos importados</p>
                  </div>
                  <div className="rounded-lg border border-border p-4">
                    <p className="text-2xl font-bold text-foreground">{result.pedidosDuplicados}</p>
                    <p className="text-sm text-muted-foreground">Já existiam</p>
                  </div>
                </div>

                {result.erros.length > 0 && (
                  <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4">
                    <p className="mb-2 font-semibold text-destructive">Erros:</p>
                    {result.erros.map((e, i) => <p key={i} className="text-sm text-destructive">{e}</p>)}
                  </div>
                )}
              </CardContent>
            </Card>
            <Button onClick={handleReset}>Importar outro arquivo</Button>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
