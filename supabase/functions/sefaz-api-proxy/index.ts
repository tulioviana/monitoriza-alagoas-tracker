
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { corsHeaders } from '../_shared/cors.ts'

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

    // Otimização: Reduzir tentativas e timeout para evitar 503
    let response
    let lastError
    const maxRetries = 2 // Reduzido de 3 para 2
    const timeoutMs = 20000 // Reduzido de 30s para 20s
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`=== TENTATIVA ${attempt}/${maxRetries} ===`)
        console.log('Iniciando chamada fetch para a API da SEFAZ...')
        
        const controller = new AbortController()
        const timeoutId = setTimeout(() => {
          console.log(`⏰ Timeout atingido na tentativa ${attempt} (${timeoutMs}ms)`)
          controller.abort()
        }, timeoutMs)
        
        const startTime = Date.now()
        
        response = await fetch(fullUrl, {
          method: 'POST',
          headers: requestHeaders,
          body: JSON.stringify(data),
          signal: controller.signal
        })
        
        clearTimeout(timeoutId)
        const duration = Date.now() - startTime
        
        console.log(`✅ Resposta recebida da SEFAZ com status: ${response.status}`)
        console.log(`⏱️ Duração da requisição: ${duration}ms`)
        break
        
      } catch (error) {
        const errorMsg = error.name === 'AbortError' ? 'Timeout' : error.message
        console.log(`❌ Tentativa ${attempt} falhou: ${errorMsg}`)
        lastError = error
        
        if (attempt < maxRetries) {
          console.log('Aguardando 1 segundo antes da próxima tentativa...')
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    }

    if (!response) {
      console.log('❌ TODAS AS TENTATIVAS FALHARAM')
      console.error('Último erro capturado:', lastError?.message)
      
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
