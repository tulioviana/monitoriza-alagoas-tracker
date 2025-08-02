import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from '@/hooks/use-toast'
import { useSefazCache } from './useSefazCache'
import { useSefazStatus } from './useSefazStatus'

// Interface definitions
interface ProductSearchParams {
  gtin?: string
  descricao?: string
  municipio?: string
  cnpj?: string
  latitude?: number
  longitude?: number
  raio?: number
  dias?: number
  pagina?: number
  registrosPorPagina?: number
}

interface FuelSearchParams {
  tipoCombustivel?: number
  municipio?: string
  cnpj?: string
  latitude?: number
  longitude?: number
  raio?: number
  dias?: number
  pagina?: number
  registrosPorPagina?: number
}

interface SearchResult {
  totalRegistros: number
  totalPaginas: number
  pagina: number
  registrosPorPagina: number
  registrosPagina: number
  primeiraPagina: boolean
  ultimaPagina: boolean
  conteudo: Array<{
    produto: {
      descricao: string
      gtin: string
      unidadeMedida: string
      venda: {
        dataVenda: string
        valorDeclarado: number
        valorVenda: number
      }
    }
    estabelecimento: {
      cnpj: string
      razaoSocial: string
      nomeFantasia: string
      endereco: {
        nomeLogradouro: string
        numeroImovel: string
        bairro: string
        municipio: string
        latitude: number
        longitude: number
      }
    }
  }>
}

// Função para sanitizar e validar dados antes de enviar
function sanitizePayload(params: any): any {
  console.log('=== SANITIZANDO PAYLOAD ===')
  
  const sanitized = JSON.parse(JSON.stringify(params))
  
  // Limpar strings que deveriam ser números
  if (sanitized.gtin) {
    sanitized.gtin = sanitized.gtin.replace(/\D/g, '')
  }
  
  if (sanitized.cnpj) {
    sanitized.cnpj = sanitized.cnpj.replace(/\D/g, '')
  }
  
  if (sanitized.municipio) {
    sanitized.municipio = sanitized.municipio.replace(/\D/g, '')
  }
  
  // Garantir valores padrão
  sanitized.dias = sanitized.dias || 7
  sanitized.pagina = sanitized.pagina || 1
  sanitized.registrosPorPagina = sanitized.registrosPorPagina || 100
  
  console.log('✅ Payload sanitizado:', sanitized)
  return sanitized
}

// Teste de conectividade
async function testConnectivity(): Promise<boolean> {
  console.log('🔍 Testando conectividade...')
  
  try {
    const { data, error } = await supabase.functions.invoke('sefaz-api-proxy', {
      method: 'GET'
    })

    if (error) {
      console.error('❌ Erro na conectividade:', error)
      return false
    }

    console.log('✅ Conectividade OK:', data)
    return true
    
  } catch (error) {
    console.error('❌ Erro crítico no teste:', error)
    return false
  }
}

