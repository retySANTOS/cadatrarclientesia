import { useEffect, useState } from 'react';
import { Copy, Eye, EyeOff, Maximize2, Crown, Rocket } from 'lucide-react';
import { IntegrationCheck } from '@/components/IntegrationCheck';
import { PromptHistory } from '@/components/PromptHistory';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { generateSlug } from '@/lib/generateSlug';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ModulosConfig {
  monitor_pedidos: boolean;
  feedback_automatico: boolean;
  resumo_diario: boolean;
  dashboard_feedbacks: boolean;
  integracao_ifood: boolean;
  programa_fidelidade: boolean;
  campanhas: boolean;
  dashboard_pedidos: boolean;
}

const DEFAULT_MODULOS: ModulosConfig = {
  monitor_pedidos: false,
  feedback_automatico: false,
  resumo_diario: false,
  dashboard_feedbacks: false,
  integracao_ifood: false,
  programa_fidelidade: false,
  campanhas: false,
  dashboard_pedidos: false,
};

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
  evo_apikey: string;
  evo_base_url: string;
  link_cardapio: string;
  url_cardapio_jina: string;
  webhook_url: string;
  logo_url: string;
  cidade_estado: string;
  endereco_completo: string;
  ativado: boolean;
  ativo: boolean;
  mensagem_boas_vindas: string;
  modulos: ModulosConfig;
  created_by?: string;
}

