import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useTrackedItems } from '@/hooks/useTrackedItems';
import { useToast } from '@/hooks/use-toast';

interface AddToMonitoringModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemType: 'produto' | 'combustivel';
  searchCriteria: any;
  suggestedName?: string;
  establishmentCnpj: string;
  establishmentName: string;
  currentSalePrice?: number;
  currentDeclaredPrice?: number;
}

export function AddToMonitoringModal({ 
  isOpen, 
  onClose, 
  itemType, 
  searchCriteria, 
  suggestedName = '',
  establishmentCnpj,
  establishmentName,
  currentSalePrice,
  currentDeclaredPrice
}: AddToMonitoringModalProps) {
  const [nickname, setNickname] = useState(suggestedName);
  const { addItem, isAddingItem, trackedItems } = useTrackedItems();
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname.trim()) return;

    // Verificar se já existe um item sendo monitorado com os mesmos critérios
    const isDuplicate = trackedItems.some(item => 
      item.establishment_cnpj === establishmentCnpj &&
      JSON.stringify(item.search_criteria) === JSON.stringify(searchCriteria)
    );

    if (isDuplicate) {
      toast({
        title: "Item já está sendo monitorado",
        description: "Este item já está na sua lista de monitoramento.",
        variant: "destructive",
      });
      return;
    }

    addItem({
      item_type: itemType,
      search_criteria: searchCriteria,
      nickname: nickname.trim(),
      establishment_cnpj: establishmentCnpj,
      establishment_name: establishmentName,
      initial_price: currentSalePrice
    });

    onClose();
    setNickname('');
  };

  const handleClose = () => {
    onClose();
    setNickname('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Adicionar ao Monitoramento</DialogTitle>
            <DialogDescription>
              Dê um nome para este item para facilitar a identificação na sua lista de monitorados.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nickname" className="text-right">
                Nome
              </Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Ex: Óleo de soja - Mercado Central"
                className="col-span-3"
                maxLength={100}
                required
              />
            </div>
          </div>

          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isAddingItem}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!nickname.trim() || isAddingItem}
            >
              {isAddingItem ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}