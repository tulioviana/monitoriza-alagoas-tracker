import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Package, Fuel } from 'lucide-react'

interface AddItemModalProps {
  open: boolean
  onClose: () => void
  onSelectType: (type: 'product' | 'fuel') => void
}

export function AddItemModal({ open, onClose, onSelectType }: AddItemModalProps) {
  const handleSelect = (type: 'product' | 'fuel') => {
    onSelectType(type)
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Item</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Escolha o tipo de item que deseja adicionar ao monitoramento:
          </p>
          
          <div className="grid gap-4">
            <Card 
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group"
              onClick={() => handleSelect('product')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <Package className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                  Produto
                </CardTitle>
                <CardDescription>
                  Monitore preços de produtos específicos usando código de barras (GTIN/EAN)
                </CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50 group"
              onClick={() => handleSelect('fuel')}
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-3 text-lg">
                  <Fuel className="h-6 w-6 text-primary group-hover:scale-110 transition-transform" />
                  Combustível
                </CardTitle>
                <CardDescription>
                  Monitore preços de combustíveis em postos específicos
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}