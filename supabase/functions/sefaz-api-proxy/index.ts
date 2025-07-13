
// --- INÍCIO DO CÓDIGO DE DIAGNÓSTICO ---
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  console.log('--- INICIANDO MODO DE DIAGNÓSTICO ---');

  try {
    const appToken = Deno.env.get('SEFAZ_APP_TOKEN');

    if (!appToken || appToken.length < 10) { // Verifica se o token existe e tem um comprimento razoável
      console.error('DIAGNÓSTICO: FALHA! O AppToken é nulo, indefinido ou muito curto.');
      return new Response(
        JSON.stringify({
          diagnostic_status: 'FAILURE',
          reason: 'SEFAZ_APP_TOKEN não foi encontrado ou está inválido nos secrets do Supabase.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Se o token foi carregado com sucesso, o diagnóstico primário passou.
    console.log('DIAGNÓSTICO: SUCESSO! AppToken está presente e foi carregado corretamente.');
    console.log('DIAGNÓSTICO: Comprimento do token verificado com sucesso.');

    return new Response(
      JSON.stringify({
        diagnostic_status: 'SUCCESS',
        reason: 'O AppToken foi lido com sucesso a partir das variáveis de ambiente.'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('DIAGNÓSTICO: FALHA CATASTRÓFICA!', error.message, error.stack);
    return new Response(
      JSON.stringify({
        diagnostic_status: 'CATASTROPHIC_FAILURE',
        reason: 'Um erro inesperado ocorreu ao tentar executar o script de diagnóstico.',
        error_message: error.message
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
// --- FIM DO CÓDIGO DE DIAGNÓSTICO ---
