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
  item_id: number;
  user_id: string;
  item_type: 'produto' | 'combustivel';
  search_criteria: any;
  nickname: string;
  update_frequency_minutes: number;
}

async function callSefazAPI(endpoint: string, data: any, retryCount = 0): Promise<any> {
  const sefazToken = Deno.env.get('SEFAZ_APP_TOKEN');
  if (!sefazToken) {
    throw new Error('SEFAZ_APP_TOKEN not configured');
  }

  const maxRetries = 3;
  const timeout = 30000; // 30 seconds

  try {
    console.log(`Calling SEFAZ API: ${SEFAZ_API_BASE_URL}${endpoint} (attempt ${retryCount + 1}/${maxRetries})`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(`${SEFAZ_API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apptoken': sefazToken, // SEFAZ Alagoas uses 'apptoken' header
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SEFAZ API error: ${response.status} ${response.statusText} - ${errorText}`);
      throw new Error(`SEFAZ API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log(`SEFAZ API success for ${endpoint}:`, { 
      success: result.success, 
      dataLength: result.data?.length || 0 
    });
    
    return result;

  } catch (error) {
    console.error(`SEFAZ API call failed (attempt ${retryCount + 1}):`, error.message);
    
    if (retryCount < maxRetries - 1) {
      const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return callSefazAPI(endpoint, data, retryCount + 1);
    }
    
    throw error;
  }
}

async function updateItemPrice(item: TrackedItem): Promise<boolean> {
  try {
    console.log(`Updating price for item ${item.item_id} (${item.nickname})`);
    
    // Call SEFAZ API based on item type
    const endpoint = item.item_type === 'produto' ? 'produto/buscar' : 'combustivel/buscar';
    const apiResponse = await callSefazAPI(endpoint, item.search_criteria);
    
    if (!apiResponse.success || !apiResponse.data || apiResponse.data.length === 0) {
      console.log(`No data found for item ${item.item_id}`);
      return false;
    }

    // Get the first result (most relevant)
    const priceData = apiResponse.data[0];
    const currentPrice = parseFloat(priceData.preco_venda || priceData.preco || '0');
    
    if (currentPrice <= 0) {
      console.log(`Invalid price for item ${item.item_id}: ${currentPrice}`);
      return false;
    }

    // Calculate price trend
    const { data: trendData } = await supabase.rpc('calculate_price_trend', {
      p_tracked_item_id: item.item_id,
      p_new_price: currentPrice
    });

    const priceTrend = trendData || 'stable';

    // Calculate price change percentage
    const { data: lastPriceData } = await supabase
      .from('price_history')
      .select('sale_price')
      .eq('tracked_item_id', item.item_id)
      .order('fetch_date', { ascending: false })
      .limit(1)
      .single();

    let priceChangePercent = null;
    if (lastPriceData?.sale_price) {
      const lastPrice = parseFloat(lastPriceData.sale_price.toString());
      priceChangePercent = ((currentPrice - lastPrice) / lastPrice) * 100;
    }

    // Insert price history record
    const { error: historyError } = await supabase
      .from('price_history')
      .insert({
        tracked_item_id: item.item_id,
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
      console.error(`Error inserting price history for item ${item.item_id}:`, historyError);
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
      .eq('id', item.item_id);

    if (updateError) {
      console.error(`Error updating tracked item ${item.item_id}:`, updateError);
      return false;
    }

    console.log(`Successfully updated item ${item.item_id} with price ${currentPrice}`);
    return true;

  } catch (error) {
    console.error(`Error updating item ${item.item_id}:`, error);
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
    
    // Get items that need updating using our database function
    const { data: itemsToUpdate, error: fetchError } = await supabase
      .rpc('get_items_needing_update');

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

    // Process each item with error isolation
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    for (const item of itemsToUpdate) {
      try {
        const success = await updateItemPrice(item);
        if (success) {
          successCount++;
        } else {
          errorCount++;
          errors.push(`Failed to update item ${item.item_id}: Unknown error`);
        }
      } catch (error) {
        errorCount++;
        errors.push(`Failed to update item ${item.item_id}: ${error.message}`);
        console.error(`Error processing item ${item.item_id}:`, error);
      }

      // Add small delay to avoid overwhelming the SEFAZ API
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const result = {
      success: true,
      message: `Processed ${itemsToUpdate.length} items`,
      items_processed: itemsToUpdate.length,
      successful_updates: successCount,
      failed_updates: errorCount,
      errors: errors.length > 0 ? errors : undefined
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