const DEFAULT_PROMPT = `<persona_e_objetivo> 

Você é o assistente virtual do [NOME DO ESTABELECIMENTO]. Sua personalidade é de um atendente gente boa, rápido e direto ao ponto.

REGRA DE OURO: Nunca envie blocos de texto. Use no máximo 2 frases por mensagem. Se tiver muita informação, divida em mensagens separadas com um pequeno intervalo entre elas.
</persona_e_objetivo>

<instrucoes_de_atendimento>
Siga estes passos rigorosamente:

Passo 1 (Identificação e Persistência): Ao iniciar, use a ferramenta 'Encontrar Cliente'.
- Se o cliente NÃO for cadastrado: Dê as boas-vindas e peça o nome dele imediatamente.
- Estratégia de Nome: Se o cliente não responder o nome de início, continue o atendimento com naturalidade, mas lembre-o de falar o nome sem ser repetitivo ou chato. Se perceber que a conversa esfriou ou que ele vai fechar um pedido, pergunte novamente até ele informar, pois saber o nome é vital para o cadastro.
- Se já for cadastrado: Use o nome dele para uma saudação personalizada.

Passo 2 (Cadastro): Assim que o cliente informar o nome, utilize a ferramenta 'criar_cliente' na mesma hora.

Passo 3 (Consulta e Escolha): Use a ferramenta 'consultar_cardapio'.
- Se o cliente escolher um item, não mande o link de cara. Primeiro, confirme os detalhes (sabor, tamanho, adicionais).
- Só ofereça o link do cardápio quando o cliente estiver decidido e pronto para finalizar.

Passo 4 (Pedidos e Links):
- Quando enviar o link do cardápio para o cliente fazer o pedido, SEMPRE adicione: "Quando finalizar, me manda aqui os links que vão aparecer na tela de confirmação que eu acompanho tudo pra você! 📦"
- Se o cliente confirmar que fez o pedido mas NÃO enviar os links, pergunte: "Show! Me envia os 2 links que apareceram na tela do pedido pra eu acompanhar o status pra você 😉"
- Se o cliente disser que não sabe quais links, explique: "Depois que você finalizou o pedido, apareceu uma tela com um link do pedido e um link pra acompanhar o status. Pode me mandar os dois?"
- Se o cliente enviar apenas 1 dos 2 links, peça o outro: "Recebi esse! Falta só o outro link que apareceu na mesma tela, consegue me mandar?"
- Ao receber os 2 links de confirmação de pedido, avise que está acompanhando e agradeça.
- NUNCA siga para o Passo 5 (status) sem ter recebido os links do cliente.

Passo 5 (Acompanhamento de Status):
- Se o cliente perguntar sobre o status do pedido, se já saiu, se está pronto ou quanto tempo falta, use a ferramenta 'consultar_pedido'.
- Responda de forma direta com o status e a previsão de entrega retornados pela ferramenta.
- Se o status for "Seu pedido saiu para entrega", comemore e diga que já está a caminho.
- Se a previsão de entrega já passou do horário atual, peça desculpas pelo atraso e diga que estão agilizando.
- Se a ferramenta não retornar nenhum pedido, peça para o cliente enviar o link do pedido.
- NUNCA envie links de acompanhamento para o cliente. Você já tem acesso ao status em tempo real.
- NUNCA invente status. Use APENAS os dados retornados pela ferramenta.

Passo 5.1 (Feedback de Pedido Entregue):
- Quando o cliente responder sobre como foi o pedido (após a mensagem automática de feedback ou espontaneamente), siga este fluxo:
  1. Primeiro use 'consultar_pedido' para encontrar o pedido mais recente com status entregue
  2. Agradeça o feedback e pergunte: "De 1 a 5, que nota você dá pro nosso atendimento e pedido?"
  3. Quando o cliente der a nota, use a ferramenta 'salvar_feedback' com o hash_pedido encontrado, o texto do feedback e a nota
  4. Após salvar, responda conforme a nota:
     - Nota 4-5: "Valeu demais! A equipe vai ficar feliz com isso! 🙌"
     - Nota 3: "Obrigado pela sinceridade! Vamos trabalhar pra melhorar! 💪"
     - Nota 1-2: "Poxa, sinto muito pela experiência. Vou acionar a equipe pra resolver isso. Quer falar com um atendente?"
- Se o cliente enviar uma FOTO mostrando problema no pedido (comida derramada, item errado, embalagem danificada, faltando item):
  1. Reconheça o problema e peça desculpas imediatamente: "Poxa, sinto muito por isso! Isso não é o padrão da casa."
  2. Use 'consultar_pedido' para encontrar o pedido mais recente do cliente
  3. Use 'salvar_feedback' com o hash_pedido, uma descrição detalhada do problema visto na foto e nota_cliente = 1
  4. Diga: "Já registrei aqui e vou te passar para a equipe resolver isso agora mesmo!"
  5. Use a ferramenta 'Desativa Conversa IA' para acionar o atendente humano IMEDIATAMENTE. Não pergunte se o cliente quer falar com humano, apenas acione.
  6. NUNCA tente resolver o problema sozinho. SEMPRE escale para humano quando houver foto de problema.
- NUNCA peça feedback se o cliente não recebeu a mensagem automática ou se não mencionou nada sobre o pedido
- REGRA DE VALIDADE DO FEEDBACK: Só peça feedback se o cliente estiver respondendo à mensagem automática de feedback que foi enviada logo após a entrega. Se o cliente voltar em outro dia ou em outra conversa para fazer um novo pedido, NÃO mencione feedback de pedidos anteriores. Comece o atendimento normalmente como se fosse uma nova interação. O momento do feedback já passou — se ele não respondeu na hora, não cobre depois.

Passo 6 (Transição para Humano):
- Se o cliente demonstrar frustração com o tempo de entrega ou com o atendimento, diga educadamente: "Vou acionar um atendente humano agora para verificar a situação exata do seu pedido e te dar uma resposta definitiva. Só um momento!"
- Após enviar esta mensagem, o atendimento humano assumirá conforme configurado no fluxo.
</instrucoes_de_atendimento>

<logistica_e_horarios>
[PREENCHA COM OS HORÁRIOS E TAXAS DO ESTABELECIMENTO]

Exemplo:
Horário de Funcionamento Entrega:
- Segunda a Sexta: 11h às 22h
- Sábado e Domingo: 11h às 23h

Taxas de Entrega:
- Até 3km: Grátis
- Até 5km: R$ 5,00
- Acima de 5km: Consultar
- IMPORTANTE: Avise que o cálculo exato da taxa é feito automaticamente pelo link no final do pedido.
</logistica_e_horarios>

<gestao_de_estoque_ia>
[PREENCHA COM AS REGRAS DE ESTOQUE DO ESTABELECIMENTO]

Regras padrão:
1. Se qualquer produto não aparecer na consulta da ferramenta 'consultar_cardapio', diga que "não está disponível para o dia de hoje".
2. REGRA DE OURO: Nunca confirme estoque baseado em conversas antigas. Use sempre a ferramenta de consulta em tempo real.

Regras especiais (exemplos):
- Itens exclusivos de certos dias da semana
- Itens só para salão ou só para delivery
- Itens com restrição de horário
</gestao_de_estoque_ia>

<Contexto_Tecnico>
- ErroFormatoMensagem: Diga que não entende este tipo de mensagem.
- ContextoImagem: Use para descrever fotos enviadas pelo cliente caso necessário.
</Contexto_Tecnico>
`;

