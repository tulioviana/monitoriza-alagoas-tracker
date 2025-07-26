
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const sefazToken = Deno.env.get('SEFAZ_APP_TOKEN')!

const SEFAZ_API_BASE_URL = "http://api.sefaz.al.gov.br/sfz-economiza-alagoas-api/api/public/"

// Função para converter tipos de dados conforme especificação SEFAZ
function convertPayloadTypes(payload: any): any {
  console.log('=== CONVERTENDO TIPOS DE DADOS PARA SEFAZ ===')
  console.log('Payload original:', JSON.stringify(payload, null, 2))

  const convertedPayload = JSON.parse(JSON.stringify(payload))

  // Converter codigoIBGE para número inteiro (CRÍTICO)
  if (convertedPayload.estabelecimento?.municipio?.codigoIBGE) {
    const codigoOriginal = convertedPayload.estabelecimento.municipio.codigoIBGE
    const codigoNumerico = parseInt(String(codigoOriginal).replace(/\D/g, ''), 10)
    
    console.log('🔄 Convertendo codigoIBGE:')
    console.log('  - Original:', codigoOriginal, typeof codigoOriginal)
    console.log('  - Convertido:', codigoNumerico, typeof codigoNumerico)
    
    convertedPayload.estabelecimento.municipio.codigoIBGE = codigoNumerico
  }

  // Converter CNPJ para string limpa (sem formatação)
  if (convertedPayload.estabelecimento?.individual?.cnpj) {
    const cnpjOriginal = convertedPayload.estabelecimento.individual.cnpj
    const cnpjLimpo = String(cnpjOriginal).replace(/\D/g, '')
    
    console.log('🔄 Convertendo CNPJ:')
    console.log('  - Original:', cnpjOriginal)
    console.log('  - Convertido:', cnpjLimpo)
    
    convertedPayload.estabelecimento.individual.cnpj = cnpjLimpo
  }

  // Converter GTIN para string limpa (sem formatação)
  if (convertedPayload.produto?.gtin) {
    const gtinOriginal = convertedPayload.produto.gtin
    const gtinLimpo = String(gtinOriginal).replace(/\D/g, '')
    
    console.log('🔄 Convertendo GTIN:')
    console.log('  - Original:', gtinOriginal)
    console.log('  - Convertido:', gtinLimpo)
    
    convertedPayload.produto.gtin = gtinLimpo
  }

  // Converter tipoCombustivel para número inteiro (para combustíveis)
  if (convertedPayload.produto?.tipoCombustivel) {
    const tipoOriginal = convertedPayload.produto.tipoCombustivel
    const tipoNumerico = parseInt(String(tipoOriginal), 10)
    
    console.log('🔄 Convertendo tipoCombustivel:')
    console.log('  - Original:', tipoOriginal, typeof tipoOriginal)
    console.log('  - Convertido:', tipoNumerico, typeof tipoNumerico)
    
    convertedPayload.produto.tipoCombustivel = tipoNumerico
  }

  // Garantir que campos numéricos sejam números
  if (convertedPayload.dias) {
    convertedPayload.dias = parseInt(String(convertedPayload.dias), 10)
  }

  if (convertedPayload.pagina) {
    convertedPayload.pagina = parseInt(String(convertedPayload.pagina), 10)
  }

  if (convertedPayload.registrosPorPagina) {
    convertedPayload.registrosPorPagina = parseInt(String(convertedPayload.registrosPorPagina), 10)
  }

  // Converter coordenadas para números
  if (convertedPayload.estabelecimento?.geolocalizacao) {
    const geo = convertedPayload.estabelecimento.geolocalizacao
    
    if (geo.latitude) {
      geo.latitude = parseFloat(String(geo.latitude))
    }
    if (geo.longitude) {
      geo.longitude = parseFloat(String(geo.longitude))
    }
    if (geo.raio) {
      geo.raio = parseInt(String(geo.raio), 10)
    }
    
    console.log('🔄 Convertendo geolocalização:', geo)
  }

  console.log('✅ Payload convertido:', JSON.stringify(convertedPayload, null, 2))
  return convertedPayload
}

