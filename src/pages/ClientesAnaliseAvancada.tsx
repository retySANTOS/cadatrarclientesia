import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';

export default function ClientesAnaliseAvancada() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Análise avançada</h1>
          <p className="text-slate-500 text-sm mt-1">Insights detalhados sobre sua base de clientes.</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center text-slate-400">
            Em breve — será implementado na próxima versão
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
