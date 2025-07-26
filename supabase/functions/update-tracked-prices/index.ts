
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
        console.log(`Processing item ${item.id}: ${item.nickname}`)
        
        const endpoint = item.item_type === 'produto' ? 'produto/pesquisa' : 'combustivel/pesquisa'
        
        // Use complete search_criteria for both products and fuels
        // The sefaz-api-proxy already handles payload sanitization
        const searchData = {
          ...item.search_criteria,
          pagina: 1,
          registrosPorPagina: 100
        };

        // Adicionar esta conversão para o GTIN
        if (searchData.produto && searchData.produto.gtin) {
          // @ts-ignore: Converting string to number for the API
          searchData.produto.gtin = parseInt(searchData.produto.gtin, 10);
        }

        console.log(`[DEBUG] Item ${item.id} (${item.nickname}) - Payload FINAL enviado para SEFAZ (${endpoint}):`, JSON.stringify(searchData, null, 2));

        // Make request to SEFAZ API
        const response = await fetch(`${SEFAZ_API_BASE_URL}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'AppToken': sefazToken
          },
          body: JSON.stringify(searchData)
        })

        const responseText = await response.text(); // LEIA SEMPRE A RESPOSTA EM TEXTO PRIMEIRO!
        console.log(`[DEBUG] Item ${item.id} (${item.nickname}) - Resposta BRUTA da SEFAZ (status ${response.status}):`, responseText.substring(0, 500) + (responseText.length > 500 ? '...' : '')); // Loga até 500 caracteres da resposta bruta

        if (!response.ok) {
          console.error(`[ERROR] Item ${item.id} (${item.nickname}) - SEFAZ API erro (status ${response.status} ${response.statusText}): Body: ${responseText}`);
          console.warn(`[WARNING] Item ${item.id} (${item.nickname}) skipped due to non-OK SEFAZ response.`);
          continue; // Pular para o próximo item após logar o erro
        }

        let apiData;
        try {
          if (responseText.trim()) { // Apenas tenta parsear se a resposta não estiver vazia
            apiData = JSON.parse(responseText);
            console.log(`[DEBUG] Item ${item.id} (${item.nickname}) - Resposta JSON parseada:`, JSON.stringify(apiData, null, 2));

            if (!apiData.conteudo || !Array.isArray(apiData.conteudo)) {
                console.warn(`[WARNING] Item ${item.id} (${item.nickname}) - Resposta da SEFAZ não contém 'conteudo' como array ou está vazia. Conteúdo: ${JSON.stringify(apiData)}`);
            }
          } else {
            console.warn(`[WARNING] Item ${item.id} (${item.nickname}) - Resposta vazia da API SEFAZ, não pode ser parseada como JSON.`);
            apiData = { conteudo: [] }; // Garante que apiData.conteudo é um array vazio para evitar erros
          }
        } catch (parseError) {
          console.error(`[ERROR] Item ${item.id} (${item.nickname}) - Erro ao parsear JSON da resposta: ${parseError.message}. Resposta recebida: ${responseText.substring(0, 200)}...`);
          apiData = { conteudo: [] }; // Garante que apiData.conteudo é um array vazio em caso de erro de parse
          console.warn(`[WARNING] Item ${item.id} (${item.nickname}) skipped due to JSON parsing error.`);
          continue; // Pular este item se o JSON não for válido
        }

        console.log(`Received ${apiData.conteudo?.length || 0} results for item ${item.id}`)

        // Process each result directly (no more filtering needed)
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

          // Insert price history
          const priceData = {
            tracked_item_id: item.id,
            establishment_cnpj: result.estabelecimento.cnpj,
            sale_date: result.produto.venda.dataVenda,
            declared_price: result.produto.venda.valorDeclarado,
            sale_price: result.produto.venda.valorVenda
          }

          await supabase
            .from('price_history')
            .insert(priceData)
        }

        console.log(`Successfully processed item ${item.id}`)
        
      } catch (error) {
        console.error(`Error processing item ${item.id} (${item.nickname}):`, error)
        console.log(`Skipping item ${item.id} due to error`)
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