// Função para chamar a API SEFAZ via Edge Function com retry e timeout
async function callSefazAPIWithRetry(endpoint: string, data: any): Promise<SearchResult> {
  const maxRetries = 3;
  const timeoutMs = 45000; // 45 segundos
  const baseDelay = 1000; // 1 segundo
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`=== TENTATIVA ${attempt}/${maxRetries} PARA API SEFAZ ===`);
    console.log('Endpoint:', endpoint);
    console.log('Dados enviados:', JSON.stringify(data, null, 2));
    
    const startTime = Date.now();
    
    try {
      // 1. Testar conectividade apenas na primeira tentativa
      if (attempt === 1) {
        const isConnected = await testConnectivity();
        if (!isConnected) {
          throw new Error('Serviço SEFAZ indisponível. Tente novamente em alguns minutos.');
        }
      }
      
      // 2. Sanitizar payload
      const sanitizedPayload = sanitizePayload(data);
      console.log('Payload sanitizado:', JSON.stringify(sanitizedPayload, null, 2));
      
      // 3. Configurar timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      
      try {
        const { data: result, error } = await supabase.functions.invoke('sefaz-api-proxy', {
          body: {
            endpoint,
            payload: sanitizedPayload
          }
        });

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        console.log(`⏱️ Tempo de resposta: ${responseTime}ms`);

        if (error) {
          console.error('Erro na Edge Function:', error);
          throw new Error(`Erro no proxy SEFAZ: ${error.message}`);
        }

        console.log('✅ Resposta recebida da SEFAZ:', result);
        
        // Validar estrutura da resposta
        if (!result || typeof result !== 'object') {
          throw new Error('Resposta inválida da API SEFAZ');
        }

        // Verificar se é uma resposta de erro da SEFAZ
        if (result.timestamp && result.message) {
          throw new Error(`Erro SEFAZ: ${result.message}`);
        }

        // Verificar se tem a estrutura esperada de sucesso
        if (!('conteudo' in result) && !('content' in result)) {
          console.warn('Resposta sem campo conteudo/content:', result);
        }

        return result;
        
      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error(`Timeout na consulta SEFAZ (${timeoutMs/1000}s). O serviço está muito lento.`);
        }
        
        throw fetchError;
      }
      
    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      console.error(`❌ Erro na tentativa ${attempt}:`, {
        message: error.message,
        responseTime,
        attempt
      });
      
      // Se é a última tentativa, relançar o erro
      if (attempt === maxRetries) {
        // Tratamento específico de erros
        if (error.message?.includes('fetch')) {
          throw new Error('Erro de conexão com o serviço SEFAZ. Verifique sua internet.');
        }
        
        if (error.message?.includes('timeout') || error.message?.includes('Timeout')) {
          throw new Error('Serviço SEFAZ muito lento. Tente novamente mais tarde.');
        }
        
        throw error;
      }
      
      // Aguardar antes da próxima tentativa (backoff exponencial)
      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw new Error('Todas as tentativas falharam');
}

// Função principal que inclui cache
async function callSefazAPI(endpoint: string, data: any): Promise<SearchResult> {
  return callSefazAPIWithRetry(endpoint, data);
}

export function useProductSearch() {
  const { getCached, setCached } = useSefazCache();
  const { recordResponse } = useSefazStatus();
  
  return useMutation({
    mutationFn: async (params: ProductSearchParams) => {
      console.log('🔍 Iniciando busca de produtos com parâmetros:', params);
      
      // Validação de entrada
      if (!params.gtin && !params.descricao && !params.municipio && !params.cnpj) {
        throw new Error('Pelo menos um critério de busca deve ser informado');
      }

      // Verificar cache primeiro
      const cached = getCached<SearchResult>('produto/pesquisa', params);
      if (cached) {
        console.log('📋 Resultado encontrado no cache');
        toast({
          title: "Busca concluída (cache)",
          description: `Encontrados ${cached.totalRegistros || 0} produtos`,
        });
        return cached;
      }

      // Construir payload baseado nos parâmetros fornecidos
      const payload: any = {
        dias: params.dias || 1,
        pagina: params.pagina || 1,
        registrosPorPagina: params.registrosPorPagina || 100
      };

      // Adicionar critérios de produto
      if (params.gtin || params.descricao) {
        payload.produto = {};
        if (params.gtin) payload.produto.gtin = params.gtin;
        if (params.descricao) payload.produto.descricao = params.descricao;
      }

      // Adicionar critérios de estabelecimento
      if (params.municipio || params.cnpj || (params.latitude && params.longitude)) {
        payload.estabelecimento = {};
        
        if (params.cnpj) {
          payload.estabelecimento.individual = { cnpj: params.cnpj };
        } else if (params.municipio) {
          payload.estabelecimento.municipio = { codigoIBGE: params.municipio };
        } else if (params.latitude && params.longitude) {
          payload.estabelecimento.geolocalizacao = {
            latitude: params.latitude,
            longitude: params.longitude,
            raio: params.raio || 5000
          };
        }
      }

      const startTime = Date.now();
      try {
        const result = await callSefazAPI('produto/pesquisa', payload);
        const responseTime = Date.now() - startTime;
        
        // Registrar métrica de sucesso
        recordResponse(responseTime, true);
        
        // Armazenar no cache
        setCached('produto/pesquisa', params, result);
        
        console.log('✅ Busca de produtos concluída:', result);
        return result;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        recordResponse(responseTime, false);
        throw error;
      }
    },
    onSuccess: (data) => {
      const total = data?.totalRegistros || 0;
      toast({
        title: "Busca concluída",
        description: `Encontrados ${total} produtos`,
      });
    },
    onError: (error: Error) => {
      console.error('❌ Erro na busca de produtos:', error);
      toast({
        title: "Erro na busca",
        description: error.message || "Erro inesperado na busca de produtos",
        variant: "destructive",
      });
    },
  });
}

