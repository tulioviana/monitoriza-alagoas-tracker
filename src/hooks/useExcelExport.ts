import { useState } from 'react'
import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { formatCurrency, formatExactDateTime, formatCnpj } from '@/lib/dateUtils'
import { useToast } from '@/hooks/use-toast'

export interface ProductExportData {
  descricao: string
  gtin: string
  preco: number
  razaoSocial: string
  cnpj: string
  municipio: string
  dataConsulta: string
  endereco?: string
  uf?: string
}

export interface FuelExportData {
  produto: string
  bandeira: string
  preco: number
  razaoSocial: string
  cnpj: string
  municipio: string
  endereco: string
  dataConsulta: string
  uf?: string
}

export interface SearchCriteria {
  tipo: 'Produto' | 'Combustível'
  criterios: Record<string, any>
  dataConsulta: string
  totalResultados: number
}

export const useExcelExport = () => {
  const [isExporting, setIsExporting] = useState(false)
  const { toast } = useToast()

  const generateProductExcel = async (
    data: ProductExportData[],
    searchCriteria: SearchCriteria
  ) => {
    try {
      setIsExporting(true)

      // Preparar dados dos resultados
      const resultsData = data.map((item, index) => ({
        '#': index + 1,
        'Produto': item.descricao,
        'GTIN': item.gtin,
        'Preço': formatCurrency(item.preco),
        'Estabelecimento': item.razaoSocial,
        'CNPJ': formatCnpj(item.cnpj),
        'Município': item.municipio,
        'UF': item.uf || '',
        'Endereço': item.endereco || '',
        'Data da última venda registrada': formatExactDateTime(item.dataConsulta)
      }))

      // Dados estatísticos
      const precos = data.map(item => item.preco)
      const precoMedio = precos.reduce((a, b) => a + b, 0) / precos.length
      const precoMinimo = Math.min(...precos)
      const precoMaximo = Math.max(...precos)

      const resumoData = [
        ['Métrica', 'Valor'],
        ['Total de Produtos Encontrados', data.length],
        ['Preço Médio', formatCurrency(precoMedio)],
        ['Menor Preço', formatCurrency(precoMinimo)],
        ['Maior Preço', formatCurrency(precoMaximo)],
        ['Amplitude de Preços', formatCurrency(precoMaximo - precoMinimo)]
      ]

      // Critérios de busca
      const criteriosData = [
        ['Critério', 'Valor'],
        ['Tipo de Busca', searchCriteria.tipo],
        ['Data da Consulta', formatExactDateTime(searchCriteria.dataConsulta)],
        ['Total de Resultados', searchCriteria.totalResultados],
        ...Object.entries(searchCriteria.criterios).map(([key, value]) => [
          key.charAt(0).toUpperCase() + key.slice(1),
          String(value)
        ])
      ]

      // Criar workbook
      const wb = XLSX.utils.book_new()

      // Aba 1: Resultados da Busca
      const wsResults = XLSX.utils.json_to_sheet(resultsData)
      XLSX.utils.book_append_sheet(wb, wsResults, 'Resultados da Busca')

      // Aba 2: Resumo Estatístico
      const wsResumo = XLSX.utils.aoa_to_sheet(resumoData)
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Estatístico')

      // Aba 3: Critérios de Busca
      const wsCriterios = XLSX.utils.aoa_to_sheet(criteriosData)
      XLSX.utils.book_append_sheet(wb, wsCriterios, 'Critérios de Busca')

      // Configurar formatação
      formatWorksheet(wsResults)
      formatWorksheet(wsResumo)
      formatWorksheet(wsCriterios)

      // Gerar arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const filename = `Produtos_Busca_${timestamp}.xlsx`
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      saveAs(blob, filename)

      toast({
        title: "Exportação concluída",
        description: `Arquivo ${filename} baixado com sucesso!`,
        variant: "default"
      })

    } catch (error) {
      console.error('Erro na exportação:', error)
      toast({
        title: "Erro na exportação",
        description: "Falha ao gerar arquivo Excel. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  const generateFuelExcel = async (
    data: FuelExportData[],
    searchCriteria: SearchCriteria
  ) => {
    try {
      setIsExporting(true)

      // Preparar dados dos resultados
      const resultsData = data.map((item, index) => ({
        '#': index + 1,
        'Combustível': item.produto,
        'Bandeira': item.bandeira,
        'Preço': formatCurrency(item.preco),
        'Estabelecimento': item.razaoSocial,
        'CNPJ': formatCnpj(item.cnpj),
        'Município': item.municipio,
        'UF': item.uf || '',
        'Endereço': item.endereco,
        'Data da última venda registrada': formatExactDateTime(item.dataConsulta)
      }))

      // Dados estatísticos
      const precos = data.map(item => item.preco)
      const precoMedio = precos.reduce((a, b) => a + b, 0) / precos.length
      const precoMinimo = Math.min(...precos)
      const precoMaximo = Math.max(...precos)

      const resumoData = [
        ['Métrica', 'Valor'],
        ['Total de Postos Encontrados', data.length],
        ['Preço Médio', formatCurrency(precoMedio)],
        ['Menor Preço', formatCurrency(precoMinimo)],
        ['Maior Preço', formatCurrency(precoMaximo)],
        ['Amplitude de Preços', formatCurrency(precoMaximo - precoMinimo)]
      ]

      // Critérios de busca
      const criteriosData = [
        ['Critério', 'Valor'],
        ['Tipo de Busca', searchCriteria.tipo],
        ['Data da Consulta', formatExactDateTime(searchCriteria.dataConsulta)],
        ['Total de Resultados', searchCriteria.totalResultados],
        ...Object.entries(searchCriteria.criterios).map(([key, value]) => [
          key.charAt(0).toUpperCase() + key.slice(1),
          String(value)
        ])
      ]

      // Criar workbook
      const wb = XLSX.utils.book_new()

      // Aba 1: Resultados da Busca
      const wsResults = XLSX.utils.json_to_sheet(resultsData)
      XLSX.utils.book_append_sheet(wb, wsResults, 'Resultados da Busca')

      // Aba 2: Resumo Estatístico
      const wsResumo = XLSX.utils.aoa_to_sheet(resumoData)
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Estatístico')

      // Aba 3: Critérios de Busca
      const wsCriterios = XLSX.utils.aoa_to_sheet(criteriosData)
      XLSX.utils.book_append_sheet(wb, wsCriterios, 'Critérios de Busca')

      // Configurar formatação
      formatWorksheet(wsResults)
      formatWorksheet(wsResumo)
      formatWorksheet(wsCriterios)

      // Gerar arquivo
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
      const filename = `Combustiveis_Busca_${timestamp}.xlsx`
      
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      
      saveAs(blob, filename)

      toast({
        title: "Exportação concluída",
        description: `Arquivo ${filename} baixado com sucesso!`,
        variant: "default"
      })

    } catch (error) {
      console.error('Erro na exportação:', error)
      toast({
        title: "Erro na exportação",
        description: "Falha ao gerar arquivo Excel. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  const formatWorksheet = (ws: XLSX.WorkSheet) => {
    // Configurar largura das colunas
    const cols = [
      { wch: 5 },   // #
      { wch: 30 },  // Nome/Produto
      { wch: 15 },  // GTIN/Bandeira
      { wch: 12 },  // Preço
      { wch: 30 },  // Estabelecimento
      { wch: 18 },  // CNPJ
      { wch: 20 },  // Município
      { wch: 5 },   // UF
      { wch: 40 },  // Endereço
      { wch: 20 }   // Data
    ]
    ws['!cols'] = cols

    // Congelar primeira linha (cabeçalho)
    ws['!freeze'] = { xSplit: 0, ySplit: 1 }

    // Adicionar filtro automático
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    ws['!autofilter'] = { ref: ws['!ref'] || 'A1' }
  }

  return {
    generateProductExcel,
    generateFuelExcel,
    isExporting
  }
}