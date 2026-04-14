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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Megaphone, Users, TrendingUp, Clock, Search, Plus, Send, BarChart3,
  AlertCircle, CalendarIcon, Pencil, XCircle, Trash2, ShoppingCart, DollarSign,
  Archive, Download,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/* ── types ── */

interface Organizacao {
  id: string;
  nome: string;
  modulos: Record<string, boolean> | null;
}

interface Campanha {
  id: string;
  organizacao_id: string;
  nome: string;
  status: string;
  mensagem: string;
  filtro_clientes: string;
  data_disparo: string;
  total_enviados: number | null;
  total_responderam: number | null;
  created_at: string;
  grupo_produto: string | null;
  janela_conversao: number | null;
  cupom: string | null;
}

interface GrupoProduto {
  id: string;
  nome: string;
}

interface ResumoCampanha {
  id: string;
  organizacao_id: string;
  organizacao_nome: string;
  nome: string;
  status: string;
  data_disparo: string;
  total_enviados: number;
  total_responderam: number;
  taxa_resposta: number;
}

/* ── helpers ── */

const STATUS_COLORS: Record<string, string> = {
  agendada: 'bg-blue-100 text-blue-700 border-blue-200',
  enviando: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  enviada: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  cancelada: 'bg-red-100 text-red-700 border-red-200',
  rascunho: 'bg-slate-100 text-slate-600 border-slate-200',
  arquivada: 'bg-slate-50 text-slate-400 border-slate-200',
};

const PUBLICO_LABELS: Record<string, { title: string; desc: string }> = {
  ativos_30dias: { title: 'Ativos recentes', desc: 'Pedido nos últimos 30 dias' },
  inativos_30a90: { title: 'Inativos (31–90 dias)', desc: 'Reativação de clientes' },
  dormentes: { title: 'Dormentes (90+ dias)', desc: 'Sumiram há muito tempo' },
  todos: { title: 'Todos os clientes', desc: 'Opt-out sempre respeitado' },
};

function filtroLabel(filtro: string | null) {
  if (!filtro || !PUBLICO_LABELS[filtro]) return null;
  return PUBLICO_LABELS[filtro].title;
}

function taxa(enviados: number | null, responderam: number | null) {
  if (!enviados || enviados === 0) return 0;
  return Math.round(((responderam ?? 0) / enviados) * 100);
}

/* ── component ── */

