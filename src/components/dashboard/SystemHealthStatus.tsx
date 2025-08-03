import { Activity, AlertTriangle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSystemHealth } from '@/hooks/useSystemHealth';
import { Skeleton } from '@/components/ui/skeleton';

export function SystemHealthStatus() {
  const { 
    healthData, 
    loading, 
    error, 
    checkSystemHealth, 
    getStatusColor, 
    getStatusBadgeColor, 
    formatTimestamp 
  } = useSystemHealth();

  if (loading && !healthData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Status do Sistema
          </CardTitle>
          <CardDescription>
            Monitoramento da sincronização de preços
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-500">
            <XCircle className="h-5 w-5" />
            Erro no Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button 
            onClick={checkSystemHealth} 
            variant="outline" 
            size="sm" 
            className="mt-2"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Tentar Novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!healthData) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY': return <CheckCircle className={`h-5 w-5 ${getStatusColor(status)}`} />;
      case 'WARNING': return <AlertTriangle className={`h-5 w-5 ${getStatusColor(status)}`} />;
      case 'CRITICAL': return <XCircle className={`h-5 w-5 ${getStatusColor(status)}`} />;
      default: return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(healthData.system_status)}
            Status do Sistema
          </div>
          <Button 
            onClick={checkSystemHealth} 
            variant="ghost" 
            size="sm"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </CardTitle>
        <CardDescription>
          Monitoramento da sincronização de preços
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Status:</span>
          <Badge className={getStatusBadgeColor(healthData.system_status)}>
            {healthData.system_status === 'HEALTHY' && 'Saudável'}
            {healthData.system_status === 'WARNING' && 'Atenção'}
            {healthData.system_status === 'CRITICAL' && 'Crítico'}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Última execução bem-sucedida:</span>
            <p className="font-medium">{formatTimestamp(healthData.last_success)}</p>
          </div>
          
          <div>
            <span className="text-muted-foreground">Última execução:</span>
            <p className="font-medium">{formatTimestamp(healthData.last_execution)}</p>
          </div>
          
          <div>
            <span className="text-muted-foreground">Erros últimas 24h:</span>
            <p className={`font-medium ${healthData.recent_errors_24h > 5 ? 'text-red-500' : ''}`}>
              {healthData.recent_errors_24h}
            </p>
          </div>
          
          <div>
            <span className="text-muted-foreground">Itens ativos:</span>
            <p className="font-medium">{healthData.active_items}</p>
          </div>
        </div>

        <div className="pt-2 border-t">
          <p className="text-xs text-muted-foreground">
            Última verificação: {formatTimestamp(healthData.checked_at)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}