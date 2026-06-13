import { z } from 'zod'
import type { PapelUsuario } from '@/types/database'

const PAPEIS: PapelUsuario[] = [
  'requisitante',
  'setor_compras',
  'setor_licitacao',
  'procurador',
  'gestor_publico',
  'publicacao',
  'admin_organizacao',
  'admin_plataforma',
]

export const schemaConviteUsuario = z.object({
  email: z.string().email('E-mail invalido'),
  nome_completo: z.string().min(3, 'Nome obrigatorio').max(200),
  cargo: z.string().max(100).optional(),
  papel: z.enum(PAPEIS as [PapelUsuario, ...PapelUsuario[]], { message: 'Papel invalido' }),
  secretaria_id: z.string().uuid().optional().or(z.literal('')),
})

export type ConviteUsuarioInput = z.infer<typeof schemaConviteUsuario>

export const schemaAlterarPapel = z.object({
  usuario_id: z.string().uuid(),
  papel: z.enum(PAPEIS as [PapelUsuario, ...PapelUsuario[]]),
})

export const schemaAlterarSecretaria = z.object({
  usuario_id: z.string().uuid(),
  secretaria_id: z.string().uuid().nullable(),
})
