/**
 * Protege uma rota inteira por módulo.
 * Redireciona para /sem-acesso se o usuário não tem permissão.
 *
 * @example
 * <Route path="/financeiro/*" element={
 *   <ProtectedRoute module="financeiro">
 *     <FinanceiroLayout />
 *   </ProtectedRoute>
 * } />
 */

import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  module?: string;
  permission?: string;
  children: ReactNode;
}

export function ProtectedRoute({ module, permission, children }: ProtectedRouteProps) {
  const { canModule, can, loading } = usePermissions();
  const { user, loading: authLoading } = useAuth();

  // Enquanto carrega, não redireciona
  if (authLoading || loading) return null;

  // Se não está logado, vai para auth
  if (!user) return <Navigate to="/auth" replace />;

  // Verifica permissão
  if (module && !canModule(module)) {
    return <Navigate to="/sem-acesso" replace />;
  }

  if (permission && !can(permission)) {
    return <Navigate to="/sem-acesso" replace />;
  }

  return <>{children}</>;
}
