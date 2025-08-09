import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// SEFAZ Alagoas API configuration
const SEFAZ_API_BASE_URL = "http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/";

// Initialize Supabase client with service role key for database operations
const supabase = createClient(
  "https://zzijiecsvyzaqedatuip.supabase.co",
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

interface TrackedItem {
  id: number;
  user_id: string;
  item_type: 'produto' | 'combustivel';
  search_criteria: any;
  nickname: string;
}

// Function to sanitize and validate search criteria before sending to SEFAZ API
function sanitizeSearchCriteria(criteria: any, itemType: 'produto' | 'combustivel'): any {
  if (!criteria || typeof criteria !== 'object') {
    throw new Error('Invalid search criteria: must be an object');
  }

  console.log('Sanitizing criteria for item type:', itemType);
  console.log('Raw criteria structure:', JSON.stringify(criteria, null, 2));

  const sanitized: any = {};

  // Extract basic pagination parameters from the criteria or set defaults
  sanitized.pagina = (criteria.pagina && typeof criteria.pagina === 'number') ? criteria.pagina : 1;
  sanitized.registrosPorPagina = (criteria.registrosPorPagina && typeof criteria.registrosPorPagina === 'number') ? criteria.registrosPorPagina : 100;

  // Extract days parameter if present
  if (criteria.dias && typeof criteria.dias === 'number') {
    sanitized.dias = criteria.dias;
  }

  if (itemType === 'produto') {
    // Extract product-specific fields from nested structure
    const produto = criteria.produto || {};
    
    // Handle GTIN
    if (produto.gtin && typeof produto.gtin === 'string') {
      if (!sanitized.produto) sanitized.produto = {};
      sanitized.produto.gtin = produto.gtin.trim();
    }
    
    // Handle product description
    if (produto.descricao && typeof produto.descricao === 'string') {
      if (!sanitized.produto) sanitized.produto = {};
      sanitized.produto.descricao = produto.descricao.trim();
    }

    // Extract establishment and municipality data
    const estabelecimento = criteria.estabelecimento || {};
    const municipio = estabelecimento.municipio || {};
    
    if (municipio.codigoIBGE) {
      const codigoIbge = parseInt(municipio.codigoIBGE);
      if (!isNaN(codigoIbge) && codigoIbge > 0) {
        if (!sanitized.estabelecimento) sanitized.estabelecimento = {};
        if (!sanitized.estabelecimento.municipio) sanitized.estabelecimento.municipio = {};
        sanitized.estabelecimento.municipio.codigoIBGE = codigoIbge;
      }
    }
    
  } else if (itemType === 'combustivel') {
    // Extract fuel-specific fields from nested structure
    const produto = criteria.produto || {};
    
    // Handle fuel type
    if (produto.tipoCombustivel && typeof produto.tipoCombustivel === 'number') {
      if (!sanitized.produto) sanitized.produto = {};
      sanitized.produto.tipoCombustivel = produto.tipoCombustivel;
    }

    // Extract establishment and municipality data
    const estabelecimento = criteria.estabelecimento || {};
    const municipio = estabelecimento.municipio || {};
    
    if (municipio.codigoIBGE) {
      const codigoIbge = parseInt(municipio.codigoIBGE);
      if (!isNaN(codigoIbge) && codigoIbge > 0) {
        if (!sanitized.estabelecimento) sanitized.estabelecimento = {};
        if (!sanitized.estabelecimento.municipio) sanitized.estabelecimento.municipio = {};
        sanitized.estabelecimento.municipio.codigoIBGE = codigoIbge;
      }
    }
  }

  // Remove any null, undefined, or empty string values recursively
  function cleanObject(obj: any): any {
    if (obj === null || obj === undefined || obj === '') {
      return undefined;
    }
    
    if (typeof obj !== 'object' || Array.isArray(obj)) {
      return obj;
    }
    
    const cleaned: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanedValue = cleanObject(value);
      if (cleanedValue !== undefined) {
        cleaned[key] = cleanedValue;
      }
    }
    
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }

  const cleanedSanitized = cleanObject(sanitized);
  
  // Ensure we have at least pagination parameters
  if (!cleanedSanitized || Object.keys(cleanedSanitized).length === 0) {
    return {
      pagina: 1,
      registrosPorPagina: 100
    };
  }

  console.log('Final sanitized criteria:', JSON.stringify(cleanedSanitized, null, 2));
  return cleanedSanitized;
}