export default function Campanhas() {
  const { user } = useAuth();

  /* orgs */
  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organizacao | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgOpen, setOrgOpen] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  /* campanhas */
  const [campanhas, setCampanhas] = useState<Campanha[]>([]);
  const [loadingCampanhas, setLoadingCampanhas] = useState(false);

  /* resumo */
  const [resumo, setResumo] = useState<ResumoCampanha[]>([]);
  const [loadingResumo, setLoadingResumo] = useState(false);

  /* conversoes */
  const [conversoes, setConversoes] = useState<any[]>([]);
  const [loadingConversoes, setLoadingConversoes] = useState(false);

  /* ui */
  const [activeTab, setActiveTab] = useState('campanhas');
  const [statusFilter, setStatusFilter] = useState('todas');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCampanha, setEditingCampanha] = useState<Campanha | null>(null);

  /* view dialog */
  const [viewCampanha, setViewCampanha] = useState<Campanha | null>(null);

  /* cancel/delete alert */
  const [cancelTarget, setCancelTarget] = useState<Campanha | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Campanha | null>(null);

  /* new campaign form */
  const [formOrgId, setFormOrgId] = useState('');
  const [formNome, setFormNome] = useState('');
  const [formData, setFormData] = useState<Date | undefined>();
  const [formHora, setFormHora] = useState('18:00');
  const [formPublico, setFormPublico] = useState('');
  const [formMensagem, setFormMensagem] = useState('');
  const [formGrupo, setFormGrupo] = useState('');
  const [formJanela, setFormJanela] = useState(7);
  const [formCupom, setFormCupom] = useState('');
  const [gruposProdutos, setGruposProdutos] = useState<GrupoProduto[]>([]);
  const [saving, setSaving] = useState(false);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  const orgsComModulo = useMemo(() => orgs.filter(o => o.modulos?.campanhas === true), [orgs]);

  /* ── data loading ── */

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

  const loadCampanhas = () => {
    setLoadingCampanhas(true);
    let q = supabase.from('campanhas').select('*').order('created_at', { ascending: false });
    if (selectedOrg) q = q.eq('organizacao_id', selectedOrg.id);
    q.then(({ data }) => {
      setCampanhas((data as Campanha[]) ?? []);
      setLoadingCampanhas(false);
    });
  };

  const loadResumo = () => {
    setLoadingResumo(true);
    let q = supabase.from('resumo_campanhas').select('*');
    if (selectedOrg) q = q.eq('organizacao_id', selectedOrg.id);
    q.then(({ data }) => {
      setResumo((data as ResumoCampanha[]) ?? []);
      setLoadingResumo(false);
    });
  };

  const loadConversoes = () => {
    setLoadingConversoes(true);
    let q = supabase.from('resumo_conversoes_campanhas').select('*');
    if (selectedOrg) q = q.eq('organizacao_id', selectedOrg.id);
    q.then(({ data }) => {
      setConversoes(data ?? []);
      setLoadingConversoes(false);
    });
  };

  useEffect(() => { loadCampanhas(); loadResumo(); loadConversoes(); }, [selectedOrg]);

  /* load grupos_produtos for form */
  useEffect(() => {
    const orgId = formOrgId || selectedOrg?.id;
    if (!orgId) { setGruposProdutos([]); return; }
    supabase.from('grupos_produtos').select('id, nome')
      .eq('organizacao_id', orgId).order('nome')
      .then(({ data }) => setGruposProdutos((data as GrupoProduto[]) ?? []));
  }, [formOrgId, selectedOrg]);

  /* ── derived ── */

  const filteredOrgs = useMemo(
    () => orgSearch.length > 0 ? orgs.filter(o => o.nome?.toLowerCase().includes(orgSearch.toLowerCase())) : orgs,
    [orgSearch, orgs],
  );

  const filteredCampanhas = useMemo(() => {
    if (statusFilter === 'todas') return campanhas.filter(c => c.status !== 'arquivada');
    return campanhas.filter(c => c.status === statusFilter);
  }, [campanhas, statusFilter]);

  const agendadas = filteredCampanhas.filter(c => c.status === 'agendada');
  const rascunhos = filteredCampanhas.filter(c => c.status === 'rascunho');
  const historico = filteredCampanhas.filter(c => !['agendada', 'rascunho'].includes(c.status));

  const metrics = useMemo(() => {
    const enviadas = campanhas.filter(c => c.status === 'enviada');
    return {
      totalEnviadas: enviadas.length,
      alcancados: enviadas.reduce((s, c) => s + (c.total_enviados ?? 0), 0),
      taxaMedia: enviadas.length > 0
        ? Math.round(enviadas.reduce((s, c) => s + taxa(c.total_enviados, c.total_responderam), 0) / enviadas.length)
        : 0,
      agendadas: campanhas.filter(c => c.status === 'agendada').length,
    };
  }, [campanhas]);

  const metricsConversao = useMemo(() => {
    const totalConversoes = conversoes.reduce((s, c) => s + Number(c.total_conversoes ?? 0), 0);
    const receitaTotal = conversoes.reduce((s, c) => s + Number(c.receita_gerada ?? 0), 0);
    const taxaMedia = conversoes.length > 0
      ? (conversoes.reduce((s, c) => s + Number(c.taxa_conversao ?? 0), 0) / conversoes.length).toFixed(1)
      : '0';
    return { totalConversoes, receitaTotal, taxaMedia };
  }, [conversoes]);

  const moduloAtivo = selectedOrg?.modulos?.campanhas === true;

  useEffect(() => { setPreviewCount(null); }, [formPublico, formGrupo, formOrgId]);

  const handlePreviewPublico = async () => {
    if (!formOrgId || !formPublico) {
      toast.error('Selecione organização e público-alvo');
      return;
    }
    setLoadingPreview(true);
    const { data, error } = await supabase.rpc('buscar_clientes_campanha', {
      p_org_id: formOrgId,
      p_filtro: formPublico,
      p_grupo: formGrupo && formGrupo !== 'todos' ? formGrupo : null,
    });
    setLoadingPreview(false);
    if (error) { toast.error('Erro ao buscar público'); return; }
    setPreviewCount(data?.length ?? 0);
  };

  /* ── save (insert or update) ── */

  const resetForm = () => {
    setFormOrgId(''); setFormNome(''); setFormData(undefined);
    setFormHora('18:00'); setFormPublico(''); setFormMensagem('');
    setFormGrupo(''); setFormJanela(7); setFormCupom('');
    setPreviewCount(null);
    setEditingCampanha(null);
  };

  const openEdit = (c: Campanha) => {
    setEditingCampanha(c);
    setFormOrgId(c.organizacao_id);
    setFormNome(c.nome);
    setFormMensagem(c.mensagem ?? '');
    setFormPublico(c.filtro_clientes ?? '');
    setFormGrupo(c.grupo_produto || '');
    setFormJanela(c.janela_conversao || 7);
    if (c.data_disparo) {
      const d = new Date(c.data_disparo);
      setFormData(d);
      setFormHora(format(d, 'HH:mm'));
    } else {
      setFormData(undefined);
      setFormHora('18:00');
    }
    setDialogOpen(true);
  };

  const handleSave = async (status: 'rascunho' | 'agendada') => {
    if (status === 'agendada') {
      if (!formOrgId || !formNome.trim() || !formMensagem.trim() || !formData) {
        toast.error('Preencha todos os campos obrigatórios para agendar');
        return;
      }
    }
    if (!formOrgId) { toast.error('Selecione uma organização'); return; }

    setSaving(true);
    const dataDisparo = formData
      ? `${format(formData, 'yyyy-MM-dd')}T${formHora}:00`
      : null;

    const payload = {
      organizacao_id: formOrgId,
      nome: formNome || 'Sem nome',
      status,
      mensagem: formMensagem,
      filtro_clientes: formPublico || null,
      data_disparo: dataDisparo,
      grupo_produto: formGrupo && formGrupo !== 'todos' ? formGrupo : null,
      janela_conversao: formJanela,
    };

    let error;
    if (editingCampanha) {
      ({ error } = await supabase.from('campanhas').update(payload).eq('id', editingCampanha.id));
    } else {
      ({ error } = await supabase.from('campanhas').insert({ ...payload, total_enviados: 0, total_responderam: 0 }));
    }

    setSaving(false);
    if (error) {
      toast.error('Erro ao salvar campanha');
      console.error(error);
      return;
    }

    toast.success(
      editingCampanha
        ? 'Campanha atualizada com sucesso!'
        : status === 'agendada' ? 'Campanha agendada com sucesso!' : 'Rascunho salvo!',
    );
    setDialogOpen(false);
    resetForm();
    loadCampanhas();
    loadResumo();
  };

  /* ── archive campanha ── */
  const handleArchive = async (c: Campanha) => {
    const { error } = await supabase.from('campanhas').update({ status: 'arquivada' }).eq('id', c.id);
    if (error) { toast.error('Erro ao arquivar'); return; }
    toast.success('Campanha arquivada');
    loadCampanhas(); loadResumo(); loadConversoes();
  };

  /* ── export functions ── */
  const handleExportExcel = () => {
    if (conversoes.length === 0) { toast.error('Sem dados para exportar'); return; }
    const headers = ['Campanha', 'Data Envio', 'Enviados', 'Conversões', 'Taxa %', 'Receita', 'Ticket Médio'];
    const rows = conversoes.map((c: any) => [
      c.campanha_nome,
      c.data_disparo ? format(new Date(c.data_disparo), 'dd/MM/yyyy HH:mm') : '',
      c.total_enviados ?? 0,
      c.total_conversoes ?? 0,
      c.taxa_conversao ?? 0,
      Number(c.receita_gerada ?? 0).toFixed(2),
      c.total_conversoes > 0 ? (c.receita_gerada / c.total_conversoes).toFixed(2) : '0.00',
    ]);
    let csv = '\uFEFF';
    csv += headers.join(';') + '\n';
    rows.forEach(row => { csv += row.join(';') + '\n'; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio_campanhas.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado!');
  };

  const handleExportCSV = () => {
    if (conversoes.length === 0) { toast.error('Sem dados para exportar'); return; }
    const headers = ['Campanha', 'Data Envio', 'Enviados', 'Conversões', 'Taxa %', 'Receita', 'Ticket Médio'];
    const rows = conversoes.map((c: any) => [
      c.campanha_nome,
      c.data_disparo ? format(new Date(c.data_disparo), 'dd/MM/yyyy HH:mm') : '',
      c.total_enviados ?? 0,
      c.total_conversoes ?? 0,
      c.taxa_conversao ?? 0,
      Number(c.receita_gerada ?? 0).toFixed(2),
      c.total_conversoes > 0 ? (c.receita_gerada / c.total_conversoes).toFixed(2) : '0.00',
    ]);
    let csv = '\uFEFF';
    csv += headers.join(',') + '\n';
    rows.forEach(row => { csv += row.join(',') + '\n'; });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'relatorio_campanhas_csv.csv';
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado!');
  };

  /* ── cancel campanha ── */
  const handleCancel = async (c: Campanha) => {
    const { error } = await supabase.from('campanhas').update({ status: 'cancelada' }).eq('id', c.id);
    if (error) { toast.error('Erro ao cancelar campanha'); console.error(error); return; }
    toast.success('Campanha cancelada');
    setCancelTarget(null);
    loadCampanhas();
    loadResumo();
  };

  /* ── delete campanha ── */
  const handleDelete = async (c: Campanha) => {
    await supabase.from('campanhas_envios').delete().eq('campanha_id', c.id);
    const { error } = await supabase.from('campanhas').delete().eq('id', c.id);
    if (error) { toast.error('Erro ao excluir campanha'); console.error(error); return; }
    toast.success('Campanha excluída');
    setDeleteTarget(null);
    loadCampanhas();
    loadResumo();
  };

  /* ── org name helper ── */
  const orgName = (orgId: string) => orgs.find(o => o.id === orgId)?.nome ?? '';

  const previewMsg = formMensagem.replace(/\{nome\}/gi, 'João');

  /* ── render ── */

  return (
    <DashboardLayout>
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Campanhas</h1>
              <p className="text-sm text-slate-500">Disparos automáticos via WhatsApp</p>
            </div>
            <Button className="gap-2" onClick={() => { resetForm(); setDialogOpen(true); }}>
              <Plus className="h-4 w-4" /> Nova campanha
            </Button>
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
                    <li
                      key={org.id}
                      className="flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700"
                      onClick={() => { setSelectedOrg(org); setOrgSearch(org.nome); setOrgOpen(false); }}
                    >
                      <span>{org.nome}</span>
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', org.modulos?.campanhas ? 'border-emerald-300 text-emerald-600' : 'border-slate-200 text-slate-400')}>
                        {org.modulos?.campanhas ? 'ativo' : 'inativo'}
                      </Badge>
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

          {/* Banner módulo inativo */}
          {selectedOrg && !moduloAtivo && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  O módulo <strong>Campanhas</strong> não está ativado para <strong>{selectedOrg.nome}</strong>. Ative-o na aba Módulos da organização.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="shadow-sm border-slate-100">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3"><Megaphone className="h-5 w-5 text-blue-600" /></div>
                <div>
                  <p className="text-sm text-slate-500">Campanhas enviadas</p>
                  <p className="text-2xl font-bold text-slate-800">{metrics.totalEnviadas}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-100">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="rounded-lg bg-emerald-100 p-3"><Users className="h-5 w-5 text-emerald-600" /></div>
                <div>
                  <p className="text-sm text-slate-500">Clientes alcançados</p>
                  <p className="text-2xl font-bold text-slate-800">{metrics.alcancados.toLocaleString('pt-BR')}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-100">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="rounded-lg bg-purple-100 p-3"><ShoppingCart className="h-5 w-5 text-purple-600" /></div>
                <div>
                  <p className="text-sm text-slate-500">Conversões</p>
                  <p className="text-2xl font-bold text-slate-800">{metricsConversao.totalConversoes}</p>
                  <p className="text-xs text-slate-400">{metricsConversao.taxaMedia}% taxa</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-100">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="rounded-lg bg-emerald-100 p-3"><DollarSign className="h-5 w-5 text-emerald-600" /></div>
                <div>
                  <p className="text-sm text-slate-500">Receita gerada</p>
                  <p className="text-2xl font-bold text-slate-800">R$ {metricsConversao.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-slate-100">
              <CardContent className="p-5 flex items-center gap-4">
                <div className="rounded-lg bg-amber-100 p-3"><Clock className="h-5 w-5 text-amber-600" /></div>
                <div>
                  <p className="text-sm text-slate-500">Agendadas</p>
                  <p className="text-2xl font-bold text-slate-800">{metrics.agendadas}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="campanhas" className="gap-1.5"><Send className="h-3.5 w-3.5" /> Campanhas</TabsTrigger>
              <TabsTrigger value="relatorio" className="gap-1.5"><BarChart3 className="h-3.5 w-3.5" /> Relatório</TabsTrigger>
            </TabsList>

            {/* ─── ABA CAMPANHAS ─── */}
            <TabsContent value="campanhas">
              {/* Status pills */}
              <div className="flex flex-wrap gap-2 mb-4 mt-2">
                {['todas', 'agendada', 'enviada', 'rascunho', 'cancelada', 'arquivada'].map(s => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      statusFilter === s
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50',
                    )}
                  >
                    {s === 'todas' ? 'Todas' : s.charAt(0).toUpperCase() + s.slice(1) + 's'}
                  </button>
                ))}
              </div>

              {loadingCampanhas ? (
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
                </div>
              ) : filteredCampanhas.length === 0 ? (
                <div className="text-center text-slate-400 py-16">Nenhuma campanha encontrada</div>
              ) : (
                <div className="space-y-6">
                  {agendadas.length > 0 && (
                    <CampanhaSection title="AGENDADAS" items={agendadas} orgName={orgName}
                      onView={setViewCampanha} onEdit={openEdit}
                      onCancel={setCancelTarget} onDelete={setDeleteTarget} onArchive={handleArchive} />
                  )}
                  {rascunhos.length > 0 && (
                    <CampanhaSection title="RASCUNHOS" items={rascunhos} orgName={orgName}
                      onView={setViewCampanha} onEdit={openEdit}
                      onCancel={setCancelTarget} onDelete={setDeleteTarget} onArchive={handleArchive} />
                  )}
                  {historico.length > 0 && (
                    <CampanhaSection title="HISTÓRICO" items={historico} orgName={orgName}
                      onView={setViewCampanha} onEdit={openEdit}
                      onCancel={setCancelTarget} onDelete={setDeleteTarget} onArchive={handleArchive} />
                  )}
                </div>
              )}
            </TabsContent>

            {/* ─── ABA RELATÓRIO ─── */}
            <TabsContent value="relatorio">
              {loadingConversoes ? (
                <div className="space-y-3 mt-4">
                  {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
                </div>
              ) : (
                <div className="space-y-6 mt-4">
                  {/* Export buttons */}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleExportExcel}>
                      <Download className="h-4 w-4" /> Excel
                    </Button>
                    <Button variant="outline" size="sm" className="gap-2" onClick={handleExportCSV}>
                      <Download className="h-4 w-4" /> CSV
                    </Button>
                  </div>
                  {/* Cards resumo */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Card className="shadow-sm border-slate-100">
                      <CardContent className="p-5 text-center">
                        <p className="text-sm text-slate-500">Total campanhas</p>
                        <p className="text-2xl font-bold text-slate-800">{conversoes.length}</p>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm border-slate-100">
                      <CardContent className="p-5 text-center">
                        <p className="text-sm text-slate-500">Conversões</p>
                        <p className="text-2xl font-bold text-slate-800">{metricsConversao.totalConversoes}</p>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm border-slate-100">
                      <CardContent className="p-5 text-center">
                        <p className="text-sm text-slate-500">Receita total</p>
                        <p className="text-2xl font-bold text-slate-800">R$ {metricsConversao.receitaTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm border-slate-100">
                      <CardContent className="p-5 text-center">
                        <p className="text-sm text-slate-500">Ticket médio</p>
                        <p className="text-2xl font-bold text-slate-800">
                          R$ {(metricsConversao.totalConversoes > 0
                            ? (metricsConversao.receitaTotal / metricsConversao.totalConversoes)
                            : 0
                          ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Gráfico de barras */}
                  {conversoes.length === 0 ? (
                    <div className="text-center text-slate-400 py-16">Sem dados de conversão ainda</div>
                  ) : (
                    <Card className="shadow-sm border-slate-100">
                      <CardContent className="p-5">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4">Conversões por campanha</h3>
                        <ChartContainer config={{
                          conversoes: { label: 'Conversões', color: '#3b82f6' },
                          receita: { label: 'Receita (÷100)', color: '#10b981' },
                        }} className="h-[300px] w-full">
                          <BarChart data={conversoes}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="campanha_nome" tick={{ fontSize: 12 }} />
                            <YAxis />
                            <ChartTooltip content={<ChartTooltipContent />} />
                            <Bar dataKey="total_conversoes" name="Conversões" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            <Bar dataKey={(d: any) => Number(d.receita_gerada ?? 0) / 100} name="Receita (÷100)" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ChartContainer>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tabela detalhada */}
                  {conversoes.length > 0 && (
                    <Card className="shadow-sm border-slate-100">
                      <CardContent className="p-5">
                        <h3 className="text-sm font-semibold text-slate-700 mb-4">Detalhamento por campanha</h3>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Campanha</TableHead>
                                <TableHead>Data envio</TableHead>
                                <TableHead className="text-right">Enviados</TableHead>
                                <TableHead className="text-right">Conversões</TableHead>
                                <TableHead className="text-center">Taxa</TableHead>
                                <TableHead className="text-right">Receita</TableHead>
                                <TableHead className="text-right">Ticket médio</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {conversoes.map((c: any, i: number) => {
                                const tc = Number(c.total_conversoes ?? 0);
                                const rec = Number(c.receita_gerada ?? 0);
                                const txc = Number(c.taxa_conversao ?? 0);
                                return (
                                  <TableRow key={i}>
                                    <TableCell className="font-medium">{c.campanha_nome}</TableCell>
                                    <TableCell>{c.data_disparo ? format(new Date(c.data_disparo), 'dd/MM/yyyy HH:mm') : '—'}</TableCell>
                                    <TableCell className="text-right">{(c.total_enviados ?? 0).toLocaleString('pt-BR')}</TableCell>
                                    <TableCell className="text-right">{tc}</TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-2 justify-center">
                                        <span className="text-sm font-medium text-emerald-600">{txc}%</span>
                                        <Progress value={txc} className="h-1.5 w-16 [&>div]:bg-emerald-500" />
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-right">R$ {rec.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</TableCell>
                                    <TableCell className="text-right">
                                      {tc > 0 ? `R$ ${(rec / tc).toFixed(2)}` : '—'}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                            </TableBody>
                          </Table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* ─── DIALOG NOVA / EDITAR CAMPANHA ─── */}
          <Dialog open={dialogOpen} onOpenChange={v => { if (!v) resetForm(); setDialogOpen(v); }}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingCampanha ? 'Editar campanha' : 'Nova campanha'}</DialogTitle>
                <DialogDescription>
                  {editingCampanha ? 'Altere os dados da campanha e salve.' : 'Preencha os dados para criar uma nova campanha.'}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Org */}
                <div className="space-y-2">
                  <Label>Organização</Label>
                  <Select value={formOrgId} onValueChange={setFormOrgId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a organização" />
                    </SelectTrigger>
                    <SelectContent>
                      {orgsComModulo.map(o => (
                        <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">Apenas organizações com módulo Campanhas ativado aparecem aqui.</p>
                </div>

                {/* Nome */}
                <div className="space-y-2">
                  <Label>Nome da campanha</Label>
                  <Input placeholder="Ex: Promoção de Sexta" value={formNome} onChange={e => setFormNome(e.target.value)} />
                </div>

                {/* Data + Hora */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data do disparo</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn('w-full justify-start text-left font-normal', !formData && 'text-muted-foreground')}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData ? format(formData, 'dd/MM/yyyy') : 'Selecione'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData}
                          onSelect={setFormData}
                          disabled={date => date < new Date(new Date().setHours(0, 0, 0, 0))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  <div className="space-y-2">
                    <Label>Hora</Label>
                    <Input type="time" value={formHora} onChange={e => setFormHora(e.target.value)} />
                  </div>
                </div>

                {/* Público */}
                <div className="space-y-2">
                  <Label>Público-alvo</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(PUBLICO_LABELS).map(([key, { title, desc }]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setFormPublico(key)}
                        className={cn(
                          'rounded-lg border-2 p-3 text-left transition-colors',
                          formPublico === key
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-slate-200 hover:border-slate-300',
                        )}
                      >
                        <p className="text-sm font-medium text-slate-700">{title}</p>
                        <p className="text-xs text-slate-400">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filtrar por produto */}
                <div className="space-y-2">
                  <Label>Filtrar por produto</Label>
                  <Select value={formGrupo} onValueChange={setFormGrupo}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos os produtos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos os produtos</SelectItem>
                      {gruposProdutos.map(g => (
                        <SelectItem key={g.id} value={g.nome}>{g.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">Opcional. Filtra clientes que já compraram itens deste grupo.</p>
                </div>

                {/* Pré-visualizar público */}
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handlePreviewPublico}
                    disabled={loadingPreview || !formOrgId || !formPublico}
                    className="gap-2"
                  >
                    <Users className="h-4 w-4" />
                    {loadingPreview ? 'Buscando...' : 'Pré-visualizar público'}
                  </Button>
                  {previewCount !== null && (
                    <p className="text-sm font-medium text-blue-600">
                      📊 {previewCount} cliente{previewCount !== 1 ? 's' : ''}{' '}
                      {previewCount !== 1 ? 'serão alcançados' : 'será alcançado'}
                    </p>
                  )}
                </div>

                {/* Janela de conversão */}
                <div className="space-y-2">
                  <Label>Janela de conversão</Label>
                  <Select value={String(formJanela)} onValueChange={v => setFormJanela(Number(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 dias</SelectItem>
                      <SelectItem value="5">5 dias</SelectItem>
                      <SelectItem value="7">7 dias (recomendado)</SelectItem>
                      <SelectItem value="14">14 dias</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-400">Período após envio para contabilizar conversões.</p>
                </div>

                {/* Mensagem */}
                <div className="space-y-2">
                  <Label>Mensagem</Label>
                  <Textarea
                    rows={4}
                    value={formMensagem}
                    onChange={e => setFormMensagem(e.target.value)}
                    placeholder="Olá {nome}, temos uma novidade pra você! 🎉"
                  />
                  <p className="text-xs text-slate-400">Use {'{nome}'} para personalizar com o nome do cliente</p>
                </div>

                {/* Preview */}
                {formMensagem.trim() && (
                  <div className="space-y-2">
                    <Label className="text-xs text-slate-400">Pré-visualização</Label>
                    <div className="flex justify-end">
                      <div className="max-w-[75%] rounded-lg rounded-tr-sm bg-emerald-100 px-3 py-2 text-sm text-slate-800 shadow-sm whitespace-pre-wrap">
                        {previewMsg}
                      </div>
                    </div>
                    {formGrupo && (
                      <p className="text-xs text-slate-400 mt-2">
                        📎 Filtro: clientes que compraram {gruposProdutos.find(g => g.id === formGrupo)?.nome ?? formGrupo}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
                <Button variant="outline" onClick={() => handleSave('rascunho')} disabled={saving}>
                  Salvar rascunho
                </Button>
                <Button onClick={() => handleSave('agendada')} disabled={saving}>
                  {editingCampanha ? 'Salvar alterações' : 'Agendar campanha'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* ─── DIALOG VISUALIZAR CAMPANHA ─── */}
          <Dialog open={!!viewCampanha} onOpenChange={v => { if (!v) setViewCampanha(null); }}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              {viewCampanha && (
                <>
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 flex-wrap">
                      {viewCampanha.nome}
                      <Badge className={cn('text-xs border', STATUS_COLORS[viewCampanha.status] ?? STATUS_COLORS.rascunho)}>
                        {viewCampanha.status}
                      </Badge>
                    </DialogTitle>
                    <DialogDescription>Detalhes da campanha</DialogDescription>
                  </DialogHeader>

                  <div className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400 text-xs mb-0.5">Organização</p>
                        <p className="font-medium text-slate-700">{orgName(viewCampanha.organizacao_id) || '—'}</p>
                      </div>
                      <div>
                        <p className="text-slate-400 text-xs mb-0.5">Público-alvo</p>
                        <p className="font-medium text-slate-700">{filtroLabel(viewCampanha.filtro_clientes) || '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-slate-400 text-xs mb-0.5">Data e hora do disparo</p>
                        <p className="font-medium text-slate-700">
                          {viewCampanha.data_disparo
                            ? format(new Date(viewCampanha.data_disparo), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
                            : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Mensagem */}
                    <div>
                      <p className="text-slate-400 text-xs mb-1.5">Mensagem</p>
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-lg rounded-tr-sm bg-emerald-100 px-3 py-2 text-sm text-slate-800 shadow-sm whitespace-pre-wrap">
                          {viewCampanha.mensagem || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Métricas se enviada */}
                    {viewCampanha.status === 'enviada' && (() => {
                      const viewConversao = conversoes.find(c => c.campanha_id === viewCampanha?.id);
                      return (
                        <div className="grid grid-cols-4 gap-3">
                          <Card className="shadow-sm border-slate-100">
                            <CardContent className="p-3 text-center">
                              <p className="text-slate-400 text-xs">Enviados</p>
                              <p className="text-lg font-bold text-slate-800">{(viewCampanha.total_enviados ?? 0).toLocaleString('pt-BR')}</p>
                            </CardContent>
                          </Card>
                          <Card className="shadow-sm border-slate-100">
                            <CardContent className="p-3 text-center">
                              <p className="text-slate-400 text-xs">Conversões</p>
                              <p className="text-lg font-bold text-slate-800">{viewConversao?.total_conversoes ?? 0}</p>
                            </CardContent>
                          </Card>
                          <Card className="shadow-sm border-slate-100">
                            <CardContent className="p-3 text-center">
                              <p className="text-slate-400 text-xs">Receita</p>
                              <p className="text-lg font-bold text-emerald-600">R$ {(Number(viewConversao?.receita_gerada ?? 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            </CardContent>
                          </Card>
                          <Card className="shadow-sm border-slate-100">
                            <CardContent className="p-3 text-center">
                              <p className="text-slate-400 text-xs">Taxa</p>
                              <p className="text-lg font-bold text-emerald-600">{viewConversao?.taxa_conversao ?? 0}%</p>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })()}
                  </div>

                  <DialogFooter>
                    <Button variant="outline" onClick={() => setViewCampanha(null)}>Fechar</Button>
                  </DialogFooter>
                </>
              )}
            </DialogContent>
          </Dialog>

          {/* ─── ALERT: CANCELAR ─── */}
          <AlertDialog open={!!cancelTarget} onOpenChange={v => { if (!v) setCancelTarget(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar campanha</AlertDialogTitle>
                <AlertDialogDescription>
                  Deseja cancelar esta campanha? O registro será mantido no histórico.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => cancelTarget && handleCancel(cancelTarget)}
                >
                  Confirmar cancelamento
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* ─── ALERT: EXCLUIR ─── */}
          <AlertDialog open={!!deleteTarget} onOpenChange={v => { if (!v) setDeleteTarget(null); }}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir campanha</AlertDialogTitle>
                <AlertDialogDescription>
                  Deseja excluir? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Voltar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => deleteTarget && handleDelete(deleteTarget)}
                >
                  Excluir definitivamente
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
}

/* ── sub-components ── */

interface CampanhaSectionProps {
  title: string;
  items: Campanha[];
  orgName: (id: string) => string;
  onView: (c: Campanha) => void;
  onEdit: (c: Campanha) => void;
  onCancel: (c: Campanha) => void;
  onDelete: (c: Campanha) => void;
  onArchive: (c: Campanha) => void;
}

function CampanhaSection({ title, items, orgName, onView, onEdit, onCancel, onDelete, onArchive }: CampanhaSectionProps) {
  return (
    <div>
      <h3 className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mb-2">{title}</h3>
      <div className="space-y-2">
        {items.map(c => (
          <CampanhaCard key={c.id} campanha={c} orgName={orgName}
            onView={onView} onEdit={onEdit} onCancel={onCancel} onDelete={onDelete} onArchive={onArchive} />
        ))}
      </div>
    </div>
  );
}

interface CampanhaCardProps {
  campanha: Campanha;
  orgName: (id: string) => string;
  onView: (c: Campanha) => void;
  onEdit: (c: Campanha) => void;
  onCancel: (c: Campanha) => void;
  onDelete: (c: Campanha) => void;
  onArchive: (c: Campanha) => void;
}

function CampanhaCard({ campanha: c, orgName, onView, onEdit, onCancel, onDelete, onArchive }: CampanhaCardProps) {
  const t = taxa(c.total_enviados, c.total_responderam);
  const canEdit = ['agendada', 'rascunho'].includes(c.status);
  const canCancel = c.status === 'agendada';
  const canDelete = ['rascunho', 'cancelada'].includes(c.status);
  const canArchive = ['enviada', 'cancelada'].includes(c.status);

  return (
    <Card
      className="shadow-sm border-slate-100 cursor-pointer hover:border-slate-200 transition-colors"
      onClick={() => onView(c)}
    >
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="font-semibold text-slate-800">{c.nome}</span>
              <Badge className={cn('text-xs border', STATUS_COLORS[c.status] ?? STATUS_COLORS.rascunho)}>
                {c.status}
              </Badge>
              {orgName(c.organizacao_id) && (
                <Badge variant="outline" className="text-xs border-purple-200 text-purple-600">
                  {orgName(c.organizacao_id)}
                </Badge>
              )}
              {c.filtro_clientes && PUBLICO_LABELS[c.filtro_clientes] && (
                <span className="text-xs text-slate-400">• {PUBLICO_LABELS[c.filtro_clientes].title}</span>
              )}
            </div>
            {c.data_disparo && (
              <p className="text-xs text-slate-400">
                {format(new Date(c.data_disparo), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Métricas para enviadas */}
            {c.status === 'enviada' && (
              <div className="flex items-center gap-4 text-sm mr-2">
                <div className="text-center">
                  <p className="font-bold text-slate-800">{(c.total_enviados ?? 0).toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-slate-400">Enviados</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-emerald-600">{(c.total_responderam ?? 0).toLocaleString('pt-BR')}</p>
                  <p className="text-xs text-slate-400">Responderam</p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-blue-600">{(c.total_enviados ?? 0) > 0 ? ((c.total_responderam ?? 0) / (c.total_enviados ?? 1) * 100).toFixed(1) + '%' : '—'}</p>
                  <p className="text-xs text-slate-400">Conversões</p>
                </div>
              </div>
            )}

            {/* Action buttons */}
            {canEdit && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0"
                    onClick={e => { e.stopPropagation(); onEdit(c); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Editar</TooltipContent>
              </Tooltip>
            )}
            {canCancel && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-amber-600 hover:text-amber-700"
                    onClick={e => { e.stopPropagation(); onCancel(c); }}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Cancelar campanha</TooltipContent>
              </Tooltip>
            )}
            {canArchive && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-slate-600"
                    onClick={e => { e.stopPropagation(); onArchive(c); }}>
                    <Archive className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Arquivar</TooltipContent>
              </Tooltip>
            )}
            {canDelete && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500 hover:text-red-600"
                    onClick={e => { e.stopPropagation(); onDelete(c); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Excluir</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
