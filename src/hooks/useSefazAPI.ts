
import { useMutation } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface ProductSearchParams {
  produto: {
    gtin?: string
    descricao?: string
    ncm?: string
    gpc?: string
  }
  estabelecimento: {
    individual?: { cnpj: string }
    municipio?: { codigoIBGE: string }
    geolocalizacao?: {
      latitude: number
      longitude: number
      raio: number
    }
  }
  dias: number
  pagina?: number
  registrosPorPagina?: number
}

interface FuelSearchParams {
  produto: {
    tipoCombustivel: number
  }
  estabelecimento: {
    individual?: { cnpj: string }
    municipio?: { codigoIBGE: string }
    geolocalizacao?: {
      latitude: number
      longitude: number
      raio: number
    }
  }
  dias: number
  pagina?: number
  registrosPorPagina?: number
}

interface SearchResult {
  totalRegistros: number
  totalPaginas: number
  pagina: number
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
  console.log('=== SANITIZANDO PAYLOAD NO FRONTEND ===')
  console.log('Dados originais:', JSON.stringify(params, null, 2))

  const sanitized = JSON.parse(JSON.stringify(params))

  // Limpar e validar GTIN
  if (sanitized.produto?.gtin) {
    sanitized.produto.gtin = sanitized.produto.gtin.replace(/\D/g, '')
    console.log('✅ GTIN sanitizado:', sanitized.produto.gtin)
  }

  // Limpar e validar código IBGE (manter como string no frontend, será convertido na Edge Function)
  if (sanitized.estabelecimento?.municipio?.codigoIBGE) {
    sanitized.estabelecimento.municipio.codigoIBGE = sanitized.estabelecimento.municipio.codigoIBGE.replace(/\D/g, '')
    console.log('✅ Código IBGE sanitizado:', sanitized.estabelecimento.municipio.codigoIBGE)
  }

  // Limpar e validar CNPJ
  if (sanitized.estabelecimento?.individual?.cnpj) {
    sanitized.estabelecimento.individual.cnpj = sanitized.estabelecimento.individual.cnpj.replace(/\D/g, '')
    console.log('✅ CNPJ sanitizado:', sanitized.estabelecimento.individual.cnpj)
  }

  // Garantir valores padrão para campos obrigatórios
  sanitized.dias = sanitized.dias || 7
  sanitized.pagina = sanitized.pagina || 1
  sanitized.registrosPorPagina = sanitized.registrosPorPagina || 100

  console.log('✅ Payload sanitizado:', JSON.stringify(sanitized, null, 2))
  return sanitized
}

// Teste de conectividade aprimorado com diagnóstico
async function testConnectivity(): Promise<boolean> {
  console.log('=== TESTANDO CONECTIVIDADE COM EDGE FUNCTION ===')
  
  try {
    const { data, error } = await supabase.functions.invoke('sefaz-api-proxy', {
      method: 'GET'
    })

    console.log('=== RESULTADO DO TESTE DE CONECTIVIDADE ===')
    if (error) {
      console.error('❌ Erro na conectividade:', error)
      toast.error(`Erro de conectividade: ${error.message}`)
      return false
    }

    console.log('✅ Resposta do health check:', JSON.stringify(data, null, 2))
    
    // Diagnóstico detalhado
    if (data?.status === 'ok') {
      console.log('✅ Edge Function está operacional')
      console.log('✅ Base URL configurada:', data.baseUrl)
      console.log('✅ Token SEFAZ configurado:', data.hasToken)
      
      if (!data.hasToken) {
        toast.error('🚨 Token SEFAZ não configurado no servidor!')
        return false
      }
      
      toast.success('✅ Conectividade OK! Sistema pronto para buscar.')
      return true
    } else {
      console.error('❌ Health check retornou status inválido')
      return false
    }
    
  } catch (error) {
    console.error('❌ Erro crítico no teste de conectividade:', error)
    toast.error(`Erro crítico: ${error}`)
    return false
  }
}

