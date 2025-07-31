
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { LayoutDashboard, Search, Fuel, Monitor, Building2, Settings, ChevronLeft, ChevronRight, LogOut, History } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

const navigation = [{
  id: 'dashboard',
  label: 'Dashboard',
  icon: LayoutDashboard,
  badge: null
}, {
  id: 'products',
  label: 'Produtos',
  icon: Search,
  badge: null
}, {
  id: 'fuels',
  label: 'Combustíveis',
  icon: Fuel,
  badge: null
}, {
  id: 'tracked',
  label: 'Monitorados',
  icon: Monitor,
  badge: null
}, {
  id: 'competitors',
  label: 'Concorrentes',
  icon: Building2,
  badge: null
}, {
  id: 'history',
  label: 'Histórico',
  icon: History,
  badge: null
}];

const secondaryNavigation = [{
  id: 'settings',
  label: 'Configurações',
  icon: Settings,
  badge: null
}];

export function Sidebar({
  activeTab,
  onTabChange,
  className
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const {
    user,
    signOut
  } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getUserInitials = () => {
    const name = user?.user_metadata?.full_name || user?.email || '';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return <aside className={cn("bg-card border-r flex flex-col transition-all duration-300 ease-in-out h-screen", collapsed ? "w-16" : "w-64", className)}>
      {/* Header */}
      <div className="p-2 border-b">
        <div className="flex items-center justify-between">
          {!collapsed && <div className="flex items-center justify-center w-full sidebar-logo px-2">
              <img src="/lovable-uploads/a7774c67-d2f8-4983-83c4-07b67a2092fc.png" alt="Whisprice AL" className="h-8 w-auto object-contain" />
            </div>}
          <Button variant="ghost" size="sm" onClick={() => setCollapsed(!collapsed)} className="shrink-0">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2 space-y-1">
        <div className="space-y-1">
          {navigation.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return <Button key={item.id} variant={isActive ? "secondary" : "ghost"} size="sm" onClick={() => onTabChange(item.id)} className={cn("w-full justify-start gap-3 h-10", collapsed && "justify-center px-2", isActive && "bg-primary/10 border-primary/20 border text-primary hover:bg-primary/20")}>
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Button>;
        })}
        </div>

        <div className="border-t pt-2 mt-4 space-y-1">
          {secondaryNavigation.map(item => {
          const Icon = item.icon;
          return <Button key={item.id} variant="ghost" size="sm" onClick={() => onTabChange(item.id)} className={cn("w-full justify-start gap-3 h-10", collapsed && "justify-center px-2")}>
                <Icon className="w-4 h-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Button>;
        })}
        </div>
      </nav>

      {/* User Profile */}
      <div className="p-4 border-t">
        <div className={cn("flex items-center gap-3", collapsed && "justify-center")}>
          <Avatar className="w-8 h-8">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {getUserInitials()}
            </AvatarFallback>
          </Avatar>
          
          {!collapsed && <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {user?.user_metadata?.full_name || 'Usuário'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
            </div>}
          
          <Button variant="ghost" size="sm" onClick={handleSignOut} className={cn("shrink-0", collapsed && "w-8 h-8 p-0")}>
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </aside>;
}
