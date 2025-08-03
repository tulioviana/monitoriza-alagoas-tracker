import { useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FilterType, FilterStatus } from '@/hooks/useTrackedItemsFilters';
import { AddItemModal } from './AddItemModal';
import { ForceUserSyncButton } from './ForceUserSyncButton';
interface TrackedItemsHeaderProps {
  stats: {
    total: number;
    active: number;
    paused: number;
    products: number;
    fuels: number;
  };
  searchTerm: string;
  onSearchChange: (value: string) => void;
  typeFilter: FilterType;
  onTypeFilterChange: (value: FilterType) => void;
  statusFilter: FilterStatus;
  onStatusFilterChange: (value: FilterStatus) => void;
  onAddNewItem?: () => void;
  onNavigateToTab?: (tab: string) => void;
}
export function TrackedItemsHeader({
  stats,
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeFilterChange,
  statusFilter,
  onStatusFilterChange,
  onAddNewItem,
  onNavigateToTab
}: TrackedItemsHeaderProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleAddClick = () => {
    setIsModalOpen(true);
  };

  const handleSelectType = (type: 'product' | 'fuel') => {
    if (onNavigateToTab) {
      onNavigateToTab(type === 'product' ? 'products' : 'fuels');
    }
  };
  return <div className="space-y-6">
      {/* Title and Add Button */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          
          <p className="text-muted-foreground">
            Acompanhe as variações de preços dos seus produtos e combustíveis
          </p>
        </div>
        <div className="flex gap-2">
          <ForceUserSyncButton />
          <Button onClick={handleAddClick} className="gap-2">
            <Plus className="h-4 w-4" />
            Adicionar Novo Item
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap">
        <Badge variant="outline" className="px-3 py-1">
          Total: {stats.total}
        </Badge>
        <Badge variant="secondary" className="px-3 py-1 bg-green-100 text-green-700">
          Ativos: {stats.active}
        </Badge>
        <Badge variant="secondary" className="px-3 py-1 bg-yellow-100 text-yellow-700">
          Pausados: {stats.paused}
        </Badge>
        <Badge variant="outline" className="px-3 py-1">
          Produtos: {stats.products}
        </Badge>
        <Badge variant="outline" className="px-3 py-1">
          Combustíveis: {stats.fuels}
        </Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por apelido..." value={searchTerm} onChange={e => onSearchChange(e.target.value)} className="pl-10" />
        </div>
        
        <Select value={typeFilter} onValueChange={onTypeFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="produto">Produtos</SelectItem>
            <SelectItem value="combustivel">Combustíveis</SelectItem>
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={onStatusFilterChange}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos status</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="paused">Pausados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AddItemModal 
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectType={handleSelectType}
      />
    </div>;
}