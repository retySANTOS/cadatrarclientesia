import { useState, useEffect, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Plus, Search, Pencil, Trash2, X, ChevronDown, PackageSearch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/* ── types ── */

interface Organizacao { id: string; nome: string; }

interface ProdutoGrupo { nome_produto: string; }

interface Grupo {
  id: string;
  nome: string;
  organizacao_id: string;
  produtos_grupos: ProdutoGrupo[];
}

/* ── main ── */

export default function GruposProdutos() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [selectedOrg, setSelectedOrg] = useState<Organizacao | null>(null);
  const [orgSearch, setOrgSearch] = useState('');
  const [orgOpen, setOrgOpen] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(true);

  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [loadingGrupos, setLoadingGrupos] = useState(false);

  const [novoGrupoOpen, setNovoGrupoOpen] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [novoOrgId, setNovoOrgId] = useState('');
  const [saving, setSaving] = useState(false);

  const [editGrupo, setEditGrupo] = useState<Grupo | null>(null);
  const [editNome, setEditNome] = useState('');

  const [deleteGrupo, setDeleteGrupo] = useState<Grupo | null>(null);

  const [addProdutoGrupo, setAddProdutoGrupo] = useState<Grupo | null>(null);
  const [produtosDisponiveis, setProdutosDisponiveis] = useState<string[]>([]);
  const [loadingProdutos, setLoadingProdutos] = useState(false);
  const [produtoSearch, setProdutoSearch] = useState('');

  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  const filteredOrgs = useMemo(
    () => orgSearch.length > 0 ? orgs.filter(o => o.nome?.toLowerCase().includes(orgSearch.toLowerCase())) : orgs,
    [orgSearch, orgs],
  );

  // Load grupos
  const loadGrupos = async () => {
    if (!selectedOrg) { setGrupos([]); return; }
    setLoadingGrupos(true);
    const { data, error } = await supabase
      .from('grupos_produtos')
      .select('*, produtos_grupos(nome_produto)')
      .eq('organizacao_id', selectedOrg.id)
      .order('nome');
    if (error) { toast.error('Erro ao carregar grupos'); }
    setGrupos((data as Grupo[] | null) ?? []);
    setLoadingGrupos(false);
  };

  useEffect(() => { loadGrupos(); }, [selectedOrg]);

  // Create grupo
  const handleCreateGrupo = async () => {
    if (!novoNome.trim()) { toast.error('Informe o nome do grupo'); return; }
    const orgId = novoOrgId || selectedOrg?.id;
    if (!orgId) { toast.error('Selecione uma organização'); return; }
    setSaving(true);
    const { error } = await supabase.from('grupos_produtos').insert({ nome: novoNome.trim(), organizacao_id: orgId });
    setSaving(false);
    if (error) { toast.error('Erro ao criar grupo: ' + error.message); return; }
    toast.success('Grupo criado!');
    setNovoGrupoOpen(false);
    setNovoNome('');
    setNovoOrgId('');
    loadGrupos();
  };

  // Edit grupo
  const handleEditGrupo = async () => {
    if (!editGrupo || !editNome.trim()) return;
    const { error } = await supabase.from('grupos_produtos').update({ nome: editNome.trim() }).eq('id', editGrupo.id);
    if (error) { toast.error('Erro ao renomear: ' + error.message); return; }
    toast.success('Grupo renomeado!');
    setEditGrupo(null);
    loadGrupos();
  };

  // Delete grupo
  const handleDeleteGrupo = async () => {
    if (!deleteGrupo) return;
    const { error } = await supabase.from('grupos_produtos').delete().eq('id', deleteGrupo.id);
    if (error) { toast.error('Erro ao excluir: ' + error.message); return; }
    toast.success('Grupo excluído!');
    setDeleteGrupo(null);
    loadGrupos();
  };

  // Load produtos disponíveis
  const loadProdutosDisponiveis = async (grupo: Grupo) => {
    setAddProdutoGrupo(grupo);
    setProdutoSearch('');
    setLoadingProdutos(true);

    const orgId = selectedOrg || grupo.organizacao_id;
    const { data, error } = await supabase.rpc('buscar_produtos_disponiveis', {
      p_org_id: orgId,
      p_grupo_id: grupo.id,
    });

    if (error) {
      console.error('Erro ao buscar produtos disponíveis:', error);
      setProdutosDisponiveis([]);
    } else {
      const nomes = (data || []).map((r: any) => r.nome_produto as string).sort();
      setProdutosDisponiveis(nomes);
    }
    setLoadingProdutos(false);
  };

  // Add produto ao grupo
  const handleAddProduto = async (nomeProduto: string) => {
    if (!addProdutoGrupo) return;
    const { error } = await supabase.from('produtos_grupos').insert({
      grupo_id: addProdutoGrupo.id,
      nome_produto: nomeProduto,
      organizacao_id: addProdutoGrupo.organizacao_id,
    });
    if (error) { toast.error('Erro ao adicionar produto: ' + error.message); return; }
    toast.success(`"${nomeProduto}" adicionado!`);
    setAddProdutoGrupo(null);
    loadGrupos();
  };

  // Remove produto do grupo
  const handleRemoveProduto = async (grupoId: string, nomeProduto: string) => {
    const { error } = await supabase.from('produtos_grupos').delete().eq('grupo_id', grupoId).eq('nome_produto', nomeProduto);
    if (error) { toast.error('Erro ao remover produto: ' + error.message); return; }
    toast.success(`"${nomeProduto}" removido!`);
    loadGrupos();
  };

  const filteredProdutos = useMemo(
    () => produtoSearch ? produtosDisponiveis.filter(p => p.toLowerCase().includes(produtoSearch.toLowerCase())) : produtosDisponiveis,
    [produtoSearch, produtosDisponiveis],
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Grupos de produtos</h1>
            <p className="text-sm text-slate-500">Organize os produtos por categoria</p>
          </div>
          <Button onClick={() => { setNovoGrupoOpen(true); setNovoOrgId(selectedOrg?.id ?? ''); }} className="gap-2">
            <Plus className="h-4 w-4" /> Novo grupo
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

        {/* Content */}
        {!selectedOrg ? (
          <div className="text-center text-slate-400 py-16">Selecione uma organização para ver os grupos</div>
        ) : loadingGrupos ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}
          </div>
        ) : grupos.length === 0 ? (
          <div className="text-center text-slate-400 py-16">Nenhum grupo criado ainda</div>
        ) : (
          <div className="space-y-3">
            <TooltipProvider>
              {grupos.map(g => {
                const isOpen = expandedId === g.id;
                return (
                  <Card key={g.id} className="shadow-sm border-slate-100">
                    <Collapsible open={isOpen} onOpenChange={() => setExpandedId(isOpen ? null : g.id)}>
                      <CardContent className="p-0">
                        <CollapsibleTrigger asChild>
                          <button className="flex w-full items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors rounded-lg">
                            <div className="flex items-center gap-3">
                              <PackageSearch className="h-5 w-5 text-slate-400 shrink-0" />
                              <div>
                                <p className="font-semibold text-slate-800">{g.nome}</p>
                                <p className="text-xs text-slate-400">{g.produtos_grupos.length} produto{g.produtos_grupos.length !== 1 ? 's' : ''}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={e => { e.stopPropagation(); setEditGrupo(g); setEditNome(g.nome); }}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar nome</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700" onClick={e => { e.stopPropagation(); setDeleteGrupo(g); }}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir grupo</TooltipContent>
                              </Tooltip>
                              <ChevronDown className={cn('h-4 w-4 text-slate-400 transition-transform', isOpen && 'rotate-180')} />
                            </div>
                          </button>
                        </CollapsibleTrigger>

                        <CollapsibleContent>
                          <div className="px-5 pb-5 pt-0">
                            <div className="flex flex-wrap gap-2 mb-3">
                              {g.produtos_grupos.length === 0 && (
                                <p className="text-sm text-slate-400">Nenhum produto vinculado</p>
                              )}
                              {g.produtos_grupos.map(pg => (
                                <Badge key={pg.nome_produto} variant="secondary" className="gap-1 pr-1">
                                  {pg.nome_produto}
                                  <button
                                    onClick={() => handleRemoveProduto(g.id, pg.nome_produto)}
                                    className="ml-1 rounded-full hover:bg-slate-300 p-0.5"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                </Badge>
                              ))}
                            </div>
                            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => loadProdutosDisponiveis(g)}>
                              <Plus className="h-3 w-3" /> Adicionar produto
                            </Button>
                          </div>
                        </CollapsibleContent>
                      </CardContent>
                    </Collapsible>
                  </Card>
                );
              })}
            </TooltipProvider>
          </div>
        )}
      </div>

      {/* ── Dialog: Novo grupo ── */}
      <Dialog open={novoGrupoOpen} onOpenChange={setNovoGrupoOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo grupo</DialogTitle>
            <DialogDescription>Crie um grupo para organizar seus produtos.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do grupo</label>
              <Input value={novoNome} onChange={e => setNovoNome(e.target.value)} placeholder="Ex: Pizzas, Bebidas..." />
            </div>
            {orgs.length > 1 && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Organização</label>
                <Select value={novoOrgId} onValueChange={setNovoOrgId}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    {orgs.map(o => <SelectItem key={o.id} value={o.id}>{o.nome}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoGrupoOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateGrupo} disabled={saving}>{saving ? 'Salvando...' : 'Salvar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: Editar nome do grupo ── */}
      <Dialog open={!!editGrupo} onOpenChange={() => setEditGrupo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Renomear grupo</DialogTitle>
            <DialogDescription>Altere o nome do grupo.</DialogDescription>
          </DialogHeader>
          <Input value={editNome} onChange={e => setEditNome(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGrupo(null)}>Cancelar</Button>
            <Button onClick={handleEditGrupo}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── AlertDialog: Excluir grupo ── */}
      <AlertDialog open={!!deleteGrupo} onOpenChange={() => setDeleteGrupo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir grupo "{deleteGrupo?.nome}"?</AlertDialogTitle>
            <AlertDialogDescription>Todos os produtos vinculados serão desvinculados. Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteGrupo} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog: Adicionar produto ── */}
      <Dialog open={!!addProdutoGrupo} onOpenChange={() => setAddProdutoGrupo(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar produto — {addProdutoGrupo?.nome}</DialogTitle>
            <DialogDescription>Selecione um produto para vincular ao grupo.</DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Buscar produto..."
            value={produtoSearch}
            onChange={e => setProdutoSearch(e.target.value)}
            className="mb-2"
          />
          <div className="max-h-64 overflow-auto border rounded-md">
            {loadingProdutos ? (
              <div className="p-4 text-sm text-slate-400">Carregando produtos...</div>
            ) : filteredProdutos.length === 0 ? (
              <div className="p-4 text-sm text-slate-400">Nenhum produto disponível</div>
            ) : (
              <ul>
                {filteredProdutos.map(p => (
                  <li
                    key={p}
                    className="px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 hover:text-blue-700 border-b last:border-b-0 transition-colors"
                    onClick={() => handleAddProduto(p)}
                  >
                    {p}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
