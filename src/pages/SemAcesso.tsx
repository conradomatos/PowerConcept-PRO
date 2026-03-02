import Layout from '@/components/Layout';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function SemAcesso() {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <ShieldAlert className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Acesso Negado</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Você não tem permissão para acessar esta página.
          Entre em contato com o administrador para solicitar acesso.
        </p>
        <Button onClick={() => navigate('/home')}>
          Voltar para Home
        </Button>
      </div>
    </Layout>
  );
}
