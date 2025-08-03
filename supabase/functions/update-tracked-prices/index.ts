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

  // Converter GTIN para string (se existir)
  if (convertedPayload.produto?.gtin) {
    const gtinOriginal = convertedPayload.produto.gtin
    const gtinString = String(gtinOriginal)
    
    console.log('🔄 Convertendo GTIN:')
    console.log('  - Original:', gtinOriginal, typeof gtinOriginal)
    console.log('  - Convertido:', gtinString, typeof gtinString)
    
    convertedPayload.produto.gtin = gtinString
  }

  console.log('Payload final:', JSON.stringify(convertedPayload, null, 2))
  console.log('=== FIM DA CONVERSÃO ===')

  return convertedPayload
}

// Função para buscar produto com estratégias de fallback
async function searchProductWithFallback(item: any, supabase: any): Promise<any> {
  const criteria = item.search_criteria
  const isProductType = item.item_type === 'product'
  
  console.log(`🔍 Buscando produto: ${item.nickname}, Tipo: ${item.item_type}`)
  
  if (!isProductType) {
    console.log('⚠️  Item não é do tipo produto, pulando...')
    return null
  }

  // Estratégia 1: GTIN + CNPJ (mais específico)
  if (criteria.gtin && criteria.cnpj) {
    console.log('🎯 Tentativa 1: GTIN + CNPJ')
    try {
      const result = await executeSefazSearch(item, {
        produto: { gtin: criteria.gtin },
        estabelecimento: { individual: { cnpj: criteria.cnpj } }
      }, 'produtos/gtin')
      
      if (result && result.establishments && result.establishments.length > 0) {
        console.log('✅ Sucesso com GTIN + CNPJ')
        return result
      }
    } catch (error) {
      console.log('❌ Erro na busca por GTIN + CNPJ:', error.message)
    }
  }

  // Estratégia 2: Apenas GTIN (menos específico)
  if (criteria.gtin) {
    console.log('🎯 Tentativa 2: Apenas GTIN')
    try {
      const result = await executeSefazSearch(item, {
        produto: { gtin: criteria.gtin }
      }, 'produtos/gtin')
      
      if (result && result.establishments && result.establishments.length > 0) {
        console.log('✅ Sucesso com GTIN apenas')
        return result
      }
    } catch (error) {
      console.log('❌ Erro na busca por GTIN:', error.message)
    }
  }

  // Estratégia 3: Busca por descrição (menos preciso)
  if (criteria.description) {
    console.log('🎯 Tentativa 3: Busca por descrição')
    try {
      const result = await executeSefazSearch(item, {
        produto: { descricao: criteria.description }
      }, 'produtos/descricao')
      
      if (result && result.establishments && result.establishments.length > 0) {
        console.log('✅ Sucesso com descrição')
        return result
      }
    } catch (error) {
      console.log('❌ Erro na busca por descrição:', error.message)
    }
  }

  console.log(`❌ Nenhuma estratégia funcionou para o item: ${item.nickname}`)
  return null
}