export function useFuelSearch() {
  const { getCached, setCached } = useSefazCache();
  const { recordResponse } = useSefazStatus();
  
  return useMutation({
    mutationFn: async (params: FuelSearchParams) => {
      console.log('⛽ Iniciando busca de combustíveis com parâmetros:', params);
      
      // Validação de entrada
      if (!params.tipoCombustivel && !params.municipio && !params.cnpj && !(params.latitude && params.longitude)) {
        throw new Error('Pelo menos um critério de busca deve ser informado');
      }

      // Verificar cache primeiro
      const cached = getCached<SearchResult>('combustivel/pesquisa', params);
      if (cached) {
        console.log('📋 Resultado encontrado no cache');
        toast({
          title: "Busca concluída (cache)",
          description: `Encontrados ${cached.totalRegistros || 0} resultados de combustíveis`,
        });
        return cached;
      }

      // Construir payload baseado nos parâmetros fornecidos
      const payload: any = {
        dias: params.dias || 1,
        pagina: params.pagina || 1,
        registrosPorPagina: params.registrosPorPagina || 100
      };

      // Adicionar tipo de combustível
      if (params.tipoCombustivel) {
        payload.produto = {
          tipoCombustivel: params.tipoCombustivel
        };
      }

      // Adicionar critérios de estabelecimento
      if (params.cnpj || params.municipio || (params.latitude && params.longitude)) {
        payload.estabelecimento = {};
        
        if (params.cnpj) {
          payload.estabelecimento.individual = { cnpj: params.cnpj };
        } else if (params.municipio) {
          payload.estabelecimento.municipio = { codigoIBGE: params.municipio };
        } else if (params.latitude && params.longitude) {
          payload.estabelecimento.geolocalizacao = {
            latitude: params.latitude,
            longitude: params.longitude,
            raio: params.raio || 5000
          };
        }
      }

      const startTime = Date.now();
      try {
        const result = await callSefazAPI('combustivel/pesquisa', payload);
        const responseTime = Date.now() - startTime;
        
        // Registrar métrica de sucesso
        recordResponse(responseTime, true);
        
        // Armazenar no cache
        setCached('combustivel/pesquisa', params, result);
        
        console.log('✅ Busca de combustíveis concluída:', result);
        return result;
      } catch (error) {
        const responseTime = Date.now() - startTime;
        recordResponse(responseTime, false);
        throw error;
      }
    },
    onSuccess: (data) => {
      const total = data?.totalRegistros || 0;
      toast({
        title: "Busca concluída",
        description: `Encontrados ${total} resultados de combustíveis`,
      });
    },
    onError: (error: Error) => {
      console.error('❌ Erro na busca de combustíveis:', error);
      toast({
        title: "Erro na busca",
        description: error.message || "Erro inesperado na busca de combustíveis",
        variant: "destructive",
      });
    },
  });
}