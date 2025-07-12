
export const FUEL_TYPES = {
  1: 'Gasolina Comum',
  2: 'Gasolina Aditivada',
  3: 'Álcool',
  4: 'Diesel Comum',
  5: 'Diesel Aditivado (S10)',
  6: 'GNV'
} as const

export const GPC_SEGMENTS = {
  '50000000': 'Alimentos / Bebidas / Tabaco',
  '53000000': 'Higiene/Cuidados Pessoais/ Beleza',
  '47000000': 'Produtos de Higiene/Limpeza',
  '51000000': 'Setor da Saúde',
  '87000000': 'Combustíveis/Gases'
} as const

export const MUNICIPALITIES = {
  '2700300': 'ARAPIRACA',
  '2701407': 'CAMPO ALEGRE',
  '2702405': 'DELMIRO GOUVEIA',
  '2704302': 'MACEIO',
  '2704708': 'MARECHAL DEODORO',
  '2706703': 'PENEDO',
  '2707701': 'RIO LARGO',
  '2709301': 'UNIAO DOS PALMARES'
} as const

export type FuelType = keyof typeof FUEL_TYPES
export type GPCSegment = keyof typeof GPC_SEGMENTS
export type Municipality = keyof typeof MUNICIPALITIES