async function callSefazAPI(endpoint: string, data: any): Promise<SearchResult> {
  console.log('=== INICIANDO CHAMADA PARA SEFAZ API ===')
  console.log('Endpoint:', endpoint)
  console.log('Dados enviados:', JSON.stringify(data, null, 2))

  // Primeiro, testar conectividade com diagnóstico
  console.log('🔍 Testando conectividade com Edge Function...')
  const isConnected = await testConnectivity()
  
  if (!isConnected) {
    console.error('❌ Falha no teste de conectividade')
    throw new Error('Não foi possível conectar com o servidor. Verifique sua conexão e tente novamente.')
  }
  
  console.log('✅ Conectividade confirmada, prosseguindo com a busca...')

  // Sanitizar dados antes de enviar
  const sanitizedData = sanitizePayload(data)

  try {
    console.log('📡 Invocando Edge Function para busca real...')
    const { data: result, error } = await supabase.functions.invoke('sefaz-api-proxy', {
      body: { endpoint, payload: sanitizedData }
    })

    console.log('=== RESPOSTA DA EDGE FUNCTION ===')
    if (error) {
      console.error('❌ Erro da Edge Function:', error)
      throw new Error(`Erro na comunicação: ${error.message}`)
    }

    console.log('✅ Resultado recebido:', JSON.stringify(result, null, 2))

    // Verificar se há erro na resposta com diagnóstico detalhado
    if (result?.error) {
      console.error('❌ Erro retornado pela API:', result.error)
      console.error('📄 Detalhes do erro:', result.details)
      console.error('🔢 Status code:', result.statusCode)
      console.error('🌐 URL utilizada:', result.url)
      
      // Diagnóstico específico para diferentes tipos de erro
      if (result.diagnosis) {
        console.error('🔬 Diagnóstico:', result.diagnosis)
        
        if (result.diagnosis.includes('HTML')) {
          throw new Error('🚨 API SEFAZ retornou página de login - Token pode estar inválido ou expirado')
        }
        
        if (result.diagnosis.includes('Token')) {
          throw new Error('🚨 Problema com o token de autenticação - Entre em contato com o suporte')
        }
      }
      
      // Mensagens de erro mais específicas baseadas no status
      if (result.statusCode === 400) {
        // Verificar se é erro de tipo inválido para codigoIBGE
        if (result.details?.message?.includes('codigoIBGE')) {
          throw new Error('🚨 Erro de tipo no código IBGE - Foi aplicada correção automática, tente novamente')
        }
        throw new Error('Dados inválidos para a busca. Verifique os critérios informados.')
      } else if (result.statusCode === 401) {
        throw new Error('Erro de autenticação com a API SEFAZ. Token pode estar expirado.')
      } else if (result.statusCode === 404) {
        throw new Error('Serviço não encontrado na API SEFAZ. Endpoint pode estar incorreto.')
      } else if (result.statusCode === 503) {
        throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns minutos.')
      } else if (result.statusCode >= 500) {
        throw new Error('Erro interno da API SEFAZ. Tente novamente em alguns minutos.')
      } else {
        throw new Error(result.error || 'Erro desconhecido na busca')
      }
    }

    // Verificar se a resposta tem a estrutura esperada
    if (!result || typeof result !== 'object') {
      console.error('❌ Resposta inválida:', result)
      throw new Error('Resposta inválida da API')
    }

    // Se não tem a estrutura padrão de resposta, mas tem mensagem, pode ser um caso válido
    if (result.message && !result.conteudo) {
      console.log('ℹ️ Resposta com mensagem especial:', result.message)
      
      // Verificar se é uma resposta de diagnóstico
      if (result.rawResponse) {
        console.log('🔬 Raw response para análise:', result.rawResponse.substring(0, 200))
      }
      
      // Retornar estrutura vazia mas válida para não quebrar o frontend
      return {
        totalRegistros: result.totalRegistros || 0,
        totalPaginas: result.totalPaginas || 0,
        pagina: result.pagina || 1,
        conteudo: result.conteudo || []
      }
    }

    // Validar estrutura mínima esperada
    const validResult = {
      totalRegistros: result.totalRegistros || 0,
      totalPaginas: result.totalPaginas || 0,
      pagina: result.pagina || 1,
      conteudo: Array.isArray(result.conteudo) ? result.conteudo : []
    }

    console.log('✅ Dados validados e estruturados:', {
      totalRegistros: validResult.totalRegistros,
      totalPaginas: validResult.totalPaginas,
      pagina: validResult.pagina,
      quantidadeItens: validResult.conteudo.length
    })

    return validResult as SearchResult

  } catch (error) {
    console.error('❌ Erro na chamada da API:', error)
    throw error
  }
}

