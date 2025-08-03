import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Search, Fuel } from 'lucide-react'

interface QuickActionsProps {
  onTabChange: (tab: string) => void
}

export function QuickActions({ onTabChange }: QuickActionsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Ações Rápidas</CardTitle>
        <CardDescription>
          Acesse rapidamente as funcionalidades do sistema
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button 
            onClick={() => onTabChange('products')} 
            variant="outline" 
            className="h-16 flex-col gap-2"
          >
            <Search className="h-6 w-6" />
            <span>Buscar Produtos</span>
          </Button>
          
          <Button 
            onClick={() => onTabChange('fuels')} 
            variant="outline" 
            className="h-16 flex-col gap-2"
          >
            <Fuel className="h-6 w-6" />
            <span>Buscar Combustíveis</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}