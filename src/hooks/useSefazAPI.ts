
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

async function callSefazAPI(endpoint: string, data: any): Promise<SearchResult> {
  console.log('=== CHAMADA FRONTEND PARA EDGE FUNCTION ===')
  console.log('Endpoint:', endpoint)
  console.log('Dados enviados:', JSON.stringify(data, null, 2))

  try {
    const { data: result, error } = await supabase.functions.invoke('sefaz-api-proxy', {
      body: { endpoint, data }
    })

    console.log('=== RESPOSTA DA EDGE FUNCTION ===')
    if (error) {
      console.error('Erro da Edge Function:', error)
      throw new Error(`Erro na comunicação: ${error.message}`)
    }

    console.log('Resultado recebido:', JSON.stringify(result, null, 2))

    // Verificar se há erro na resposta
    if (result?.error) {
      console.error('Erro retornado pela API:', result.error)
      console.error('Detalhes do erro:', result.details)
      console.error('Status code:', result.statusCode)
      
      // Mensagens de erro mais específicas
      if (result.statusCode === 400) {
        throw new Error('Dados inválidos para a busca. Verifique os critérios informados.')
      } else if (result.statusCode === 401) {
        throw new Error('Erro de autenticação com a API SEFAZ. Entre em contato com o suporte.')
      } else if (result.statusCode === 404) {
        throw new Error('Serviço não encontrado na API SEFAZ.')
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
      console.error('Resposta inválida:', result)
      throw new Error('Resposta inválida da API')
    }

    // Se não tem a estrutura padrão de resposta, pode ser um erro não tratado
    if (result.message && !result.conteudo) {
      console.log('Resposta com mensagem especial:', result.message)
      // Retornar estrutura vazia mas válida para não quebrar o frontend
      return {
        totalRegistros: 0,
        totalPaginas: 0,
        pagina: 1,
        conteudo: []
      }
    }

    return result as SearchResult

  } catch (error) {
    console.error('Erro na chamada da API:', error)
    throw error
  }
}

export function useProductSearch() {
  return useMutation({
    mutationFn: (params: ProductSearchParams) => {
      console.log('=== INICIANDO BUSCA DE PRODUTOS ===')
      console.log('Parâmetros:', JSON.stringify(params, null, 2))
      
      // Validações flexíveis - permitir buscas mais abertas
      if (!params.produto.gtin && !params.produto.descricao && !params.produto.ncm) {
        throw new Error('Informe pelo menos um critério de busca: GTIN, descrição ou NCM')
      }

      // Validar GTIN se fornecido (mais flexível)
      if (params.produto.gtin) {
        const gtin = params.produto.gtin.replace(/\D/g, '')
        if (gtin.length < 8 || gtin.length > 14) {
          throw new Error('GTIN deve ter entre 8 e 14 dígitos')
        }
      }

      // Validar código IBGE se fornecido (mais flexível)
      if (params.estabelecimento.municipio?.codigoIBGE) {
        const codigo = params.estabelecimento.municipio.codigoIBGE.replace(/\D/g, '')
        if (codigo.length !== 7) {
          throw new Error('Código IBGE deve ter exatamente 7 dígitos numéricos')
        }
      }

      return callSefazAPI('produto/pesquisa', params)
    },
    onError: (error: Error) => {
      console.error('❌ Erro na busca de produtos:', error)
      
      let errorMessage = 'Erro desconhecido na busca'
      
      if (error.message.includes('GTIN') || error.message.includes('código')) {
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
      
      toast.error(errorMessage)
    },
    onSuccess: (data) => {
      console.log('✅ Busca de produtos bem-sucedida:', data)
      if (data.totalRegistros === 0) {
        toast.info('Nenhum produto encontrado com os critérios informados')
      } else {
        toast.success(`${data.totalRegistros} produto(s) encontrado(s)`)
      }
    }
  })
}

export function useFuelSearch() {
  return useMutation({
    mutationFn: (params: FuelSearchParams) => {
      console.log('=== INICIANDO BUSCA DE COMBUSTÍVEIS ===')
      console.log('Parâmetros:', JSON.stringify(params, null, 2))
      
      // Validar código IBGE se fornecido (mais flexível)
      if (params.estabelecimento.municipio?.codigoIBGE) {
        const codigo = params.estabelecimento.municipio.codigoIBGE.replace(/\D/g, '')
        if (codigo.length !== 7) {
          throw new Error('Código IBGE deve ter exatamente 7 dígitos numéricos')
        }
      }

      return callSefazAPI('combustivel/pesquisa', params)
    },
    onError: (error: Error) => {
      console.error('❌ Erro na busca de combustíveis:', error)
      
      let errorMessage = 'Erro desconhecido na busca'
      
      if (error.message.includes('código IBGE')) {
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
      
      toast.error(errorMessage)
    },
    onSuccess: (data) => {
      console.log('✅ Busca de combustíveis bem-sucedida:', data)
      if (data.totalRegistros === 0) {
        toast.info('Nenhum combustível encontrado com os critérios informados')
      } else {
        toast.success(`${data.totalRegistros} resultado(s) encontrado(s)`)
      }
    }
  })
}
