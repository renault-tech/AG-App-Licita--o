/**
 * Base de dados de Prefeituras para Autocomplete.
 * 
 * NOTA DE IMPLEMENTAÇÃO:
 * Esta base contém uma amostra inicial para validação do recurso.
 * Para uso em produção com todas as 5.570 prefeituras do Brasil, 
 * recomenda-se exportar os dados via SQL no Google BigQuery através 
 * do projeto Base dos Dados (basedosdados.org):
 * 
 * SELECT cnpj, razao_social, municipio, sigla_uf 
 * FROM `basedosdados.br_me_cnpj.estabelecimentos` 
 * WHERE cnae_fiscal_principal = '8411600' -- Administração Pública Geral
 * 
 * Em seguida, substitua este array pelo JSON gerado.
 */

export interface PrefeituraData {
  nome: string;
  cnpj: string;
  municipio: string;
  estado: string;
}

export const PREFEITURAS_DB: PrefeituraData[] = [
  {
    nome: 'PREFEITURA MUNICIPAL DE CATAGUASES',
    cnpj: '17.704.867/0001-98',
    municipio: 'Cataguases',
    estado: 'MG'
  },
  {
    nome: 'PREFEITURA MUNICIPAL DE LEOPOLDINA',
    cnpj: '17.733.643/0001-64',
    municipio: 'Leopoldina',
    estado: 'MG'
  },
  {
    nome: 'PREFEITURA MUNICIPAL DE JUIZ DE FORA',
    cnpj: '17.712.068/0001-20',
    municipio: 'Juiz de Fora',
    estado: 'MG'
  },
  {
    nome: 'PREFEITURA MUNICIPAL DE MURIAE',
    cnpj: '17.947.581/0001-76',
    municipio: 'Muriae',
    estado: 'MG'
  },
  {
    nome: 'PREFEITURA MUNICIPAL DE SAO PAULO',
    cnpj: '46.395.000/0001-39',
    municipio: 'Sao Paulo',
    estado: 'SP'
  },
  {
    nome: 'PREFEITURA MUNICIPAL DO RIO DE JANEIRO',
    cnpj: '42.498.600/0001-71',
    municipio: 'Rio de Janeiro',
    estado: 'RJ'
  },
  {
    nome: 'PREFEITURA MUNICIPAL DE BELO HORIZONTE',
    cnpj: '18.715.383/0001-40',
    municipio: 'Belo Horizonte',
    estado: 'MG'
  }
];
