import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Bell, 
  Settings, 
  Command,
  Filter,
  Plus
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface DashboardHeaderProps {
  title: string
  subtitle?: string
  actions?: React.ReactNode
}

export function DashboardHeader({ title, subtitle, actions }: DashboardHeaderProps) {
  const [searchValue, setSearchValue] = useState('')

  return (
    <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Title Section */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-4">
            {/* Global Search */}
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos, combustíveis..."
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-10 pr-4"
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                  <Command className="w-3 h-3" />
                  K
                </kbd>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm">
                <Filter className="w-4 h-4" />
              </Button>
              
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="w-4 h-4" />
                    <Badge 
                      variant="error" 
                      className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center"
                    >
                      3
                    </Badge>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex flex-col items-start p-4">
                    <div className="flex items-center gap-2 w-full">
                      <div className="w-2 h-2 bg-primary rounded-full"></div>
                      <span className="font-medium">Alerta de Preço</span>
                      <Badge variant="secondary" className="ml-auto text-xs">2min</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Gasolina comum teve redução de 5% no Posto Shell Centro
                    </p>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="flex flex-col items-start p-4">
                    <div className="flex items-center gap-2 w-full">
                      <div className="w-2 h-2 bg-warning rounded-full"></div>
                      <span className="font-medium">Monitoramento</span>
                      <Badge variant="secondary" className="ml-auto text-xs">1h</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      3 novos postos disponíveis para monitoramento
                    </p>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
              </Button>

              {/* Custom Actions */}
              {actions}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}