// Helper: delay for ms
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// FASE 1: Simplified and more robust SEFAZ API caller with reduced timeouts and retries
async function callSefazAPI(
  endpoint: string,
  data: any,
  timeoutMs: number = Number(Deno.env.get('SEFAZ_REQUEST_TIMEOUT_MS') || 90000), // 90s timeout (FASE 1)
  maxRetries: number = Number(Deno.env.get('SEFAZ_MAX_RETRIES') || 1) // 1 retry max (FASE 1)
): Promise<any> {
  const sefazToken = Deno.env.get('SEFAZ_APP_TOKEN');
  if (!sefazToken) {
    throw new Error('SEFAZ_APP_TOKEN not configured');
  }

  // Ensure we don't send { searchData: {...} }
  const cleanData = (data && typeof data === 'object' && 'searchData' in data && typeof (data as any).searchData === 'object')
    ? (data as any).searchData
    : data;

  let lastError: any = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const startedAt = Date.now();
    const timeoutId = setTimeout(() => {
      console.warn(`[WARNING] Request to ${endpoint} timed out on attempt ${attempt} after ${timeoutMs}ms. Aborting.`);
      controller.abort();
    }, timeoutMs);

    try {
      console.log(`[INFO] Attempt ${attempt}/${maxRetries}: POST ${SEFAZ_API_BASE_URL}${endpoint}`);
      console.log('Payload being sent:', JSON.stringify(cleanData, null, 2));

      const response = await fetch(`${SEFAZ_API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apptoken': sefazToken, // SEFAZ Alagoas uses 'apptoken' header
        },
        body: JSON.stringify(cleanData),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const responseText = await response.text();
      console.log('SEFAZ API Response:', {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body: responseText.substring(0, 500),
        took_ms: Date.now() - startedAt,
      });

      if (!response.ok) {
        // Do not retry for invalid JSON format payloads
        if (response.status === 400 && responseText.includes('Formato JSON inválido')) {
          throw new Error('SEFAZ API JSON format error: Invalid payload structure. Check search criteria formatting.');
        }
        // Retry for server errors and timeouts
        if (response.status >= 500 || response.status === 408) {
          throw new Error(`SEFAZ Server/Timeout Error: ${response.status} ${response.statusText}`);
        }
        // Other HTTP errors are not retried
        throw new Error(`SEFAZ API error: ${response.status} ${response.statusText} - ${responseText}`);
      }

      // Parse JSON response
      let result: any;
      try {
        result = JSON.parse(responseText);
      } catch (e) {
        throw new Error('Invalid JSON response from SEFAZ API');
      }

      console.log(`[SUCCESS] ${endpoint} attempt ${attempt} OK:`, {
        success: result?.success,
        dataLength: result?.data?.length || 0,
      });

      return result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      lastError = error;
      const took = Date.now() - startedAt;
      const message = error?.message || String(error);
      console.error(`[ERROR] SEFAZ API call failed (attempt ${attempt}/${maxRetries}, took ${took}ms): ${message}`);

      // If JSON format error, don't retry
      if (message.includes('JSON format error') || message.includes('Formato JSON inválido')) {
        throw error;
      }

      // If not last attempt, shorter backoff: 3s (FASE 1)
      if (attempt < maxRetries) {
        const waitMs = 3000; // Fixed 3s delay (FASE 1)
        console.log(`Retrying in ${waitMs / 1000} seconds...`);
        await delay(waitMs);
        continue;
      }

      // Exhausted
      break;
    }
  }

  throw new Error(`SEFAZ API call failed after ${maxRetries} attempts. Last error: ${lastError?.message || lastError}`);
}


async function updateItemPrice(item: TrackedItem): Promise<boolean> {
  try {
    console.log(`Updating price for item ${item.id} (${item.nickname})`);
    console.log('Original search criteria:', JSON.stringify(item.search_criteria, null, 2));
    
    // Sanitize search criteria before API call
    let sanitizedCriteria;
    try {
      sanitizedCriteria = sanitizeSearchCriteria(item.search_criteria, item.item_type);
      console.log('Sanitized search criteria:', JSON.stringify(sanitizedCriteria, null, 2));
    } catch (sanitizeError) {
      console.error(`Failed to sanitize criteria for item ${item.id}:`, sanitizeError.message);
      return false;
    }
    
    // Call SEFAZ API based on item type
    const endpoint = item.item_type === 'produto' ? 'produto/pesquisa' : 'combustivel/pesquisa';
    const apiResponse = await callSefazAPI(endpoint, sanitizedCriteria);
    
    if (!apiResponse.success || !apiResponse.data || apiResponse.data.length === 0) {
      console.log(`No data found for item ${item.id}`);
      return false;
    }

    // Get the first result (most relevant)
    const priceData = apiResponse.data[0];
    const currentPrice = parseFloat(priceData.preco_venda || priceData.preco || '0');
    
    if (currentPrice <= 0) {
      console.log(`Invalid price for item ${item.id}: ${currentPrice}`);
      return false;
    }

    // Calculate price trend
    const { data: trendData } = await supabase.rpc('calculate_price_trend', {
      p_tracked_item_id: item.id,
      p_new_price: currentPrice
    });

    const priceTrend = trendData || 'stable';

    // Calculate price change percentage
    const { data: lastPriceData } = await supabase
      .from('price_history')
      .select('sale_price')
      .eq('tracked_item_id', item.id)
      .order('fetch_date', { ascending: false })
      .limit(1)
      .maybeSingle();

    let priceChangePercent = null;
    if (lastPriceData?.sale_price) {
      const lastPrice = parseFloat(lastPriceData.sale_price.toString());
      priceChangePercent = ((currentPrice - lastPrice) / lastPrice) * 100;
    }

    // Insert price history record
    const { error: historyError } = await supabase
      .from('price_history')
      .insert({
        tracked_item_id: item.id,
        sale_price: currentPrice,
        declared_price: priceData.preco_declarado ? parseFloat(priceData.preco_declarado) : null,
        establishment_name: priceData.estabelecimento?.razao_social || priceData.nome_estabelecimento,
        establishment_cnpj: priceData.estabelecimento?.cnpj || priceData.cnpj,
        establishment_address: priceData.estabelecimento?.endereco || null,
        api_response_metadata: {
          response_time: new Date().toISOString(),
          endpoint: endpoint,
          total_results: apiResponse.data.length
        },
        price_change_percent: priceChangePercent
      });

    if (historyError) {
      console.error(`Error inserting price history for item ${item.id}:`, historyError);
      return false;
    }

    // Update tracked item with latest info
    const { error: updateError } = await supabase
      .from('tracked_items')
      .update({
        last_updated_at: new Date().toISOString(),
        last_price: currentPrice,
        price_trend: priceTrend
      })
      .eq('id', item.id);

    if (updateError) {
      console.error(`Error updating tracked item ${item.id}:`, updateError);
      return false;
    }

    console.log(`Successfully updated item ${item.id} with price ${currentPrice}`);
    return true;

  } catch (error) {
    console.error(`Error updating item ${item.id}:`, error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting tracked prices update job...');
    
    // Get all active items for daily update
    const { data: itemsToUpdate, error: fetchError } = await supabase
      .from('tracked_items')
      .select(`
        id,
        user_id,
        item_type,
        search_criteria,
        nickname
      `)
      .eq('is_active', true);

    if (fetchError) {
      console.error('Error fetching items to update:', fetchError);
      throw fetchError;
    }

    if (!itemsToUpdate || itemsToUpdate.length === 0) {
      console.log('No items need updating at this time');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No items need updating',
          items_processed: 0 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${itemsToUpdate.length} items to update`);

    // CORREÇÃO: Processa apenas 1 item por execução para evitar timeout da Edge Function
    const MAX_EXECUTION_TIME_MS = 85000; // 85s limite para deixar margem
    const startTime = Date.now();
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Processamento otimizado: apenas 1 item por execução
    const itemToProcess = itemsToUpdate[0]; // Sempre pega o primeiro item
    
    console.log(`Processing single item: ${itemToProcess.id} (${itemToProcess.nickname})`);
    
    try {
      // Verificar se ainda temos tempo suficiente
      const elapsedTime = Date.now() - startTime;
      if (elapsedTime > MAX_EXECUTION_TIME_MS) {
        console.warn(`Execution time limit reached. Skipping item ${itemToProcess.id}`);
        errorCount++;
        errors.push(`Item ${itemToProcess.id}: Execution timeout`);
      } else {
        const success = await updateItemPrice(itemToProcess);
        if (success) {
          successCount++;
          console.log(`Successfully processed item ${itemToProcess.id}`);
        } else {
          errorCount++;
          errors.push(`Item ${itemToProcess.id}: Update failed`);
        }
      }
    } catch (error) {
      errorCount++;
      errors.push(`Item ${itemToProcess.id}: ${error.message}`);
      console.error(`Error processing item ${itemToProcess.id}:`, error);
    }

    // Se há mais itens para processar, usar Background Task para continuar
    if (itemsToUpdate.length > 1) {
      console.log(`Scheduling background processing for remaining ${itemsToUpdate.length - 1} items`);
      
      // Background task para processar próximo item
      EdgeRuntime.waitUntil(
        (async () => {
          try {
            // Aguardar 30 segundos antes de processar próximo item
            await delay(30000);
            
            // Chamar recursivamente para próximo item
            const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/update-tracked-prices`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`,
                'Content-Type': 'application/json'
              }
            });
            
            console.log('Background task initiated for next item');
          } catch (bgError) {
            console.error('Background task failed:', bgError);
          }
        })()
      );
    }

    const result = {
      success: true,
      message: `Processed 1 item of ${itemsToUpdate.length} total items`,
      items_processed: 1,
      total_items_in_queue: itemsToUpdate.length,
      successful_updates: successCount,
      failed_updates: errorCount,
      errors: errors.length > 0 ? errors : undefined,
      execution_time_ms: Date.now() - startTime
    };

    console.log('Update job completed:', result);

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Critical error in update-tracked-prices function:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred',
        timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});