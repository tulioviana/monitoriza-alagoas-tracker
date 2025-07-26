import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PlayCircle, Clock, AlertTriangle, CheckCircle } from "lucide-react";

export function EdgeFunctionTester() {
  const [isTestingManual, setIsTestingManual] = useState(false);
  const [isCheckingCron, setIsCheckingCron] = useState(false);
  const [lastTestResult, setLastTestResult] = useState<any>(null);
  const [cronJobStatus, setCronJobStatus] = useState<any>(null);

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
          <div className="flex gap-2">
            <Button
              onClick={testManualExecution}
              disabled={isTestingManual}
              className="flex-1"
            >
              {isTestingManual ? "Testando..." : "Testar Manualmente"}
            </Button>
            <Button
              onClick={checkCronJobs}
              disabled={isCheckingCron}
              variant="outline"
              className="flex-1"
            >
              {isCheckingCron ? "Verificando..." : "Verificar Cron Jobs"}
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
    </div>
  );
}