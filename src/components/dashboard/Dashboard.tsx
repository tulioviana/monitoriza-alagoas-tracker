
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/hooks/useAuth'
import { ProductSearch } from './ProductSearch'
import { FuelSearch } from './FuelSearch'
import { TrackedItems } from './TrackedItems'
import { LogOut, Search, Fuel, Monitor } from 'lucide-react'

export function Dashboard() {
  const { signOut, user } = useAuth()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-primary">Monitoriza Alagoas</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Olá, {user?.user_metadata?.full_name || user?.email}
            </span>
            <Button onClick={handleSignOut} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dashboard" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="fuels" className="flex items-center gap-2">
              <Fuel className="h-4 w-4" />
              Combustíveis
            </TabsTrigger>
            <TabsTrigger value="tracked" className="flex items-center gap-2">
              <Monitor className="h-4 w-4" />
              Monitorados
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    Itens Monitorados
                  </CardTitle>
                  <CardDescription>
                    Acompanhe os preços dos seus produtos e combustíveis favoritos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <TrackedItems />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="products">
            <ProductSearch />
          </TabsContent>

          <TabsContent value="fuels">
            <FuelSearch />
          </TabsContent>

          <TabsContent value="tracked">
            <TrackedItems />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
