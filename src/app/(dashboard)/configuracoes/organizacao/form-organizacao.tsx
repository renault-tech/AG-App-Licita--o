'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Save } from 'lucide-react'
import { schemaOrganizacao, type OrganizacaoInput } from '@/lib/validacao/organizacao'
import { atualizarOrganizacao } from '@/lib/actions/organizacao'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import type { ThemeName } from '@/lib/theme/provider'
import { LogoUploadField }     from '@/components/licita/logo-upload-field'
import { HexColorPickerField } from '@/components/licita/hex-color-picker-field'

const ESTADOS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

interface Props {
  organizacao: {
    id:                      string
    nome:                    string
    cnpj:                    string
    municipio:               string
    estado:                  string
    cabecalho_institucional: string | null
    rodape_institucional:    string | null
    tema_padrao?:            string | null
    cor_primaria?:           string | null
    brasao_url?:             string | null
  }
}

export default function FormOrganizacao({ organizacao }: Props) {
  const [salvando, setSalvando] = useState(false)
  const temaEscolhido = ((organizacao.tema_padrao as ThemeName) ?? 'petroleo')
  const [corPrimaria, setCorPrimaria] = useState<string>(organizacao.cor_primaria ?? '#112239')
  const [brasaoUrl,   setBrasaoUrl]   = useState<string>(organizacao.brasao_url ?? '')

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<OrganizacaoInput>({
    resolver: zodResolver(schemaOrganizacao),
    defaultValues: {
      nome: organizacao.nome,
      cnpj: organizacao.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
      municipio: organizacao.municipio,
      estado: organizacao.estado as OrganizacaoInput['estado'],
      cabecalho_institucional: organizacao.cabecalho_institucional ?? '',
      rodape_institucional: organizacao.rodape_institucional ?? '',
      tema_padrao:  (organizacao.tema_padrao as OrganizacaoInput['tema_padrao']) ?? 'petroleo',
      cor_primaria: organizacao.cor_primaria ?? '',
      brasao_url:   organizacao.brasao_url ?? '',
    },
  })

  async function onSubmit(data: OrganizacaoInput) {
    setSalvando(true)
    const result = await atualizarOrganizacao({
      ...data,
      tema_padrao:  temaEscolhido,
      cor_primaria: corPrimaria,
      brasao_url:   brasaoUrl,
    })
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

      {/* Identidade visual */}
      <div
        className="rounded-[var(--r-lg)] border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
      >
        <div
          className="px-5 py-4 border-b"
          style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            Identidade Visual
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Logo e cor exibidas no painel de login e no cabecalho do sistema.
          </p>
        </div>
        <div className="p-5 space-y-5">
          <LogoUploadField
            label="Logo / Brasao"
            currentUrl={brasaoUrl || null}
            orgId={organizacao.id}
            onUpload={url => { setBrasaoUrl(url); setValue('brasao_url', url) }}
          />
          <HexColorPickerField
            label="Cor primaria"
            value={corPrimaria}
            onChange={v => { setCorPrimaria(v); setValue('cor_primaria', v) }}
          />
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
