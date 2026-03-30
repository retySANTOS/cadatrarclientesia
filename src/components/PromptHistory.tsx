import { useEffect, useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface HistoricoPrompt {
  id: string;
  created_at: string;
  prompt_conteudo: string;
  alterado_por: string | null;
}

interface Props {
  organizacaoId?: string;
  onRestore: (prompt: string) => void;
}

export function PromptHistory({ organizacaoId, onRestore }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HistoricoPrompt[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !organizacaoId) return;
    setLoading(true);
    supabase
      .from('historico_prompts')
      .select('id, created_at, prompt_conteudo, alterado_por')
      .eq('organizacao_id', organizacaoId)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setItems((data as HistoricoPrompt[]) ?? []);
        setLoading(false);
      });
  }, [open, organizacaoId]);

  const handleRestore = (prompt: string) => {
    onRestore(prompt);
    toast.success('Versão carregada no editor. Clique em "Salvar" para confirmar.');
    setOpen(false);
  };

  const preview = (text: string) => {
    const lines = text.split('\n').filter(Boolean).slice(0, 2).join(' ');
    return lines.length > 120 ? lines.substring(0, 120) + '…' : lines;
  };

  if (!organizacaoId) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-foreground"
          title="Histórico de versões"
        >
          <History className="h-3.5 w-3.5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[480px] flex flex-col">
        <SheetHeader>
          <SheetTitle>Histórico de Versões</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Nenhuma versão anterior encontrada ainda.
            </p>
          ) : (
            <div className="space-y-1">
              {items.map((item, idx) => (
                <div key={item.id}>
                  <div className="py-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={() => handleRestore(item.prompt_conteudo)}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restaurar
                      </Button>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {preview(item.prompt_conteudo)}
                    </p>
                  </div>
                  {idx < items.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
