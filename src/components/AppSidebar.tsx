import { useLocation, useSearchParams } from 'react-router-dom';
import { CreditCard } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import {
  Users,
  FileSpreadsheet,
  Building2,
  FolderKanban,
  GanttChart,
  ClipboardList,
  Clock,
  Upload,
  LayoutDashboard,
  DollarSign,
  FileCheck,
  Calculator,
  Package,
  Layers,
  HardHat,
  Truck,
  Fuel,
  Wrench,
  Cog,
  PencilRuler,
  BarChart2,
  CalendarClock,
  FileText,
  Eye,
  Percent,
  ChevronDown,
  Shield,
  Home,
  ArrowLeftRight,
  Tags,
  BarChart3,
  MessageSquare,
  Bot,
  Archive,
  ScrollText,
  Settings,
} from 'lucide-react';

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import logoConcept from '@/assets/logo-concept.png';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { NavigationArea } from './Layout';

type NavItem = {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: ('admin' | 'rh' | 'financeiro' | 'super_admin')[];
  /** Permission key do RBAC — quando definida, tem prioridade sobre roles */
  permission?: string;
};

type AreaConfig = {
  label: string;
  items: NavItem[];
};

// Sidebar items organized by area (com permission keys RBAC)
const areaNavItems: Record<NavigationArea, AreaConfig> = {
  home: {
    label: 'Home',
    items: [
      { title: 'Home', url: '/home', icon: Home },
    ],
  },
  recursos: {
    label: 'Recursos',
    items: [
      { title: 'Colaboradores', url: '/collaborators', icon: Users, permission: 'recursos.colaboradores.visualizar' },
      { title: 'Custos de Pessoal', url: '/recursos/custos', icon: DollarSign, permission: 'recursos.custos_pessoal.visualizar', roles: ['admin', 'rh', 'financeiro', 'super_admin'] },
      { title: 'Importar Colaboradores', url: '/import', icon: FileSpreadsheet, permission: 'recursos.importacao.importar', roles: ['admin', 'rh'] },
    ],
  },
  projetos: {
    label: 'Projetos',
    items: [
      { title: 'Clientes', url: '/empresas', icon: Building2, permission: 'projetos.clientes.visualizar' },
      { title: 'Projetos', url: '/projetos', icon: FolderKanban, permission: 'projetos.projeto.visualizar' },
      { title: 'Aprovações', url: '/aprovacoes-projetos', icon: FileCheck, permission: 'projetos.aprovacoes.aprovar', roles: ['admin'] },
      { title: 'Planejamento', url: '/planejamento', icon: GanttChart, permission: 'projetos.planejamento.visualizar' },
      { title: 'Apontamento Diário', url: '/apontamento-diario', icon: Clock, permission: 'projetos.apontamento_diario.visualizar', roles: ['admin', 'rh', 'super_admin'] },
      { title: 'Apontamentos', url: '/apontamentos', icon: ClipboardList, permission: 'projetos.apontamentos.visualizar' },
      { title: 'Importar Apontamentos', url: '/import-apontamentos', icon: Upload, permission: 'projetos.import_apontamentos.importar', roles: ['admin', 'rh'] },
    ],
  },
  relatorios: {
    label: 'Relatórios',
    items: [
      { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, permission: 'relatorios.dashboard.visualizar' },
      { title: 'Rentabilidade', url: '/rentabilidade', icon: DollarSign, permission: 'relatorios.rentabilidade.visualizar' },
      { title: 'Custos & Margem', url: '/custos-projeto', icon: DollarSign, permission: 'relatorios.custos_margem.visualizar' },
    ],
  },
  financeiro: {
    label: 'Financeiro',
    items: [
      { title: 'Conciliação', url: '/financeiro/conciliacao', icon: ArrowLeftRight, permission: 'financeiro.conciliacao.visualizar' },
      { title: 'Cartão de Crédito', url: '/financeiro/cartao-de-credito', icon: CreditCard, permission: 'financeiro.cartao_credito.visualizar' },
      { title: 'Categorias', url: '/financeiro/categorias', icon: Tags, permission: 'financeiro.categorias.visualizar' },
      { title: 'DRE', url: '/financeiro/dre', icon: BarChart3, permission: 'financeiro.dre.visualizar' },
      { title: 'Mapeamento Omie', url: '/financeiro/mapeamento-categorias', icon: ArrowLeftRight, permission: 'financeiro.mapeamento.visualizar' },
    ],
  },
  frotas: {
    label: 'Gestão de Frotas',
    items: [
      { title: 'Dashboard Frotas', url: '/frotas', icon: LayoutDashboard, permission: 'frotas.dashboard_frotas.visualizar' },
      { title: 'Veículos', url: '/frotas/veiculos', icon: Truck, permission: 'frotas.veiculos.visualizar' },
      { title: 'KM Rodado', url: '/frotas/km', icon: GanttChart, permission: 'frotas.km.visualizar' },
      { title: 'Abastecimentos', url: '/frotas/abastecimentos', icon: Fuel, permission: 'frotas.abastecimentos.visualizar' },
      { title: 'Manutenção', url: '/frotas/manutencao', icon: Wrench, permission: 'frotas.manutencao.visualizar' },
      { title: 'Custos', url: '/frotas/custos', icon: DollarSign, permission: 'frotas.custos_frota.visualizar' },
      { title: 'Relatórios', url: '/frotas/relatorios', icon: BarChart3, permission: 'frotas.relatorios_frota.visualizar' },
    ],
  },
  orcamentos: {
    label: 'Orçamentos',
    items: [], // Will be handled specially
  },
  ailab: {
    label: 'AI Lab',
    items: [
      { title: 'Projetos IA', url: '/ai-lab', icon: MessageSquare, permission: 'ailab.projetos_ia.visualizar' },
      { title: 'Agentes', url: '/ai-lab/agents', icon: Bot, permission: 'ailab.agentes.visualizar' },
      { title: 'Templates', url: '/ai-lab/templates', icon: FileText, permission: 'ailab.templates.visualizar' },
      { title: 'Artefatos', url: '/ai-lab/artifacts', icon: Archive },
      { title: 'Analytics', url: '/ai-lab/analytics', icon: BarChart3 },
      { title: 'Logs', url: '/ai-lab/logs', icon: ScrollText },
      { title: 'Configurações', url: '/ai-lab/settings', icon: Settings, permission: 'ailab.configuracoes_ia.configurar' },
    ],
  },
};

