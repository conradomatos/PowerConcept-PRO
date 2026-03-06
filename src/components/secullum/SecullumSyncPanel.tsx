import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useSecullumSync } from '@/hooks/useSecullumSync';
import { RefreshCw, Loader2, CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import { format, subDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SecullumSyncEtapa } from '@/services/secullum/types';

/** Labels das etapas para exibicao no progresso */
const ETAPA_LABELS: Record<SecullumSyncEtapa, string> = {
  FUNCIONARIOS: 'Funcionários',
  FOTOS: 'Fotos',
  AFASTAMENTOS: 'Afastamentos',
  CALCULOS: 'Cálculos e Apontamentos',
};

/** Etapas executadas pelo orquestrador (sem FOTOS) */
const ETAPAS_PADRAO: SecullumSyncEtapa[] = ['FUNCIONARIOS', 'AFASTAMENTOS', 'CALCULOS'];

/**
 * Painel de sincronizacao manual com Secullum Ponto Web.
 * Exibe controles de sync com progresso por etapa + log de sincronizacoes anteriores.
 */
export function SecullumSyncPanel() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');

  const [dataInicio, setDataInicio] = useState(yesterday);
  const [dataFim, setDataFim] = useState(yesterday);

  const {
    sync,
    isSyncing,
    etapaAtual,
    etapasConcluidas,
    lastSync,
    syncLogs,
    isLoadingLogs,
  } = useSecullumSync();

  const handleSync = () => {
    sync({
      tipo: 'MANUAL',
      dataInicio,
      dataFim,
    });
  };

  return (
    <div className="space-y-6">
      {/* Controles de sync */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Sincronização Secullum
          </CardTitle>
          <CardDescription>
            Sincroniza funcionários, cálculos de horas e afastamentos do Secullum Ponto Web.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Período */}
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <Label htmlFor="dataInicio">Data Início</Label>
              <Input
                id="dataInicio"
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                max={today}
                className="w-44"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="dataFim">Data Fim</Label>
              <Input
                id="dataFim"
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                max={today}
                className="w-44"
              />
            </div>
            <Button onClick={handleSync} disabled={isSyncing}>
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sincronizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sincronizar Tudo
                </>
              )}
            </Button>
          </div>

          {/* Progresso por etapa */}
          {isSyncing && (
            <div className="space-y-2 pt-2 border-t">
              {ETAPAS_PADRAO.map((etapa) => {
                const isConcluida = etapasConcluidas.includes(etapa);
                const isAtual = etapaAtual === etapa;
                const isPendente = !isConcluida && !isAtual;

                return (
                  <div key={etapa} className="flex items-center gap-2 text-sm">
                    {isConcluida && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {isAtual && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
                    {isPendente && <Clock className="h-4 w-4 text-muted-foreground" />}
                    <span className={isPendente ? 'text-muted-foreground' : isConcluida ? 'text-green-600 dark:text-green-400' : ''}>
                      {ETAPA_LABELS[etapa]}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Último sync info */}
          {lastSync && !isSyncing && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Última sincronização:{' '}
              {format(parseISO(lastSync.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              {' — '}
              <StatusBadge status={lastSync.status} />
              {lastSync.duracao_ms && (
                <span>({(lastSync.duracao_ms / 1000).toFixed(1)}s)</span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log de sincronizações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de Sincronizações</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingLogs ? (
            <div className="flex items-center gap-2 text-muted-foreground py-4">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando...
            </div>
          ) : syncLogs.length === 0 ? (
            <p className="text-muted-foreground py-4">Nenhuma sincronização realizada ainda.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Etapa</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead className="text-right">Func.</TableHead>
                  <TableHead className="text-right">Cálculos</TableHead>
                  <TableHead className="text-right">Afast.</TableHead>
                  <TableHead className="text-right">Fotos</TableHead>
                  <TableHead className="text-right">Reqs</TableHead>
                  <TableHead className="text-right">Duração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syncLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs">
                      {format(parseISO(log.created_at), 'dd/MM/yy HH:mm')}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {log.etapa || 'TODAS'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={log.status} />
                    </TableCell>
                    <TableCell className="text-xs">
                      {log.data_inicio && log.data_fim
                        ? `${format(parseISO(log.data_inicio), 'dd/MM')} - ${format(parseISO(log.data_fim), 'dd/MM')}`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {log.funcionarios_sincronizados}
                      {log.funcionarios_criados > 0 && (
                        <span className="text-green-600"> (+{log.funcionarios_criados})</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs">{log.calculos_sincronizados}</TableCell>
                    <TableCell className="text-right text-xs">{log.afastamentos_sincronizados}</TableCell>
                    <TableCell className="text-right text-xs">{log.fotos_sincronizadas}</TableCell>
                    <TableCell className="text-right text-xs">{log.requests_utilizadas}</TableCell>
                    <TableCell className="text-right text-xs">
                      {log.duracao_ms ? `${(log.duracao_ms / 1000).toFixed(1)}s` : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'SUCESSO':
      return (
        <Badge variant="outline" className="text-xs gap-1 border-green-500 text-green-700 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3" />
          Sucesso
        </Badge>
      );
    case 'ERRO':
      return (
        <Badge variant="outline" className="text-xs gap-1 border-red-500 text-red-700 dark:text-red-400">
          <XCircle className="h-3 w-3" />
          Erro
        </Badge>
      );
    case 'PARCIAL':
      return (
        <Badge variant="outline" className="text-xs gap-1 border-amber-500 text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-3 w-3" />
          Parcial
        </Badge>
      );
    case 'INICIADO':
      return (
        <Badge variant="outline" className="text-xs gap-1 border-blue-500 text-blue-700 dark:text-blue-400">
          <Loader2 className="h-3 w-3 animate-spin" />
          Em andamento
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
}
