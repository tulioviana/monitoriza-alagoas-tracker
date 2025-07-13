
// --- CÓDIGO DE DIAGNÓSTICO COM CORS CORRIGIDO ---
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  console.log('--- INICIANDO MODO DE DIAGNÓSTICO ---');

  try {
    const appToken = Deno.env.get('SEFAZ_APP_TOKEN');

    if (!appToken || appToken.length < 10) {
      console.error('DIAGNÓSTICO: FALHA! O AppToken é nulo, indefinido ou muito curto.');
      return new Response(
        JSON.stringify({
          diagnostic_status: 'FAILURE',
          reason: 'SEFAZ_APP_TOKEN não foi encontrado ou está inválido nos secrets do Supabase.'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('DIAGNÓSTICO: SUCESSO! AppToken está presente e foi carregado corretamente.');
    console.log('DIAGNÓSTICO: Comprimento do token verificado com sucesso.');

    return new Response(
      JSON.stringify({
        diagnostic_status: 'SUCCESS',
        reason: 'O AppToken foi lido com sucesso a partir das variáveis de ambiente.',
        cors_fixed: true
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('DIAGNÓSTICO: FALHA CATASTRÓFICA!', error.message, error.stack);
    return new Response(
      JSON.stringify({
        diagnostic_status: 'CATASTROPHIC_FAILURE',
        reason: 'Um erro inesperado ocorreu ao tentar executar o script de diagnóstico.',
        error_message: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
// --- FIM DO CÓDIGO DE DIAGNÓSTICO ---
