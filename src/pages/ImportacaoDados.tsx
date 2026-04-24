import { DashboardLayout } from '@/components/DashboardLayout';

export default function ImportacaoDados() {
  return (
    <DashboardLayout>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">Importação de Dados</h1>
        <p className="text-sm text-muted-foreground">Página de importação de dados.</p>
      </div>
    </DashboardLayout>
  );
}