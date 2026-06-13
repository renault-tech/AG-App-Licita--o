'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'
import { schemaConviteUsuario, type ConviteUsuarioInput } from '@/lib/validacao/usuario'
import { convidarUsuario } from '@/lib/actions/organizacao'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const PAPEIS = [
  { value: 'requisitante', label: 'Requisitante' },
  { value: 'setor_compras', label: 'Setor de Compras' },
  { value: 'setor_licitacao', label: 'Setor de Licitacao' },
  { value: 'procurador', label: 'Procurador' },
  { value: 'gestor_publico', label: 'Gestor Publico' },
  { value: 'publicacao', label: 'Publicacao' },
  { value: 'admin_organizacao', label: 'Administrador' },
]

interface FormConviteProps {
  secretarias: Array<{ id: string; nome: string; sigla: string | null }>
}

const SEM_SECRETARIA = '__nenhuma__'

export default function FormConvite({ secretarias }: FormConviteProps) {
  const [salvando, setSalvando] = useState(false)

  const { register, handleSubmit, formState: { errors }, setValue, reset } = useForm<ConviteUsuarioInput>({
    resolver: zodResolver(schemaConviteUsuario),
    defaultValues: { email: '', nome_completo: '', cargo: '', papel: 'requisitante', secretaria_id: '' },
  })

  async function onSubmit(data: ConviteUsuarioInput) {
    setSalvando(true)
    const result = await convidarUsuario(data)
    if (!result.success) {
      toast.error(result.error)
    } else {
      toast.success(`Convite enviado para ${data.email}. O usuario recebera um link para definir sua senha.`)
      reset()
    }
    setSalvando(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Convidar novo usuario</CardTitle>
        <CardDescription>
          Um e-mail com link de acesso sera enviado automaticamente
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail *</Label>
              <Input id="email" type="email" placeholder="usuario@email.gov.br" {...register('email')} />
              {errors.email && <p className="text-xs text-red-600">{errors.email.message}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="nome_completo">Nome completo *</Label>
              <Input id="nome_completo" placeholder="Nome do colaborador" {...register('nome_completo')} />
              {errors.nome_completo && <p className="text-xs text-red-600">{errors.nome_completo.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo (opcional)</Label>
              <Input id="cargo" placeholder="Ex: Analista de Licitacoes" {...register('cargo')} />
            </div>
            <div className="space-y-2">
              <Label>Papel no sistema *</Label>
              <Select
                defaultValue="requisitante"
                onValueChange={v => setValue('papel', v as ConviteUsuarioInput['papel'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPEIS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.papel && <p className="text-xs text-red-600">{errors.papel.message}</p>}
            </div>
          </div>

          {secretarias.length > 0 && (
            <div className="space-y-2">
              <Label>Secretaria (opcional)</Label>
              <Select
                defaultValue={SEM_SECRETARIA}
                onValueChange={v => setValue('secretaria_id', v && v !== SEM_SECRETARIA ? v : '')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_SECRETARIA}>Nenhuma</SelectItem>
                  {secretarias.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.sigla ? `${s.sigla} - ${s.nome}` : s.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                Vincule o usuario a uma secretaria para participar de compras compartilhadas.
              </p>
            </div>
          )}

          <button
            type="submit"
            disabled={salvando}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-60"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            {salvando ? 'Enviando convite...' : 'Convidar usuario'}
          </button>
        </form>
      </CardContent>
    </Card>
  )
}
