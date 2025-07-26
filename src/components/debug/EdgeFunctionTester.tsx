import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlayCircle, Clock, AlertTriangle, CheckCircle, RefreshCw, Activity } from "lucide-react";

export function EdgeFunctionTester() {
  const [isTestingManual, setIsTestingManual] = useState(false);
  const [isCheckingCron, setIsCheckingCron] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<any>(null);
  const [cronJobStatus, setCronJobStatus] = useState<any>(null);
  const [syncLogs, setSyncLogs] = useState<any[]>([]);

  useEffect(() => {
    loadSyncLogs();
  }, []);

  const testManualExecution = async () => {
    setIsTestingManual(true);
    try {
      console.log("🚀 Testing manual edge function execution...");
      
      const { data, error } = await supabase.functions.invoke('update-tracked-prices', {
        body: { 
          scheduled: false,
          testMode: true 
        }
      });

      if (error) {
        console.error("❌ Manual test error:", error);
        toast.error(`Erro no teste manual: ${error.message}`);
        setLastTestResult({ success: false, error: error.message });
      } else {
        console.log("✅ Manual test successful:", data);
        toast.success("Teste manual executado com sucesso!");
        setLastTestResult({ success: true, data });
      }
    } catch (error: any) {
      console.error("❌ Manual test exception:", error);
      toast.error(`Erro no teste: ${error.message}`);
      setLastTestResult({ success: false, error: error.message });
    } finally {
      setIsTestingManual(false);
    }
  };

  const checkCronJobs = async () => {
    setIsCheckingCron(true);
    try {
      console.log("🔍 Checking cron job status...");
      
      const { data, error } = await supabase.rpc('check_cron_jobs');

      if (error) {
        console.error("❌ Cron check error:", error);
        toast.error(`Erro ao verificar cron jobs: ${error.message}`);
        setCronJobStatus({ success: false, error: error.message });
      } else {
        console.log("✅ Cron jobs check successful:", data);
        toast.success("Status dos cron jobs verificado!");
        setCronJobStatus({ success: true, data });
      }
    } catch (error: any) {
      console.error("❌ Cron check exception:", error);
      toast.error(`Erro na verificação: ${error.message}`);
      setCronJobStatus({ success: false, error: error.message });
    } finally {
      setIsCheckingCron(false);
    }
  };

  const loadSyncLogs = async () => {
    setIsLoadingLogs(true);
    try {
      console.log("📋 Loading sync logs...");
      
      const { data, error } = await supabase.rpc('get_recent_sync_logs', { limit_count: 10 });

      if (error) {
        console.error("❌ Sync logs error:", error);
        toast.error(`Erro ao carregar logs: ${error.message}`);
      } else {
        console.log("✅ Sync logs loaded:", data);
        setSyncLogs(data || []);
      }
    } catch (error: any) {
      console.error("❌ Sync logs exception:", error);
      toast.error(`Erro ao carregar logs: ${error.message}`);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([
      checkCronJobs(),
      loadSyncLogs()
    ]);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5" />
            Teste de Edge Function
          </CardTitle>
          <CardDescription>
            Teste manual da função de sincronização de preços
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 md:grid-cols-3">
            <Button
              onClick={testManualExecution}
              disabled={isTestingManual}
              className="flex items-center gap-2"
            >
              <PlayCircle className="h-4 w-4" />
              {isTestingManual ? "Testando..." : "Teste Manual"}
            </Button>
            <Button
              onClick={checkCronJobs}
              disabled={isCheckingCron}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              {isCheckingCron ? "Verificando..." : "Status Cron"}
            </Button>
            <Button
              onClick={refreshAll}
              disabled={isCheckingCron || isLoadingLogs}
              variant="secondary"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar Tudo
            </Button>
          </div>

          {lastTestResult && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">Resultado do Teste Manual:</h4>
                  <Badge variant={lastTestResult.success ? "success" : "error"}>
                    {lastTestResult.success ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 mr-1" />
                    )}
                    {lastTestResult.success ? "Sucesso" : "Erro"}
                  </Badge>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(lastTestResult, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}

          {cronJobStatus && (
            <>
              <Separator />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <h4 className="font-medium">Status dos Cron Jobs:</h4>
                  <Badge variant={cronJobStatus.success ? "success" : "error"}>
                    {cronJobStatus.success ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <AlertTriangle className="h-3 w-3 mr-1" />
                    )}
                    {cronJobStatus.success ? "Ativo" : "Erro"}
                  </Badge>
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(cronJobStatus, null, 2)}
                  </pre>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Logs de Sincronização
          </CardTitle>
          <CardDescription>
            Histórico das execuções da sincronização automática
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {syncLogs.length} execuções recentes
              </span>
              <Button
                onClick={loadSyncLogs}
                disabled={isLoadingLogs}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-3 w-3" />
                {isLoadingLogs ? "Carregando..." : "Atualizar"}
              </Button>
            </div>

            {syncLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum log de sincronização encontrado
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {syncLogs.map((log, index) => (
                  <div
                    key={log.id || index}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <Badge variant={log.status === 'SUCCESS' ? 'success' : 'error'}>
                        {log.status === 'SUCCESS' ? (
                          <CheckCircle className="h-3 w-3 mr-1" />
                        ) : (
                          <AlertTriangle className="h-3 w-3 mr-1" />
                        )}
                        {log.status}
                      </Badge>
                      <div className="text-sm">
                        <div className="font-medium">
                          {log.execution_type === 'cron' ? 'Automático' : 'Manual'}
                        </div>
                        <div className="text-muted-foreground">
                          {new Date(log.executed_at).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      {log.duration_ms && (
                        <div className="text-muted-foreground">
                          {log.duration_ms}ms
                        </div>
                      )}
                      {log.error_message && (
                        <div className="text-error text-xs max-w-32 truncate">
                          {log.error_message}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}