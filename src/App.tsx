import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import Collaborators from "./pages/Collaborators";
import ImportCSV from "./pages/ImportCSV";
import ImportApontamentos from "./pages/ImportApontamentos";
import ApontamentosConsolidado from "./pages/ApontamentosConsolidado";
import Admin from "./pages/Admin";
import CollaboratorCosts from "./pages/CollaboratorCosts";
import Empresas from "./pages/Empresas";
import Projetos from "./pages/Projetos";
import Planejamento from "./pages/Planejamento";
import CollaboratorDefaults from "./pages/CollaboratorDefaults";
import CustosProjeto from "./pages/CustosProjeto";
import AprovacoesProjetos from "./pages/AprovacoesProjetos";
import CustosPessoal from "./pages/CustosPessoal";
import Rentabilidade from "./pages/Rentabilidade";
import RentabilidadeProjeto from "./pages/RentabilidadeProjeto";
import MapeamentoOmie from "./pages/MapeamentoOmie";
import ReceitasConferencia from "./pages/ReceitasConferencia";
import OrcamentosList from "./pages/orcamentos/OrcamentosList";
import OrcamentoDetail from "./pages/orcamentos/OrcamentoDetail";
import VisaoGeral from "./pages/orcamentos/VisaoGeral";
import Materiais from "./pages/orcamentos/Materiais";
import MaoDeObra from "./pages/orcamentos/MaoDeObra";
import Parametros from "./pages/orcamentos/Parametros";
import Mobilizacao from "./pages/orcamentos/Mobilizacao";
import Canteiro from "./pages/orcamentos/Canteiro";
import Equipamentos from "./pages/orcamentos/Equipamentos";
import Engenharia from "./pages/orcamentos/Engenharia";
import Estrutura from "./pages/orcamentos/Estrutura";
import Histograma from "./pages/orcamentos/Histograma";
import Cronograma from "./pages/orcamentos/Cronograma";
import ResumoPrecos from "./pages/orcamentos/ResumoPrecos";
import Documentos from "./pages/orcamentos/Documentos";
import AlimentacaoIndustrial from "./pages/orcamentos/AlimentacaoIndustrial";
import ApontamentoDiario from "./pages/ApontamentoDiario";
import Conciliacao from "./pages/Conciliacao";
import CartaoCredito from "./pages/financeiro/CartaoCredito";
import FinanceiroCategorias from "./pages/FinanceiroCategorias";
import FinanceiroDRE from "./pages/FinanceiroDRE";
import MapeamentoCategorias from "./pages/MapeamentoCategorias";
// Global bases pages
import BasesGlobais from "./pages/orcamentos/BasesGlobais";
import BasesGlobaisLayout from "./pages/orcamentos/BasesGlobaisLayout";
import CatalogoMateriais from "./pages/orcamentos/bases/CatalogoMateriais";
import WbsTemplates from "./pages/orcamentos/bases/WbsTemplates";
import CatalogoMaoDeObraFuncoes from "./pages/orcamentos/bases/CatalogoMaoDeObraFuncoesV2";
import CatalogoEquipamentos from "./pages/orcamentos/bases/CatalogoEquipamentos";
import IncidenciasMO from "./pages/orcamentos/bases/IncidenciasMO";
import CatalogoImpostos from "./pages/orcamentos/bases/CatalogoImpostos";
import CatalogoMarkup from "./pages/orcamentos/bases/CatalogoMarkup";
import NotFound from "./pages/NotFound";
import AILabDashboard from "./pages/ai-lab/AILabDashboard";
import AILabChat from "./pages/ai-lab/AILabChat";
import AILabAgents from "./pages/ai-lab/AILabAgents";
import AgentEditor from "./pages/ai-lab/AgentEditor";
import AILabTemplates from "./pages/ai-lab/AILabTemplates";
import AILabSettings from "./pages/ai-lab/AILabSettings";
import AILabPlaceholder from "./pages/ai-lab/AILabPlaceholder";
import FrotasDashboard from "./pages/frotas/FrotasDashboard";
import Veiculos from "./pages/frotas/Veiculos";
import KmRodado from "./pages/frotas/KmRodado";
import Abastecimentos from "./pages/frotas/Abastecimentos";
import Manutencao from "./pages/frotas/Manutencao";
import FrotasCustos from "./pages/frotas/FrotasCustos";
import FrotasRelatorios from "./pages/frotas/FrotasRelatorios";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/collaborators" element={<Collaborators />} />
            <Route path="/empresas" element={<Empresas />} />
            <Route path="/projetos" element={<Projetos />} />
            <Route path="/import" element={<ImportCSV />} />
            <Route path="/import-apontamentos" element={<ImportApontamentos />} />
            <Route path="/apontamentos" element={<ApontamentosConsolidado />} />
            <Route path="/apontamento-diario" element={<ApontamentoDiario />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/aprovacoes-projetos" element={<AprovacoesProjetos />} />
            <Route path="/collaborators/:id/costs" element={<CollaboratorCosts />} />
            <Route path="/collaborators/:id/defaults" element={<CollaboratorDefaults />} />
            <Route path="/planejamento" element={<Planejamento />} />
            <Route path="/custos-projeto" element={<CustosProjeto />} />
            <Route path="/recursos/custos" element={<CustosPessoal />} />
            <Route path="/rentabilidade" element={<Rentabilidade />} />
            <Route path="/rentabilidade/mapeamento" element={<MapeamentoOmie />} />
            <Route path="/rentabilidade/receitas" element={<ReceitasConferencia />} />
            <Route path="/rentabilidade/:id" element={<RentabilidadeProjeto />} />
            <Route path="/financeiro/conciliacao" element={<Conciliacao />} />
            <Route path="/financeiro/cartao-de-credito" element={<CartaoCredito />} />
            <Route path="/financeiro/categorias" element={<FinanceiroCategorias />} />
            <Route path="/financeiro/dre" element={<FinanceiroDRE />} />
            <Route path="/financeiro/mapeamento-categorias" element={<MapeamentoCategorias />} />
            <Route path="/financeiro" element={<Navigate to="/financeiro/conciliacao" replace />} />
            <Route path="/conciliacao" element={<Navigate to="/financeiro/conciliacao" replace />} />
            <Route path="/orcamentos" element={<OrcamentosList />} />
            {/* Redirects for common wrong routes */}
            <Route path="/orcamentos/ba/*" element={<Navigate to="/orcamentos/bases" replace />} />
            <Route path="/orcamentos/base/*" element={<Navigate to="/orcamentos/bases" replace />} />
            {/* Global bases routes - with contextual sidebar */}
            <Route path="/orcamentos/bases" element={<BasesGlobaisLayout />}>
              <Route index element={<BasesGlobais />} />
              <Route path="materiais" element={<CatalogoMateriais />} />
              <Route path="wbs-templates" element={<WbsTemplates />} />
              <Route path="mo-funcoes" element={<CatalogoMaoDeObraFuncoes />} />
              <Route path="mo-parametros" element={<Navigate to="/orcamentos/bases/incidencias-mo" replace />} />
              <Route path="equipamentos" element={<CatalogoEquipamentos />} />
              <Route path="incidencias-mo" element={<IncidenciasMO />} />
              <Route path="impostos" element={<CatalogoImpostos />} />
              <Route path="markup" element={<CatalogoMarkup />} />
            </Route>
            {/* Budget detail routes */}
            <Route path="/orcamentos/:id" element={<OrcamentoDetail />}>
              <Route index element={<VisaoGeral />} />
              <Route path="parametros" element={<Parametros />} />
              <Route path="estrutura" element={<Estrutura />} />
              <Route path="materiais" element={<Materiais />} />
              <Route path="alimentacao-industrial" element={<AlimentacaoIndustrial />} />
              <Route path="mao-de-obra" element={<MaoDeObra />} />
              <Route path="mobilizacao" element={<Mobilizacao />} />
              <Route path="canteiro" element={<Canteiro />} />
              <Route path="equipamentos" element={<Equipamentos />} />
              <Route path="engenharia" element={<Engenharia />} />
              <Route path="histograma" element={<Histograma />} />
              <Route path="cronograma" element={<Cronograma />} />
              <Route path="resumo" element={<ResumoPrecos />} />
              <Route path="documentos" element={<Documentos />} />
            </Route>
            {/* Frotas routes */}
            <Route path="/frotas" element={<FrotasDashboard />} />
            <Route path="/frotas/veiculos" element={<Veiculos />} />
            <Route path="/frotas/km" element={<KmRodado />} />
            <Route path="/frotas/abastecimentos" element={<Abastecimentos />} />
            <Route path="/frotas/manutencao" element={<Manutencao />} />
            <Route path="/frotas/custos" element={<FrotasCustos />} />
            <Route path="/frotas/relatorios" element={<FrotasRelatorios />} />
            {/* AI Lab routes */}
            <Route path="/ai-lab" element={<AILabDashboard />} />
            <Route path="/ai-lab/chat/:threadId" element={<AILabChat />} />
            <Route path="/ai-lab/agents" element={<AILabAgents />} />
            <Route path="/ai-lab/agents/new" element={<AgentEditor />} />
            <Route path="/ai-lab/agents/:id/edit" element={<AgentEditor />} />
            <Route path="/ai-lab/templates" element={<AILabTemplates />} />
            <Route path="/ai-lab/artifacts" element={<AILabPlaceholder page="artifacts" />} />
            <Route path="/ai-lab/analytics" element={<AILabPlaceholder page="analytics" />} />
            <Route path="/ai-lab/logs" element={<AILabPlaceholder page="logs" />} />
            <Route path="/ai-lab/settings" element={<AILabSettings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
