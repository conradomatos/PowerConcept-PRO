import { ReactNode, useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  LogOut,
  Settings,
  Users,
  FolderKanban,
  BarChart3,
  PanelLeft,
  Calculator,
  Wallet,
  Brain,
  Truck,
} from 'lucide-react';
import logoCps from '@/assets/logo-cps.png';
import { cn } from '@/lib/utils';
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';

export type NavigationArea = 'recursos' | 'projetos' | 'relatorios' | 'orcamentos' | 'financeiro' | 'frotas' | 'home' | 'ailab';

interface LayoutProps {
  children: ReactNode;
}

// Map routes to their navigation area
const routeToArea: Record<string, NavigationArea> = {
  // Home
  '/': 'home',
  '/home': 'home',
  // Recursos
  '/collaborators': 'recursos',
  '/recursos/custos': 'recursos',
  '/import': 'recursos',
  // Projetos
  '/empresas': 'projetos',
  '/projetos': 'projetos',
  '/planejamento': 'projetos',
  '/apontamentos': 'projetos',
  '/apontamento-diario': 'projetos',
  '/aprovacoes-projetos': 'projetos',
  '/import-apontamentos': 'projetos',
  // Relatórios
  '/dashboard': 'relatorios',
  '/custos-projeto': 'relatorios',
  '/rentabilidade': 'relatorios',
  // Financeiro
  '/financeiro': 'financeiro',
  '/financeiro/conciliacao': 'financeiro',
  '/financeiro/cartao-de-credito': 'financeiro',
  '/financeiro/categorias': 'financeiro',
  '/financeiro/dre': 'financeiro',
  '/financeiro/mapeamento-categorias': 'financeiro',
  // Orçamentos
  '/orcamentos': 'orcamentos',
  '/orcamentos/bases': 'orcamentos',
  // Frotas
  '/frotas': 'frotas',
  '/frotas/veiculos': 'frotas',
  '/frotas/km': 'frotas',
  '/frotas/abastecimentos': 'frotas',
  '/frotas/manutencao': 'frotas',
  '/frotas/custos': 'frotas',
  '/frotas/relatorios': 'frotas',
  '/ai-lab': 'ailab',
  '/admin': 'home',
  '/admin/roles': 'home',
};

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut, roles, hasRole } = useAuth();
  const { canModule, loading: permLoading } = usePermissions();

  const { data: userRbacRole } = useQuery({
    queryKey: ['user-rbac-display', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('rbac_user_roles')
        .select('rbac_roles(name, code)')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      return (data as any)?.rbac_roles || null;
    },
    enabled: !!user?.id,
  });
  
  // Determine active area based on current route
  const getAreaFromPath = (path: string): NavigationArea => {
    // Check exact match first
    if (routeToArea[path]) return routeToArea[path];
    // Check if path starts with any known route
    for (const [route, area] of Object.entries(routeToArea)) {
      if (path.startsWith(route) && route !== '/') return area;
    }
    return 'home'; // Default
  };
  
  const [activeArea, setActiveArea] = useState<NavigationArea>(() => 
    getAreaFromPath(location.pathname)
  );

  // Update active area when route changes
  useEffect(() => {
    const area = getAreaFromPath(location.pathname);
    setActiveArea(area);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const handleAreaClick = (area: NavigationArea) => {
    setActiveArea(area);
    // Navigate to first route of each area
    const firstRoutes: Record<NavigationArea, string> = {
      home: '/home',
      recursos: '/collaborators',
      projetos: '/projetos',
      orcamentos: '/orcamentos',
      relatorios: '/dashboard',
      financeiro: '/financeiro/conciliacao',
      frotas: '/frotas',
      ailab: '/ai-lab',
    };
    navigate(firstRoutes[area]);
  };

  // Mapa completo de áreas com seus módulos RBAC
  const allNavAreas = [
    { id: 'recursos' as NavigationArea, label: 'Recursos', icon: Users, moduleCode: 'recursos' },
    { id: 'projetos' as NavigationArea, label: 'Projetos', icon: FolderKanban, moduleCode: 'projetos' },
    { id: 'orcamentos' as NavigationArea, label: 'Orçamentos', icon: Calculator, moduleCode: 'orcamentos' },
    { id: 'relatorios' as NavigationArea, label: 'Relatórios', icon: BarChart3, moduleCode: 'relatorios' },
    { id: 'financeiro' as NavigationArea, label: 'Financeiro', icon: Wallet, moduleCode: 'financeiro' },
    { id: 'frotas' as NavigationArea, label: 'Frotas', icon: Truck, moduleCode: 'frotas' },
    { id: 'ailab' as NavigationArea, label: 'AI Lab', icon: Brain, moduleCode: 'ailab' },
  ];

  // Filtra apenas módulos que o usuário pode ver
  const topNavAreas = allNavAreas.filter(area => canModule(area.moduleCode));

  // Manter canAccessSettings existente + check RBAC
  const canAccessSettings = hasRole('admin') || hasRole('super_admin') || canModule('admin');

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar activeArea={activeArea} />
        <SidebarInset className="flex flex-col flex-1">
          {/* Header */}
          <header className="border-b border-border bg-card sticky top-0 z-10">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex h-14 items-center gap-3">
                <SidebarTrigger className="-ml-1">
                  <PanelLeft className="h-5 w-5" />
                </SidebarTrigger>
                
                {/* Top Nav - Areas */}
                <nav className="hidden md:flex items-center gap-1">
                  {topNavAreas.map((area) => {
                    const Icon = area.icon;
                    return (
                      <Button
                        key={area.id}
                        variant={activeArea === area.id ? 'default' : 'ghost'}
                        size="sm"
                        className={cn(
                          'gap-2 text-sm font-medium',
                          activeArea === area.id && 'bg-primary text-primary-foreground'
                        )}
                        onClick={() => handleAreaClick(area.id)}
                      >
                        <Icon className="h-4 w-4" />
                        {area.label}
                      </Button>
                    );
                  })}
                </nav>
                
                {/* Brand - Right side */}
                <Link 
                  to="/" 
                  className="ml-auto flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  <img src={logoCps} alt="CPS" className="h-8 w-auto" />
                  <h1 className="text-lg font-medium tracking-[0.25em] uppercase text-foreground">
                    CPS
                  </h1>
                </Link>
                
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground hidden sm:block truncate max-w-[180px]">
                    {user?.email}
                  </span>
                  {userRbacRole && (
                    <span className={cn(
                      "text-xs px-2 py-1 rounded font-medium",
                      userRbacRole?.code === 'god_mode'
                        ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30"
                        : "bg-secondary text-secondary-foreground"
                    )}>
                      {userRbacRole?.code === 'god_mode' ? '\u2605 GOD MODE' : userRbacRole?.name}
                    </span>
                  )}
                  
                  {/* Settings Icon */}
                  {canAccessSettings && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => navigate('/admin')}
                      className={cn(
                        location.pathname === '/admin' && 'bg-accent text-accent-foreground'
                      )}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                  )}
                  
                  <Button variant="ghost" size="icon" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </header>
          <nav className="md:hidden border-b border-border bg-card px-4 py-2 flex gap-1 overflow-x-auto">
            {topNavAreas.map((area) => {
              const Icon = area.icon;
              return (
                <Button
                  key={area.id}
                  variant={activeArea === area.id ? 'default' : 'ghost'}
                  size="sm"
                  className={cn(
                    'gap-2 flex-shrink-0 text-xs',
                    activeArea === area.id && 'bg-primary text-primary-foreground'
                  )}
                  onClick={() => handleAreaClick(area.id)}
                >
                  <Icon className="h-4 w-4" />
                  {area.label}
                </Button>
              );
            })}
          </nav>

          {/* Main Content */}
          <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6">
            {children}
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
