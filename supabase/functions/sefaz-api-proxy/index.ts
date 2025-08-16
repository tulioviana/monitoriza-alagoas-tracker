import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration for SEFAZ API
const SEFAZ_BASE_URL = 'https://api.nfce.sefaz.go.gov.br/nfce/v1';
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 3000; // 3 seconds
const REQUEST_TIMEOUT = 120000; // 120 seconds (increased for SEFAZ instability)

// Helper function to delay execution
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Convert payload types to ensure proper data types for SEFAZ API
function convertPayloadTypes(payload: any): any {
  // Cria uma cópia profunda para evitar modificar o objeto original
  const convertedPayload = JSON.parse(JSON.stringify(payload));

  // Converte 'codigoIBGE' para número, se existir
  if (convertedPayload.estabelecimento?.municipio?.codigoIBGE) {
    convertedPayload.estabelecimento.municipio.codigoIBGE = parseInt(
      String(convertedPayload.estabelecimento.municipio.codigoIBGE),
      10
    );
  }

  // Converte 'tipoCombustivel' para número, se existir
  if (convertedPayload.produto?.tipoCombustivel) {
    convertedPayload.produto.tipoCombustivel = parseInt(
      String(convertedPayload.produto.tipoCombustivel),
      10
    );
  }

  // Garante que 'gtin' seja uma string limpa (apenas dígitos), se existir
  if (convertedPayload.produto?.gtin) {
    convertedPayload.produto.gtin = String(convertedPayload.produto.gtin).replace(
      /\D/g,
      ''
    );
  }

  // Garante que 'cnpj' seja uma string limpa (apenas dígitos), se existir
  if (convertedPayload.estabelecimento?.individual?.cnpj) {
    convertedPayload.estabelecimento.individual.cnpj = String(
      convertedPayload.estabelecimento.individual.cnpj
    ).replace(/\D/g, '');
  }

  // Converte dados de geolocalização para números, se existirem
  if (convertedPayload.estabelecimento?.geolocalizacao?.latitude) {
    convertedPayload.estabelecimento.geolocalizacao.latitude = parseFloat(
      String(convertedPayload.estabelecimento.geolocalizacao.latitude)
    );
  }
  if (convertedPayload.estabelecimento?.geolocalizacao?.longitude) {
    convertedPayload.estabelecimento.geolocalizacao.longitude = parseFloat(
      String(convertedPayload.estabelecimento.geolocalizacao.longitude)
    );
  }
  if (convertedPayload.estabelecimento?.geolocalizacao?.raio) {
    convertedPayload.estabelecimento.geolocalizacao.raio = parseInt(
      String(convertedPayload.estabelecimento.geolocalizacao.raio),
      10
    );
  }

  return convertedPayload;
}

// Enhanced fetch with timeout and retry logic
async function fetchWithTimeout(
  url: string, 
  options: RequestInit, 
  timeoutMs: number = REQUEST_TIMEOUT
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeoutMs}ms`);
    }
    throw error;
  }
}

// Main function to call SEFAZ API with retry logic
async function callSefazAPI(endpoint: string, payload: any): Promise<any> {
  const url = `${SEFAZ_BASE_URL}/${endpoint}`;
  const token = Deno.env.get('SEFAZ_APP_TOKEN');

  if (!token) {
    throw new Error('SEFAZ_APP_TOKEN not configured');
  }

  console.log(`[SEFAZ-PROXY] Calling endpoint: ${endpoint}`);
  console.log(`[SEFAZ-PROXY] Payload:`, JSON.stringify(payload, null, 2));

  let lastError: Error | null = null;
  let retryDelay = INITIAL_RETRY_DELAY;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`[SEFAZ-PROXY] Attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`);

      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-APP-TOKEN': token,
        },
        body: JSON.stringify(payload),
      });

      console.log(`[SEFAZ-PROXY] Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SEFAZ-PROXY] HTTP Error ${response.status}:`, errorText);
        
        // For 5xx errors or 429 (rate limit), retry
        if (response.status >= 500 || response.status === 429) {
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        } else {
          // For 4xx errors (except 429), don't retry
          return {
            error: `HTTP ${response.status}: ${errorText}`,
            statusCode: response.status,
            details: errorText
          };
        }
      }

      const data = await response.json();
      console.log(`[SEFAZ-PROXY] Success:`, {
        totalRegistros: data.totalRegistros,
        conteudoLength: data.conteudo?.length || 0
      });

      return data;

    } catch (error) {
      lastError = error;
      console.error(`[SEFAZ-PROXY] Attempt ${attempt} failed:`, error.message);

      // If this is not the last attempt, wait before retrying
      if (attempt < MAX_RETRY_ATTEMPTS) {
        console.log(`[SEFAZ-PROXY] Waiting ${retryDelay}ms before retry...`);
        await delay(retryDelay);
        retryDelay *= 2; // Exponential backoff
      }
    }
  }

  // All attempts failed
  console.error(`[SEFAZ-PROXY] All ${MAX_RETRY_ATTEMPTS} attempts failed`);
  throw lastError || new Error('All retry attempts failed');
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Handle GET requests as health check
  if (req.method === 'GET') {
    const token = Deno.env.get('SEFAZ_APP_TOKEN');
    return new Response(
      JSON.stringify({ 
        status: 'healthy',
        message: 'SEFAZ API Proxy is running',
        tokenConfigured: !!token,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  try {
    // 1. Leia o corpo da requisição como texto primeiro
    const bodyText = await req.text();

    // 2. Verifique se o corpo está vazio
    if (!bodyText) {
      console.error('[SEFAZ-PROXY] Error: Received empty request body.');
      return new Response(JSON.stringify({ error: 'Request body is empty' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Só agora tente fazer o parse do JSON
    let parsedBody;
    try {
      parsedBody = JSON.parse(bodyText);
    } catch (parseError) {
      console.error('[SEFAZ-PROXY] JSON parse error:', parseError.message);
      return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { endpoint, payload } = parsedBody;

    if (!endpoint || !payload) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing endpoint or payload',
          statusCode: 400
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate endpoint
    const validEndpoints = ['produto/pesquisa', 'combustivel/pesquisa'];
    if (!validEndpoints.includes(endpoint)) {
      return new Response(
        JSON.stringify({ 
          error: `Invalid endpoint. Valid endpoints: ${validEndpoints.join(', ')}`,
          statusCode: 400
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Convert payload types before sending to SEFAZ API
    console.log('[SEFAZ-PROXY] Original payload:', JSON.stringify(payload, null, 2));
    const convertedPayload = convertPayloadTypes(payload);
    console.log('[SEFAZ-PROXY] Converted payload:', JSON.stringify(convertedPayload, null, 2));

    // Call SEFAZ API
    const result = await callSefazAPI(endpoint, convertedPayload);

    // Check if result contains an error
    if (result.error) {
      return new Response(
        JSON.stringify(result),
        { 
          status: result.statusCode || 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify(result),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[SEFAZ-PROXY] Critical error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        statusCode: 500,
        details: 'Check function logs for more details'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});