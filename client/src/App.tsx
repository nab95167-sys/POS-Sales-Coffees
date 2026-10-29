import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { ProductProvider } from './context/ProductContext';
import { Layout } from './components/ui/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { PosPage } from './pages/PosPage';
import { KdsPage } from './pages/KdsPage';
import { TablesPage } from './pages/TablesPage';
import { ProductsPage } from './pages/ProductsPage';
import { InventoryPage } from './pages/InventoryPage';
import { CustomersPage } from './pages/CustomersPage';
import { EmployeesPage } from './pages/EmployeesPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({
  children,
  allowedRoles,
}) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/pos" replace />;
  }

  return <Layout>{children}</Layout>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ProductProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />

              <Route
                path="/"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/pos"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
                    <PosPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/kds"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'BARISTA', 'CASHIER']}>
                    <KdsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tables"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
                    <TablesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/products"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <ProductsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/inventory"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <InventoryPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/customers"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']}>
                    <CustomersPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/employees"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <EmployeesPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/reports"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}>
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']}>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </ProductProvider>
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;
