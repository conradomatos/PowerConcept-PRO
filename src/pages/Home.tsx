import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, 
  FolderKanban, 
  GanttChart, 
  ClipboardList, 
  LayoutDashboard, 
  AlertTriangle,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { Card, CardContent } from '@/components/ui/card';
// cn imported for potential future use

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

function formatDateExtended(): string {
  return format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR });
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export default function Home() {
  const navigate = useNavigate();
  const { user, loading, hasAnyRole } = useAuth();

  // Fetch user profile name
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', user.id)
        .single();
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch pending count
  const { data: pendingCount } = useQuery({
    queryKey: ['home-pendencias-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('apontamentos_consolidado')
        .select('*', { count: 'exact', head: true })
        .eq('status_apontamento', 'NAO_LANCADO');
      return count || 0;
    },
    enabled: !!user,
  });

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

  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const firstName = userName.split(' ')[0];

  const shortcuts = [
    { label: 'Meus Projetos', icon: FolderKanban, url: '/projetos' },
    { label: 'Planejamento', icon: GanttChart, url: '/planejamento' },
    { label: 'Apontamentos', icon: ClipboardList, url: '/apontamentos' },
    { label: 'Dashboard', icon: LayoutDashboard, url: '/dashboard' },
  ];

  return (
    <Layout>
      <div className="max-w-xl mx-auto space-y-6 py-4">
        {/* Greeting */}
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {getGreeting()}, {firstName}!
          </h1>
          <p className="text-muted-foreground">
            {capitalizeFirst(formatDateExtended())}
          </p>
        </div>

        {/* Main Action - Apontar Horas */}
        <Card 
          className="bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors"
          onClick={() => navigate('/apontamento-diario')}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary-foreground/10 rounded-lg">
                  <Clock className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Apontar Horas</h2>
                  <p className="text-primary-foreground/80 text-sm">
                    Registrar trabalho de hoje
                  </p>
                </div>
              </div>
              <ChevronRight className="h-6 w-6 text-primary-foreground/60" />
            </div>
          </CardContent>
        </Card>

        {/* Shortcuts Grid */}
        <div className="grid grid-cols-2 gap-3">
          {shortcuts.map((shortcut) => {
            const Icon = shortcut.icon;
            return (
              <Card 
                key={shortcut.url}
                className="cursor-pointer hover:bg-accent/50 transition-colors"
                onClick={() => navigate(shortcut.url)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    <span className="font-medium text-sm">{shortcut.label}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Pending Alert - Conditional */}
        {typeof pendingCount === 'number' && pendingCount > 0 && (
          <Card 
            className="border-amber-500/50 bg-amber-500/10 cursor-pointer hover:bg-amber-500/20 transition-colors"
            onClick={() => navigate('/dashboard')}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500" />
                  <span className="text-amber-700 dark:text-amber-300 font-medium">
                    {pendingCount} pendência{pendingCount > 1 ? 's' : ''} requer{pendingCount > 1 ? 'em' : ''} atenção
                  </span>
                </div>
                <ChevronRight className="h-5 w-5 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
