import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    const { method, searchParams } = new URL(req.url)
    
    if (req.method === 'GET') {
      // Health check endpoint
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: new Date().toISOString(),
        endpoints: {
          '/': 'Health check',
          '/?item_id=X': 'Test specific tracked item',
          '/?test_product=true': 'Test product API call',
          '/?test_fuel=true': 'Test fuel API call'
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (req.method === 'POST') {
      const body = await req.json()
      const { endpoint, payload, itemId } = body

      console.log(`🧪 Debug SEFAZ API call`)
      console.log(`📍 Endpoint: ${endpoint}`)
      console.log(`📦 Payload:`, JSON.stringify(payload, null, 2))
      console.log(`🆔 Item ID: ${itemId || 'N/A'}`)

      // Call SEFAZ API through proxy
      const response = await fetch(`${supabaseUrl}/functions/v1/sefaz-api-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          payload
        })
      })

      const responseHeaders = Object.fromEntries(response.headers.entries())
      console.log(`📡 SEFAZ Response:`, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      })

      let responseData
      const contentType = response.headers.get('content-type')
      
      if (contentType?.includes('application/json')) {
        responseData = await response.json()
      } else {
        responseData = await response.text()
      }

      console.log(`📊 Response data:`, responseData)

      return new Response(JSON.stringify({
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        data: responseData,
        debug: {
          endpoint,
          payload,
          itemId,
          timestamp: new Date().toISOString()
        }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Handle GET with query parameters
    const itemId = searchParams.get('item_id')
    const testProduct = searchParams.get('test_product')
    const testFuel = searchParams.get('test_fuel')

    if (itemId) {
      // Test specific tracked item
      const { data: item, error } = await supabase
        .from('tracked_items')
        .select('*')
        .eq('id', itemId)
        .single()

      if (error || !item) {
        return new Response(JSON.stringify({
          error: 'Item not found',
          itemId
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      console.log(`🔍 Testing item ${itemId}:`, item.nickname)
      
      // Test the SEFAZ API call for this item
      const endpoint = item.item_type === 'combustivel' ? 'combustivel' : 'produto'
      const response = await fetch(`${supabaseUrl}/functions/v1/sefaz-api-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint,
          payload: item.search_criteria
        })
      })

      const responseData = response.ok ? await response.json() : await response.text()

      return new Response(JSON.stringify({
        item: {
          id: item.id,
          nickname: item.nickname,
          item_type: item.item_type,
          search_criteria: item.search_criteria,
          is_active: item.is_active
        },
        sefazTest: {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          data: responseData
        },
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (testProduct) {
      // Test product API with sample data
      const sampleProductPayload = {
        dias: 1,
        produto: {
          gtin: "7891000325858",
          descricao: "LEITE PO NINHO"
        },
        estabelecimento: {
          individual: {
            cnpj: "59008895000234"
          }
        }
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/sefaz-api-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'produto',
          payload: sampleProductPayload
        })
      })

      const responseData = response.ok ? await response.json() : await response.text()

      return new Response(JSON.stringify({
        test: 'Product API Test',
        payload: sampleProductPayload,
        result: {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          data: responseData
        },
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (testFuel) {
      // Test fuel API with sample data
      const sampleFuelPayload = {
        dias: 1,
        produto: {
          tipoCombustivel: 1
        },
        estabelecimento: {
          individual: {
            cnpj: "32876089000140"
          }
        }
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/sefaz-api-proxy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          endpoint: 'combustivel',
          payload: sampleFuelPayload
        })
      })

      const responseData = response.ok ? await response.json() : await response.text()

      return new Response(JSON.stringify({
        test: 'Fuel API Test',
        payload: sampleFuelPayload,
        result: {
          success: response.ok,
          status: response.status,
          statusText: response.statusText,
          data: responseData
        },
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Default response
    return new Response(JSON.stringify({
      error: 'Invalid request',
      usage: 'Use query parameters: ?item_id=X, ?test_product=true, or ?test_fuel=true'
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Debug endpoint error:', error)
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})