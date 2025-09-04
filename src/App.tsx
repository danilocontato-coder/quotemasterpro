import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Lazy loading básico
const SupplierDeliveries = lazy(() => import('@/pages/supplier/SupplierDeliveries'));

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/supplier/deliveries" element={
          <Suspense fallback={<div>Carregando...</div>}>
            <SupplierDeliveries />
          </Suspense>
        } />
        <Route path="*" element={<Navigate to="/supplier/deliveries" replace />} />
      </Routes>
    </Router>
  );
}

export default App;