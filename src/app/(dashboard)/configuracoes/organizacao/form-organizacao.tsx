'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Loader2, Save, Check, Palette } from 'lucide-react'
import { schemaOrganizacao, type OrganizacaoInput } from '@/lib/validacao/organizacao'
import { atualizarOrganizacao } from '@/lib/actions/organizacao'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { THEMES, type ThemeName } from '@/lib/theme/provider'
import { LogoUploadField }     from '@/components/licita/logo-upload-field'
import { HexColorPickerField } from '@/components/licita/hex-color-picker-field'

const ESTADOS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

type SeleçaoTema = ThemeName | 'personalizada'

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

  // Selecao de tema: predefinido ou personalizado
  const [selecao, setSelecao] = useState<SeleçaoTema>(
    organizacao.cor_primaria ? 'personalizada' : ((organizacao.tema_padrao as ThemeName) ?? 'petroleo')
  )
  const [corPersonalizada, setCorPersonalizada] = useState<string>(
    organizacao.cor_primaria ?? '#112239'
  )
  const [brasaoUrl, setBrasaoUrl] = useState<string>(organizacao.brasao_url ?? '')

  const { register, handleSubmit, formState: { errors }, setValue } = useForm<OrganizacaoInput>({
    resolver: zodResolver(schemaOrganizacao),
    defaultValues: {
      nome:                    organizacao.nome,
      cnpj:                    organizacao.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
      municipio:               organizacao.municipio,
      estado:                  organizacao.estado as OrganizacaoInput['estado'],
      cabecalho_institucional: organizacao.cabecalho_institucional ?? '',
      rodape_institucional:    organizacao.rodape_institucional ?? '',
      tema_padrao:             (organizacao.tema_padrao as OrganizacaoInput['tema_padrao']) ?? 'petroleo',
      cor_primaria:            organizacao.cor_primaria ?? '',
      brasao_url:              organizacao.brasao_url ?? '',
    },
  })

  function escolherTema(id: ThemeName) {
    setSelecao(id)
    setValue('tema_padrao', id)
    setValue('cor_primaria', '')   // limpa personalizada
  }

  function escolherPersonalizada() {
    setSelecao('personalizada')
    setValue('cor_primaria', corPersonalizada)
  }

  async function onSubmit(data: OrganizacaoInput) {
    setSalvando(true)
    const result = await atualizarOrganizacao({
      ...data,
      tema_padrao:  selecao !== 'personalizada' ? selecao : (data.tema_padrao ?? 'petroleo'),
      cor_primaria: selecao === 'personalizada' ? corPersonalizada : '',
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
            Logo e tema de cor exibidos no painel de login e no sistema.
          </p>
        </div>
        <div className="p-5 space-y-6">

          {/* Logo */}
          <LogoUploadField
            label="Logo / Brasao"
            currentUrl={brasaoUrl || null}
            orgId={organizacao.id}
            onUpload={url => { setBrasaoUrl(url); setValue('brasao_url', url) }}
          />

          {/* Tema de cor */}
          <div className="space-y-3">
            <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>Tema de cor</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">

              {/* Temas predefinidos */}
              {(Object.entries(THEMES) as [ThemeName, typeof THEMES.petroleo][]).map(([id, t]) => {
                const ativo = selecao === id
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => escolherTema(id)}
                    className="relative flex flex-col items-start gap-2 p-3 rounded-[var(--r-md)] text-left transition-all"
                    style={ativo
                      ? { background: 'var(--primaryWash)', border: '1.5px solid var(--primary)' }
                      : { background: 'var(--surface)', border: '1px solid var(--hairline)' }
                    }
                  >
                    <div className="flex gap-1">
                      {t.swatch.map((c, i) => (
                        <div
                          key={i}
                          className="rounded-full"
                          style={{ width: 18, height: 18, background: c, border: '1px solid rgba(0,0,0,0.08)' }}
                        />
                      ))}
                    </div>
                    <p className="text-[12px] font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
                      {t.name}
                    </p>
                    <p className="text-[10.5px] leading-snug" style={{ color: 'var(--muted)' }}>
                      {t.desc}
                    </p>
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

              {/* Cor personalizada */}
              <button
                type="button"
                onClick={escolherPersonalizada}
                className="relative flex flex-col items-start gap-2 p-3 rounded-[var(--r-md)] text-left transition-all"
                style={selecao === 'personalizada'
                  ? { background: 'var(--primaryWash)', border: '1.5px solid var(--primary)' }
                  : { background: 'var(--surface)', border: '1px solid var(--hairline)' }
                }
              >
                <div className="flex gap-1">
                  {([1, 0.65, 0.2] as const).map((op, i) => (
                    <div
                      key={i}
                      className="rounded-full"
                      style={{
                        width: 18, height: 18,
                        background: corPersonalizada,
                        opacity: op,
                        border: '1px solid rgba(0,0,0,0.08)',
                      }}
                    />
                  ))}
                </div>
                <p className="text-[12px] font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
                  Cor personalizada
                </p>
                <p className="text-[10.5px] leading-snug" style={{ color: 'var(--muted)' }}>
                  Defina qualquer cor hex
                </p>
                <Palette className="absolute top-2.5 right-2.5 w-3.5 h-3.5" style={{ color: 'var(--muted)' }} />
                {selecao === 'personalizada' && (
                  <div
                    className="absolute top-2 right-2 w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: 'var(--primary)' }}
                  >
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </button>
            </div>

            {/* Picker aparece só quando personalizada está selecionada */}
            {selecao === 'personalizada' && (
              <div className="mt-3">
                <HexColorPickerField
                  value={corPersonalizada}
                  onChange={v => { setCorPersonalizada(v); setValue('cor_primaria', v) }}
                />
              </div>
            )}
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
