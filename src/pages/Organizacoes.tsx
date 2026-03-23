import { useEffect, useState, useCallback } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { OrganizacaoForm, Organizacao } from '@/components/OrganizacaoForm';
import { toast } from 'sonner';

export default function Organizacoes() {
  const [orgs, setOrgs] = useState<Organizacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organizacao | null>(null);
  const { podeCriar, podeEditar, podeExcluir } = usePermissions();

  const fetchOrgs = useCallback(async () => {
    setLoading(true);
    // RLS handles multi-tenancy filtering on the server
    const { data, error } = await supabase.from('organizacao').select('*').order('nome');
    if (error) {
      toast.error('Erro ao carregar organizações');
    } else {
      setOrgs((data as Organizacao[]) ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const handleDelete = async (org: Organizacao) => {
    if (!confirm(`Excluir "${org.nome}"?`)) return;
    const { error } = await supabase.from('organizacoes').delete().eq('id', org.id!);
    if (error) {
      toast.error('Erro ao excluir');
    } else {
      toast.success('Organização excluída');
      fetchOrgs();
    }
  };

  const openEdit = (org: Organizacao) => {
    setEditingOrg(org);
    setFormOpen(true);
  };

  const openNew = () => {
    setEditingOrg(null);
    setFormOpen(true);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Organizações</h2>
          <Button onClick={openNew} disabled={!podeCriar} size="sm">
            <Plus className="mr-1 h-4 w-4" /> Novo Cliente
          </Button>
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">CNPJ</TableHead>
                <TableHead className="hidden lg:table-cell">Cidade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : orgs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhuma organização encontrada</TableCell>
                </TableRow>
              ) : (
                orgs.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell className="font-medium">{org.nome}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{org.cnpj || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{org.cidade_estado || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={org.ativo ? 'default' : 'secondary'}>
                        {org.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" disabled={!podeEditar} onClick={() => openEdit(org)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" disabled={!podeExcluir} onClick={() => handleDelete(org)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <OrganizacaoForm
        open={formOpen}
        onOpenChange={setFormOpen}
        organizacao={editingOrg}
        onSaved={fetchOrgs}
      />
    </DashboardLayout>
  );
}
