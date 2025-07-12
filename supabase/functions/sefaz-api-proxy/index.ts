
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const SEFAZ_API_BASE_URL = "http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/"

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { endpoint, data } = await req.json()
    
    console.log('=== REQUISIÇÃO RECEBIDA DO FRONTEND ===')
    console.log('Endpoint:', endpoint)
    console.log('Data:', JSON.stringify(data, null, 2))
    
    if (!endpoint || !data) {
      console.log('❌ Erro: Endpoint ou dados ausentes')
      return new Response(
        JSON.stringify({ error: "Endpoint e dados são obrigatórios" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validação específica para busca por município
    if (data.estabelecimento?.municipio && !data.estabelecimento.municipio.codigoIBGE) {
      console.log('❌ Erro: codigoIBGE ausente para busca por município')
      return new Response(
        JSON.stringify({ error: "Estrutura da requisição inválida. É esperado o campo 'codigoIBGE' para busca por município." }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the AppToken from environment variables
    const appToken = Deno.env.get('SEFAZ_APP_TOKEN')
    if (!appToken) {
      console.log('❌ Erro: Token da API não configurado')
      return new Response(
        JSON.stringify({ error: "Token da API não configurado" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const fullUrl = `${SEFAZ_API_BASE_URL}${endpoint}`
    
    console.log('=== PREPARANDO REQUISIÇÃO PARA SEFAZ ===')
    console.log('URL completa:', fullUrl)
    console.log('AppToken presente:', !!appToken)
    console.log('Dados para envio:', JSON.stringify(data, null, 2))

    // Make the request to SEFAZ API
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AppToken': appToken,
        'User-Agent': 'Monitoriza-Alagoas/1.0'
      },
      body: JSON.stringify(data),
      // Timeout de 30 segundos
      signal: AbortSignal.timeout(30000)
    })

    console.log('=== RESPOSTA DA SEFAZ ===')
    console.log('Status:', response.status)
    console.log('Status Text:', response.statusText)
    console.log('Headers:', Object.fromEntries(response.headers.entries()))

    let responseData
    const contentType = response.headers.get('content-type')
    
    if (contentType && contentType.includes('application/json')) {
      responseData = await response.json()
    } else {
      const textResponse = await response.text()
      console.log('Resposta não-JSON recebida:', textResponse)
      responseData = { 
        error: "Resposta inválida da API", 
        details: textResponse,
        status: response.status 
      }
    }
    
    console.log('Dados da resposta:', JSON.stringify(responseData, null, 2))

    // Se a resposta não foi bem-sucedida, mas temos dados, ainda retornamos
    if (!response.ok) {
      console.log('❌ Resposta com erro da SEFAZ')
      return new Response(
        JSON.stringify({
          error: `Erro da API SEFAZ (${response.status})`,
          details: responseData,
          sefazStatus: response.status
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Sucesso - retornando dados')
    return new Response(
      JSON.stringify(responseData),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('=== ERRO GERAL ===')
    console.error('Tipo do erro:', error.constructor.name)
    console.error('Mensagem:', error.message)
    console.error('Stack:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: "Erro interno do servidor",
        details: error.message,
        errorType: error.constructor.name,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