// Budget sections navigation
const budgetSectionNavItems: NavItem[] = [
  { title: 'Visão Geral', url: '', icon: Eye },
  { title: 'Parâmetros', url: '/parametros', icon: Cog },
  { title: 'Estrutura WBS', url: '/estrutura', icon: Layers },
  { title: 'Materiais', url: '/materiais', icon: Package },
  { title: 'Mão de Obra', url: '/mao-de-obra', icon: HardHat },
  { title: 'Mobilização', url: '/mobilizacao', icon: Truck },
  { title: 'Canteiro', url: '/canteiro', icon: Wrench },
  { title: 'Equipamentos', url: '/equipamentos', icon: PencilRuler },
  { title: 'Engenharia', url: '/engenharia', icon: PencilRuler },
  { title: 'Histograma', url: '/histograma', icon: BarChart2 },
  { title: 'Cronograma', url: '/cronograma', icon: CalendarClock },
  { title: 'Resumo', url: '/resumo', icon: DollarSign },
  { title: 'Documentos', url: '/documentos', icon: FileText },
];

// Global bases navigation items
const basesGlobaisNavItems: NavItem[] = [
  { title: 'Materiais', url: '/orcamentos/bases/materiais', icon: Package },
  { title: 'Templates WBS', url: '/orcamentos/bases/wbs-templates', icon: Layers },
  { title: 'Funções MO', url: '/orcamentos/bases/mo-funcoes', icon: HardHat },
  { title: 'Incidências MO', url: '/orcamentos/bases/incidencias-mo', icon: Shield },
  { title: 'Equipamentos', url: '/orcamentos/bases/equipamentos', icon: PencilRuler },
  { title: 'Indiretos', url: '/orcamentos/bases/indiretos', icon: Truck },
  { title: 'Impostos', url: '/orcamentos/bases/impostos', icon: Calculator },
  { title: 'Markup', url: '/orcamentos/bases/markup', icon: Percent },
];

interface AppSidebarProps {
  activeArea: NavigationArea;
}

