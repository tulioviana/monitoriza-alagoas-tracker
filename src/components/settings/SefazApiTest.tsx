import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Loader2, Play, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface TestResult {
  days: number
  success: boolean
  recordCount?: number
  error?: string
  duration?: number
}

export function SefazApiTest() {
  const [isTestingAuto, setIsTestingAuto] = useState(false)
  const [isTestingManual, setIsTestingManual] = useState(false)
  const [testDays, setTestDays] = useState('30')
  const [testGtin, setTestGtin] = useState('7897255904060')
  const [testCnpj, setTestCnpj] = useState('00279531000670')
  const [autoResults, setAutoResults] = useState<TestResult[]>([])
  const [manualResult, setManualResult] = useState<TestResult | null>(null)
  const [currentTest, setCurrentTest] = useState(0)
  const [maxDays, setMaxDays] = useState<number | null>(null)

  const testApiCall = async (days: number, gtin: string, cnpj: string): Promise<TestResult> => {
    const startTime = Date.now()
    
    try {
      const response = await fetch('/api/sefaz/produtos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          gtin,
          cnpj,
          dias: days
        })
      })

      const duration = Date.now() - startTime
      
      if (!response.ok) {
        const errorData = await response.json()
        return {
          days,
          success: false,
          error: errorData.error || `HTTP ${response.status}`,
          duration
        }
      }

      const data = await response.json()
      return {
        days,
        success: true,
        recordCount: data.success ? data.data?.length || 0 : 0,
        duration
      }
    } catch (error) {
      return {
        days,
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        duration: Date.now() - startTime
      }
    }
  }

  const runAutoTest = async () => {
    setIsTestingAuto(true)
    setAutoResults([])
    setCurrentTest(0)
    setMaxDays(null)

    const testPeriods = [7, 15, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330, 365]
    
    for (let i = 0; i < testPeriods.length; i++) {
      const days = testPeriods[i]
      setCurrentTest(i + 1)
      
      const result = await testApiCall(days, testGtin, testCnpj)
      
      setAutoResults(prev => [...prev, result])
      
      // Se falhou, provavelmente atingimos o limite
      if (!result.success) {
        setMaxDays(testPeriods[i - 1] || 7)
        break
      }
      
      // Se chegou a 180 dias com sucesso, para por aqui
      if (days >= 180) {
        setMaxDays(days)
        break
      }
      
      // Pausa entre requests para não sobrecarregar a API
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
    
    setIsTestingAuto(false)
    setCurrentTest(0)
  }

  const runManualTest = async () => {
    setIsTestingManual(true)
    setManualResult(null)
    
    const result = await testApiCall(parseInt(testDays), testGtin, testCnpj)
    setManualResult(result)
    
    setIsTestingManual(false)
  }

  const getStatusIcon = (result: TestResult) => {
    if (result.success) {
      return <CheckCircle className="w-4 h-4 text-green-600" />
    } else {
      return <AlertCircle className="w-4 h-4 text-red-600" />
    }
  }

  const getStatusBadge = (result: TestResult) => {
    if (result.success) {
      return <Badge variant="outline" className="text-green-600 border-green-600">Sucesso</Badge>
    } else {
      return <Badge variant="outline" className="text-red-600 border-red-600">Falha</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold mb-2">Teste de Limites da API SEFAZ</h2>
        <p className="text-muted-foreground">
          Descubra quantos dias no passado a API SEFAZ permite consultar preços de produtos
        </p>
      </div>

      {/* Teste Automático */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Teste Automático de Limites
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Testa automaticamente períodos de 7 a 365 dias (ou até 180 dias) para encontrar o limite máximo
          </p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="auto-gtin">GTIN do Produto</Label>
              <Input
                id="auto-gtin"
                value={testGtin}
                onChange={(e) => setTestGtin(e.target.value)}
                placeholder="Ex: 7897255904060"
              />
            </div>
            <div>
              <Label htmlFor="auto-cnpj">CNPJ do Estabelecimento</Label>
              <Input
                id="auto-cnpj"
                value={testCnpj}
                onChange={(e) => setTestCnpj(e.target.value)}
                placeholder="Ex: 00279531000670"
              />
            </div>
          </div>

          <Button 
            onClick={runAutoTest} 
            disabled={isTestingAuto}
            className="w-full"
          >
            {isTestingAuto ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testando ({currentTest}/14)...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Iniciar Teste Automático
              </>
            )}
          </Button>

          {isTestingAuto && (
            <Progress value={(currentTest / 14) * 100} className="w-full" />
          )}

          {maxDays && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Limite encontrado:</strong> A API SEFAZ permite consultar até {maxDays} dias no passado
              </AlertDescription>
            </Alert>
          )}

          {autoResults.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Resultados dos Testes:</h4>
              <div className="max-h-60 overflow-y-auto space-y-1">
                {autoResults.map((result, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result)}
                      <span className="font-medium">{result.days} dias</span>
                      {getStatusBadge(result)}
                    </div>
                    <div className="text-right text-sm">
                      {result.success ? (
                        <span className="text-green-600">{result.recordCount} registros</span>
                      ) : (
                        <span className="text-red-600">{result.error}</span>
                      )}
                      {result.duration && (
                        <div className="text-muted-foreground">{result.duration}ms</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teste Manual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Play className="w-5 h-5" />
            Teste Manual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Teste um período específico de dias
          </p>
          
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="manual-days">Dias no Passado</Label>
              <Input
                id="manual-days"
                type="number"
                value={testDays}
                onChange={(e) => setTestDays(e.target.value)}
                placeholder="Ex: 30"
                min="1"
                max="365"
              />
            </div>
            <div>
              <Label htmlFor="manual-gtin">GTIN</Label>
              <Input
                id="manual-gtin"
                value={testGtin}
                onChange={(e) => setTestGtin(e.target.value)}
                placeholder="GTIN do produto"
              />
            </div>
            <div>
              <Label htmlFor="manual-cnpj">CNPJ</Label>
              <Input
                id="manual-cnpj"
                value={testCnpj}
                onChange={(e) => setTestCnpj(e.target.value)}
                placeholder="CNPJ do estabelecimento"
              />
            </div>
          </div>

          <Button 
            onClick={runManualTest} 
            disabled={isTestingManual}
            variant="outline"
          >
            {isTestingManual ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Testando...
              </>
            ) : (
              'Testar Período'
            )}
          </Button>

          {manualResult && (
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(manualResult)}
                  <span className="font-medium">Teste de {manualResult.days} dias</span>
                  {getStatusBadge(manualResult)}
                </div>
                <div className="text-right">
                  {manualResult.success ? (
                    <span className="text-green-600">{manualResult.recordCount} registros encontrados</span>
                  ) : (
                    <span className="text-red-600">{manualResult.error}</span>
                  )}
                  {manualResult.duration && (
                    <div className="text-sm text-muted-foreground">{manualResult.duration}ms</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}