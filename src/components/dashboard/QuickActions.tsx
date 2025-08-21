import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Fuel } from 'lucide-react'

interface QuickActionsProps {
  onTabChange: (tab: string) => void
}

export function QuickActions({ onTabChange }: QuickActionsProps) {
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
            className="h-16 flex-col gap-2 bg-accent-green text-white hover:bg-accent-green/90"
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
        </div>
      </CardContent>
    </Card>
  )
}