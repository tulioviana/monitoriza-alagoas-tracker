
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// URL base sem barra final para evitar dupla barra (padrão ouro)
const BASE_URL = 'http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('=== REQUISIÇÃO OPTIONS (PREFLIGHT) ===')
    console.log('Method:', req.method)
    console.log('URL:', req.url)
    console.log('Headers da requisição:', Object.fromEntries(req.headers.entries()))
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    console.log('=== EDGE FUNCTION EXECUTANDO COM SUCESSO ===')
    console.log('Method:', req.method)
    console.log('URL:', req.url)
    console.log('Timestamp:', new Date().toISOString())
    
    // Health check endpoint
    if (req.method === 'GET') {
      console.log('✅ Health check executado com sucesso')
      return new Response(
        JSON.stringify({ 
          status: 'ok', 
          message: 'Edge Function está funcionando',
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validação do AppToken logo no início
    const appToken = Deno.env.get('SEFAZ_APP_TOKEN')
    console.log('✅ AppToken presente:', !!appToken)
    console.log('✅ AppToken length:', appToken?.length || 0)
    
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

    // Implementação do padrão ouro: padronização payload
    const { endpoint, payload } = await req.json()
    
    console.log('=== DADOS DA REQUISIÇÃO (PADRÃO OURO) ===')
    console.log('Endpoint solicitado:', endpoint)
    console.log('Payload recebido:', JSON.stringify(payload, null, 2))
    
    // Validação básica
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

    if (!payload) {
      console.log('❌ Erro: Payload não informado')
      return new Response(
        JSON.stringify({ error: "Payload é obrigatório" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Construção da URL conforme padrão ouro (sem dupla barra)
    const fullUrl = `${BASE_URL}/${endpoint}`
    
    console.log('=== PREPARANDO CHAMADA PARA SEFAZ ===')
    console.log('URL oficial SEFAZ:', fullUrl)
    console.log('Token configurado:', !!appToken)

    // Headers conforme especificação técnica oficial
    const requestHeaders = {
      'Content-Type': 'application/json',
      'AppToken': appToken,
    }

    console.log('=== HEADERS DA REQUISIÇÃO ===')
    console.log('Headers enviados:', JSON.stringify(requestHeaders, null, 2))

    console.log('=== DADOS ENVIADOS PARA SEFAZ ===')
    console.log('Payload:', JSON.stringify(payload, null, 2))

    console.log('=== INICIANDO CHAMADA PARA SEFAZ (PADRÃO OURO) ===')
    const startTime = Date.now()
    
    // Implementação do padrão ouro da requisição HTTP
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AppToken': appToken
      },
      body: JSON.stringify(payload)
    })
    
    const duration = Date.now() - startTime
    console.log(`✅ Resposta recebida da SEFAZ com status: ${response.status}`)
    console.log(`⏱️ Duração da requisição: ${duration}ms`)

    console.log('=== PROCESSANDO RESPOSTA DA SEFAZ ===')
    console.log('Status HTTP:', response.status)
    console.log('Status Text:', response.statusText)
    console.log('Headers da resposta:', Object.fromEntries(response.headers.entries()))

    // Processar resposta
    let responseText
    try {
      responseText = await response.text()
      console.log('✅ Resposta lida com sucesso')
      console.log('Tamanho da resposta:', responseText.length, 'caracteres')
      
      if (responseText.length > 1000) {
        console.log('Primeiros 500 caracteres da resposta:', responseText.substring(0, 500))
        console.log('Últimos 200 caracteres da resposta:', responseText.substring(responseText.length - 200))
      } else {
        console.log('Resposta completa:', responseText)
      }
    } catch (error) {
      console.log('❌ Erro ao ler corpo da resposta:', error.message)
      return new Response(
        JSON.stringify({ 
          error: "Erro ao processar resposta da API SEFAZ",
          details: "Não foi possível ler o corpo da resposta",
          statusCode: response.status
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
        
        // Log de alguns campos importantes se existirem
        if (responseData.totalRegistros !== undefined) {
          console.log('📊 Total de registros encontrados:', responseData.totalRegistros)
        }
        if (responseData.conteudo && Array.isArray(responseData.conteudo)) {
          console.log('📦 Número de itens no conteúdo:', responseData.conteudo.length)
        }
      } else {
        console.log('⚠️ Resposta vazia da API SEFAZ')
        responseData = { 
          message: "Resposta vazia da API SEFAZ",
          statusCode: response.status,
          totalRegistros: 0,
          totalPaginas: 0,
          pagina: 1,
          conteudo: []
        }
      }
    } catch (parseError) {
      console.log('⚠️ Resposta não é JSON válido:', parseError.message)
      console.log('Raw response que falhou no parse:', responseText.substring(0, 200))
      
      responseData = { 
        message: "Resposta da API SEFAZ não está em formato JSON",
        rawResponse: responseText.substring(0, 500),
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
      console.log('🎉 Retornando dados para o frontend')
      
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
      console.log('Status text:', response.statusText)
      
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
          url: fullUrl
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
