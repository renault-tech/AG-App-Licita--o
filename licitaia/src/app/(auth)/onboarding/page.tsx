'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Building2, User, ChevronRight, Loader2 } from 'lucide-react'
import { schemaOnboarding, type OnboardingInput } from '@/lib/validacao/organizacao'
import { criarOrganizacaoEAdmin } from '@/lib/actions/onboarding'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ESTADOS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT',
  'PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO',
]

const ESTADOS_NOMES: Record<string, string> = {
  AC:'Acre', AL:'Alagoas', AM:'Amazonas', AP:'Amapa', BA:'Bahia', CE:'Ceara',
  DF:'Distrito Federal', ES:'Espirito Santo', GO:'Goias', MA:'Maranhao',
  MG:'Minas Gerais', MS:'Mato Grosso do Sul', MT:'Mato Grosso', PA:'Para',
  PB:'Paraiba', PE:'Pernambuco', PI:'Piaui', PR:'Parana', RJ:'Rio de Janeiro',
  RN:'Rio Grande do Norte', RO:'Rondonia', RR:'Roraima', RS:'Rio Grande do Sul',
  SC:'Santa Catarina', SE:'Sergipe', SP:'Sao Paulo', TO:'Tocantins',
}

export default function OnboardingPage() {
  const router = useRouter()
  const [etapa, setEtapa] = useState<1 | 2>(1)
  const [salvando, setSalvando] = useState(false)

  const form = useForm<OnboardingInput>({
    resolver: zodResolver(schemaOnboarding),
    defaultValues: {
      nome: '',
      cnpj: '',
      municipio: '',
      estado: undefined,
      cabecalho_institucional: '',
      rodape_institucional: '',
      nome_completo: '',
      cargo: '',
    },
  })

  const { register, handleSubmit, formState: { errors }, setValue, watch, trigger } = form

  async function avancarEtapa() {
    const camposEtapa1 = ['nome', 'cnpj', 'municipio', 'estado'] as const
    const valido = await trigger(camposEtapa1)
    if (valido) setEtapa(2)
  }

  async function onSubmit(data: OnboardingInput) {
    setSalvando(true)
    const result = await criarOrganizacaoEAdmin(data)
    if (!result.success) {
      toast.error(result.error)
      setSalvando(false)
      return
    }
    toast.success('Organizacao configurada com sucesso!')
    router.push('/dashboard')
    router.refresh()
  }

  function formatarCNPJ(valor: string) {
    const numeros = valor.replace(/\D/g, '').slice(0, 14)
    return numeros
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
  }

  return (
    <Card className="shadow-lg border-0">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-gray-800">
          Configurar sua Organizacao
        </CardTitle>
        <CardDescription>
          Etapa {etapa} de 2: {etapa === 1 ? 'Dados institucionais' : 'Seus dados pessoais'}
        </CardDescription>
        {/* Barra de progresso */}
        <div className="flex gap-1 mt-2">
          <div className="h-1 flex-1 rounded-full bg-blue-600" />
          <div className={`h-1 flex-1 rounded-full ${etapa === 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
        </div>
      </CardHeader>

      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">

          {etapa === 1 && (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
                <Building2 className="w-4 h-4" />
                Dados da prefeitura ou orgao
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome">Nome da organizacao *</Label>
                <Input
                  id="nome"
                  placeholder="Prefeitura Municipal de..."
                  {...register('nome')}
                />
                {errors.nome && <p className="text-xs text-red-600">{errors.nome.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0000-00"
                  value={watch('cnpj') ?? ''}
                  onChange={e => setValue('cnpj', formatarCNPJ(e.target.value))}
                />
                {errors.cnpj && <p className="text-xs text-red-600">{errors.cnpj.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="municipio">Municipio *</Label>
                  <Input
                    id="municipio"
                    placeholder="Nome do municipio"
                    {...register('municipio')}
                  />
                  {errors.municipio && <p className="text-xs text-red-600">{errors.municipio.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label>Estado *</Label>
                  <Select onValueChange={v => setValue('estado', v as OnboardingInput['estado'])}>
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTADOS.map(uf => (
                        <SelectItem key={uf} value={uf}>{uf} - {ESTADOS_NOMES[uf]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.estado && <p className="text-xs text-red-600">{errors.estado.message}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cabecalho">Cabecalho institucional (opcional)</Label>
                <Textarea
                  id="cabecalho"
                  placeholder="Ex: ESTADO DE SAO PAULO - PREFEITURA MUNICIPAL DE..."
                  rows={2}
                  {...register('cabecalho_institucional')}
                />
                <p className="text-xs text-gray-400">Aparece no topo dos documentos gerados</p>
              </div>

              <button
                type="button"
                onClick={avancarEtapa}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-800 transition-colors"
              >
                Continuar
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {etapa === 2 && (
            <>
              <div className="flex items-center gap-2 text-sm font-medium text-gray-500 mb-2">
                <User className="w-4 h-4" />
                Seus dados como administrador
              </div>

              <div className="space-y-2">
                <Label htmlFor="nome_completo">Nome completo *</Label>
                <Input
                  id="nome_completo"
                  placeholder="Nome completo do responsavel"
                  {...register('nome_completo')}
                />
                {errors.nome_completo && <p className="text-xs text-red-600">{errors.nome_completo.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="cargo">Cargo (opcional)</Label>
                <Input
                  id="cargo"
                  placeholder="Ex: Chefe de Licitacoes"
                  {...register('cargo')}
                />
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  Voce sera cadastrado como <strong>Administrador da Organizacao</strong>.
                  Podra convidar outros usuarios e configurar papeis depois.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEtapa(1)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={salvando}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-700 text-white font-medium rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-60"
                >
                  {salvando ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                  ) : (
                    'Concluir configuracao'
                  )}
                </button>
              </div>
            </>
          )}
        </CardContent>
      </form>
    </Card>
  )
}