export function AppSidebar({ activeArea }: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { hasRole } = useAuth();
  const { can } = usePermissions();

  // Extract budget ID from URL if present
  const budgetMatch = location.pathname.match(/^\/orcamentos\/([a-f0-9-]+)/);
  const budgetId = budgetMatch ? budgetMatch[1] : null;
  
  // Check if we're in Bases Globais context
  const isBasesGlobais = location.pathname.startsWith('/orcamentos/bases');
  const isOrcamentosArea = activeArea === 'orcamentos';

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const isBudgetSectionActive = (sectionUrl: string) => {
    if (!budgetId) return false;
    const fullPath = `/orcamentos/${budgetId}${sectionUrl}`;
    if (sectionUrl === '') {
      return location.pathname === `/orcamentos/${budgetId}`;
    }
    return location.pathname === fullPath;
  };

  // Build URL for budget sections preserving revision query param
  const getBudgetSectionUrl = (sectionUrl: string) => {
    if (!budgetId) return '#';
    const revParam = searchParams.get('rev');
    const baseUrl = `/orcamentos/${budgetId}${sectionUrl}`;
    return revParam ? `${baseUrl}?rev=${revParam}` : baseUrl;
  };

  // For Orçamentos area, render custom layout with all sections
  if (isOrcamentosArea) {
    return (
      <Sidebar collapsible="icon">
        <SidebarHeader className="flex items-center justify-center px-3 py-4">
          <div className="transition-all duration-200">
            {collapsed ? (
              <img src={logoConcept} alt="Concept" className="h-8 w-8 object-contain" />
            ) : (
              <img src={logoConcept} alt="Concept" className="h-8 w-auto" />
            )}
          </div>
        </SidebarHeader>
        <SidebarContent className="pt-4">
          {/* Main navigation */}
          <SidebarGroup>
            <SidebarGroupLabel>Navegação</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === '/orcamentos' && !isBasesGlobais}
                    tooltip="Lista de Orçamentos"
                  >
                    <NavLink
                      to="/orcamentos"
                      className="flex items-center gap-2"
                      activeClassName="bg-accent text-accent-foreground"
                    >
                      <Calculator className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>Lista de Orçamentos</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Bases Globais - Collapsible */}
          <SidebarGroup>
            <Collapsible defaultOpen={isBasesGlobais}>
              <CollapsibleTrigger className="w-full">
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded px-2 py-1">
                  <span>Bases Globais</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {basesGlobaisNavItems.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <SidebarMenuButton
                          asChild
                          isActive={isActive(item.url)}
                          tooltip={item.title}
                        >
                          <NavLink
                            to={item.url}
                            className="flex items-center gap-2"
                            activeClassName="bg-accent text-accent-foreground"
                          >
                            <item.icon className="h-4 w-4 shrink-0" />
                            {!collapsed && <span>{item.title}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>

          {/* Budget Sections - Collapsible */}
          <SidebarGroup>
            <Collapsible defaultOpen={!!budgetId}>
              <CollapsibleTrigger className="w-full">
                <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded px-2 py-1">
                  <span className="flex items-center gap-2">
                    Seções do Orçamento
                    {!budgetId && (
                      <span className="text-[10px] text-muted-foreground">(selecione)</span>
                    )}
                  </span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </SidebarGroupLabel>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {budgetSectionNavItems.map((item) => {
                      const isDisabled = !budgetId;
                      const itemUrl = getBudgetSectionUrl(item.url);
                      
                      return (
                        <SidebarMenuItem key={item.url || 'index'}>
                          <SidebarMenuButton
                            asChild={!isDisabled}
                            isActive={isBudgetSectionActive(item.url)}
                            tooltip={isDisabled ? 'Selecione um orçamento' : item.title}
                            disabled={isDisabled}
                          >
                            {isDisabled ? (
                              <span className="flex items-center gap-2 opacity-40 cursor-not-allowed">
                                <item.icon className="h-4 w-4 shrink-0" />
                                {!collapsed && <span>{item.title}</span>}
                              </span>
                            ) : (
                              <NavLink
                                to={itemUrl}
                                className="flex items-center gap-2"
                                activeClassName="bg-accent text-accent-foreground"
                              >
                                <item.icon className="h-4 w-4 shrink-0" />
                                {!collapsed && <span>{item.title}</span>}
                              </NavLink>
                            )}
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </Collapsible>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  }

  // Standard sidebar for other areas
  const currentAreaConfig = areaNavItems[activeArea];
  // Filtro dual: RBAC tem prioridade, fallback para roles antigo
  const visibleItems = currentAreaConfig.items.filter((item) => {
    // Se tem permission definida, usa RBAC
    if (item.permission) {
      return can(item.permission);
    }
    // Fallback para sistema antigo (retrocompat durante migração)
    return !item.roles || item.roles.some((r) => hasRole(r));
  });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex items-center justify-center px-3 py-4">
        <div className="transition-all duration-200">
          {collapsed ? (
            <img src={logoConcept} alt="Concept" className="h-8 w-8 object-contain" />
          ) : (
            <img src={logoConcept} alt="Concept" className="h-8 w-auto" />
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <SidebarGroup>
          <SidebarGroupLabel>{currentAreaConfig.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {visibleItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.url)}
                    tooltip={item.title}
                  >
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-2"
                      activeClassName="bg-accent text-accent-foreground"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
