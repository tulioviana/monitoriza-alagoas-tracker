import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

// CORS headers para permitir acesso do frontend
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// URL base da API SEFAZ Alagoas - SEM barra final
const BASE_URL = 'http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public'

// Função para converter e validar dados do payload - VERSÃO CORRIGIDA V2
function convertPayloadTypes(payload: any): any {
  console.log('=== CONVERTENDO TIPOS DE DADOS PARA SEFAZ ===')
  console.log('Payload original:', JSON.stringify(payload, null, 2))

  const convertedPayload = JSON.parse(JSON.stringify(payload))

  // CORREÇÃO CRÍTICA 1: Validação e sanitização completa de CNPJ
  if (convertedPayload.estabelecimento?.individual?.cnpj) {
    const cnpjOriginal = convertedPayload.estabelecimento.individual.cnpj
    const cnpjLimpo = String(cnpjOriginal).replace(/\D/g, '')
    
    console.log('🔄 Convertendo CNPJ:')
    console.log('  - Original:', cnpjOriginal)
    console.log('  - Convertido:', cnpjLimpo)
    
    // Validação de CNPJ (deve ter 14 dígitos)
    if (cnpjLimpo.length !== 14) {
      console.log('❌ CNPJ inválido (não possui 14 dígitos):', cnpjLimpo)
      throw new Error(`CNPJ inválido: ${cnpjOriginal} - deve conter exatamente 14 dígitos`)
    }
    
    convertedPayload.estabelecimento.individual.cnpj = cnpjLimpo
  }

  // CORREÇÃO CRÍTICA 2: Validação de GTIN (produtos)
  if (convertedPayload.produto?.gtin) {
    const gtinOriginal = convertedPayload.produto.gtin
    const gtinLimpo = String(gtinOriginal).replace(/\D/g, '')
    
    console.log('🔄 Convertendo GTIN:')
    console.log('  - Original:', gtinOriginal)
    console.log('  - Convertido:', gtinLimpo)
    
    // Validação básica de GTIN
    if (gtinLimpo.length < 8 || gtinLimpo.length > 14) {
      console.log('⚠️ GTIN com formato suspeito:', gtinLimpo, 'length:', gtinLimpo.length)
    }
    
    convertedPayload.produto.gtin = gtinLimpo
  }

  // CORREÇÃO CRÍTICA 3: Conversão segura de tipoCombustivel
  if (convertedPayload.produto?.tipoCombustivel !== undefined) {
    const tipoOriginal = convertedPayload.produto.tipoCombustivel
    const tipoNumerico = parseInt(String(tipoOriginal), 10)
    
    console.log('🔄 Convertendo tipoCombustivel:')
    console.log('  - Original:', tipoOriginal, typeof tipoOriginal)
    console.log('  - Convertido:', tipoNumerico, typeof tipoNumerico)
    
    if (isNaN(tipoNumerico)) {
      throw new Error(`Tipo de combustível inválido: ${tipoOriginal}`)
    }
    
    convertedPayload.produto.tipoCombustivel = tipoNumerico
  }

  // CORREÇÃO CRÍTICA 4: Conversão segura de dias (obrigatório)
  if (convertedPayload.dias !== undefined) {
    const diasOriginal = convertedPayload.dias
    const diasNumerico = parseInt(String(diasOriginal), 10)
    
    console.log('🔄 Convertendo dias:')
    console.log('  - Original:', diasOriginal, typeof diasOriginal)
    console.log('  - Convertido:', diasNumerico, typeof diasNumerico)
    
    if (isNaN(diasNumerico) || diasNumerico <= 0) {
      console.log('⚠️ Dias inválido, usando default 1')
      convertedPayload.dias = 1
    } else {
      convertedPayload.dias = diasNumerico
    }
  } else {
    convertedPayload.dias = 1
    console.log('🔄 Dias não definido, usando default: 1')
  }

  // CORREÇÃO CRÍTICA 5: Conversão segura de código IBGE
  if (convertedPayload.estabelecimento?.municipio?.codigoIBGE !== undefined) {
    const codigoOriginal = convertedPayload.estabelecimento.municipio.codigoIBGE
    const codigoNumerico = parseInt(String(codigoOriginal).replace(/\D/g, ''), 10)
    
    console.log('🔄 Convertendo codigoIBGE:')
    console.log('  - Original:', codigoOriginal, typeof codigoOriginal)
    console.log('  - Convertido:', codigoNumerico, typeof codigoNumerico)
    
    if (isNaN(codigoNumerico)) {
      throw new Error(`Código IBGE inválido: ${codigoOriginal}`)
    }
    
    convertedPayload.estabelecimento.municipio.codigoIBGE = codigoNumerico
  }

  // CORREÇÃO CRÍTICA 6: Sanitização de descrição
  if (convertedPayload.produto?.descricao) {
    const descOriginal = convertedPayload.produto.descricao
    const descLimpa = String(descOriginal).trim().substring(0, 100)
    
    console.log('🔄 Convertendo descrição:')
    console.log('  - Original:', descOriginal)
    console.log('  - Convertido:', descLimpa)
    
    convertedPayload.produto.descricao = descLimpa
  }

  // CORREÇÃO CRÍTICA 7: Remover campos vazios que causam erro 400
  const removeEmptyFields = (obj: any): any => {
    if (Array.isArray(obj)) {
      return obj.map(removeEmptyFields).filter(item => item !== null && item !== undefined)
    } else if (obj && typeof obj === 'object') {
      const cleaned: any = {}
      for (const [key, value] of Object.entries(obj)) {
        if (value !== null && value !== undefined && value !== '') {
          if (typeof value === 'object') {
            const cleanedValue = removeEmptyFields(value)
            if (Array.isArray(cleanedValue) ? cleanedValue.length > 0 : Object.keys(cleanedValue).length > 0) {
              cleaned[key] = cleanedValue
            }
          } else {
            cleaned[key] = value
          }
        }
      }
      return cleaned
    }
    return obj
  }

  const finalPayload = removeEmptyFields(convertedPayload)

  // CORREÇÃO CRÍTICA 8: Validação final da estrutura
  if (!finalPayload.estabelecimento?.individual?.cnpj) {
    throw new Error('CNPJ do estabelecimento é obrigatório')
  }

  if (!finalPayload.dias || finalPayload.dias <= 0) {
    throw new Error('Dias deve ser um número positivo')
  }

  console.log('✅ Payload final validado:', JSON.stringify(finalPayload, null, 2))
  
  return finalPayload
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('=== REQUISIÇÃO OPTIONS (PREFLIGHT) ===')
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
          timestamp: new Date().toISOString(),
          baseUrl: BASE_URL,
          hasToken: !!Deno.env.get('SEFAZ_APP_TOKEN')
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Validação do AppToken
    const appToken = Deno.env.get('SEFAZ_APP_TOKEN')
    console.log('=== DIAGNÓSTICO DO TOKEN ===')
    console.log('✅ AppToken presente:', !!appToken)
    console.log('✅ AppToken length:', appToken?.length || 0)
    console.log('✅ AppToken primeiros 10 caracteres:', appToken?.substring(0, 10) || 'N/A')
    
    if (!appToken) {
      console.log('❌ ERRO CRÍTICO: SEFAZ_APP_TOKEN não configurado')
      return new Response(
        JSON.stringify({ 
          error: "Token da API não configurado no servidor",
          diagnosis: "SEFAZ_APP_TOKEN não encontrado nas variáveis de ambiente"
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Parse da requisição
    const { endpoint, payload } = await req.json()
    
    console.log('=== DADOS DA REQUISIÇÃO ===')
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

    // CONVERSÃO CRÍTICA: Converter e validar dados
    let convertedPayload
    try {
      convertedPayload = convertPayloadTypes(payload)
    } catch (validationError) {
      console.log('❌ Erro na validação de dados:', validationError.message)
      return new Response(
        JSON.stringify({ 
          error: "Dados inválidos enviados para a API SEFAZ",
          details: validationError.message
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Construção da URL
    const fullUrl = `${BASE_URL}/${endpoint}`
    
    console.log('=== PREPARANDO CHAMADA PARA SEFAZ ===')
    console.log('URL oficial SEFAZ:', fullUrl)
    console.log('Token configurado:', !!appToken)

    // Headers da requisição
    const headers = {
      'Content-Type': 'application/json',
      'AppToken': appToken
    }

    console.log('=== HEADERS DA REQUISIÇÃO ===')
    console.log('Headers enviados:', JSON.stringify(headers, null, 2))

    console.log('=== DADOS ENVIADOS PARA SEFAZ (CONVERTIDOS) ===')
    console.log('Payload:', JSON.stringify(convertedPayload, null, 2))

    // CHAMADA PARA A API SEFAZ
    console.log('=== INICIANDO CHAMADA PARA SEFAZ (PADRÃO OURO) ===')
    
    const startTime = Date.now()
    
    const sefazResponse = await fetch(fullUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(convertedPayload)
    })
    
    const duration = Date.now() - startTime
    console.log(`⏱️ Duração da requisição: ${duration}ms`)

    console.log('=== PROCESSANDO RESPOSTA DA SEFAZ ===')
    console.log('Status HTTP:', sefazResponse.status)
    console.log('Status Text:', sefazResponse.statusText)
    console.log('✅ Resposta recebida da SEFAZ com status:', sefazResponse.status)

    // Headers da resposta
    const responseHeaders = Object.fromEntries(sefazResponse.headers.entries())
    console.log('Headers da resposta:', JSON.stringify(responseHeaders, null, 2))

    // Leitura da resposta
    const responseText = await sefazResponse.text()
    console.log('Tamanho da resposta:', responseText.length, 'caracteres')
    console.log('Código de status:', sefazResponse.status)
    console.log('Status text:', sefazResponse.statusText)
    
    console.log('✅ Resposta lida com sucesso')

    // Parse da resposta
    let responseData
    try {
      responseData = JSON.parse(responseText)
      console.log('✅ Resposta parseada como JSON com sucesso')
    } catch (parseError) {
      console.log('❌ Erro ao fazer parse da resposta JSON:', parseError.message)
      console.log('Resposta raw:', responseText)
      
      return new Response(
        JSON.stringify({
          error: "Resposta da SEFAZ não é um JSON válido",
          statusCode: sefazResponse.status,
          statusText: sefazResponse.statusText,
          response: responseText
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Resposta completa:', JSON.stringify(responseData, null, 2))

    // Verificação de sucesso
    if (!sefazResponse.ok) {
      console.log('❌ Resposta com erro da SEFAZ')
      
      return new Response(
        JSON.stringify({
          error: "Dados inválidos enviados para a API SEFAZ",
          statusCode: sefazResponse.status,
          statusText: sefazResponse.statusText,
          details: responseData,
          url: fullUrl
        }),
        { 
          status: sefazResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('✅ Resposta da SEFAZ processada com sucesso')

    // Retornar resposta de sucesso
    return new Response(
      JSON.stringify(responseData),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ ERRO GERAL na Edge Function:', error.message)
    console.error('Stack trace:', error.stack)
    
    return new Response(
      JSON.stringify({ 
        error: "Erro interno do servidor",
        message: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})