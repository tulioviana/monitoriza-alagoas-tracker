import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Crown, Lock, Sparkles } from 'lucide-react'

interface ProFeatureBannerProps {
  feature: string
  title?: string
  description?: string
}

const FEATURE_INFO = {
  'monitored': {
    title: 'Monitoramento de Itens',
    description: 'Acompanhe preços automaticamente e receba alertas de mudanças.'
  },
  'market-intelligence': {
    title: 'Inteligência de Mercado',
    description: 'Análise avançada de concorrência e oportunidades de negócio.'
  },
  'export': {
    title: 'Exportação de Dados',
    description: 'Exporte seus resultados de busca para Excel e outros formatos.'
  }
}

export function ProFeatureBanner({ feature, title, description }: ProFeatureBannerProps) {
  const featureInfo = FEATURE_INFO[feature as keyof typeof FEATURE_INFO]
  const displayTitle = title || featureInfo?.title || 'Funcionalidade Pro'
  const displayDescription = description || featureInfo?.description || 'Esta funcionalidade está disponível apenas no plano Pro.'

  return (
    <Card className="border-2 border-dashed border-yellow-500/50 bg-gradient-to-br from-yellow-50/50 to-orange-50/50 dark:from-yellow-950/20 dark:to-orange-950/20">
      <CardContent className="flex flex-col items-center justify-center p-8 text-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-yellow-500 to-orange-500 flex items-center justify-center">
            <Crown className="w-8 h-8 text-white" />
          </div>
          <Lock className="w-6 h-6 absolute -bottom-1 -right-1 bg-background rounded-full p-1 text-yellow-600" />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-yellow-600" />
            <h3 className="text-lg font-semibold text-foreground">{displayTitle}</h3>
            <Sparkles className="w-4 h-4 text-yellow-600" />
          </div>
          <p className="text-muted-foreground max-w-md">{displayDescription}</p>
        </div>

        <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
          ✨ Exclusivo do Plano PRO
        </div>

        <Button 
          className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-medium"
          size="lg"
        >
          <Crown className="w-4 h-4 mr-2" />
          Fazer Upgrade para PRO
        </Button>

        <p className="text-xs text-muted-foreground">
          Desbloqueie todas as funcionalidades e potencialize seu negócio
        </p>
      </CardContent>
    </Card>
  )
}