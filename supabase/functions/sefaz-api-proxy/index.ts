
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

const SEFAZ_API_BASE_URL = "http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/"

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== NOVA REQUISIÇÃO RECEBIDA ===')
    console.log('Method:', req.method)
    console.log('Headers:', Object.fromEntries(req.headers.entries()))
    
    const { endpoint, data } = await req.json()
    
    console.log('=== DADOS DA REQUISIÇÃO ===')
    console.log('Endpoint solicitado:', endpoint)
    console.log('Dados recebidos:', JSON.stringify(data, null, 2))
    
    // Validação básica apenas para campos obrigatórios
    if (!endpoint) {
      console.log('❌ Erro: Endpoint não informado')
      return new Response(
        JSON.stringify({ error: "Endpoint é obrigatório" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!data) {
      console.log('❌ Erro: Dados não informados')
      return new Response(
        JSON.stringify({ error: "Dados são obrigatórios" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the AppToken from environment variables
    const appToken = Deno.env.get('SEFAZ_APP_TOKEN')
    if (!appToken) {
      console.log('❌ Erro: SEFAZ_APP_TOKEN não configurado')
      return new Response(
        JSON.stringify({ error: "Token da API não configurado no servidor" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const fullUrl = `${SEFAZ_API_BASE_URL}${endpoint}`
    
    console.log('=== PREPARANDO CHAMADA PARA SEFAZ ===')
    console.log('URL completa:', fullUrl)
    console.log('AppToken configurado:', appToken ? 'SIM' : 'NÃO')
    console.log('Payload para envio:', JSON.stringify(data, null, 2))

    const requestHeaders = {
      'Content-Type': 'application/json',
      'AppToken': appToken,
      'Accept': 'application/json',
      'User-Agent': 'Monitoriza-Alagoas/1.0'
    }

    console.log('Headers da requisição:', JSON.stringify(requestHeaders, null, 2))

    // Fazer múltiplas tentativas em caso de timeout
    let response
    let lastError
    const maxRetries = 3
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`=== TENTATIVA ${attempt}/${maxRetries} ===`)
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 30000)
        
        response = await fetch(fullUrl, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(data),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        console.log(`✅ Tentativa ${attempt} bem-sucedida`)
        break
        
      } catch (error) {
        console.log(`❌ Tentativa ${attempt} falhou:`, error.message)
        lastError = error
        
        if (attempt < maxRetries) {
          console.log('Aguardando 2 segundos antes da próxima tentativa...')
          await new Promise(resolve => setTimeout(resolve, 2000))
        }
      }
    }

    if (!response) {
      console.log('❌ Todas as tentativas falharam')
      return new Response(
        JSON.stringify({ 
          error: "Falha na comunicação com a API SEFAZ após múltiplas tentativas",
          details: lastError?.message || "Timeout ou erro de rede",
          attempts: maxRetries
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('=== RESPOSTA DA SEFAZ RECEBIDA ===')
    console.log('Status HTTP:', response.status)
    console.log('Status Text:', response.statusText)
    console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()))

    // Tentar ler a resposta como texto primeiro
    let responseText
    try {
      responseText = await response.text()
      console.log('Corpo da resposta (texto):', responseText)
    } catch (error) {
      console.log('❌ Erro ao ler corpo da resposta:', error.message)
      return new Response(
        JSON.stringify({ 
          error: "Erro ao processar resposta da API SEFAZ",
          details: "Não foi possível ler o corpo da resposta"
        }),
        { 
          status: 502, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Tentar parsear como JSON
    let responseData
    try {
      if (responseText.trim()) {
        responseData = JSON.parse(responseText)
        console.log('Dados parseados como JSON:', JSON.stringify(responseData, null, 2))
      } else {
        console.log('⚠️ Resposta vazia da API SEFAZ')
        responseData = { message: "Resposta vazia da API SEFAZ" }
      }
    } catch (parseError) {
      console.log('⚠️ Resposta não é JSON válido, retornando como texto')
      responseData = { 
        message: "Resposta da API SEFAZ não está em formato JSON",
        rawResponse: responseText,
        statusCode: response.status
      }
    }

    // Verificar se a resposta indica sucesso
    if (response.ok) {
      console.log('✅ Resposta bem-sucedida da SEFAZ')
      return new Response(
        JSON.stringify(responseData),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    } else {
      console.log('❌ Resposta com erro da SEFAZ')
      console.log('Código de status:', response.status)
      console.log('Dados de erro:', JSON.stringify(responseData, null, 2))
      
      // Retornar erro mais específico baseado no status
      let errorMessage = "Erro na API SEFAZ"
      if (response.status === 400) {
        errorMessage = "Dados inválidos enviados para a API SEFAZ"
      } else if (response.status === 401) {
        errorMessage = "Token de acesso inválido ou expirado"
      } else if (response.status === 404) {
        errorMessage = "Endpoint não encontrado na API SEFAZ"
      } else if (response.status >= 500) {
        errorMessage = "Erro interno da API SEFAZ"
      }
      
      return new Response(
        JSON.stringify({
          error: errorMessage,
          statusCode: response.status,
          statusText: response.statusText,
          details: responseData,
          apiResponse: responseText
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('=== ERRO GERAL NA EDGE FUNCTION ===')
    console.error('Tipo do erro:', error.constructor.name)
    console.error('Mensagem do erro:', error.message)
    console.error('Stack trace:', error.stack)
    
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
