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

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}