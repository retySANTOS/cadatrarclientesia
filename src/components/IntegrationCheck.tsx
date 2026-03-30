import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

type Status = 'idle' | 'checking' | 'ok' | 'config_error' | 'offline';

interface Props {
  webhookUrl: string;
  evoInstancia: string;
  evoApikey: string;
  supabaseUrl: string;
}

export function IntegrationCheck({ webhookUrl, evoInstancia, evoApikey, supabaseUrl }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [detail, setDetail] = useState('');

  const check = async () => {
    if (!webhookUrl) {
      toast.error('Webhook URL não disponível');
      return;
    }
    if (!evoInstancia || !evoApikey) {
      toast.error('Preencha a Instância EVO e a API Key antes de verificar');
      return;
    }

    setStatus('checking');
    setDetail('');

    try {
      // Step 1: Check n8n webhook (any response = connected)
      let n8nConnected = false;
      try {
        const webhookRes = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'health_check' }),
          mode: 'no-cors',
        });
        // With no-cors, opaque response (status 0) or any status means server exists
        n8nConnected = true;
      } catch {
        setStatus('offline');
        setDetail('Não foi possível conectar ao servidor n8n');
        return;
      }

      // Step 2: Check Evolution API instance
      const evoBaseUrl = evoInstancia.includes('http')
        ? evoInstancia.replace(/\/+$/, '')
        : `https://${evoInstancia}`;

      let evoRes: Response;
      try {
        evoRes = await fetch(`${evoBaseUrl}/instance/fetchInstances`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            apikey: evoApikey,
          },
        });
      } catch {
        setStatus('config_error');
        setDetail('n8n online ✔ — Não foi possível conectar à Evolution API. Verifique a URL da instância.');
        return;
      }

      if (!evoRes.ok) {
        setStatus('config_error');
        setDetail('n8n online ✔ — Conexão estabelecida. Verifique as configurações na Evolution API');
        return;
      }

      const instances = await evoRes.json();

      // Step 3: Compare webhook URLs
      const found = Array.isArray(instances)
        ? instances.some((inst: any) => {
            const configuredUrl = inst?.instance?.webhookUrl || inst?.setting?.websocket?.url || '';
            return configuredUrl.includes(supabaseUrl) || configuredUrl === webhookUrl;
          })
        : false;

      if (!found) {
        setStatus('config_error');
        setDetail('n8n online ✔ — URL configurada na Evolution difere da URL do webhook');
      } else {
        setStatus('ok');
        setDetail('Webhook e Evolution API configurados corretamente');
      }
    } catch (err: any) {
      setStatus('config_error');
      setDetail(err.message || 'Erro desconhecido');
    }
  };

  const badgeMap: Record<Status, { label: string; className: string } | null> = {
    idle: null,
    checking: null,
    ok: { label: '🟢 Operacional', className: 'bg-green-100 text-green-800 border-green-200' },
    config_error: { label: '🟡 Erro de Configuração', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    offline: { label: '🔴 Servidor Offline', className: 'bg-red-100 text-red-800 border-red-200' },
  };

  const badge = badgeMap[status];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={check}
        disabled={status === 'checking'}
        className="gap-1.5"
      >
        {status === 'checking' ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <ShieldCheck className="h-3.5 w-3.5" />
        )}
        Verificar Integração
      </Button>
      {badge && (
        <Badge variant="outline" className={badge.className}>
          {badge.label}
        </Badge>
      )}
      {detail && <span className="text-xs text-muted-foreground">{detail}</span>}
    </div>
  );
}
