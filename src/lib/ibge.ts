// src/lib/ibge.ts
const IBGE_BASE = 'https://servicodados.ibge.gov.br/api/v1'

export interface MunicipioIBGE {
  id: number
  nome: string
  microrregiao: {
    mesorregiao: {
      UF: {
        sigla: string
        nome: string
      }
    }
  }
}

export interface MunicipioSimplificado {
  id: number
  nome: string
  estado: string
  siglaEstado: string
  nomeCompleto: string
}

export async function buscarMunicipios(termo: string): Promise<MunicipioSimplificado[]> {
  if (termo.trim().length < 2) return []

  const res = await fetch(
    `${IBGE_BASE}/localidades/municipios?orderBy=nome`,
    { cache: 'force-cache' }
  )

  if (!res.ok) return []

  const municipios: MunicipioIBGE[] = await res.json()
  const termoLower = termo.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')

  return municipios
    .filter(m => {
      const nomeLower = m.nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
      return nomeLower.includes(termoLower)
    })
    .slice(0, 10)
    .map(m => ({
      id: m.id,
      nome: m.nome,
      estado: m.microrregiao.mesorregiao.UF.nome,
      siglaEstado: m.microrregiao.mesorregiao.UF.sigla,
      nomeCompleto: `${m.nome} - ${m.microrregiao.mesorregiao.UF.sigla}`,
    }))
}

export async function buscarMunicipioPorId(id: number): Promise<MunicipioSimplificado | null> {
  const res = await fetch(
    `${IBGE_BASE}/localidades/municipios/${id}`,
    { cache: 'force-cache' }
  )
  if (!res.ok) return null
  const m: MunicipioIBGE = await res.json()
  return {
    id: m.id,
    nome: m.nome,
    estado: m.microrregiao.mesorregiao.UF.nome,
    siglaEstado: m.microrregiao.mesorregiao.UF.sigla,
    nomeCompleto: `${m.nome} - ${m.microrregiao.mesorregiao.UF.sigla}`,
  }
}

export function nomePrefeitura(municipio: MunicipioSimplificado): string {
  const capitais = [
    'Sao Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Salvador', 'Fortaleza',
    'Curitiba', 'Manaus', 'Recife', 'Porto Alegre', 'Belem',
    'Goiania', 'Florianopolis', 'Maceio', 'Natal', 'Teresina',
    'Campo Grande', 'Joao Pessoa', 'Aracaju', 'Cuiaba', 'Macapa',
    'Porto Velho', 'Rio Branco', 'Boa Vista', 'Palmas',
  ]
  const nomeNorm = municipio.nome.normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (capitais.includes(nomeNorm)) {
    return `Prefeitura de ${municipio.nome}`
  }
  return `Prefeitura Municipal de ${municipio.nome}`
}