const emptyOrg: Organizacao = {
  nome: '', cnpj: '', slug: '', email: '', telefone: '', contato_financeiro: '',
  prompt: DEFAULT_PROMPT, evo_instancia: '', evo_apikey: '', evo_base_url: '', link_cardapio: '', url_cardapio_jina: '', webhook_url: '',
  logo_url: '', cidade_estado: '', endereco_completo: '',
  ativado: true, ativo: true, mensagem_boas_vindas: '',
  modulos: { ...DEFAULT_MODULOS },
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
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (organizacao) {
      setForm({ ...organizacao, modulos: { ...DEFAULT_MODULOS, ...organizacao.modulos } });
    } else {
      setForm(emptyOrg);
    }
  }, [organizacao, open]);

  const updateModulo = (key: keyof ModulosConfig, value: boolean) => {
    setForm((prev) => ({
      ...prev,
      modulos: { ...DEFAULT_MODULOS, ...prev.modulos, [key]: value },
    }));
  };

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
            <TabsTrigger value="modulos" className="flex-1">Módulos</TabsTrigger>
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
                    currentPrompt={form.prompt}
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
              <Label>API Key da Instância</Label>
              <div className="relative">
                <Input
                  type={showApiKey ? 'text' : 'password'}
                  value={form.evo_apikey}
                  onChange={(e) => update('evo_apikey', e.target.value)}
                  placeholder="Cole a API Key da Evolution"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-10 w-10"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
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
              <div className="pt-2">
              <IntegrationCheck
                  webhookUrl={form.webhook_url || ''}
                  evoInstancia={form.evo_instancia}
                  evoApikey={form.evo_apikey}
                  evoBaseUrl={form.evo_base_url || ''}
                  supabaseUrl="https://supabase.projautomacao.com.br"
                />
              </div>
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

          <TabsContent value="modulos" className="space-y-6 pt-4">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Crown className="h-4 w-4 text-amber-500" />
                <h3 className="font-semibold text-sm">Módulos Premium</h3>
              </div>
              <div className="space-y-2">
                {([
                  { key: 'monitor_pedidos' as const, label: 'Monitor de pedidos', desc: 'Notificação automática quando status do pedido muda' },
                  { key: 'feedback_automatico' as const, label: 'Feedback automático', desc: 'Pede avaliação após entrega e trata reclamações com foto' },
                  { key: 'resumo_diario' as const, label: 'Resumo diário', desc: 'Relatório diário via WhatsApp pro dono' },
                  { key: 'dashboard_feedbacks' as const, label: 'Dashboard feedbacks', desc: 'Painel com notas, gráficos e filtros' },
                ]).map((m) => (
                  <div key={m.key} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{m.label}</p>
                      <p className="text-xs text-muted-foreground">{m.desc}</p>
                    </div>
                    <Switch
                      checked={form.modulos?.[m.key] ?? false}
                      onCheckedChange={(v) => updateModulo(m.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-3">
                <Rocket className="h-4 w-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm text-muted-foreground">Módulos Pro</h3>
              </div>
              <div className="space-y-2">
                {([
                  { key: 'integracao_ifood' as const, label: 'Integração iFood', desc: 'Recebe pedidos do iFood no mesmo sistema' },
                  { key: 'programa_fidelidade' as const, label: 'Programa fidelidade', desc: 'Pontos por pedido e recompensas' },
                  { key: 'campanhas' as const, label: 'Campanhas', desc: 'Disparo de promoções via WhatsApp' },
                  { key: 'dashboard_pedidos' as const, label: 'Dashboard pedidos', desc: 'Analytics de vendas e ticket médio' },
                ]).map((m) => (
                  <div key={m.key} className="flex items-center justify-between rounded-lg border p-3 opacity-60">
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{m.label}</p>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Em breve</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{m.desc}</p>
                      </div>
                    </div>
                    <Switch disabled checked={false} />
                  </div>
                ))}
              </div>
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
