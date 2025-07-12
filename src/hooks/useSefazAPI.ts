
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
  console.log('=== CHAMADA FRONTEND PARA API ===')
  console.log('Endpoint:', endpoint)
  console.log('Dados enviados:', JSON.stringify(data, null, 2))

  const { data: result, error } = await supabase.functions.invoke('sefaz-api-proxy', {
    body: { endpoint, data }
  })

  console.log('=== RESPOSTA DA EDGE FUNCTION ===')
  console.log('Error:', error)
  console.log('Result:', JSON.stringify(result, null, 2))

  if (error) {
    console.error('Edge function error:', error)
    throw new Error('Erro ao comunicar com a API')
  }

  if (result.error) {
    console.error('API error:', result.error)
    throw new Error(result.error)
  }

  if (result.message) {
    console.error('API message:', result.message)
    throw new Error(result.message)
  }

  return result
}

export function useProductSearch() {
  return useMutation({
    mutationFn: (params: ProductSearchParams) => {
      // Validação no frontend antes de enviar
      if (params.produto.gtin && params.produto.gtin.length < 8) {
        throw new Error('Código de barras deve ter pelo menos 8 dígitos')
      }
      
      if (params.estabelecimento.municipio?.codigoIBGE && 
          params.estabelecimento.municipio.codigoIBGE.length !== 7) {
        throw new Error('Código IBGE deve ter exatamente 7 dígitos')
      }

      return callSefazAPI('produto/pesquisa', params)
    },
    onError: (error: Error) => {
      console.error('Erro na busca de produtos:', error)
      
      let errorMessage = 'Erro desconhecido na busca'
      
      if (error.message.includes('Código de barras')) {
        errorMessage = error.message
      } else if (error.message.includes('Código IBGE')) {
        errorMessage = error.message
      } else if (error.message === 'Erro ao comunicar com a API') {
        errorMessage = 'Falha na comunicação com o servidor. Tente novamente em alguns instantes.'
      } else if (error.message.includes('API SEFAZ')) {
        errorMessage = 'Erro no servidor da SEFAZ. Por favor, tente novamente mais tarde.'
      } else {
        errorMessage = `Erro na busca: ${error.message}`
      }
      
      toast.error(errorMessage)
    },
    onSuccess: (data) => {
      console.log('Busca de produtos bem-sucedida:', data)
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
      // Validação no frontend antes de enviar
      if (params.estabelecimento.municipio?.codigoIBGE && 
          params.estabelecimento.municipio.codigoIBGE.length !== 7) {
        throw new Error('Código IBGE deve ter exatamente 7 dígitos')
      }

      return callSefazAPI('combustivel/pesquisa', params)
    },
    onError: (error: Error) => {
      console.error('Erro na busca de combustíveis:', error)
      
      let errorMessage = 'Erro desconhecido na busca'
      
      if (error.message.includes('Código IBGE')) {
        errorMessage = error.message
      } else if (error.message === 'Erro ao comunicar com a API') {
        errorMessage = 'Falha na comunicação com o servidor. Tente novamente em alguns instantes.'
      } else if (error.message.includes('API SEFAZ')) {
        errorMessage = 'Erro no servidor da SEFAZ. Por favor, tente novamente mais tarde.'
      } else {
        errorMessage = `Erro na busca: ${error.message}`
      }
      
      toast.error(errorMessage)
    },
    onSuccess: (data) => {
      console.log('Busca de combustíveis bem-sucedida:', data)
      if (data.totalRegistros === 0) {
        toast.info('Nenhum combustível encontrado com os critérios informados')
      } else {
        toast.success(`${data.totalRegistros} resultado(s) encontrado(s)`)
      }
    }
  })
}
