// Validações específicas conforme documentação SEFAZ-AL
// Manual de Orientação do Desenvolvedor v1.0

export interface ProductSearchValidation {
  produto: {
    gtin?: string
    descricao?: string
    ncm?: string // apenas se descricao for informado
    gpc?: string // apenas se descricao for informado
  }
  estabelecimento: {
    individual?: { cnpj: string }
    municipio?: { codigoIBGE: string }
    geolocalizacao?: {
      latitude: number
      longitude: number
      raio: number // 1 a 15
    }
  }
  dias: number // 1 a 10
  pagina?: number
  registrosPorPagina?: number
}

export interface FuelSearchValidation {
  produto: {
    tipoCombustivel: number // 1-6
  }
  estabelecimento: {
    individual?: { cnpj: string }
    municipio?: { codigoIBGE: string }
    geolocalizacao?: {
      latitude: number
      longitude: number
      raio: number // 1 a 15
    }
  }
  dias: number // 1 a 10
  pagina?: number
  registrosPorPagina?: number
}

// Validações para busca de produtos
export function validateProductSearch(params: any): string[] {
  const errors: string[] = []
  
  // Validar produto - deve ter apenas UM dos campos obrigatórios
  const hasGtin = !!params.produto?.gtin
  const hasDescricao = !!params.produto?.descricao
  
  if (!hasGtin && !hasDescricao) {
    errors.push('Informe GTIN ou Descrição do produto')
  }
  
  if (hasGtin && hasDescricao) {
    errors.push('Informe apenas GTIN ou Descrição, não ambos')
  }
  
  // NCM e GPC só podem ser usados com descrição
  if ((params.produto?.ncm || params.produto?.gpc) && !hasDescricao) {
    errors.push('NCM e GPC só podem ser usados com Descrição')
  }
  
  // Validar GTIN
  if (params.produto?.gtin) {
    const gtin = params.produto.gtin.replace(/\D/g, '')
    if (gtin.length < 8 || gtin.length > 14) {
      errors.push('GTIN deve ter entre 8 e 14 dígitos')
    }
  }
  
  // Validar estabelecimento - deve ter apenas UM tipo
  const hasIndividual = !!params.estabelecimento?.individual?.cnpj
  const hasMunicipio = !!params.estabelecimento?.municipio?.codigoIBGE
  const hasGeo = !!(params.estabelecimento?.geolocalizacao?.latitude && 
                   params.estabelecimento?.geolocalizacao?.longitude && 
                   params.estabelecimento?.geolocalizacao?.raio)
  
  const establishmentCount = [hasIndividual, hasMunicipio, hasGeo].filter(Boolean).length
  if (establishmentCount !== 1) {
    errors.push('Informe apenas um tipo de estabelecimento: CNPJ, Município ou Geolocalização')
  }
  
  // Validar CNPJ
  if (params.estabelecimento?.individual?.cnpj) {
    const cnpj = params.estabelecimento.individual.cnpj.replace(/\D/g, '')
    if (cnpj.length !== 14) {
      errors.push('CNPJ deve ter exatamente 14 dígitos')
    }
  }
  
  // Validar código IBGE
  if (params.estabelecimento?.municipio?.codigoIBGE) {
    const codigo = params.estabelecimento.municipio.codigoIBGE.replace(/\D/g, '')
    if (codigo.length !== 7) {
      errors.push('Código IBGE deve ter exatamente 7 dígitos')
    }
  }
  
  // Validar geolocalização
  if (hasGeo) {
    const { latitude, longitude, raio } = params.estabelecimento.geolocalizacao
    
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      errors.push('Latitude deve ser um número entre -90 e 90')
    }
    
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      errors.push('Longitude deve ser um número entre -180 e 180')
    }
    
    if (typeof raio !== 'number' || raio < 1 || raio > 15) {
      errors.push('Raio deve ser um número entre 1 e 15 km')
    }
  }
  
  // Validar dias
  if (!params.dias || params.dias < 1 || params.dias > 10) {
    errors.push('Dias deve estar entre 1 e 10')
  }
  
  return errors
}

// Validações para busca de combustíveis
export function validateFuelSearch(params: any): string[] {
  const errors: string[] = []
  
  // Validar tipo de combustível
  if (!params.produto?.tipoCombustivel || 
      params.produto.tipoCombustivel < 1 || 
      params.produto.tipoCombustivel > 6) {
    errors.push('Tipo de combustível deve estar entre 1 e 6')
  }
  
  // Validar estabelecimento - mesmo que produtos
  const hasIndividual = !!params.estabelecimento?.individual?.cnpj
  const hasMunicipio = !!params.estabelecimento?.municipio?.codigoIBGE
  const hasGeo = !!(params.estabelecimento?.geolocalizacao?.latitude && 
                   params.estabelecimento?.geolocalizacao?.longitude && 
                   params.estabelecimento?.geolocalizacao?.raio)
  
  const establishmentCount = [hasIndividual, hasMunicipio, hasGeo].filter(Boolean).length
  if (establishmentCount !== 1) {
    errors.push('Informe apenas um tipo de estabelecimento: CNPJ, Município ou Geolocalização')
  }
  
  // Validar CNPJ
  if (params.estabelecimento?.individual?.cnpj) {
    const cnpj = params.estabelecimento.individual.cnpj.replace(/\D/g, '')
    if (cnpj.length !== 14) {
      errors.push('CNPJ deve ter exatamente 14 dígitos')
    }
  }
  
  // Validar código IBGE
  if (params.estabelecimento?.municipio?.codigoIBGE) {
    const codigo = params.estabelecimento.municipio.codigoIBGE.replace(/\D/g, '')
    if (codigo.length !== 7) {
      errors.push('Código IBGE deve ter exatamente 7 dígitos')
    }
  }
  
  // Validar geolocalização
  if (hasGeo) {
    const { latitude, longitude, raio } = params.estabelecimento.geolocalizacao
    
    if (typeof latitude !== 'number' || latitude < -90 || latitude > 90) {
      errors.push('Latitude deve ser um número entre -90 e 90')
    }
    
    if (typeof longitude !== 'number' || longitude < -180 || longitude > 180) {
      errors.push('Longitude deve ser um número entre -180 e 180')
    }
    
    if (typeof raio !== 'number' || raio < 1 || raio > 15) {
      errors.push('Raio deve ser um número entre 1 e 15 km')
    }
  }
  
  // Validar dias
  if (!params.dias || params.dias < 1 || params.dias > 10) {
    errors.push('Dias deve estar entre 1 e 10')
  }
  
  return errors
}

// Mapeamento dos tipos de combustível conforme documentação
export const FUEL_TYPES = {
  1: 'Gasolina Comum',
  2: 'Gasolina Aditivada', 
  3: 'Álcool',
  4: 'Diesel Comum',
  5: 'Diesel Aditivado S10',
  6: 'GNV'
} as const

export function getFuelTypeName(code: number): string {
  return FUEL_TYPES[code as keyof typeof FUEL_TYPES] || `Combustível ${code}`
}