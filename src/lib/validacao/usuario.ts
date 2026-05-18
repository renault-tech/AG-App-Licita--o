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
]

export const schemaConviteUsuario = z.object({
  email: z.string().email('E-mail invalido'),
  nome_completo: z.string().min(3, 'Nome obrigatorio').max(200),
  cargo: z.string().max(100).optional(),
  papel: z.enum(PAPEIS as [PapelUsuario, ...PapelUsuario[]], { message: 'Papel invalido' }),
})

export type ConviteUsuarioInput = z.infer<typeof schemaConviteUsuario>

export const schemaAlterarPapel = z.object({
  usuario_id: z.string().uuid(),
  papel: z.enum(PAPEIS as [PapelUsuario, ...PapelUsuario[]]),
})
