import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration for SEFAZ API
const SEFAZ_BASE_URL = 'http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public';
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

  // Clean and validate token (remove newlines and whitespace)
  const cleanToken = token ? token.replace(/\n/g, '').trim() : '';
  
  console.log('[SEFAZ-PROXY] 🔍 Token validation:');
  console.log('[SEFAZ-PROXY] - Raw token exists:', !!token);
  console.log('[SEFAZ-PROXY] - Raw token length:', token ? token.length : 0);
  console.log('[SEFAZ-PROXY] - Raw token preview:', token ? `"${token.substring(0, 20)}..."` : 'null');
  console.log('[SEFAZ-PROXY] - Clean token length:', cleanToken.length);
  console.log('[SEFAZ-PROXY] - Clean token preview:', cleanToken ? `"${cleanToken.substring(0, 20)}..."` : 'empty');

  if (!cleanToken || cleanToken.length < 10) {
    console.error('[SEFAZ-PROXY] ❌ SEFAZ_APP_TOKEN invalid after cleaning');
    console.error('[SEFAZ-PROXY] ❌ Token must be at least 10 characters');
    throw new Error('SEFAZ_APP_TOKEN not configured or empty');
  }

  console.log(`[SEFAZ-PROXY] 🚀 Calling endpoint: ${endpoint}`);
  console.log(`[SEFAZ-PROXY] 🎯 Full URL: ${url}`);
  console.log(`[SEFAZ-PROXY] 🔑 Clean token configured: ${cleanToken.substring(0, 10)}...`);
  console.log(`[SEFAZ-PROXY] 📦 Payload:`, JSON.stringify(payload, null, 2));

  let lastError: Error | null = null;
  let retryDelay = INITIAL_RETRY_DELAY;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      console.log(`[SEFAZ-PROXY] Attempt ${attempt}/${MAX_RETRY_ATTEMPTS}`);

      const requestHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-APP-TOKEN': cleanToken,
      };

      console.log(`[SEFAZ-PROXY] 📡 Request headers:`, requestHeaders);
      console.log(`[SEFAZ-PROXY] 📤 Request body:`, JSON.stringify(payload));

      const response = await fetchWithTimeout(url, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify(payload),
      });

      console.log(`[SEFAZ-PROXY] 📥 Response status: ${response.status}`);
      console.log(`[SEFAZ-PROXY] 📥 Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SEFAZ-PROXY] ❌ HTTP Error ${response.status}:`, errorText);
        
        // Enhanced error analysis
        let diagnosis = '';
        if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html>')) {
          diagnosis = 'HTML response received instead of JSON - possible authentication/token issue';
          console.error(`[SEFAZ-PROXY] 🔍 Diagnosis: ${diagnosis}`);
        } else if (errorText.includes('Acesso negado') || errorText.includes('Access denied')) {
          diagnosis = 'Access denied - token may be invalid, expired, or lacking permissions';
          console.error(`[SEFAZ-PROXY] 🔍 Diagnosis: ${diagnosis}`);
        } else if (errorText.includes('Internal Server Error')) {
          diagnosis = 'Internal server error from SEFAZ API';
          console.error(`[SEFAZ-PROXY] 🔍 Diagnosis: ${diagnosis}`);
        }
        
        // For 5xx errors or 429 (rate limit), retry
        if (response.status >= 500 || response.status === 429) {
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        } else {
          // For 4xx errors (except 429), don't retry
          return {
            error: `HTTP ${response.status}: ${errorText}`,
            statusCode: response.status,
            details: errorText,
            url: url,
            diagnosis: diagnosis || 'Client error - check request parameters'
          };
        }
      }

      const responseText = await response.text();
      console.log(`[SEFAZ-PROXY] 📥 Raw response length: ${responseText.length} characters`);
      console.log(`[SEFAZ-PROXY] 📥 Response preview: ${responseText.substring(0, 200)}...`);

      let data;
      try {
        data = JSON.parse(responseText);
        console.log(`[SEFAZ-PROXY] ✅ JSON parsing successful`);
      } catch (parseError) {
        console.error(`[SEFAZ-PROXY] ❌ Failed to parse JSON response:`, parseError.message);
        console.error(`[SEFAZ-PROXY] 📄 Raw response: ${responseText.substring(0, 500)}`);
        throw new Error(`Invalid JSON response from SEFAZ API: ${parseError.message}`);
      }

      console.log(`[SEFAZ-PROXY] ✅ Success:`, {
        totalRegistros: data.totalRegistros,
        conteudoLength: data.conteudo?.length || 0,
        responseKeys: Object.keys(data)
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
        baseUrl: SEFAZ_BASE_URL,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }

  // Enhanced logging for request debugging
  console.log(`[SEFAZ-PROXY] ${req.method} request received at ${new Date().toISOString()}`);
  console.log(`[SEFAZ-PROXY] Request URL: ${req.url}`);
  console.log(`[SEFAZ-PROXY] Request headers:`, Object.fromEntries(req.headers.entries()));

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
      enhancedError.details = 'Request timed out - SEFAZ API may be slow or unresponsive';
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