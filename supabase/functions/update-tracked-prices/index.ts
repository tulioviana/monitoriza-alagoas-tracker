import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.5";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
  establishment_cnpj?: string;
  establishment_name?: string;
}

// Function to call sefaz-api-proxy Edge Function
async function callSefazViaProxy(endpoint: string, searchData: any): Promise<any> {
  try {
    console.log(`[INFO] Calling sefaz-api-proxy for endpoint: ${endpoint}`);
    console.log('Search data:', JSON.stringify(searchData, null, 2));
    
    // Use the same structure as the frontend: { endpoint, payload }
    const { data, error } = await supabase.functions.invoke('sefaz-api-proxy', {
      body: {
        endpoint,
        payload: searchData
      }
    });

    if (error) {
      console.error('[ERROR] sefaz-api-proxy invocation failed:', error);
      throw new Error(`Proxy call failed: ${error.message || error}`);
    }

    if (!data) {
      console.error('[ERROR] No data returned from sefaz-api-proxy');
      throw new Error('No data returned from sefaz-api-proxy');
    }

    // Handle error response from sefaz-api-proxy
    if (data.error) {
      console.error('[ERROR] sefaz-api-proxy returned error:', data.error);
      console.error('[ERROR] Error details:', data.details);
      console.error('[ERROR] Status code:', data.statusCode);
      throw new Error(`SEFAZ API error: ${data.error}`);
    }

    console.log(`[SUCCESS] sefaz-api-proxy returned:`, {
      totalRegistros: data.totalRegistros,
      conteudoLength: data.conteudo?.length || 0
    });

    return data;
  } catch (error) {
    console.error('[ERROR] Failed to call sefaz-api-proxy:', error);
    throw error;
  }
}

// Helper: delay for ms
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Removed direct SEFAZ API call - now using sefaz-api-proxy


