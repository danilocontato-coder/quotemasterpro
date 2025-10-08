import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: any;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    // Logar para debug
    console.error('🧯 Global ErrorBoundary capturou um erro:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6">
          <div className="max-w-lg w-full space-y-3 text-center">
            <h1 className="text-2xl font-semibold">Ocorreu um erro ao carregar a página</h1>
            <p className="text-sm text-muted-foreground">Tente atualizar a página. Se o problema persistir, entre em contato com o suporte.</p>
            <pre className="text-left text-xs bg-muted p-3 rounded overflow-auto max-h-48">
              {String(this.state.error)}
            </pre>
            <button
              className="inline-flex items-center justify-center rounded-md border px-4 py-2 text-sm"
              onClick={() => window.location.reload()}
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
