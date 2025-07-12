
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
    
    console.log('Requisição recebida do frontend:', JSON.stringify({ endpoint, data }, null, 2))
    
    if (!endpoint || !data) {
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
      return new Response(
        JSON.stringify({ error: "Token da API não configurado" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Making request to SEFAZ API: ${endpoint}`)
    console.log('Request data:', JSON.stringify(data, null, 2))

    // Make the request to SEFAZ API
    const response = await fetch(`${SEFAZ_API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'AppToken': appToken
      },
      body: JSON.stringify(data)
    })

    const responseData = await response.json()
    
    console.log('SEFAZ API response status:', response.status)
    console.log('SEFAZ API response:', JSON.stringify(responseData, null, 2))

    return new Response(
      JSON.stringify(responseData),
      {
        status: response.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in sefaz-api-proxy:', error)
    return new Response(
      JSON.stringify({ 
        error: "Erro interno do servidor",
        details: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