async function updateItemPrice(item: TrackedItem): Promise<boolean> {
  try {
    console.log(`[AUTO-UPDATE] Processing item ${item.id} (${item.nickname})`);
    console.log('Search criteria:', JSON.stringify(item.search_criteria, null, 2));
    
    // Adjust search criteria for products - force 7 days search period
    let adjustedCriteria = { ...item.search_criteria };
    if (item.item_type === 'produto') {
      adjustedCriteria.dias = 7;
      console.log(`[ADJUSTMENT] Forcing 7-day search period for product ${item.id}`);
    }
    
    // Call SEFAZ API via sefaz-api-proxy Edge Function
    const endpoint = item.item_type === 'produto' ? 'produto/pesquisa' : 'combustivel/pesquisa';
    const apiResponse = await callSefazViaProxy(endpoint, adjustedCriteria);
    
    // Check if we have results in the SEFAZ API response format
    if (!apiResponse.conteudo || !Array.isArray(apiResponse.conteudo) || apiResponse.conteudo.length === 0) {
      console.log(`No data found for item ${item.id}`);
      return false;
    }

    // Find the specific establishment by CNPJ or get the first result as fallback
    let priceData = apiResponse.conteudo[0]; // Default fallback
    
    if (item.establishment_cnpj) {
      const specificEstablishment = apiResponse.conteudo.find(
        (result: any) => result.estabelecimento?.cnpj === item.establishment_cnpj
      );
      
      if (specificEstablishment) {
        priceData = specificEstablishment;
        console.log(`[SUCCESS] Found specific establishment ${item.establishment_cnpj} for item ${item.id}`);
      } else {
        console.warn(`[FALLBACK] Establishment ${item.establishment_cnpj} not found for item ${item.id}, using first result`);
      }
    } else {
      console.warn(`[FALLBACK] No specific establishment CNPJ for item ${item.id}, using first result`);
    }
    const currentPrice = parseFloat(priceData.produto?.venda?.valorVenda || '0');
    
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

    // Insert price history record using correct SEFAZ API structure
    const { error: historyError } = await supabase
      .from('price_history')
      .insert({
        tracked_item_id: item.id,
        sale_price: currentPrice,
        declared_price: priceData.produto?.venda?.valorDeclarado ? parseFloat(priceData.produto.venda.valorDeclarado.toString()) : null,
        establishment_name: priceData.estabelecimento?.nomeFantasia || priceData.estabelecimento?.razaoSocial,
        establishment_cnpj: priceData.estabelecimento?.cnpj,
        establishment_address: priceData.estabelecimento?.endereco ? JSON.stringify(priceData.estabelecimento.endereco) : null,
        api_response_metadata: {
          response_time: new Date().toISOString(),
          endpoint: endpoint,
          total_results: apiResponse.conteudo.length,
          sale_date: priceData.produto?.venda?.dataVenda
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

  const startTime = Date.now();
  let executionLogId: string | null = null;

  try {
    // Parse request body to check for manual execution
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const isManualExecution = body.execution_type === 'manual';
    const targetUserId = body.user_id;

    // Create execution log entry
    const { data: logEntry, error: logError } = await supabase
      .from('system_execution_logs')
      .insert({
        function_name: 'update-tracked-prices',
        execution_type: isManualExecution ? 'manual' : 'automatic',
        status: 'running'
      })
      .select()
      .single();

    if (logError) {
      console.error('⚠️ Failed to create execution log:', logError);
    } else {
      executionLogId = logEntry.id;
      console.log(`📝 Created execution log: ${executionLogId}`);
    }
    
    if (isManualExecution) {
      console.log(`[MANUAL-UPDATE] Starting manual update for user: ${targetUserId}`);
      
      // Validate authentication for manual execution
      if (!targetUserId) {
        console.error('[MANUAL-UPDATE] No user_id provided for manual execution');
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'User ID is required for manual execution',
            timestamp: new Date().toISOString()
          }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400
          }
        );
      }
    } else {
      console.log('[AUTO-UPDATE] Starting scheduled/cron update job...');
      console.log('[AUTO-UPDATE] Execution time:', new Date().toISOString());
      console.log('[AUTO-UPDATE] Expected to run daily at 6 AM (UTC-3)');
    }
    
    // Build query based on execution type
    let query = supabase
      .from('tracked_items')
      .select(`
        id,
        user_id,
        item_type,
        search_criteria,
        nickname,
        establishment_cnpj,
        establishment_name
      `)
      .eq('is_active', true);
    
    // For manual execution, filter by specific user
    if (isManualExecution && targetUserId) {
      query = query.eq('user_id', targetUserId);
    }
    
    const { data: itemsToUpdate, error: fetchError } = await query;

    if (fetchError) {
      console.error('Error fetching items to update:', fetchError);
      throw fetchError;
    }

    if (!itemsToUpdate || itemsToUpdate.length === 0) {
      const executionTypeLog = isManualExecution ? '[MANUAL-UPDATE]' : '[AUTO-UPDATE]';
      const messageDetail = isManualExecution 
        ? `No items found for user ${targetUserId}` 
        : 'No items need updating at this time';
      
      console.log(`${executionTypeLog} ${messageDetail}`);
      
      // Update execution log
      if (executionLogId) {
        await supabase
          .from('system_execution_logs')
          .update({
            status: 'success',
            items_processed: 0,
            items_successful: 0,
            items_failed: 0,
            completed_at: new Date().toISOString(),
            duration_ms: Date.now() - startTime
          })
          .eq('id', executionLogId);
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: messageDetail,
          items_processed: 0,
          execution_type: isManualExecution ? 'manual' : 'automatic'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const executionTypeLog = isManualExecution ? '[MANUAL-UPDATE]' : '[AUTO-UPDATE]';
    console.log(`${executionTypeLog} Found ${itemsToUpdate.length} items to update`);

    // Process all items in a single batch
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    console.log(`${executionTypeLog} Processing ${itemsToUpdate.length} items...`);
    
    // Process items with reasonable delays
    for (const [index, item] of itemsToUpdate.entries()) {
      try {
        console.log(`[${index + 1}/${itemsToUpdate.length}] Processing item ${item.id} (${item.nickname})`);
        
        const success = await updateItemPrice(item);
        if (success) {
          successCount++;
          console.log(`✅ Successfully updated item ${item.id}`);
        } else {
          errorCount++;
          errors.push(`Item ${item.id}: Update failed`);
          console.warn(`❌ Failed to update item ${item.id}`);
        }
        
        // Add delay between items to be respectful to APIs
        if (index < itemsToUpdate.length - 1) {
          await delay(2000); // 2 seconds between items
        }
        
      } catch (error) {
        errorCount++;
        errors.push(`Item ${item.id}: ${error.message}`);
        console.error(`💥 Error processing item ${item.id}:`, error);
      }
    }

    const executionTimeMs = Date.now() - startTime;
    const executionMode = isManualExecution ? 'manual_user' : 'automatic_batch';
    const messagePrefix = isManualExecution ? 'Manual update' : 'Automatic update';
    
    const result = {
      success: true,
      message: `${messagePrefix} completed: ${successCount} successful, ${errorCount} failed`,
      items_processed: itemsToUpdate.length,
      successful_updates: successCount,
      failed_updates: errorCount,
      errors: errors.length > 0 ? errors : undefined,
      execution_time_ms: executionTimeMs,
      execution_mode: executionMode,
      user_id: isManualExecution ? targetUserId : undefined
    };

    console.log('Update job completed:', result);

    // Update execution log with final results
    if (executionLogId) {
      await supabase
        .from('system_execution_logs')
        .update({
          status: errorCount === 0 ? 'success' : (successCount > 0 ? 'partial' : 'error'),
          items_processed: itemsToUpdate.length,
          items_successful: successCount,
          items_failed: errorCount,
          execution_details: result,
          completed_at: new Date().toISOString(),
          duration_ms: executionTimeMs,
          error_message: errors.length > 0 ? errors.join('; ') : null
        })
        .eq('id', executionLogId);
    }

    return new Response(
      JSON.stringify(result),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Critical error in update-tracked-prices function:', error);
    
    // Update execution log with error
    if (executionLogId) {
      await supabase
        .from('system_execution_logs')
        .update({
          status: 'error',
          error_message: error.message || 'Unknown error occurred',
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime
        })
        .eq('id', executionLogId);
    }
    
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