
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const sefazToken = Deno.env.get('SEFAZ_APP_TOKEN')!

const SEFAZ_API_BASE_URL = "http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/"

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('Starting price update job...')
    
    // Get all active tracked items
    const { data: trackedItems, error: trackedItemsError } = await supabase
      .from('tracked_items')
      .select('*')
      .eq('is_active', true)

    if (trackedItemsError) {
      throw trackedItemsError
    }

    console.log(`Found ${trackedItems?.length || 0} active tracked items`)

    // Get all active competitors
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitor_tracking')
      .select('*')
      .eq('is_active', true)

    if (competitorsError) {
      console.error('Error fetching competitors:', competitorsError)
    } else {
      console.log(`Found ${competitors?.length || 0} active competitors`)
    }

    // Process tracked items
    for (const item of trackedItems || []) {
      try {
        console.log(`Processing item ${item.id}: ${item.nickname} (Type: ${item.item_type})`)
        
        const endpoint = item.item_type === 'produto' ? 'produto/pesquisa' : 'combustivel/pesquisa'
        
        // Prepare the search criteria with pagination
        const searchData = {
          ...item.search_criteria,
          pagina: 1,
          registrosPorPagina: 100
        }

        console.log(`Making request to ${endpoint} with data for ${item.item_type}:`, JSON.stringify(searchData, null, 2))

        // Make request to SEFAZ API
        const response = await fetch(`${SEFAZ_API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'AppToken': sefazToken
          },
          body: JSON.stringify(searchData)
        })

        console.log(`SEFAZ API Response Status for item ${item.id}:`, response.status)

        if (!response.ok) {
          const responseText = await response.text()
          console.error(`SEFAZ API error for item ${item.id} (${item.item_type}):`, {
            status: response.status,
            statusText: response.statusText,
            responseBody: responseText
          })
          continue
        }

        const apiData = await response.json()
        console.log(`SEFAZ API Response for item ${item.id} (${item.item_type}):`, {
          hasContent: !!apiData.conteudo,
          contentLength: apiData.conteudo?.length || 0,
          fullResponse: JSON.stringify(apiData, null, 2)
        })

        // Process each result
        if (!apiData.conteudo || apiData.conteudo.length === 0) {
          console.log(`No results found for item ${item.id} (${item.item_type})`)
          continue
        }

        for (const result of apiData.conteudo) {
          try {
            console.log(`Processing result for item ${item.id}:`, {
              estabelecimento: result.estabelecimento?.cnpj,
              produto: result.produto?.descricao || result.produto?.codigoEan,
              venda: result.produto?.venda
            })

            // Validate required fields
            if (!result.estabelecimento?.cnpj || !result.produto?.venda) {
              console.error(`Missing required fields for item ${item.id}:`, {
                hasEstabelecimento: !!result.estabelecimento,
                hasCnpj: !!result.estabelecimento?.cnpj,
                hasProduto: !!result.produto,
                hasVenda: !!result.produto?.venda
              })
              continue
            }

            // First, ensure establishment exists
            const establishmentData = {
              cnpj: result.estabelecimento.cnpj,
              razao_social: result.estabelecimento.razaoSocial,
              nome_fantasia: result.estabelecimento.nomeFantasia,
              address_json: result.estabelecimento.endereco
            }

            const { error: estError } = await supabase
              .from('establishments')
              .upsert(establishmentData, { onConflict: 'cnpj' })

            if (estError) {
              console.error(`Error upserting establishment for item ${item.id}:`, estError)
              continue
            }

            // Insert price history
            const priceData = {
              tracked_item_id: item.id,
              establishment_cnpj: result.estabelecimento.cnpj,
              sale_date: result.produto.venda.dataVenda,
              declared_price: result.produto.venda.valorDeclarado,
              sale_price: result.produto.venda.valorVenda
            }

            console.log(`Inserting price data for item ${item.id}:`, priceData)

            const { error: priceError } = await supabase
              .from('price_history')
              .insert(priceData)

            if (priceError) {
              console.error(`Error inserting price history for item ${item.id}:`, priceError)
              continue
            }

            console.log(`Successfully processed result for item ${item.id}`)

          } catch (resultError) {
            console.error(`Error processing individual result for item ${item.id}:`, resultError)
            continue
          }
        }

        console.log(`Successfully processed item ${item.id}`)
        
      } catch (error) {
        console.error(`Error processing item ${item.id}:`, error)
        continue
      }
    }

    // Process competitors
    let processedCompetitors = 0
    for (const competitor of competitors || []) {
      try {
        console.log(`Processing competitor ${competitor.id}: ${competitor.competitor_name || competitor.competitor_cnpj}`)
        
        // Search for all products from this competitor's CNPJ
        const searchData = {
          cnpj: competitor.competitor_cnpj,
          pagina: 1,
          registrosPorPagina: 100
        }

        console.log(`Making competitor request with data:`, JSON.stringify(searchData, null, 2))

        // Make request to SEFAZ API for products
        const response = await fetch(`${SEFAZ_API_BASE_URL}produto/pesquisa`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'AppToken': sefazToken
          },
          body: JSON.stringify(searchData)
        })

        if (!response.ok) {
          console.error(`SEFAZ API error for competitor ${competitor.id}:`, response.status, response.statusText)
          continue
        }

        const apiData = await response.json()
        console.log(`Received ${apiData.conteudo?.length || 0} results for competitor ${competitor.id}`)

        // Process each result for the competitor
        for (const result of apiData.conteudo || []) {
          // First, ensure establishment exists
          const establishmentData = {
            cnpj: result.estabelecimento.cnpj,
            razao_social: result.estabelecimento.razaoSocial,
            nome_fantasia: result.estabelecimento.nomeFantasia,
            address_json: result.estabelecimento.endereco
          }

          await supabase
            .from('establishments')
            .upsert(establishmentData, { onConflict: 'cnpj' })

          // Insert competitor price history
          const competitorPriceData = {
            competitor_tracking_id: competitor.id,
            product_description: result.produto.descricao,
            product_ean: result.produto.codigoEan,
            establishment_cnpj: result.estabelecimento.cnpj,
            sale_date: result.produto.venda.dataVenda,
            declared_price: result.produto.venda.valorDeclarado,
            sale_price: result.produto.venda.valorVenda
          }

          await supabase
            .from('competitor_price_history')
            .insert(competitorPriceData)
        }

        processedCompetitors++
        console.log(`Successfully processed competitor ${competitor.id}`)
        
      } catch (error) {
        console.error(`Error processing competitor ${competitor.id}:`, error)
        continue
      }
    }

    console.log('Price update job completed successfully')
    
    return new Response(
      JSON.stringify({ 
        message: 'Price update completed',
        processedItems: trackedItems?.length || 0,
        processedCompetitors: processedCompetitors
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in update-tracked-prices:', error)
    return new Response(
      JSON.stringify({ 
        message: "Erro ao atualizar preços",
        error: error.message
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
