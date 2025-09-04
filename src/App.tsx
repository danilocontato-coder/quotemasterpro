import React from 'react';

function App() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Entregas</h1>
          <p className="text-muted-foreground">
            Gerencie suas entregas e registre confirmações
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-500 text-white rounded">
          Nova Entrega
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Entregas Pendentes</h3>
          </div>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-gray-500">Agendadas</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Entregas Hoje</h3>
          </div>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-gray-500">Programadas para hoje</p>
        </div>

        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium">Em Trânsito</h3>
          </div>
          <div className="text-2xl font-bold">0</div>
          <p className="text-xs text-gray-500">A caminho do destino</p>
        </div>
      </div>

      <div className="border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">Entregas</h2>
        <div className="text-center py-8">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">📦</div>
          <h3 className="text-sm font-semibold">Nenhuma entrega</h3>
          <p className="text-sm text-gray-500 mt-1">
            Cadastre sua primeira entrega para começar
          </p>
          <button className="mt-6 px-4 py-2 bg-blue-500 text-white rounded">
            Nova Entrega
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;