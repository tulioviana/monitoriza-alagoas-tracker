/**
 * Utility functions for formatting data
 */

/**
 * Formats a CNPJ string to XX.XXX.XXX/XXXX-XX format
 */
export function formatCNPJ(cnpj: string): string {
  if (!cnpj) return '';
  
  // Remove all non-numeric characters
  const numbers = cnpj.replace(/\D/g, '');
  
  // Apply CNPJ formatting
  if (numbers.length === 14) {
    return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return cnpj; // Return original if not 14 digits
}

/**
 * Extracts CNPJ from search criteria
 */
export function extractCNPJFromSearchCriteria(searchCriteria: any): string {
  if (!searchCriteria) return '';
  
  // Try different paths where CNPJ might be stored
  return searchCriteria?.estabelecimento?.individual?.cnpj || 
         searchCriteria?.estabelecimento?.cnpj ||
         searchCriteria?.cnpj ||
         '';
}

/**
 * Extracts establishment name from search criteria
 */
export function extractEstablishmentNameFromSearchCriteria(searchCriteria: any): string {
  if (!searchCriteria) return '';
  
  // Try different paths where establishment name might be stored
  return searchCriteria?.estabelecimento?.individual?.nome_fantasia ||
         searchCriteria?.estabelecimento?.individual?.razao_social ||
         searchCriteria?.estabelecimento?.nome_fantasia ||
         searchCriteria?.estabelecimento?.razao_social ||
         searchCriteria?.nome_fantasia ||
         searchCriteria?.razao_social ||
         '';
}

/**
 * Gets establishment name preference (nome_fantasia over razao_social)
 */
export function getEstablishmentDisplayName(establishment: any): string {
  if (!establishment) return '';
  
  return establishment.nome_fantasia || establishment.razao_social || '';
}