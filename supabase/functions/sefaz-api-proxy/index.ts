import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configuration for SEFAZ API - Updated for instability periods with patience mode
const SEFAZ_BASE_URL = 'http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public';
const MAX_RETRY_ATTEMPTS = 2; // Reduced due to longer individual attempts
const INITIAL_RETRY_DELAY = 30000; // 30 seconds (increased for instability)
const REQUEST_TIMEOUT = 300000; // 5 minutes (300 seconds) - allows for SEFAZ instability periods
const MINIMUM_ATTEMPT_DURATION = 120000; // 2 minutes minimum per attempt (for patience mode)
const INSTABILITY_THRESHOLD = 30000; // If fails in less than 30s, consider it instability

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
  
  // Debug ALL environment variables related to SEFAZ - CRITICAL for duplicate token issue
  console.log(`[SEFAZ-PROXY] 🔍 Environment Debug (Duplicate Token Investigation):`);
  const envObj = Deno.env.toObject();
  const allKeys = Object.keys(envObj);
  const sefazKeys = allKeys.filter(key => key.includes('SEFAZ'));
  
  console.log(`[SEFAZ-PROXY] - Total env variables: ${allKeys.length}`);
  console.log(`[SEFAZ-PROXY] - SEFAZ-related variables found: ${sefazKeys.length}`);
  console.log(`[SEFAZ-PROXY] - SEFAZ variable names: [${sefazKeys.join(', ')}]`);
  
  // Check each SEFAZ variable
  sefazKeys.forEach((key, index) => {
    const value = envObj[key];
    console.log(`[SEFAZ-PROXY] - ${key} [${index + 1}]: exists=${!!value}, length=${value?.length || 0}, preview="${value?.substring(0, 15) || 'null'}..."`);
  });
  
  // Get the primary token
  const token = Deno.env.get('SEFAZ_APP_TOKEN');
  const cleanToken = token?.trim().replace(/[\r\n\t]/g, '') || '';
  
  console.log(`[SEFAZ-PROXY] 🔍 Primary Token Analysis:`);
  console.log(`[SEFAZ-PROXY] - Raw token exists: ${!!token}`);
  console.log(`[SEFAZ-PROXY] - Raw token length: ${token?.length || 0}`);
  console.log(`[SEFAZ-PROXY] - Raw token preview: "${token?.substring(0, 20) || 'null'}..."`);
  console.log(`[SEFAZ-PROXY] - Clean token length: ${cleanToken.length}`);
  console.log(`[SEFAZ-PROXY] - Clean token preview: "${cleanToken.substring(0, 20) || 'empty'}..."`);

  // Enhanced validation with duplicate detection warning
  if (!cleanToken || cleanToken.length < 10) {
    console.error('[SEFAZ-PROXY] ❌ SEFAZ_APP_TOKEN invalid after cleaning');
    console.error('[SEFAZ-PROXY] ❌ Token must be at least 10 characters');
    if (sefazKeys.length > 1) {
      console.error('[SEFAZ-PROXY] ❌ CRITICAL: Multiple SEFAZ_APP_TOKEN secrets detected! This causes conflicts.');
      console.error('[SEFAZ-PROXY] ❌ SOLUTION: Remove duplicate secrets from Supabase Edge Functions Secrets');
      console.error('[SEFAZ-PROXY] ❌ DETECTED DUPLICATES:', sefazKeys);
    }
    throw new Error(`SEFAZ_APP_TOKEN not configured or empty. Duplicates detected: ${sefazKeys.length > 1 ? 'YES' : 'NO'}`);
  }

  console.log(`[SEFAZ-PROXY] 🚀 Calling endpoint: ${endpoint}`);
  console.log(`[SEFAZ-PROXY] 🎯 Full URL: ${url}`);
  console.log(`[SEFAZ-PROXY] 🔑 Clean token configured: ${cleanToken.substring(0, 10)}...`);
  console.log(`[SEFAZ-PROXY] 📦 Payload:`, JSON.stringify(payload, null, 2));

  let lastError: Error | null = null;
  let retryDelay = INITIAL_RETRY_DELAY;

  for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      const attemptStartTime = Date.now();
      const attemptStartTimeISO = new Date(attemptStartTime).toISOString();
      console.log(`[SEFAZ-PROXY] Attempt ${attempt}/${MAX_RETRY_ATTEMPTS} - Starting at ${attemptStartTimeISO}`);
      console.log(`[SEFAZ-PROXY] ⏱️ Timeout configured: ${REQUEST_TIMEOUT}ms (${REQUEST_TIMEOUT/1000/60} minutes)`);
      console.log(`[SEFAZ-PROXY] 🕐 Minimum attempt duration: ${MINIMUM_ATTEMPT_DURATION}ms (${MINIMUM_ATTEMPT_DURATION/1000/60} minutes)`);

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

      const responseTime = Date.now();
      const actualDurationMs = responseTime - attemptStartTime;
      const responseTimeISO = new Date(responseTime).toISOString();
      
      console.log(`[SEFAZ-PROXY] 📥 Response received at ${responseTimeISO}`);
      console.log(`[SEFAZ-PROXY] ⏱️ Actual request duration: ${actualDurationMs}ms (${(actualDurationMs/1000).toFixed(1)}s)`);
      console.log(`[SEFAZ-PROXY] 📥 Response status: ${response.status}`);
      console.log(`[SEFAZ-PROXY] 📥 Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[SEFAZ-PROXY] ❌ HTTP Error ${response.status}:`, errorText);
        
        // Enhanced error analysis with instability detection
        let diagnosis = '';
        let isInstabilityError = false;
        
        if (errorText.includes('<!DOCTYPE html>') || errorText.includes('<html>')) {
          diagnosis = 'HTML response received instead of JSON - possible authentication/token issue';
          console.error(`[SEFAZ-PROXY] 🔍 Diagnosis: ${diagnosis}`);
        } else if (errorText.includes('Acesso negado') || errorText.includes('Access denied')) {
          diagnosis = 'Access denied - token may be invalid, expired, or lacking permissions. During instability periods, this can also indicate SEFAZ API overload.';
          console.error(`[SEFAZ-PROXY] 🔍 Diagnosis: ${diagnosis}`);
          console.error(`[SEFAZ-PROXY] 🔍 Note: During SEFAZ instability, "Access denied" errors may occur due to API overload rather than authentication issues`);
          
          // Check if this is likely instability (fast response with access denied)
          if (actualDurationMs < INSTABILITY_THRESHOLD) {
            isInstabilityError = true;
            console.error(`[SEFAZ-PROXY] 🚨 INSTABILITY DETECTED: Request failed in ${actualDurationMs}ms (< ${INSTABILITY_THRESHOLD}ms)`);
            console.error(`[SEFAZ-PROXY] 🔄 This indicates SEFAZ API instability - will apply patience mode`);
          }
        } else if (errorText.includes('Internal Server Error')) {
          diagnosis = 'Internal server error from SEFAZ API - likely instability or overload';
          console.error(`[SEFAZ-PROXY] 🔍 Diagnosis: ${diagnosis}`);
          isInstabilityError = actualDurationMs < INSTABILITY_THRESHOLD;
        }
        
        // PATIENCE MODE: If error happened too quickly, enforce minimum wait time
        if (isInstabilityError && actualDurationMs < MINIMUM_ATTEMPT_DURATION) {
          const patienceDelay = MINIMUM_ATTEMPT_DURATION - actualDurationMs;
          console.log(`[SEFAZ-PROXY] 🕐 PATIENCE MODE: Error occurred in ${actualDurationMs}ms, waiting additional ${patienceDelay}ms to reach minimum duration`);
          console.log(`[SEFAZ-PROXY] 🌊 Total patience time: ${MINIMUM_ATTEMPT_DURATION}ms (${MINIMUM_ATTEMPT_DURATION/1000/60} minutes)`);
          await delay(patienceDelay);
          
          const totalDuration = Date.now() - attemptStartTime;
          console.log(`[SEFAZ-PROXY] ✅ Patience mode complete. Total attempt duration: ${totalDuration}ms (${(totalDuration/1000/60).toFixed(1)} minutes)`);
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
            diagnosis: diagnosis || 'Client error - check request parameters',
            actualDurationMs: actualDurationMs,
            instabilityDetected: isInstabilityError
          };
        }
      }

      const responseText = await response.text();
      const finalDuration = Date.now() - attemptStartTime;
      
      console.log(`[SEFAZ-PROXY] 📥 Raw response length: ${responseText.length} characters`);
      console.log(`[SEFAZ-PROXY] 📥 Response preview: ${responseText.substring(0, 200)}...`);
      console.log(`[SEFAZ-PROXY] ⏱️ Total attempt duration: ${finalDuration}ms (${(finalDuration/1000/60).toFixed(1)} minutes)`);

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
        responseKeys: Object.keys(data),
        requestDurationMs: finalDuration
      });

      return data;

    } catch (error) {
      const attemptDuration = Date.now() - attemptStartTime;
      lastError = error;
      console.error(`[SEFAZ-PROXY] Attempt ${attempt} failed after ${attemptDuration}ms:`, error.message);

      // PATIENCE MODE: If error happened too quickly during instability, wait additional time
      if (attemptDuration < MINIMUM_ATTEMPT_DURATION && 
          (error.message.includes('500') || error.message.includes('Acesso negado'))) {
        const patienceDelay = MINIMUM_ATTEMPT_DURATION - attemptDuration;
        console.log(`[SEFAZ-PROXY] 🕐 PATIENCE MODE: Attempt failed in ${attemptDuration}ms, enforcing minimum duration`);
        console.log(`[SEFAZ-PROXY] ⏳ Additional patience delay: ${patienceDelay}ms (${(patienceDelay/1000/60).toFixed(1)} minutes)`);
        await delay(patienceDelay);
        
        const totalDuration = Date.now() - attemptStartTime;
        console.log(`[SEFAZ-PROXY] ✅ Patience mode complete. Total attempt duration: ${totalDuration}ms (${(totalDuration/1000/60).toFixed(1)} minutes)`);
      }

      // If this is not the last attempt, wait before retrying
      if (attempt < MAX_RETRY_ATTEMPTS) {
        console.log(`[SEFAZ-PROXY] ⏳ Waiting ${retryDelay}ms (${retryDelay/1000} seconds) before retry...`);
        console.log(`[SEFAZ-PROXY] 📝 Note: Extended delays and patience mode accommodate SEFAZ API instability periods`);
        await delay(retryDelay);
        retryDelay = Math.min(retryDelay * 1.5, 90000); // Increased max delay to 90s for instability
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

  // Handle GET requests as health check with detailed token debugging
  if (req.method === 'GET') {
    const token = Deno.env.get('SEFAZ_APP_TOKEN');
    const cleanToken = token?.trim().replace(/[\r\n\t]/g, '') || '';
    
    // Debug environment variables for duplicates
    const envObj = Deno.env.toObject();
    const sefazKeys = Object.keys(envObj).filter(key => key.includes('SEFAZ'));
    
    // Test SEFAZ API connectivity if token is available
    let sefazConnectivity = 'not_tested';
    if (cleanToken && cleanToken.length >= 10) {
      try {
        const testResponse = await fetchWithTimeout(`${SEFAZ_BASE_URL}/combustivel/pesquisa`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-APP-TOKEN': cleanToken,
          },
          body: JSON.stringify({
            produto: { tipoCombustivel: 1 },
            estabelecimento: { municipio: { codigoIBGE: 2704708 } },
            dias: 1,
            pagina: 1,
            registrosPorPagina: 1
          }),
        }, 30000); // 30 second timeout for health check (increased for instability)
        
        sefazConnectivity = testResponse.ok ? 'success' : `error_${testResponse.status}`;
      } catch (error) {
        sefazConnectivity = `failed_${error.message.substring(0, 50)}`;
      }
    }
    
    return new Response(
      JSON.stringify({ 
        status: 'healthy',
        message: 'SEFAZ API Proxy is running',
        tokenConfigured: !!token,
        tokenLength: token?.length || 0,
        cleanTokenLength: cleanToken.length,
        duplicateTokensDetected: sefazKeys.length > 1,
        sefazKeyCount: sefazKeys.length,
        sefazKeyNames: sefazKeys,
        sefazConnectivity: sefazConnectivity,
        baseUrl: SEFAZ_BASE_URL,
        timeoutConfig: `${REQUEST_TIMEOUT}ms (${REQUEST_TIMEOUT/1000/60}min)`,
        retryConfig: `${MAX_RETRY_ATTEMPTS} attempts, ${INITIAL_RETRY_DELAY}ms initial delay`,
        timestamp: new Date().toISOString(),
        deployment: 'v3_extended_patience'
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