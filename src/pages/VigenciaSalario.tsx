import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { formatCPF } from '@/lib/cpf';
import { Search, DollarSign } from 'lucide-react';

export default function VigenciaSalario() {
  const navigate = useNavigate();
  const { user, loading, hasRole } = useAuth();
  const [search, setSearch] = useState('');

  const canAccess = hasRole('super_admin') || hasRole('admin') || hasRole('rh') || hasRole('financeiro');

  const { data: collaborators, isLoading } = useQuery({
    queryKey: ['collaborators-vigencia'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('collaborators')
        .select('id, full_name, cpf, position, department, status, equipe')
        .order('full_name');
      if (error) throw error;
      return data;
    },
    enabled: !!user && canAccess,
  });

  const filtered = useMemo(() => {
    if (!collaborators) return [];
    if (!search.trim()) return collaborators;
    const s = search.toLowerCase().trim();
    return collaborators.filter(
      (c) =>
        c.full_name.toLowerCase().includes(s) ||
        c.cpf.includes(search.replace(/\D/g, '')) ||
        (c.department?.toLowerCase().includes(s) ?? false) ||
        (c.position?.toLowerCase().includes(s) ?? false)
    );
  }, [collaborators, search]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </Layout>
    );
  }

  if (!canAccess) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center py-16">
          <h2 className="text-xl font-semibold mb-2">Acesso Negado</h2>
          <p className="text-muted-foreground">Voce nao tem permissao para acessar esta pagina.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <nav className="text-sm text-muted-foreground mb-2">
            Recursos &gt; Custos &gt; Vigencia de Salario
          </nav>
          <h1 className="text-2xl font-bold tracking-tight">Vigencia de Salario</h1>
          <p className="text-muted-foreground">Gerencie as vigencias salariais dos colaboradores</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CPF, cargo ou departamento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {filtered.length} colaborador{filtered.length !== 1 && 'es'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Carregando...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum colaborador encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>CPF</TableHead>
                      <TableHead>Departamento</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Acoes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.full_name}</TableCell>
                        <TableCell>{formatCPF(c.cpf)}</TableCell>
                        <TableCell>{c.department || '-'}</TableCell>
                        <TableCell>{c.position || '-'}</TableCell>
                        <TableCell>
                          <Badge variant={c.status === 'ativo' ? 'default' : 'outline'}>
                            {c.status === 'ativo' ? 'Ativo' : c.status === 'afastado' ? 'Afastado' : 'Desligado'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={() => navigate(`/collaborators/${c.id}/costs`)}
                          >
                            <DollarSign className="h-4 w-4" />
                            Ver Vigencias
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
