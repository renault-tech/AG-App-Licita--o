import { z } from 'zod'

const ESTADOS_BR = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
] as const

function cnpjValido(cnpj: string): boolean {
  const s = cnpj.replace(/\D/g, '')
  if (s.length !== 14 || /^(\d)\1+$/.test(s)) return false
  const calc = (n: number) => {
    let sum = 0
    let pos = n - 7
    for (let i = n; i >= 1; i--) {
      sum += parseInt(s[n - i]) * pos--
      if (pos < 2) pos = 9
    }
    const r = sum % 11
    return r < 2 ? 0 : 11 - r
  }
  return calc(12) === parseInt(s[12]) && calc(13) === parseInt(s[13])
}

const TEMAS_VALIDOS = ['petroleo', 'grafite', 'brasao', 'noite', 'cataguases'] as const

export const schemaOrganizacao = z.object({
  nome: z.string().min(3, 'Nome deve ter ao menos 3 caracteres').max(200),
  cnpj: z
    .string()
    .min(1, 'CNPJ obrigatorio')
    .transform(v => v.replace(/\D/g, ''))
    .refine(cnpjValido, 'CNPJ invalido'),
  municipio: z.string().min(2, 'Municipio obrigatorio').max(100),
  estado: z.enum(ESTADOS_BR, { message: 'Estado invalido' }),
  cabecalho_institucional: z.string().max(500).optional(),
  rodape_institucional: z.string().max(500).optional(),
  tema_padrao: z.enum(TEMAS_VALIDOS).optional(),
  brasao_url:   z.string().url().optional().or(z.literal('')),
  cor_primaria: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal('')),
})

export type OrganizacaoInput = z.infer<typeof schemaOrganizacao>

export const schemaOnboarding = schemaOrganizacao.extend({
  nome_completo: z.string().min(3, 'Nome completo obrigatorio').max(200),
  cargo: z.string().max(100).optional(),
})

export type OnboardingInput = z.infer<typeof schemaOnboarding>
