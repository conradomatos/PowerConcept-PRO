import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Truck, GanttChart, DollarSign, Wrench } from 'lucide-react';

export default function FrotasDashboard() {
  const navigate = useNavigate();
  const { user, loading, hasAnyRole } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!hasAnyRole()) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-xl font-semibold mb-2">Acesso Pendente</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Sua conta foi criada, mas você ainda não tem permissão para acessar o sistema.
            Entre em contato com um administrador para liberar seu acesso.
          </p>
        </div>
      </Layout>
    );
  }

  const cards = [
    {
      title: 'Total Veículos',
      value: '—',
      description: 'Veículos cadastrados',
      icon: Truck,
    },
    {
      title: 'KM no Mês',
      value: '—',
      description: 'Quilômetros rodados',
      icon: GanttChart,
    },
    {
      title: 'Custo Mensal',
      value: '—',
      description: 'Custo total do mês',
      icon: DollarSign,
    },
    {
      title: 'Manutenções Pendentes',
      value: '—',
      description: 'Aguardando execução',
      icon: Wrench,
    },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Gestão de Frotas</h2>
          <p className="text-muted-foreground">Visão geral da frota de veículos</p>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{card.value}</div>
                  <p className="text-xs text-muted-foreground">{card.description}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
