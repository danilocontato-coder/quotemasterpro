import { DebugAuthPanel } from '@/components/admin/debug/DebugAuthPanel';

export default function DebugAuth() {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Debug de Autenticação</h1>
        <p className="text-muted-foreground">
          Diagnóstico completo de Auth, Profiles e sincronização
        </p>
      </div>
      
      <DebugAuthPanel />
    </div>
  );
}
