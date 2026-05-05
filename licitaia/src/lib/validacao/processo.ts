import { z } from 'zod'

export const schemaProcessoWizard = z.object({
  objeto: z.string().min(10, 'A descrição do objeto deve ter no mínimo 10 caracteres'),
  justificativa: z.string().min(20, 'Forneça uma justificativa detalhada (mín. 20 caracteres)'),
  modalidade: z.enum([
    'pregao_eletronico',
    'pregao_presencial',
    'concorrencia',
    'concurso',
    'leilao',
    'dialogo_competitivo',
    'dispensa',
    'inexigibilidade'
  ]),
  valor_estimado: z.number().min(0, 'Valor estimado inválido').optional().or(z.nan()),
  prazo_contratacao: z.string().min(1, 'Informe o prazo esperado'),
  observacoes: z.string().optional(),
})

export type ProcessoWizardInput = z.infer<typeof schemaProcessoWizard>
