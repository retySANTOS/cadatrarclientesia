import { useEffect, useState, useMemo } from 'react';
import { History, RotateCcw, Eye, GitCompareArrows, Sparkles, Loader2, ChevronLeft } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { diffWords } from 'diff';

interface HistoricoPrompt {
  id: string;
  created_at: string;
  prompt_conteudo: string;
  alterado_por: string | null;
}

interface Props {
  organizacaoId?: string;
  currentPrompt: string;
  onRestore: (prompt: string) => void;
}

type ViewMode = 'diff' | 'full';

function DiffViewer({ oldText, newText }: { oldText: string; newText: string }) {
  const parts = useMemo(() => diffWords(oldText, newText), [oldText, newText]);

  return (
    <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed p-3 rounded-md border bg-muted/30 max-h-[50vh] overflow-y-auto">
      {parts.map((part, i) => {
        if (part.added) {
          return (
            <span key={i} className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-sm px-0.5">
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span key={i} className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 line-through rounded-sm px-0.5">
              {part.value}
            </span>
          );
        }
        return <span key={i}>{part.value}</span>;
      })}
    </pre>
  );
}

export function PromptHistory({ organizacaoId, currentPrompt, onRestore }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HistoricoPrompt[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<HistoricoPrompt | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('diff');
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!open || !organizacaoId) return;
    setLoading(true);
    setSelected(null);
    setAiSummary(null);
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

  const handleSelectVersion = (item: HistoricoPrompt) => {
    setSelected(item);
    setViewMode('diff');
    setAiSummary(null);
  };

  const handleSummarize = async () => {
    if (!selected) return;
    setAiLoading(true);
    try {
      const response = await supabase.functions.invoke('summarize-diff', {
        body: { oldText: selected.prompt_conteudo, newText: currentPrompt },
      });
      if (response.error) throw response.error;
      setAiSummary(response.data?.summary || 'Não foi possível gerar o resumo.');
    } catch {
      toast.error('Erro ao gerar resumo com IA. Verifique se a edge function está configurada.');
    } finally {
      setAiLoading(false);
    }
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
      <SheetContent className="w-[440px] sm:w-[540px] flex flex-col">
        <SheetHeader>
          <SheetTitle>
            {selected ? (
              <button
                onClick={() => { setSelected(null); setAiSummary(null); }}
                className="flex items-center gap-1 text-sm hover:text-primary transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
                Voltar à lista
              </button>
            ) : (
              'Histórico de Versões'
            )}
          </SheetTitle>
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
          ) : selected ? (
            /* ── Detail / Diff View ── */
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                Versão de {format(new Date(selected.created_at), 'dd/MM/yyyy HH:mm')}
              </p>

              {/* Toggle: Diff vs Full */}
              <div className="flex gap-1 rounded-lg border p-1 bg-muted/40 w-fit">
                <Button
                  variant={viewMode === 'diff' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setViewMode('diff')}
                >
                  <GitCompareArrows className="h-3 w-3" />
                  Diff
                </Button>
                <Button
                  variant={viewMode === 'full' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setViewMode('full')}
                >
                  <Eye className="h-3 w-3" />
                  Texto Completo
                </Button>
              </div>

              {viewMode === 'diff' ? (
                <DiffViewer oldText={selected.prompt_conteudo} newText={currentPrompt} />
              ) : (
                <pre className="text-xs font-mono whitespace-pre-wrap leading-relaxed p-3 rounded-md border bg-muted/30 max-h-[50vh] overflow-y-auto">
                  {selected.prompt_conteudo}
                </pre>
              )}

              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-block w-3 h-3 rounded-sm bg-green-100 dark:bg-green-900/40 border border-green-300" /> Adições
                <span className="inline-block w-3 h-3 rounded-sm bg-red-100 dark:bg-red-900/40 border border-red-300 ml-2" /> Remoções
              </div>

              {/* AI Summary */}
              <div className="pt-2 border-t space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs w-full"
                  onClick={handleSummarize}
                  disabled={aiLoading}
                >
                  {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  Resumir Mudanças com IA
                </Button>
                {aiSummary && (
                  <div className="rounded-md border bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-blue-800 dark:text-blue-300 leading-relaxed">
                    {aiSummary}
                  </div>
                )}
              </div>

              <Separator />

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => handleRestore(selected.prompt_conteudo)}
              >
                <RotateCcw className="h-4 w-4" />
                Restaurar esta Versão
              </Button>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-12">
              Nenhuma versão anterior encontrada ainda.
            </p>
          ) : (
            /* ── List View ── */
            <div className="space-y-1">
              {items.map((item, idx) => (
                <div key={item.id}>
                  <button
                    onClick={() => handleSelectVersion(item)}
                    className="w-full text-left py-3 space-y-2 hover:bg-muted/50 rounded-md px-2 -mx-2 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {format(new Date(item.created_at), 'dd/MM/yyyy HH:mm')}
                      </span>
                      <span className="text-[10px] text-muted-foreground">Clique para comparar →</span>
                    </div>
                    <p className="text-sm text-foreground/80 leading-relaxed">
                      {preview(item.prompt_conteudo)}
                    </p>
                  </button>
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
