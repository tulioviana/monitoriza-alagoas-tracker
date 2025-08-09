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
    
    // Call SEFAZ API via sefaz-api-proxy Edge Function
    const endpoint = item.item_type === 'produto' ? 'produto/pesquisa' : 'combustivel/pesquisa';
    const apiResponse = await callSefazViaProxy(endpoint, item.search_criteria);
    
    // Check if we have results in the SEFAZ API response format
    if (!apiResponse.conteudo || !Array.isArray(apiResponse.conteudo) || apiResponse.conteudo.length === 0) {
      console.log(`No data found for item ${item.id}`);
      return false;
    }

    // Get the first result (most relevant) using SEFAZ API structure
    const priceData = apiResponse.conteudo[0];
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

    // Process all items in a single batch for daily execution
    const startTime = Date.now();
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    console.log(`[DAILY-UPDATE] Processing ${itemsToUpdate.length} items...`);
    
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
    const result = {
      success: true,
      message: `Daily update completed: ${successCount} successful, ${errorCount} failed`,
      items_processed: itemsToUpdate.length,
      successful_updates: successCount,
      failed_updates: errorCount,
      errors: errors.length > 0 ? errors : undefined,
      execution_time_ms: executionTimeMs,
      execution_mode: 'daily_batch'
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