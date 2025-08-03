
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const sefazToken = Deno.env.get('SEFAZ_APP_TOKEN')!

const SEFAZ_API_BASE_URL = "http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/"

// CORS Headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Cache simples para respostas da SEFAZ (válido por 5 minutos)
const responseCache = new Map<string, { data: any, timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos

// Função para converter tipos de dados conforme especificação SEFAZ
function convertPayloadTypes(payload: any): any {
  console.log('=== CONVERTENDO TIPOS DE DADOS PARA SEFAZ ===')
  console.log('Payload original:', JSON.stringify(payload, null, 2))

  const convertedPayload = JSON.parse(JSON.stringify(payload))

  // Converter codigoIBGE para número inteiro (CRÍTICO)
  if (convertedPayload.estabelecimento?.municipio?.codigoIBGE) {
    const codigoOriginal = convertedPayload.estabelecimento.municipio.codigoIBGE
    const codigoNumerico = parseInt(String(codigoOriginal).replace(/\D/g, ''), 10)
    
    console.log('🔄 Convertendo codigoIBGE:')
    console.log('  - Original:', codigoOriginal, typeof codigoOriginal)
    console.log('  - Convertido:', codigoNumerico, typeof codigoNumerico)
    
    convertedPayload.estabelecimento.municipio.codigoIBGE = codigoNumerico
  }

  // Converter CNPJ para string limpa (sem formatação)
  if (convertedPayload.estabelecimento?.individual?.cnpj) {
    const cnpjOriginal = convertedPayload.estabelecimento.individual.cnpj
    const cnpjLimpo = String(cnpjOriginal).replace(/\D/g, '')
    
    console.log('🔄 Convertendo CNPJ:')
    console.log('  - Original:', cnpjOriginal)
    console.log('  - Convertido:', cnpjLimpo)
    
    convertedPayload.estabelecimento.individual.cnpj = cnpjLimpo
  }

  // Converter GTIN para string limpa (sem formatação)
  if (convertedPayload.produto?.gtin) {
    const gtinOriginal = convertedPayload.produto.gtin
    const gtinLimpo = String(gtinOriginal).replace(/\D/g, '')
    
    console.log('🔄 Convertendo GTIN:')
    console.log('  - Original:', gtinOriginal)
    console.log('  - Convertido:', gtinLimpo)
    
    convertedPayload.produto.gtin = gtinLimpo
  }

  // Converter tipoCombustivel para número inteiro (para combustíveis)
  if (convertedPayload.produto?.tipoCombustivel) {
    const tipoOriginal = convertedPayload.produto.tipoCombustivel
    const tipoNumerico = parseInt(String(tipoOriginal), 10)
    
    console.log('🔄 Convertendo tipoCombustivel:')
    console.log('  - Original:', tipoOriginal, typeof tipoOriginal)
    console.log('  - Convertido:', tipoNumerico, typeof tipoNumerico)
    
    convertedPayload.produto.tipoCombustivel = tipoNumerico
  }

  // Garantir que campos numéricos sejam números
  if (convertedPayload.dias) {
    convertedPayload.dias = parseInt(String(convertedPayload.dias), 10)
  }

  if (convertedPayload.pagina) {
    convertedPayload.pagina = parseInt(String(convertedPayload.pagina), 10)
  }

  if (convertedPayload.registrosPorPagina) {
    convertedPayload.registrosPorPagina = parseInt(String(convertedPayload.registrosPorPagina), 10)
  }

  // Converter coordenadas para números
  if (convertedPayload.estabelecimento?.geolocalizacao) {
    const geo = convertedPayload.estabelecimento.geolocalizacao
    
    if (geo.latitude) {
      geo.latitude = parseFloat(String(geo.latitude))
    }
    if (geo.longitude) {
      geo.longitude = parseFloat(String(geo.longitude))
    }
    if (geo.raio) {
      geo.raio = parseInt(String(geo.raio), 10)
    }
    
    console.log('🔄 Convertendo geolocalização:', geo)
  }

  console.log('✅ Payload convertido:', JSON.stringify(convertedPayload, null, 2))
  return convertedPayload
}

// Função para buscar produtos com fallback de critérios
async function searchProductWithFallback(item: any, supabase: any): Promise<any> {
  const targetCnpj = item.search_criteria?.estabelecimento?.individual?.cnpj;
  const gtin = item.search_criteria?.produto?.gtin;
  const descricao = item.search_criteria?.produto?.descricao;

  console.log(`[FALLBACK] Item ${item.id} - Iniciando busca com fallback. CNPJ alvo: ${targetCnpj}, GTIN: ${gtin}, Descrição: ${descricao}`);

  // Estratégia 1: Apenas GTIN + CNPJ (se ambos existirem)
  if (gtin && targetCnpj) {
    console.log(`[FALLBACK] Tentativa 1: GTIN + CNPJ`);
    let searchData = {
      dias: item.search_criteria.dias || 1,
      produto: { gtin },
      estabelecimento: { individual: { cnpj: targetCnpj } },
      pagina: 1,
      registrosPorPagina: 100
    };

    searchData = convertPayloadTypes(searchData);
    const result = await executeSefazSearch(item, searchData, 'produto/pesquisa');
    if (result && result.conteudo && result.conteudo.length > 0) {
      return result;
    }
  }

  // Estratégia 2: Apenas GTIN (busca mais ampla)
  if (gtin) {
    console.log(`[FALLBACK] Tentativa 2: Apenas GTIN`);
    let searchData = {
      dias: item.search_criteria.dias || 1,
      produto: { gtin },
      pagina: 1,
      registrosPorPagina: 100
    };

    searchData = convertPayloadTypes(searchData);
    const result = await executeSefazSearch(item, searchData, 'produto/pesquisa');
    if (result && result.conteudo && result.conteudo.length > 0) {
      // Filtrar por CNPJ se especificado
      if (targetCnpj) {
        result.conteudo = result.conteudo.filter((r: any) => r.estabelecimento.cnpj === targetCnpj);
        console.log(`[FALLBACK] Resultados filtrados por CNPJ ${targetCnpj}: ${result.conteudo.length}`);
      }
      return result;
    }
  }

  // Estratégia 3: Apenas descrição (busca mais ampla)
  if (descricao) {
    console.log(`[FALLBACK] Tentativa 3: Apenas descrição`);
    let searchData = {
      dias: item.search_criteria.dias || 1,
      produto: { descricao },
      pagina: 1,
      registrosPorPagina: 100
    };

    searchData = convertPayloadTypes(searchData);
    const result = await executeSefazSearch(item, searchData, 'produto/pesquisa');
    if (result && result.conteudo && result.conteudo.length > 0) {
      // Filtrar por CNPJ se especificado
      if (targetCnpj) {
        result.conteudo = result.conteudo.filter((r: any) => r.estabelecimento.cnpj === targetCnpj);
        console.log(`[FALLBACK] Resultados filtrados por CNPJ ${targetCnpj}: ${result.conteudo.length}`);
      }
      return result;
    }
  }

  console.log(`[FALLBACK] Item ${item.id} - Nenhuma estratégia retornou resultados`);
  return null;
}

// Função auxiliar para executar busca na SEFAZ com cache e retry
async function executeSefazSearch(item: any, searchData: any, endpoint: string, maxRetries: number = 3): Promise<any> {
  console.log(`[SEFAZ] Item ${item.id} - Enviando para ${endpoint}:`, JSON.stringify(searchData, null, 2));

  // Criar chave do cache baseada nos dados de busca
  const cacheKey = `${endpoint}-${JSON.stringify(searchData)}`
  const cached = responseCache.get(cacheKey)
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log(`[CACHE] Item ${item.id} - Usando resposta em cache para ${endpoint}`)
    return cached.data
  }

  let lastError: any = null
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[SEFAZ] Item ${item.id} - Tentativa ${attempt}/${maxRetries}`)
      
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout por request
      
      const response = await fetch(`${SEFAZ_API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'AppToken': sefazToken
        },
        body: JSON.stringify(searchData),
        signal: controller.signal
      });

      clearTimeout(timeoutId)
      
      const responseText = await response.text();
      console.log(`[SEFAZ] Item ${item.id} - Status ${response.status}, Resposta: ${responseText.slice(0, 200)}...`);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${responseText}`)
      }

      const jsonData = JSON.parse(responseText);
      
      // Armazenar no cache se bem-sucedido
      responseCache.set(cacheKey, { data: jsonData, timestamp: Date.now() })
      
      return jsonData;
      
    } catch (error) {
      lastError = error
      console.error(`[SEFAZ] Item ${item.id} - Tentativa ${attempt} falhou:`, error.message);
      
      if (attempt < maxRetries) {
        const backoffDelay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        console.log(`[SEFAZ] Item ${item.id} - Aguardando ${backoffDelay}ms antes da próxima tentativa...`);
        await new Promise(resolve => setTimeout(resolve, backoffDelay));
      }
    }
  }

  console.error(`[SEFAZ] Item ${item.id} - Todas as tentativas falharam. Último erro:`, lastError?.message);
  return null;
}

// Configure com timeout aumentado para 55 segundos (máximo do Supabase)
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now()
  console.log('🚀 Starting optimized price update job with 55s timeout...')
  
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('Starting optimized price update job...')
    
    // Parse request body for user filtering and configuration
    const body = await req.text()
    let requestData: any = {}
    
    try {
      requestData = JSON.parse(body)
    } catch {
      // If no body or invalid JSON, continue with full sync
    }

    const userId = requestData.user_id
    const isScheduled = requestData.scheduled === true
    const source = requestData.source || 'manual'
    const batchSize = requestData.batch_size || 2 // Reduzido para menor timeout
    const maxTimeoutMs = 50000 // 50s para deixar margem de 5s

    console.log(`⚙️  Sync request: user=${userId || 'all'}, scheduled=${isScheduled}, source=${source}, batchSize=${batchSize}, maxTimeout=${maxTimeoutMs}ms`)

    // Build query for tracked items with user filtering
    let trackedQuery = supabase
      .from('tracked_items')
      .select('*')
      .eq('is_active', true)
    
    if (userId) {
      trackedQuery = trackedQuery.eq('user_id', userId)
    }

    const { data: trackedItems, error: trackedItemsError } = await trackedQuery

    if (trackedItemsError) {
      throw trackedItemsError
    }

    console.log(`Found ${trackedItems?.length || 0} active tracked items`)

    // Build query for competitors with user filtering
    let competitorQuery = supabase
      .from('competitor_tracking')
      .select('*')
      .eq('is_active', true)
    
    if (userId) {
      competitorQuery = competitorQuery.eq('user_id', userId)
    }

    const { data: competitors, error: competitorsError } = await competitorQuery

    if (competitorsError) {
      console.error('Error fetching competitors:', competitorsError)
    } else {
      console.log(`Found ${competitors?.length || 0} active competitors`)
    }

    // Process tracked items in batches to avoid timeout
    const processedItems = []
    const chunks = []
    
    // Split items into chunks
    for (let i = 0; i < (trackedItems?.length || 0); i += batchSize) {
      chunks.push((trackedItems || []).slice(i, i + batchSize))
    }

    console.log(`Processing ${trackedItems?.length || 0} items in ${chunks.length} batches of ${batchSize}`)

    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      // Verificar timeout
      if (Date.now() - startTime > maxTimeoutMs) {
        console.warn(`⏰ Timeout alcançado após ${Math.round((Date.now() - startTime) / 1000)}s. Interrompendo processamento.`)
        break
      }

      const chunk = chunks[chunkIndex]
      console.log(`📦 Processing batch ${chunkIndex + 1}/${chunks.length} with ${chunk.length} items`)

      // Process items sequentially to avoid API rate limits and timeouts
      for (const item of chunk) {
        try {
          // Verificar timeout novamente
          if (Date.now() - startTime > maxTimeoutMs) {
            console.warn(`⏰ Timeout alcançado durante processamento do item ${item.id}. Interrompendo.`)
            break
          }

          console.log(`🔄 Processing item ${item.id}: ${item.nickname}`)
          
          let apiData;

          if (item.item_type === 'produto') {
            // Para produtos, usar busca com fallback e retry interno
            apiData = await searchProductWithFallback(item, supabase);
          } else {
            // Para combustíveis com retry interno
            let searchData = {
              ...item.search_criteria,
              pagina: 1,
              registrosPorPagina: 100
            };

            searchData = convertPayloadTypes(searchData);
            apiData = await executeSefazSearch(item, searchData, 'combustivel/pesquisa', 2);
          }

          if (!apiData || !apiData.conteudo || apiData.conteudo.length === 0) {
            console.log(`No results found for item ${item.id}`);
            continue;
          }

          console.log(`Received ${apiData.conteudo.length} results for item ${item.id}`);

          // Process each result directly
          let successfulInserts = 0;
          for (const result of apiData.conteudo || []) {
            try {
              // First, ensure establishment exists
              const establishmentData = {
                cnpj: result.estabelecimento.cnpj,
                razao_social: result.estabelecimento.razaoSocial,
                nome_fantasia: result.estabelecimento.nomeFantasia,
                address_json: result.estabelecimento.endereco
              }

              const { error: estabError } = await supabase
                .from('establishments')
                .upsert(establishmentData, { onConflict: 'cnpj' })

              if (estabError) {
                console.error('Error upserting establishment:', estabError)
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

              const { error: priceError } = await supabase
                .from('price_history')
                .insert(priceData)

              if (priceError) {
                console.error('Error inserting price history:', priceError)
              } else {
                successfulInserts++;
              }
            } catch (resultError) {
              console.error(`Error processing result for item ${item.id}:`, resultError);
            }
          }

          processedItems.push(item.id)
          console.log(`✅ Successfully processed item ${item.id} with ${successfulInserts} price insertions`)
          
          // Small delay between items to prevent rate limiting (reduzido)
          await new Promise(resolve => setTimeout(resolve, 200));
          
        } catch (error) {
          console.error(`Error processing item ${item.id} (${item.nickname}):`, error)
          console.log(`Skipping item ${item.id} due to error`)
          continue
        }
      }

      // Small delay between batches (reduzido)
      if (chunkIndex < chunks.length - 1) {
        console.log('⏱️  Waiting 1 second before next batch...')
        await new Promise(resolve => setTimeout(resolve, 1000))
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

    const endTime = Date.now()
    const durationSeconds = Math.round((endTime - startTime) / 1000)
    
    console.log(`🎉 Price update job completed successfully in ${durationSeconds}s`)
    
    return new Response(
      JSON.stringify({ 
        message: 'Price update completed',
        processedItems: processedItems.length,
        totalItems: trackedItems?.length || 0,
        processedCompetitors: processedCompetitors,
        durationSeconds: durationSeconds,
        cacheHits: responseCache.size
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    const endTime = Date.now()
    const durationSeconds = Math.round((endTime - startTime) / 1000)
    
    console.error(`❌ Error in update-tracked-prices after ${durationSeconds}s:`, error)
    return new Response(
      JSON.stringify({ 
        message: "Erro ao atualizar preços",
        error: error.message,
        durationSeconds: durationSeconds
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