export function useProductSearch() {
  return useMutation({
    mutationFn: (params: ProductSearchParams) => {
      console.log('=== INICIANDO BUSCA DE PRODUTOS ===')
      console.log('Parâmetros recebidos:', JSON.stringify(params, null, 2))
      
      // Validações mais flexíveis
      if (!params.produto.gtin && !params.produto.descricao && !params.produto.ncm) {
        throw new Error('Informe pelo menos um critério de busca: GTIN, descrição ou NCM')
      }

      // Validar GTIN se fornecido
      if (params.produto.gtin) {
        const gtin = params.produto.gtin.replace(/\D/g, '')
        if (gtin.length < 8 || gtin.length > 14) {
          throw new Error('GTIN deve ter entre 8 e 14 dígitos')
        }
        console.log('✅ GTIN validado:', gtin)
      }

      // Validar código IBGE se fornecido
      if (params.estabelecimento.municipio?.codigoIBGE) {
        const codigo = params.estabelecimento.municipio.codigoIBGE.replace(/\D/g, '')
        if (codigo.length !== 7) {
          throw new Error('Código IBGE deve ter exatamente 7 dígitos numéricos')
        }
        console.log('✅ Código IBGE validado:', codigo)
      }

      console.log('✅ Validações concluídas, iniciando chamada para API...')
      return callSefazAPI('produto/pesquisa', params)
    },
    onError: (error: Error) => {
      console.error('❌ Erro na busca de produtos:', error)
      
      let errorMessage = 'Erro desconhecido na busca'
      
      // Mensagens específicas para diagnósticos críticos
      if (error.message.includes('🚨')) {
        errorMessage = error.message // Já formatada com emoji de alerta
      } else if (error.message.includes('conectar com o servidor')) {
        errorMessage = 'Não foi possível conectar com o servidor. Verifique sua conexão e tente novamente.'
      } else if (error.message.includes('GTIN') || error.message.includes('código')) {
        errorMessage = error.message
      } else if (error.message.includes('comunicação')) {
        errorMessage = 'Falha na comunicação com o servidor. Verifique sua conexão e tente novamente.'
      } else if (error.message.includes('temporariamente indisponível')) {
        errorMessage = 'Serviço temporariamente indisponível. Aguarde alguns minutos e tente novamente.'
      } else if (error.message.includes('API SEFAZ')) {
        errorMessage = error.message
      } else if (error.message.includes('dados inválidos')) {
        errorMessage = 'Os dados informados são inválidos. Verifique os critérios de busca.'
      } else if (error.message.includes('autenticação')) {
        errorMessage = 'Erro de autenticação. Entre em contato com o suporte técnico.'
      } else {
        errorMessage = `Erro na busca: ${error.message}`
      }
      
      console.error('📢 Mensagem de erro para usuário:', errorMessage)
      toast.error(errorMessage)
    },
    onSuccess: (data) => {
      console.log('✅ Busca de produtos bem-sucedida:', {
        totalRegistros: data.totalRegistros,
        totalPaginas: data.totalPaginas,
        pagina: data.pagina,
        quantidadeItens: data.conteudo.length
      })
      
      if (data.totalRegistros === 0) {
        toast.info('Nenhum produto encontrado com os critérios informados')
      } else {
        toast.success(`${data.totalRegistros} produto(s) encontrado(s)`)
        
        // Log de alguns produtos encontrados para debug
        if (data.conteudo.length > 0) {
          console.log('📦 Exemplo de produto encontrado:', {
            descricao: data.conteudo[0].produto.descricao,
            gtin: data.conteudo[0].produto.gtin,
            estabelecimento: data.conteudo[0].estabelecimento.nomeFantasia || data.conteudo[0].estabelecimento.razaoSocial,
            preco: data.conteudo[0].produto.venda.valorVenda
          })
        }
      }
    }
  })
}

