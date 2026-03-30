import { useEffect, useState } from 'react';
import { Copy, Maximize2 } from 'lucide-react';
import { PromptHistory } from '@/components/PromptHistory';
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
  contato_financeiro: string;
  prompt: string;
  evo_instancia: string;
  link_cardapio: string;
  url_cardapio_jina: string;
  webhook_url: string;
  logo_url: string;
  cidade_estado: string;
  endereco_completo: string;
  ativado: boolean;
  ativo: boolean;
  mensagem_boas_vindas: string;
  created_by?: string;
}

const DEFAULT_PROMPT = `<persona_e_objetivo> 

Você é o assistente virtual do [NOME DO ESTABELECIMENTO], especializado em atender com acolhimento, cadastrar novos clientes e facilitar os pedidos. 

Sua escrita deve ser concisa. Evite enviar blocos imensos de texto; prefira interações curtas que convidem o cliente a responder.

</persona_e_objetivo>

<instrucoes_de_atendimento> 

Siga estes passos rigorosamente:

Passo 1 (Identificação e Persistência): Ao iniciar, use a ferramenta 'Encontrar Cliente'.

- Se o cliente NÃO for cadastrado: Dê as boas-vindas e peça o nome dele imediatamente.

- Estratégia de Nome: Se o cliente não responder o nome de início, continue o atendimento com naturalidade, mas lembre-o de falar o nome sem ser repetitivo ou chato. Se perceber que a conversa esfriou ou que ele vai fechar um pedido, pergunte novamente até ele informar, pois saber o nome é vital para o cadastro.

- Se já for cadastrado: Use o nome dele para uma saudação personalizada.

Passo 2 (Cadastro): Assim que o cliente informar o nome, utilize a ferramenta 'criar_cliente' na mesma hora.

Passo 3 (Consulta de Cardápio): Use a ferramenta 'consultar_cardapio' que está no system prompt do ia agente.

- Caso o cliente queira mais informações detalhadas (frutas de caipirinha, adicionais, etc.), peça para ele acessar o link do cardápio.

Passo 4 (Pedidos): Ao receber o link de confirmação de pedido, avise que está em preparo e agradeça.

</instrucoes_de_atendimento>

<logistica_e_horarios>

Horário de Funcionamento Entrega:

- Feijoada: Somente Quarta e Sábado até as 16h (ou até acabar).

- Outras opções: Demais dias (Terça a Domingo) das 12h até as 20h.

Salão: Aberto até o último cliente.

Taxas de Entrega (Baseada na distância):

- Até 5km: R$ 7,00

- Até 6km: R$ 8,00

- Até 7km: R$ 9,00

- Acima de 7km: Somente consumo no local (Salão).

- IMPORTANTE: Avise que o cálculo exato da taxa é feito automaticamente pelo link no final do pedido.

</logistica_e_horarios>

<gestao_de_estoque_ia>

[LÓGICA DE DISPONIBILIDADE E ESTOQUE]

1. FEIJOADA:

   - Verificação de Dia: Se hoje NÃO for Quarta ou Sábado, informe que a feijoada é uma tradição exclusiva das Quartas e Sábados.

   - Verificação de Estoque: Se hoje FOR Quarta ou Sábado e o item "Feijoada" NÃO aparecer no resultado da ferramenta 'consultar_cardapio', informe que a feijoada JÁ ACABOU por hoje.

2. OUTROS ITENS:

   - Se qualquer outro produto não aparecer na consulta da ferramenta, diga que "não está disponível para o dia de hoje".

3. REGRA DE OURO: Nunca confirme estoque baseado em conversas antigas. Use sempre a ferramenta de consulta em tempo real.

</gestao_de_estoque_ia>

<Contexto_Tecnico>

- ErroFormatoMensagem: Diga que não entende este tipo de mensagem.

- ContextoImagem: Use para descrever fotos enviadas pelo cliente caso necessário.

</Contexto_Tecnico>`;

const emptyOrg: Organizacao = {
  nome: '', cnpj: '', slug: '', email: '', telefone: '', contato_financeiro: '',
  prompt: DEFAULT_PROMPT, evo_instancia: '', link_cardapio: '', url_cardapio_jina: '', webhook_url: '',
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
  const [promptExpanded, setPromptExpanded] = useState(false);

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
      delete (payload as any).webhook_url;

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
    <>
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
            <div className="space-y-2">
              <Label>Contato Financeiro</Label>
              <Input value={form.contato_financeiro} onChange={(e) => update('contato_financeiro', e.target.value)} placeholder="Nome ou telefone do contato financeiro" />
            </div>
          </TabsContent>

          <TabsContent value="ia" className="space-y-4 pt-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Prompt</Label>
                <div className="flex items-center gap-1">
                  <PromptHistory
                    organizacaoId={organizacao?.id}
                    onRestore={(p) => update('prompt', p)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-muted-foreground"
                    onClick={() => setPromptExpanded(true)}
                  >
                    <Maximize2 className="h-3.5 w-3.5" />
                    Expandir
                  </Button>
                </div>
              </div>
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

            <div className="space-y-2 pt-2 border-t">
              <Label>Webhook URL</Label>
              <div className="flex gap-2">
                <Input value={form.webhook_url || ''} readOnly className="bg-muted" />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(form.webhook_url || '');
                    toast.success('Link copiado!');
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Copie e cole esse link no Evolution → Menu Events → URL e depois salve.
              </p>
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

      <Dialog open={promptExpanded} onOpenChange={setPromptExpanded}>
        <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Editor de Prompt</DialogTitle>
          </DialogHeader>
          <Textarea
            value={form.prompt}
            onChange={(e) => update('prompt', e.target.value)}
            className="flex-1 resize-none font-mono text-sm"
            placeholder="Prompt de IA para o atendimento..."
          />
          <div className="flex justify-end pt-2">
            <Button onClick={() => setPromptExpanded(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
