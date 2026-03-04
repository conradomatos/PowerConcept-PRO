import { Outlet, useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';

export default function BasesGlobaisLayout() {
  const navigate = useNavigate();
  const { isGodMode, loading } = useAuth();

  // Only super_admin can access this page
  if (!loading && !isGodMode()) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground">Esta página é exclusiva para administradores master.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/dashboard')}>
            Voltar ao Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="flex-1">
        <Outlet />
      </div>
    </Layout>
  );
}
