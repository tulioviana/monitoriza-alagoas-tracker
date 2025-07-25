import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Monitor, Plus, Search, TrendingUp } from 'lucide-react'

interface TrackedItemsEmptyProps {
  onAddProduct: () => void
  onAddFuel: () => void
}

export function TrackedItemsEmpty({ onAddProduct, onAddFuel }: TrackedItemsEmptyProps) {
  return (
    <Card className="border-dashed border-2 border-muted-foreground/20">
      <CardContent className="flex flex-col items-center justify-center py-16 px-6 text-center">
        <div className="relative mb-6">
          <div className="p-6 rounded-full bg-gradient-primary/10 border border-primary/20">
            <Monitor className="h-16 w-16 text-primary" />
          </div>
          <div className="absolute -top-2 -right-2 p-2 rounded-full bg-success/10 border border-success/20">
            <TrendingUp className="h-6 w-6 text-success" />
          </div>
        </div>

        <h3 className="text-display-lg font-semibold mb-3">
          Nenhum item monitorado
        </h3>
        
        <p className="text-body-md text-muted-foreground max-w-md mb-8 leading-relaxed">
          Comece a monitorar produtos e combustíveis para acompanhar suas variações de preço em tempo real e encontrar as melhores oportunidades de economia.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
          <Button 
            onClick={onAddProduct}
            className="flex-1 h-12"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Monitorar Produto
          </Button>
          
          <Button 
            onClick={onAddFuel}
            variant="outline" 
            className="flex-1 h-12"
            size="lg"
          >
            <Search className="h-5 w-5 mr-2" />
            Monitorar Combustível
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-6 mt-12 w-full max-w-md">
          <div className="text-center">
            <div className="p-3 rounded-lg bg-info/10 mx-auto w-fit mb-2">
              <TrendingUp className="h-6 w-6 text-info" />
            </div>
            <p className="text-body-xs text-muted-foreground">
              Tendências de preços
            </p>
          </div>
          
          <div className="text-center">
            <div className="p-3 rounded-lg bg-success/10 mx-auto w-fit mb-2">
              <Search className="h-6 w-6 text-success" />
            </div>
            <p className="text-body-xs text-muted-foreground">
              Monitoramento contínuo
            </p>
          </div>
          
          <div className="text-center">
            <div className="p-3 rounded-lg bg-primary/10 mx-auto w-fit mb-2">
              <Monitor className="h-6 w-6 text-primary" />
            </div>
            <p className="text-body-xs text-muted-foreground">
              Alertas inteligentes
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}