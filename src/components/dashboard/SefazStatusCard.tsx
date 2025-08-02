import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useSefazStatus, SefazApiStatus } from "@/hooks/useSefazStatus"
import { useSefazCache } from "@/hooks/useSefazCache"
import { 
  Activity, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  HelpCircle,
  Trash2,
  RefreshCw
} from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { ptBR } from "date-fns/locale"

const statusConfig = {
  operational: {
    icon: CheckCircle,
    color: "text-green-500",
    bgColor: "bg-green-50 border-green-200",
    badge: "bg-green-100 text-green-800",
    label: "Operacional"
  },
  slow: {
    icon: Clock,
    color: "text-yellow-500", 
    bgColor: "bg-yellow-50 border-yellow-200",
    badge: "bg-yellow-100 text-yellow-800",
    label: "Lento"
  },
  unstable: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bgColor: "bg-orange-50 border-orange-200", 
    badge: "bg-orange-100 text-orange-800",
    label: "Instável"
  },
  down: {
    icon: XCircle,
    color: "text-red-500",
    bgColor: "bg-red-50 border-red-200",
    badge: "bg-red-100 text-red-800",
    label: "Fora do ar"
  },
  unknown: {
    icon: HelpCircle,
    color: "text-gray-500",
    bgColor: "bg-gray-50 border-gray-200",
    badge: "bg-gray-100 text-gray-800", 
    label: "Desconhecido"
  }
}

function formatResponseTime(ms: number | null): string {
  if (!ms) return "N/A"
  
  if (ms < 1000) return `${Math.round(ms)}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.round(ms / 60000)}min`
}

export function SefazStatusCard() {
  const { metrics, clearHistory, isChecking } = useSefazStatus()
  const { stats, clearCache } = useSefazCache()
  
  const config = statusConfig[metrics.status]
  const StatusIcon = config.icon

  return (
    <Card className={`border-2 ${config.bgColor}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Status da API SEFAZ
          </CardTitle>
          <Badge className={config.badge}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Métricas principais */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Última resposta:</span>
            <p className="font-medium">
              {formatResponseTime(metrics.lastResponseTime)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Tempo médio:</span>
            <p className="font-medium">
              {formatResponseTime(metrics.averageResponseTime)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Taxa de sucesso:</span>
            <p className="font-medium">
              {metrics.successRate?.toFixed(1)}%
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Cache:</span>
            <p className="font-medium">
              {stats.size} itens
            </p>
          </div>
        </div>

        {/* Última verificação */}
        {metrics.lastChecked && (
          <div className="text-xs text-muted-foreground">
            Última verificação: {formatDistanceToNow(metrics.lastChecked, { 
              addSuffix: true,
              locale: ptBR 
            })}
          </div>
        )}

        {/* Issues */}
        {metrics.issues.length > 0 && (
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Problemas detectados:</span>
            {metrics.issues.map((issue, index) => (
              <div key={index} className="text-xs text-orange-600 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" />
                {issue}
              </div>
            ))}
          </div>
        )}

        {/* Sugestões baseadas no status */}
        {metrics.status === 'slow' && (
          <div className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2">
            💡 <strong>Dica:</strong> API está lenta. Resultados em cache serão priorizados.
          </div>
        )}

        {metrics.status === 'unstable' && (
          <div className="text-xs bg-orange-50 border border-orange-200 rounded p-2">
            ⚠️ <strong>Instabilidade:</strong> Múltiplas tentativas serão realizadas automaticamente.
          </div>
        )}

        {metrics.status === 'down' && (
          <div className="text-xs bg-red-50 border border-red-200 rounded p-2">
            🚫 <strong>Serviço indisponível:</strong> Usando apenas dados em cache. Tente novamente mais tarde.
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearCache}
                disabled={stats.size === 0}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Limpar cache</TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={clearHistory}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Limpar histórico de status</TooltipContent>
          </Tooltip>
          
          {isChecking && (
            <div className="flex items-center text-xs text-muted-foreground">
              <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
              Verificando...
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}