export function useFuelSearch() {
  return useMutation({
    mutationFn: (params: FuelSearchParams) => {
      console.log('=== INICIANDO BUSCA DE COMBUSTÍVEIS ===')
      console.log('Parâmetros recebidos:', JSON.stringify(params, null, 2))
      
      // Validar código IBGE se fornecido
      if (params.estabelecimento.municipio?.codigoIBGE) {
        const codigo = params.estabelecimento.municipio.codigoIBGE.replace(/\D/g, '')
        if (codigo.length !== 7) {
          throw new Error('Código IBGE deve ter exatamente 7 dígitos numéricos')
        }
        console.log('✅ Código IBGE validado:', codigo)
      }

      console.log('✅ Validações concluídas, iniciando chamada para API...')
      return callSefazAPI('combustivel/pesquisa', params)
    },
    onError: (error: Error) => {
      console.error('❌ Erro na busca de combustíveis:', error)
      
      let errorMessage = 'Erro desconhecido na busca'
      
      // Mensagens específicas para diagnósticos críticos
      if (error.message.includes('🚨')) {
        errorMessage = error.message // Já formatada com emoji de alerta
      } else if (error.message.includes('conectar com o servidor')) {
        errorMessage = 'Não foi possível conectar com o servidor. Verifique sua conexão e tente novamente.'
      } else if (error.message.includes('código IBGE')) {
        errorMessage = error.message
      } else if (error.message.includes('comunicação')) {
        errorMessage = 'Falha na comunicação com o servidor. Verifique sua conexão e tente novamente.'
      } else if (error.message.includes('temporariamente indisponível')) {
        errorMessage = 'Serviço temporariamente indisponível. Aguarde alguns minutos e tente novamente.'
      } else if (error.message.includes('API SEFAZ')) {
        errorMessage = error.message
      } else if (error.message.includes('dados inválidos')) {
        errorMessage = 'Os dados informados são inválidos. Verifique os critérios de busca.'
      } else if (error.message.includes('autenticação')) {
        errorMessage = 'Erro de autenticação. Entre em contato com o suporte técnico.'
      } else {
        errorMessage = `Erro na busca: ${error.message}`
      }
      
      console.error('📢 Mensagem de erro para usuário:', errorMessage)
      toast.error(errorMessage)
    },
    onSuccess: (data) => {
      console.log('✅ Busca de combustíveis bem-sucedida:', {
        totalRegistros: data.totalRegistros,
        totalPaginas: data.totalPaginas,
        pagina: data.pagina,
        quantidadeItens: data.conteudo.length
      })
      
      if (data.totalRegistros === 0) {
        toast.info('Nenhum combustível encontrado com os critérios informados')
      } else {
        toast.success(`${data.totalRegistros} resultado(s) encontrado(s)`)
        
        // Log de alguns combustíveis encontrados para debug
        if (data.conteudo.length > 0) {
          console.log('⛽ Exemplo de combustível encontrado:', {
            descricao: data.conteudo[0].produto.descricao,
            estabelecimento: data.conteudo[0].estabelecimento.nomeFantasia || data.conteudo[0].estabelecimento.razaoSocial,
            preco: data.conteudo[0].produto.venda.valorVenda
          })
        }
      }
    }
  })
}