// Função principal para executar busca na SEFAZ
async function executeSefazSearch(item: any, searchData: any, endpoint: string, maxRetries: number = 3): Promise<any> {
  const cacheKey = `${endpoint}-${JSON.stringify(searchData)}`
  
  // Verificar cache primeiro
  const cached = responseCache.get(cacheKey)
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    console.log('📦 Usando resposta do cache')
    await upsertEstablishments(cached.data, item, supabase)
    return cached.data
  }

  // Converter tipos para formato SEFAZ
  const convertedPayload = convertPayloadTypes(searchData)
  
  let attempt = 0
  let lastError: any = null

  while (attempt < maxRetries) {
    attempt++
    console.log(`🔄 Tentativa ${attempt}/${maxRetries} para endpoint: ${endpoint}`)
    
    try {
      const response = await fetch(`${SEFAZ_API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sefazToken}`,
        },
        body: JSON.stringify(convertedPayload),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`❌ Erro HTTP ${response.status}:`, errorText)
        
        // Se for erro 4xx, não faz retry
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`HTTP ${response.status}: ${errorText}`)
        }
        
        lastError = new Error(`HTTP ${response.status}: ${errorText}`)
        
        // Para erro 5xx, esperar antes de tentar novamente (backoff exponencial)
        const delay = Math.pow(2, attempt - 1) * 1000 // 1s, 2s, 4s
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa`)
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }

      const data = await response.json()
      console.log('✅ Resposta da SEFAZ obtida com sucesso')
      
      // Salvar no cache
      responseCache.set(cacheKey, { data, timestamp: Date.now() })
      
      // Processar dados e salvar no banco
      await upsertEstablishments(data, item, supabase)
      
      return data
    } catch (error) {
      console.error(`❌ Erro na tentativa ${attempt}:`, error.message)
      lastError = error
      
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt - 1) * 1000
        console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  console.error(`❌ Todas as tentativas falharam para endpoint ${endpoint}:`, lastError?.message)
  throw lastError || new Error('Todas as tentativas falharam')
}

// Função para fazer upsert dos estabelecimentos
async function upsertEstablishments(data: any, item: any, supabase: any): Promise<void> {
  if (!data.establishments || data.establishments.length === 0) {
    console.log('📭 Nenhum estabelecimento encontrado nos dados')
    return
  }

  console.log(`🏪 Processando ${data.establishments.length} estabelecimentos`)

  for (const establishment of data.establishments) {
    try {
      // Upsert establishment
      const { error: establishmentError } = await supabase
        .from('establishments')
        .upsert({
          cnpj: establishment.cnpj,
          razao_social: establishment.razaoSocial || 'N/A',
          nome_fantasia: establishment.nomeFantasia,
          address_json: establishment.endereco || {}
        }, { onConflict: 'cnpj' })

      if (establishmentError) {
        console.error('❌ Erro ao inserir estabelecimento:', establishmentError)
        continue
      }

      // Insert price history for each product
      if (establishment.produtos && establishment.produtos.length > 0) {
        for (const produto of establishment.produtos) {
          const { error: priceError } = await supabase
            .from('price_history')
            .insert({
              tracked_item_id: item.id,
              sale_date: new Date(produto.dataVenda),
              declared_price: produto.precoDeclarado || null,
              sale_price: produto.precoVenda,
              establishment_cnpj: establishment.cnpj
            })

          if (priceError) {
            console.error('❌ Erro ao inserir histórico de preços:', priceError)
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar estabelecimento:', error)
    }
  }
}

// Função para processar itens monitorados
async function processTrackedItems(supabase: any, specificUserId: string | null = null, updateSyncStatus?: Function) {
  console.log('🔍 Processing tracked items...');
  
  let query = supabase
    .from('tracked_items')
    .select('*')
    .eq('is_active', true);
    
  if (specificUserId) {
    query = query.eq('user_id', specificUserId);
    console.log(`👤 Filtering for specific user: ${specificUserId}`);
  }
  
  const { data: trackedItems, error } = await query;
  
  if (error) {
    console.error('❌ Error fetching tracked items:', error);
    return { processed: 0, errors: 1 };
  }
  
  if (!trackedItems || trackedItems.length === 0) {
    console.log('📭 No tracked items found');
    return { processed: 0, errors: 0 };
  }
  
  console.log(`📦 Found ${trackedItems.length} tracked items to process`);
  
  // Update initial sync status
  if (updateSyncStatus) {
    await updateSyncStatus('running', 0, trackedItems.length);
  }
  
  let processed = 0;
  let errors = 0;
  
  // Process items in smaller batches to avoid timeouts
  const batchSize = 3; // Reduced batch size for better performance
  for (let i = 0; i < trackedItems.length; i += batchSize) {
    const batch = trackedItems.slice(i, i + batchSize);
    console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(trackedItems.length/batchSize)}`);
    
    // Process items in batch sequentially (not parallel) to avoid rate limits
    for (const item of batch) {
      try {
        console.log(`🔍 Processing item: ${item.nickname || item.id}`);
        
        // Update sync status with current item
        if (updateSyncStatus) {
          await updateSyncStatus('running', processed, trackedItems.length, item.nickname || item.id);
        }
        
        const result = await searchProductWithFallback(item, supabase);
        if (result && result.establishments && result.establishments.length > 0) {
          processed++;
          console.log(`✅ Successfully processed item: ${item.nickname || item.id}`);
        } else {
          console.log(`⚠️ No results found for item: ${item.nickname || item.id}`);
        }
      } catch (error) {
        console.error(`❌ Error processing item ${item.id}:`, error);
        errors++;
      }
      
      // Update progress
      if (updateSyncStatus) {
        await updateSyncStatus('running', processed, trackedItems.length);
      }
      
      // Small delay between items to be respectful to the API
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    
    // Shorter delay between batches for faster processing
    if (i + batchSize < trackedItems.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  console.log(`✅ Tracked items processing complete: ${processed} processed, ${errors} errors`);
  return { processed, errors };
}

// Função para processar rastreamento de concorrentes
async function processCompetitorTracking(supabase: any, specificUserId: string | null = null, updateSyncStatus?: Function) {
  console.log('🔍 Processing competitor tracking...');
  
  let query = supabase
    .from('competitor_tracking')
    .select('*')
    .eq('is_active', true);
    
  if (specificUserId) {
    query = query.eq('user_id', specificUserId);
    console.log(`👤 Filtering competitors for specific user: ${specificUserId}`);
  }
  
  const { data: competitors, error } = await query;
  
  if (error) {
    console.error('❌ Error fetching competitors:', error);
    return { processed: 0, errors: 1 };
  }
  
  if (!competitors || competitors.length === 0) {
    console.log('📭 No competitors found');
    return { processed: 0, errors: 0 };
  }
  
  console.log(`🏪 Found ${competitors.length} competitors to process`);
  
  let processed = 0;
  let errors = 0;
  
  // Process competitors sequentially
  for (const competitor of competitors) {
    try {
      console.log(`🔍 Processing competitor: ${competitor.competitor_name || competitor.competitor_cnpj}`);
      
      // Update sync status
      if (updateSyncStatus) {
        await updateSyncStatus('running', processed, competitors.length, competitor.competitor_name || competitor.competitor_cnpj);
      }
      
      const result = await executeSefazSearch(competitor, {
        estabelecimento: { individual: { cnpj: competitor.competitor_cnpj } }
      }, 'produtos/estabelecimento');
      
      if (result && result.establishments && result.establishments.length > 0) {
        processed++;
        console.log(`✅ Successfully processed competitor: ${competitor.competitor_name || competitor.competitor_cnpj}`);
      }
    } catch (error) {
      console.error(`❌ Error processing competitor ${competitor.id}:`, error);
      errors++;
    }
    
    // Small delay between competitors
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`✅ Competitor tracking processing complete: ${processed} processed, ${errors} errors`);
  return { processed, errors };
}

serve(async (req) => {
  // CORS headers for browser requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const startTime = performance.now();
  console.log('🚀 Edge Function started at:', new Date().toISOString());
  
  try {
    const requestBody = await req.json();
    const isScheduled = requestBody.scheduled || false;
    const specificUserId = requestBody.user_id || null;
    const source = requestBody.source || 'unknown';
    const syncId = requestBody.sync_id || null;
    
    console.log('📋 Request details:', { isScheduled, specificUserId, source, syncId });
    
    // Initialize Supabase client
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY');
    }
    
    const supabase = createClient(
      'https://zzijiecsvyzaqedatuip.supabase.co',
      supabaseKey
    );

    // Update sync status if syncId provided
    const updateSyncStatus = async (status: string, progress?: number, totalItems?: number, currentItem?: string, errorMessage?: string) => {
      if (!syncId || !specificUserId) return;
      
      try {
        const updateData: any = {
          status,
          updated_at: new Date().toISOString()
        };
        
        if (progress !== undefined) updateData.progress = progress;
        if (totalItems !== undefined) updateData.total_items = totalItems;
        if (currentItem !== undefined) updateData.current_item = currentItem;
        if (errorMessage !== undefined) updateData.error_message = errorMessage;
        if (status === 'completed' || status === 'error') updateData.completed_at = new Date().toISOString();
        
        await supabase
          .from('sync_status')
          .update(updateData)
          .eq('id', syncId)
          .eq('user_id', specificUserId);
      } catch (error) {
        console.error('Error updating sync status:', error);
      }
    };

    const results = await Promise.all([
      processTrackedItems(supabase, specificUserId, updateSyncStatus),
      processCompetitorTracking(supabase, specificUserId, updateSyncStatus)
    ]);

    const totalProcessed = results[0].processed + results[1].processed;
    const totalErrors = results[0].errors + results[1].errors;
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);

    // Update final sync status
    await updateSyncStatus(totalErrors > 0 ? 'error' : 'completed', totalProcessed, totalProcessed);

    const response = {
      success: true,
      processed: totalProcessed,
      errors: totalErrors,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      tracked_items: results[0],
      competitor_tracking: results[1],
      source,
      user_id: specificUserId,
      sync_id: syncId
    };

    console.log('✅ Function completed successfully:', response);
    
    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    const endTime = performance.now();
    const duration = Math.round(endTime - startTime);
    
    console.error('❌ Function failed:', error);
    
    // Update sync status with error if syncId provided
    const requestBody = await req.json().catch(() => ({}));
    const syncId = requestBody.sync_id;
    const specificUserId = requestBody.user_id;
    
    if (syncId && specificUserId) {
      try {
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
        const supabase = createClient('https://zzijiecsvyzaqedatuip.supabase.co', supabaseKey);
        
        await supabase
          .from('sync_status')
          .update({
            status: 'error',
            error_message: error.message,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', syncId)
          .eq('user_id', specificUserId);
      } catch (statusError) {
        console.error('Error updating sync status on failure:', statusError);
      }
    }
    
    const errorResponse = {
      success: false,
      error: error.message,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
      sync_id: syncId
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});