import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { generateSlug } from '@/lib/generateSlug';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Organizacao {
  id?: string;
  nome: string;
  cnpj: string;
  slug: string;
  email: string;
  telefone: string;
  prompt: string;
  evo_instancia: string;
  link_cardapio: string;
  url_cardapio_jina: string;
  logo_url: string;
  cidade_estado: string;
  endereco_completo: string;
  ativado: boolean;
  ativo: boolean;
  mensagem_boas_vindas: string;
  created_by?: string;
}

const emptyOrg: Organizacao = {
  nome: '', cnpj: '', slug: '', email: '', telefone: '',
  prompt: '', evo_instancia: '', link_cardapio: '', url_cardapio_jina: '',
  logo_url: '', cidade_estado: '', endereco_completo: '',
  ativado: true, ativo: true, mensagem_boas_vindas: '',
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizacao?: Organizacao | null;
  onSaved: () => void;
}

export function OrganizacaoForm({ open, onOpenChange, organizacao, onSaved }: Props) {
  const { user } = useAuth();
  const [form, setForm] = useState<Organizacao>(emptyOrg);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setForm(organizacao ?? emptyOrg);
  }, [organizacao, open]);

  const update = (field: keyof Organizacao, value: string | boolean) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'nome' && typeof value === 'string') {
        next.slug = generateSlug(value);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.nome.trim()) {
      toast.error('O nome é obrigatório');
      return;
    }
    setSaving(true);
    try {
      const payload = { ...form };
      delete (payload as any).id;

      if (organizacao?.id) {
        const { error } = await supabase
          .from('organizacao')
          .update(payload)
          .eq('id', organizacao.id);
        if (error) throw error;
        toast.success('Organização atualizada');
      } else {
        payload.created_by = user?.id;
        const { error } = await supabase.from('organizacao').insert(payload);
        if (error) throw error;
        toast.success('Organização criada');
      }
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{organizacao?.id ? 'Editar' : 'Nova'} Organização</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="geral" className="mt-2">
          <TabsList className="w-full">
            <TabsTrigger value="geral" className="flex-1">Geral</TabsTrigger>
            <TabsTrigger value="ia" className="flex-1">Config. IA</TabsTrigger>
            <TabsTrigger value="endereco" className="flex-1">Endereço & Status</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.nome} onChange={(e) => update('nome', e.target.value)} placeholder="Nome do bar" />
            </div>
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={(e) => update('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={form.slug} readOnly className="bg-muted" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input value={form.telefone} onChange={(e) => update('telefone', e.target.value)} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="ia" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Prompt</Label>
              <Textarea value={form.prompt} onChange={(e) => update('prompt', e.target.value)} rows={6} placeholder="Prompt de IA para o atendimento..." />
            </div>
            <div className="space-y-2">
              <Label>Instância EVO</Label>
              <Input value={form.evo_instancia} onChange={(e) => update('evo_instancia', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Link Cardápio</Label>
              <Input value={form.link_cardapio} onChange={(e) => update('link_cardapio', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>URL Cardápio Jina</Label>
              <Input value={form.url_cardapio_jina} onChange={(e) => update('url_cardapio_jina', e.target.value)} />
            </div>
          </TabsContent>

          <TabsContent value="endereco" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={form.logo_url} onChange={(e) => update('logo_url', e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cidade / Estado</Label>
              <Input value={form.cidade_estado} onChange={(e) => update('cidade_estado', e.target.value)} placeholder="São Paulo - SP" />
            </div>
            <div className="space-y-2">
              <Label>Endereço Completo</Label>
              <Input value={form.endereco_completo} onChange={(e) => update('endereco_completo', e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativado} onCheckedChange={(v) => update('ativado', v)} />
              <Label>Status da Organização</Label>
            </div>
            <div className="space-y-2">
              <Label>Mensagem de Boas-vindas</Label>
              <Textarea value={form.mensagem_boas_vindas} onChange={(e) => update('mensagem_boas_vindas', e.target.value)} rows={3} />
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
