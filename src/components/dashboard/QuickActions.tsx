import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Fuel, Eye, History } from 'lucide-react'
import { usePlan } from '@/contexts/PlanContext'
import { Badge } from '@/components/ui/badge'

interface QuickActionsProps {
  onTabChange: (tab: string) => void
}

export function QuickActions({ onTabChange }: QuickActionsProps) {
  const { isPro } = usePlan(); // Get isPro from usePlan

  return (
    <Card className="shadow-card-subtle rounded-card-lg">
      <CardHeader>
        <CardTitle className="text-text-title font-bold">Ações Rápidas</CardTitle>
        <CardDescription className="text-text-description">
          Acesse rapidamente as funcionalidades do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Primary Button */}
          <Button 
            onClick={() => onTabChange('products')} 
            variant="outline" // Added variant outline
            className="h-16 flex-col gap-2 border-accent-green text-accent-green hover:bg-accent-green hover:text-white" // Changed classes
          >
            <Search className="h-6 w-6" />
            <span>Buscar Produtos</span>
          </Button>
          
          {/* Secondary Button (Ghost style) */}
          <Button 
            onClick={() => onTabChange('fuels')} 
            variant="outline" 
            className="h-16 flex-col gap-2 border-accent-green text-accent-green hover:bg-accent-green hover:text-white"
          >
            <Fuel className="h-6 w-6" />
            <span>Buscar Combustíveis</span>
          </Button>

          {/* New Button: Monitorados */}
          <Button 
            onClick={() => onTabChange('monitored')} 
            variant="outline" 
            className="h-16 flex-col gap-2 border-accent-green text-accent-green hover:bg-accent-green hover:text-white"
            disabled={!isPro} // Disable if not Pro
          >
            <Eye className="h-6 w-6" />
            <span className="flex items-center gap-1">
              Itens Monitorados
              {!isPro && ( // Show PRO badge if not Pro
                <Badge 
                  variant="secondary" 
                  className="text-[10px] px-1.5 py-0.5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white"
                >
                  PRO
                </Badge>
              )}
            </span>
          </Button>

          {/* New Button: Histórico */}
          <Button 
            onClick={() => onTabChange('history')} 
            variant="outline" 
            className="h-16 flex-col gap-2 border-accent-green text-accent-green hover:bg-accent-green hover:text-white"
          >
            <History className="h-6 w-6" />
            <span>Histórico de Buscas</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}