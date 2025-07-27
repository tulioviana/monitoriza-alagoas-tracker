import { MoreHorizontal, Play, Pause, Edit, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TrackedItemActionsProps {
  isActive: boolean
  onToggle: () => void
  onEdit?: () => void
  onDelete: () => void
  isToggling?: boolean
  isDeleting?: boolean
}

export function TrackedItemActions({
  isActive,
  onToggle,
  onEdit,
  onDelete,
  isToggling = false,
  isDeleting = false
}: TrackedItemActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Abrir menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onToggle} disabled={isToggling}>
          {isToggling ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isActive ? (
            <Pause className="mr-2 h-4 w-4" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {isActive ? 'Pausar Monitoramento' : 'Ativar Monitoramento'}
        </DropdownMenuItem>
        
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Editar Apelido
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem 
          onClick={onDelete} 
          disabled={isDeleting}
          className="text-destructive focus:text-destructive"
        >
          {isDeleting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="mr-2 h-4 w-4" />
          )}
          Excluir Item
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}