import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { validateCPF, cleanCPF } from '@/lib/cpf';
import { Upload, FileText, CheckCircle2, XCircle, AlertCircle, Download } from 'lucide-react';
import { useEffect } from 'react';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PreviewRow {
  row: number;
  data: {
    full_name: string;
    cpf: string;
    birth_date: string;
    hire_date: string;
    termination_date: string;
    position: string;
    department: string;
    status: string;
    email: string;
    phone: string;
    equipe: string;
    // Campos opcionais de custo
    classificacao: string;
    salario_base: number | null;
    beneficios: number | null;
    periculosidade: boolean;
  };
  errors: string[];
  valid: boolean;
}

export default function ImportCSV() {
  const navigate = useNavigate();
  const { user, loading, hasRole } = useAuth();
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [imported, setImported] = useState(false);
  const [results, setResults] = useState<{ success: number; errors: number }>({ success: 0, errors: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canAccess = hasRole('admin') || hasRole('rh');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const parseCSV = (text: string): string[][] => {
    const lines = text.split('\n').filter((line) => line.trim());
    return lines.map((line) => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';') && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const parseDate = (value: unknown): string => {
    if (!value) return '';
    
    // Excel date (number)
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value);
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
      }
    }
    
    // Date object
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    
    // String formats
    const str = String(value).trim();
    
    // DD/MM/YYYY
    const dmyMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
      return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
    }
    
    // YYYY-MM-DD
    const ymdMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (ymdMatch) {
      return str;
    }
    
    return str;
  };

  const parseNumber = (val: unknown): number | null => {
    if (val === null || val === undefined || val === '') return null;
    if (typeof val === 'number') return val;
    const str = String(val).replace(/[R$\s.]/g, '').replace(',', '.');
    const num = parseFloat(str);
    return isNaN(num) ? null : num;
  };

  const parseBoolean = (val: unknown): boolean => {
    if (val === null || val === undefined || val === '') return false;
    if (typeof val === 'boolean') return val;
    const str = String(val).toLowerCase().trim();
    return str === 'sim' || str === 's' || str === 'true' || str === '1' || str === 'x';
  };

  const validateRow = (row: Record<string, unknown>, rowNum: number): PreviewRow => {
    const errors: string[] = [];

    const getString = (val: unknown): string => {
      if (val === null || val === undefined) return '';
      return String(val).trim();
    };

    // Parse optional cost fields
    const salarioRaw = row['salario'] || row['salario_base'] || row['salary'];
    const beneficiosRaw = row['beneficios'] || row['benefits'];
    const classificacaoRaw = getString(row['classificacao'] || row['tipo'] || row['classification']);
    const periculosidadeRaw = row['periculosidade'] || row['hazard'];

    const data = {
      full_name: getString(row['nome']) || getString(row['nome_completo']) || getString(row['full_name']) || '',
      cpf: getString(row['cpf']) || '',
      birth_date: parseDate(row['nascimento'] || row['data_nascimento'] || row['birth_date']),
      hire_date: parseDate(row['admissao'] || row['data_admissao'] || row['hire_date']),
      termination_date: parseDate(row['desligamento'] || row['data_desligamento'] || row['termination_date']),
      position: getString(row['cargo']) || getString(row['position']) || '',
      department: getString(row['departamento']) || getString(row['department']) || '',
      status: getString(row['status']) || 'ativo',
      email: getString(row['email']) || '',
      phone: getString(row['telefone']) || getString(row['phone']) || '',
      // Cost fields (optional)
      equipe: getString(row['equipe']) || getString(row['team']) || '',
      classificacao: (() => {
        const classUpper = classificacaoRaw.toUpperCase();
        return classUpper === 'PJ' ? 'PJ' : classUpper === 'TERCEIRO' ? 'TERCEIRO' : classUpper === 'CLT' ? 'CLT' : '';
      })(),
      salario_base: parseNumber(salarioRaw),
      beneficios: parseNumber(beneficiosRaw),
      periculosidade: parseBoolean(periculosidadeRaw),
    };

    if (!data.full_name) {
      errors.push('Nome obrigatório');
    }

    const cleanedCPF = cleanCPF(data.cpf);
    if (!cleanedCPF) {
      errors.push('CPF obrigatório');
    } else if (!validateCPF(cleanedCPF)) {
      errors.push('CPF inválido');
    }
    data.cpf = cleanedCPF;

    if (!data.hire_date) {
      errors.push('Data de admissão obrigatória');
    }

    const validStatus = ['ativo', 'afastado', 'desligado'];
    if (data.status && !validStatus.includes(data.status.toLowerCase())) {
      data.status = 'ativo';
    } else {
      data.status = data.status.toLowerCase();
    }

    // Validate cost fields if salary is provided
    if (data.salario_base !== null && data.salario_base > 0) {
      if (!data.classificacao) {
        data.classificacao = 'CLT'; // Default to CLT if salary provided but no classification
      }
    }

    return {
      row: rowNum,
      data,
      errors,
      valid: errors.length === 0,
    };
  };

  const processXLSX = (data: ArrayBuffer) => {
    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
    
    // Check for 'colaboradores' sheet first, then use first sheet
    let sheetName = 'colaboradores';
    if (!workbook.SheetNames.includes(sheetName)) {
      sheetName = workbook.SheetNames[0];
    }
    
    const worksheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { raw: true });
    
    if (rawData.length === 0) {
      toast.error('A planilha está vazia ou sem dados');
      return;
    }
    
    // Normalize keys to lowercase
    const previewData = rawData.map((row, index) => {
      const normalizedRow: Record<string, unknown> = {};
      Object.keys(row).forEach((key) => {
        normalizedRow[key.toLowerCase().replace(/\s+/g, '_')] = row[key];
      });
      return validateRow(normalizedRow, index + 2);
    });
    
    setPreview(previewData);
    setImported(false);
  };

  const processCSV = (text: string) => {
    const rows = parseCSV(text);

    if (rows.length < 2) {
      toast.error('Arquivo deve conter cabeçalho e pelo menos uma linha de dados');
      return;
    }

    const headers = rows[0].map((h) => h.toLowerCase().replace(/\s+/g, '_'));
    const dataRows = rows.slice(1);

    const previewData = dataRows.map((row, index) => {
      const rowObj: Record<string, unknown> = {};
      headers.forEach((header, i) => {
        rowObj[header] = row[i] || '';
      });
      return validateRow(rowObj, index + 2);
    });

    setPreview(previewData);
    setImported(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isXLSX = file.name.toLowerCase().endsWith('.xlsx') || file.name.toLowerCase().endsWith('.xls');

    if (isXLSX) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const data = event.target?.result as ArrayBuffer;
        processXLSX(data);
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        processCSV(text);
      };
      reader.readAsText(file);
    }
  };

  const downloadXLSXTemplate = () => {
    const templateData = [
      {
        nome: 'João da Silva',
        cpf: '123.456.789-09',
        nascimento: '1990-01-15',
        admissao: '2024-01-01',
        desligamento: '',
        cargo: 'Analista',
        departamento: 'TI',
        equipe: 'Equipe A',
        status: 'ativo',
        email: 'joao@email.com',
        telefone: '11999999999',
        classificacao: 'CLT',
        salario_base: 5000,
        beneficios: 800,
        periculosidade: 'Não',
      },
      {
        nome: 'Maria Souza',
        cpf: '987.654.321-00',
        nascimento: '1985-06-20',
        admissao: '2023-06-01',
        desligamento: '',
        cargo: 'Gerente',
        departamento: 'RH',
        equipe: 'Equipe B',
        status: 'ativo',
        email: 'maria@email.com',
        telefone: '11888888888',
        classificacao: 'PJ',
        salario_base: 12000,
        beneficios: '',
        periculosidade: '',
      },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(templateData);
    
    ws['!cols'] = [
      { wch: 25 }, // nome
      { wch: 16 }, // cpf
      { wch: 12 }, // nascimento
      { wch: 12 }, // admissao
      { wch: 12 }, // desligamento
      { wch: 15 }, // cargo
      { wch: 15 }, // departamento
      { wch: 15 }, // equipe
      { wch: 10 }, // status
      { wch: 25 }, // email
      { wch: 15 }, // telefone
      { wch: 12 }, // classificacao
      { wch: 12 }, // salario_base
      { wch: 12 }, // beneficios
      { wch: 14 }, // periculosidade
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'colaboradores');
    XLSX.writeFile(wb, 'modelo_colaboradores.xlsx');
    toast.success('Modelo XLSX baixado!');
  };

  const handleImport = async () => {
    const validRows = preview.filter((r) => r.valid);
    if (validRows.length === 0) {
      toast.error('Nenhum registro válido para importar');
      return;
    }

    setImporting(true);
    let success = 0;
    let errors = 0;
    let costSuccess = 0;

    for (const row of validRows) {
      // Insert collaborator
      const { data: collaborator, error } = await supabase.from('collaborators').insert({
        full_name: row.data.full_name,
        cpf: row.data.cpf,
        birth_date: row.data.birth_date || null,
        hire_date: row.data.hire_date,
        termination_date: row.data.termination_date || null,
        position: row.data.position || null,
        department: row.data.department || null,
        equipe: row.data.equipe || null,
        status: row.data.status as 'ativo' | 'afastado' | 'desligado',
        email: row.data.email || null,
        phone: row.data.phone || null,
        created_by: user?.id,
        updated_by: user?.id,
      }).select('id').single();

      if (error) {
        errors++;
      } else {
        success++;
        
        // If salary is provided, create cost record
        if (collaborator && row.data.salario_base !== null && row.data.salario_base > 0) {
          const { error: costError } = await supabase.from('custos_colaborador').insert({
            colaborador_id: collaborator.id,
            classificacao: row.data.classificacao || 'CLT',
            salario_base: row.data.salario_base,
            beneficios: row.data.beneficios || 0,
            periculosidade: row.data.periculosidade,
            inicio_vigencia: row.data.hire_date,
            motivo_alteracao: 'Importação inicial',
            observacao: `Importado em lote em ${format(new Date(), 'dd/MM/yyyy', { locale: ptBR })}`,
            created_by: user?.id,
            updated_by: user?.id,
          });
          
          if (!costError) {
            costSuccess++;
          }
        }
      }
    }

    setResults({ success, errors });
    setImported(true);
    setImporting(false);

    if (success > 0) {
      let message = `${success} colaborador(es) importado(s) com sucesso!`;
      if (costSuccess > 0) {
        message += ` ${costSuccess} com custos.`;
      }
      toast.success(message);

      const semCusto = success - costSuccess;
      if (semCusto > 0) {
        toast.warning(`${semCusto} colaboradores importados sem custo cadastrado. Complete em Recursos > Custos de Pessoal > Vigência de Salário.`);
      }
    }
    if (errors > 0) {
      toast.error(`${errors} registro(s) com erro (CPF duplicado?)`);
    }
  };

  const handleReset = () => {
    setPreview([]);
    setImported(false);
    setResults({ success: 0, errors: 0 });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!canAccess) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground text-center max-w-md">
            Você não tem permissão para importar dados.
          </p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Importar CSV</h2>
          <p className="text-muted-foreground">Importe colaboradores a partir de um arquivo CSV</p>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Formato do Arquivo</CardTitle>
            <CardDescription>
              O arquivo CSV deve conter as seguintes colunas (a primeira linha deve ser o cabeçalho):
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Obrigatórias:</strong> nome (ou nome_completo), cpf, admissao (ou data_admissao)</p>
              <p><strong>Opcionais:</strong> nascimento, desligamento, cargo, departamento, equipe, status, email, telefone</p>
              <p><strong>Custos (opcional):</strong> classificacao (CLT/PJ/TERCEIRO), salario_base (ou salario), beneficios, periculosidade (Sim/Não)</p>
              <p><strong>Status válidos:</strong> ativo, afastado, desligado (padrão: ativo)</p>
            </div>
          </CardContent>
        </Card>

        {/* Upload */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-lg p-8">
              <Upload className="h-10 w-10 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-4">
                Selecione um arquivo CSV ou Excel (.xlsx)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.txt,.xlsx,.xls"
                onChange={handleFileChange}
                className="hidden"
                id="csv-upload"
              />
              <div className="flex gap-2">
                <Button asChild variant="outline">
                  <label htmlFor="csv-upload" className="cursor-pointer">
                    <FileText className="h-4 w-4 mr-2" />
                    Selecionar Arquivo
                  </label>
                </Button>
                <Button variant="outline" onClick={downloadXLSXTemplate}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar modelo XLSX
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        {preview.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg">Preview</CardTitle>
                <CardDescription>
                  {preview.filter((r) => r.valid).length} de {preview.length} registros válidos
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleReset}>
                  Limpar
                </Button>
                {!imported && (
                  <Button
                    onClick={handleImport}
                    disabled={importing || preview.filter((r) => r.valid).length === 0}
                  >
                    {importing ? 'Importando...' : 'Importar'}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {imported && (
                <div className="mb-4 p-4 rounded-lg bg-muted flex items-center gap-4">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Importação concluída</p>
                    <p className="text-sm text-muted-foreground">
                      {results.success} sucesso, {results.errors} erros
                    </p>
                  </div>
                </div>
              )}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16">Linha</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Admissão</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Salário</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {preview.slice(0, 50).map((row) => (
                      <TableRow key={row.row} className={!row.valid ? 'bg-destructive/5' : ''}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {row.valid ? (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            ) : (
                              <XCircle className="h-4 w-4 text-destructive" />
                            )}
                            {row.row}
                          </div>
                        </TableCell>
                        <TableCell>{row.data.full_name || '-'}</TableCell>
                        <TableCell>{row.data.cpf || '-'}</TableCell>
                        <TableCell>{row.data.hire_date || '-'}</TableCell>
                        <TableCell>{row.data.department || '-'}</TableCell>
                        <TableCell>
                          {row.data.salario_base !== null ? (
                            <span className="text-xs">
                              {row.data.classificacao || 'CLT'}: R$ {row.data.salario_base.toLocaleString('pt-BR')}
                            </span>
                          ) : '-'}
                        </TableCell>
                        <TableCell>
                          {row.valid ? (
                            <Badge variant="outline">{row.data.status}</Badge>
                          ) : (
                            <div className="flex items-center gap-1 text-xs text-destructive">
                              <AlertCircle className="h-3 w-3" />
                              {row.errors.join(', ')}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {preview.length > 50 && (
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Mostrando 50 de {preview.length} registros
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
