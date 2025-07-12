
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
  const { data: result, error } = await supabase.functions.invoke('sefaz-api-proxy', {
    body: { endpoint, data }
  })

  if (error) {
    console.error('Edge function error:', error)
    throw new Error('Erro ao comunicar com a API')
  }

  if (result.error) {
    throw new Error(result.error)
  }

  if (result.message) {
    throw new Error(result.message)
  }

  return result
}

export function useProductSearch() {
  return useMutation({
    mutationFn: (params: ProductSearchParams) => callSefazAPI('produto/pesquisa', params),
    onError: (error: Error) => {
      const errorMessage = error.message === 'Erro ao comunicar com a API' 
        ? 'Ocorreu um erro ao buscar os produtos. Por favor, verifique os dados e tente novamente.'
        : `Erro na busca: ${error.message}`
      toast.error(errorMessage)
    }
  })
}

export function useFuelSearch() {
  return useMutation({
    mutationFn: (params: FuelSearchParams) => callSefazAPI('combustivel/pesquisa', params),
    onError: (error: Error) => {
      const errorMessage = error.message === 'Erro ao comunicar com a API' 
        ? 'Ocorreu um erro ao buscar os combustíveis. Por favor, verifique os dados e tente novamente.'
        : `Erro na busca: ${error.message}`
      toast.error(errorMessage)
    }
  })
}
