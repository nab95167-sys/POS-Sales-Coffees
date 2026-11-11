import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Coffee } from 'lucide-react';
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
import { PermissionId, Role } from './types';

function getHomePathForRole(role?: Role): string {
  if (role === 'BARISTA') return '/kds';
  if (role === 'CASHIER') return '/pos';
  return '/';
}

const AuthSplash: React.FC = () => (
  <div className="min-h-screen bg-[#09090b] flex flex-col items-center justify-center space-y-4 text-zinc-300 font-sans">
    <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 flex items-center justify-center shadow-lg shadow-amber-500/20 animate-pulse">
      <Coffee className="w-7 h-7 text-zinc-950 stroke-[2.5]" />
    </div>
    <p className="text-xs font-bold tracking-widest uppercase text-amber-400">
      Verifying Security Session...
    </p>
  </div>
);

const ProtectedRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles?: Role[];
  requiredPermission?: PermissionId;
}> = ({ children, allowedRoles, requiredPermission }) => {
  const { isAuthenticated, isLoading, user, hasGranularPermission } = useAuth();

  if (isLoading) {
    return <AuthSplash />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={getHomePathForRole(user.role)} replace />;
  }

  if (requiredPermission && !hasGranularPermission(requiredPermission)) {
    return <Navigate to={getHomePathForRole(user.role)} replace />;
  }

  return <Layout>{children}</Layout>;
};

const LoginRoute: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <AuthSplash />;
  if (isAuthenticated && user) {
    return <Navigate to={getHomePathForRole(user.role)} replace />;
  }
  return <Login />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <ProductProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<LoginRoute />} />

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
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']} requiredPermission="pos:access">
                    <PosPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/kds"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'BARISTA', 'CASHIER']} requiredPermission="pos:access">
                    <KdsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/tables"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER', 'CASHIER']} requiredPermission="pos:access">
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
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} requiredPermission="inventory:view">
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
                  <ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']} requiredPermission="reports:view">
                    <ReportsPage />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/settings"
                element={
                  <ProtectedRoute allowedRoles={['ADMIN']} requiredPermission="settings:edit">
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
