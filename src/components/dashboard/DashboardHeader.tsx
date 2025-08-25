import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Bell, Settings, Command, Filter, Plus } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}
export function DashboardHeader({
  title,
  subtitle,
  actions
}: DashboardHeaderProps) {
  const [searchValue, setSearchValue] = useState('');
  return <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Title Section */}
          <div>
            <h1 className="text-2xl font-bold text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-4">
            {/* Global Search */}
            <div className="relative w-80">
              
              
              
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              
              
              {/* Notifications */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="relative">
                    <Bell className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <DropdownMenuLabel>Notificações</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                </DropdownMenuContent>
              </DropdownMenu>

              

              {/* Custom Actions */}
              {actions}
            </div>
          </div>
        </div>
      </div>
    </header>;
}