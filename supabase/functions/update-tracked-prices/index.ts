import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RetryOptions {
  maxRetries: number
  delayMs: number
}

async function retryOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = { maxRetries: 3, delayMs: 1000 }
): Promise<T> {
  let lastError: Error | null = null
  
  for (let attempt = 1; attempt <= options.maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      console.log(`⚠️ Attempt ${attempt}/${options.maxRetries} failed:`, error)
      
      if (attempt < options.maxRetries) {
        console.log(`⏳ Waiting ${options.delayMs}ms before retry...`)
        await new Promise(resolve => setTimeout(resolve, options.delayMs))
      }
    }
  }
  
  throw lastError
}

function validateSearchCriteria(searchCriteria: any, itemType: string): boolean {
  console.log(`🔍 Validating search criteria for ${itemType}:`, JSON.stringify(searchCriteria, null, 2))
  
  // Basic validation
  if (!searchCriteria?.estabelecimento?.individual?.cnpj) {
    console.error('❌ Missing CNPJ in search criteria')
    return false
  }
  
  // Product-specific validation
  if (itemType === 'produto') {
    if (!searchCriteria.produto?.gtin && !searchCriteria.produto?.descricao) {
      console.error('❌ Products require either GTIN or description')
      return false
    }
  }
  
  // Fuel-specific validation
  if (itemType === 'combustivel') {
    if (!searchCriteria.produto?.tipoCombustivel) {
      console.error('❌ Fuels require tipoCombustivel')
      return false
    }
  }
  
  console.log('✅ Search criteria validation passed')
  return true
}

