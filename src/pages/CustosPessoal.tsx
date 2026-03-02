import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import { formatCPF } from '@/lib/cpf';
import { CustoForm } from '@/components/CustoForm';
import { CustoColaborador, calcularCustos } from '@/calculations/custos-pessoal';
import { 
  Search, 
  Download, 
  DollarSign, 
  History, 
  Pencil,
  Wallet,
  Receipt,
  Calculator,
  UserCheck
} from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

interface Collaborator {
  id: string;
  full_name: string;
  cpf: string;
  position: string | null;
  department: string | null;
  status: string;
}

interface CustoWithColaborador extends CustoColaborador {
  collaborators: Collaborator;
}

interface ColaboradorComCusto {
  colaborador: Collaborator;
  custo: CustoColaborador | null;
  custoCalculado: {
    beneficios: number;
    adicional_periculosidade: number;
    custo_mensal_total: number;
    custo_hora: number;
    encargos: number;
    provisoes: number;
  } | null;
}

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Default hours per month
const HORAS_MENSAIS_PADRAO = 220;

export default function CustosPessoal() {
  void useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading, hasRole } = useAuth();

  // Check access
  const canAccess = hasRole('super_admin') || hasRole('admin') || hasRole('rh') || hasRole('financeiro');
  const canEdit = hasRole('super_admin') || hasRole('admin') || hasRole('rh');
  const isFinanceiro = hasRole('financeiro') && !hasRole('super_admin') && !hasRole('admin') && !hasRole('rh');

  // Filters state
  const currentDate = new Date();
  const [periodoMes, setPeriodoMes] = useState(() => format(currentDate, 'yyyy-MM'));
  const [statusFilter, setStatusFilter] = useState<string>('ativo');
  const [departamentoFilter, setDepartamentoFilter] = useState<string>('all');
  const [cargoFilter, setCargoFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [semCustoFilter, setSemCustoFilter] = useState(() => searchParams.get('sem_custo') === 'true');
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);

  const debouncedSearch = useDebounce(searchTerm, 300);

  // Modal states
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [historicoOpen, setHistoricoOpen] = useState(false);
  const [editFormOpen, setEditFormOpen] = useState(false);
  const [selectedColaborador, setSelectedColaborador] = useState<ColaboradorComCusto | null>(null);
  const [historicoData, setHistoricoData] = useState<CustoColaborador[]>([]);

  // Get reference date from period
  const dataReferencia = useMemo(() => {
    const [ano, mes] = periodoMes.split('-').map(Number);
    return new Date(ano, mes - 1, 1);
  }, [periodoMes]);

  const dataReferenciaStr = format(dataReferencia, 'yyyy-MM-dd');

  // Fetch collaborators
  const { data: colaboradores, isLoading: loadingColaboradores } = useQuery({
    queryKey: ['colaboradores-custos', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('collaborators')
        .select('id, full_name, cpf, position, department, status')
        .order('full_name');

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter as 'ativo' | 'afastado' | 'desligado');
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Collaborator[];
    },
    enabled: !!user && canAccess,
  });

  // Fetch costs for the period
  const { data: custos, isLoading: loadingCustos, refetch: refetchCustos } = useQuery({
    queryKey: ['custos-periodo', dataReferenciaStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('custos_colaborador')
        .select('*, collaborators!inner(id, full_name, cpf, position, department, status)')
        .lte('inicio_vigencia', dataReferenciaStr)
        .or(`fim_vigencia.is.null,fim_vigencia.gte.${dataReferenciaStr}`)
        .order('inicio_vigencia', { ascending: false });

      if (error) throw error;
      return data as CustoWithColaborador[];
    },
    enabled: !!user && canAccess,
  });

  // Get unique departments and positions
  const { departamentos, cargos } = useMemo(() => {
    if (!colaboradores) return { departamentos: [], cargos: [] };
    
    const depts = new Set<string>();
    const positions = new Set<string>();
    
    colaboradores.forEach(c => {
      if (c.department) depts.add(c.department);
      if (c.position) positions.add(c.position);
    });
    
    return {
      departamentos: Array.from(depts).sort(),
      cargos: Array.from(positions).sort(),
    };
  }, [colaboradores]);

  // Process data: merge collaborators with their costs
  const dadosProcessados = useMemo((): ColaboradorComCusto[] => {
    if (!colaboradores) return [];

    // Create a map of colaborador_id -> most recent cost for the period
    const custoPorColaborador = new Map<string, CustoColaborador>();
    
    if (custos) {
      custos.forEach(c => {
        const existing = custoPorColaborador.get(c.colaborador_id);
        if (!existing || c.inicio_vigencia > existing.inicio_vigencia) {
          custoPorColaborador.set(c.colaborador_id, c);
        }
      });
    }

    return colaboradores.map(colaborador => {
      const custo = custoPorColaborador.get(colaborador.id) || null;
      
      let custoCalculado = null;
      if (custo) {
        const calc = calcularCustos(custo);
        // For now, encargos and provisoes are simplified (could be fetched from encargos_modelo_clt)
        const encargos = custo.classificacao === 'PJ' ? 0 : calc.custo_mensal_total * 0.3;
        const provisoes = custo.classificacao === 'PJ' ? 0 : calc.custo_mensal_total * 0.2;
        
        custoCalculado = {
          ...calc,
          encargos,
          provisoes,
        };
      }

      return {
        colaborador,
        custo,
        custoCalculado,
      };
    });
  }, [colaboradores, custos]);

  // Apply filters
  const dadosFiltrados = useMemo(() => {
    let result = dadosProcessados;

    // Filter by sem_custo
    if (semCustoFilter) {
      result = result.filter(d => !d.custo);
    }

    // Filter by departamento
    if (departamentoFilter !== 'all') {
      result = result.filter(d => d.colaborador.department === departamentoFilter);
    }

    // Filter by cargo
    if (cargoFilter !== 'all') {
      result = result.filter(d => d.colaborador.position === cargoFilter);
    }

    // Filter by search term
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      const searchClean = debouncedSearch.replace(/\D/g, '');
      result = result.filter(d => 
        d.colaborador.full_name.toLowerCase().includes(searchLower) ||
        d.colaborador.cpf.includes(searchClean)
      );
    }

    return result;
  }, [dadosProcessados, semCustoFilter, departamentoFilter, cargoFilter, debouncedSearch]);

  // Pagination
  const totalPages = Math.ceil(dadosFiltrados.length / pageSize);
  const dadosPaginados = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return dadosFiltrados.slice(start, start + pageSize);
  }, [dadosFiltrados, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [semCustoFilter, departamentoFilter, cargoFilter, debouncedSearch, periodoMes, statusFilter]);

  // Update URL when sem_custo filter changes
  useEffect(() => {
    if (semCustoFilter) {
      searchParams.set('sem_custo', 'true');
    } else {
      searchParams.delete('sem_custo');
    }
    setSearchParams(searchParams, { replace: true });
  }, [semCustoFilter]);

  // Calculate KPIs
  const kpis = useMemo(() => {
    const dadosComCusto = dadosFiltrados.filter(d => d.custoCalculado);
    
    const custoMensalTotal = dadosComCusto.reduce((acc, d) => acc + (d.custoCalculado?.custo_mensal_total || 0), 0);
    const salarioBase = dadosComCusto.reduce((acc, d) => acc + (d.custo?.salario_base || 0), 0);
    const beneficios = dadosComCusto.reduce((acc, d) => acc + (d.custoCalculado?.beneficios || 0), 0);
    const encargosProvisoes = dadosComCusto.reduce((acc, d) => 
      acc + (d.custoCalculado?.encargos || 0) + (d.custoCalculado?.provisoes || 0), 0
    );
    const qtdColaboradores = dadosFiltrados.length;
    const custoMedio = qtdColaboradores > 0 ? custoMensalTotal / qtdColaboradores : 0;

    return {
      custoMensalTotal,
      salarioBase,
      beneficios,
      encargosProvisoes,
      custoMedio,
    };
  }, [dadosFiltrados]);

  // Handle detail modal
  const handleDetalhe = (item: ColaboradorComCusto) => {
    setSelectedColaborador(item);
    setDetalheOpen(true);
  };

  // Handle history modal
  const handleHistorico = async (item: ColaboradorComCusto) => {
    setSelectedColaborador(item);
    
    const { data, error } = await supabase
      .from('custos_colaborador')
      .select('*')
      .eq('colaborador_id', item.colaborador.id)
      .order('inicio_vigencia', { ascending: false });

    if (!error && data) {
      setHistoricoData(data as CustoColaborador[]);
    }
    setHistoricoOpen(true);
  };

  // Handle edit
  const handleEdit = (item: ColaboradorComCusto) => {
    setSelectedColaborador(item);
    setEditFormOpen(true);
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Nome', 'CPF', 'Cargo', 'Departamento', 'Salário Base', 'Benefícios',
      'Encargos', 'Provisões', 'Custo Mensal Total', 'Custo Hora',
      'Vigência Início', 'Vigência Fim', 'Status'
    ];

    const rows = dadosFiltrados.map(d => [
      d.colaborador.full_name,
      d.colaborador.cpf,
      d.colaborador.position || '',
      d.colaborador.department || '',
      d.custo?.salario_base?.toFixed(2) || '0',
      d.custoCalculado?.beneficios?.toFixed(2) || '0',
      d.custoCalculado?.encargos?.toFixed(2) || '0',
      d.custoCalculado?.provisoes?.toFixed(2) || '0',
      d.custoCalculado?.custo_mensal_total?.toFixed(2) || '0',
      d.custoCalculado?.custo_hora?.toFixed(2) || '0',
      d.custo?.inicio_vigencia || '',
      d.custo?.fim_vigencia || '',
      d.colaborador.status,
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map(row => row.join(';'))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `custos_pessoal_${periodoMes}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string | null) => {
    if (!dateStr) return 'Em aberto';
    const date = parse(dateStr, 'yyyy-MM-dd', new Date());
    return isValid(date) ? format(date, 'dd/MM/yyyy', { locale: ptBR }) : dateStr;
  };

  // Loading state
  if (authLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  // Access denied
  if (!canAccess) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Custos de Pessoal</h1>
            <p className="text-muted-foreground">Visão financeira de salários e custo hora</p>
          </div>
          <Button onClick={handleExportCSV} variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex flex-wrap gap-4 flex-1">
            {/* Período */}
            <div className="w-full sm:w-auto">
              <Input
                type="month"
                value={periodoMes}
                onChange={(e) => setPeriodoMes(e.target.value)}
                className="w-full sm:w-[180px]"
              />
            </div>

            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativo</SelectItem>
                <SelectItem value="afastado">Afastado</SelectItem>
                <SelectItem value="desligado">Desligado</SelectItem>
              </SelectContent>
            </Select>

            {/* Departamento */}
            <Select value={departamentoFilter} onValueChange={setDepartamentoFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Departamentos</SelectItem>
                {departamentos.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Cargo */}
            <Select value={cargoFilter} onValueChange={setCargoFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos Cargos</SelectItem>
                {cargos.map(cargo => (
                  <SelectItem key={cargo} value={cargo}>{cargo}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sem Custo Toggle */}
            <Button
              variant={semCustoFilter ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSemCustoFilter(!semCustoFilter)}
              className="gap-2"
            >
              Sem Custo
              {semCustoFilter && <span>✓</span>}
            </Button>
          </div>

          {/* Search */}
          <div className="relative w-full lg:w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar nome ou CPF..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Wallet className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Custo Mensal Total</p>
                  <p className="text-lg font-bold">{formatCurrency(kpis.custoMensalTotal)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary/50">
                  <DollarSign className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Salário Base</p>
                  <p className="text-lg font-bold">{formatCurrency(kpis.salarioBase)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/50">
                  <Receipt className="h-5 w-5 text-accent-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Benefícios</p>
                  <p className="text-lg font-bold">{formatCurrency(kpis.beneficios)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <Calculator className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Encargos + Provisões</p>
                  <p className="text-lg font-bold">{formatCurrency(kpis.encargosProvisoes)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Custo Médio</p>
                  <p className="text-lg font-bold">{formatCurrency(kpis.custoMedio)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loadingColaboradores || loadingCustos ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>CPF</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead className="text-right">Salário Base</TableHead>
                        <TableHead className="text-right">Benefícios</TableHead>
                        <TableHead className="text-right">Encargos</TableHead>
                        <TableHead className="text-right">Provisões</TableHead>
                        <TableHead className="text-right">Custo Mensal</TableHead>
                        <TableHead className="text-right">Custo/Hora</TableHead>
                        <TableHead>Vigência</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dadosPaginados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                            Nenhum colaborador encontrado com os filtros aplicados
                          </TableCell>
                        </TableRow>
                      ) : (
                        dadosPaginados.map((item) => (
                          <TableRow key={item.colaborador.id}>
                            <TableCell className="font-medium">{item.colaborador.full_name}</TableCell>
                            <TableCell>{formatCPF(item.colaborador.cpf)}</TableCell>
                            <TableCell>{item.colaborador.position || '—'}</TableCell>
                            <TableCell>{item.colaborador.department || '—'}</TableCell>
                            <TableCell className="text-right">
                              {item.custo ? formatCurrency(item.custo.salario_base) : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.custoCalculado ? formatCurrency(item.custoCalculado.beneficios) : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.custoCalculado ? formatCurrency(item.custoCalculado.encargos) : '—'}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.custoCalculado ? formatCurrency(item.custoCalculado.provisoes) : '—'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.custoCalculado ? formatCurrency(item.custoCalculado.custo_mensal_total) : '—'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {item.custoCalculado ? formatCurrency(item.custoCalculado.custo_hora) : '—'}
                            </TableCell>
                            <TableCell>
                              {item.custo ? (
                                <span className="text-xs">
                                  {formatDateDisplay(item.custo.inicio_vigencia)} - {formatDateDisplay(item.custo.fim_vigencia)}
                                </span>
                              ) : (
                                <Badge variant="destructive" className="text-xs">Sem custo vigente</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant={item.colaborador.status === 'ativo' ? 'default' : 'outline'}>
                                {item.colaborador.status === 'ativo' ? 'Ativo' : 
                                 item.colaborador.status === 'afastado' ? 'Afastado' : 'Desligado'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDetalhe(item)}
                                  title="Detalhes"
                                >
                                  <DollarSign className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleHistorico(item)}
                                  title="Histórico"
                                >
                                  <History className="h-4 w-4" />
                                </Button>
                                {canEdit && !isFinanceiro && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(item)}
                                    title="Editar custo"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{dadosFiltrados.length} colaborador(es)</span>
                    <Select value={pageSize.toString()} onValueChange={(v) => setPageSize(Number(v))}>
                      <SelectTrigger className="w-[100px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25 / pág</SelectItem>
                        <SelectItem value="50">50 / pág</SelectItem>
                        <SelectItem value="100">100 / pág</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        Anterior
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {currentPage} / {totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Próxima
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalhe Modal */}
      <Dialog open={detalheOpen} onOpenChange={setDetalheOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhe de Custo</DialogTitle>
          </DialogHeader>
          {selectedColaborador && (
            <div className="space-y-4">
              <div className="pb-4 border-b">
                <p className="font-semibold">{selectedColaborador.colaborador.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  CPF: {formatCPF(selectedColaborador.colaborador.cpf)}
                </p>
              </div>
              
              {selectedColaborador.custo && selectedColaborador.custoCalculado ? (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Classificação</p>
                    <p className="font-medium">{selectedColaborador.custo.classificacao}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Salário Base</p>
                    <p className="font-medium">{formatCurrency(selectedColaborador.custo.salario_base)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Benefícios</p>
                    <p className="font-medium">{formatCurrency(selectedColaborador.custoCalculado.beneficios)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Periculosidade</p>
                    <p className="font-medium">
                      {selectedColaborador.custo.periculosidade 
                        ? formatCurrency(selectedColaborador.custoCalculado.adicional_periculosidade)
                        : 'Não'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Encargos</p>
                    <p className="font-medium">{formatCurrency(selectedColaborador.custoCalculado.encargos)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Provisões</p>
                    <p className="font-medium">{formatCurrency(selectedColaborador.custoCalculado.provisoes)}</p>
                  </div>
                  <div className="col-span-2 pt-4 border-t">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Custo Mensal Total</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(selectedColaborador.custoCalculado.custo_mensal_total)}
                      </span>
                    </div>
                    <div className="flex justify-between mt-2">
                      <span className="text-muted-foreground">Custo/Hora ({HORAS_MENSAIS_PADRAO}h)</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(selectedColaborador.custoCalculado.custo_hora)}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-2 pt-4 border-t">
                    <p className="text-muted-foreground">Vigência</p>
                    <p className="font-medium">
                      {formatDateDisplay(selectedColaborador.custo.inicio_vigencia)} - {formatDateDisplay(selectedColaborador.custo.fim_vigencia)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Badge variant="destructive" className="mb-2">Sem custo vigente</Badge>
                  <p className="text-sm text-muted-foreground">
                    Este colaborador não possui custo cadastrado para o período selecionado.
                  </p>
                  {canEdit && !isFinanceiro && (
                    <Button 
                      className="mt-4" 
                      onClick={() => {
                        setDetalheOpen(false);
                        handleEdit(selectedColaborador);
                      }}
                    >
                      Cadastrar Custo
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Histórico Modal */}
      <Dialog open={historicoOpen} onOpenChange={setHistoricoOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Custos</DialogTitle>
          </DialogHeader>
          {selectedColaborador && (
            <div className="space-y-4">
              <div className="pb-4 border-b">
                <p className="font-semibold">{selectedColaborador.colaborador.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  CPF: {formatCPF(selectedColaborador.colaborador.cpf)}
                </p>
              </div>
              
              {historicoData.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum histórico de custo encontrado
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Início</TableHead>
                      <TableHead>Fim</TableHead>
                      <TableHead>Classif.</TableHead>
                      <TableHead className="text-right">Salário</TableHead>
                      <TableHead className="text-right">Custo/Hora</TableHead>
                      <TableHead>Motivo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historicoData.map((custo) => {
                      const calc = calcularCustos(custo);
                      return (
                        <TableRow key={custo.id}>
                          <TableCell>{formatDateDisplay(custo.inicio_vigencia)}</TableCell>
                          <TableCell>{formatDateDisplay(custo.fim_vigencia)}</TableCell>
                          <TableCell>
                            <Badge variant={custo.classificacao === 'CLT' ? 'default' : 'secondary'}>
                              {custo.classificacao}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(custo.salario_base)}</TableCell>
                          <TableCell className="text-right">{formatCurrency(calc.custo_hora)}</TableCell>
                          <TableCell className="max-w-[150px] truncate" title={custo.motivo_alteracao}>
                            {custo.motivo_alteracao || '—'}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Form */}
      {selectedColaborador && (
        <CustoForm
          open={editFormOpen}
          onOpenChange={setEditFormOpen}
          colaboradorId={selectedColaborador.colaborador.id}
          custo={selectedColaborador.custo}
          onSuccess={() => {
            refetchCustos();
            setEditFormOpen(false);
          }}
          existingCustos={historicoData}
        />
      )}
    </Layout>
  );
}
