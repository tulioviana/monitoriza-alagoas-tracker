import { formatDistance, format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatRelativeTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  
  const distance = formatDistance(dateObj, now, { 
    addSuffix: true, 
    locale: ptBR 
  })
  
  return distance
}

export function formatExactDateTime(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  return format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

// Nova função para converter UTC para horário brasileiro conforme documentação SEFAZ
export function formatSefazDateTime(utcDateString: string): string {
  if (!utcDateString) return 'Data não disponível'
  
  try {
    // Parse da data UTC ISO 8601 da API SEFAZ
    const utcDate = new Date(utcDateString)
    
    // Converte para fuso horário brasileiro (America/Maceio UTC-3)
    const brDate = new Date(utcDate.getTime() - (3 * 60 * 60 * 1000))
    
    return format(brDate, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
  } catch (error) {
    console.error('Erro ao converter data SEFAZ:', error)
    return 'Data inválida'
  }
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

export function formatCnpj(cnpj: string): string {
  // Verifica se cnpj é válido antes de tentar usar replace
  if (!cnpj || typeof cnpj !== 'string') {
    return ''
  }
  
  // Remove todos os caracteres não numéricos
  const numbers = cnpj.replace(/\D/g, '')
  
  // Aplica a máscara XX.XXX.XXX/XXXX-XX
  if (numbers.length === 14) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  
  // Retorna o CNPJ original se não tiver 14 dígitos
  return cnpj
}