// Função para buscar produtos com fallback de critérios
async function searchProductWithFallback(item: any, supabase: any): Promise<any> {
  const targetCnpj = item.search_criteria?.estabelecimento?.individual?.cnpj;
  const gtin = item.search_criteria?.produto?.gtin;
  const descricao = item.search_criteria?.produto?.descricao;

  console.log(`[FALLBACK] Item ${item.id} - Iniciando busca com fallback. CNPJ alvo: ${targetCnpj}, GTIN: ${gtin}, Descrição: ${descricao}`);

  // Estratégia 1: Apenas GTIN + CNPJ (se ambos existirem)
  if (gtin && targetCnpj) {
    console.log(`[FALLBACK] Tentativa 1: GTIN + CNPJ`);
    let searchData = {
      dias: item.search_criteria.dias || 1,
      produto: { gtin },
      estabelecimento: { individual: { cnpj: targetCnpj } },
      pagina: 1,
      registrosPorPagina: 100
    };

    searchData = convertPayloadTypes(searchData);
    const result = await executeSefazSearch(item, searchData, 'produto/pesquisa');
    if (result && result.conteudo && result.conteudo.length > 0) {
      return result;
    }
  }

  // Estratégia 2: Apenas GTIN (busca mais ampla)
  if (gtin) {
    console.log(`[FALLBACK] Tentativa 2: Apenas GTIN`);
    let searchData = {
      dias: item.search_criteria.dias || 1,
      produto: { gtin },
      pagina: 1,
      registrosPorPagina: 100
    };

    searchData = convertPayloadTypes(searchData);
    const result = await executeSefazSearch(item, searchData, 'produto/pesquisa');
    if (result && result.conteudo && result.conteudo.length > 0) {
      // Filtrar por CNPJ se especificado
      if (targetCnpj) {
        result.conteudo = result.conteudo.filter((r: any) => r.estabelecimento.cnpj === targetCnpj);
        console.log(`[FALLBACK] Resultados filtrados por CNPJ ${targetCnpj}: ${result.conteudo.length}`);
      }
      return result;
    }
  }

  // Estratégia 3: Apenas descrição (busca mais ampla)
  if (descricao) {
    console.log(`[FALLBACK] Tentativa 3: Apenas descrição`);
    let searchData = {
      dias: item.search_criteria.dias || 1,
      produto: { descricao },
      pagina: 1,
      registrosPorPagina: 100
    };

    searchData = convertPayloadTypes(searchData);
    const result = await executeSefazSearch(item, searchData, 'produto/pesquisa');
    if (result && result.conteudo && result.conteudo.length > 0) {
      // Filtrar por CNPJ se especificado
      if (targetCnpj) {
        result.conteudo = result.conteudo.filter((r: any) => r.estabelecimento.cnpj === targetCnpj);
        console.log(`[FALLBACK] Resultados filtrados por CNPJ ${targetCnpj}: ${result.conteudo.length}`);
      }
      return result;
    }
  }

  console.log(`[FALLBACK] Item ${item.id} - Nenhuma estratégia retornou resultados`);
  return null;
}

