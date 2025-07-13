
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SEFAZ_API_BASE_URL = "http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/"

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== NOVA REQUISIÇÃO INICIADA ===')
    console.log('Method:', req.method)
    console.log('Timestamp:', new Date().toISOString())
    
    // Validação do AppToken logo no início
    const appToken = Deno.env.get('SEFAZ_APP_TOKEN')
    console.log('✅ AppToken carregado com sucesso:', !!appToken)
    
    if (!appToken) {
      console.log('❌ ERRO CRÍTICO: SEFAZ_APP_TOKEN não configurado')
      return new Response(
        JSON.stringify({ error: "Token da API não configurado no servidor" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const { endpoint, data } = await req.json()
    
    console.log('=== DADOS DA REQUISIÇÃO ===')
    console.log('Endpoint:', endpoint)
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

    const fullUrl = `${SEFAZ_API_BASE_URL}${endpoint}`
    
    console.log('=== PREPARANDO CHAMADA PARA SEFAZ ===')
    console.log('URL completa:', fullUrl)
    console.log('Iniciando processo de requisição...')

    const requestHeaders = {
      'Content-Type': 'application/json',
      'AppToken': appToken,
      'Accept': 'application/json',
      'User-Agent': 'Monitoriza-Alagoas/1.0'
    }

    console.log('=== INICIANDO CHAMADA ÚNICA PARA SEFAZ ===')
    console.log('Iniciando chamada fetch para a API da SEFAZ...')
    
    const startTime = Date.now()
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: JSON.stringify(data)
    })
    
    const duration = Date.now() - startTime
    
    console.log(`✅ Resposta recebida da SEFAZ com status: ${response.status}`)
    console.log(`⏱️ Duração da requisição: ${duration}ms`)

    console.log('=== PROCESSANDO RESPOSTA DA SEFAZ ===')
    console.log('Status HTTP:', response.status)
    console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()))

    // Processar resposta
    let responseText
    try {
      responseText = await response.text()
      console.log('Tamanho da resposta:', responseText.length, 'caracteres')
      
      if (responseText.length > 1000) {
        console.log('Primeiros 500 caracteres da resposta:', responseText.substring(0, 500))
      } else {
        console.log('Resposta completa:', responseText)
      }
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
        console.log('✅ Resposta parseada como JSON com sucesso')
      } else {
        console.log('⚠️ Resposta vazia da API SEFAZ')
        responseData = { 
          message: "Resposta vazia da API SEFAZ",
          totalRegistros: 0,
          totalPaginas: 0,
          pagina: 1,
          conteudo: []
        }
      }
    } catch (parseError) {
      console.log('⚠️ Resposta não é JSON válido:', parseError.message)
      responseData = { 
        message: "Resposta da API SEFAZ não está em formato JSON",
        rawResponse: responseText.substring(0, 500), // Limitar tamanho
        statusCode: response.status,
        totalRegistros: 0,
        totalPaginas: 0,
        pagina: 1,
        conteudo: []
      }
    }

    // Verificar se a resposta indica sucesso
    if (response.ok) {
      console.log('✅ REQUISIÇÃO CONCLUÍDA COM SUCESSO')
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
          details: responseData
        }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

  } catch (error) {
    console.error('=== ERRO CRÍTICO NA EDGE FUNCTION ===')
    console.error('Tipo do erro:', error.constructor.name)
    console.error('Mensagem do erro:', error.message)
    console.error('Stack trace:', error.stack)
    
    // Retorno estruturado para erro interno
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
