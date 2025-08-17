import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration for SEFAZ API - Conforme documentação oficial
const SEFAZ_BASE_URL = 'http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public';
const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 30000; // 30 seconds - increased for better recovery
const REQUEST_TIMEOUT = 6 * 60 * 1000; // 6 minutes - increased timeout

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

// Simplified SEFAZ API call with basic retry logic
async function callSefazAPI(endpoint: string, payload: any): Promise<any> {
  const url = `${SEFAZ_BASE_URL}/${endpoint}`;
  
  // Get token directly without excessive processing
  const token = Deno.env.get('SEFAZ_APP_TOKEN');
  
  // Detailed token diagnostics - Conforme documentação SEFAZ
  console.log(`[SEFAZ-PROXY] 🔑 Token diagnostics:`, {
    exists: !!token,
    length: token?.length || 0,
    isEmpty: !token || token.trim() === '',
    format: token ? `${token.substring(0, 10)}...` : 'null'
  });
  
  if (!token || token.trim() === '') {
    console.log(`[SEFAZ-PROXY] ❌ Token validation failed: SEFAZ_APP_TOKEN is null, undefined, or empty`);
    throw new Error('SEFAZ_APP_TOKEN not configured or invalid');
  }
  
  if (token.length < 5) {
    console.log(`[SEFAZ-PROXY] ❌ Token validation failed: Token too short (${token.length} characters)`);
    throw new Error('SEFAZ_APP_TOKEN not configured or invalid');
  }
  
  console.log(`[SEFAZ-PROXY] ✅ Token validation passed (${token.length} characters)`);
  console.log(`[SEFAZ-PROXY] 🚀 Calling endpoint: ${endpoint}`);

  let lastError: Error | null = null;
  let retryDelay = INITIAL_RETRY_DELAY;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const attemptStartTime = Date.now();
      console.log(`[SEFAZ-PROXY] Attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`);

      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'AppToken': token, // Header conforme documentação oficial SEFAZ
        },
        body: JSON.stringify(payload),
      });

      const actualDurationMs = Date.now() - attemptStartTime;
      console.log(`[SEFAZ-PROXY] Response status: ${response.status}, duration: ${actualDurationMs}ms`);

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

      const responseText = await response.text();
      
      try {
        const data = JSON.parse(responseText);
        console.log(`[SEFAZ-PROXY] ✅ Success - Duration: ${actualDurationMs}ms`);
        return data;
      } catch (parseError) {
        console.error(`[SEFAZ-PROXY] Failed to parse JSON:`, parseError.message);
        throw new Error(`Invalid JSON response: ${parseError.message}`);
      }

    } catch (error) {
      lastError = error;
      console.error(`[SEFAZ-PROXY] Attempt ${attempt} failed:`, error.message);

      // If this is not the last attempt, wait before retrying
      if (attempt < MAX_RETRY_ATTEMPTS) {
        console.log(`[SEFAZ-PROXY] Waiting ${retryDelay}ms before retry...`);
        await delay(retryDelay);
        // Exponential backoff with progressive delays for better recovery
        retryDelay = attempt === 1 ? 60000 : 120000; // 1min then 2min
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
        message: 'SEFAZ API Proxy is running - Simplified',
        tokenConfigured: !!token,
        baseUrl: SEFAZ_BASE_URL,
        timeout: `${REQUEST_TIMEOUT}ms`,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  console.log(`[SEFAZ-PROXY] ${req.method} request received`);

  try {
    // 1. Leia o corpo da requisição como texto primeiro
    const bodyText = await req.text();
    console.log(`[SEFAZ-PROXY] Raw body length: ${bodyText?.length || 0} characters`);

    // 2. Verifique se o corpo está vazio
    if (!bodyText || bodyText.trim() === '') {
      console.error('[SEFAZ-PROXY] Error: Received empty request body.');
      console.error('[SEFAZ-PROXY] This usually indicates a problem with the frontend request');
      return new Response(JSON.stringify({ 
        error: 'Request body is empty',
        details: 'The request body must contain { endpoint, payload }',
        expectedFormat: '{ "endpoint": "produto/pesquisa", "payload": {...} }'
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`[SEFAZ-PROXY] Raw body content: ${bodyText.substring(0, 500)}...`);

    // 3. Só agora tente fazer o parse do JSON
    let parsedBody;
    try {
      parsedBody = JSON.parse(bodyText);
      console.log('[SEFAZ-PROXY] JSON parsing successful');
    } catch (parseError) {
      console.error('[SEFAZ-PROXY] JSON parse error:', parseError.message);
      console.error('[SEFAZ-PROXY] Invalid JSON content:', bodyText.substring(0, 200));
      return new Response(JSON.stringify({ 
        error: 'Invalid JSON payload',
        details: parseError.message,
        receivedContent: bodyText.substring(0, 100)
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[SEFAZ-PROXY] Parsed body structure:', Object.keys(parsedBody));
    const { endpoint, payload } = parsedBody;

    if (!endpoint || !payload) {
      console.error('[SEFAZ-PROXY] Missing required fields:', { 
        hasEndpoint: !!endpoint, 
        hasPayload: !!payload,
        endpointType: typeof endpoint,
        payloadType: typeof payload
      });
      return new Response(
        JSON.stringify({ 
          error: 'Missing endpoint or payload',
          details: 'Request must contain both "endpoint" and "payload" fields',
          received: { 
            endpoint: endpoint || 'missing', 
            payload: payload ? 'present' : 'missing' 
          },
          statusCode: 400
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[SEFAZ-PROXY] Endpoint: ${endpoint}`);
    console.log(`[SEFAZ-PROXY] Payload keys: ${Object.keys(payload || {}).join(', ')}`);

    // Validate endpoint
    const validEndpoints = ['produto/pesquisa', 'combustivel/pesquisa'];
    if (!validEndpoints.includes(endpoint)) {
      console.error(`[SEFAZ-PROXY] Invalid endpoint received: ${endpoint}`);
      console.error(`[SEFAZ-PROXY] Valid endpoints are: ${validEndpoints.join(', ')}`);
      return new Response(
        JSON.stringify({ 
          error: `Invalid endpoint: ${endpoint}`,
          details: `Valid endpoints are: ${validEndpoints.join(', ')}`,
          statusCode: 400
        }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    console.log(`[SEFAZ-PROXY] ✅ Endpoint validated: ${endpoint}`);

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
    console.error('[SEFAZ-PROXY] ❌ Critical error:', error);
    console.error('[SEFAZ-PROXY] 📋 Error stack:', error.stack);
    
    // Enhanced error reporting
    let enhancedError = {
      error: error.message || 'Internal server error',
      statusCode: 500,
      details: 'Check function logs for more details',
      timestamp: new Date().toISOString(),
      requestInfo: {
        method: req.method,
        url: req.url,
        hasBody: !!req.body
      }
    };

    // Add specific error context
    if (error.message?.includes('timeout')) {
      enhancedError.details = `Request timed out after ${REQUEST_TIMEOUT/1000/60} minutes - SEFAZ API may be experiencing instability. Current timeout allows for up to 5 minutes.`;
    } else if (error.message?.includes('network')) {
      enhancedError.details = 'Network error connecting to SEFAZ API';
    } else if (error.message?.includes('JSON')) {
      enhancedError.details = 'Invalid response format from SEFAZ API';
    }
    
    return new Response(
      JSON.stringify(enhancedError),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});