import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';

type Status = 'idle' | 'checking' | 'ok' | 'warn' | 'error';

const DEFAULT_EVO_URL = 'https://evolution.projautomacao.com.br';

interface Props {
  evoInstancia: string;
  evoApikey: string;
  evoBaseUrl: string;
}

export function IntegrationCheck({ evoInstancia, evoApikey, evoBaseUrl }: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [detail, setDetail] = useState('');

  const check = async () => {
    if (!evoInstancia.trim() || !evoApikey.trim()) {
      toast.error('Preencha a Instância EVO e a API Key antes de verificar');
      return;
    }

    setStatus('checking');
    setDetail('');

    const base = (evoBaseUrl.trim() || DEFAULT_EVO_URL).replace(/\/+$/, '');

    try {
      const res = await fetch(`${base}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          apikey: evoApikey.trim(),
        },
      });

      if (!res.ok) {
        setStatus('error');
        setDetail('Verifique o nome da instância e a API Key.');
        toast.error('❌ Instância não encontrada. Verifique o nome e a API Key.');
        return;
      }

      const instances: any[] = await res.json();
      const found = instances.find(
        (inst: any) =>
          (inst?.instance?.instanceName || inst?.instanceName || '')
            .toLowerCase() === evoInstancia.trim().toLowerCase()
      );

      if (!found) {
        setStatus('error');
        setDetail('Instância não encontrada na Evolution.');
        toast.error('❌ Instância não encontrada. Verifique o nome e a API Key.');
        return;
      }

      const instanceStatus = (
        found?.instance?.status || found?.status || ''
      ).toLowerCase();

      if (instanceStatus === 'open') {
        setStatus('ok');
        setDetail(`Instância ${evoInstancia} conectada!`);
        toast.success(`✅ Instância ${evoInstancia} conectada e funcionando!`);
      } else {
        setStatus('warn');
        setDetail('WhatsApp não conectado. Escaneie o QR Code.');
        toast.warning('⚠️ Instância encontrada mas WhatsApp não está conectado. Escaneie o QR Code no Evolution.');
      }
    } catch {
      setStatus('error');
      setDetail('Não foi possível conectar à Evolution API.');
      toast.error('❌ Instância não encontrada. Verifique o nome e a API Key.');
    }
  };

  const badgeMap: Record<Status, { label: string; className: string } | null> = {
    idle: null,
    checking: null,
    ok: { label: '🟢 Operacional', className: 'bg-green-100 text-green-800 border-green-200' },
    warn: { label: '🟡 WhatsApp desconectado', className: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    error: { label: '🔴 Erro', className: 'bg-red-100 text-red-800 border-red-200' },
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