// Função auxiliar para executar busca na SEFAZ
async function executeSefazSearch(item: any, searchData: any, endpoint: string): Promise<any> {
  console.log(`[SEFAZ] Item ${item.id} - Enviando para ${endpoint}:`, JSON.stringify(searchData, null, 2));

  const response = await fetch(`${SEFAZ_API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'AppToken': sefazToken
    },
    body: JSON.stringify(searchData)
  });

  const responseText = await response.text();
  console.log(`[SEFAZ] Item ${item.id} - Status ${response.status}, Resposta: ${responseText.slice(0, 200)}...`);

  if (!response.ok) {
    console.error(`[SEFAZ] Item ${item.id} - Erro ${response.status}: ${responseText}`);
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch (error) {
    console.error(`[SEFAZ] Item ${item.id} - Erro ao parsear JSON: ${error.message}`);
    return null;
  }
}

serve(async (req) => {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    console.log('Starting price update job...')
    
    // Get all active tracked items
    const { data: trackedItems, error: trackedItemsError } = await supabase
      .from('tracked_items')
      .select('*')
      .eq('is_active', true)

    if (trackedItemsError) {
      throw trackedItemsError
    }

    console.log(`Found ${trackedItems?.length || 0} active tracked items`)

    // Get all active competitors
    const { data: competitors, error: competitorsError } = await supabase
      .from('competitor_tracking')
      .select('*')
      .eq('is_active', true)

    if (competitorsError) {
      console.error('Error fetching competitors:', competitorsError)
    } else {
      console.log(`Found ${competitors?.length || 0} active competitors`)
    }

    // Process tracked items
    for (const item of trackedItems || []) {
      try {
        console.log(`Processing item ${item.id}: ${item.nickname}`)
        
        let apiData;

        if (item.item_type === 'produto') {
          // Para produtos, usar busca com fallback
          apiData = await searchProductWithFallback(item, supabase);
        } else {
          // Para combustíveis, manter lógica original (funciona corretamente)
          let searchData = {
            ...item.search_criteria,
            pagina: 1,
            registrosPorPagina: 100
          };

          searchData = convertPayloadTypes(searchData);
          apiData = await executeSefazSearch(item, searchData, 'combustivel/pesquisa');
        }

        if (!apiData || !apiData.conteudo || apiData.conteudo.length === 0) {
          console.log(`No results found for item ${item.id}`);
          continue;
        }

        console.log(`Received ${apiData.conteudo.length} results for item ${item.id}`);

        // Process each result directly
        for (const result of apiData.conteudo || []) {
          // First, ensure establishment exists
          const establishmentData = {
            cnpj: result.estabelecimento.cnpj,
            razao_social: result.estabelecimento.razaoSocial,
            nome_fantasia: result.estabelecimento.nomeFantasia,
            address_json: result.estabelecimento.endereco
          }

          const { error: estabError } = await supabase
            .from('establishments')
            .upsert(establishmentData, { onConflict: 'cnpj' })

          if (estabError) {
            console.error('Error upserting establishment:', estabError)
            continue
          }

          // Insert price history
          const priceData = {
            tracked_item_id: item.id,
            establishment_cnpj: result.estabelecimento.cnpj,
            sale_date: result.produto.venda.dataVenda,
            declared_price: result.produto.venda.valorDeclarado,
            sale_price: result.produto.venda.valorVenda
          }

          const { error: priceError } = await supabase
            .from('price_history')
            .insert(priceData)

          if (priceError) {
            console.error('Error inserting price history:', priceError)
          }
        }

        console.log(`Successfully processed item ${item.id}`)
        
      } catch (error) {
        console.error(`Error processing item ${item.id} (${item.nickname}):`, error)
        console.log(`Skipping item ${item.id} due to error`)
        continue
      }
    }

    // Process competitors
    let processedCompetitors = 0
    for (const competitor of competitors || []) {
      try {
        console.log(`Processing competitor ${competitor.id}: ${competitor.competitor_name || competitor.competitor_cnpj}`)
        
        // Search for all products from this competitor's CNPJ
        const searchData = {
          cnpj: competitor.competitor_cnpj,
          pagina: 1,
          registrosPorPagina: 100
        }

        console.log(`Making competitor request with data:`, JSON.stringify(searchData, null, 2))

        // Make request to SEFAZ API for products
        const response = await fetch(`${SEFAZ_API_BASE_URL}produto/pesquisa`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'AppToken': sefazToken
          },
          body: JSON.stringify(searchData)
        })

        if (!response.ok) {
          console.error(`SEFAZ API error for competitor ${competitor.id}:`, response.status, response.statusText)
          continue
        }

        const apiData = await response.json()
        console.log(`Received ${apiData.conteudo?.length || 0} results for competitor ${competitor.id}`)

        // Process each result for the competitor
        for (const result of apiData.conteudo || []) {
          // First, ensure establishment exists
          const establishmentData = {
            cnpj: result.estabelecimento.cnpj,
            razao_social: result.estabelecimento.razaoSocial,
            nome_fantasia: result.estabelecimento.nomeFantasia,
            address_json: result.estabelecimento.endereco
          }

          await supabase
            .from('establishments')
            .upsert(establishmentData, { onConflict: 'cnpj' })

          // Insert competitor price history
          const competitorPriceData = {
            competitor_tracking_id: competitor.id,
            product_description: result.produto.descricao,
            product_ean: result.produto.codigoEan,
            establishment_cnpj: result.estabelecimento.cnpj,
            sale_date: result.produto.venda.dataVenda,
            declared_price: result.produto.venda.valorDeclarado,
            sale_price: result.produto.venda.valorVenda
          }

          await supabase
            .from('competitor_price_history')
            .insert(competitorPriceData)
        }

        processedCompetitors++
        console.log(`Successfully processed competitor ${competitor.id}`)
        
      } catch (error) {
        console.error(`Error processing competitor ${competitor.id}:`, error)
        continue
      }
    }

    console.log('Price update job completed successfully')
    
    return new Response(
      JSON.stringify({ 
        message: 'Price update completed',
        processedItems: trackedItems?.length || 0,
        processedCompetitors: processedCompetitors
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error in update-tracked-prices:', error)
    return new Response(
      JSON.stringify({ 
        message: "Erro ao atualizar preços",
        error: error.message
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})