async function callSefazAPI(supabaseUrl: string, supabaseKey: string, endpoint: string, payload: any, itemId: number): Promise<any> {
  console.log(`🌐 Calling SEFAZ API for item ${itemId}`)
  console.log(`📍 Endpoint: ${endpoint}`)
  console.log(`📦 Payload:`, JSON.stringify(payload, null, 2))
  
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

  console.log(`📡 SEFAZ API Response for item ${itemId}:`, {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`❌ SEFAZ API Error for item ${itemId}:`, {
      status: response.status,
      statusText: response.statusText,
      body: errorText
    })
    
    // Handle specific error codes
    if (response.status === 406) {
      throw new Error(`SEFAZ API returned 406 (Not Acceptable) - possible header or content-type issue`)
    }
    if (response.status >= 500) {
      throw new Error(`SEFAZ API server error: ${response.status}`)
    }
    
    throw new Error(`SEFAZ API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  console.log(`✅ SEFAZ API Response data for item ${itemId}:`, {
    hasVenda: !!data?.venda,
    vendaCount: data?.venda?.length || 0,
    firstVenda: data?.venda?.[0] ? {
      estabelecimento: data.venda[0].estabelecimento?.cnpj,
      precoVenda: data.venda[0].precoVenda,
      dataVenda: data.venda[0].dataVenda
    } : null
  })
  
  return data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const sefazToken = Deno.env.get('SEFAZ_APP_TOKEN')!
  
  const supabase = createClient(supabaseUrl, supabaseKey)

  try {
    console.log('🚀 Starting price update job...')

    // Fetch all active tracked items
    const { data: trackedItems, error: trackedError } = await supabase
      .from('tracked_items')
      .select('*')
      .eq('is_active', true)

    if (trackedError) {
      console.error('❌ Error fetching tracked items:', trackedError)
      throw trackedError
    }

    console.log(`📊 Processing ${trackedItems?.length || 0} tracked items`)

    // Separate items by type for better monitoring
    const products = trackedItems?.filter(item => item.item_type === 'produto') || []
    const fuels = trackedItems?.filter(item => item.item_type === 'combustivel') || []
    
    console.log(`🛍️ Products to process: ${products.length}`)
    console.log(`⛽ Fuels to process: ${fuels.length}`)

    for (const item of trackedItems || []) {
      console.log(`\n🔄 Processing item ${item.id} (${item.item_type}): ${item.nickname}`)
      
      try {
        // Validate search criteria
        if (!validateSearchCriteria(item.search_criteria, item.item_type)) {
          console.error(`❌ Invalid search criteria for item ${item.id}`)
          continue
        }

        // Call SEFAZ API with retry logic
        const sefazData = await retryOperation(
          () => callSefazAPI(
            supabaseUrl, 
            supabaseKey, 
            item.item_type === 'combustivel' ? 'combustivel' : 'produto',
            item.search_criteria,
            item.id
          ),
          { maxRetries: 3, delayMs: 2000 }
        )
        
        if (!sefazData?.venda || sefazData.venda.length === 0) {
          console.log(`⚠️ No sales data found for item ${item.id}`)
          continue
        }

        console.log(`📊 Processing ${sefazData.venda.length} sales records for item ${item.id}`)

        // Process each sale record
        for (const venda of sefazData.venda) {
          console.log(`💰 Processing sale for item ${item.id}:`, {
            estabelecimentoCnpj: venda.estabelecimento?.cnpj,
            precoVenda: venda.precoVenda,
            dataVenda: venda.dataVenda
          })

          // Upsert establishment data
          if (venda.estabelecimento) {
            console.log(`🏢 Upserting establishment: ${venda.estabelecimento.cnpj}`)
            const { error: estError } = await supabase
              .from('establishments')
              .upsert({
                cnpj: venda.estabelecimento.cnpj,
                razao_social: venda.estabelecimento.razaoSocial || 'Unknown',
                nome_fantasia: venda.estabelecimento.nomeFantasia,
                address_json: venda.estabelecimento.endereco || {}
              })

            if (estError) {
              console.error(`❌ Error upserting establishment for item ${item.id}:`, estError)
            } else {
              console.log(`✅ Establishment upserted successfully for item ${item.id}`)
            }
          }

          // Insert price history
          console.log(`📈 Inserting price history for item ${item.id}`)
          const { error: priceError } = await supabase
            .from('price_history')
            .insert({
              tracked_item_id: item.id,
              establishment_cnpj: venda.estabelecimento?.cnpj,
              sale_price: parseFloat(venda.precoVenda),
              declared_price: venda.precoDeclarado ? parseFloat(venda.precoDeclarado) : null,
              sale_date: venda.dataVenda,
              fetch_date: new Date().toISOString()
            })

          if (priceError) {
            console.error(`❌ Error inserting price history for item ${item.id}:`, priceError)
          } else {
            console.log(`✅ Price history inserted successfully for item ${item.id}`)
          }
        }

      } catch (error) {
        console.error(`❌ Error processing item ${item.id}:`, error)
        console.error(`🔍 Error details:`, {
          message: error.message,
          stack: error.stack,
          itemType: item.item_type,
          searchCriteria: item.search_criteria
        })
      }
    }

    // Get all active competitors
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitor_tracking')
      .select('*')
      .eq('is_active', true)

    if (competitorsError) {
      console.error('❌ Error fetching competitors:', competitorsError)
    } else {
      console.log(`📊 Processing ${competitors?.length || 0} competitors`)
    }

    // Process competitors with retry logic
    let processedCompetitors = 0
    for (const competitor of competitors || []) {
      try {
        console.log(`\n🏪 Processing competitor ${competitor.id}: ${competitor.competitor_name || competitor.competitor_cnpj}`)
        
        const competitorPayload = {
          dias: 1,
          estabelecimento: {
            individual: {
              cnpj: competitor.competitor_cnpj
            }
          }
        }

        const sefazData = await retryOperation(
          () => callSefazAPI(supabaseUrl, supabaseKey, 'produto', competitorPayload, competitor.id),
          { maxRetries: 3, delayMs: 2000 }
        )
        
        if (!sefazData?.venda || sefazData.venda.length === 0) {
          console.log(`⚠️ No sales data found for competitor ${competitor.id}`)
          continue
        }

        // Process each sale record for competitor
        for (const venda of sefazData.venda) {
          // Upsert establishment data
          if (venda.estabelecimento) {
            await supabase
              .from('establishments')
              .upsert({
                cnpj: venda.estabelecimento.cnpj,
                razao_social: venda.estabelecimento.razaoSocial || 'Unknown',
                nome_fantasia: venda.estabelecimento.nomeFantasia,
                address_json: venda.estabelecimento.endereco || {}
              })
          }

          // Insert competitor price history
          await supabase
            .from('competitor_price_history')
            .insert({
              competitor_tracking_id: competitor.id,
              product_description: venda.produto?.descricao || 'Unknown Product',
              product_ean: venda.produto?.gtin || null,
              establishment_cnpj: venda.estabelecimento?.cnpj,
              sale_price: parseFloat(venda.precoVenda),
              declared_price: venda.precoDeclarado ? parseFloat(venda.precoDeclarado) : null,
              sale_date: venda.dataVenda,
              fetch_date: new Date().toISOString()
            })
        }

        processedCompetitors++
        console.log(`✅ Successfully processed competitor ${competitor.id}`)
        
      } catch (error) {
        console.error(`❌ Error processing competitor ${competitor.id}:`, error)
        continue
      }
    }

    console.log('🎉 Price update job completed successfully')
    
    return new Response(JSON.stringify({ 
      success: true,
      message: 'Price update completed',
      processed: {
        trackedItems: trackedItems?.length || 0,
        products: products.length,
        fuels: fuels.length,
        competitors: processedCompetitors
      },
      timestamp: new Date().toISOString()
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    console.error('❌ Error in update-tracked-prices:', error)
    return new Response(JSON.stringify({ 
      success: false,
      message: "Erro ao atualizar preços",
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})