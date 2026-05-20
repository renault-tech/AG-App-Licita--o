'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Save, Check } from 'lucide-react'
import { schemaOrganizacao, type OrganizacaoInput } from '@/lib/validacao/organizacao'
import { atualizarOrganizacao } from '@/lib/actions/organizacao'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { THEMES, type ThemeName } from '@/lib/theme/provider'

const ESTADOS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

interface Props {
  organizacao: {
    nome: string
    cnpj: string
    municipio: string
    estado: string
    cabecalho_institucional: string | null
    rodape_institucional: string | null
    tema_padrao?: string | null
  }
}

export default function FormOrganizacao({ organizacao }: Props) {
  const [salvando, setSalvando] = useState(false)
  const [temaEscolhido, setTemaEscolhido] = useState<ThemeName>(
    (organizacao.tema_padrao as ThemeName) ?? 'petroleo'
  )

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<OrganizacaoInput>({
    resolver: zodResolver(schemaOrganizacao),
    defaultValues: {
      nome: organizacao.nome,
      cnpj: organizacao.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
      municipio: organizacao.municipio,
      estado: organizacao.estado as OrganizacaoInput['estado'],
      cabecalho_institucional: organizacao.cabecalho_institucional ?? '',
      rodape_institucional: organizacao.rodape_institucional ?? '',
      tema_padrao: (organizacao.tema_padrao as OrganizacaoInput['tema_padrao']) ?? 'petroleo',
    },
  })

  async function onSubmit(data: OrganizacaoInput) {
    setSalvando(true)
    const result = await atualizarOrganizacao({ ...data, tema_padrao: temaEscolhido })
    if (!result.success) {
      toast.error(result.error)
    } else {
      toast.success('Dados atualizados com sucesso.')
    }
    setSalvando(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Identificacao</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da organizacao *</Label>
            <Input id="nome" {...register('nome')} />
            {errors.nome && <p className="text-xs text-red-600">{errors.nome.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="cnpj">CNPJ *</Label>
            <Input id="cnpj" {...register('cnpj')} readOnly className="bg-gray-50" />
            <p className="text-xs text-gray-400">O CNPJ nao pode ser alterado apos o cadastro.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="municipio">Municipio *</Label>
              <Input id="municipio" {...register('municipio')} />
              {errors.municipio && <p className="text-xs text-red-600">{errors.municipio.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Estado *</Label>
              <Select
                defaultValue={organizacao.estado}
                onValueChange={v => setValue('estado', v as OrganizacaoInput['estado'])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map(uf => (
                    <SelectItem key={uf} value={uf}>{uf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.estado && <p className="text-xs text-red-600">{errors.estado.message}</p>}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Aparencia: tema padrao da organizacao */}
      <div
        className="rounded-[var(--r-lg)] border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            Aparencia da plataforma
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Tema visual padrao para todos os usuarios desta organizacao. Cada usuario pode alterar individualmente.
          </p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {(Object.entries(THEMES) as [ThemeName, typeof THEMES.petroleo][]).map(([id, t]) => {
              const ativo = id === temaEscolhido
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setTemaEscolhido(id)
                    setValue('tema_padrao', id)
                  }}
                  className="relative flex flex-col items-start gap-2.5 p-3 rounded-[var(--r-md)] text-left transition-all"
                  style={ativo
                    ? { background: 'var(--primaryWash)', border: '1.5px solid var(--primary)' }
                    : { background: 'var(--surface)', border: '1px solid var(--hairline)' }
                  }
                >
                  {/* Swatches de cor */}
                  <div className="flex gap-1">
                    {t.swatch.map((c, i) => (
                      <div
                        key={i}
                        className="rounded-full"
                        style={{ width: 20, height: 20, background: c, border: '1px solid rgba(0,0,0,0.08)' }}
                      />
                    ))}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
                      {t.name}
                    </p>
                    <p className="text-[10.5px] mt-0.5 leading-snug" style={{ color: 'var(--muted)' }}>
                      {t.desc}
                    </p>
                  </div>
                  {ativo && (
                    <div
                      className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                      style={{ background: 'var(--primary)' }}
                    >
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Documentos gerados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cabecalho">Cabecalho institucional</Label>
            <Textarea
              id="cabecalho"
              rows={3}
              placeholder="Texto que aparece no topo dos documentos..."
              {...register('cabecalho_institucional')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rodape">Rodape institucional</Label>
            <Textarea
              id="rodape"
              rows={2}
              placeholder="Texto que aparece no rodape dos documentos..."
              {...register('rodape_institucional')}
            />
          </div>
        </CardContent>
      </Card>

      <button
        type="submit"
        disabled={salvando}
        className="inline-flex items-center gap-2 px-5 py-2.5 font-medium rounded-[var(--r-md)] transition-colors disabled:opacity-60 text-sm"
        style={{ background: 'var(--primary)', color: 'var(--primaryInk)' }}
      >
        {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {salvando ? 'Salvando...' : 'Salvar alteracoes'}
      </button>
    </form>
  )
}
