import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { usePermissions } from '@/hooks/usePermissions';
import { Perfil } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Equipe() {
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);
  const { isAdmin } = usePermissions();

  const fetchPerfis = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('perfis').select('*').order('nome');
    if (error) toast.error('Erro ao carregar equipe');
    else setPerfis((data as Perfil[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchPerfis(); }, []);

  const togglePermission = async (perfil: Perfil, field: 'pode_criar' | 'pode_editar' | 'pode_excluir') => {
    const { error } = await supabase
      .from('perfis')
      .update({ [field]: !perfil[field] })
      .eq('id', perfil.id);
    if (error) {
      toast.error('Erro ao atualizar permissão');
    } else {
      fetchPerfis();
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Equipe</h2>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="text-center">Criar</TableHead>
                <TableHead className="text-center">Editar</TableHead>
                <TableHead className="text-center">Excluir</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Carregando...</TableCell>
                </TableRow>
              ) : perfis.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Nenhum membro encontrado</TableCell>
                </TableRow>
              ) : (
                perfis.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nome}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{p.email}</TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={p.pode_criar}
                        disabled={!isAdmin}
                        onCheckedChange={() => togglePermission(p, 'pode_criar')}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={p.pode_editar}
                        disabled={!isAdmin}
                        onCheckedChange={() => togglePermission(p, 'pode_editar')}
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={p.pode_excluir}
                        disabled={!isAdmin}
                        onCheckedChange={() => togglePermission(p, 'pode_excluir')}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </DashboardLayout>
  );
}
